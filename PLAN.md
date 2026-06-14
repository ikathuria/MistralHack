# RealityShift — Living World Policy Simulator

> A persistent multi-agent world simulation where AI agents run every country based on real history. Players can fork the simulation, take over any country, and watch the rest of the world react — a true parallel universe with no new real-world data injected.

---

## Concept

**Two modes, one shared world state.**

**Simulation mode (always on):** One AI agent per country runs continuously, grounded in 10–20 years of its country's real history. Periodically the live world ingests real news, compares its simulated state to reality, self-corrects, and publishes **divergence reports** publicly — a living record of alternate history.

**Game mode (player-triggered):** A player picks any country, takes over from its agent, and the world **forks**. From that moment no new real-world data enters the fork. The player decides manually; every other country's agent reacts in real time.

Full product detail: [docs/01-product-overview.md](docs/01-product-overview.md).

---

## Viability Summary

| | |
|---|---|
| **Market** | crowded-with-gap — AI-driven grand strategy now exists commercially (Pax Historia, YC, ~35k DAU), but **no one** runs a *persistent shared world* with *divergence-vs-reality* tracking. |
| **Feasibility** | hard — persistent multi-agent coordination across ~195 countries within free-tier LLM limits. Largely **already built** (Milestones 1–10). |
| **Free to build** | mostly — Groq / Supabase / Cloudflare / GitHub free tiers cover it, with two operational gotchas (see Risks). |
| **Monetization** | portfolio / open-source — not applicable. |

---

## Research Findings

Full report: [RESEARCH.md](RESEARCH.md) (quick pass, 2026-06-13).

### Competitors

| Name | Pricing | Strength | Limitations | User complaints |
|---|---|---|---|---|
| **Pax Historia** (YC) | Freemium/token (not public) | AI powers other countries' reactions; ~35k DAU; 4,000+ presets | Per-player sandbox, **not** a persistent shared world; no reality-divergence tracking | none surfaced (quick pass) |
| **WarAgent** (open source) | Free | LLM multi-agent sim of historical wars | Research artifact, not a playable product | n/a |
| **Geo-Political Simulator / Rulers of Nations** | Paid | Deep country modeling | Scripted AI, single-player, no LLM | Steep learning curve, dated UI |
| **Democracy 4** | Paid (~$27) | Best-in-class policy depth | Single-player, scripted, no live world | Static/predictable AI |
| **NationStates / Politics & War** | Free | Large communities | No AI agents | Shallow simulation |

**Positioning:** crowded-with-gap. The wedge is the **combination** of (1) a persistent always-on shared world and (2) public divergence reports vs. real news. "AI runs the other countries" is **no longer** a differentiator — Pax Historia owns it. The earlier "nothing like this exists" framing is retired.

### Feasibility
- **Hardest part:** keeping ~195 country agents coherent over many simulated months within free-tier LLM rate limits, plus the monthly news→compare→self-correct→divergence loop. **Approach:** one country per Worker invocation, GitHub Actions orchestrating the loop, single `ai/llm.ts` wrapper over Groq (Claude-swappable). Already implemented.
- **Cost flags:** Supabase free projects **pause after ~1 week of inactivity** (monthly cron leaves a longer gap → needs a weekly keep-alive ping); NewsAPI free is **~100 req/day** < 195 countries (batch over two days or swap source).

### Monetization
Portfolio / open-source — not applicable. The community knowledge base (`periods.json`, `country_histories.json`) is the contribution magnet; the public divergence dashboard is the organic-growth surface. If ever needed, donations/sponsorship only — never gate the simulation.

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Supabase free project pauses between monthly syncs | high | high | Weekly keep-alive ping (cheap GitHub Action hitting a read endpoint) — task in M11 |
| NewsAPI free quota (100/day) < 195 countries | high | med | Batch sync across two days, or swap to a freer news source behind `fetchNews.ts` |
| Groq free tier TPM/RPD throttling or model retirement | med | med | One `ai/llm.ts` wrapper → swap model/provider (Claude) with a config change |
| Pax Historia / a funded competitor adds reality-divergence | low | high | Move first on the divergence dashboard; it's the defensible content angle |
| pgvector + per-country embeddings exceed 500 MB free DB | low | med | Keep embeddings to historical periods only; prune if scaled |
| Long-run simulation drift (agents become incoherent) | med | med | Monthly divergence self-correction is the validation + correction loop |

---

## Tech Stack

> Versions are the installed (caret-pinned) versions verified on 2026-06-13. Re-check official docs before coding against any library. Use the installed `supabase` skill for database work.

| Layer | Choice | Version | Reason |
|---|---|---|---|
| Frontend | Vite + React + TypeScript | vite ^8.0.12 · react ^19.2.6 · typescript ~6.0.2 | Browser game, fast HMR, CesiumJS-compatible |
| 3D Globe | CesiumJS + vite-plugin-cesium | cesium ^1.141.0 · plugin ^1.2.23 | WebGL globe, GeoJSON countries, real geo tiles |
| Client state | Zustand | ^5.0.13 | Lightweight real-time game state |
| Routing | react-router-dom | ^7.15.1 | `/` game + `/world` dashboard |
| Agent backend | Cloudflare Workers (Wrangler) | wrangler ^4.90.1 | Free tier; only place LLM keys live |
| Database | Supabase (Postgres + pgvector) | @supabase/supabase-js ^2.105.4 | Persistent world state, agent memory, forks, embeddings |
| Auth | Supabase Auth | (supabase-js) | `auth.uid()` RLS; players save forks |
| LLM | Groq — Llama 4 Maverick | OpenAI-compatible API | Free (1k req/day); swap to Claude = one-line change |
| Country data | World Bank API + REST Countries API | — | Free; seeds initial agent state |
| News (monthly sync) | NewsAPI.org (free) | — | Real-world news injection for self-correction |
| Monthly scheduler | GitHub Actions (cron) | — | Free; loops countries, calls Worker once each |
| Hosting | GitHub Pages (web) + Cloudflare Workers (api) | — | Both free |

**Skipped deliberately:** payments (open-source, no monetization), a separate ORM (supabase-js is enough), a dedicated test runner so far (add Vitest in M11 hardening).

---

## Project Structure

```
RealityShift/
├─ apps/
│  ├─ web/                    # frontend (Vite + React + CesiumJS) — own package.json
│  │  └─ src/{components,pages,store,lib,data}
│  └─ worker/                 # Cloudflare Worker (agents + API) — own package.json
│     └─ src/{ai,agents,history,sync,data/history,lib}
├─ supabase/                  # schema.sql + migrations/ (shared DB infra)
├─ docs/                      # 01-product-overview, 02-architecture, 03-data-model
├─ .github/workflows/         # monthly-sync.yml
├─ PROJECT.md  ·  PLAN.md  ·  RESEARCH.md  ·  CLAUDE.md
├─ package.json               # root: delegating scripts (npm --prefix apps/web run …)
└─ .env.example
```

Conventions and the annotated tree live in [PROJECT.md](PROJECT.md). Root `package.json` delegates via `npm --prefix`; no npm workspaces until a shared `packages/` consumer exists.

---

## Data Model (Supabase)

Authoritative schema: [`supabase/schema.sql`](supabase/schema.sql) + [`supabase/migrations/`](supabase/migrations/). Summary in [docs/03-data-model.md](docs/03-data-model.md).

```sql
worlds          { id, fork_of, created_at, is_live, player_id, forked_at_year, player_country_code }
country_states  { world_id, country_code, year, indicators{}, policies{}, agent_memory_summary, relations{}, last_updated }
agent_decisions { world_id, country_code, year, decision{}, reasoning, historical_parallel, created_at }
divergences     { country_code, sim_year, real_date, sim_state{}, real_state{}, delta{}, narrative, published_at }
game_sessions   { id, player_id, world_id, country_code, started_at, ended_at, summary }
-- + region_states (migration 004), world_events (migration 003)
```

---

## Environment Variables

Authoritative file: [`.env.example`](.env.example).

```
# Cloudflare Worker secrets (wrangler secret put / dashboard — never in frontend)
GROQ_API_KEY=          # console.groq.com (free, no card)
ANTHROPIC_API_KEY=     # optional — swap LLM to Claude
SUPABASE_URL=          # Supabase Project Settings > API
SUPABASE_SERVICE_KEY=  # service_role key (bypasses RLS) — Worker only
NEWS_API_KEY=          # newsapi.org/register (free)
WORKER_SECRET=         # protects /api/agents/run and /api/sync/country

# Frontend (public, VITE_*)
VITE_CESIUM_ION_TOKEN= # ion.cesium.com (free)
VITE_SUPABASE_URL=     # Supabase Project Settings > API
VITE_SUPABASE_ANON_KEY=# anon public key (RLS protects access)
VITE_AI_PROXY_URL=     # deployed Worker URL (local: http://localhost:8787)
```

---

## Milestones

Milestones 1–10 are **complete** (`[x]`) — this is an existing, feature-complete build. Remaining work is in Milestone 11 (deploy + hardening). Paths reflect the `apps/web` / `apps/worker` layout.

### Milestone 1: Scaffold ✅
- [x] Vite + React + TypeScript app in `apps/web` — `npm run dev` starts cleanly
- [x] Cloudflare Worker project in `apps/worker` with Wrangler — `wrangler dev` runs
- [x] Supabase project + `supabase/schema.sql` (worlds, country_states, agent_decisions, divergences, game_sessions) — tables visible in Supabase
- [x] CesiumJS globe renders in `apps/web/src/components/Globe.tsx`
- [x] `.env.example` with all vars committed
- [x] `apps/worker/src/ai/llm.ts` — Groq wrapper (`chat(messages, model?)`), Claude-swappable

### Milestone 2: World State + Country Data ✅
- [x] `apps/worker/src/seed.ts` — World Bank indicators for all countries → `country_states` (world_id `live`)
- [x] `apps/web/src/data/worldbank.ts` — typed fetchers for the 7 indicators
- [x] GeoJSON country boundaries as CesiumJS entities
- [x] Country click → `country_states` → `CountryPanel` sidebar
- [x] Choropleth by GDP per capita from live state

### Milestone 3: Country AI Agents ✅
- [x] `apps/worker/src/data/history/country_histories.json` — 20-year structured histories
- [x] `apps/worker/src/agents/countryAgent.ts` — reads state, loads history, finds 3 parallels, returns a structured decision
- [x] `apps/worker/src/agents/prompt.ts` — agent plays the current government, grounded in history, aware of neighbors
- [x] `apps/worker/src/agents/runAgents.ts` — iterates a world, writes decisions + updates state
- [x] `POST /api/agents/run` (secret-protected) triggers the live world

### Milestone 4: Historical Grounding (RAG) ✅
- [x] `apps/worker/src/data/history/periods.json` — 30+ historical policy periods
- [x] `apps/worker/src/history/embed.ts` — TF-IDF vectors over tags + policy keys
- [x] `apps/worker/src/history/match.ts` — top-3 closest periods by cosine similarity
- [x] Matched context injected into agent prompts (with "today's world differs" reasoning)
- [x] Top match stored in `agent_decisions.historical_parallel`

### Milestone 5: Monthly Sync + Divergence Tracking ✅
- [x] `.github/workflows/monthly-sync.yml` — `cron('0 0 1 * *')`, loops countries, `workflow_dispatch` for single-country test
- [x] `apps/worker/src/sync/fetchNews.ts` — NewsAPI top headlines per country
- [x] `apps/worker/src/sync/compareState.ts` — compares indicators to news → `{ diverged, delta, explanation, self_correction }`
- [x] `apps/worker/src/sync/publishDivergence.ts` — writes `divergences` + applies self-correction
- [x] `apps/worker/src/sync/syncCountry.ts` — single-country pipeline, `POST /api/sync/country`

### Milestone 6: Public Divergence Dashboard ✅
- [x] `apps/web/src/pages/WorldDashboard.tsx` — public `/world`, no auth
- [x] `apps/web/src/components/DivergenceCard.tsx` — sim vs. real, delta, narrative
- [x] Globe colored by divergence magnitude
- [x] Divergence RSS feed at `/world/feed.xml`
- [x] Per-country Agent Decision Log (`DecisionLog.tsx`)

### Milestone 7: Player Takeover + World Forking ✅
- [x] Supabase Auth (email/password) in `authStore.ts`
- [x] "Take Over" button — new `worlds` row + copy all `country_states` into the fork
- [x] Policy editor writes to the forked `world_id`
- [x] "Simulate Year" runs other countries' agents reacting to the player
- [x] No news injection in forks (`is_live` gate)
- [x] Fork dashboard toggle: "Your Universe" vs "Real World Simulation"

### Milestone 8: Multi-Agent Coordination ✅
- [x] Agents receive recent decisions of top trade partners/neighbors
- [x] Inter-agent event system (`events.ts`, migration `003_world_events.sql`)
- [x] Global "World Events" feed (`WorldEventsFeed.tsx`)
- [x] Conflict detection → diplomatic crisis events
- [x] Alliance tracking in `country_states.relations{}`

### Milestone 9: Globe Visualization ✅
- [x] Choropleth overlays (GDP, Happiness, Military Spend, Divergence)
- [x] Animated arcs for diplomatic/military/trade events
- [x] Country pulse on player action
- [x] Camera fly-to on selection
- [x] Hover tooltip (flag, name, GDP, approval, top parallel)

### Milestone 10: Regional Drill-Down ✅
- [x] State/province GeoJSON (admin-1) for 10 large countries
- [x] Country→state boundary switch below ~2000km altitude
- [x] `RegionPanel.tsx` with region stats (migration `004_region_states.sql`)
- [x] 3 local policy types (Housing, Transport, Local Tax)
- [x] Regional changes included in agent prompts

### Milestone 11: Deploy + Harden + Open Source ◐
**Goal:** Live on GitHub Pages, Workers deployed, free-tier operational risks handled, repo ready for contributors.

- [ ] **Fix the typecheck gate:** resolve duplicate-key errors at `apps/web/src/components/Globe.tsx:105` and `apps/web/src/pages/WorldDashboard.tsx:238` — Done when: `npm run typecheck` passes clean
- [ ] **Supabase keep-alive:** add a weekly GitHub Action that hits a lightweight read endpoint so the free project never pauses between monthly syncs — Done when: project stays active for >1 week with no manual visit
- [ ] **News quota guard:** make `fetchNews.ts` / the sync workflow respect NewsAPI's ~100/day (batch over two days or swap source) — Done when: a full 195-country sync completes without 429s
- [ ] Deploy the Worker with production secrets (`GROQ_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `NEWS_API_KEY`, `WORKER_SECRET`) — Done when: endpoints respond in production
- [ ] Confirm the monthly-sync workflow in production (`WORKER_SECRET`, `WORKER_URL` as Actions secrets) — Done when: a manual run processes all countries within the error threshold
- [ ] GitHub Actions workflow to auto-deploy `apps/web` to GitHub Pages on push to `main` — Done when: push deploys automatically
- [ ] Set `base` in `apps/web/vite.config.ts` to the Pages repo path — Done when: assets load at the Pages URL
- [ ] Add Vitest + unit tests for `history/match.ts` and `sync/compareState.ts` — Done when: `npm test` runs green in CI
- [ ] Rewrite `README.md` (currently Vite boilerplate): what it is, architecture diagram, <10-min local setup, all API-key steps — Done when: a new contributor runs locally without asking
- [ ] `CONTRIBUTING.md`: how to add a `periods.json` entry, a `country_histories.json` entry, improve prompts, code style — Done when: structured with examples

---

### Milestone 12: Differentiation & Distribution ◐ *(research-driven)*
**Goal:** Lean into the one thing no competitor has — the **divergence dashboard** — and cheaply validate that people actually want "AI alternate-history vs. reality." [RESEARCH.md](RESEARCH.md) found AI-runs-the-countries is already commoditized (Pax Historia, ~35k DAU); the persistent shared world + divergence tracking is the defensible wedge, and demand for *that specific angle* is still unproven.

Tasks:
- [ ] **Shareable divergence cards:** generate an Open Graph image per divergence (country flag, "AI predicted X · reality was Y", magnitude) + a share button on `DivergenceCard.tsx` — Done when: pasting a divergence URL into a social/chat app shows a rich preview card
- [ ] **"Most diverged this month" highlight** on `/world`: a hero section ranking the biggest sim-vs-reality gaps with one-line narratives — Done when: the dashboard opens on the month's most compelling divergences, not a flat list
- [ ] **Reframe the public copy to lead with divergence**, not "AI runs the countries": update `/world` headline, README hook, and OG/meta tags — Done when: a first-time visitor understands "alternate history vs. reality" within one screen
- [ ] **Cheapest validation loop:** add lightweight, privacy-respecting analytics (e.g. self-hosted/cookieless) on `/world` and share-button clicks — Done when: you can see whether divergence content drives visits and shares before investing further in the game layer
- [ ] **Distribution seed:** the existing `/world/feed.xml` RSS plus a short "what is this" pinned post for one relevant community (r/worldbuilding, r/grandstrategy, alternate-history forums) — Done when: the feed is discoverable and one community post is published

---

## Claude Code Commands

> Every session: fetch the latest official docs for any library before coding, and keep `PROJECT.md` in sync.

**Resume (continue Milestone 11):**
```
claude "Read PLAN.md and PROJECT.md. Find the first incomplete task and continue, fetching the latest official docs for any library before using it. Keep PROJECT.md in sync. Mark tasks done as you go. Commit when a milestone is complete."
```

**Test the current state:**
```
claude "Read PLAN.md and PROJECT.md. Without building anything new, test everything marked done. Report what works and what's broken."
```

---

## Notes & Decisions

- **Backend is Supabase, not Neon.** An earlier draft planned a Supabase→Neon migration; the code, schema (`auth.users`), and env were always Supabase and never migrated. Supabase gives the same Postgres + pgvector + Auth + RLS on one free tier — the migration was pure churn and is dropped.
- **Repo restructured to `apps/web` + `apps/worker`** with a delegating root `package.json` (project-planner canonical layout).
- **Positioning narrowed** after research: Pax Historia already ships AI-driven grand strategy, so the differentiator is the persistent shared world + divergence-vs-reality, not "AI runs the countries." Milestone 12 turns this into concrete work — the divergence dashboard is treated as the product's wedge and growth surface, not a debugging view.
- **The wedge is unvalidated — validate before scaling.** Competitor traction proves appetite for AI nations, *not* for divergence-vs-reality. Don't pour effort into deeper game mechanics until the public `/world` dashboard shows real visit/share signal (Milestone 12 analytics). Cheapest test first.
- **Competitive urgency:** divergence tracking is currently unoccupied but easy for a funded competitor to copy. Ship the shareable dashboard early to plant the flag.
- **Simulation-first, game-second.** M1–M6 validate the always-on simulation before the game layer; the monthly divergence loop (M5) is the realism checkpoint.
- **Forking via Supabase rows.** A fork copies ~195 `country_states` to a new `world_id`; it never touches the live world again. The monthly sync checks `is_live`.
- **History as analogy, not determinism.** Historical matches ground reasoning; the prompt forces accounting for nuclear deterrence, international institutions, interdependence, and social media.
- **No moralizing, no blocking.** Any political direction is allowed; the sim shows consequences, not judgments.
- **LLM — Groq by default, Claude as optional upgrade**, behind one `ai/llm.ts` wrapper.
- **Monthly sync — GitHub Actions, not Cloudflare Cron**, to avoid the Workers per-invocation CPU limit; one country per Worker call.
- **Community knowledge base** (`periods.json`, `country_histories.json`) is the easiest first PR — plain JSON, no code.
