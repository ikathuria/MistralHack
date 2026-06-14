# 01 — Product Overview

## One sentence

RealityShift is a persistent multi-agent world simulation where one AI agent runs each country based on real history; players can fork the world, take over any country, and watch every other country's agent react — a true parallel universe with no new real-world data injected.

## Two modes, one shared world state

**Simulation mode (always on).** One AI agent per country runs continuously. Each agent is grounded in 10–20 years of its country's real history and makes decisions autonomously. Periodically the live world ingests real-world news, compares its simulated state to reality, self-corrects, and publishes **divergence reports** publicly — a living record of alternate history.

**Game mode (player-triggered).** A player picks any country, takes over from its agent, and the world **forks**. From that moment no new real-world data enters the fork. The player makes decisions manually; every other country's agent reacts in real time. The fork is a true parallel universe.

## Who it's for

Grand-strategy and simulation players (Democracy 4 / NationStates / Pax Historia audience), alternate-history enthusiasts, and people curious how AI models reason about geopolitics. Free and open source — community-built, no revenue goal.

## What makes it different

The AI-runs-the-other-countries mechanic alone is **no longer novel** (Pax Historia ships it commercially). RealityShift's defensible wedge is the combination of:

1. **A persistent, always-on shared world** — not a per-session sandbox.
2. **Public divergence reports** — "here's what the AI predicted India would do vs. what actually happened," tracked against real unfolding news.

Lead with those two. See [RESEARCH.md](../RESEARCH.md) for the competitive landscape and evidence.

## Design principles

- **Simulation-first, game-second.** Validate the always-on simulation before the game layer — if agents don't make coherent decisions, the game won't work.
- **History as analogy, not determinism.** Historical matches ground agent reasoning but the prompt forces reasoning about how today's world differs (nuclear deterrence, the UN/WTO/EU/ICC, economic interdependence, social media).
- **No moralizing, no blocking.** Agents and players can pursue any political direction. The simulation shows consequences, not judgments.
- **No new data in forks.** Once a player takes over, their universe is frozen from real-world input — the philosophical core.
