import { useState, useRef, useCallback } from 'react'
import { predictImage } from '../api/client'
import type { PredictionResult } from '../types'
import LoadingSpinner from './LoadingSpinner'

interface Props { onResult: (r: PredictionResult | null) => void }

export default function ImageCard({ onResult }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function clear() { setFile(null); setPreview(null); setError(''); onResult(null) }

  function selectFile(f: File) {
    if (!['image/png', 'image/jpeg'].includes(f.type)) { setError('Only PNG and JPEG supported.'); return }
    if (f.size > 10 * 1024 * 1024) { setError('File exceeds 10 MB.'); return }
    setFile(f); setError('')
    const reader = new FileReader()
    reader.onload = e => setPreview(e.target?.result as string)
    reader.readAsDataURL(f)
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files[0]; if (f) selectFile(f)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return
    setLoading(true); setError('')
    try { onResult(await predictImage(file)) }
    catch (err: unknown) { setError(err instanceof Error ? err.message : 'Request failed'); onResult(null) }
    finally { setLoading(false) }
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>Image Analysis</h2>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <span className="badge" style={{ background: 'var(--accent-bg)', color: 'var(--accent)', border: '1px solid var(--accent-border)' }}>ResNet50</span>
            <span className="badge" style={{ background: 'var(--accent-bg)', color: 'var(--accent)', border: '1px solid var(--accent-border)' }}>EfficientNet-B0</span>
            <span className="badge" style={{ background: 'var(--accent-bg)', color: 'var(--accent)', border: '1px solid var(--accent-border)' }}>DenseNet121</span>
            <span className="badge" style={{ background: 'var(--safe-bg)', color: 'var(--safe)', border: '1px solid var(--safe-border)' }}>CNN Ensemble</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 7, flexShrink: 0 }}>
          <button className="btn btn-clear btn-sm" onClick={clear}>Clear</button>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => !preview && inputRef.current?.click()}
          style={{
            border: `2px dashed ${dragging ? 'var(--accent)' : 'var(--border)'}`,
            borderRadius: 10, minHeight: 210, display: 'flex', alignItems: 'center',
            justifyContent: 'center', flexDirection: 'column', gap: 12,
            cursor: preview ? 'default' : 'pointer',
            background: dragging ? 'var(--accent-bg)' : 'var(--surface2)',
            transition: 'all 0.18s', marginBottom: 16, padding: 20,
            boxShadow: dragging ? '0 0 20px rgba(0,212,180,0.12)' : 'none',
          }}>
          {preview ? (
            <>
              <img src={preview} alt="preview" style={{ maxHeight: 200, maxWidth: '100%', borderRadius: 8, objectFit: 'contain', boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }} />
              <button type="button" className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); inputRef.current?.click() }}>Replace Image</button>
            </>
          ) : (
            <>
              <div style={{ fontSize: 44, opacity: 0.5 }}>🖼</div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 5 }}>Drag &amp; drop an image here</div>
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>or <span style={{ color: 'var(--accent)', fontWeight: 600 }}>click to browse</span> — PNG or JPEG, max 10 MB</div>
              </div>
            </>
          )}
          <input ref={inputRef} type="file" accept="image/png,image/jpeg" style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) selectFile(f); e.target.value = '' }} />
        </div>

        {file && (
          <div style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 14, display: 'flex', gap: 6, alignItems: 'center' }}>
            <span>📎</span><span className="mono">{file.name}</span><span>·</span><span>{(file.size / 1024).toFixed(1)} KB</span>
          </div>
        )}
        <div style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 14, fontStyle: 'italic' }}>
          Tip: upload a full-page image for best CNN accuracy
        </div>
        {error && (
          <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderLeft: '3px solid var(--danger)', borderRadius: 8, padding: '10px 14px', fontSize: 13.5, color: 'var(--danger)', marginBottom: 14 }}>⚠ {error}</div>
        )}
        <button className="btn btn-primary" type="submit" disabled={loading || !file} style={{ width: '100%', padding: '13px', fontSize: 15 }}>
          {loading ? 'Analyzing…' : '⚡  Analyze Image'}
        </button>
      </form>
      {loading && <LoadingSpinner label="Running CNN ensemble — ResNet50 · EfficientNet-B0 · DenseNet121..." />}
    </div>
  )
}
