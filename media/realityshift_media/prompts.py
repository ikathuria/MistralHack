"""DivergenceBrief -> image prompts. Deterministic, no LLM.

Two hard constraints baked into every prompt (see the submission's synthetic
media policy):
  - Non-photoreal. An illustrated / risograph newspaper front page, never a
    photograph — this sidesteps deepfake territory and looks better than
    mediocre photorealism.
  - No real, identifiable people. Mastheads are fictional (invented per nation);
    prompts describe places, institutions and events, never a named leader's
    face.
"""
from __future__ import annotations

from .contracts import DivergenceBrief
from .countries import country_name

# Fictional mastheads, chosen deterministically per nation so a fork's paper is
# stable across regenerations. None is a real publication.
_MASTHEAD_WORDS = ["Chronicle", "Herald", "Sentinel", "Dispatch", "Tribune", "Ledger", "Gazette", "Observer"]


def masthead(nation_iso: str | None) -> str:
    name = country_name(nation_iso) if nation_iso else "World"
    word = _MASTHEAD_WORDS[sum(ord(c) for c in (nation_iso or "WLD")) % len(_MASTHEAD_WORDS)]
    return f"The {name} {word}"


def front_page_prompt(brief: DivergenceBrief) -> str:
    lead = brief.beats[0] if brief.beats else None
    sub = brief.beats[1] if len(brief.beats) > 1 else None
    paper = masthead(brief.nation_iso)
    year = brief.sim_date.year

    lead_txt = lead.headline if lead else "The month in policy"
    sub_line = f"Secondary headline: '{sub.headline}'. " if sub else ""

    return (
        f"An illustrated newspaper front page, flat risograph poster style, muted "
        f"two-tone print with halftone texture and visible paper grain. Masthead "
        f"reads '{paper}', dated {year}. Bold lead headline: '{lead_txt}'. "
        f"{sub_line}"
        f"Editorial illustration below the fold depicting {_scene(brief)}. "
        f"No photographs, no real people, no recognisable faces — stylised "
        f"illustration only. Clean vintage newsprint layout, columns of placeholder "
        f"text, no legible body copy."
    )


def _scene(brief: DivergenceBrief) -> str:
    """A safe, place/institution-level scene — never graphic, never a person."""
    kinds = {b.kind for b in brief.beats}
    if "conflict" in kinds:
        return "tense diplomatic corridors and shuttered borders, rendered abstractly"
    if "economy" in kinds:
        return "markets, currency and shifting economic fortunes as abstract motifs"
    if "diplomacy" in kinds:
        return "flags, negotiating tables and handshakes between institutions"
    return "government buildings and civic life under a new policy direction"
