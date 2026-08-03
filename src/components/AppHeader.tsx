import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import CountrySearch from './CountrySearch';
import { formatLocalTime, readVisitorContext } from '../lib/locale';

/**
 * Orientation bar for the globe view.
 *
 * The landing route previously rendered only <Globe /> and <CountryPanel />, so
 * a first-time visitor arrived at an unlabelled black sphere with no product
 * name, no explanation, and no route to the public dashboard. The primary action
 * ("Take Over") lives inside the country panel, which only appears after
 * successfully clicking a country — so nothing about the app's purpose or its
 * main interaction was discoverable from the landing page.
 */
export default function AppHeader() {
  const visitor = useMemo(() => readVisitorContext(), []);
  const [clock, setClock] = useState(() => formatLocalTime());

  // Minute resolution is enough; a per-second tick would re-render for nothing.
  useEffect(() => {
    const id = window.setInterval(() => setClock(formatLocalTime()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <header
      style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 30,
        display: 'flex', alignItems: 'center', gap: 16,
        padding: '14px 20px',
        background: 'linear-gradient(to bottom, rgba(7,9,19,0.95), rgba(7,9,19,0))',
        pointerEvents: 'none',
      }}
    >
      <div style={{ pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            fontSize: 26,
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
          }}>
            🌍
          </div>
          <div>
            <div className="game-font-display" style={{
              fontSize: 22,
              fontWeight: 800,
              color: 'var(--accent-yellow)',
              textShadow: '2px 2px 0px #0b0f19, 0 0 10px rgba(255,230,0,0.4)',
              lineHeight: 1.0,
            }}>
              REALITY SHIFT
            </div>
            <div style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 10,
              fontWeight: 700,
              color: 'var(--accent-cyan)',
              letterSpacing: 0.8,
              marginTop: 2,
              textTransform: 'uppercase',
            }}>
              MULTI-AGENT WARGAME SIMULATOR
            </div>
          </div>
        </Link>
      </div>

      {/* Visitor Location & Sun Clock Badge */}
      <div className="game-badge" style={{
        pointerEvents: 'auto',
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '4px 10px',
        marginLeft: 8,
      }}>
        <span aria-hidden>{visitor.isDay ? '☀️' : '🌙'}</span>
        <span>
          {visitor.country ?? visitor.timeZone} · {clock}
        </span>
      </div>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12, pointerEvents: 'auto' }}>
        <CountrySearch />
        <Link
          to="/wall"
          className="game-button game-button-dark"
          style={{ height: 36, padding: '0 14px', fontSize: 12 }}
        >
          🗞️ FRONT PAGES
        </Link>
        <Link
          to="/world"
          className="game-button game-button-cyan"
          style={{ height: 36, padding: '0 16px', fontSize: 12 }}
        >
          📊 DASHBOARD →
        </Link>
      </div>
    </header>
  );
}
