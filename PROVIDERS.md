# Providers and Models

Every AI provider and model RealityShift uses, and its role. Required by the
Backblaze Generative AI Media Hackathon submission.

## Media generation (the generative-media layer)

| Provider | Model | Modality | Role |
|---|---|---|---|
| **Local (on-device)** | **SDXL-Turbo** (`stabilityai/sdxl-turbo`) | Image | Generates the editorial illustration on each newspaper front page. Runs via 🤗 diffusers on Apple Silicon (Metal/MPS). No cloud provider, no API key, no per-image cost. |
| Deterministic (non-ML) | — | Image | The newspaper *layout* — masthead, dated header, real headline, columns, synthetic-content watermark — is composited with Pillow. Diffusion models can't render legible headline text, so only the illustration is generative; the page around it is exact. |

**Orchestration & provenance:** [Genblaze](https://github.com/backblaze-labs/genblaze)
(`genblaze` 0.4.5 / `genblaze-core` 0.3.8 / `genblaze-s3` 0.3.6). The local model
is wrapped as a Genblaze `SyncProvider`, so every image is a normal Genblaze
`Asset` with a hash-verified `Manifest` — the generation backend is pluggable
without changing the provenance or storage story.

**Optional cloud backend:** GMICloud (Seedream `seedream-5.0-lite`, FLUX fallback)
is wired via `backend="cloud"` for anyone with a provider key. Not used by
default — the project runs generation locally and free.

**Why local, not a cloud image API:** no hackathon credits were available, and
the value of the submission is Genblaze provenance + durable Backblaze B2
storage, not who renders the pixels. Local generation keeps that intact at zero
cost. See [`B2_AND_GENBLAZE.md`](B2_AND_GENBLAZE.md).

## Simulation (the always-on multi-agent world)

| Provider | Model | Role |
|---|---|---|
| **Groq** | **Llama 3.3 70B** (`llama-3.3-70b-versatile`) | Every country agent's decisions, and the monthly sim-vs-reality divergence comparison. OpenAI-compatible; the wrapper (`workers/src/ai/llm.ts`) swaps host/model in one line. Free tier. |

## Data sources (non-generative, for grounding)

| Source | Role |
|---|---|
| World Bank API | Seeds every country's real indicators (GDP, population, military/education/healthcare spend, unemployment, tax). |
| NewsAPI.org | Real headlines for the monthly divergence self-correction. |
| ISO 3166-1 / world-atlas | Country codes, names, boundaries, and the illustrated globe texture (generated offline). |

## Not used
- No photorealistic synthetic media of real, identifiable people (illustrated,
  fictional figures only — see the synthetic-media policy in the README).
- No paid image/video cloud API in the default path.
