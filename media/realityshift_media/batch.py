"""Batch front-page generation → B2 (or local), one loaded model.

Generates a front page for each (nation, year) once, reusing a single loaded
diffusion model so only the first image pays the model-load cost. Uploads to B2
when credentials are present (presigned for a private bucket), otherwise writes
everything to a local directory. Writes the per-fork media index the frontend
front-page wall reads.
"""
from __future__ import annotations

import os
import shutil
import urllib.parse
from dataclasses import dataclass

from .adapter import build_brief
from .index import MediaEntry, build_index, entry_from_result, index_key, serialize
from .pipelines.front_page import generate_front_page, make_local_provider


@dataclass
class BatchResult:
    world_id: str
    generated: int
    failed: list[str]
    index_url: str | None       # where the frontend reads the index (presigned or local path)
    private: bool


def _have_b2() -> bool:
    return bool(os.environ.get("B2_BUCKET") and os.environ.get("B2_KEY_ID"))


def run_batch(
    pairs: list[tuple[str, int]],
    *,
    world_id: str = "live",
    backend: str = "local",
    private: bool = True,
    out_dir: str = "out",
    broadcasts: list[tuple[str, int]] | None = None,
) -> BatchResult:
    """Generate front pages for each (nation_iso, year) — and optionally a
    broadcast for each (nation, year) in `broadcasts` — then publish the index.

    Uploads to B2 if credentials are set (presigned when `private`); otherwise
    saves media + index under `out_dir`.
    """
    upload = _have_b2()
    provider = make_local_provider() if backend == "local" else None

    entries: list[MediaEntry] = []
    failed: list[str] = []

    for nation, year in (broadcasts or []):
        tag = f"broadcast {nation}@{year}"
        try:
            entry = _broadcast_entry(nation, year, world_id, out_dir, upload, private,
                                     illustrator=(provider._illustration if provider else None))
            entries.append(entry)
        except Exception as exc:  # noqa: BLE001
            failed.append(f"{tag}: {exc}")

    for nation, year in pairs:
        tag = f"{nation}@{year}"
        try:
            brief = build_brief(nation, year, world_id=world_id)
        except Exception as exc:  # noqa: BLE001 - report and continue the batch
            failed.append(f"{tag}: brief: {exc}")
            continue

        # A fresh sink per run — ObjectStorageSink is single-use.
        sink = _sink() if upload else None
        result = generate_front_page(brief, backend=backend, sink=sink, provider=provider)
        if result.failed_steps():
            failed.append(f"{tag}: {result.error_summary()}")
            continue

        if upload:
            entries.append(entry_from_result(
                result, sim_date=brief.sim_date.isoformat(),
                nation_iso=nation, kind="front_page", private=private,
            ))
        else:
            asset = result.run.steps[-1].assets[0]
            os.makedirs(out_dir, exist_ok=True)
            dst = os.path.join(out_dir, f"frontpage-{world_id}-{nation}-{year}.png")
            shutil.copy(urllib.parse.urlparse(asset.url).path, dst)
            entries.append(MediaEntry(
                sim_date=brief.sim_date.isoformat(), nation_iso=nation, kind="front_page",
                b2_url=dst, manifest_uri="(local)", canonical_hash=result.manifest.canonical_hash,
            ))

    index_doc = serialize(build_index(world_id, entries))
    index_url = _publish_index(world_id, index_doc, upload=upload, out_dir=out_dir)

    return BatchResult(
        world_id=world_id, generated=len(entries), failed=failed,
        index_url=index_url, private=private and upload,
    )


def _broadcast_entry(nation: str, year: int, world_id: str, out_dir: str,
                     upload: bool, private: bool, illustrator) -> MediaEntry:
    """Generate one broadcast, upload it (or keep local), return its index entry."""
    from .broadcast import generate_broadcast
    from .provenance import simulation_metadata

    brief = build_brief(nation, year, world_id=world_id)
    res = generate_broadcast(brief, out_dir=out_dir, illustrator=illustrator)

    if upload:
        from .presign import put_file
        key = f"broadcasts/{world_id}/{nation}-{year}.mp4"
        url = put_file(key, res["mp4"], "video/mp4")
        if not private:
            import os as _os
            url = f"https://s3.{_os.environ['B2_REGION']}.backblazeb2.com/{_os.environ['B2_BUCKET']}/{key}"
    else:
        url = res["mp4"]

    return MediaEntry(
        sim_date=brief.sim_date.isoformat(), nation_iso=nation, kind="broadcast",
        b2_url=url, manifest_uri="(embedded in mp4)", canonical_hash=res["canonical_hash"],
        duration=res["duration"], provenance=simulation_metadata(brief),
    )


def _sink():
    from .storage import backblaze_sink
    return backblaze_sink()


def _publish_index(world_id: str, body: bytes, *, upload: bool, out_dir: str) -> str:
    if upload:
        from .presign import put_index
        return put_index(index_key(world_id), body)
    os.makedirs(out_dir, exist_ok=True)
    path = os.path.join(out_dir, f"media-index-{world_id}.json")
    with open(path, "wb") as fh:
        fh.write(body)
    return path


def year_range(nations: list[str], start: int, end: int) -> list[tuple[str, int]]:
    """(nation, year) pairs for every nation across [start, end]."""
    return [(n, y) for n in nations for y in range(start, end + 1)]
