# RealityShift

> A persistent, free, open-source multi-agent world simulation. One AI agent runs each country based on real history. The live world tracks itself against real news and publishes **divergence reports** (alternate-history-vs-reality). Fork the world, take over any country, and watch every other country's agent react — a parallel universe with no new real-world data injected.

- **What & why:** [docs/01-product-overview.md](docs/01-product-overview.md)
- **How it's built:** [PROJECT.md](PROJECT.md) · [docs/02-architecture.md](docs/02-architecture.md)
- **Build plan / status:** [PLAN.md](PLAN.md)
- **Is it worth building:** [RESEARCH.md](RESEARCH.md)

## Stack

Vite + React + TypeScript + CesiumJS (`apps/web`) · Cloudflare Workers (`apps/worker`) · Supabase (Postgres + pgvector + Auth) · Groq (Llama 4 Maverick, Claude-swappable) · GitHub Actions (monthly sync). All free-tier. Versions in [PROJECT.md](PROJECT.md#stack).

## Repository layout

```
apps/web/      frontend (globe, panels, dashboard)
apps/worker/   Cloudflare Worker — agents, RAG, monthly sync, API
supabase/      schema.sql + migrations
docs/          product, architecture, data model
.github/       monthly-sync workflow
```

## Local setup

```bash
# 1. Install both apps
npm run install:all

# 2. Configure secrets — copy and fill in
cp .env.example .env
#   Worker: GROQ_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY, NEWS_API_KEY, WORKER_SECRET
#   Web:    VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_CESIUM_ION_TOKEN, VITE_AI_PROXY_URL

# 3. Initialize the database
#   Run supabase/schema.sql in the Supabase SQL editor, then apply supabase/migrations/* in order.

# 4. Seed the live world (World Bank data)
#   Run the seeder in apps/worker (see apps/worker/src/seed.ts).

# 5. Run
npm run dev          # frontend  → http://localhost:5173
npm run worker:dev   # worker    → http://localhost:8787
```

Get free API keys: [Groq](https://console.groq.com) · [Supabase](https://supabase.com) · [NewsAPI](https://newsapi.org/register) · [Cesium Ion](https://ion.cesium.com).

## Useful scripts (run from repo root)

| Command | Does |
|---|---|
| `npm run dev` | Start the web app |
| `npm run worker:dev` | Start the Worker locally |
| `npm run build` | Build the web app |
| `npm run typecheck` | Typecheck the web app |
| `npm run lint` | Lint the web app |
| `npm run worker:deploy` | Deploy the Worker |

## Status

Feature-complete through Milestone 10; remaining work is deploy + operational hardening (Milestone 11). See [PROJECT.md](PROJECT.md#current-status).

## Contributing

The easiest first PR is the community knowledge base — plain JSON, no code: add a historical period to `apps/worker/src/data/history/periods.json` or a country's recent history to `country_histories.json`. A full `CONTRIBUTING.md` lands in Milestone 11.

## License

Open source (community-built, no revenue goal).
