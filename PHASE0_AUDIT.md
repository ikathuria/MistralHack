# Phase 0 Audit — Media Layer for the Backblaze Generative AI Media Hackathon

**Date:** 2026-07-27 · **Status:** awaiting approval · **No production code written.**

---

## 0. The question that decides everything

> **Can the media layer consume divergence data at a stable boundary without refactoring the agent core?**

**Yes — and more cleanly than the brief assumes.**

The decisive fact is one the brief did not anticipate: **the simulation is TypeScript running on Cloudflare Workers; Genblaze is a Python SDK.** The media layer *cannot* be an in-process module even if we wanted it to be. It must be a separate Python service, and the only thing it can possibly touch is the shared Supabase Postgres database.

That turns "don't modify the simulation core" from a discipline we have to maintain into a property the architecture enforces for free. `git diff` on `workers/` and `src/` will be empty because nothing in the media layer can reach them.

**The boundary is the Supabase schema** (`supabase/schema.sql`) — five already-stable, already-persisted tables:

| Table | Per-world? | What the media layer takes from it |
|---|---|---|
| `worlds` | — | fork lineage: `fork_of`, `forked_at_year`, `is_live`, `player_country_code` |
| `country_states` | ✅ `world_id` | indicators, policies, relations per country per year |
| `agent_decisions` | ✅ `world_id` | `reasoning`, `historical_parallel`, `decision`, `projected_indicators` |
| `world_events` | ✅ `world_id` | typed inter-agent events — sanctions, trade deals, alliances |
| `divergences` | ❌ **no `world_id`** | sim-vs-reality narrative + delta (live world only) |

Read-only access, no schema change, no worker change. **Proceed.**

### The one real gap (and why it is not a blocker)

`divergences` has **no `world_id` column** — it is live-world-only by construction. This is not an oversight; it is the philosophical core of the project working as designed. A fork receives no real-world news (`syncCountry.ts:33-40` hard-checks `worlds.is_live`), so a fork can never diverge *from reality* in the sense that table records.

Two further limits on that table:
- `divergences.real_state` is **always `{}`** — `publishDivergence.ts:31` writes it empty with a `// leave for M6 enrichment` comment that was never actioned.
- `narrative` is a single free-text blob with the raw news block string-concatenated onto the end. There are **no structured story beats anywhere in the system.**

**How we resolve this without touching the core.** For a fork, the interesting divergence is not fork-vs-reality — it is **fork-vs-live-world at the same sim year**. That is a pure read-side computation: join the fork's `country_states` against `world_id='live'` at matching `year`, and pull the fork's `agent_decisions` and `world_events`. All of that data already exists and is already per-world.

`NarrativeBeat` becomes an **adapter-side synthesis** — one `chat()` call over rows already in Postgres, turning `agent_decisions.reasoning` and `world_events` into ordered beats. This is exactly the role Genblaze documents for `chat()`: *"a convenience for driving media steps from an LLM."* We are using it as intended, not smuggling an LLM app into a media framework.

**Decision I need from you (not blocking Phase 1):** adding `world_id` to `divergences` would be a one-line migration and would make fork divergence a first-class persisted record rather than a derived view. It is a schema change, so per your rule #5 I am asking rather than doing. My recommendation: **skip it.** The derived view is sufficient for the demo, and the migration touches a table the monthly sync writes to.

---

## 1. Repo map

**Frontend** — Vite 8 + React 19 + TypeScript, deployed nowhere yet.
- `src/components/` — `Globe.tsx` (CesiumJS), `CountryPanel`, `RegionPanel`, `PolicyEditor`, `DecisionLog`, `DivergenceCard`, `WorldEventsFeed`, `AuthModal`
- `src/pages/` — `GamePage.tsx`, `WorldDashboard.tsx` (public `/world` route)
- `src/store/` — Zustand: `worldStore`, `regionStore`, `gameStore`, `authStore`
- `src/lib/supabase.ts` — anon-key client

**Backend** — Cloudflare Worker, `workers/src/index.ts`, deployed nowhere yet. Routes:
```
GET  /api/health          GET  /api/countries       POST /api/seed
POST /api/agents/run      POST /api/sync/country    POST /api/fork/create
POST /api/fork/simulate-year                        GET  /api/world/feed.xml
```

**How the sim ticks.** There is no automatic clock. Two triggers:
1. `POST /api/agents/run` → `runAgents.ts` iterates countries → `countryAgent.ts` per country → writes `agent_decisions`, updates `country_states`, emits `world_events` via `events.ts`.
2. GitHub Actions `.github/workflows/monthly-sync.yml` (cron `0 0 1 * *`) → calls `POST /api/sync/country` once per country → `fetchNews` → `compareState` → `publishDivergence`.

**Fork state** lives entirely in Supabase: `POST /api/fork/create` inserts a `worlds` row with `fork_of='live'` and copies all `country_states` under the new `world_id`. `POST /api/fork/simulate-year` runs every *other* country's agent against the player's changed state.

**How divergence is computed today.** `compareState.ts` sends indicators + 5 news headlines to the LLM at `temperature: 0.3`, expecting JSON `{diverged, delta, explanation, self_correction}`. Unparseable output silently degrades to `diverged: false`. `publishDivergence.ts` always inserts a row (even when not diverged) and applies `self_correction` as small additive nudges to indicators.

---

## 2. Devpost rules — pre-existing work

Fetched from `backblaze-generative-media.devpost.com/rules`. **We are eligible.** Quoted:

> "Projects must be either newly created by the Entrant or, if the Entrant's Project existed prior to the Hackathon Submission Period, must be using B2 storage and Genblaze SDK after the start of the Hackathon Submission Period."

> "Entrants should explain how their Project was significantly updated during the Submission Period."

This is close to ideal for us. The simulator predates the hackathon, but **every line of B2 and Genblaze integration will be written now**, which is precisely what the rule requires. The "significantly updated" explanation writes itself: the entire media layer is new.

**Deadline:** *"August 3, 2026 (5:00 pm Eastern Time)"* — and *"Once the Submission Period has ended, you may not make any changes or alterations to your Submission."*

> ⚠️ **That is seven days from today.** This is the binding constraint on the whole plan, and it is why my Phase 3 recommendation below is deliberately narrow. See §7.

Other stated requirements: working app URL judges can access, public-or-shared GitHub repo with setup instructions, text description of features, demo video under 3 minutes.

---

## 3. Genblaze reality check

I cloned `backblaze-labs/genblaze`, read the source, installed from PyPI, and ran `examples/quickstart_local.py`.

**Install works. Local manifest builds and verifies:**
```
Run ID:    72640495-0e28-4412-9df3-09a753525f87
Hash:      42c451695e3aa766bf5945dffc7aa384ac4d6649b692c21589c5af101863fae8
Verified:  True
```

### ✅ Confirmed from source

- `Pipeline` / `Step` / `Run` / `Asset` / `Manifest` / `ModelRegistry` / `Sink` / `Tracer` / `AgentLoop` / `EmbedPolicy` all exist as described.
- `S3StorageBackend.for_backblaze(bucket, region=, key_id=, app_key=)` — real, falls back to `B2_BUCKET`/`B2_REGION`/`B2_KEY_ID`/`B2_APP_KEY` env vars, auto-detects region on B2 redirect.
- `KeyStrategy.HIERARCHICAL` / `CONTENT_ADDRESSABLE` — real (`storage/base.py:83`).
- `Pipeline(name, tenant_id=..., project_id=..., chain=...)` — `tenant_id` is a real first-class constructor arg, normalized via `normalize_tenant_id()`. **The brief's plan to map forks onto `tenant_id` is sound.**
- `Pipeline.from_result()`, `.batch_run()`, `.abatch_run()`, `.arun()`, `.stream()` — all real.
- `AgentLoop(build_pipeline_fn, evaluator, max_iterations=)` with `CallableEvaluator` / `ThresholdEvaluator` / custom `Evaluator`. Iterations linked by `parent_run_id`. `AgentContext` carries `ctx.iteration` and `ctx.last_evaluation.feedback` for prompt refinement. Returns `.passed`, `.iterations`, `.total_cost_usd`.
- CLI `extract` / `verify` / `replay` / `index` — all real and working.

### 🔴 Discrepancies with the brief — source wins

**1. Custom manifest fields are fully supported. This is better than §6.3 hoped — no sidecar needed.**

`Pipeline.metadata(**kwargs)` is a fluent method (`pipeline.py:554`) that merges into `Run.metadata`. And critically, from `models/manifest.py:25-27`:

> ```
> # NOTE: Step.metadata and Run.metadata are intentionally INCLUDED — they represent
> # user-supplied provenance tags (e.g. project labels, lineage annotations).
> ```

**Our simulation fields will be inside the SHA-256 canonical hash, not bolted alongside it.** `simulation.real_world_data_cutoff` becomes cryptographically bound to the asset. This is the single strongest thing in the submission and it is a native feature, not a workaround.

Note the API shape differs from the brief: there is **no `metadata=` kwarg on `Pipeline()`** — it is `Pipeline("x").metadata(fork_id=...)`.

**2. Pricing: the SDK ships ZERO hardcoded prices.** As of `genblaze-core 0.3.0`, `compute_cost()` and `Pipeline.estimated_cost()` return `None` for every model unless you first call `provider.models.register_pricing(slug, strategy)`. The `docs/reference/pricing-recipes.md` cookbook is explicitly marked *"Not maintained."*

> **This directly hits Phase 4.** The cost dashboard will render empty columns unless we register pricing recipes ourselves in application code. Budget for it; it is not free.

**3. `chat()` is per-connector, not a core export, and takes `model` first.**
```python
from genblaze_gmicloud import chat
resp = chat("model-slug", prompt="...", system="...", temperature=0.3)
# resp.text, resp.tokens_in/out, resp.cost_usd, resp.tool_calls
```
Explicitly **not** integrated with Pipeline/Step/manifest. The docs say: *"If you need manifest provenance for an LLM call, stash details in `step.metadata` on the downstream media step."* That is exactly what we will do for the script-generation step.

**4. AV compositing is real but shells out to ffmpeg.** `FFmpegCompositor` lives in `genblaze_core`, used as a normal step with `step_type=StepType.MIX, input_from=[0, 1]` — it fans in prior steps' outputs and muxes them. Genblaze does **not** implement muxing itself.

> ⚠️ **`ffmpeg` is not on PATH on this machine.** It must be installed locally *and* present in whatever environment runs generation. This is a hard dependency for the P0 broadcast.

**5. Version skew between repo HEAD and PyPI — a real trap.** `pip install genblaze` resolves to umbrella `0.4.4` / `genblaze-core 0.3.7` / `genblaze-s3 0.3.6`. But repo HEAD is the **v0.6.0 release wave** (2026-07-22, five days ago). The docs I read describe HEAD, not what pip installs. Concretely, `genblaze verify --fetch` is a 0.6.0 feature and is **not** in the installed core.

> **Mitigation: pin exact versions in Phase 1 and re-verify every API against the *installed* package, not the repo.** The brief's rule "the source wins" needs amending to "the installed source wins."

**6. The umbrella package does not include the CLI.** `pip install genblaze` gives core + s3 only. `genblaze verify` — the 2:10–2:40 centerpiece of the demo video — requires a separate `pip install genblaze-cli`. Must be in the README setup steps or judges will hit a wall.

### Recommendation on `KeyStrategy`

The brief asked me to evaluate both. Note the actual default is `CONTENT_ADDRESSABLE`, not `HIERARCHICAL` as the brief's example implies.

**Use `CONTENT_ADDRESSABLE` for everything.** The dedup argument is genuinely load-bearing here rather than decorative: every fork of the live world shares identical pre-divergence history, so identical prompts produce byte-identical assets that collapse to one object under `assets/{sha[:2]}/{sha[2:4]}/{sha}.ext`. With N forks sharing a divergence point, pre-divergence media cost is O(1) instead of O(N). That is a real number we can quantify in `B2_AND_GENBLAZE.md`.

The counter-argument for `HIERARCHICAL` on broadcasts — "per-fork browsability" — is weak, because we index by fork in Postgres anyway and store the resulting B2 URLs there. Do not split strategies; one strategy keeps the dedup story clean.

---

## 4. Deployment reality

**Nothing is deployed.** Milestone 11 is entirely untouched, and it is the *only* incomplete milestone in `PLAN.md`. Specifically:

- Frontend: no GitHub Pages workflow, and `vite.config.ts` has **no `base`** set — assets will 404 at a Pages subpath.
- Worker: never deployed. `workers/wrangler.toml` has `[[routes]] pattern = "/api/*"` with **`zone_name = ""`**, which will fail deploy outright. Needs a `workers.dev` subdomain instead for a hackathon.
- No secrets configured anywhere, in Cloudflare or GitHub Actions.

**So we are not adding a fourth deployable to three working ones. We are at zero of three, adding a fourth, in seven days.** I want that stated plainly because it is the largest risk in this project — larger than any Genblaze integration question.

**Recommendation that removes the risk:** make the media layer a **batch job, not a service.**

Run generation offline from a laptop or a GitHub Actions job. Write assets to B2. Store the resulting public B2 URLs in a Postgres table. The frontend then reads URLs from Supabase and streams media directly from B2 — no media service to deploy, no generation latency in the demo path, no cold starts while a judge waits.

This collapses the deployables from four to three, and B2 becomes genuinely load-bearing rather than a write-only bucket: it is the actual CDN serving the app's media. That is a stronger story for judges, not a weaker one.

Judge-accessible URL: **GitHub Pages** for the frontend (free, already planned in M11), **workers.dev** for the API.

---

## 5. Cost model

Prices from `docs/reference/model-matrix.md`, which is a snapshot and explicitly unmaintained — **verify against GMICloud before relying on these.**

| Model | Modality | Price |
|---|---|---|
| `seedream-5.0-lite` | image | $0.035 / asset |
| `seedance-1-0-pro-fast` | video | $0.022 / asset |
| `seedance-2-0-260128` | video | **$0.052 / second** |
| `kling-image2video-v2.1-master` | video | $0.28 / asset |

**Front page (P0):** 1 image = **$0.035**. A 12-month wall for one fork = **$0.42**. Twelve nations × 12 months = 144 images = **$5.04**. Trivially affordable.

**Broadcast (P0), 60s across 5 beats:**

| Component | Cheap path | Premium path |
|---|---|---|
| Script (`chat`) | ~$0.01 | ~$0.01 |
| TTS anchor VO, 60s | ~$0.10 | ~$0.15 |
| 5 × b-roll stills | $0.175 | $0.175 |
| 5 × image→video, 12s each | $0.11 *(seedance-1-0-pro-fast, per-asset)* | $3.12 *(seedance-2-0 @ $0.052/s)* |
| Music bed | ~$0.05 | ~$0.05 |
| ffmpeg mux | $0 | $0 |
| **Total** | **≈ $0.45** | **≈ $3.50** |

The 28× spread is entirely the video step, and it hinges on **per-asset vs per-second pricing**. Use `seedance-1-0-pro-fast` for iteration and bulk; reserve `seedance-2-0` for the one hero broadcast in the demo video.

`AgentLoop` multiplies whatever you pick by up to `max_iterations`. **Cap it at 2 and only on the hero broadcast**, or a retry storm quietly costs 3× with nothing to show.

**Caching / pregeneration strategy — mandatory, not optional:**
1. **Nothing generates during the demo.** Everything is pre-generated and seeded. A judge landing on the app sees a populated front-page wall and a playable broadcast immediately.
2. **`StepCache`** (`pipeline/cache.py`, keyed by step + `tenant_id`) for local iteration so re-running a batch after a prompt tweak does not re-bill unchanged steps.
3. **Content-addressable dedup** does the cross-fork work automatically.
4. Live generation stays in the UI as a visible capability, rate-limited and gated, but the demo never depends on it.

**Total realistic spend: under $30**, dominated by the handful of hero broadcasts.

---

## 6. Safety posture

No conflicts between the brief's §6 constraints and anything in Genblaze. Confirmed available:
- `EmbedPolicy` for manifest privacy controls (prompt redaction, pointer-mode sidecars).
- `Mp4Handler.embed()` / `.extract()` for machine-readable provenance in-file.
- Genblaze has an input `moderation` hook on `Pipeline(moderation=...)`.

Two things to hold onto:
- **Genblaze manifests are not C2PA.** The README says to pair with your own signer or C2PA where adversarial verification matters. And per `docs/features/trust-modes.md`, the canonical hash provides **integrity, not authentication** — it proves the manifest was not altered, not who produced it. `B2_AND_GENBLAZE.md` must state this precisely. Overclaiming here in front of Backblaze engineers would be worse than not mentioning it.
- Fictional anchors and a stylized non-photoreal aesthetic, per §6.1. No real faces, no real voices.

---

## 7. Proposed plan for Phases 1–4

**With seven days, P1 and P2 are dead.** I recommend cutting Leader Address and era-artifacts entirely and spending the time on making P0 excellent and the app actually deployed. A polished front-page wall plus one flawless broadcast with verifiable provenance beats four half-finished artifact types.

I also recommend **reordering deployment earlier**. Deployment is currently the single largest risk and it is sitting at the end of the plan where it will get compressed. Getting an empty-but-live app deployed on day 1 turns a project risk into a content-filling exercise.

### Proposed layout

```
media/                              # new top-level Python package — nothing else touched
  pyproject.toml                    # pinned genblaze versions
  .env.example
  contracts.py                      # DivergenceBrief, NarrativeBeat (Pydantic)
  adapter.py                        # Supabase rows -> DivergenceBrief (READ-ONLY)
  provenance.py                     # simulation.* metadata block builder
  storage.py                        # B2 sink factory, CONTENT_ADDRESSABLE
  pricing.py                        # register_pricing recipes (see §3 finding 2)
  pipelines/
    front_page.py                   # P0
    broadcast.py                    # P0
  cli.py                            # batch entrypoint: generate + seed
  tests/
GENBLAZE_FEEDBACK.md                # running log, per §9
```

### Phase 1 — Foundation *(day 1–2, runs in parallel with deployment)*
- `media/` package; pin `genblaze`, `genblaze-s3`, `genblaze-cli` to exact versions; install `ffmpeg`.
- `DivergenceBrief` + `NarrativeBeat` contracts; read-only Supabase adapter.
- B2 bucket, credentials, `.env.example`. (`.gitignore` already covers `.env` — **verified**.)
- Re-verify every §3 API against the *installed* package.
- **In parallel: deploy the empty app.** Pages workflow, `base` in `vite.config.ts`, worker to `workers.dev`, secrets. Do not leave this to Phase 4.
- ✅ **Checkpoint:** one front-page image in B2, manifest verifying, `simulation.fork_id` visible inside the canonical hash.

### Phase 2 — The Front Page *(day 2–3)*
- Prompt construction from `DivergenceBrief`; visible synthetic watermark.
- `fallback_models` chain, **proven by forcing a failure**.
- `abatch_run()` across nations for a fork-month.
- UI: front-page wall, filterable by fork and sim-date.
- ✅ **Checkpoint:** wall renders for one fork across ≥12 sim-months.

### Phase 3 — The Divergence Broadcast *(day 3–5)*
- Beats → script via `chat()`; stash LLM details in downstream `step.metadata`.
- TTS → b-roll stills → image→video → `FFmpegCompositor` mux with chyrons and music bed.
- `AgentLoop`, `max_iterations=2`, hero broadcast only.
- `Mp4Handler.embed()`; verify round-trip.
- Provenance panel in the player: extracted manifest, fork lineage, `real_world_data_cutoff`, verify button.
- ✅ **Checkpoint:** one broadcast playable in the deployed app, manifest extracts and verifies.

### Phase 4 — Submission *(day 5–7)*
- Seed content so no judge sees an empty state.
- Cost dashboard from `ParquetSink` — **requires `pricing.py` from Phase 1**.
- `README.md` verified from a clean clone (including `genblaze-cli` and `ffmpeg`).
- `PROVIDERS.md`, `B2_AND_GENBLAZE.md` addressing every point in §5.
- Demo video shot list; file Genblaze issues; grant `b2genblaze` access if private.

### Scope expansions I am flagging rather than taking (rule #5)

1. **New dependency: Python.** Unavoidable — Genblaze is Python-only and the repo is TypeScript. Isolated in `media/`.
2. **New dependency: `ffmpeg`** as a system binary for compositing.
3. **New Postgres table** (~`media_assets`: `world_id`, `country_code`, `sim_year`, `kind`, `b2_url`, `manifest_uri`, `canonical_hash`) so the frontend can find generated media. This is *additive* — no existing table altered — but it is still a schema change and I am asking first.
4. **`world_id` on `divergences`** — recommended **against**, see §0.

### Genblaze feedback candidates already logged

Real friction found during this audit, to be written up properly in `GENBLAZE_FEEDBACK.md`:
- Umbrella `genblaze` does not include `genblaze-cli`, so the documented `genblaze verify` flow fails after a documented install.
- Repo docs describe v0.6.0 while PyPI resolves core 0.3.7 — no in-repo signal about which docs match which release.
- `compute_cost()` silently returns `None` rather than warning when pricing is unregistered — easy to build a cost dashboard of empty columns and not notice.

---

## Bottom line

The boundary is clean, the architecture enforces the no-touch rule for free, and the strongest idea in the brief — simulation provenance bound into the manifest hash — is a **native, supported Genblaze feature** rather than the workaround §6.3 braced for.

The risk is not technical. **It is seven days with nothing yet deployed.** Approve a narrowed scope (P0 only, deployment pulled to day 1) and this is very achievable.

**Awaiting approval before writing production code.**
