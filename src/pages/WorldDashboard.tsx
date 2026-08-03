import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useWorldStore } from '../store/worldStore';
import type { Divergence } from '../store/worldStore';
import DivergenceCard from '../components/DivergenceCard';
import WorldEventsFeed from '../components/WorldEventsFeed';
import CountryLeaderboard from '../components/CountryLeaderboard';
import CountryTable from '../components/CountryTable';
import CountryPanel from '../components/CountryPanel';
import RegionPanel from '../components/RegionPanel';
import { useRegionStore } from '../store/regionStore';
import { countryName } from '../data/countries';

const WORKER_URL = (import.meta.env.VITE_AI_PROXY_URL as string | undefined) ?? '';

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="game-card" style={{ flex: 1, minWidth: 140, padding: '12px 14px' }}>
      <div className="game-badge game-badge-yellow" style={{ fontSize: 9, marginBottom: 4 }}>
        {label}
      </div>
      <div className="game-font-heading" style={{ fontSize: 24, fontWeight: 800, color: '#fff' }}>{value}</div>
      {sub && <div style={{ color: 'var(--text-muted)', fontSize: 10, marginTop: 2, fontFamily: 'var(--font-heading)' }}>{sub}</div>}
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
    return <p style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', padding: 20, fontFamily: 'var(--font-heading)' }}>No divergences recorded yet. Run monthly sync to populate.</p>;
  }

  return (
    <div>
      {top5.map(d => <DivergenceCard key={d.id} div={d} />)}
    </div>
  );
}

function DivergenceTimeline({ divs }: { divs: Divergence[] }) {
  if (!divs.length) return null;

  return (
    <div style={{ position: 'relative', paddingLeft: 20 }}>
      {/* Vertical line */}
      <div style={{
        position: 'absolute', left: 7, top: 0, bottom: 0,
        width: 3, background: 'var(--accent-cyan)',
      }} />

      {divs.slice(0, 20).map(d => {
        const mag = Object.values(d.delta).reduce((s, v) => s + Math.abs(v), 0);
        const dot = mag > 5 ? 'var(--accent-magenta)' : mag > 2 ? 'var(--accent-yellow)' : 'var(--accent-green)';
        return (
          <div key={d.id} className="game-card" style={{ position: 'relative', marginBottom: 12, marginLeft: 6 }}>
            {/* Dot */}
            <div style={{
              position: 'absolute', left: -24, top: 12,
              width: 10, height: 10, borderRadius: '50%',
              background: dot, border: '2px solid #000',
              boxShadow: `0 0 8px ${dot}`,
            }} />
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="game-font-heading" style={{ fontWeight: 800, fontSize: 13, color: 'var(--accent-yellow)' }}>
                {countryName(d.country_code)}
              </span>
              <span style={{ color: 'var(--text-muted)', fontSize: 10, fontFamily: 'var(--font-heading)' }}>
                {new Date(d.published_at).toLocaleDateString('en-GB', {
                  day: 'numeric', month: 'short', year: 'numeric',
                })}
              </span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 11, margin: '4px 0 0', lineHeight: 1.45 }}>
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
    recentDivergences,
    loadRecentDivergences,
    selectedCountry,
    worldEvents,
    loadWorldEvents,
    countriesTracked,
    loadCountriesTracked,
    loadAllCountries,
  } = useWorldStore();

  const { selectedRegion } = useRegionStore();
  const [activeTab, setActiveTab] = useState<'top' | 'ranks' | 'timeline' | 'events'>('top');

  // Load divergences + events + all country states on mount
  useEffect(() => {
    loadAllCountries();
    loadRecentDivergences(50);
    loadWorldEvents('live', 40);
    loadCountriesTracked('live');
  }, []);

  // Latest simulated year, derived from the loaded divergences
  const simYear = recentDivergences.length
    ? Math.max(...recentDivergences.map(d => d.sim_year))
    : null;

  const divergedCount = recentDivergences.filter(d =>
    Object.values(d.delta).reduce((s, v) => s + Math.abs(v), 0) > 1
  ).length;

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', background: 'var(--bg-deep-space)', color: '#fff' }}>
      {/* Left sidebar */}
      <div className="game-panel" style={{
        width: 380, flexShrink: 0, borderRadius: 0, borderTop: 0, borderLeft: 0, borderBottom: 0,
        display: 'flex', flexDirection: 'column', overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 18px 12px', borderBottom: '2px dashed rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <div className="game-font-display" style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent-yellow)', textShadow: '2px 2px 0px #000' }}>
              🌍 DIVERGENCE DASHBOARD
            </div>
            <Link to="/" className="game-button game-button-dark" style={{ padding: '4px 10px', fontSize: 11 }}>
              ← 3D GLOBE
            </Link>
          </div>
          <div style={{ color: 'var(--accent-cyan)', fontSize: 11, fontFamily: 'var(--font-heading)', marginBottom: 12 }}>
            REAL-WORLD VS SIMULATION DRIFT TRACKER
          </div>

          <a
            href={`${WORKER_URL}/api/world/feed.xml`}
            target="_blank"
            rel="noopener noreferrer"
            className="game-badge game-badge-magenta"
            style={{ textDecoration: 'none', padding: '4px 8px' }}
          >
            📡 SUBSCRIBE RSS FEED
          </a>
        </div>

        {/* Stats Grid */}
        <div style={{ padding: '12px 14px 6px', display: 'flex', gap: 8 }}>
          <StatCard
            label="SIM YEAR"
            value={simYear ? String(simYear) : '—'}
            sub="LATEST AGENT CYCLE"
          />
          <StatCard
            label="COUNTRIES"
            value={countriesTracked !== null ? String(countriesTracked) : '—'}
            sub="AUTONOMOUS AGENTS"
          />
        </div>
        <div style={{ padding: '0 14px 12px', display: 'flex', gap: 8 }}>
          <StatCard
            label="EVENTS"
            value={String(worldEvents.length)}
            sub="INTER-AGENT EVENTS"
          />
          <StatCard
            label="DIVERGED"
            value={String(divergedCount)}
            sub={`OF ${recentDivergences.length} CHECKED`}
          />
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, padding: '0 14px 12px' }}>
          {(['top', 'ranks', 'timeline', 'events'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`game-button ${activeTab === tab ? 'game-button-cyan' : 'game-button-dark'}`}
              style={{ flex: 1, height: 32, fontSize: 11, padding: 0 }}
            >
              {tab === 'top' ? '🔥 TOP' : tab === 'ranks' ? '📊 RANKS' : tab === 'timeline' ? '⏳ TIMELINE' : '🌐 EVENTS'}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, padding: '0 14px 14px', overflowY: 'auto' }}>
          {activeTab === 'top'
            ? <TopDivergences divs={recentDivergences} />
            : activeTab === 'ranks'
              ? <CountryLeaderboard />
              : activeTab === 'timeline'
                ? <DivergenceTimeline divs={recentDivergences} />
                : <WorldEventsFeed events={worldEvents} />}
        </div>
      </div>

      {/* Main Stats Table View */}
      <div style={{ flex: 1, position: 'relative', display: 'flex', overflow: 'hidden' }}>
        <CountryTable />
        {selectedCountry && !selectedRegion && <CountryPanel />}
        {selectedRegion && <RegionPanel />}
      </div>
    </div>
  );
}
