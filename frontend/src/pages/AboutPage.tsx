export default function AboutPage() {
  const MODALITIES = [
    {
      icon: '✉', fullName: 'Email Modality', acc: '98.3%',
      color: 'var(--accent)', colorBg: 'var(--accent-bg)', colorBorder: 'var(--accent-border)',
      desc: 'TF-IDF vectorization (120,375 features) + SVM (RBF kernel). Subject + body concatenated. Platt scaling for calibrated probability output.',
      tags: ['TF-IDF', 'SVM', '120,375 features'],
    },
    {
      icon: '🔗', fullName: 'URL Modality', acc: '95.1%',
      color: '#60a5fa', colorBg: 'rgba(96,165,250,0.08)', colorBorder: 'rgba(96,165,250,0.25)',
      desc: 'BERT (bert-base-uncased) fine-tuned on raw URL strings. Full URL tokenized as input sequence. 3-epoch training on 7,500+ samples.',
      tags: ['BERT', 'bert-base-uncased', 'Fine-tuned'],
    },
    {
      icon: '🖼', fullName: 'Image Modality', acc: '89.7%',
      color: '#a78bfa', colorBg: 'rgba(167,139,250,0.08)', colorBorder: 'rgba(167,139,250,0.25)',
      desc: 'CNN ensemble: ResNet50, EfficientNet-B0, DenseNet121. Equal-weight soft voting. 5-epoch training on 1,313 phishing/legitimate screenshots.',
      tags: ['ResNet50', 'EfficientNet-B0', 'DenseNet121'],
    },
    {
      icon: '⚡', fullName: 'Multimodal Fusion', acc: 'max(·)',
      color: 'var(--safe)', colorBg: 'var(--safe-bg)', colorBorder: 'var(--safe-border)',
      desc: 'Max-score fusion: highest phishing probability across all active modalities becomes the final verdict. Strong signal from any one modality is decisive.',
      tags: ['Max-Score', 'Conservative', 'No Dilution'],
    },
  ]

  const STACK = [
    { k: 'Frontend',    v: 'React 18 + Vite + TypeScript' },
    { k: 'Backend',     v: 'FastAPI + Uvicorn' },
    { k: 'Email ML',    v: 'scikit-learn · TF-IDF · SVM' },
    { k: 'URL Model',   v: 'HuggingFace · BERT fine-tuned' },
    { k: 'Image DL',    v: 'PyTorch + torchvision' },
    { k: 'CNN Models',  v: 'ResNet50 · EfficientNet · DenseNet' },
    { k: 'Privacy',     v: 'Protected processing — no external calls' },
    { k: 'Deployment',  v: 'Web-ready inference service' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>

      {/* ── Compact header strip: title + author ───────────────── */}
      <div className="pg-wrap" style={{
        paddingTop: 20, paddingBottom: 18,
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', borderRadius: 99, padding: '4px 13px' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block', boxShadow: '0 0 6px var(--accent)' }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', letterSpacing: 0.5 }}>PRIVACY-PRESERVING AI</span>
          </div>
          <h1 style={{ fontSize: 'clamp(22px, 2.2vw, 30px)', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.5px', lineHeight: 1 }}>
            About PhishGuard AI
          </h1>
        </div>

        {/* Author inline */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 11, flexShrink: 0,
            background: 'var(--accent-bg)', border: '1.5px solid var(--accent-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
          }}>👨‍💻</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', lineHeight: 1.3 }}>Sri Sakticharan Nirmal Kumar</div>
            <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>Sole author · All research, model development, and implementation</div>
          </div>
        </div>
      </div>

      {/* ── Two-column main content ─────────────────────────────── */}
      <div className="pg-wrap" style={{
        display: 'grid', gridTemplateColumns: '1.1fr 0.9fr',
        gap: 20, paddingTop: 20, paddingBottom: 32,
      }}>

        {/* Left — System Architecture (4 cards, 2×2) */}
        <div className="card" style={{ padding: '18px 22px' }}>
          <div className="section-label">System Architecture</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {MODALITIES.map(m => (
              <div key={m.fullName} style={{
                background: 'var(--surface2)',
                border: `1px solid var(--border)`,
                borderLeft: `3px solid ${m.color}`,
                borderRadius: 10, padding: '14px 16px',
                display: 'flex', flexDirection: 'column',
                transition: 'box-shadow 0.15s, border-color 0.15s',
              }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.boxShadow = '0 0 18px rgba(0,0,0,0.25)'; el.style.borderColor = m.colorBorder }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.boxShadow = 'none'; el.style.borderColor = 'var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <span style={{
                    width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                    background: m.colorBg, border: `1px solid ${m.colorBorder}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17,
                  }}>{m.icon}</span>
                  <div>
                    <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text)', lineHeight: 1.2 }}>{m.fullName}</div>
                    <div style={{ fontSize: 13, fontFamily: 'JetBrains Mono, monospace', color: m.color, fontWeight: 700 }}>{m.acc}</div>
                  </div>
                </div>
                <p style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 10 }}>{m.desc}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {m.tags.map(tag => (
                    <span key={tag} style={{
                      background: m.colorBg, border: `1px solid ${m.colorBorder}`,
                      borderRadius: 4, padding: '2px 8px', fontSize: 12,
                      color: m.color, fontWeight: 600,
                    }}>{tag}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — Tech stack + Privacy */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Technical Stack */}
          <div className="card" style={{ padding: '18px 22px' }}>
            <div className="section-label">Technical Stack</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
              {STACK.map(({ k, v }) => (
                <div key={k} style={{
                  display: 'flex', flexDirection: 'column', gap: 3,
                  padding: '9px 13px', background: 'var(--surface2)',
                  border: '1px solid var(--border)', borderRadius: 8,
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent-border)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'}>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.8 }}>{k}</div>
                  <div style={{ fontSize: 13.5, color: 'var(--text-secondary)' }}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Privacy Guarantee */}
          <div className="card" style={{ padding: '16px 22px' }}>
            <div className="section-label">Privacy Guarantee</div>
            <div style={{ display: 'flex', gap: 10 }}>
              {[
                { icon: '🔒', t: 'Protected processing', d: 'All inference runs on-device' },
                { icon: '💾', t: 'No persistence',       d: 'Inputs discarded after inference' },
                { icon: '⚡', t: 'CPU-only',             d: 'No cloud GPU required' },
              ].map(item => (
                <div key={item.t} style={{
                  flex: 1, display: 'flex', gap: 9, padding: '11px 13px',
                  background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8,
                }}>
                  <span style={{ fontSize: 18, flexShrink: 0, lineHeight: 1.3 }}>{item.icon}</span>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>{item.t}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5 }}>{item.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
