# 03 — Data Model

Source of truth: [`supabase/schema.sql`](../supabase/schema.sql) plus migrations in [`supabase/migrations/`](../supabase/migrations/). Run `schema.sql` in the Supabase SQL editor to initialize, then apply migrations in order.

## Core tables

```sql
-- The canonical world state, branched per fork.
worlds          { id, fork_of, created_at, is_live, player_id,
                  forked_at_year, player_country_code }

-- Each country's state within a world.
country_states  { world_id, country_code, year, indicators{}, policies{},
                  agent_memory_summary, relations{}, last_updated }

-- Agent decisions log (what each agent decided and why).
agent_decisions { world_id, country_code, year, decision{}, reasoning,
                  historical_parallel, created_at }

-- Monthly divergence reports (live world only).
divergences     { country_code, sim_year, real_date, sim_state{},
                  real_state{}, delta{}, narrative, published_at }

-- Player game sessions.
game_sessions   { id, player_id, world_id, country_code, started_at,
                  ended_at, summary }
```

## Added by migrations

- `002_player_country.sql` — `worlds.player_country_code` (ISO3 of the taken-over country).
- `003_world_events.sql` — inter-agent events (sanctions, trade deals, military posture, diplomatic protests) for the World Events feed and Milestone 8 coordination.
- `004_region_states.sql` — sub-national region state for Milestone 10 drill-down (housing / transport / local-tax policies).

## Conventions

- **`world_id = 'live'`** is the single canonical live simulation. Forks get generated ids.
- **pgvector** (`create extension vector`) backs historical-period similarity (Milestone 4). Watch the 500 MB free-tier ceiling if per-country embeddings are ever added — historical periods alone are fine.
- **RLS** uses `auth.uid()`; the `player_id` FK references `auth.users(id)`. The Worker uses the service-role key and bypasses RLS.
