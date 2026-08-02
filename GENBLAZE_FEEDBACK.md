# Genblaze SDK — Integration Feedback

A running log of friction encountered while integrating [Genblaze](https://github.com/backblaze-labs/genblaze)
into RealityShift's media layer. The maintainers explicitly asked for this via GitHub issues,
so items marked **Ready to file** get written up as bug reports or feature requests at the end
of each phase.

**Ground rule: no manufactured issues.** Low-quality noise is worse than silence. Everything
here is real friction hit during a real integration, with reproduction steps.

**Environment:** macOS 27.0, Python venv, `pip install genblaze`.
On 2026-07-27 this resolved `genblaze 0.4.4 / genblaze-core 0.3.7 / genblaze-s3 0.3.6`;
on 2026-07-30 a fresh install resolved `genblaze 0.4.5 / genblaze-core 0.3.8 / genblaze-s3 0.3.6`
— the umbrella and core moved twice in three days. Repo HEAD at audit time: v0.6.0
release wave (tagged 2026-07-22).

**Linchpin verified on the installed package (core 0.3.8, schema 1.5).** The
integration depends entirely on `Run.metadata` being inside the canonical hash.
The repo comment (`models/manifest.py`) says so, but the repo is a different
version than PyPI resolves, so this was verified directly on the installed core:
building a `Run` with `metadata={"simulation": {...}}`, hashing via
`Manifest.from_run`, and confirming the hash changes when `simulation.fork_id`
or `simulation.real_world_data_cutoff` changes. It does. `Pipeline.metadata(**kw)`
is present and merges into `Run.metadata`. This held across both 0.3.7 and 0.3.8.

---

## 1. The umbrella package does not include the CLI

**Status:** Ready to file · **Type:** Bug / docs · **Phase:** 0

`README.md` documents `pip install genblaze` as the standard install ("core + B2/S3 storage")
and separately documents the CLI workflow:

```bash
genblaze extract video.mp4
genblaze verify video.mp4
```

But a clean `pip install genblaze` installs only `genblaze`, `genblaze-core`, and
`genblaze-s3`. There is no `genblaze` executable on PATH, so the documented verification
flow fails immediately after a documented install. `pip install genblaze-cli` fixes it.

**Reproduction:**
```bash
python3 -m venv env && ./env/bin/pip install genblaze
./env/bin/genblaze --help    # → No such file or directory
```

**Why it matters to us:** `genblaze verify` on a downloaded asset is the centerpiece of our
demo video. A judge following the README to reproduce it would hit a wall.

**Suggested fix:** either fold `genblaze-cli` into the umbrella's default dependencies, or add
an explicit note next to the CLI docs. If the CLI is intentionally opt-in, `pip install
"genblaze[cli]"` would signal that better than a bare separate package name.

---

## 2. No in-repo signal of which docs match which released version

**Status:** Ready to file · **Type:** Docs · **Phase:** 0

The repo's `docs/` describe HEAD (v0.6.0 wave), but PyPI resolves `genblaze-core 0.3.7`.
Several documented features are simply absent from the installed package — `genblaze verify
--fetch` is called out as new in the 0.6.0 changelog, for instance.

The `<!-- last_verified: YYYY-MM-DD -->` header on each feature doc is a nice touch, but it
records *when the doc was checked*, not *which package version it describes*. Since the
release-wave tag (`v0.6.0`) deliberately differs from individual package versions
(umbrella 0.4.4, core 0.3.7), a reader cannot map a doc to a version at all.

**Why it matters to us:** we built an implementation plan against repo docs, then found the
installed package had a different API surface. Our internal rule is now "the installed source
wins" — but that only works because we cloned the repo *and* read the installed code.

**Suggested fix:** add `<!-- applies_to: genblaze-core >= 0.3.0 -->` alongside `last_verified`,
or publish versioned docs. A short "which version am I reading?" note in `docs/index.md`
would cover most of the gap cheaply.

---

## 3. `compute_cost()` returns `None` silently when pricing is unregistered

**Status:** Ready to file · **Type:** Feature request / DX · **Phase:** 0

As of core 0.3.0 the SDK ships zero hardcoded prices, and
`docs/reference/pricing-recipes.md` explains the rationale clearly — pricing rot, fidelity,
maintenance surface. The reasoning is sound and we agree with it.

The DX consequence is the problem: `compute_cost()` and `Pipeline.estimated_cost()` return
`None` for any model whose pricing was never registered, with no warning. It is easy to build
a cost dashboard, wire it to `ParquetSink`, and ship a table of empty columns without ever
noticing something was missing. The failure is silent and looks like "we had no runs" rather
than "you never registered pricing."

**Suggested fix:** emit a one-per-`(provider, slug)` `WARN` on the first unpriced
`compute_cost()` call — the same dedup pattern already used for model preflight
(`OK_PROVISIONAL` / `UNKNOWN_PERMISSIVE`) and deprecated-model warnings. That pattern is
established in the codebase and would make this discoverable at the point of use.

---

## Watch list (not yet issues)

Real friction is likely here, but we have not hit it concretely enough to file:

- **Custom manifest fields** — the brief anticipated needing a sidecar. Not required:
  `Pipeline.metadata(**kwargs)` merges into `Run.metadata`, which is *intentionally included*
  in the canonical hash (`models/manifest.py:25`). This worked exactly as we needed. **Noting
  it as positive feedback**, since the maintainers should know the hashed-metadata design is
  load-bearing for at least one real integration.
- **C2PA bridging** — the README is appropriately honest that manifests are integrity-only and
  says to pair with your own signer. With EU AI Act Art. 50 and California AB 853 both landing
  2 August 2026 and naming C2PA as the reference mechanism, a first-party bridge may be worth
  a feature request. Holding until we know whether we attempt one.
- **AV compositing ergonomics** — `FFmpegCompositor` shells out to `ffmpeg` on PATH. Sensible,
  but the dependency is not surfaced at import or construction time; we expect to learn whether
  the failure mode is clear when ffmpeg is missing. Will revisit in Milestone 14.
- **Batch throughput** — `abatch_run()` behaviour under B2 rate limits is untested by us.
  Will revisit in Milestone 13.

---

## Positive: custom local provider integrated cleanly (from the local-generation build)

We moved image generation on-device (SDXL-Turbo via diffusers) by writing a
`SyncProvider` subclass — one `generate()` method returning an `Asset`. It
plugged into `Pipeline` → `Manifest` → the B2 sink with no special-casing, and
the provenance hash worked identically to a cloud provider. Two things that made
this smooth and are worth the maintainers knowing people rely on:

- **`SyncProvider` is a genuinely small, well-documented contract.** `name` +
  `generate(step, config)`; the docstring example was enough to implement against.
- **`file://` assets upload transparently.** Returning `Asset(url="file://…",
  sha256=…)` and letting `ObjectStorageSink` upload the local bytes to B2 is the
  clean integration point for any local/offline generator. Without a sink the
  manifest still builds and `verify()` passes, which let us test the whole
  pipeline offline with zero credentials.

## Minor: presigned/private-bucket + CORS is app-side, not Genblaze's job (noted, not a bug)

Serving a **private** B2 bucket to a browser needs presigned URLs *and* a bucket
CORS rule — without CORS the browser fails even a valid presigned URL with
"Failed to fetch". Genblaze's `asset.url` is the durable object URL; presigning
and CORS are correctly outside its scope. Flagging only because a one-line note
in the object-storage docs ("private buckets need presigning + CORS to be
browser-readable") would save an integrator the debugging round-trip.
