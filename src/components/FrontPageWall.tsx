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

  useEffect(() => {
    let live = true;
    fetchMediaIndex(worldId).then(idx => {
      if (live) setEntries(idx ? idx.media.filter(m => m.kind === 'front_page') : []);
    });
    return () => { live = false; };
  }, [worldId]);

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
        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
        gap: 18,
      }}>
        {shown.map(e => (
          <figure key={e.canonical_hash} className="game-card" style={{ margin: 0, padding: 10 }}>
            <div style={{
              aspectRatio: '3 / 4', overflow: 'hidden', borderRadius: 'var(--radius-game-sm)',
              background: '#000', border: '2px solid var(--game-border-ink)',
            }}>
              <img
                src={e.b2_url}
                alt={`Front page — ${countryName(e.nation_iso)}, ${isoYear(e.sim_date)}`}
                loading="lazy"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
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
