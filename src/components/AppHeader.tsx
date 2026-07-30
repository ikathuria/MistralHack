import { Link } from 'react-router-dom';
import CountrySearch from './CountrySearch';

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

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10, pointerEvents: 'auto' }}>
        <CountrySearch />
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
