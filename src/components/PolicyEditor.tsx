import { useGameStore } from '../store/gameStore';

interface SliderConfig {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
}

const INDICATOR_SLIDERS: SliderConfig[] = [
  { key: 'military_spend',   label: 'Military Spend',   min: 0,  max: 20, step: 0.1, unit: '% GDP' },
  { key: 'education_spend',  label: 'Education Spend',  min: 0,  max: 15, step: 0.1, unit: '% GDP' },
  { key: 'healthcare_spend', label: 'Healthcare Spend', min: 0,  max: 20, step: 0.1, unit: '% GDP' },
  { key: 'tax_rate',         label: 'Tax Revenue',      min: 5,  max: 60, step: 1,   unit: '% GDP' },
  { key: 'unemployment',     label: 'Unemployment',     min: 0,  max: 30, step: 0.5, unit: '%'     },
];

const POLICY_SLIDERS: SliderConfig[] = [
  { key: 'trade_openness', label: 'Trade Openness', min: 0, max: 10, step: 0.5, unit: '/10' },
  { key: 'press_freedom',  label: 'Press Freedom',  min: 0, max: 10, step: 0.5, unit: '/10' },
];

interface Props {
  baseIndicators: Record<string, number>;
  basePolicies: Record<string, unknown>;
}

function Slider({ cfg, base, value, onChange }: {
  cfg: SliderConfig;
  base: number;
  value: number;
  onChange: (v: number) => void;
}) {
  const delta = value - base;
  const deltaStr = delta === 0 ? '' : (delta > 0 ? `+${delta.toFixed(cfg.step < 1 ? 1 : 0)}` : delta.toFixed(cfg.step < 1 ? 1 : 0));
  const deltaColor = delta > 0 ? 'var(--accent-green)' : delta < 0 ? 'var(--accent-magenta)' : 'var(--text-muted)';

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>{cfg.label}</span>
        <span style={{ fontFamily: 'var(--font-heading)', fontSize: 12 }}>
          <span style={{ fontWeight: 800, color: 'var(--accent-yellow)' }}>{value.toFixed(cfg.step < 1 ? 1 : 0)}</span>
          <span style={{ color: 'var(--text-muted)', fontSize: 10 }}> {cfg.unit}</span>
          {deltaStr && (
            <span style={{
              marginLeft: 6, color: deltaColor, fontSize: 10, fontWeight: 800,
              background: 'rgba(0,0,0,0.4)', padding: '1px 5px', borderRadius: 4,
              border: `1px solid ${deltaColor}`,
            }}>
              {deltaStr}
            </span>
          )}
        </span>
      </div>
      <input
        type="range"
        min={cfg.min}
        max={cfg.max}
        step={cfg.step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{
          width: '100%',
          accentColor: 'var(--accent-cyan)',
          cursor: 'pointer',
          height: 6,
          borderRadius: 3,
        }}
      />
    </div>
  );
}

export default function PolicyEditor({ baseIndicators, basePolicies }: Props) {
  const { policyDraft, setPolicyDraft } = useGameStore();

  const val = (key: string, fallback: number) =>
    policyDraft[key] !== undefined ? policyDraft[key] : fallback;

  const basePolicy = (key: string): number => {
    const v = (basePolicies as Record<string, unknown>)[key];
    return typeof v === 'number' ? v : 5;
  };

  return (
    <div>
      <div className="game-badge game-badge-yellow" style={{ marginBottom: 12, display: 'inline-flex' }}>
        📊 BUDGET INDICATORS
      </div>

      {INDICATOR_SLIDERS.map(cfg => (
        <Slider
          key={cfg.key}
          cfg={cfg}
          base={baseIndicators[cfg.key] ?? (cfg.min + cfg.max) / 2}
          value={val(cfg.key, baseIndicators[cfg.key] ?? (cfg.min + cfg.max) / 2)}
          onChange={v => setPolicyDraft({ [cfg.key]: v })}
        />
      ))}

      <div className="game-badge game-badge-magenta" style={{ marginBottom: 12, marginTop: 16, display: 'inline-flex' }}>
        🏛️ STATE POLICIES
      </div>

      {POLICY_SLIDERS.map(cfg => (
        <Slider
          key={cfg.key}
          cfg={cfg}
          base={basePolicy(cfg.key)}
          value={val(cfg.key, basePolicy(cfg.key))}
          onChange={v => setPolicyDraft({ [cfg.key]: v })}
        />
      ))}
    </div>
  );
}
