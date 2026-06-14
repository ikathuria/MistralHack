import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useWorldStore } from '../store/worldStore';
import type { Divergence } from '../store/worldStore';
import DivergenceCard from '../components/DivergenceCard';
import WorldEventsFeed from '../components/WorldEventsFeed';
import Globe from '../components/Globe';
import CountryPanel from '../components/CountryPanel';
import RegionPanel from '../components/RegionPanel';
import { useRegionStore } from '../store/regionStore';

const WORKER_URL = (import.meta.env.VITE_AI_PROXY_URL as string | undefined) ?? '';

const CHOROPLETH_MODES = [
  { key: 'divergence',      label: 'Divergence' },
  { key: 'gdp_per_capita',  label: 'GDP' },
  { key: 'military_spend',  label: 'Military' },
  { key: 'unemployment',    label: 'Unemployment' },
  { key: 'education_spend', label: 'Education' },
  { key: 'healthcare_spend',label: 'Health' },
] as const;

function StatCard({ label, value, sub, accent }: {
  label: string; value: string; sub?: string; accent?: string;
}) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: `1px solid ${accent ? `${accent}30` : 'rgba(255,255,255,0.08)'}`,
      borderRadius: 10, padding: '14px 16px', flex: 1, minWidth: 120,
      position: 'relative', overflow: 'hidden',
    }}>
      {accent && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: `linear-gradient(90deg, ${accent}, transparent)`,
        }} />
      )}
      <div style={{ color: '#6b7280', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>
        {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, marginTop: 4, letterSpacing: -0.5, color: accent ?? '#fff' }}>
        {value}
      </div>
      {sub && <div style={{ color: '#4b5563', fontSize: 10, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function TopDivergences({ divs }: { divs: Divergence[] }) {
  const top5 = [...divs]
    .sort((a, b) => {
      const magA = Object.values(a.delta).reduce((s, v) => s + Math.abs(v), 0);
      const magB = Object.values(b.delta).reduce((s, v) => s + Math.abs(v), 0);
      return magB - magA;
    })
    .slice(0, 5);

  if (!top5.length) {
    return (
      <p style={{ color: '#4b5563', fontSize: 13 }}>
        No divergences yet. Run the monthly sync to populate this.
      </p>
    );
  }

  return (
    <div>
      {top5.map((d, i) => (
        <div key={d.id} className="fade-up" style={{ animationDelay: `${i * 0.06}s` }}>
          <DivergenceCard div={d} />
        </div>
      ))}
    </div>
  );
}

function DivergenceTimeline({ divs }: { divs: Divergence[] }) {
  if (!divs.length) return null;

  return (
    <div style={{ position: 'relative', paddingLeft: 22 }}>
      <div style={{
        position: 'absolute', left: 7, top: 0, bottom: 0,
        width: 2, background: 'rgba(255,255,255,0.07)',
        borderRadius: 1,
      }} />

      {divs.slice(0, 20).map((d, i) => {
        const mag = Object.values(d.delta).reduce((s, v) => s + Math.abs(v), 0);
        const dotColor = mag > 5 ? '#f87171' : mag > 2 ? '#fbbf24' : '#34d399';
        return (
          <div
            key={d.id}
            style={{ position: 'relative', marginBottom: 18, animationDelay: `${i * 0.04}s` }}
            className="fade-up"
          >
            <div style={{
              position: 'absolute', left: -22, top: 5,
              width: 10, height: 10, borderRadius: '50%',
              background: dotColor,
              boxShadow: `0 0 8px ${dotColor}80`,
              border: '2px solid #09091a',
            }} />
            <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
              <span style={{ fontWeight: 700, fontSize: 13 }}>{d.country_code}</span>
              <span style={{ color: '#6b7280', fontSize: 11 }}>
                {new Date(d.published_at).toLocaleDateString()}
              </span>
            </div>
            <p style={{ color: '#9ca3af', fontSize: 12, margin: '3px 0 0', lineHeight: 1.5 }}>
              {d.narrative.split('\n\nNews used:')[0].slice(0, 120)}…
            </p>
          </div>
        );
      })}
    </div>
  );
}

export default function WorldDashboard() {
  const {
    recentDivergences, loadRecentDivergences,
    setChoroplethMode, choroplethMode,
    selectedCountry, worldEvents, loadWorldEvents,
  } = useWorldStore();

  const { selectedRegion } = useRegionStore();
  const [simYear, setSimYear] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'top' | 'timeline' | 'events'>('top');

  useEffect(() => {
    loadRecentDivergences(50);
    loadWorldEvents('live', 40);
    setChoroplethMode('divergence');
    return () => setChoroplethMode('gdp_per_capita');
  }, []);

  useEffect(() => {
    if (!recentDivergences.length) return;
    const years = recentDivergences.map(d => d.sim_year);
    setSimYear(Math.max(...years));
  }, [recentDivergences]);

  const divergedCount = recentDivergences.filter(d =>
    Object.values(d.delta).reduce((s, v) => s + Math.abs(v), 0) > 1
  ).length;

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', background: '#09091a', color: '#fff' }}>

      {/* ── Left sidebar ── */}
      <div
        className="slide-in-left"
        style={{
          width: 360, flexShrink: 0,
          borderRight: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', flexDirection: 'column', overflowY: 'auto',
          background: 'linear-gradient(180deg, rgba(99,102,241,0.03) 0%, transparent 200px)',
        }}
      >
        {/* Header */}
        <div style={{ padding: '20px 20px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 7,
                background: 'linear-gradient(135deg, #6366f1, #a78bfa)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, boxShadow: '0 0 12px rgba(99,102,241,0.4)',
              }}>
                🌍
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: -0.4 }}>RealityShift</div>
                <div style={{ color: '#4b5563', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                  Simulation Tracker
                </div>
              </div>
            </div>
            <Link to="/" style={{
              color: '#6b7280', fontSize: 12, textDecoration: 'none',
              padding: '5px 10px', borderRadius: 6,
              border: '1px solid rgba(255,255,255,0.08)',
              transition: 'color 0.2s',
            }}>
              ← Globe
            </Link>
          </div>

          {/* RSS */}
          <a
            href={`${WORKER_URL}/api/world/feed.xml`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 11, fontWeight: 600, color: '#fb923c', textDecoration: 'none',
              background: 'rgba(251,146,60,0.1)', border: '1px solid rgba(251,146,60,0.2)',
              padding: '4px 10px', borderRadius: 6, marginTop: 14, marginBottom: 16,
            }}
          >
            ◉ RSS Feed
          </a>
        </div>

        {/* Stats */}
        <div style={{ padding: '0 16px 16px', display: 'flex', gap: 10 }}>
          <StatCard
            label="Sim Year"
            value={simYear ? String(simYear) : '—'}
            sub="latest agent cycle"
            accent="#6366f1"
          />
          <StatCard
            label="Divergences"
            value={String(divergedCount)}
            sub={`of ${recentDivergences.length} checked`}
            accent={divergedCount > 10 ? '#f87171' : divergedCount > 4 ? '#fbbf24' : '#34d399'}
          />
        </div>

        {/* Choropleth mode selector */}
        <div style={{ padding: '0 16px 14px' }}>
          <div className="section-label">Map Overlay</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {CHOROPLETH_MODES.map(m => (
              <button
                key={m.key}
                onClick={() => setChoroplethMode(m.key)}
                style={{
                  padding: '5px 10px', borderRadius: 6,
                  background: choroplethMode === m.key
                    ? 'rgba(99,102,241,0.25)'
                    : 'rgba(255,255,255,0.05)',
                  color: choroplethMode === m.key ? '#818cf8' : '#6b7280',
                  fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  border: choroplethMode === m.key
                    ? '1px solid rgba(99,102,241,0.4)'
                    : '1px solid transparent',
                  transition: 'all 0.15s',
                }}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ padding: '0 16px 12px' }}>
          <div className="tab-group">
            {(['top', 'timeline', 'events'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`tab-btn${activeTab === tab ? ' active' : ''}`}
              >
                {tab === 'top' ? 'Top Divergences' : tab === 'timeline' ? 'Timeline' : 'Events'}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, padding: '0 16px 16px', overflowY: 'auto' }}>
          {activeTab === 'top'
            ? <TopDivergences divs={recentDivergences} />
            : activeTab === 'timeline'
              ? <DivergenceTimeline divs={recentDivergences} />
              : <WorldEventsFeed events={worldEvents} />}
        </div>
      </div>

      {/* ── Globe ── */}
      <div style={{ flex: 1, position: 'relative' }}>
        <Globe />
        {selectedCountry && !selectedRegion && <CountryPanel />}
        {selectedRegion && <RegionPanel />}

        {/* Mode label */}
        <div style={{
          position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)',
          borderRadius: 20, border: '1px solid rgba(255,255,255,0.1)',
          padding: '6px 16px', fontSize: 12, color: '#9ca3af',
          pointerEvents: 'none',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ color: '#6366f1' }}>◉</span>
          {choroplethMode.replace(/_/g, ' ')} overlay · Click a country to inspect
        </div>
      </div>
    </div>
  );
}
