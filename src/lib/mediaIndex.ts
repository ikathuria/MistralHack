// Typed reader for the per-fork media index the media layer writes to B2.
//
// The index lives at ${VITE_B2_PUBLIC_BASE}/index/{world_id}/media.json and is
// the sole source for the front-page wall — assets stream straight from B2 with
// no Worker or Supabase round-trip. Shape mirrors media/realityshift_media/index.py.

export interface MediaEntry {
  sim_date: string;            // ISO date
  nation_iso: string | null;
  kind: string;                // "front_page" | "broadcast" | ...
  b2_url: string;
  manifest_uri: string;
  canonical_hash: string;
}

export interface MediaIndex {
  world_id: string;
  count: number;
  media: MediaEntry[];
}

const B2_BASE = (import.meta.env.VITE_B2_PUBLIC_BASE as string | undefined) ?? '';

/** URL of a world's media index. Same-origin when VITE_B2_PUBLIC_BASE is unset. */
export function mediaIndexUrl(worldId: string): string {
  const base = B2_BASE.replace(/\/$/, '');
  return `${base}/index/${worldId}/media.json`;
}

/**
 * Fetch a world's media index. Returns null (not throwing) when no index exists
 * yet — a fork with no generated media is a normal empty state, not an error.
 */
export async function fetchMediaIndex(worldId: string): Promise<MediaIndex | null> {
  try {
    const res = await fetch(mediaIndexUrl(worldId), { cache: 'no-cache' });
    if (!res.ok) return null;
    const data = (await res.json()) as MediaIndex;
    if (!data || !Array.isArray(data.media)) return null;
    return data;
  } catch {
    return null;
  }
}
