import { Link, useLocation } from 'react-router-dom'

const NAV = [
  { to: '/', label: 'Scanner' },
  { to: '/status', label: 'Status' },
  { to: '/about', label: 'About' },
]

export default function Header() {
  const { pathname } = useLocation()
  return (
    <header style={{
      background: 'rgba(17,24,39,0.85)', backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 100,
    }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', height: 66 }}>
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 11 }}>
          <span style={{
            width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
          }}>🛡</span>
          <span style={{ fontWeight: 800, fontSize: 18, color: 'var(--text)', letterSpacing: '-0.3px' }}>
            Phish<span style={{ color: 'var(--accent)' }}>Guard</span>
            <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted)', marginLeft: 7, letterSpacing: 1 }}>AI</span>
          </span>
        </Link>

        <nav style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
          {NAV.map(n => (
            <Link key={n.to} to={n.to} style={{
              padding: '8px 16px', borderRadius: 8, fontSize: 14, fontWeight: 500,
              textDecoration: 'none',
              color: pathname === n.to ? 'var(--text)' : 'var(--muted)',
              background: pathname === n.to ? 'var(--surface2)' : 'transparent',
              border: pathname === n.to ? '1px solid var(--border)' : '1px solid transparent',
              transition: 'all 0.15s',
            }}>{n.label}</Link>
          ))}
        </nav>
      </div>
    </header>
  )
}
