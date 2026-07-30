# RealityShift — Living World Policy Simulator

> A persistent multi-agent world simulation where AI agents run every country based on real history. Players can fork the simulation, take over any country, and watch the rest of the world react — creating a true parallel universe with no new real-world data injected.

---

## Concept

**Two modes, one shared world state:**

**Simulation mode (always on):** One AI agent per country runs continuously. Each agent is trained on 10–20 years of their country's real history and makes decisions autonomously. Once a month, agents receive the latest real-world news, compare their simulated state to reality, self-correct where needed, and publish divergence reports publicly — a living record of alternate history.

**Game mode (player-triggered):** A player picks any country, takes over from its agent, and the world forks. From that moment, no new real-world data enters the fork. The player makes decisions manually; every other country's agent reacts to those decisions in real time. The fork is a true parallel universe.

---

## Viability Summary

| | |
|---|---|
| **Market** | Nothing like this exists. Democracy 4, Power & Revolution, NationStates — all are either single-player sandboxes with no real persistence, no AI agents, or no multi-country simulation. The "living world + fork to play" concept is entirely novel. |
| **Feasibility** | Very hard — persistent multi-agent coordination, monthly news injection, divergence tracking, and a real-time game layer are each substantial systems. Correct phasing (simulation first, game layer second) makes it tractable. |
| **Free to build** | Mostly — Supabase free tier (Postgres + pgvector), Cloudflare Workers free tier (cron + agent proxy), World Bank API (free), NewsAPI (free tier: 100 requests/day). Claude API is the main cost (~$20–50/month for background agents). |
| **Monetization** | Open source — community-built. No revenue goal. |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    SIMULATION LAYER (always on)              │
│                                                             │
│  Country Agent × N  ──→  Supabase (world state, history)   │
│       ↑ monthly                  ↓                          │
│   News API / web             Divergence Reports             │
│                                  ↓                          │
│                          Public Dashboard (read-only)        │
└─────────────────────────────────────────────────────────────┘
                              ↓  fork on player join
┌─────────────────────────────────────────────────────────────┐
│                      GAME LAYER (per fork)                   │
│                                                             │
│  Human Player ──→ Policy changes ──→ Agent reactions        │
│                         (no new real-world data injected)   │
│                         (fork lives in Supabase as          │
│                          a separate world_id branch)        │
└─────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Frontend | Vite + React + TypeScript | Browser game, fast HMR, CesiumJS compatible |
| 3D Globe | CesiumJS (Apache 2.0) | WebGL globe, GeoJSON country support, real geo tiles |
| State (client) | Zustand | Lightweight real-time game state |
| Agent Backend | Cloudflare Workers | Free tier, proxies Claude API; individual invocations stay within the 10ms CPU / 30s wall-clock limits |
| Monthly Sync Scheduler | GitHub Actions (scheduled workflow) | Completely free, generous execution time — orchestrates the monthly sync by calling the Worker once per country in sequence |
| Database | Supabase (Postgres + pgvector) | Persistent world state, agent memory, divergence logs, fork branching |
| Auth | Supabase Auth | Players need accounts to save forks and game sessions |
| Country Data | World Bank API + REST Countries API | Free, 200+ countries, 1400+ indicators — seeds initial agent state |
| News (monthly sync) | NewsAPI.org free tier | Real-world news injection for monthly agent self-correction |
| Historical Knowledge | Curated `periods.json` + pgvector embeddings | RAG source for historical grounding in agent decisions |
| AI Model | Groq — Llama 3.3 70B | Free forever, no credit card; 1k req/day free tier; OpenAI-compatible API so swapping to Claude is a one-line config change if needed |
| Hosting | GitHub Pages (frontend) + Cloudflare Workers (agents + API) | Both free |
| Public Dashboard | Same frontend, read-only route `/world` | Shows live simulation state and divergence reports |

---

## Data Model (Supabase)

```sql
-- The canonical world state, branched per fork
worlds          { id, fork_of, created_at, is_live, player_id, forked_at_year }

-- Each country's state within a world
country_states  { world_id, country_code, year, indicators{}, policies{},
                  agent_memory_summary, last_updated }

-- Agent decisions log (what each agent decided and why)
agent_decisions { world_id, country_code, year, decision{}, reasoning,
                  historical_parallel, created_at }

-- Monthly divergence reports (live world only)
divergences     { country_code, sim_year, real_date, sim_state{},
                  real_state{}, delta{}, narrative, published_at }

-- Player game sessions
game_sessions   { id, player_id, world_id, country_code, started_at,
                  ended_at, summary }
```

---

## Environment Variables

```
# Cloudflare Worker (never in frontend)
GROQ_API_KEY=               # Groq API — console.groq.com (free, no credit card)
# Optional upgrade: set this to swap all LLM calls to Claude instead
ANTHROPIC_API_KEY=          # Claude API — console.anthropic.com
SUPABASE_SERVICE_KEY=       # Supabase service role key (full DB access)
NEWS_API_KEY=               # NewsAPI.org — newsapi.org/register (free)

# Frontend (public)
VITE_CESIUM_ION_TOKEN=      # ion.cesium.com free account
VITE_SUPABASE_URL=          # your Supabase project URL
VITE_SUPABASE_ANON_KEY=     # Supabase anon key (safe to expose)
VITE_AI_PROXY_URL=          # deployed Cloudflare Worker URL
```

---

## Milestones

### Milestone 1: Scaffold
**Goal:** Dev server runs, Supabase connected, CesiumJS globe renders, all dependencies in place.

Tasks:
- [x] Initialize Vite + React + TypeScript: `npm create vite@latest realityshift -- --template react-ts` — Done when: `npm run dev` opens without errors
- [x] Install dependencies: `cesium vite-plugin-cesium zustand @supabase/supabase-js` — Done when: all in package.json, no import errors
- [x] Create Supabase project and run the schema from `supabase/schema.sql` (worlds, country_states, agent_decisions, divergences, game_sessions tables) — Done when: tables visible in Supabase dashboard
- [x] Set up Cloudflare Worker project in `workers/` with Wrangler — Done when: `wrangler dev` runs a hello-world endpoint
- [x] Render a bare CesiumJS globe in `src/components/Globe.tsx` — Done when: 3D Earth spins in browser
- [x] Create `.env.example` with all vars listed above — Done when: committed
- [x] Create `workers/src/ai/llm.ts` — a thin wrapper around the Groq API (OpenAI-compatible) that exports a single `chat(messages, model?)` function; model defaults to `llama-3.3-70b-versatile` (was `llama-4-maverick-17b-128e-instruct`, which Groq has since retired) — Done when: a test call returns a text response and swapping to Claude requires only changing the base URL and API key

---

### Milestone 2: World State + Country Data
**Goal:** The live world (`world_id = 'live'`) is seeded with real data for all countries. Clicking a country shows its current simulated state.

Tasks:
- [x] Write `workers/src/seed.ts` — fetches World Bank indicators for all 195 countries and inserts into `country_states` for `world_id = 'live'`, `year = current` — Done when: running the seed script populates Supabase with real GDP, population, tax rate, military spend, education spend, healthcare, unemployment for all countries
- [x] Create `src/data/worldbank.ts` — typed fetch functions for all 7 indicators — Done when: each returns typed data for any country code
- [x] Load GeoJSON country boundaries in Globe as CesiumJS entities — Done when: country outlines visible
- [x] Country click → fetch `country_states` for that country from Supabase → show in `src/components/CountryPanel.tsx` sidebar — Done when: clicking India shows real seeded data
- [x] Choropleth: color globe by GDP per capita from live world state — Done when: visible color variation across all countries

---

### Milestone 3: Country AI Agents
**Goal:** Each country has an AI agent that can make autonomous decisions for its country. Agents are grounded in the country's last 10–20 years of history.

Tasks:
- [x] Create `src/data/history/country_histories.json` — for the 20 most common starting countries, a structured summary of the last 20 years: major policy changes, economic events, political shifts, international relations, with year tags. Sourced from Wikipedia and public records — Done when: each entry has at least 15 dated events covering 2005–2025
- [x] Write `workers/src/agents/countryAgent.ts` — the core agent function: given `(world_id, country_code)`, reads the country's current state from Supabase, loads its historical summary, finds the 3 closest historical parallels (from `periods.json`), builds a Claude prompt, and returns a structured decision: `{ policies_adjusted{}, reasoning, historical_parallel, projected_indicators{} }` — Done when: calling the agent for India returns a plausible autonomous decision
- [x] Agent prompt design in `workers/src/agents/prompt.ts`: the agent plays the role of the current government (matching real political leaning of the country), grounds decisions in documented history, reasons about neighboring countries' states, and explicitly flags if its decision resembles a historical pattern — Done when: India's agent makes decisions consistent with a center-left coalition government
- [x] Write `workers/src/agents/runAgents.ts` — iterates over all countries in a world, calls `countryAgent` for each, writes decisions to `agent_decisions` and updates `country_states` — Done when: running manually advances the world by one simulated month for all countries
- [x] Expose a Worker endpoint `POST /api/agents/run` (protected by a secret header) that triggers `runAgents` for the live world — Done when: calling the endpoint updates Supabase

---

### Milestone 4: Historical Grounding (RAG)
**Goal:** Agent decisions are grounded in real historical precedents. When a country's trajectory resembles a historical period, the agent explicitly reasons from that precedent while accounting for how today's world differs.

Tasks:
- [x] Create `src/data/history/periods.json` — 50+ historical policy periods with: `{ id, name, country, yearRange, tags[], policyProfile{}, outcomes{}, internationalReaction, summary }`. Cover: Weimar hyperinflation, Nazi Germany, FDR New Deal, Thatcher privatizations, Mao's Great Leap Forward, Pinochet shock therapy, Nordic social democracy, Soviet collapse, Asian financial crisis, etc. — Done when: at least 30 well-structured entries
- [x] Write `workers/src/history/embed.ts` — computes TF-IDF vectors over `tags` + `policyProfile` keys for each period, exports as a static lookup table — Done when: returns a numeric vector for any period ID
- [x] Write `workers/src/history/match.ts` — given a country's current policy state, returns the top 3 closest historical periods by cosine similarity with scores — Done when: a country with rising `military_spend`, `nationalist_rhetoric`, `press_restrictions` tags surfaces 1930s Germany as top match
- [x] Inject matched context into agent prompts: "Closest historical parallel: [period]. What happened then: [outcomes]. International reaction then: [internationalReaction]. Today's world is different — reason through: current nuclear deterrence, international institutions (UN/WTO/EU/ICC), economic interdependence, social media, and this country's current diplomatic relations. The outcome may be similar, harsher, milder, or entirely different." — Done when: authoritarian policy shifts produce historically-informed but contextually-adjusted predictions
- [x] Store matched historical parallel in `agent_decisions.historical_parallel` — Done when: every decision row in Supabase includes the top match and similarity score

---

### Milestone 5: Monthly Sync + Divergence Tracking
**Goal:** Once a month, each country agent fetches real news, compares the simulated state to reality, self-corrects, and publishes a divergence report.

Tasks:
- [x] Add a GitHub Actions workflow at `.github/workflows/monthly-sync.yml` with `schedule: cron('0 0 1 * *')` (runs 1st of each month) — the Action loops through all country codes and calls `POST /api/sync/country` on the Worker once per country, sequentially — Done when: workflow file exists and a manual trigger (`workflow_dispatch`) successfully processes one test country
- [x] Write `workers/src/sync/fetchNews.ts` — for each country, calls NewsAPI.org with `q=[country name] economy policy government` and returns the top 5 most relevant headlines + summaries — Done when: returns real headlines for India, USA, Germany
- [x] Write `workers/src/sync/compareState.ts` — builds a Claude prompt comparing `country_states.indicators` to a summary of real news, returns: `{ diverged: bool, delta{}, explanation, self_correction{} }` — Done when: if the simulation has India's GDP growing at 8% but news reports a recession, Claude flags the divergence with an explanation
- [x] Write `workers/src/sync/publishDivergence.ts` — if `diverged = true`, inserts a row into `divergences` with the full delta and narrative; then applies `self_correction` to `country_states` to bring the live world back toward reality — Done when: divergences table gains a row after a mismatch is detected
- [x] Write `workers/src/sync/syncCountry.ts` — handles a single country: fetchNews → compareState → publishDivergence, exposed as `POST /api/sync/country` with `{ country_code }` body — Done when: calling the endpoint for `"IND"` fetches real India news, compares to simulated state, and writes to Supabase

---

### Milestone 6: Public Divergence Dashboard
**Goal:** A read-only public page at `/world` shows the live simulation state and all divergence reports — the "alternate history" tracker.

Tasks:
- [x] Build `src/pages/WorldDashboard.tsx` — a public page at `/world` that fetches and displays: current simulated year, world GDP, top 5 divergences by magnitude, and a timeline of recent divergence events — Done when: page loads without auth and shows live Supabase data
- [x] Build `src/components/DivergenceCard.tsx` — shows per-country divergence: simulated state vs. real state, the delta, and Claude's narrative explanation — Done when: clicking a country in the dashboard shows its divergence history
- [x] Add globe view to the dashboard: countries colored by divergence magnitude (green = tracking reality closely, red = highly diverged) — Done when: the globe shows visible variation based on `divergences` table data
- [x] Add divergence RSS feed at `/world/feed.xml` — lists the 20 most recent divergence reports as RSS items so people can subscribe — Done when: feed validates and loads in an RSS reader
- [x] Add "Agent Decision Log" per country — a public timeline of every autonomous decision an agent has made, with its reasoning — Done when: clicking India shows a chronological log of agent decisions going back to simulation start

---

### Milestone 7: Player Takeover + World Forking
**Goal:** A logged-in player can take over any country from its agent and fork the world. The fork is a true parallel universe — no new real-world data enters it. Other country agents react to the player's decisions.

Tasks:
- [x] Add Supabase Auth: email/password signup and login — Done when: player can create account and session persists across page refreshes
- [x] "Take Over" button on any CountryPanel — creates a new row in `worlds` (`fork_of = 'live'`, `forked_at_year = current`, `player_id = auth.uid`) and copies all `country_states` from the live world into the new `world_id` — Done when: clicking Take Over for India creates a fork world in Supabase with all 195 countries' states copied
- [x] Player policy editor: when playing a fork, the player can adjust policies, pass laws, and change budgets — same UI as before but writes to the forked `world_id` not the live world — Done when: player changes India's military budget in their fork without affecting the live world
- [x] "Simulate Year" button: when player confirms changes, runs `countryAgent` for all other countries in the fork (reacting to India's new state), updates their `country_states`, advances year — Done when: India cuts taxes → other country agents receive the updated India state and respond (trade partners adjust, adversaries react, etc.)
- [x] No news injection in forks: `runMonthlySync` only runs on `world_id = 'live'`; forks never receive real-world data — Done when: confirmed by code review that sync functions check `is_live` before running
- [x] Fork dashboard: player can see their fork's state vs. the live world on the same globe — a toggle between "Your Universe" and "Real World Simulation" — Done when: toggle switches globe data source between fork and live world states

---

### Milestone 8: Multi-Agent Coordination
**Goal:** Country agents are aware of each other and react to neighboring decisions. Diplomatic events, trade responses, and military posturing emerge from agent interactions.

Tasks:
- [x] Extend `countryAgent` prompt context: before deciding, each agent receives a summary of the last 3 decisions made by its top 5 trade partners and neighbors — Done when: India's agent prompt includes summaries of China, Pakistan, USA, and EU recent decisions
- [x] Add inter-agent event system: agents can emit events (`{ type: 'sanction' | 'trade_deal' | 'military_posture' | 'diplomatic_protest', from, to, details }`) that are stored in `agent_decisions` and picked up by the target country's agent on its next run — Done when: if India imposes tariffs on China, China's next decision includes the tariff event as context
- [x] Add a global "World Events" feed in the UI — a scrolling ticker of recent inter-agent events (sanctions, alliances, trade deals, conflicts) — Done when: the globe UI shows a live feed of AI-generated world events
- [x] Conflict detection: if two agents' military posture scores exceed a threshold against each other, Claude generates a conflict scenario with resolution options — Done when: two countries with high mutual military hostility produce a diplomatic crisis event
- [x] Alliance tracking: agents can form and break alliances stored in `country_states.relations{}` — Done when: an agent that forms an alliance routes trade through that ally and cites it in subsequent decisions

---

### Milestone 9: Globe Visualization
**Goal:** The globe is the primary game surface — it reacts to simulation events, policy changes, and divergences in real time.

Tasks:
- [x] Choropleth overlays: GDP, Happiness Index, Military Spend, Divergence from Reality — Done when: each overlay re-colors the globe within 500ms
- [x] Animated events: when an agent emits a diplomatic/military/trade event, draw an animated arc between the two countries — Done when: trade deals show a brief gold arc, sanctions show a red arc
- [x] Country pulse on player action: when player confirms a policy change, their country glows briefly — Done when: visible animation triggers within 200ms of confirmation
- [x] Camera fly-to: selecting a country smoothly flies the globe to center it — Done when: transitions complete in ~1.5 seconds
- [x] Country hover tooltip: flag, name, current simulated GDP, approval rating, top historical parallel — Done when: 300ms hover shows tooltip

---

### Milestone 10: Regional Drill-Down
**Goal:** Players can zoom into a country and make sub-national policy decisions at the state/province level.

Tasks:
- [x] Load state/province GeoJSON (Natural Earth admin-1) for India, USA, UK, Germany, Brazil, China, France, Australia, Canada, Japan — Done when: zooming into India shows state outlines
- [x] Switch from country to state boundaries below camera altitude 2000km — Done when: smooth zoom transition
- [x] Region click opens `src/components/RegionPanel.tsx` with region-level stats (World Bank sub-national or AI-estimated) — Done when: clicking Maharashtra shows population and basic stats
- [x] 3 local policy types: Housing (rent control/zoning), Transport (transit funding), Local Tax (municipal rates) — Done when: sliders exist and write to region-level state in Supabase
- [x] Include active regional changes in agent simulation prompts — Done when: a Mumbai housing policy affects Claude's national narrative

---

### Milestone 11: Deploy + Open Source
**Goal:** Live at GitHub Pages, all Workers deployed, repo ready for community contributions.

> **Pulled forward to day 1 of the hackathon track.** Deployment is the single largest
> risk in the project — nothing is deployed today, and an undeployed app is an automatic
> zero regardless of how good the media layer is. Deploy empty, then fill it.

Tasks:
- [ ] Fix `workers/wrangler.toml` — the `[[routes]]` block has `zone_name = ""` and will fail deploy. Remove it and use a `workers.dev` subdomain — Done when: `wrangler deploy` succeeds
- [ ] Deploy Cloudflare Worker with all production secrets: `GROQ_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `NEWS_API_KEY`, `WORKER_SECRET` — Done when: `/api/health` responds in production
- [ ] Confirm the monthly sync GitHub Actions workflow runs correctly in production — add `WORKER_SECRET` and `WORKER_URL` as GitHub Actions secrets — Done when: manually triggering the workflow processes one test country without errors
- [ ] Set `base` in `vite.config.ts` to the GitHub Pages repo path — Done when: assets load correctly at the Pages URL
- [ ] GitHub Actions workflow to auto-deploy frontend to GitHub Pages on push to `main` — Done when: push deploys automatically
- [ ] Seed the live world so the deployed app is never empty — Done when: `/world` shows real country data to a logged-out visitor
- [ ] Write `CONTRIBUTING.md`: how to add a historical period to `periods.json`, how to add a country history to `country_histories.json`, how to improve agent prompts, code style — Done when: clearly structured with examples

---

# Hackathon Track — Generative Media Layer

> **Event:** [Backblaze Generative AI Media Hackathon](https://backblaze-generative-media.devpost.com)
> **Deadline:** 3 August 2026, 5:00pm ET · **Track opened:** 27 July 2026
> **Audit:** see [`PHASE0_AUDIT.md`](PHASE0_AUDIT.md) for the full Phase 0 findings.

Turning divergence data into **broadcasts from worlds that don't exist.** The simulation
already produces the most valuable input a generative media pipeline could want —
structured narrative divergence — so the media layer is a natural consumer of existing
output, not a bolt-on.

### Governing constraints

1. **The simulation core is not modified.** `workers/`, `src/store/`, and `supabase/`
   stay untouched. This is enforced architecturally: the sim is TypeScript on Cloudflare
   Workers, Genblaze is a Python SDK, so the media layer physically cannot reach sim
   internals. It reads Supabase and nothing else. `git diff` on those paths must be empty.
2. **No schema changes.** The per-fork media index lives in B2 as JSON, not in Postgres.
3. **P0 only.** Leader Address and era-artifacts are cut. A polished front-page wall plus
   one flawless broadcast beats four half-finished artifact types.
4. **Nothing generates during the demo.** All media is pre-generated and seeded.

### Safety constraints (non-negotiable)

- **No photoreal synthetic media of real, identifiable people.** Fictional anchors and
  spokespeople only, with a stylized non-photoreal aesthetic. Real countries, institutions,
  and policies are fine; real faces and voices are not.
- **Everything marked synthetic, twice:** a visible on-screen watermark or spoken
  disclaimer, plus a machine-readable embedded Genblaze manifest.
- **Genblaze manifests are not C2PA** and provide integrity, not authentication. Never
  claim otherwise in the write-up.
- No graphic violence, atrocity, or persecution imagery even where a branch implies it —
  summarize in neutral text instead. No content mistakable for a real emergency alert.

---

### Milestone 12: Media Foundation
**Goal:** One generated image in B2 with a verifying manifest whose canonical hash contains our simulation provenance fields.

Tasks:
- [x] Create the `media/` Python package (isolated, additive) with `pyproject.toml` pinning **exact** versions of `genblaze`, `genblaze-s3`, `genblaze-gmicloud`, `genblaze-cli` — Done: `pip install -e media/` works in a clean venv
- [x] Install `ffmpeg` and document it as a system prerequisite — Done: ffmpeg 8.1.2 installed, listed in README
- [x] **Re-verify every Genblaze API against the *installed* package, not the repo.** — Done: verified against core 0.3.8 (moved from 0.3.7 mid-week); metadata-in-hash linchpin proven directly; written up in `GENBLAZE_FEEDBACK.md`
- [x] `media/contracts.py` — `DivergenceBrief` and `NarrativeBeat` Pydantic models — Done: validate, and the cutoff==divergence_date invariant is enforced + tested
- [x] `media/adapter.py` — **read-only** Supabase → `DivergenceBrief`. For forks, derive divergence as fork-vs-live at matching sim year — Done: verified against **live Supabase** for India @ 2027 (BJP reasoning, Reagan RAG parallel, India↔Pakistan protest chain → 4 beats). Beats are deterministic here; the LLM script pass moves to M14 rather than one `chat()` call in the adapter
- [x] `media/provenance.py` — `simulation.*` metadata via `Pipeline.metadata(**kwargs)`, inside the canonical hash — Done: 5 offline tests prove `fork_id` and `real_world_data_cutoff` each flip the hash
- [~] `media/storage.py` — `ObjectStorageSink` over `S3StorageBackend.for_backblaze()`, `KeyStrategy.CONTENT_ADDRESSABLE` — **written; blocked on B2 credentials** for the live round-trip
- [x] `media/pricing.py` — `register_pricing()` recipes — Done: recipes written for the image/video models; live `compute_cost()` check needs a provider key
- [x] `.env.example` for the media layer; `.gitignore` covers `.env` and Python artifacts — Done: committed, no secrets
- [ ] **Checkpoint:** one front-page image in B2, manifest verifying, fork fields inside the hash — **blocked on B2 + GMICloud credentials.** Everything up to the network boundary is built and tested; the manifest/hash half of the checkpoint is already proven offline.

---

### Milestone 13: The Front Page (P0)
**Goal:** A wall of newspaper front pages from a world that doesn't exist.

Tasks:
- [x] `media/pipelines/front_page.py` — `DivergenceBrief` → newspaper front page prompt → image — Done: pipeline built; prompt + provenance verified end-to-end via `rs-media front-page --dry-run` against live Supabase ("The India Dispatch, 2027"). Live image generation needs GMI key
- [x] Visible synthetic-content watermark composited into every image — Done: `watermark.py` burns an "AI-GENERATED · RealityShift" band into the pixels (provider-independent, tested)
- [~] `fallback_models` chain configured and **proven by forcing a failure** — chain configured (`seedream-5.0-lite` → `flux-1-schnell`); the forced-failure proof needs a live provider key
- [ ] Batch generation across N nations via `Pipeline.abatch_run()` + `StepCache` — not started
- [x] `media/index.py` — per-fork index `index/{world_id}/media.json`, replacing the proposed `media_assets` table — Done: index build/serialize/sort + result→entry extraction, tested; live B2 write needs keys
- [ ] `src/lib/mediaIndex.ts` — typed fetch of the B2 index — not started
- [ ] `src/components/FrontPageWall.tsx` — grid view, filterable by fork and sim-date — not started
- [ ] **Checkpoint:** the front-page wall renders for one fork across ≥12 sim-months — blocked on B2 + GMICloud credentials

---

### Milestone 14: The Divergence Broadcast (P0 centerpiece)
**Goal:** A ~45–75s news segment reporting events that never happened, with verifiable provenance.

Tasks:
- [ ] Script generation from beats via `chat()` — its documented role is "driving media steps from an LLM". Not manifest-integrated, so stash LLM details in `step.metadata` on the downstream media step — Done when: a brief produces an anchor script with per-beat timing
- [ ] TTS anchor voiceover, fictional anchor identity, spoken synthetic disclaimer at the head — Done when: audio matches script length within tolerance
- [ ] Per-beat b-roll stills → image→video animation. Use `seedance-1-0-pro-fast` (per-asset) for iteration, reserve per-second models for the hero broadcast — Done when: five beats animate
- [ ] Composite via `FFmpegCompositor` (`step_type=StepType.MIX`, `input_from=[...]`) — video + VO + music bed + chyrons showing fork ID, sim-date, divergence date — Done when: a single MP4 muxes correctly
- [ ] `AgentLoop` quality gate: generate → evaluate against beat intent → retry with tightened prompt. **`max_iterations=2`, hero broadcast only** — a retry storm silently costs 3× — Done when: every attempt is logged with `parent_run_id`
- [ ] `Mp4Handler.embed()` the manifest; verify extraction round-trips — Done when: `genblaze verify` passes on the downloaded file
- [ ] `src/components/BroadcastPlayer.tsx` + `src/components/ProvenancePanel.tsx` — player with extracted manifest, fork lineage, `real_world_data_cutoff`, and a verify button — Done when: provenance is visible in the UI without leaving the app
- [ ] **Checkpoint:** one broadcast playable in the deployed app, manifest extracts and verifies

---

### Milestone 15: Submission
**Goal:** A judge lands on a populated app and immediately understands what it is.

Tasks:
- [ ] Seed pre-generated content for at least one interesting fork — **a judge who lands on an empty app has already scored you** — Done when: no empty states anywhere
- [ ] Cost/analytics dashboard from `ParquetSink` — spend per broadcast, per fork, per nation, plus retry rates. Depends on `media/pricing.py` — Done when: the dashboard renders real numbers
- [ ] Apply B2 **Object Lock** to the `manifests/` prefix, governance mode, **during final seeding only** — locked objects cannot be deleted, so applying it during iteration fills the 10GB free tier with undeletable junk. Verify B2's exact semantics before relying on it — Done when: manifests are immutable and the app still works
- [ ] Rewrite `README.md` for the finished system; **verify setup from a clean clone** including `genblaze-cli` (not in the umbrella package) and `ffmpeg` — Done when: a fresh clone runs without asking questions
- [ ] `PROVIDERS.md` — every AI provider and model used, with its role — Done when: complete and accurate
- [ ] `B2_AND_GENBLAZE.md` — how both are used, addressing all seven storage roles; quantify cross-fork dedup savings; state plainly that manifests are **not** C2PA and provide integrity, not authentication — Done when: no unverified claims remain
- [ ] File the legitimate `GENBLAZE_FEEDBACK.md` items as GitHub issues on the Genblaze repo — Done when: filed, specific, and reproducible
- [ ] Demo video shot list (~3 min) — hook, premise, fork, prompt→pipeline→storage, **provenance (do not rush this)**, real user — Done when: drafted as a shot list
- [ ] Grant `b2genblaze` contributor access if the repo is private — Done when: confirmed

---

## Day allocation (27 July → 3 August)

| Day | Focus |
|---|---|
| 1 | **M11 deploy** (empty app live) + M12 foundation in parallel |
| 2 | M12 checkpoint → M13 front page |
| 3 | M13 checkpoint (wall renders) |
| 4–5 | M14 broadcast |
| 6 | M14 checkpoint + M15 seeding and docs |
| 7 | Demo video, buffer |

Buffer is deliberately thin. If a day slips, **cut broadcast count, never provenance** —
the provenance story is the differentiator.

---

## Claude Code Commands

**Start fresh (Milestone 1):**
```
claude "Read PLAN.md and complete Milestone 1. Mark tasks done as you go. Stop after Milestone 1 and commit."
```

**Resume from any point:**
```
claude "Read PLAN.md, find the first incomplete task, and continue. Mark tasks done as you go. Commit when a milestone is complete."
```

**Test current state:**
```
claude "Read PLAN.md. Without building anything new, test everything marked done. Report what works and what's broken."
```

---

## Notes & Decisions

- **Simulation-first, game-second**: Build and validate the always-on simulation (M1–M6) before the game layer (M7+). If the agents aren't making coherent decisions, the game won't work. Milestone 5 (monthly sync + divergence) is the validation point — if divergences look realistic, the agents are working.

- **World forking via Supabase rows**: Forking the world is just copying `country_states` to a new `world_id`. This is cheap (195 rows) and clean. The fork never touches the live world again. Players can have multiple forks.

- **No new data in forks**: Once a player takes over, their universe is frozen from real-world input. This is the philosophical core — it's a true parallel universe. Implementing this means the monthly sync Worker checks `worlds.is_live` before running.

- **Agent political alignment**: Each country agent should reflect the actual current government's political leaning (sourced from the country history data). India's agent behaves like the BJP government; Germany's like the current coalition. This is critical for realism. The political alignment is part of `country_states` and can drift over time if the simulation runs long enough.

- **History as analogy, not determinism**: Historical matches ground the agent's reasoning but don't determine it. The prompt explicitly tells Claude to reason through how today's world differs — nuclear deterrence, international institutions, economic interdependence, social media. A 1930s Germany trajectory in modern Germany would face the EU, NATO, the ICC, and instant global scrutiny.

- **No moralizing, no blocking**: Agents and players can pursue any political direction — authoritarian, libertarian, theocratic, communist. The simulation shows consequences, not judgments. The historical parallel card is informational, never a blocker.

- **Monthly sync scheduler — GitHub Actions, not Cloudflare Cron**: Cloudflare Workers free tier has a 10ms CPU time limit per invocation and a wall-clock duration limit — nowhere near enough to process 195 countries in one go. The paid Bundled plan ($5/month) removes this limit for cron triggers, but it's avoidable. Instead, a GitHub Actions scheduled workflow runs on the 1st of each month and calls the Worker once per country in sequence. Each Worker invocation handles one country (short, well within limits), and GitHub Actions execution time is free and generous.
- **LLM — Groq by default, Claude as optional upgrade**: Groq's free tier (1k req/day, 30 rpm, Llama 3.3 70B) covers the monthly 195-country sync (~7 minutes at 30 rpm) and casual gameplay at zero cost. Because Groq uses an OpenAI-compatible API, all LLM calls go through a single `src/ai/llm.ts` wrapper — swapping to Claude is a one-line config change. If the game grows and free tier limits become an issue, Claude Haiku for minor countries and Sonnet for G20 is the upgrade path (~$10–30/month).

- **Community knowledge base**: `periods.json` and `country_histories.json` are the most valuable community contribution targets. These are plain JSON — no code needed to add a historical period or improve a country's 20-year history. `CONTRIBUTING.md` should make this the easiest possible first PR.

- **Divergence as content**: The public divergence dashboard is not just a debugging tool — it's the product's most interesting public-facing feature. "Here's what AI predicted India would do, and here's what actually happened" is genuinely compelling. Consider a social share button on each divergence card.

---

## Media Layer Decisions (27 July 2026)

- **Positioning shift**: "Alternate history game" is soft framing. **"Counterfactual policy wargaming with generated media briefings"** is a real user with a real budget. Institutions run wargames constantly — slow, expensive, staffing-limited. This simulation runs continuously and now *publishes* its worlds. The reframing costs nothing and makes the project legible to judges.

- **The language split is a feature, not friction**: the sim is TypeScript on Cloudflare Workers; Genblaze is Python-only. The media layer therefore *cannot* be an in-process module — it must be a separate Python process whose only reachable surface is Supabase. "Don't modify the simulation core" stops being discipline and becomes a property the architecture enforces.

- **Simulation provenance inside the canonical hash**: `Pipeline.metadata(**kwargs)` merges into `Run.metadata`, and `Run.metadata`/`Step.metadata` are **intentionally included** in Genblaze's canonical SHA-256 (`models/manifest.py:25`). So `simulation.fork_id`, `simulation.divergence_date`, and `simulation.real_world_data_cutoff` are cryptographically bound to every asset — not bolted alongside it. The project's core design property ("no new real-world data enters a fork") is invisible in text; embedding it in a hash-bound manifest makes it verifiable. **This is the strongest single idea in the submission** and it turned out to be a native feature, not a workaround.

- **Fork divergence is derived, not stored**: `divergences` has no `world_id` — it is live-world-only because `syncCountry.ts` hard-blocks forks from receiving news, which is the philosophical core working correctly. For a fork, the interesting comparison is fork-vs-**live-world** at the same sim year, computed read-side. Considered adding `world_id` to `divergences`; **rejected** — the derived view suffices and that table sits on the monthly sync write path.

- **No new Postgres table**: the per-fork media index is a JSON object in B2 at `index/{world_id}/media.json`, not a `media_assets` table. The batch generator is the sole writer (no lost-update risk), the frontend wants the whole set anyway (no query needed), and fork media is as public as the fork (no RLS needed). Keeps `supabase/` untouched alongside `workers/`.

- **B2 is the media plane; Postgres stays the transactional state**: considered replacing Supabase with B2 entirely. **Rejected** — B2 is object storage with no queries, indexes, transactions, or per-user auth, and `runAgents` does read-modify-write across countries in a loop. It would also require rewriting the backend that already works, days before a deadline. B2 instead owns *all seven* media-plane roles: assets, manifests, content-addressable dedup, world-state snapshots, Object Lock audit records, Parquet analytics, and thumbnails. The honest one-liner: **Postgres is the simulation's transactional state; B2 is the entire media plane.**

- **Content-addressable, not hierarchical**: every fork shares identical pre-divergence history, so identical prompts yield byte-identical assets that collapse to one object. Pre-divergence media cost is O(1) in fork count rather than O(N). Do not split strategies across artifact types — one strategy keeps the dedup argument clean and quantifiable.

- **Generation is a batch job, not a service**: media is generated offline and written to B2; the frontend reads B2 URLs directly. This removes a fourth deployable, removes generation latency from the demo path, and makes B2 genuinely load-bearing as the CDN rather than a write-only bucket. Live generation stays in the UI as a gated, rate-limited capability, but the demo never depends on it.

- **Pin the installed version, not the repo**: Genblaze repo HEAD is the v0.6.0 wave, but `pip install genblaze` resolves umbrella 0.4.4 / core 0.3.7. The in-repo docs describe features that are not installed (`genblaze verify --fetch`, among others). The rule is **the installed source wins** — verify against the package, not the checkout. Also note `pip install genblaze` does *not* include the CLI; `genblaze-cli` is a separate install and the demo depends on it.

- **Not C2PA**: Genblaze manifests provide **integrity, not authentication** — they prove the manifest was not altered, not who produced it, and they are explicitly not C2PA. EU AI Act Article 50 and California AB 853 both bite on 2 August 2026 and name C2PA as the reference mechanism. State precisely what we do and don't provide. Overclaiming in front of Backblaze engineers is worse than not mentioning it.
