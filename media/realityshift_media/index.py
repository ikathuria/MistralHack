"""Per-fork media index, written to B2 as JSON.

The frontend reads this to render the front-page wall — it fetches
`index/{world_id}/media.json` and streams every asset straight from B2, with no
Worker or Supabase round-trip. This is deliberately a B2 object, not a Postgres
table: the batch generator is the sole writer (no lost-update risk), the
frontend always wants the whole set, and fork media is as public as the fork.
So the media layer adds no schema change.
"""
from __future__ import annotations

import json
from dataclasses import asdict, dataclass


@dataclass
class MediaEntry:
    sim_date: str          # ISO date
    nation_iso: str | None
    kind: str              # "front_page" | "broadcast" | ...
    b2_url: str            # durable, credential-free asset URL
    manifest_uri: str      # provenance manifest location in B2
    canonical_hash: str    # ties the asset to its manifest


def index_key(world_id: str) -> str:
    return f"index/{world_id}/media.json"


def build_index(world_id: str, entries: list[MediaEntry]) -> dict:
    """The index document. Sorted for stable diffs and predictable UI ordering."""
    rows = sorted(
        (asdict(e) for e in entries),
        key=lambda r: (r["sim_date"], r["nation_iso"] or "", r["kind"]),
    )
    return {"world_id": world_id, "count": len(rows), "media": rows}


def serialize(index: dict) -> bytes:
    return json.dumps(index, indent=2, sort_keys=False).encode("utf-8")


def entry_from_result(result, *, sim_date: str, nation_iso: str | None, kind: str,
                      private: bool = False) -> MediaEntry:
    """Pull the durable URL + manifest identity out of a Genblaze PipelineResult.

    With private=True the asset URL is replaced by a time-limited presigned URL,
    so a private B2 bucket can be read by the browser without a public bucket or
    a Worker proxy. Presigned URLs expire (<=7 days), so re-presign when the
    index is regenerated.
    """
    asset = result.run.steps[-1].assets[0]
    url = asset.url
    if private:
        from .presign import presign_url
        url = presign_url(asset.url)
    return MediaEntry(
        sim_date=sim_date,
        nation_iso=nation_iso,
        kind=kind,
        b2_url=url,
        manifest_uri=result.manifest.manifest_uri,
        canonical_hash=result.manifest.canonical_hash,
    )
