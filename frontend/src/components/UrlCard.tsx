import { useState } from 'react'
import { predictUrl } from '../api/client'
import type { PredictionResult } from '../types'
import LoadingSpinner from './LoadingSpinner'

const PHISHING_URL = 'http://secure-paypal-login.xyz/account/verify?token=abc123&user=target'
const SAFE_URL     = 'https://github.com/topics/machine-learning'

interface Props { onResult: (r: PredictionResult | null) => void }

export default function UrlCard({ onResult }: Props) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function clear() { setUrl(''); setError(''); onResult(null) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!url.trim()) return
    setLoading(true); setError('')
    try { onResult(await predictUrl(url.trim())) }
    catch (err: unknown) { setError(err instanceof Error ? err.message : 'Request failed'); onResult(null) }
    finally { setLoading(false) }
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>URL Analysis</h2>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <span className="badge" style={{ background: 'var(--accent-bg)', color: 'var(--accent)', border: '1px solid var(--accent-border)' }}>BERT</span>
            <span className="badge" style={{ background: 'var(--accent-bg)', color: 'var(--accent)', border: '1px solid var(--accent-border)' }}>bert-base-uncased</span>
            <span className="badge" style={{ background: 'var(--safe-bg)', color: 'var(--safe)', border: '1px solid var(--safe-border)' }}>Fine-tuned</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 7, flexShrink: 0 }}>
          <button className="btn btn-phishing btn-sm" onClick={() => setUrl(PHISHING_URL)}>Phishing sample</button>
          <button className="btn btn-safe btn-sm" onClick={() => setUrl(SAFE_URL)}>Safe sample</button>
          <button className="btn btn-clear btn-sm" onClick={clear}>Clear</button>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">URL to Analyze</label>
          <input type="text" value={url} onChange={e => setUrl(e.target.value)}
            placeholder="https://example.com/path?query=value" maxLength={2048}
            style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13.5 }} />
        </div>

        {/* Feature explanation */}
        <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', marginBottom: 18 }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Features Extracted</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
            {['URL length','Hostname length','Path length','Dot count','Hyphen count','Slash count','Query params','Ampersands','Equals signs','IP address','Suspicious TLD'].map(f => (
              <div key={f} style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block', flexShrink: 0 }} />
                {f}
              </div>
            ))}
          </div>
        </div>

        <div style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 14, fontStyle: 'italic' }}>
          Tip: paste the full URL including query parameters for best accuracy
        </div>
        {error && (
          <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderLeft: '3px solid var(--danger)', borderRadius: 8, padding: '10px 14px', fontSize: 13.5, color: 'var(--danger)', marginBottom: 14 }}>⚠ {error}</div>
        )}
        <button className="btn btn-primary" type="submit" disabled={loading || !url.trim()} style={{ width: '100%', padding: '13px', fontSize: 15 }}>
          {loading ? 'Analyzing…' : '⚡  Analyze URL'}
        </button>
      </form>
      {loading && <LoadingSpinner label="Running BERT URL analysis..." />}
    </div>
  )
}
