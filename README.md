# RealityShift

**A persistent multi-agent world simulation that publishes broadcasts from worlds that don't exist.**

One AI agent runs each of ~195 countries, grounded in that country's real recent history.
The simulation runs continuously and self-corrects against real news each month, publishing
a public record of where its alternate history has drifted from reality.

Take over any country and the world **forks**. From that moment no new real-world data enters
your universe — every other country's agent reacts only to you. The fork is a true parallel
universe, and the media layer turns it into news segments and newspaper front pages that
report events which never happened.

> **Status:** the simulation (Milestones 1–10) is complete. Deployment and the generative
> media layer are in active development — see [`PLAN.md`](PLAN.md) for the current milestone
> board and [`PHASE0_AUDIT.md`](PHASE0_AUDIT.md) for the media-layer architecture audit.

---

## Why this exists

Institutions run policy wargames constantly. They are slow, expensive, and limited by how many
experts you can put in a room for a week. RealityShift runs the wargame continuously, forks it
on demand, and publishes each branch as consumable media with verifiable provenance.

The design property that makes it more than a toy: **once a world forks, no real-world data
enters it again.** That claim is invisible in plain text, so every generated asset carries it
inside a cryptographically hash-bound manifest — `simulation.real_world_data_cutoff`, verifiable
with a single command against the downloaded file.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 SIMULATION LAYER (always on)                 │
│                                                              │
│   Country Agent × N  ──→  Supabase (world state, history)   │
│        ↑ monthly                   ↓                         │
│    News API / web            Divergence Reports              │
│                                    ↓                         │
│                          Public Dashboard (read-only)        │
└─────────────────────────────────────────────────────────────┘
                    ↓  fork on player join
┌─────────────────────────────────────────────────────────────┐
│                    GAME LAYER (per fork)                     │
│                                                              │
│   Human Player ──→ Policy changes ──→ Agent reactions       │
│                    (no new real-world data injected)         │
└─────────────────────────────────────────────────────────────┘
                    ↓  divergence briefs
┌─────────────────────────────────────────────────────────────┐
│              MEDIA LAYER (batch, Python)                     │
│                                                              │
│   DivergenceBrief ──→ Genblaze Pipeline ──→ Backblaze B2    │
│                       (script → TTS → b-roll →              │
│                        video → ffmpeg mux)                   │
│                       manifests hash-bound with fork lineage │
└─────────────────────────────────────────────────────────────┘
```

The media layer is a **separate Python process that only reads Supabase.** It cannot reach
simulation internals — the sim is TypeScript on Cloudflare Workers and Genblaze is a Python
SDK, so the isolation is enforced by the architecture rather than by convention.

### Stack

| Layer | Choice |
|---|---|
| Frontend | Vite + React 19 + TypeScript, Zustand |
| 3D Globe | CesiumJS |
| Agent backend | Cloudflare Workers |
| Database | Supabase (Postgres + pgvector) — simulation transactional state |
| Auth | Supabase Auth |
| Media pipeline | Genblaze (Python) |
| Media storage | Backblaze B2 — assets, manifests, snapshots, Parquet analytics |
| Simulation LLM | Groq (Llama 3.3 70B), OpenAI-compatible |
| Scheduler | GitHub Actions (monthly cron) |
| Country data | World Bank API + REST Countries |
| News | NewsAPI.org |

---

## Local setup

### Prerequisites

- **Node.js 20+** and npm
- **Python 3.11+** — media layer only
- **ffmpeg** on PATH — media layer only, used for audio/video compositing
  (`brew install ffmpeg` on macOS)

### 1. Simulation (frontend + worker)

```bash
git clone https://github.com/ikathuria/RealityShift.git
cd RealityShift
npm install
```

Create a [Supabase](https://supabase.com) project and run [`supabase/schema.sql`](supabase/schema.sql)
in its SQL editor. This creates `worlds`, `country_states`, `agent_decisions`, `divergences`,
`world_events`, and `game_sessions`, plus row-level security policies.

Copy `.env.example` to `.env` and fill in your keys:

```bash
cp .env.example .env
```

| Variable | Where to get it |
|---|---|
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | Supabase project settings |
| `VITE_CESIUM_ION_TOKEN` | [ion.cesium.com](https://ion.cesium.com) (free) |
| `VITE_AI_PROXY_URL` | your deployed Worker URL |
| `GROQ_API_KEY` | [console.groq.com](https://console.groq.com) (free, no card) |
| `SUPABASE_SERVICE_KEY` | Supabase — **worker only, never the frontend** |
| `NEWS_API_KEY` | [newsapi.org/register](https://newsapi.org/register) (free tier) |

**The Worker does not read `.env`.** `wrangler dev` loads its secrets from
`workers/.dev.vars`, so the worker-side variables need to be copied there as well
or every protected endpoint returns 401 and every database call fails:

```bash
cat > workers/.dev.vars <<'EOF'
GROQ_API_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
NEWS_API_KEY=
WORKER_SECRET=
EOF
```

`WORKER_SECRET` is any long random string — it just has to match between
`.env` and `workers/.dev.vars`. Generate one with:

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

`.dev.vars` is gitignored. Never commit it.

Start the frontend (http://localhost:5173):

```bash
npm run dev
```

Start the Worker in a second terminal (http://localhost:8787):

```bash
npm --prefix workers install && npm --prefix workers run dev
```

Seed the live world with real World Bank data — one time, takes about 5 seconds
and loads ~210 countries:

```bash
curl -X POST http://localhost:8787/api/seed -H "x-worker-secret: $(grep '^WORKER_SECRET=' .env | cut -d= -f2-)"
```

Advance one country by a simulated year (this is the agent loop):

```bash
curl -X POST http://localhost:8787/api/agents/run \
  -H "x-worker-secret: $(grep '^WORKER_SECRET=' .env | cut -d= -f2-)" \
  -H 'Content-Type: application/json' \
  -d '{"world_id":"live","country_code":"IND"}'
```

Note the globe takes 15–25 seconds on first load — it fetches country geometry
from a CDN. Without `VITE_CESIUM_ION_TOKEN` there is no base imagery, so the
globe renders as dark country polygons over the starfield rather than as Earth.

### 2. Media layer

> In development — see [`PLAN.md`](PLAN.md) Milestones 12–15. Setup instructions will be
> verified from a clean clone before submission.

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -e media/
pip install genblaze-cli          # NOT included in the genblaze umbrella package
```

Media-layer environment variables:

```
B2_KEY_ID, B2_APP_KEY, B2_BUCKET, B2_REGION
GMI_API_KEY                       # console.gmicloud.ai
ELEVENLABS_API_KEY                # optional — anchor TTS
STABILITY_API_KEY                 # optional — music bed
```

Verify provenance on any generated asset:

```bash
genblaze verify broadcast.mp4
genblaze extract broadcast.mp4
```

---

## How the simulation runs

There is no automatic clock. Two triggers advance the world:

- **`POST /api/agents/run`** — every country's agent reads its state, finds its closest
  historical parallels, decides, and writes to `agent_decisions` + `country_states`.
- **Monthly sync** (GitHub Actions, 1st of each month) — each country fetches real news,
  compares simulated state to reality, self-corrects, and publishes a divergence report.

Forks are excluded from the monthly sync by a hard `is_live` check. That is the enforcement
point for the no-new-data property.

### Worker API

```
GET  /api/health              GET  /api/countries          POST /api/seed
POST /api/agents/run          POST /api/sync/country       POST /api/fork/create
POST /api/fork/simulate-year  GET  /api/world/feed.xml
```

---

## Synthetic media policy

Every generated artifact is marked as synthetic twice: a **visible** watermark or spoken
disclaimer, and a **machine-readable** embedded Genblaze manifest.

- **No photorealistic synthetic media of real, identifiable people.** Anchors and
  spokespeople are fictional and the aesthetic is deliberately stylized. Real countries,
  institutions, and policies are depicted; real faces and voices are not.
- **No graphic violence, atrocity, or persecution imagery**, even where a simulation branch
  implies it — such branches are summarized in neutral text instead.
- **Genblaze manifests are not C2PA.** They provide *integrity* — proof the manifest was not
  altered — not *authentication* of who produced it. We do not claim otherwise.

Agents and players may pursue any political direction. The simulation shows consequences,
not judgments; the historical parallel card is informational and never a blocker.

---

## Contributing

The highest-value contributions need no code. Both
[`workers/src/data/history/periods.json`](workers/src/data/history/periods.json) (historical
policy periods) and
[`country_histories.json`](workers/src/data/history/country_histories.json) (per-country
20-year timelines) are plain JSON, and better data directly improves agent reasoning.

`CONTRIBUTING.md` is pending — see [`PLAN.md`](PLAN.md) Milestone 11.

---

## Documentation

| Document | Contents |
|---|---|
| [`PLAN.md`](PLAN.md) | Milestone board, architecture decisions, day allocation |
| [`PHASE0_AUDIT.md`](PHASE0_AUDIT.md) | Media-layer audit: interface boundary, Genblaze findings, cost model |
| [`GENBLAZE_FEEDBACK.md`](GENBLAZE_FEEDBACK.md) | SDK friction log from a real integration |
