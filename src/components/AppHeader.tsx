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
        padding: '10px 16px',
        background: 'linear-gradient(to bottom, rgba(6,6,12,0.92), rgba(6,6,12,0))',
        pointerEvents: 'none',
      }}
    >
      <div style={{ pointerEvents: 'auto' }}>
        <div style={{
          fontSize: 'var(--font-size-lg)', fontWeight: 800, letterSpacing: -0.4,
          lineHeight: 1.1,
        }}>
          🌍 RealityShift
        </div>
        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
          AI agents run every country · pick one to take over
        </div>
      </div>

      {/* Where and when the visitor is. The globe is lit by the real sun
          position, so this explains why their own country is in daylight or
          darkness rather than leaving it looking like a rendering fault. */}
      <div style={{
        pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: 6,
        fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)',
        paddingLeft: 4,
      }}>
        <span aria-hidden>{visitor.isDay ? '☀️' : '🌙'}</span>
        <span>
          {visitor.country ?? visitor.timeZone} · {clock}
        </span>
      </div>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10, pointerEvents: 'auto' }}>
        <CountrySearch />
        <Link
          to="/wall"
          style={{
            display: 'inline-flex', alignItems: 'center', height: 32, padding: '0 12px',
            fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)',
            textDecoration: 'none', whiteSpace: 'nowrap',
          }}
        >
          🗞️ Front pages
        </Link>
        <Link
          to="/world"
          style={{
            display: 'inline-flex', alignItems: 'center', height: 32, padding: '0 12px',
            fontSize: 'var(--font-size-sm)', fontWeight: 600,
            color: 'var(--accent-text)', textDecoration: 'none',
            background: 'rgba(99,102,241,0.16)',
            border: '1px solid rgba(99,102,241,0.42)',
            borderRadius: 8, whiteSpace: 'nowrap',
          }}
        >
          Divergence dashboard →
        </Link>
      </div>
    </header>
  );
}
