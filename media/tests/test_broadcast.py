"""Offline broadcast tests — the parts that need no ffmpeg/say/torch/network.

The full assembly (say + ffmpeg + diffusion) is exercised by `rs-media broadcast`
on a machine that has those tools; here we cover the script and chrome logic.
"""
import os
from datetime import date

from realityshift_media.broadcast import write_script, build_chrome, DISCLAIMER
from realityshift_media.contracts import DivergenceBrief, NarrativeBeat

os.environ.setdefault("RS_MEDIA_STUB", "1")


def _brief():
    return DivergenceBrief(
        fork_id="live", divergence_date=date(2027, 1, 1), sim_date=date(2027, 1, 1),
        nation_iso="IND", real_world_data_cutoff=date(2027, 1, 1),
        beats=[
            NarrativeBeat(headline="Government sets its course", summary="A new policy mix.", entities=["IND"]),
            NarrativeBeat(headline="Trade talks resume", summary="Negotiations reopen.", entities=["IND"], kind="diplomacy"),
        ],
    )


def test_script_fallback_leads_with_disclaimer(monkeypatch):
    # No GROQ_API_KEY -> deterministic fallback, disclaimer first.
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    segs = write_script(_brief())
    assert segs[0] == DISCLAIMER
    assert any("Government sets its course" in s for s in segs)
    assert len(segs) >= 3  # disclaimer + beats + sign-off


def test_chrome_is_transparent_and_full_frame():
    layer = build_chrome(masthead_txt="The India Dispatch", chyron="Government sets its course",
                         kind="policy", fork_id="live", sim_date="2027-01-01")
    assert layer.size == (1280, 720)
    assert layer.mode == "RGBA"
    # top-centre is transparent (b-roll shows through); bottom scrim is opaque
    assert layer.getpixel((640, 200))[3] == 0
    assert layer.getpixel((640, 700))[3] > 150
