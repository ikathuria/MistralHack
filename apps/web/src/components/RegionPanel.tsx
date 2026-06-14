import { useRegionStore, REGION_POLICY_DEFAULTS } from '../store/regionStore';
import { useGameStore } from '../store/gameStore';
import { useWorldStore } from '../store/worldStore';

interface SliderCfg {
  key:   keyof typeof REGION_POLICY_DEFAULTS;
  label: string;
  min:   number;
  max:   number;
  step:  number;
  unit:  string;
  desc:  string;
}

const SLIDERS: SliderCfg[] = [
  { key: 'housing',   label: 'Housing Policy',  min: 0,  max: 10, step: 0.5, unit: '/10', desc: 'Rent control & zoning strictness' },
  { key: 'transport', label: 'Transit Funding', min: 0,  max: 10, step: 0.5, unit: '/10', desc: 'Public transport investment' },
  { key: 'local_tax', label: 'Local Tax Rate',  min: 5,  max: 40, step: 1,   unit: '%',   desc: 'Municipal revenue rate' },
];

function formatPop(pop: number | null): string {
  if (pop === null) return '—';
  if (pop >= 1_000_000) return `${(pop / 1_000_000).toFixed(1)}M`;
  if (pop >= 1_000)     return `${(pop / 1_000).toFixed(0)}K`;
  return `${pop}`;
}

export default function RegionPanel() {
  const { selectedRegion, regionStates, regionDraft, setRegionDraft, saveRegionPolicy, selectRegion } = useRegionStore();
  const { activeFork } = useGameStore();
  const { activeWorldId } = useWorldStore();

  if (!selectedRegion) return null;

  const worldId  = activeFork?.worldId ?? activeWorldId;
  const key      = `${worldId}:${selectedRegion.code}`;
  const existing = regionStates[key];
  const base     = existing?.policies ?? REGION_POLICY_DEFAULTS;

  const val = (k: keyof typeof REGION_POLICY_DEFAULTS): number =>
    regionDraft[k] !== undefined ? regionDraft[k]! : base[k];

  const isInFork = !!activeFork;
  const hasDraft = Object.keys(regionDraft).length > 0;

  return (
    <div
      className="slide-in-right"
      style={{
        position: 'absolute', top: 16, right: 16, width: 300,
        background: 'rgba(9,9,26,0.95)', backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14,
        color: '#fff', boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
        zIndex: 30, overflow: 'hidden',
      }}
    >
      {/* Top accent */}
      <div style={{
        height: 2, background: 'linear-gradient(90deg, #6366f1, #a78bfa, transparent)',
      }} />

      {/* Header */}
      <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 }}>
              Region
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.2 }}>
              {selectedRegion.name}
            </div>
            <div style={{ marginTop: 6, display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{
                fontSize: 10, fontWeight: 700,
                background: 'rgba(99,102,241,0.2)', color: '#818cf8',
                border: '1px solid rgba(99,102,241,0.3)',
                padding: '2px 8px', borderRadius: 4,
              }}>
                {selectedRegion.countryCode}
              </span>
              {existing?.population !== undefined && (
                <span style={{ fontSize: 11, color: '#6b7280' }}>
                  Pop. {formatPop(existing.population)}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => selectRegion(null)}
            style={{
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              color: '#9ca3af', cursor: 'pointer',
              width: 28, height: 28, borderRadius: 6,
              fontSize: 16, lineHeight: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
            onMouseLeave={e => (e.currentTarget.style.color = '#9ca3af')}
          >
            ×
          </button>
        </div>
      </div>

      {/* Sliders */}
      <div style={{ padding: '14px 16px' }}>
        <div className="section-label" style={{ marginBottom: 14 }}>Local Policies</div>

        {SLIDERS.map(cfg => {
          const current = val(cfg.key);
          const delta   = current - base[cfg.key];
          const decimals = cfg.step < 1 ? 1 : 0;
          const deltaStr = delta === 0 ? '' : (delta > 0 ? `+${delta.toFixed(decimals)}` : delta.toFixed(decimals));
          const deltaColor = delta > 0 ? '#34d399' : delta < 0 ? '#f87171' : '#6b7280';

          return (
            <div key={cfg.key} style={{ marginBottom: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 4 }}>
                <div>
                  <div style={{ fontSize: 12, color: '#d1d5db', fontWeight: 500 }}>{cfg.label}</div>
                  <div style={{ fontSize: 10, color: '#374151', marginTop: 1 }}>{cfg.desc}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ fontSize: 12, fontWeight: 700 }}>{current.toFixed(decimals)}</span>
                  <span style={{ fontSize: 10, color: '#4b5563' }}>{cfg.unit}</span>
                  {deltaStr && (
                    <span style={{
                      fontSize: 10, fontWeight: 700, color: deltaColor,
                      background: delta > 0 ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.12)',
                      padding: '1px 5px', borderRadius: 4,
                    }}>
                      {deltaStr}
                    </span>
                  )}
                </div>
              </div>
              <input
                type="range"
                min={cfg.min}
                max={cfg.max}
                step={cfg.step}
                value={current}
                onChange={e => setRegionDraft({ [cfg.key]: parseFloat(e.target.value) })}
                disabled={!isInFork}
              />
            </div>
          );
        })}

        {!isInFork && (
          <p style={{ fontSize: 11, color: '#374151', margin: '4px 0 10px', textAlign: 'center' }}>
            Take over a country to edit regional policies
          </p>
        )}

        {isInFork && (
          <button
            onClick={() => saveRegionPolicy(worldId)}
            disabled={!hasDraft}
            style={{
              width: '100%', padding: '10px 0', borderRadius: 9, border: 'none',
              background: hasDraft
                ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                : 'rgba(255,255,255,0.06)',
              color: hasDraft ? '#fff' : '#374151',
              fontSize: 13, fontWeight: 700,
              cursor: hasDraft ? 'pointer' : 'default',
              transition: 'filter 0.2s, box-shadow 0.2s',
              boxShadow: hasDraft ? '0 4px 14px rgba(99,102,241,0.3)' : 'none',
            }}
            onMouseEnter={e => { if (hasDraft) (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1.1)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.filter = 'none'; }}
          >
            Save Region Policy
          </button>
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: '8px 16px 12px',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        fontSize: 10, color: '#374151', textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.8,
      }}>
        Regional changes influence national agent decisions
      </div>
    </div>
  );
}
