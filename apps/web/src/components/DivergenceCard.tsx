import type { Divergence } from '../store/worldStore';

function DeltaRow({ label, value }: { label: string; value: number }) {
  const positive = value > 0;
  const color = positive ? '#f87171' : '#34d399';
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, padding: '3px 0' }}>
      <span style={{ color: '#6b7280', textTransform: 'capitalize' }}>
        {label.replace(/_/g, ' ')}
      </span>
      <span style={{
        color, fontWeight: 700, fontSize: 11,
        background: positive ? 'rgba(248,113,113,0.1)' : 'rgba(52,211,153,0.1)',
        padding: '1px 6px', borderRadius: 4,
      }}>
        {positive ? '+' : ''}{value.toFixed(2)}
      </span>
    </div>
  );
}

export default function DivergenceCard({ div }: { div: Divergence }) {
  const deltaEntries = Object.entries(div.delta).filter(([, v]) => Math.abs(v) > 0.001);
  const magnitude = deltaEntries.reduce((a, [, v]) => a + Math.abs(v), 0);

  const severity = magnitude > 5 ? 'high' : magnitude > 2 ? 'med' : 'low';
  const borderColor = severity === 'high' ? '#f87171' : severity === 'med' ? '#fbbf24' : '#34d399';
  const severityLabel = severity === 'high' ? 'HIGH' : severity === 'med' ? 'MED' : 'LOW';

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderLeft: `3px solid ${borderColor}`,
      borderRadius: 8,
      padding: '11px 13px',
      marginBottom: 10,
      transition: 'background 0.2s',
    }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.055)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 800, fontSize: 14 }}>{div.country_code}</span>
          <span style={{
            fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8,
            color: borderColor, background: `${borderColor}18`,
            border: `1px solid ${borderColor}35`,
            padding: '1px 6px', borderRadius: 3,
          }}>
            {severityLabel}
          </span>
          <span style={{ color: '#4b5563', fontSize: 11 }}>yr {div.sim_year}</span>
        </div>
        <span style={{ color: '#374151', fontSize: 10 }}>
          {new Date(div.published_at).toLocaleDateString()}
        </span>
      </div>

      {/* Narrative */}
      <p style={{ fontSize: 12, color: '#9ca3af', lineHeight: 1.55, margin: '0 0 8px' }}>
        {div.narrative.split('\n\nNews used:')[0].slice(0, 200)}
        {div.narrative.length > 200 ? '…' : ''}
      </p>

      {/* Deltas */}
      {deltaEntries.length > 0 && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 7 }}>
          {deltaEntries.slice(0, 4).map(([k, v]) => (
            <DeltaRow key={k} label={k} value={v} />
          ))}
        </div>
      )}
    </div>
  );
}
