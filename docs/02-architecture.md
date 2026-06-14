# 02 — Architecture

## Layers

```
┌─────────────────────────────────────────────────────────────┐
│                 SIMULATION LAYER (always on)                  │
│                                                               │
│   Country Agent × N  ──→  Supabase (world state, history)     │
│        ↑ monthly                  ↓                           │
│    NewsAPI / web              Divergence Reports              │
│                                   ↓                           │
│                       Public Dashboard (read-only /world)     │
└─────────────────────────────────────────────────────────────┘
                              ↓  fork on player join
┌─────────────────────────────────────────────────────────────┐
│                     GAME LAYER (per fork)                     │
│                                                               │
│   Human Player ──→ Policy changes ──→ Agent reactions        │
│                         (no new real-world data injected)     │
│                         (fork lives in Supabase as a          │
│                          separate world_id branch)            │
└─────────────────────────────────────────────────────────────┘
```

## Request / data flow

1. **Frontend** (`apps/web`, Vite + React + CesiumJS) renders the globe and panels. It reads world state directly from Supabase (anon key + RLS) and calls the Worker for any LLM-backed action.
2. **Worker** (`apps/worker`, Cloudflare Workers) is the only place LLM keys live. It proxies Groq (OpenAI-compatible) via `src/ai/llm.ts`, runs country agents, performs RAG history matching, and handles the monthly sync. Protected endpoints require the `x-worker-secret` header.
3. **Supabase** (Postgres + pgvector + Auth) holds all canonical state: worlds, per-country state, agent decisions, divergences, game sessions, region states, world events. RLS uses `auth.uid()`.
4. **Monthly sync** is orchestrated by **GitHub Actions** (`.github/workflows/monthly-sync.yml`), which calls the Worker once per country sequentially (one country per invocation keeps each call within Workers' CPU limit and Groq's rate limit, with a 4s sleep between countries).

## Why these boundaries

- **Workers free tier** has a tight per-invocation CPU budget — too small to process ~195 countries in one cron tick. GitHub Actions does the looping for free; each Worker call handles a single country.
- **Groq free tier** is rate-limited (30 RPM, ~6K TPM, ~1K RPD on most models). The sequential loop with sleeps stays under it. All LLM calls go through one wrapper so swapping to Claude is a one-line change.
- **Forking** is just copying ~195 `country_states` rows to a new `world_id` — cheap and clean. The fork never touches the live world again; the monthly sync only runs where `worlds.is_live = true`.

## Known operational constraints

See [RESEARCH.md](../RESEARCH.md) feasibility section. The two that bite:
- **Supabase free projects pause after ~1 week of inactivity** — a monthly-only cron leaves a gap longer than that. A weekly keep-alive ping is required before relying on the cron in production.
- **NewsAPI free is ~100 req/day** — fewer than 195 countries; batch over two days or use a freer news source.
