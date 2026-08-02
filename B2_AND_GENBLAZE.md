# How RealityShift uses Backblaze B2 and Genblaze

Required by the Backblaze Generative AI Media Hackathon submission. Everything
below is implemented and verified live against a real bucket, not aspirational.

## The one-line architecture

**Supabase Postgres is the simulation's transactional state; Backblaze B2 is the
entire media plane; Genblaze is the pipeline that binds generated media to
verifiable provenance and lands it in B2.**

The simulation produces *structured narrative divergence* — for each fork and
sim-month, exactly what its AI agents decided and how that diverges from the
consensus timeline. That is the ideal input for a media pipeline, and it's what
flows through Genblaze into B2.

## Genblaze

Genblaze orchestrates generation and produces the provenance record.

- **Pipeline / SyncProvider.** Image generation is a Genblaze `Pipeline` step. The
  local diffusion model is wrapped as a `SyncProvider` (`generate()` → an
  `Asset`), so the generation backend is pluggable — local today, a cloud
  provider by config — without touching provenance or storage.
- **Hash-bound simulation provenance — the core idea.** The project's defining
  property is invisible in a finished image: *once a fork splits, no real-world
  data enters it.* We make it verifiable by putting the simulation fields into
  `Run.metadata`, which Genblaze **includes in the canonical SHA-256 hash**
  (verified directly on the installed `genblaze-core` 0.3.8 — changing
  `simulation.fork_id` or `simulation.real_world_data_cutoff` changes the hash):

  ```
  simulation.fork_id
  simulation.parent_fork_id
  simulation.divergence_date
  simulation.sim_date
  simulation.real_world_data_cutoff   # == divergence_date; no real data after this
  simulation.is_counterfactual = true
  simulation.consensus_reality = false
  ```

  `genblaze verify` on a downloaded asset re-derives the hash, so these fields
  can't be altered without breaking verification. No generic media tool produces
  that field — it is the strongest, most differentiating part of the submission.
- **Manifests in B2.** Every run's `Manifest` is stored alongside the asset; the
  headline text itself lives in step metadata, so it's part of the hash too.
- **Honest scope.** Genblaze manifests provide **integrity, not authentication**,
  and are **not C2PA** — the project does not claim otherwise. (The README's
  synthetic-media policy states this plainly.)

## Backblaze B2

B2 is not decorative storage — it is load-bearing and does everything the media
plane needs:

1. **Generated media** — every front-page PNG (1024×1365). Grows without bound
   as forks and sim-months multiply.
2. **Provenance manifests** — one per run, hash-bound, stored in B2.
3. **The per-fork media index** — `index/{world_id}/media.json`, the single object
   the frontend reads to render the front-page wall. This *replaces* a Postgres
   table: the batch generator is the sole writer (no lost-update risk), the
   frontend wants the whole set anyway (no query), and fork media is as public as
   the fork (no RLS). So the media layer adds **zero schema changes** —
   `git diff` on `supabase/` is empty.
4. **Content-addressable dedup** — `KeyStrategy.CONTENT_ADDRESSABLE`. Forks that
   share pre-divergence history produce byte-identical assets from identical
   prompts, which collapse to one object under `assets/{sha[:2]}/{sha[2:4]}/{sha}`.
   Pre-divergence media cost is O(1) in fork count, not O(N).
5. **Private-bucket serving** — the bucket is private (an unauthenticated fetch
   returns 401). The browser reads it via time-limited **presigned URLs** (the
   index and every image), plus a **CORS** rule set through the same key
   (`rs-media setup-cors`). No public bucket and no server proxy required.
6. **Durable, credential-free delivery** — the frontend streams images straight
   from B2; there is no Worker or Supabase round-trip in the media read path.

### Verified live

`rs-media batch --nations IND,USA --from-year 2026 --to-year 2027` produced 4
real front pages, uploaded them to the private bucket, presigned the URLs, wrote
the index, and the front-page wall rendered all four covers in the browser
(image `naturalWidth` = 1024 confirms the load) — with `manifest.verify()` ==
True and the fork provenance in the hash.

### Cost note

Generation is local and free. B2 stores a handful of ~400 KB images plus small
JSON — comfortably inside the free tier. Presigned URLs expire at B2's 7-day
ceiling, so the index is re-presigned when regenerated; a public bucket removes
the expiry and stays free at this volume.
