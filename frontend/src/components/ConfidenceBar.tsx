interface Props { label: string; value: number; color?: string }

export default function ConfidenceBar({ label, value, color = 'var(--accent)' }: Props) {
  const pct = Math.round(value * 100)
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: 'var(--text-secondary)', marginBottom: 6 }}>
        <span>{label}</span>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: 'var(--text)' }}>{pct}%</span>
      </div>
      <div style={{ background: 'var(--border)', borderRadius: 4, height: 8, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', borderRadius: 4, background: color, animation: 'barFill 0.6s ease both', boxShadow: `0 0 8px ${color}66` }} />
      </div>
    </div>
  )
}
