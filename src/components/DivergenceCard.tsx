import type { Divergence } from '../store/worldStore';
import { COUNTRY_NAMES } from './Globe';

function DeltaRow({ label, value }: { label: string; value: number }) {
  const positive = value > 0;
  const color = positive ? '#f87171' : '#34d399'; // red = sim above reality, green = below
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '3px 0' }}>
      <span style={{ color: '#9ca3af' }}>{label}</span>
      <span style={{ color, fontWeight: 600 }}>
        {positive ? '+' : ''}{value.toFixed(2)}
      </span>
    </div>
  );
}

export default function DivergenceCard({ div }: { div: Divergence }) {
  const deltaEntries = Object.entries(div.delta).filter(([, v]) => Math.abs(v) > 0.001);
  const magnitude = deltaEntries.reduce((a, [, v]) => a + Math.abs(v), 0);
  const severeColor = magnitude > 5 ? '#f87171' : magnitude > 2 ? '#fbbf24' : '#34d399';

  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 8,
      padding: '12px 14px',
      marginBottom: 10,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            background: severeColor,
            width: 8, height: 8, borderRadius: '50%', display: 'inline-block',
          }} />
          {/* ISO3 codes are developer-facing; lead with the readable name and
              keep the code as secondary metadata. */}
          <span style={{ fontWeight: 600, fontSize: 14 }}>
            {COUNTRY_NAMES[div.country_code] ?? div.country_code}
          </span>
          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>sim yr {div.sim_year}</span>
        </div>
        {/* Explicit day-month-year: toLocaleDateString() renders 28/07/2026,
            which is ambiguous across locales. */}
        <span style={{ color: 'var(--text-faint)', fontSize: 11 }}>
          {new Date(div.published_at).toLocaleDateString('en-GB', {
            day: 'numeric', month: 'short', year: 'numeric',
          })}
        </span>
      </div>

      {/* Narrative */}
      <p style={{ fontSize: 12, color: '#d1d5db', lineHeight: 1.5, margin: '0 0 8px' }}>
        {div.narrative.split('\n\nNews used:')[0].slice(0, 200)}
        {div.narrative.length > 200 ? '…' : ''}
      </p>

      {/* Deltas */}
      {deltaEntries.length > 0 && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 8 }}>
          {deltaEntries.slice(0, 4).map(([k, v]) => (
            <DeltaRow key={k} label={k.replace(/_/g, ' ')} value={v} />
          ))}
        </div>
      )}
    </div>
  );
}
