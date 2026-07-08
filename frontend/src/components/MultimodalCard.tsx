import { useState, useRef, useCallback } from 'react'
import { predictMultimodal } from '../api/client'
import type { MultimodalResult } from '../types'
import LoadingSpinner from './LoadingSpinner'

const PHISHING_SAMPLE = {
  subject: 'Urgent: Your account will be suspended in 24h',
  content: 'Dear customer, we detected unusual activity on your account. To avoid permanent suspension, verify your identity immediately at http://secure-acc0unt-verify.net/login — failure to act within 24h will result in account closure.',
  url: 'http://secure-acc0unt-verify.net/login',
}
const SAFE_SAMPLE = {
  subject: 'Your monthly statement is ready',
  content: 'Hi there, your account statement for this month is now available. Log in at https://www.yourbank.com/statements to view it. No action required.',
  url: 'https://www.yourbank.com/statements',
}

interface Props { onResult: (r: MultimodalResult | null) => void }

export default function MultimodalCard({ onResult }: Props) {
  const [subject, setSubject] = useState('')
  const [content, setContent]  = useState('')
  const [url, setUrl]          = useState('')
  const [file, setFile]        = useState<File | null>(null)
  const [preview, setPreview]  = useState<string | null>(null)
  const [dragging, setDragging]= useState(false)
  const [loading, setLoading]  = useState(false)
  const [error, setError]      = useState('')
  const [showWeights, setShowWeights] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function clear() { setSubject(''); setContent(''); setUrl(''); setFile(null); setPreview(null); setError(''); onResult(null) }

  function loadPhishing() { setSubject(PHISHING_SAMPLE.subject); setContent(PHISHING_SAMPLE.content); setUrl(PHISHING_SAMPLE.url) }
  function loadSafe()     { setSubject(SAFE_SAMPLE.subject);     setContent(SAFE_SAMPLE.content);     setUrl(SAFE_SAMPLE.url) }

  function selectFile(f: File) {
    if (!['image/png', 'image/jpeg'].includes(f.type)) { setError('Only PNG / JPEG.'); return }
    setFile(f); setError('')
    const reader = new FileReader()
    reader.onload = e => setPreview(e.target?.result as string)
    reader.readAsDataURL(f)
  }
  const onDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) selectFile(f) }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!subject && !content && !url && !file) { setError('Provide at least one input modality.'); return }
    setLoading(true); setError('')
    try { onResult(await predictMultimodal(subject || undefined, content || undefined, url || undefined, file || undefined)) }
    catch (err: unknown) { setError(err instanceof Error ? err.message : 'Request failed'); onResult(null) }
    finally { setLoading(false) }
  }

  const sectionCard: React.CSSProperties = {
    background: 'var(--surface2)', border: '1px solid var(--border)',
    borderRadius: 10, padding: '16px 18px', marginBottom: 12,
  }

  return (
    <div className="card">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Multimodal Analysis</h2>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span className="badge" style={{ background: 'var(--accent-bg)', color: 'var(--accent)', border: '1px solid var(--accent-border)' }}>Max-Score Fusion</span>
            <span className="badge" style={{ background: 'var(--safe-bg)', color: 'var(--safe)', border: '1px solid var(--safe-border)' }}>Conservative Decision</span>
            {/* "How?" hyperlink — explains the fusion method */}
            <button onClick={() => setShowWeights(!showWeights)} style={{
              background: 'none', border: 'none', color: 'var(--accent)', fontSize: 12, cursor: 'pointer',
              textDecoration: 'underline', marginLeft: 4, fontWeight: 600,
            }}>How? {showWeights ? '▲' : '▼'}</button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 7, flexShrink: 0 }}>
          <button className="btn btn-phishing btn-sm" onClick={loadPhishing}>Phishing sample</button>
          <button className="btn btn-safe btn-sm" onClick={loadSafe}>Safe sample</button>
          <button className="btn btn-clear btn-sm" onClick={clear}>Clear</button>
        </div>
      </div>

      {/* Fusion explanation panel */}
      {showWeights && (
        <div style={{ background: 'var(--surface2)', border: '1px solid var(--accent-border)', borderRadius: 10, padding: '16px 18px', marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', marginBottom: 12 }}>ℹ How Multimodal Decision Fusion Works</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 14 }}>
            Each active modality independently produces a phishing probability score (0–1).
            The system uses the <strong style={{ color: 'var(--text)' }}>highest probability</strong> among all
            provided modalities as the final confidence score. This conservative approach ensures a
            strong phishing signal from one modality is <strong style={{ color: 'var(--text)' }}>never diluted</strong> by
            lower scores from other modalities.
          </div>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12.5, background: 'var(--bg)', borderRadius: 7, padding: '10px 14px', color: 'var(--accent)', marginBottom: 14 }}>
            Final score = max(Email score, URL score, Image score)
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 16 }}>
            The modality with the highest phishing probability becomes the <strong style={{ color: 'var(--text)' }}>primary evidence</strong>.
            Missing modalities are simply ignored — no renormalization needed.
          </div>
          {/* Live example */}
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 16px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.9, marginBottom: 10 }}>Example</div>
            {[
              { l: 'Email', v: 28, primary: false },
              { l: 'URL',   v: 91, primary: true  },
              { l: 'Image', v: 36, primary: false },
            ].map(m => (
              <div key={m.l} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 7 }}>
                <span style={{ fontSize: 12, width: 46, fontWeight: m.primary ? 700 : 500, color: m.primary ? 'var(--accent)' : 'var(--muted)' }}>{m.l}</span>
                <div style={{ flex: 1, background: 'var(--border)', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                  <div style={{ width: `${m.v}%`, height: '100%', background: m.primary ? 'var(--danger)' : 'var(--muted)', borderRadius: 4, opacity: m.primary ? 1 : 0.5 }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: m.primary ? 700 : 400, color: m.primary ? 'var(--danger)' : 'var(--muted)', width: 52, textAlign: 'right' }}>
                  {m.v}%{m.primary ? ' ★' : ''}
                </span>
              </div>
            ))}
            <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
              Final score = <span style={{ color: 'var(--danger)', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>91%</span> (URL) → <span style={{ color: 'var(--danger)', fontWeight: 700 }}>Phishing</span>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Email */}
        <div style={sectionCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 15 }}>✉</span>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-secondary)' }}>Email</span>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>optional</span>
          </div>
          <div className="form-group" style={{ marginBottom: 10 }}>
            <label className="form-label">Subject</label>
            <input type="text" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Email subject..." />
          </div>
          <label className="form-label">Email Body</label>
          <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Paste email content..." style={{ minHeight: 100 }} />
        </div>

        {/* URL */}
        <div style={sectionCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 15 }}>🔗</span>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-secondary)' }}>URL</span>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>optional</span>
          </div>
          <input type="text" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..."
            style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13 }} />
        </div>

        {/* Image */}
        <div style={{ ...sectionCard, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 15 }}>🖼</span>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-secondary)' }}>Image</span>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>optional</span>
          </div>
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => !preview && inputRef.current?.click()}
            style={{
              border: `2px dashed ${dragging ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 8, minHeight: 80, display: 'flex', alignItems: 'center',
              justifyContent: 'center', cursor: preview ? 'default' : 'pointer',
              background: dragging ? 'var(--accent-bg)' : 'var(--bg)', transition: 'all 0.15s', padding: 12,
            }}>
            {preview
              ? <img src={preview} alt="preview" style={{ maxHeight: 110, maxWidth: '100%', borderRadius: 6, objectFit: 'contain' }} />
              : <span style={{ fontSize: 13.5, color: 'var(--muted)' }}>Drop or <span style={{ color: 'var(--accent)', fontWeight: 600 }}>click to browse</span> · PNG / JPEG</span>
            }
            <input ref={inputRef} type="file" accept="image/png,image/jpeg" style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) selectFile(f); e.target.value = '' }} />
          </div>
        </div>

        <div style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 14, fontStyle: 'italic' }}>
          Tip: paste the full content for best accuracy
        </div>
        {error && (
          <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderLeft: '3px solid var(--danger)', borderRadius: 8, padding: '10px 14px', fontSize: 13.5, color: 'var(--danger)', marginBottom: 14 }}>⚠ {error}</div>
        )}
        <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', padding: '13px', fontSize: 15 }}>
          {loading ? 'Fusing modalities…' : '⚡  Analyze Multimodal'}
        </button>
      </form>
      {loading && <LoadingSpinner label="Running max-score fusion across modalities..." />}
    </div>
  )
}
