import { useState, useEffect } from 'react'
import { getStatus } from '../api/client'
import type { ModelStatus } from '../types'
import LoadingSpinner from '../components/LoadingSpinner'

function Dot({ ok }: { ok: boolean }) {
  return (
    <span style={{
      display: 'inline-block', width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
      background: ok ? 'var(--safe)' : 'var(--danger)',
      boxShadow: ok ? '0 0 6px rgba(16,185,129,0.6)' : '0 0 6px rgba(239,68,68,0.6)',
    }} />
  )
}

export default function StatusPage() {
  const [status, setStatus] = useState<ModelStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  useEffect(() => {
    getStatus()
      .then(s => setStatus(s))
      .catch(() => setError('Backend unreachable — is uvicorn running on port 8000?'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <div className="pg-wrap" style={{ paddingTop: 28, paddingBottom: 20, borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', borderRadius: 99, padding: '4px 13px', marginBottom: 14 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block', boxShadow: '0 0 6px var(--accent)' }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', letterSpacing: 0.5 }}>LIVE STATUS</span>
        </div>
        <h1 style={{ fontSize: 'clamp(26px, 2.5vw, 36px)', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.6px', marginBottom: 10, lineHeight: 1.2 }}>
          Model Status
        </h1>
        <p style={{ fontSize: 15.5, color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: 520 }}>
          Live readiness check of all loaded inference models. Models are loaded at startup and kept in memory for zero-latency inference.
        </p>
      </div>

      {/* ── Content ──────────────────────────────────────────── */}
      <div className="pg-wrap" style={{ paddingTop: 24, paddingBottom: 32, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {loading && <LoadingSpinner label="Checking model registry..." />}

        {error && (
          <div style={{
            background: 'var(--danger-bg)', border: '1px solid var(--danger-border)',
            borderLeft: '4px solid var(--danger)', borderRadius: 10,
            padding: '16px 20px', color: 'var(--danger)', fontSize: 14.5,
          }}>
            ⚠ {error}
          </div>
        )}

        {status && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Overall status banner */}
            <div style={{
              background: status.models_loaded ? 'var(--safe-bg)' : 'var(--danger-bg)',
              border: `1px solid ${status.models_loaded ? 'var(--safe-border)' : 'var(--danger-border)'}`,
              borderLeft: `4px solid ${status.models_loaded ? 'var(--safe)' : 'var(--danger)'}`,
              borderRadius: 10, padding: '16px 22px',
              display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
            }}>
              <Dot ok={status.models_loaded} />
              <span style={{ fontWeight: 700, fontSize: 16, color: status.models_loaded ? 'var(--safe)' : 'var(--danger)' }}>
                {status.models_loaded ? 'All systems operational' : 'Some models unavailable'}
              </span>
              <span style={{ marginLeft: 'auto', fontSize: 13.5, color: 'var(--muted)' }}>
                Active modalities: <strong style={{ color: 'var(--text-secondary)' }}>{status.supported_modalities.join(', ')}</strong>
              </span>
            </div>

            {/* Per-model section cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16, alignItems: 'start' }}>
              {Object.entries(status.models).map(([section, models]) => (
                <div key={section} className="card" style={{ padding: '22px 26px', display: 'flex', flexDirection: 'column' }}>
                  <div className="section-label">{section.toUpperCase()} Models</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {Object.entries(models).map(([name, ok]) => (
                      <div
                        key={name}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '13px 16px', borderRadius: 8,
                          background: ok ? 'var(--safe-bg)' : 'var(--danger-bg)',
                          border: `1px solid ${ok ? 'var(--safe-border)' : 'var(--danger-border)'}`,
                          transition: 'box-shadow 0.15s',
                        }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 12px rgba(0,0,0,0.3)'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow = 'none'}
                      >
                        <Dot ok={ok} />
                        <span className="mono" style={{ fontSize: 14, color: ok ? 'var(--safe)' : 'var(--muted)', fontWeight: 500, flex: 1 }}>{name}</span>
                        <span style={{
                          fontSize: 12, fontWeight: 700,
                          textTransform: 'uppercase', letterSpacing: 0.6,
                          color: ok ? 'var(--safe)' : 'var(--danger)',
                        }}>{ok ? '● Loaded' : '○ Not loaded'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}
      </div>
    </div>
  )
}
