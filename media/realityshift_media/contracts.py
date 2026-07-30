"""The stable interface between the simulation and the media layer.

The media layer reads only this shape. Everything the simulation emits is
adapted *into* a DivergenceBrief by adapter.py; nothing downstream of here
touches simulation internals or Supabase directly. Keeping the boundary in one
small module is what lets the media layer stay a pure consumer.
"""
from __future__ import annotations

from datetime import date

from pydantic import BaseModel, Field


class NarrativeBeat(BaseModel):
    """One story beat of a broadcast — a single reported development."""

    headline: str = Field(..., description="One-line headline for this beat.")
    summary: str = Field(..., description="1-3 sentence factual summary, no illustration of graphic events.")
    entities: list[str] = Field(
        default_factory=list,
        description="Countries/institutions named in the beat, as ISO3 codes or proper names.",
    )
    kind: str = Field(
        default="policy",
        description="policy | diplomacy | conflict | economy — drives b-roll prompt framing.",
    )


class DivergenceBrief(BaseModel):
    """A single fork-month, ready to drive a media pipeline.

    For a fork, divergence is measured against the live world at the same sim
    year — NOT against reality. Forks receive no real-world data after their
    split, so `real_world_data_cutoff` equals `divergence_date` by construction,
    and that invariant is what gets bound into every generated asset's manifest.
    """

    fork_id: str
    parent_fork_id: str | None = None

    # The month split from consensus reality (the live world's timeline).
    divergence_date: date
    # The in-fork month this brief reports.
    sim_date: date
    # ISO3 of the nation this brief is about; None for a global segment.
    nation_iso: str | None = None

    beats: list[NarrativeBeat] = Field(default_factory=list)

    # MUST equal divergence_date for a fork — enforced in __init__ below, and
    # carried into the provenance manifest as the verifiable no-new-data claim.
    real_world_data_cutoff: date

    # How this fork's state differs from the live world at sim_date, per
    # indicator. Structured, not prose, so the script step can reason over it.
    consensus_delta: dict[str, float] = Field(default_factory=dict)

    def model_post_init(self, _context: object) -> None:
        if self.real_world_data_cutoff != self.divergence_date:
            raise ValueError(
                "real_world_data_cutoff must equal divergence_date for a fork: "
                f"{self.real_world_data_cutoff} != {self.divergence_date}. "
                "A fork receives no real-world data after it splits."
            )
