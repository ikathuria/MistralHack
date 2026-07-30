import { Link, useParams } from 'react-router-dom';
import FrontPageWall from '../components/FrontPageWall';

/**
 * Full-width "front pages from a world that doesn't exist" wall.
 *
 * Its own route rather than a dashboard tab: a grid of newspaper covers needs
 * width the 360px dashboard sidebar can't give, and it is the media layer's
 * primary showcase.
 */
export default function WallPage() {
  const { worldId } = useParams();
  const world = worldId ?? 'live';

  return (
    <div style={{
      width: '100vw', minHeight: '100vh', background: 'var(--surface-base)',
      color: 'var(--text-primary)', overflowY: 'auto',
    }}>
      <header style={{
        display: 'flex', alignItems: 'baseline', gap: 16, flexWrap: 'wrap',
        padding: '20px 24px 8px',
      }}>
        <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 800, letterSpacing: -0.4 }}>
          🗞️ Front pages from a world that doesn't exist
        </div>
        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
          world: {world}
        </div>
        <Link
          to="/"
          style={{
            marginLeft: 'auto', fontSize: 'var(--font-size-sm)',
            color: 'var(--accent-text)', textDecoration: 'none',
          }}
        >
          ← Globe
        </Link>
      </header>
      <div style={{ padding: '8px 24px 32px' }}>
        <FrontPageWall worldId={world} />
      </div>
    </div>
  );
}
