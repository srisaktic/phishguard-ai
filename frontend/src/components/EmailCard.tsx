import { useState } from 'react'
import { predictEmail } from '../api/client'
import type { PredictionResult } from '../types'
import LoadingSpinner from './LoadingSpinner'

const PHISHING = {
  subject: 'URGENT: Your account will be suspended',
  content: `Dear Customer,

We have detected suspicious activity on your account. Your access will be suspended within 24 hours unless you verify your identity immediately.

Click here to verify: http://secure-login-verify.xyz/confirm?token=abc123

Failure to act will result in permanent account closure.

Bank Security Team`,
}

const SAFE = {
  subject: 'Team standup — reminder',
  content: `Hi team,

Just a reminder about our weekly standup tomorrow at 10am. Please review the agenda beforehand.

No prep needed — just a quick 15-minute sync. Calendar invite is already in your inbox.

See you there.`,
}

interface Props { onResult: (r: PredictionResult | null) => void }

export default function EmailCard({ onResult }: Props) {
  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function clear() { setSubject(''); setContent(''); setError(''); onResult(null) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return
    setLoading(true); setError('')
    try { onResult(await predictEmail(subject, content)) }
    catch (err: unknown) { setError(err instanceof Error ? err.message : 'Request failed'); onResult(null) }
    finally { setLoading(false) }
  }

  return (
    <div className="card">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>Email Analysis</h2>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <span className="badge" style={{ background: 'var(--accent-bg)', color: 'var(--accent)', border: '1px solid var(--accent-border)' }}>TF-IDF Vectorizer</span>
            <span className="badge" style={{ background: 'var(--accent-bg)', color: 'var(--accent)', border: '1px solid var(--accent-border)' }}>SVM</span>
            <span className="badge" style={{ background: 'var(--safe-bg)', color: 'var(--safe)', border: '1px solid var(--safe-border)' }}>120,375 features</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 7, flexShrink: 0 }}>
          <button className="btn btn-phishing btn-sm" onClick={() => { setSubject(PHISHING.subject); setContent(PHISHING.content) }}>Phishing sample</button>
          <button className="btn btn-safe btn-sm" onClick={() => { setSubject(SAFE.subject); setContent(SAFE.content) }}>Safe sample</button>
          <button className="btn btn-clear btn-sm" onClick={clear}>Clear</button>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Subject Line</label>
          <input type="text" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Enter the email subject line..." maxLength={500} />
        </div>
        <div className="form-group">
          <label className="form-label">Email Body</label>
          <textarea value={content} onChange={e => setContent(e.target.value)}
            placeholder="Paste the full email body here..." maxLength={50000} style={{ minHeight: 210 }} />
          <div className={`char-count ${content.length > 45000 ? 'warn' : ''}`}>{content.length.toLocaleString()} / 50,000</div>
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 14, fontStyle: 'italic' }}>
          Tip: paste the full content for best accuracy
        </div>
        {error && (
          <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderLeft: '3px solid var(--danger)', borderRadius: 8, padding: '10px 14px', fontSize: 13.5, color: 'var(--danger)', marginBottom: 14 }}>⚠ {error}</div>
        )}
        <button className="btn btn-primary" type="submit" disabled={loading || !content.trim()} style={{ width: '100%', padding: '13px', fontSize: 15 }}>
          {loading ? 'Analyzing…' : '⚡  Analyze Email'}
        </button>
      </form>
      {loading && <LoadingSpinner label="Running TF-IDF + SVM analysis..." />}
    </div>
  )
}
