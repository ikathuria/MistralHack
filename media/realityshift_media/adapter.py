"""Read-only Supabase -> DivergenceBrief.

This is the only module that touches the simulation's data, and it only reads.
It never writes, and it never imports simulation code — the simulation is
TypeScript on Cloudflare Workers, so the boundary is a database, not a function
call.

Fork divergence is derived here, not read from a table: `divergences` has no
world_id and tracks the live world against reality only. For a fork the
meaningful comparison is fork-vs-live at the same sim year, computed by joining
the fork's country_states against world_id='live'.
"""
from __future__ import annotations

import os
from datetime import date

from supabase import Client, create_client

from .contracts import DivergenceBrief, NarrativeBeat

# Indicators worth reporting a divergence on, and how to phrase a rise/fall.
_INDICATOR_LABELS = {
    "gdp_per_capita": "GDP per capita",
    "military_spend": "military spending",
    "tax_rate": "tax revenue",
    "unemployment": "unemployment",
    "education_spend": "education spending",
    "healthcare_spend": "healthcare spending",
}


def _client() -> Client:
    url = os.environ["SUPABASE_URL"]
    key = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ["SUPABASE_ANON_KEY"]
    return create_client(url, key)


def _latest_state(db: Client, world_id: str, nation: str, sim_year: int) -> dict | None:
    res = (
        db.table("country_states")
        .select("indicators, policies, year")
        .eq("world_id", world_id)
        .eq("country_code", nation)
        .eq("year", sim_year)
        .limit(1)
        .execute()
    )
    rows = res.data or []
    return rows[0] if rows else None


def _consensus_delta(fork: dict, live: dict | None) -> dict[str, float]:
    """Per-indicator (fork - live) at the same sim year. Empty for the live world."""
    if not live:
        return {}
    fi, li = fork.get("indicators") or {}, live.get("indicators") or {}
    delta: dict[str, float] = {}
    for key in _INDICATOR_LABELS:
        if isinstance(fi.get(key), (int, float)) and isinstance(li.get(key), (int, float)):
            diff = float(fi[key]) - float(li[key])
            if abs(diff) > 1e-9:
                delta[key] = round(diff, 4)
    return delta


def _beats(db: Client, world_id: str, nation: str, sim_year: int,
           delta: dict[str, float]) -> list[NarrativeBeat]:
    """Structural beats from the simulation record.

    Deliberately deterministic — built from agent_decisions and world_events, no
    LLM. The broadcast's script step (M14) is where chat() turns these into
    anchor copy; keeping the adapter LLM-free keeps the boundary cheap and
    testable.
    """
    beats: list[NarrativeBeat] = []

    dec = (
        db.table("agent_decisions")
        .select("reasoning, historical_parallel, year")
        .eq("world_id", world_id)
        .eq("country_code", nation)
        .order("year", desc=True)
        .limit(1)
        .execute()
    ).data or []
    if dec and dec[0].get("reasoning"):
        parallel = dec[0].get("historical_parallel") or {}
        pname = parallel.get("name") if isinstance(parallel, dict) else None
        beats.append(NarrativeBeat(
            headline="Government sets its course",
            summary=dec[0]["reasoning"][:400],
            entities=[nation],
            kind="policy",
        ))
        if pname:
            beats.append(NarrativeBeat(
                headline=f"Echoes of {pname}",
                summary=f"Analysts note the policy mix resembles {pname}.",
                entities=[nation],
                kind="policy",
            ))

    events = (
        db.table("world_events")
        .select("event_type, from_country, to_country, details, sim_year")
        .eq("world_id", world_id)
        .or_(f"from_country.eq.{nation},to_country.eq.{nation}")
        .order("sim_year", desc=True)
        .limit(3)
        .execute()
    ).data or []
    for ev in events:
        kind = "conflict" if ev["event_type"] in ("conflict_risk", "military_posture", "sanction") else "diplomacy"
        beats.append(NarrativeBeat(
            headline=ev["event_type"].replace("_", " ").title(),
            summary=ev["details"][:400],
            entities=[c for c in (ev.get("from_country"), ev.get("to_country")) if c],
            kind=kind,
        ))

    for key, diff in delta.items():
        direction = "rises" if diff > 0 else "falls"
        beats.append(NarrativeBeat(
            headline=f"{_INDICATOR_LABELS[key].title()} {direction}",
            summary=f"{_INDICATOR_LABELS[key].capitalize()} {direction} versus the consensus timeline.",
            entities=[nation],
            kind="economy",
        ))

    return beats


def build_brief(nation_iso: str, sim_year: int, world_id: str = "live") -> DivergenceBrief:
    """Assemble a DivergenceBrief for one nation-month.

    For a fork, `world_id` is the fork id and divergence is measured against the
    live world. For the live world, consensus_delta is empty and the brief still
    describes what the nation's agent did — useful for the front-page wall.
    """
    db = _client()

    fork_state = _latest_state(db, world_id, nation_iso, sim_year)
    if not fork_state:
        raise ValueError(f"No country_states for {nation_iso} @ {sim_year} in world {world_id}")

    live_state = None if world_id == "live" else _latest_state(db, "live", nation_iso, sim_year)
    delta = _consensus_delta(fork_state, live_state)

    if world_id == "live":
        divergence_dt = date(sim_year, 1, 1)
    else:
        world = (
            db.table("worlds").select("forked_at_year, fork_of")
            .eq("id", world_id).limit(1).execute()
        ).data or [{}]
        divergence_dt = date(int(world[0].get("forked_at_year") or sim_year), 1, 1)

    parent = None
    if world_id != "live":
        parent = (world[0].get("fork_of") if world else None)

    return DivergenceBrief(
        fork_id=world_id,
        parent_fork_id=parent,
        divergence_date=divergence_dt,
        sim_date=date(sim_year, 1, 1),
        nation_iso=nation_iso,
        beats=_beats(db, world_id, nation_iso, sim_year, delta),
        real_world_data_cutoff=divergence_dt,
        consensus_delta=delta,
    )
