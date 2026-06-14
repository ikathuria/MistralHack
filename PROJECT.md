# RealityShift — Project Tracker

> Living context map. Any LLM or human should be able to read this file alone and understand
> what the project is, how it's built, and where things are. **Keep it in sync** — update it
> whenever the stack, structure, conventions, or status changes.

_Last updated: 2026-06-13_

---

## What it is

RealityShift is a persistent, free, open-source multi-agent world simulation. One AI agent runs each country, grounded in 10–20 years of that country's real history. The always-on "live" world periodically ingests real news, compares itself to reality, and publishes public **divergence reports** (alternate-history-vs-reality). Players can **fork** the world, take over any country, and watch every other country's agent react — a parallel universe with no new real-world data injected. See [docs/01-product-overview.md](docs/01-product-overview.md).

---

## Stack

| Layer | Choice | Version | Notes |
|---|---|---|---|
| Frontend | Vite + React + TypeScript | vite ^8.0.12, react ^19.2.6, typescript ~6.0.2 | `apps/web`; fast HMR, CesiumJS-compatible |
| 3D Globe | CesiumJS (+ vite-plugin-cesium) | cesium ^1.141.0, plugin ^1.2.23 | WebGL globe, GeoJSON countries, real geo tiles |
| Client state | Zustand | ^5.0.13 | authStore, gameStore, worldStore, regionStore |
| Routing | react-router-dom | ^7.15.1 | `/` game, `/world` public dashboard |
| Agent backend | Cloudflare Workers (Wrangler) | wrangler ^4.90.1 | `apps/worker`; only place LLM keys live |
| Database | Supabase (Postgres + pgvector) | @supabase/supabase-js ^2.105.4 | World state, agent memory, divergences, forks |
| Auth | Supabase Auth | (supabase-js) | `auth.uid()` RLS; players save forks |
| LLM | Groq — Llama 4 Maverick | via OpenAI-compatible API | One wrapper (`apps/worker/src/ai/llm.ts`); swap to Claude = one-line change |
| Country data | World Bank API + REST Countries | — | Free; seeds initial agent state |
| News | NewsAPI.org (free) | — | Monthly real-world news injection |
| Monthly scheduler | GitHub Actions (cron) | — | Loops countries, calls Worker once each |
| Hosting | GitHub Pages (web) + Cloudflare Workers (api) | — | Both free |

> Versions are the installed (caret-pinned) versions as of 2026-06-13. Re-verify against official docs before coding against a library.

---

## Architecture

Full detail in [docs/02-architecture.md](docs/02-architecture.md). In short:

1. `apps/web` renders the globe; reads world state from Supabase (anon + RLS), calls the Worker for LLM actions.
2. `apps/worker` proxies Groq, runs country agents + RAG history matching + monthly sync; protected by `x-worker-secret`.
3. Supabase holds all canonical state; forking copies ~195 `country_states` rows to a new `world_id`.
4. GitHub Actions runs the monthly sync, one country per Worker invocation (rate-limit safe).

---

## Project structure

```
RealityShift/
├─ apps/
│  ├─ web/                    # frontend (Vite + React + CesiumJS) — own package.json
│  │  └─ src/
│  │     ├─ components/       # Globe, CountryPanel, RegionPanel, PolicyEditor,
│  │     │                    #   DivergenceCard, DecisionLog, WorldEventsFeed, AuthModal
│  │     ├─ pages/            # GamePage (/), WorldDashboard (/world)
│  │     ├─ store/            # Zustand: authStore, gameStore, worldStore, regionStore
│  │     ├─ lib/              # supabase.ts (browser client)
│  │     └─ data/             # worldbank.ts (typed indicator fetchers)
│  └─ worker/                 # Cloudflare Worker (agents + API) — own package.json
│     └─ src/
│        ├─ ai/llm.ts         # Groq wrapper (OpenAI-compatible; Claude-swappable)
│        ├─ agents/           # countryAgent, prompt, runAgents, events
│        ├─ history/          # embed (TF-IDF), match (cosine top-3)
│        ├─ sync/             # fetchNews, compareState, publishDivergence, syncCountry
│        ├─ data/history/     # periods.json, country_histories.json (community KB)
│        ├─ lib/supabase.ts   # service-role client
│        ├─ seed.ts           # World Bank → country_states seeder
│        └─ index.ts          # Worker router (/api/*)
├─ supabase/                  # schema.sql + migrations/ (shared DB infra)
├─ docs/                      # 01-product-overview, 02-architecture, 03-data-model
├─ .github/workflows/         # monthly-sync.yml
├─ PROJECT.md                 # this file
├─ PLAN.md                    # build plan
├─ RESEARCH.md                # market/feasibility research
├─ package.json               # root: delegating scripts (npm --prefix apps/web …)
└─ .env.example
```

---

## Conventions

- **Where new code goes:** UI → `apps/web/src/components` or a `pages/` route; client state → a Zustand store in `apps/web/src/store`; agent/sim logic → `apps/worker/src/`. Community knowledge (no code) → `apps/worker/src/data/history/*.json`.
- **Layout:** `apps/<name>` even though there are two apps; root `package.json` **delegates** via `npm --prefix` — no npm workspaces until a shared `packages/` consumer exists.
- **LLM calls** always go through `apps/worker/src/ai/llm.ts` — never call Groq/Claude directly elsewhere.
- **Secrets** live only in the Worker (Cloudflare secrets / GitHub Actions secrets). Frontend gets only `VITE_*` + Supabase anon key.
- **Docs:** `docs/` filenames are zero-padded kebab-case, no spaces.
- **Before coding any library:** fetch its latest official docs — never code APIs from memory.
- **Database tasks:** use the installed `supabase` skill rather than general knowledge.

---

## Current status

The build is **feature-complete through Milestone 10**; remaining work is bug-fix, operational hardening, and deploy/docs (Milestone 11).

| Milestone | Status | Notes |
|---|---|---|
| 1. Scaffold | ✅ done | On Supabase + Groq (not Neon — see decision log) |
| 2. World state + country data | ✅ done | worldbank.ts, seed.ts, choropleth, CountryPanel |
| 3. Country AI agents | ✅ done | countryAgent, prompt, runAgents, `/api/agents/run` |
| 4. Historical grounding (RAG) | ✅ done | periods.json, embed (TF-IDF), match (cosine) |
| 5. Monthly sync + divergence | ✅ done | fetchNews, compareState, publishDivergence, workflow |
| 6. Public divergence dashboard | ✅ done | WorldDashboard, DivergenceCard, DecisionLog |
| 7. Player takeover + forking | ✅ done | Supabase Auth, fork = copy country_states |
| 8. Multi-agent coordination | ✅ done | events.ts, WorldEventsFeed, relations{} |
| 9. Globe visualization | ✅ done | choropleth, arcs, fly-to, hover tooltip |
| 10. Regional drill-down | ✅ done | RegionPanel, regionStore, 004 migration |
| 11. Deploy + harden + open source | ◐ todo | Not deployed; no Pages workflow; keep-alive + news-quota guards pending |
| 12. Differentiation & distribution | ◐ todo | Research-driven: make the divergence dashboard the wedge; validate the angle before scaling |

**In progress now:** brought the project into project-planner compliance (apps/ restructure, PLAN/PROJECT/RESEARCH/docs).
**Next up:** (1) fix two `tsc` duplicate-key errors blocking the typecheck gate (`apps/web/src/components/Globe.tsx:105`, `apps/web/src/pages/WorldDashboard.tsx:238`); (2) Milestone 11 — Supabase keep-alive ping, news-quota guard, deploy, README/CONTRIBUTING; (3) Milestone 12 — shareable divergence cards + analytics to validate the wedge before investing further in the game layer.

---

## Decision log

Append-only. One line per direction-changing decision, with the why.

- 2026-06-13 — **Backend is Supabase, not Neon.** Earlier PLAN.md drafted a Supabase→Neon migration; the code, schema (`auth.users`), and env were all Supabase and never migrated. Supabase provides the same Postgres + pgvector + Auth + RLS on one free tier, so the migration was pure churn. Committed to Supabase; removed Neon from the plan.
- 2026-06-13 — **Restructured to `apps/web` + `apps/worker` with a delegating root `package.json`.** Aligns with the project-planner canonical layout and leaves room for future surfaces. Frontend was flat `src/` at root; worker was `workers/`.
- 2026-06-13 — **Positioning narrowed.** Research found Pax Historia (YC, ~35k DAU) already ships AI-driven grand strategy, so "AI runs the countries" is no longer the differentiator. Lead with persistent shared world + divergence-vs-reality. See RESEARCH.md.
- (earlier) — **Groq by default, Claude as optional upgrade**, behind one `ai/llm.ts` wrapper.
- (earlier) — **GitHub Actions for the monthly sync**, not Cloudflare Cron, to avoid the Workers per-invocation CPU limit.
- (earlier) — **Forking = copying ~195 `country_states` rows** to a new `world_id`; forks never receive real-world data (`is_live` gate).

---

## Glossary

- **Live world** — the single canonical always-on simulation, `world_id = 'live'`.
- **Fork** — a player-owned copy of all country states at takeover time; frozen from real-world input.
- **Divergence report** — a published comparison of the simulated state vs. real-world news for a country at a point in time.
- **Country agent** — the per-country LLM decision function in `apps/worker/src/agents/countryAgent.ts`.
- **Historical parallel** — the top RAG match from `periods.json` injected into an agent's prompt for grounding.
- **Inter-agent event** — a sanction / trade deal / military posture / diplomatic protest emitted by one agent and consumed by another.
