import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorldStore } from '../store/worldStore';
import type { CountryState } from '../store/worldStore';
import { useAuthStore } from '../store/authStore';
import { useGameStore } from '../store/gameStore';
import DecisionLog from './DecisionLog';
import AuthModal from './AuthModal';

const INDICATOR_META: Record<string, { label: string; unit: string; decimals: number; min: number; max: number; color: string }> = {
  gdp_per_capita:   { label: 'GDP per Capita',     unit: 'USD',   decimals: 0, min: 500,   max: 80000, color: '#34d399' },
  population:       { label: 'Population',          unit: '',      decimals: 0, min: 1e6,   max: 1.5e9, color: '#818cf8' },
  tax_rate:         { label: 'Tax Revenue',         unit: '% GDP', decimals: 1, min: 5,     max: 55,    color: '#fbbf24' },
  military_spend:   { label: 'Military Spending',   unit: '% GDP', decimals: 2, min: 0,     max: 15,    color: '#f87171' },
  education_spend:  { label: 'Education Spending',  unit: '% GDP', decimals: 2, min: 0,     max: 12,    color: '#34d399' },
  healthcare_spend: { label: 'Healthcare Spending', unit: '% GDP', decimals: 2, min: 0,     max: 18,    color: '#60a5fa' },
  unemployment:     { label: 'Unemployment',        unit: '%',     decimals: 1, min: 0,     max: 25,    color: '#fbbf24' },
};

function fmt(value: number, decimals: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000)     return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000)         return `${(value / 1_000).toFixed(1)}K`;
  return value.toFixed(decimals);
}

function IndicatorRow({ name, value }: { name: string; value: number | undefined }) {
  const meta = INDICATOR_META[name];
  if (!meta || value === undefined) return null;

  const pct = Math.min(100, Math.max(0, ((value - meta.min) / (meta.max - meta.min)) * 100));

  return (
    <div style={{ padding: '7px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
        <span style={{ color: '#9ca3af', fontSize: 12 }}>{meta.label}</span>
        <span style={{ fontSize: 12, fontWeight: 600 }}>
          {fmt(value, meta.decimals)}
          {meta.unit && <span style={{ color: '#4b5563', fontWeight: 400 }}> {meta.unit}</span>}
        </span>
      </div>
      <div className="progress-track">
        <div
          className="progress-fill"
          style={{ width: `${pct}%`, background: meta.color, opacity: 0.7 }}
        />
      </div>
    </div>
  );
}

function CountryData({ data }: { data: CountryState }) {
  return (
    <div style={{ fontSize: 13 }} className="fade-up">
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        marginBottom: 12, padding: '7px 10px', borderRadius: 8,
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
      }}>
        <span style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1 }}>Sim year</span>
        <span style={{ fontWeight: 700, color: '#818cf8' }}>{data.year}</span>
        <span style={{ color: '#4b5563', fontSize: 10, marginLeft: 'auto' }}>
          {new Date(data.last_updated).toLocaleDateString()}
        </span>
      </div>
      {Object.keys(INDICATOR_META).map(key => (
        <IndicatorRow key={key} name={key} value={data.indicators[key]} />
      ))}
    </div>
  );
}

type PanelTab = 'indicators' | 'decisions';

export default function CountryPanel() {
  const { selectedCountry, countryData, selectCountry, activeWorldId } = useWorldStore();
  const { user, session } = useAuthStore();
  const { createFork, enterFork } = useGameStore();
  const navigate = useNavigate();
  const [tab, setTab] = useState<PanelTab>('indicators');
  const [showAuth, setShowAuth] = useState(false);
  const [takingOver, setTakingOver] = useState(false);
  const [takeoverError, setTakeoverError] = useState<string | null>(null);

  if (!selectedCountry) return null;

  const data = countryData[selectedCountry];
  const isLive = activeWorldId === 'live';

  const handleTakeOver = async () => {
    if (!user || !session) { setShowAuth(true); return; }
    setTakingOver(true);
    setTakeoverError(null);
    const result = await createFork(selectedCountry, session.access_token);
    setTakingOver(false);
    if (typeof result === 'string') { setTakeoverError(result); return; }
    enterFork({ worldId: result.worldId, countryCode: selectedCountry, year: result.year, createdAt: new Date().toISOString() });
    navigate(`/play/${result.worldId}`);
  };

  return (
    <>
      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          onSuccess={() => { setShowAuth(false); handleTakeOver(); }}
        />
      )}
      <div
        className="slide-in-right"
        style={{
          position: 'absolute', top: 0, right: 0, width: 300, height: '100vh',
          background: 'rgba(9,9,26,0.92)', backdropFilter: 'blur(12px)',
          color: '#fff', padding: '20px 16px', overflowY: 'auto',
          borderLeft: '1px solid rgba(255,255,255,0.1)', boxSizing: 'border-box',
          zIndex: 10,
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 }}>
              Country Selected
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.5 }}>
              {selectedCountry}
            </div>
          </div>
          <button
            onClick={() => selectCountry(null)}
            style={{
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              color: '#9ca3af', cursor: 'pointer',
              width: 28, height: 28, borderRadius: 6,
              fontSize: 16, lineHeight: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
            onMouseLeave={e => (e.currentTarget.style.color = '#9ca3af')}
            aria-label="Close panel"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div style={{ marginBottom: 14 }}>
          <div className="tab-group">
            {(['indicators', 'decisions'] as PanelTab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`tab-btn${tab === t ? ' active' : ''}`}
              >
                {t === 'indicators' ? 'Indicators' : 'Agent Log'}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1 }}>
          {tab === 'indicators' ? (
            !data
              ? <div style={{ color: '#6b7280', fontSize: 13 }}>Loading…</div>
              : <CountryData data={data} />
          ) : (
            <DecisionLog countryCode={selectedCountry} />
          )}
        </div>

        {/* Take Over CTA */}
        {isLive && (
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            {takeoverError && (
              <div style={{
                color: '#f87171', fontSize: 11, marginBottom: 10,
                background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)',
                padding: '7px 10px', borderRadius: 7,
              }}>
                {takeoverError}
              </div>
            )}
            <button
              onClick={handleTakeOver}
              disabled={takingOver}
              className={takingOver ? '' : 'pulse-glow'}
              style={{
                width: '100%', padding: '14px 0', borderRadius: 10, border: 'none',
                background: takingOver
                  ? 'rgba(255,255,255,0.07)'
                  : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                color: '#fff', fontSize: 14, fontWeight: 700,
                cursor: takingOver ? 'default' : 'pointer',
                letterSpacing: 0.3,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {takingOver ? (
                <><span className="spin">⟳</span> Forking universe…</>
              ) : (
                `⚡ Take Over ${selectedCountry}`
              )}
            </button>
            <div style={{ color: '#4b5563', fontSize: 11, textAlign: 'center', marginTop: 7 }}>
              {user ? 'Creates your own parallel universe' : 'Sign in to take control'}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
