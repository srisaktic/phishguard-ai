import type { PredictionResult, MultimodalResult } from '../types'
import ConfidenceBar from './ConfidenceBar'

function lc(l: string) { return l==='phishing'?'var(--danger)':l==='legitimate'?'var(--safe)':'var(--warn)' }
function lb(l: string) { return l==='phishing'?'var(--danger-bg)':l==='legitimate'?'var(--safe-bg)':'var(--warn-bg)' }
function lbr(l:string) { return l==='phishing'?'var(--danger-border)':l==='legitimate'?'var(--safe-border)':'var(--warn-border)' }

function Verdict({ label, risk }: { label: string; risk: string }) {
  const icon = label==='phishing'?'⚠':label==='legitimate'?'✓':'?'
  return (
    <div style={{ background: lb(label), border:`1px solid ${lbr(label)}`, borderLeft:`4px solid ${lc(label)}`, borderRadius:10, padding:'16px 20px', marginBottom:16, display:'flex', alignItems:'center', gap:14 }}>
      <span style={{ width:46, height:46, borderRadius:'50%', background:lb(label), border:`2px solid ${lbr(label)}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, color:lc(label), flexShrink:0, fontWeight:800 }}>{icon}</span>
      <div>
        <div style={{ fontSize:11, color:'var(--muted)', textTransform:'uppercase', letterSpacing:0.9, marginBottom:3 }}>Verdict</div>
        <div style={{ fontSize:22, fontWeight:800, color:lc(label), textTransform:'capitalize', letterSpacing:'-0.3px' }}>{label}</div>
      </div>
      <div style={{ marginLeft:'auto', textAlign:'right' }}>
        <div style={{ fontSize:11, color:'var(--muted)', marginBottom:5 }}>Risk Level</div>
        <span style={{ background:lb(label), border:`1px solid ${lbr(label)}`, borderRadius:5, padding:'3px 11px', fontSize:11.5, fontWeight:700, color:lc(label), textTransform:'uppercase', letterSpacing:0.8 }}>{risk}</span>
      </div>
    </div>
  )
}

function SingleResult({ result }: { result: PredictionResult }) {
  return (
    <div className="fade-in">
      <Verdict label={result.label} risk={result.risk_level} />
      <div style={{ background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:9, padding:'14px 16px', marginBottom:14 }}>
        <ConfidenceBar label="Phishing Probability"   value={result.phishing_probability}  color="var(--danger)" />
        <ConfidenceBar label="Legitimate Probability" value={result.legitimate_probability} color="var(--safe)" />
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:12, flexWrap:'wrap' }}>
        <span style={{ fontSize:12, color:'var(--muted)' }}>Model:</span>
        {result.models_used.map(m=>(
          <span key={m} style={{ background:'var(--accent-bg)', border:'1px solid var(--accent-border)', borderRadius:5, padding:'3px 10px', fontSize:12.5, color:'var(--accent)', fontFamily:'JetBrains Mono, monospace', fontWeight:600 }}>{m}</span>
        ))}
        <span style={{ marginLeft:'auto', fontSize:12, color:'var(--muted)' }}>
          in <span style={{ color:'var(--accent)', fontWeight:700, fontFamily:'JetBrains Mono, monospace' }}>{result.processing_time_ms}ms</span>
        </span>
      </div>
      {result.extracted_features && (
        <div style={{ background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:9, padding:'13px 15px' }}>
          <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:1, color:'var(--muted)', marginBottom:10 }}>Extracted Features</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(130px,1fr))', gap:8 }}>
            {Object.entries(result.extracted_features).map(([k,v])=>(
              <div key={k} style={{ background:'var(--bg)', border:'1px solid var(--border)', borderRadius:6, padding:'8px 10px', transition:'border-color 0.15s' }}
                onMouseEnter={e=>(e.currentTarget as HTMLElement).style.borderColor='var(--accent)'}
                onMouseLeave={e=>(e.currentTarget as HTMLElement).style.borderColor='var(--border)'}>
                <div style={{ fontSize:10, color:'var(--muted)', textTransform:'uppercase', letterSpacing:0.4, marginBottom:3 }}>{k.replace(/_/g,' ')}</div>
                <div style={{ fontSize:15, fontWeight:700, color:'var(--accent)', fontFamily:'JetBrains Mono, monospace' }}>{String(v)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const MODALITY_ICON: Record<string, string> = { email: '✉', url: '🔗', image: '🖼' }
const MODALITY_NAME: Record<string, string> = { email: 'Email', url: 'URL', image: 'Image' }

function ModalityChip({ modKey, result, isPrimary }: { modKey: string; result: PredictionResult; isPrimary?: boolean }) {
  const displayName = `${MODALITY_ICON[modKey] ?? '◈'} ${MODALITY_NAME[modKey] ?? modKey}`
  const borderColor = isPrimary ? 'var(--accent-border)' : lbr(result.label)
  const accentLeft  = isPrimary ? 'var(--accent)' : lc(result.label)
  return (
    <div style={{ background:'var(--surface2)', border:`1px solid ${borderColor}`, borderLeft:`3px solid ${accentLeft}`, borderRadius:8, padding:'12px 14px', transition:'box-shadow 0.15s' }}
      onMouseEnter={e=>(e.currentTarget as HTMLElement).style.boxShadow='0 2px 12px rgba(0,0,0,0.3)'}
      onMouseLeave={e=>(e.currentTarget as HTMLElement).style.boxShadow='none'}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
        <div style={{ display:'flex', alignItems:'center', gap:7 }}>
          <span style={{ fontSize:12, fontWeight:700, textTransform:'uppercase', color: isPrimary ? 'var(--accent)' : 'var(--muted)', letterSpacing:0.7 }}>{displayName}</span>
          {isPrimary && (
            <span style={{ background:'var(--accent-bg)', border:'1px solid var(--accent-border)', borderRadius:4, padding:'1px 6px', fontSize:10, fontWeight:700, color:'var(--accent)', letterSpacing:0.5 }}>PRIMARY</span>
          )}
        </div>
        <span style={{ fontSize:12.5, fontWeight:700, color:lc(result.label), textTransform:'capitalize' }}>{result.label}</span>
      </div>
      <ConfidenceBar label={`Phishing ${Math.round(result.phishing_probability*100)}%`} value={result.phishing_probability} color={lc(result.label)} />
      <div style={{ fontSize:11.5, color:'var(--muted)', marginTop:5 }}>{result.models_used.join(' · ')} · {result.processing_time_ms}ms</div>
    </div>
  )
}

function MultiResult({ result }: { result: MultimodalResult }) {
  // Sort available modalities by phishing probability descending (triggered_by first)
  const sortedKeys = (['email', 'url', 'image'] as const)
    .filter(k => result.modalities[k] != null)
    .sort((a, b) =>
      (result.modalities[b]?.phishing_probability ?? 0) -
      (result.modalities[a]?.phishing_probability ?? 0)
    )

  return (
    <div className="fade-in">
      <Verdict label={result.label} risk={result.risk_level} />

      {/* Final probability from max-score fusion */}
      <div style={{ background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:9, padding:'14px 16px', marginBottom:12 }}>
        <ConfidenceBar label="Final Score (max-score fusion)" value={result.probability} color="var(--danger)" />
        <ConfidenceBar label="Overall Confidence"             value={result.confidence}  color="var(--accent)" />
      </div>

      {/* Primary evidence callout */}
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12, padding:'9px 14px', background:'var(--accent-bg)', border:'1px solid var(--accent-border)', borderRadius:8 }}>
        <span style={{ fontSize:12, color:'var(--muted)' }}>Primary evidence:</span>
        <span style={{ fontSize:13.5, fontWeight:700, color:'var(--accent)' }}>
          {MODALITY_ICON[result.triggered_by] ?? '◈'} {MODALITY_NAME[result.triggered_by] ?? result.triggered_by}
        </span>
        <span style={{ marginLeft:'auto', fontSize:12.5, fontFamily:'JetBrains Mono,monospace', fontWeight:700, color:'var(--danger)' }}>
          {Math.round(result.probability * 100)}%
        </span>
      </div>

      {/* Modality chips sorted by probability */}
      <div style={{ display:'flex', flexDirection:'column', gap:9, marginBottom:12 }}>
        {sortedKeys.map(k => (
          <ModalityChip key={k} modKey={k} result={result.modalities[k]!} isPrimary={result.triggered_by === k} />
        ))}
      </div>

      {/* Footer */}
      <div style={{ fontSize:12.5, color:'var(--muted)', paddingTop:10, borderTop:'1px solid var(--border)', display:'flex', flexWrap:'wrap', gap:8, alignItems:'center' }}>
        <span>Total: <span style={{ color:'var(--accent)', fontWeight:700, fontFamily:'JetBrains Mono,monospace' }}>{result.processing_time_ms}ms</span></span>
        <span>·</span>
        <span style={{ background:'var(--accent-bg)', border:'1px solid var(--accent-border)', borderRadius:4, padding:'1px 7px', fontSize:11, color:'var(--accent)', fontWeight:600 }}>max-score fusion</span>
        <span>·</span>
        <span>triggered by: <strong style={{ color:'var(--text-secondary)', textTransform:'capitalize' }}>{MODALITY_NAME[result.triggered_by] ?? result.triggered_by}</strong></span>
      </div>
    </div>
  )
}

export default function ResultPanel({ result, type }: { result: PredictionResult | MultimodalResult | null; type: 'single'|'multi' }) {
  if (!result) return null
  return type==='single' ? <SingleResult result={result as PredictionResult}/> : <MultiResult result={result as MultimodalResult}/>
}
