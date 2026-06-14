import { useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useGameStore } from '../store/gameStore';
import { useWorldStore } from '../store/worldStore';
import Globe from '../components/Globe';
import CountryPanel from '../components/CountryPanel';
import PolicyEditor from '../components/PolicyEditor';
import WorldEventsFeed from '../components/WorldEventsFeed';
import RegionPanel from '../components/RegionPanel';
import { useRegionStore } from '../store/regionStore';

function SimulateLog({ log }: { log: { country: string; status: string; error?: string }[] }) {
  if (!log.length) return null;
  return (
    <div style={{ marginTop: 14 }} className="fade-in">
      <div className="section-label">Last Simulation</div>
      {log.map((r, i) => (
        <div
          key={i}
          className="fade-up"
          style={{
            animationDelay: `${i * 0.04}s`,
            display: 'flex', gap: 8, alignItems: 'center',
            fontSize: 12, marginBottom: 5,
            padding: '5px 8px', borderRadius: 6,
            background: r.status === 'ok'
              ? 'rgba(52,211,153,0.07)'
              : 'rgba(248,113,113,0.07)',
          }}
        >
          <span style={{
            fontSize: 10, fontWeight: 700,
            color: r.status === 'ok' ? '#34d399' : '#f87171',
          }}>
            {r.status === 'ok' ? '✓' : '✗'}
          </span>
          <span style={{ color: r.status === 'ok' ? '#d1d5db' : '#f87171', flex: 1 }}>
            {r.country}
          </span>
          {r.error && (
            <span style={{ color: '#6b7280', fontSize: 10 }}>
              {r.error.slice(0, 36)}…
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

export default function GamePage() {
  const { worldId } = useParams<{ worldId: string }>();
  const navigate = useNavigate();
  const { session } = useAuthStore();
  const { activeFork, playerForks, loadPlayerForks, enterFork, exitFork, simulateYear, isSimulating, simulateLog } = useGameStore();
  const { selectedCountry, countryData, worldEvents, loadWorldEvents, setPulseCountry } = useWorldStore();
  const { selectedRegion } = useRegionStore();

  useEffect(() => {
    if (!session) { navigate('/'); return; }
    if (session.user) loadPlayerForks(session.user.id);
  }, [session]);

  useEffect(() => {
    if (!worldId || !playerForks.length) return;
    const fork = playerForks.find(f => f.worldId === worldId);
    if (!fork) return;
    if (activeFork?.worldId !== worldId) {
      enterFork(fork);
      loadWorldEvents(worldId, 30);
    }
  }, [worldId, playerForks]);

  useEffect(() => () => exitFork(), []);

  if (!activeFork) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: '#09091a', color: '#fff',
      }}>
        <div style={{ textAlign: 'center' }} className="fade-up">
          <div style={{
            width: 56, height: 56, borderRadius: 16, margin: '0 auto 16px',
            background: 'linear-gradient(135deg,#6366f1,#a78bfa)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, boxShadow: '0 0 24px rgba(99,102,241,0.5)',
          }}>🌍</div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>
            Loading your parallel universe
          </div>
          <div style={{ fontSize: 12, color: '#6b7280' }}>
            Initialising fork state…
          </div>
        </div>
      </div>
    );
  }

  const playerData = countryData[activeFork.countryCode];

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', background: '#09091a', color: '#fff' }}>

      {/* ── Left sidebar ── */}
      <div style={{
        width: 320, flexShrink: 0,
        borderRight: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', flexDirection: 'column', overflowY: 'auto',
        background: 'linear-gradient(180deg, rgba(99,102,241,0.04) 0%, transparent 160px)',
      }}
        className="slide-in-left"
      >
        {/* Header */}
        <div style={{ padding: '16px 16px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <Link
              to="/"
              onClick={() => exitFork()}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                color: '#6b7280', fontSize: 12, textDecoration: 'none',
                padding: '5px 10px', borderRadius: 6,
                border: '1px solid rgba(255,255,255,0.08)',
                transition: 'color 0.2s, border-color 0.2s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLAnchorElement).style.color = '#d1d5db';
                (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,0.18)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLAnchorElement).style.color = '#6b7280';
                (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,0.08)';
              }}
            >
              ← Exit
            </Link>
            <span style={{
              fontSize: 10, color: '#a78bfa', fontWeight: 700,
              background: 'rgba(167,139,250,0.12)',
              border: '1px solid rgba(167,139,250,0.25)',
              padding: '3px 9px', borderRadius: 20,
              textTransform: 'uppercase', letterSpacing: 0.8,
            }}>
              Parallel Universe
            </span>
          </div>

          {/* Country + Year hero */}
          <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12, padding: '14px 16px', marginBottom: 16,
          }}>
            <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
              Playing as
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5, marginBottom: 8 }}>
              {activeFork.countryCode}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(167,139,250,0.2))',
                border: '1px solid rgba(99,102,241,0.3)',
                borderRadius: 8, padding: '6px 12px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 10, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 }}>Year</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', lineHeight: 1 }}>{activeFork.year}</div>
              </div>
              <div style={{ fontSize: 11, color: '#4b5563', lineHeight: 1.5 }}>
                Isolated from<br />real-world data
              </div>
            </div>
          </div>
        </div>

        {/* Policy editor */}
        <div style={{ padding: '0 16px', flex: 1 }}>
          {playerData ? (
            <PolicyEditor
              baseIndicators={playerData.indicators}
              basePolicies={playerData.policies ?? {}}
            />
          ) : (
            <div style={{ color: '#6b7280', fontSize: 13 }}>Loading country data…</div>
          )}

          <button
            className="btn-secondary"
            onClick={async () => {
              await useGameStore.getState().savePolicyDraft();
              setPulseCountry(activeFork.countryCode);
            }}
            disabled={isSimulating}
            style={{ marginTop: 8, marginBottom: 4 }}
          >
            Save Changes
          </button>
        </div>

        {/* Simulate section */}
        <div style={{ padding: '12px 16px 22px' }}>

          <button
            onClick={() => session && simulateYear(session.access_token)}
            disabled={isSimulating || !session}
            className={isSimulating ? '' : 'pulse-glow'}
            style={{
              width: '100%', padding: '14px 0', borderRadius: 10, border: 'none',
              background: isSimulating
                ? 'rgba(255,255,255,0.06)'
                : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              color: '#fff', fontSize: 14, fontWeight: 700,
              cursor: isSimulating ? 'default' : 'pointer',
              transition: 'background 0.3s, opacity 0.2s',
              letterSpacing: 0.3,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {isSimulating ? (
              <>
                <span className="spin" style={{ fontSize: 14 }}>⟳</span>
                Simulating world…
              </>
            ) : (
              '▶  Simulate Year'
            )}
          </button>

          {isSimulating && (
            <div style={{
              color: '#6b7280', fontSize: 11, textAlign: 'center', marginTop: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
              className="blink"
            >
              <span>Running AI agents for neighboring countries</span>
            </div>
          )}

          <SimulateLog log={simulateLog} />

          {worldEvents.length > 0 && (
            <div style={{ marginTop: 18 }}>
              <div className="section-label">World Events</div>
              <WorldEventsFeed events={worldEvents} maxHeight={240} />
            </div>
          )}
        </div>
      </div>

      {/* ── Globe ── */}
      <div style={{ flex: 1, position: 'relative' }}>
        <Globe />
        {selectedCountry && !selectedRegion && <CountryPanel />}
        {selectedRegion && <RegionPanel />}

        {/* Fork banner */}
        <div style={{
          position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)',
          borderRadius: 20, border: '1px solid rgba(255,255,255,0.1)',
          padding: '6px 16px', fontSize: 12, color: '#9ca3af',
          pointerEvents: 'none',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ color: '#a78bfa' }}>⊕</span>
          Fork Universe · Year {activeFork.year} · Click a country to inspect
        </div>
      </div>
    </div>
  );
}
