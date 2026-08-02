"""Batch runner, fully offline: stub illustrations, no Supabase, no B2.

build_brief is monkeypatched to a fixture so the batch logic (fan-out, graceful
per-item failure, local index write) is tested without network.
"""
import json
import os
from datetime import date

from realityshift_media import batch as batch_mod
from realityshift_media.batch import run_batch, year_range
from realityshift_media.contracts import DivergenceBrief, NarrativeBeat

os.environ.setdefault("RS_MEDIA_STUB", "1")


def test_year_range_fans_out():
    pairs = year_range(["IND", "USA"], 2025, 2027)
    assert len(pairs) == 6
    assert ("IND", 2025) in pairs and ("USA", 2027) in pairs


def _fixture_brief(nation, year, world_id="live"):
    if nation == "ZZZ":
        raise ValueError("no data")  # exercise the graceful-failure path
    return DivergenceBrief(
        fork_id=world_id, divergence_date=date(year, 1, 1), sim_date=date(year, 1, 1),
        nation_iso=nation, real_world_data_cutoff=date(year, 1, 1),
        beats=[NarrativeBeat(headline="Policy shift", summary="s", entities=[nation])],
    )


def test_run_batch_writes_local_index_and_skips_failures(monkeypatch, tmp_path):
    monkeypatch.setattr(batch_mod, "build_brief", _fixture_brief)
    monkeypatch.delenv("B2_BUCKET", raising=False)  # force local mode

    res = run_batch(
        [("IND", 2027), ("USA", 2027), ("ZZZ", 2027)],
        world_id="live", backend="local", out_dir=str(tmp_path),
    )

    assert res.generated == 2          # IND + USA
    assert len(res.failed) == 1        # ZZZ
    assert "ZZZ" in res.failed[0]

    # index written locally, listing the two successes
    idx = json.loads((tmp_path / "media-index-live.json").read_text())
    assert idx["count"] == 2
    assert {m["nation_iso"] for m in idx["media"]} == {"IND", "USA"}

    # the PNGs exist
    assert (tmp_path / "frontpage-live-IND-2027.png").exists()
    assert (tmp_path / "frontpage-live-USA-2027.png").exists()
