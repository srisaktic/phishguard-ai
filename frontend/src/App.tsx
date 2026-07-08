import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import ScannerPage from './pages/ScannerPage'
import StatusPage from './pages/StatusPage'
import AboutPage from './pages/AboutPage'

const NAV = [
  { to: '/', label: 'SCANNER' },
  { to: '/status', label: 'STATUS' },
  { to: '/about', label: 'ABOUT' },
]

function TopNav() {
  const { pathname } = useLocation()
  return (
    <header style={{
      background: 'var(--nav-bg)',
      borderBottom: '1px solid var(--nav-border)',
      position: 'sticky', top: 0, zIndex: 100,
      backdropFilter: 'blur(12px)',
    }}>
      <div className="pg-wrap top-nav-grid">

        {/* Left: Logo */}
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            width: 36, height: 36, borderRadius: 9,
            background: 'linear-gradient(135deg, #00d4b4, #0ea5e9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19,
            boxShadow: '0 0 14px rgba(0,212,180,0.35)', flexShrink: 0,
          }}>🛡</span>
          <span style={{ fontWeight: 800, fontSize: 17, color: '#f1f5f9', letterSpacing: '-0.3px', whiteSpace: 'nowrap' }}>
            PHISH<span style={{ color: 'var(--accent)' }}>GUARD</span>
            <span style={{ fontSize: 10.5, fontWeight: 400, color: 'var(--muted)', marginLeft: 6, letterSpacing: 1 }}>AI</span>
          </span>
        </Link>

        {/* Center: Floating pill nav */}
        <nav role="navigation" aria-label="Main navigation" style={{
          display: 'flex', gap: 3,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 99,
          padding: '4px',
        }}>
          {NAV.map(n => {
            const active = pathname === n.to
            return (
              <Link
                key={n.to} to={n.to}
                aria-current={active ? 'page' : undefined}
                style={{
                  padding: '7px 20px',
                  fontSize: 13.5, fontWeight: 700,
                  letterSpacing: '0.5px', textDecoration: 'none',
                  borderRadius: 99,
                  color: active ? '#0a0f1e' : 'var(--muted)',
                  background: active ? 'var(--accent)' : 'transparent',
                  transition: 'all 0.18s',
                  whiteSpace: 'nowrap',
                  outline: 'none',
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)' }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.color = 'var(--muted)' }}
                onFocus={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 2px var(--accent)' }}
                onBlur={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}
              >{n.label}</Link>
            )
          })}
        </nav>

        {/* Right: Privacy badge */}
        <div className="top-nav-badge" style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'flex-end' }}>
          <span style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'var(--safe-bg)', border: '1px solid var(--safe-border)',
            borderRadius: 20, padding: '5px 13px', fontSize: 12, fontWeight: 700, color: 'var(--safe)',
            whiteSpace: 'nowrap',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--safe)', display: 'inline-block', boxShadow: '0 0 5px var(--safe)' }} />
            SECURE INFERENCE
          </span>
          <span className="top-nav-subtitle" style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
            Privacy-First AI Detection
          </span>
        </div>

      </div>
    </header>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <TopNav />
        <div style={{ flex: 1 }}>
          <Routes>
            <Route path="/" element={<ScannerPage />} />
            <Route path="/status" element={<StatusPage />} />
            <Route path="/about" element={<AboutPage />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  )
}
