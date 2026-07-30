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
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '0 0 14px' }}>
          <FilterChip label="All" active={simDate === 'all'} onClick={() => setSimDate('all')} />
          {simDates.map(d => (
            <FilterChip
              key={d}
              label={isoYear(d)}
              active={simDate === d}
              onClick={() => setSimDate(d)}
            />
          ))}
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
        gap: 14,
      }}>
        {shown.map(e => (
          <figure key={e.canonical_hash} style={{ margin: 0 }}>
            <div style={{
              aspectRatio: '3 / 4', overflow: 'hidden', borderRadius: 8,
              background: 'var(--surface-panel)', border: 'var(--border-subtle)',
            }}>
              <img
                src={e.b2_url}
                alt={`Front page — ${countryName(e.nation_iso)}, ${isoYear(e.sim_date)}`}
                loading="lazy"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            </div>
            <figcaption style={{
              marginTop: 6, fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)',
              display: 'flex', justifyContent: 'space-between', gap: 8,
            }}>
              <span>{countryName(e.nation_iso)}</span>
              <span style={{ color: 'var(--text-faint)' }}>{isoYear(e.sim_date)}</span>
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
      style={{
        minHeight: 26, padding: '0 10px', borderRadius: 6, cursor: 'pointer',
        fontSize: 'var(--font-size-xs)',
        border: active ? '1px solid rgba(99,102,241,0.5)' : 'var(--border-subtle)',
        background: active ? 'rgba(99,102,241,0.18)' : 'transparent',
        color: active ? 'var(--accent-text)' : 'var(--text-muted)',
      }}
    >
      {label}
    </button>
  );
}
