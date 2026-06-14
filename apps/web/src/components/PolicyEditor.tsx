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
  const decimals = cfg.step < 1 ? 1 : 0;
  const deltaStr = delta === 0 ? '' : (delta > 0 ? `+${delta.toFixed(decimals)}` : delta.toFixed(decimals));
  const deltaColor = delta > 0 ? '#34d399' : delta < 0 ? '#f87171' : '#6b7280';

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: '#9ca3af' }}>{cfg.label}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#f1f5f9' }}>
            {value.toFixed(decimals)}
          </span>
          <span style={{ fontSize: 11, color: '#4b5563' }}>{cfg.unit}</span>
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
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
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
      <div className="section-label" style={{ marginBottom: 12 }}>Indicators</div>

      {INDICATOR_SLIDERS.map(cfg => (
        <Slider
          key={cfg.key}
          cfg={cfg}
          base={baseIndicators[cfg.key] ?? (cfg.min + cfg.max) / 2}
          value={val(cfg.key, baseIndicators[cfg.key] ?? (cfg.min + cfg.max) / 2)}
          onChange={v => setPolicyDraft({ [cfg.key]: v })}
        />
      ))}

      <div className="section-label" style={{ marginBottom: 12, marginTop: 18 }}>Policies</div>

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
