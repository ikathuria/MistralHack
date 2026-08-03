import { Link, useParams } from 'react-router-dom';
import FrontPageWall from '../components/FrontPageWall';
import BroadcastPlayer from '../components/BroadcastPlayer';

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
      width: '100vw', height: '100vh', background: 'var(--bg-deep-space)',
      color: '#fff', overflowY: 'auto',
    }}>
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
        padding: '20px 28px',
        borderBottom: '3px solid var(--game-border-ink)',
        background: 'var(--bg-hud-panel)',
      }}>
        <div>
          <div className="game-font-display" style={{
            fontSize: 26, fontWeight: 800, color: 'var(--accent-yellow)',
            textShadow: '2px 2px 0px #0b0f19, 0 0 12px rgba(255,230,0,0.4)',
          }}>
            🗞️ FORK MEDIA NEWSSTAND & KIOSK
          </div>
          <div style={{ fontSize: 11, fontFamily: 'var(--font-heading)', color: 'var(--accent-cyan)', marginTop: 2 }}>
            AUTHENTICATED COUNTERFACTUAL BROADCASTS · WORLD: {world.toUpperCase()}
          </div>
        </div>
        <Link
          to="/"
          className="game-button game-button-cyan"
          style={{ height: 38, padding: '0 16px', fontSize: 12 }}
        >
          ← GLOBE WARGAME
        </Link>
      </header>

      <div style={{ padding: '24px 28px 40px', maxWidth: 1400, margin: '0 auto' }}>
        <section style={{ marginBottom: 36 }}>
          <div className="game-badge game-badge-yellow" style={{ marginBottom: 12, fontSize: 12, padding: '4px 10px' }}>
            📺 DIVERGENCE BROADCAST STUDIO
          </div>
          <div className="game-panel" style={{ padding: 20 }}>
            <BroadcastPlayer worldId={world} />
          </div>
        </section>

        <section>
          <div className="game-badge game-badge-magenta" style={{ marginBottom: 12, fontSize: 12, padding: '4px 10px' }}>
            🗞️ NEWSPAPER FRONT PAGE GALLERY
          </div>
          <div className="game-panel" style={{ padding: 20 }}>
            <FrontPageWall worldId={world} />
          </div>
        </section>
      </div>
    </div>
  );
}
