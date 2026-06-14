# RealityShift — Research Report

> Mode: quick (inline) · Researched: 2026-06-13 · By: idea-research skill

---

## Verdict

| | |
|---|---|
| **Build it?** | yes-with-changes — sharpen the wedge; the "nothing like this exists" premise is no longer true |
| **Market** | crowded-with-gap — AI-driven grand strategy now exists commercially (Pax Historia), but no one runs a *persistent shared world* with *divergence-vs-reality* tracking |
| **Demand** | moderate — Pax Historia reports ~35k DAU and 100B+ tokens/week, proving real appetite for AI-run nations |
| **Direction** | tailwind — LLM-agent world simulation is an active 2025–2026 research and product wave |
| **Feasibility** | hard — persistent multi-agent coordination across ~195 countries within free-tier LLM limits (much already built) |
| **Free to build** | mostly — Groq/Supabase/Cloudflare/GitHub free tiers cover it, with two real free-tier gotchas (below) |
| **Monetization** | portfolio / open-source project — not applicable |

**In two sentences:** The original framing that "nothing like this exists" is false — Pax Historia (YC-backed, ~35k DAU) already sells AI-powered alternate-history grand strategy, and academic work (WarAgent) covers LLM multi-agent geopolitics. RealityShift is still worth building because its genuinely novel pieces — a *persistent, always-on shared world* and *public monthly divergence reports comparing the simulation to real unfolding news* — are unoccupied; lead with those, not with "AI runs the countries."

---

## Competitors

| Name | Pricing | Strength | Limitations | User complaints | Activity |
|---|---|---|---|---|---|
| **Pax Historia** (YC) | Not public (freemium/token-based implied) | AI powers other countries' reactions — dynamic, no scripted paths; ~35k DAU; 4,000+ community presets | Per-player sandbox over UGC presets, **not** a persistent shared world; no real-world divergence tracking | n/a (none surfaced in quick pass) | Very active (100B+ tokens/week) |
| **WarAgent** (open source, academic) | Free | LLM multi-agent sim of historical wars; public/private diplomatic actions | Research artifact, not a playable product; historical conflicts only | n/a | Paper + GitHub, not a live game |
| **Geo-Political Simulator / Rulers of Nations** | Paid (Steam) | Deep modeling of every country across many domains | Traditional scripted AI, single-player, no LLM agents | Steep learning curve, dated UI | Commercial, ongoing editions |
| **Democracy 4** | Paid (~$27) | Hundreds of policy sliders; best-in-class policy depth | Single-player, scripted, no live world or multi-country agents | Static/predictable AI feel | Mature, popular |
| **NationStates / Politics & War** | Free | Large communities; nation MMO with wars/espionage | No AI agents; dilemma-card or player-vs-player only | Shallow simulation depth | Large, long-running |

**Positioning:** The wedge is **two features no competitor combines**: (1) a *persistent always-on shared world* with one continuously-running agent per country (Pax Historia is per-session sandbox); (2) *public divergence reports* — "here's what AI predicted India would do vs. what actually happened," tracked monthly against real news. The second is both the differentiator and the marketing engine. "AI runs the other countries" is **no longer** a differentiator — Pax Historia owns that.

---

## What users actually say

Quick pass — Reddit MCP was access-restricted and `site:reddit.com` queries surfaced no usable verbatim threads (see *Could not access*). Demand is inferred from competitor traction rather than direct quotes:

- Pax Historia's reported **~35,000 daily active users** and **100B+ tokens processed weekly** is the single strongest demand signal: players will engage heavily with AI-driven nation simulation.
- Active demand for free NationStates/Democracy-4 alternatives recurs across 2026 "best alternatives" roundups, indicating an audience that wants deeper, free nation simulation.

**DIY workarounds found:** none captured in quick pass (players use existing scripted games or Pax Historia presets).
**Demand-strength read:** moderate — proven by a funded competitor's traction, but not validated for RealityShift's *specific* divergence-vs-reality angle.

---

## Demand signals

**Video (YouTube):** not assessed in quick mode (consumer-visual, so worth a deep check later — AI-nation and grand-strategy content performs well).
**Search interest:** not measured in quick pass; the category ("country simulator", "grand strategy") is established and steady per 2026 alternative-roundup volume.
**News & momentum:** Strong tailwind. LLM-agent world simulation is a named 2025–2026 wave (SocioVerse, WarAgent, "world models race"). A YC company (Pax Historia) in the exact adjacent space signals investor and user validation — and competitive risk.

---

## Feasibility

- **The spike:** persistent multi-agent coordination — keeping ~195 country agents coherent over many simulated months within free-tier LLM rate limits, plus the monthly news→compare→self-correct→divergence loop. Much of this is **already implemented** in the repo (country agent, RAG history match, inter-agent events, monthly sync functions exist).
- **Cost audit:**

  | Service | Free tier (2026) | Risk for this project |
  |---|---|---|
  | **Groq** (LLM) | ~1,000 req/day, 30 RPM, **6K TPM** on most models | TPM is the binding constraint; 195-country monthly sync fits RPD but throttles to several minutes. Fine for monthly + casual play. |
  | **Supabase** | 500 MB DB, pgvector included, 50k MAU | ⚠️ **Pauses after 1 week of inactivity** + max 2 active projects. A monthly-only cron leaves >1 week gaps → project sleeps → sync fails. **Mitigation: weekly keep-alive ping.** Watch 500 MB if per-country embeddings are added. |
  | **NewsAPI.org** | 100 req/day, dev-use restrictions | ⚠️ 195 countries/month > 100/day → batch over 2 days, or swap to a freer news source. |
  | **Cloudflare Workers** | 100k req/day, 10ms CPU/invocation | Fine — one country per invocation (already the design). |
  | **Cesium Ion / World Bank / REST Countries** | Free | No issue. |

- **Prior-art failures:** none found in quick pass.
- **Classification:** **hard** — but de-risked because the hardest pieces are already built. The remaining hard surface is operational (free-tier pausing, news quota, long-run coherence), not algorithmic. Milestone 0 spike is not needed retroactively; instead add a **keep-alive + quota-budgeting** task before relying on the monthly cron in production.

---

## Monetization

Portfolio / open-source project — not applicable. The community knowledge base (`periods.json`, `country_histories.json`) is the contribution magnet; the public divergence dashboard is the organic-growth surface. If monetization is ever wanted, the only sane path is donations/sponsorship — never gate the simulation.

---

## Conflicts & unknowns

- **Premise vs. reality:** PLAN.md states "Nothing like this exists." Research contradicts this — Pax Historia occupies the AI-grand-strategy space with real traction. The novel claim must narrow to *persistent shared world + divergence-vs-reality*. (Carried into PLAN.md Viability.)
- **Demand for the *specific* angle is unproven:** competitor traction proves appetite for AI nations, not for "alternate-history-vs-reality tracking." A landing page or the public `/world` dashboard itself is the cheapest validation.
- **Always-on vs. free tier:** the product is described as "always on," but the cheapest hosting (Supabase free) sleeps weekly. Either accept a keep-alive ping or reframe "always-on" as "monthly-tick."

## Could not access

- **Reddit MCP (reddit-mcp-buddy):** returned "Access forbidden" — no direct community threads mined.
- **`site:reddit.com` web queries:** returned no usable verbatim pain quotes for this niche.
- **Pax Historia pricing page:** not located in quick pass — business model inferred as token/freemium from "100B tokens/week."
- **YouTube demand & Google Trends:** skipped per quick mode.

Findings above should be read net of these gaps — a deep pass would strengthen the demand and community sections most.
