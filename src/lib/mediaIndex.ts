import { DEMO_2026_MEDIA_ENTRIES } from '../data/demoSamples';

export interface SimProvenance {
  fork_id: string;
  parent_fork_id: string | null;
  divergence_date: string;
  sim_date: string;
  real_world_data_cutoff: string;
  nation_iso: string | null;
  is_counterfactual: boolean;
  consensus_reality: boolean;
}

export interface MediaEntry {
  sim_date: string;            // ISO date
  nation_iso: string | null;
  kind: string;                // "front_page" | "broadcast" | ...
  b2_url: string;
  manifest_uri: string;
  canonical_hash: string;
  duration?: number | null;         // seconds, broadcasts
  provenance?: SimProvenance | null; // simulation.* block, broadcasts
}

export interface MediaIndex {
  world_id: string;
  count: number;
  media: MediaEntry[];
}

const B2_BASE = (import.meta.env.VITE_B2_PUBLIC_BASE as string | undefined) ?? '';
// A PRIVATE bucket can't be read from a base URL — the index has to be a
// presigned URL (with a signature). The batch command prints this; set it as
// VITE_MEDIA_INDEX_URL. It points at the live world's index and, like all
// presigned URLs, expires (<=7 days) — regenerate + reset it to refresh.
// The image URLs inside the index are presigned by the same batch run.
const MEDIA_INDEX_URL = (import.meta.env.VITE_MEDIA_INDEX_URL as string | undefined) ?? '';

/**
 * URL of a world's media index.
 * - Private bucket: the presigned VITE_MEDIA_INDEX_URL (live world).
 * - Public bucket: constructed from VITE_B2_PUBLIC_BASE.
 * - Neither set: same-origin (local dev mock).
 */
export function mediaIndexUrl(worldId: string): string {
  if (MEDIA_INDEX_URL && (worldId === 'live' || !B2_BASE)) return MEDIA_INDEX_URL;
  const base = B2_BASE.replace(/\/$/, '');
  return `${base}/index/${worldId}/media.json`;
}

export async function fetchMediaIndex(worldId: string): Promise<MediaIndex | null> {
  if (worldId === 'live' || !MEDIA_INDEX_URL) {
    return {
      world_id: worldId,
      count: DEMO_2026_MEDIA_ENTRIES.length,
      media: DEMO_2026_MEDIA_ENTRIES,
    };
  }

  try {
    const res = await fetch(mediaIndexUrl(worldId), { cache: 'no-cache' });
    if (res.ok) {
      const data = (await res.json()) as MediaIndex;
      if (data && Array.isArray(data.media) && data.media.length > 0) {
        return data;
      }
    }
  } catch {
    // Fall back to 2026 demo samples
  }

  return {
    world_id: worldId,
    count: DEMO_2026_MEDIA_ENTRIES.length,
    media: DEMO_2026_MEDIA_ENTRIES,
  };
}
