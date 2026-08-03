import { useEffect, useMemo, useState } from 'react';
import { fetchMediaIndex, type MediaEntry } from '../lib/mediaIndex';
import { countryName } from '../data/countries';

// Year straight from the ISO string. new Date('2025-01-01').getFullYear() parses
// as UTC midnight and shifts to the previous year in negative-offset zones.
const isoYear = (d: string): string => d.slice(0, 4);

/**
 * A wall of generated newspaper front pages for one world.
 *
 * Reads the media index straight from B2 (see lib/mediaIndex) and streams each
 * image from its durable URL — no Worker or Supabase round-trip. Front-page
 * entries only; broadcasts render elsewhere.
 */
export default function FrontPageWall({ worldId = 'live' }: { worldId?: string }) {
  const [entries, setEntries] = useState<MediaEntry[] | null>(null);
  const [simDate, setSimDate] = useState<string>('all');
  const [selectedImage, setSelectedImage] = useState<MediaEntry | null>(null);

  useEffect(() => {
    let live = true;
    fetchMediaIndex(worldId).then(idx => {
      if (live) setEntries(idx ? idx.media.filter(m => m.kind === 'front_page') : []);
    });
    return () => { live = false; };
  }, [worldId]);

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedImage(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const simDates = useMemo(
    () => Array.from(new Set((entries ?? []).map(e => e.sim_date))).sort(),
    [entries],
  );

  const shown = useMemo(
    () => (entries ?? []).filter(e => simDate === 'all' || e.sim_date === simDate),
    [entries, simDate],
  );

  if (entries === null) {
    return <div style={{ padding: 24, color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>Loading front pages…</div>;
  }

  if (entries.length === 0) {
    return (
      <div style={{ padding: 24, color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)', lineHeight: 1.5 }}>
        No front pages generated yet for this world. Run the media batch to
        populate the wall.
      </div>
    );
  }

  return (
    <div>
      {simDates.length > 1 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '0 0 18px' }}>
          <FilterChip label="ALL YEARS" active={simDate === 'all'} onClick={() => setSimDate('all')} />
          {simDates.map(d => (
            <FilterChip
              key={d}
              label={`YEAR ${isoYear(d)}`}
              active={simDate === d}
              onClick={() => setSimDate(d)}
            />
          ))}
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
        gap: 18,
      }}>
        {shown.map(e => (
          <figure
            key={e.canonical_hash}
            className="game-card"
            onClick={() => setSelectedImage(e)}
            style={{
              margin: 0, padding: 10, cursor: 'pointer',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            }}
          >
            <div style={{
              aspectRatio: '3 / 4', overflow: 'hidden', borderRadius: 'var(--radius-game-sm)',
              background: '#000', border: '2px solid var(--game-border-ink)',
              position: 'relative',
            }}>
              <img
                src={e.b2_url}
                alt={`Front page — ${countryName(e.nation_iso)}, ${isoYear(e.sim_date)}`}
                loading="lazy"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
              <div style={{
                position: 'absolute', bottom: 6, right: 6,
                background: 'rgba(7,9,19,0.85)', color: 'var(--accent-cyan)',
                fontSize: 10, fontFamily: 'var(--font-heading)', padding: '2px 6px',
                borderRadius: 4, border: '1px solid var(--accent-cyan)',
                pointerEvents: 'none',
              }}>
                🔍 ENLARGE
              </div>
            </div>
            <figcaption style={{
              marginTop: 8, fontSize: 12, color: '#fff', fontFamily: 'var(--font-heading)', fontWeight: 800,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
            }}>
              <span>{countryName(e.nation_iso)}</span>
              <span className="game-badge game-badge-yellow" style={{ fontSize: 10, padding: '1px 5px' }}>{isoYear(e.sim_date)}</span>
            </figcaption>
          </figure>
        ))}
      </div>

      {/* Lightbox Modal for Full Resolution Newspaper Reading */}
      {selectedImage && (
        <div
          onClick={() => setSelectedImage(null)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 9999,
            background: 'rgba(5, 7, 15, 0.92)',
            backdropFilter: 'blur(10px)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: 20, animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="game-panel"
            style={{
              position: 'relative',
              maxWidth: '92vw', maxHeight: '92vh',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              padding: 16, background: '#0b0f19',
              border: '3px solid var(--accent-cyan)',
              boxShadow: '0 0 30px rgba(0, 240, 255, 0.3)',
            }}
          >
            {/* Header toolbar */}
            <div style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: 12, gap: 16, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 10,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="game-badge game-badge-yellow" style={{ fontSize: 12, padding: '3px 8px' }}>
                  🗞️ {countryName(selectedImage.nation_iso)} · {isoYear(selectedImage.sim_date)}
                </span>
                <span style={{ fontSize: 11, fontFamily: 'var(--font-heading)', color: 'var(--accent-cyan)' }}>
                  FULL RESOLUTION EDITION
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <a
                  href={selectedImage.b2_url}
                  target="_blank"
                  rel="noreferrer"
                  className="game-button game-button-cyan"
                  style={{ height: 32, padding: '0 12px', fontSize: 11, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  🔗 OPEN ORIGINAL FILE
                </a>
                <button
                  onClick={() => setSelectedImage(null)}
                  className="game-button game-button-magenta"
                  style={{ height: 32, padding: '0 12px', fontSize: 11 }}
                >
                  ✖ CLOSE
                </button>
              </div>
            </div>

            {/* High-res Image preview */}
            <div style={{
              overflow: 'auto', maxHeight: 'calc(88vh - 70px)', width: '100%',
              display: 'flex', justifyContent: 'center', background: '#000',
              borderRadius: 6, border: '2px solid var(--game-border-ink)',
            }}>
              <img
                src={selectedImage.b2_url}
                alt={`Front page full view — ${countryName(selectedImage.nation_iso)}`}
                style={{ maxHeight: '82vh', width: 'auto', objectFit: 'contain', display: 'block' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`game-button ${active ? 'game-button-cyan' : 'game-button-dark'}`}
      style={{
        height: 30, padding: '0 12px', fontSize: 11,
      }}
    >
      {label}
    </button>
  );
}
