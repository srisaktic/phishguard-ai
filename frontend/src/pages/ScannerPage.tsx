import { useState } from 'react'
import EmailCard from '../components/EmailCard'
import UrlCard from '../components/UrlCard'
import ImageCard from '../components/ImageCard'
import MultimodalCard from '../components/MultimodalCard'
import ResultPanel from '../components/ResultPanel'
import type { Tab, PredictionResult, MultimodalResult } from '../types'

type AnyResult = PredictionResult | MultimodalResult | null

const TABS: { id: Tab; label: string; sublabel: string }[] = [
  { id: 'email',      label: 'Email',      sublabel: 'TF-IDF + SVM'     },
  { id: 'url',        label: 'URL',        sublabel: 'BERT'              },
  { id: 'image',      label: 'Image',      sublabel: 'CNN Ensemble'      },
  { id: 'multimodal', label: 'Multimodal', sublabel: 'Max-Score Fusion'  },
]

const TAB_DESC: Record<Tab, string> = {
  email:      'Running Email analysis with TF-IDF + SVM (RBF kernel).',
  url:        'Running URL analysis with BERT (fine-tuned bert-base-uncased).',
  image:      'Running Image analysis with CNN Ensemble (ResNet50 · EfficientNet · DenseNet).',
  multimodal: 'Running Multimodal analysis with max-score decision fusion.',
}

const QUICK_CARDS = [
  { icon: '✉',  label: 'Email',      desc: 'Paste subject + body',     tabId: 'email'      },
  { icon: '🔗', label: 'URL',         desc: 'Enter any link',           tabId: 'url'        },
  { icon: '🖼', label: 'Image',       desc: 'Upload PNG or JPEG image', tabId: 'image'      },
  { icon: '⚡', label: 'Multimodal',  desc: 'Combine all three',        tabId: 'multimodal' },
] as const

export default function ScannerPage() {
  const [tab, setTab]               = useState<Tab>('email')
  const [result, setResult]         = useState<AnyResult>(null)
  const [resultType, setResultType] = useState<'single' | 'multi'>('single')

  function handleResult(r: AnyResult, type: 'single' | 'multi' = 'single') {
    setResult(r); setResultType(type)
  }

  function handleTabSwitch(t: Tab) { setTab(t); setResult(null) }

  return (
    <div style={{ minHeight: 'calc(100vh - 66px)', display: 'flex', flexDirection: 'column' }}>

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <div className="pg-wrap">
        <div className="hero-row">

          {/* Left: badge + single-line heading + disclaimer */}
          <div className="hero-left">
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', borderRadius: 99, padding: '4px 13px', marginBottom: 14 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block', boxShadow: '0 0 6px var(--accent)' }} />
              <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--accent)', letterSpacing: 0.5 }}>PRIVACY-PRESERVING AI</span>
            </div>
            <h1 style={{ fontSize: 'clamp(28px, 3vw, 44px)', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.8px', marginBottom: 8, lineHeight: 1.2 }}>
              Privacy-Preserving AI Phishing Detection
            </h1>
            <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.55, maxWidth: 520, fontStyle: 'italic' }}>
              Note: Models were trained on limited datasets. For greater accuracy across diverse phishing patterns,
              exposure to broader and varied datasets — combined with federated learning — would significantly improve detection.
            </p>
          </div>

          {/* Right: accuracy metric cards */}
          <div className="hero-stats-row">
            {[
              { v: '98.3%', l: 'Email Accuracy', d: 'TF-IDF + SVM'   },
              { v: '95.1%', l: 'URL Accuracy',   d: 'BERT fine-tuned' },
              { v: '89.7%', l: 'Image Accuracy', d: 'CNN Ensemble'    },
            ].map(s => (
              <div key={s.l} className="stat-card">
                <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--accent)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '-0.5px' }}>{s.v}</div>
                <div style={{ width: 40, height: 1.5, background: 'var(--accent-border)', borderRadius: 2, margin: '10px auto 10px' }} />
                <div style={{ fontSize: 13, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>{s.l}</div>
                <div style={{ fontSize: 12, color: 'var(--accent-border)', fontFamily: 'JetBrains Mono, monospace', marginTop: 5, letterSpacing: 0.2 }}>{s.d}</div>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* ── Vertical tabs + two-column content ───────────────────── */}
      <div className="pg-wrap" style={{ flex: 1, paddingTop: 20, paddingBottom: 48, display: 'flex', gap: 20 }}>

        {/* Vertical tab sidebar */}
        <div style={{ width: 168, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {TABS.map(t => {
            const active = tab === t.id
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={active}
                onClick={() => handleTabSwitch(t.id)}
                style={{
                  padding: '13px 14px',
                  borderRadius: 8,
                  background: active ? 'var(--surface)' : 'var(--surface2)',
                  border: `1px solid ${active ? 'var(--accent-border)' : 'var(--border)'}`,
                  borderLeft: `3px solid ${active ? 'var(--accent)' : 'transparent'}`,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.18s',
                }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; if (el.getAttribute('aria-selected') !== 'true') { el.style.background = 'var(--surface)'; el.style.borderLeftColor = 'var(--border2)' }}}
                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; if (el.getAttribute('aria-selected') !== 'true') { el.style.background = 'var(--surface2)'; el.style.borderLeftColor = 'transparent' }}}
              >
                <div style={{ fontSize: 15.5, fontWeight: 700, color: active ? 'var(--accent)' : 'var(--text-secondary)', lineHeight: 1.2, marginBottom: 4 }}>{t.label}</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11.5, color: active ? 'var(--accent-border)' : 'var(--muted)' }}>{t.sublabel}</div>
              </button>
            )
          })}
        </div>

        {/* Two-column content: input card + result panel */}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start', minWidth: 0 }}>

          {/* Left — Input panel */}
          <div style={{ minWidth: 0 }}>
            <div style={{ display: tab === 'email'      ? 'block' : 'none' }}><EmailCard      onResult={r => handleResult(r, 'single')} /></div>
            <div style={{ display: tab === 'url'        ? 'block' : 'none' }}><UrlCard        onResult={r => handleResult(r, 'single')} /></div>
            <div style={{ display: tab === 'image'      ? 'block' : 'none' }}><ImageCard      onResult={r => handleResult(r, 'single')} /></div>
            <div style={{ display: tab === 'multimodal' ? 'block' : 'none' }}><MultimodalCard onResult={r => handleResult(r, 'multi')} /></div>
          </div>

          {/* Right — Result panel */}
          <div className="result-card" style={{ minWidth: 0 }}>
          {result ? (
            <>
              <div className="result-card-header">
                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Analysis Result</span>
                <button className="btn btn-ghost btn-sm" onClick={() => setResult(null)} style={{ fontSize: 12 }}>✕ Clear</button>
              </div>
              <div className="result-card-body">
                <ResultPanel result={result} type={resultType} />
              </div>
            </>
          ) : (
            <div className="ready-state">
              <div style={{
                width: 72, height: 72, borderRadius: '50%', marginBottom: 20,
                background: 'linear-gradient(135deg, var(--accent-bg), var(--surface2))',
                border: '2px solid var(--accent-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34,
                boxShadow: '0 0 24px rgba(0,212,180,0.15)',
              }}>🛡</div>

              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginBottom: 10 }}>Ready to scan</div>
              <div style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: 270, marginBottom: 28 }}>
                {TAB_DESC[tab]}<br />
                Fill the form and run — <strong style={{ color: 'var(--text)' }}>results appear right here, no scrolling.</strong>
              </div>

              {/* Quick guide cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 300 }}>
                {QUICK_CARDS.map(item => (
                  <div
                    key={item.tabId}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 14px', borderRadius: 8, textAlign: 'left',
                      background: tab === item.tabId ? 'var(--accent-bg)' : 'var(--surface2)',
                      border: `1px solid ${tab === item.tabId ? 'var(--accent-border)' : 'var(--border)'}`,
                      transition: 'background 0.15s, border-color 0.15s',
                    }}
                  >
                    <span style={{ fontSize: 18 }}>{item.icon}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>{item.label}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          )}
          </div>
        </div>
      </div>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <div className="pg-wrap" style={{ borderTop: '1px solid var(--border)', background: 'var(--nav-bg)', paddingTop: 14, paddingBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>
            PhishGuard AI · Built by <strong style={{ color: 'var(--text-secondary)' }}>Sri Sakticharan Nirmal Kumar</strong>
          </span>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>All processing is private &amp; protected</span>
        </div>
      </div>
    </div>
  )
}
