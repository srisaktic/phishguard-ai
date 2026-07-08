export default function LoadingSpinner({ label = 'Analyzing...' }: { label?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '18px 0', color: 'var(--muted)' }}>
      <div style={{
        width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
        border: '2.5px solid var(--border)', borderTopColor: 'var(--accent)',
        animation: 'spin 0.7s linear infinite',
        boxShadow: '0 0 8px rgba(0,212,180,0.2)',
      }} />
      <span style={{ fontSize: 13, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-secondary)' }}>{label}</span>
    </div>
  )
}
