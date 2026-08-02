"""Front-page pipeline: DivergenceBrief -> illustrated newspaper image.

Default backend is a local diffusion model (no cloud provider, no API key, no
per-image cost) — see providers/local_diffusion.py. A cloud backend (GMICloud
Seedream) is available via backend="cloud" for anyone with a provider key.

Either way the image carries the simulation provenance block, so the stored
manifest's canonical hash is bound to the fork. With the local backend and no
sink, the whole thing runs offline and still produces a verifiable manifest.
"""
from __future__ import annotations

import os

from genblaze_core import Modality, Pipeline

from ..contracts import DivergenceBrief
from ..pricing import register_pricing
from ..prompts import front_page_prompt, illustration_prompt, newspaper_fields
from ..provenance import apply_provenance

PRIMARY_MODEL = "seedream-5.0-lite"        # cloud backend
FALLBACK_MODELS = ["flux-1-schnell"]
LOCAL_MODEL = "sdxl-turbo"


def build_pipeline(brief: DivergenceBrief, *, backend: str = "local") -> Pipeline:
    """Construct the pipeline for one front page. No network until .run()."""
    pipeline = Pipeline(
        f"front-page-{brief.fork_id}-{brief.nation_iso}-{brief.sim_date.year}",
        tenant_id=brief.fork_id,
    )
    pipeline = apply_provenance(pipeline, brief)

    if backend == "local":
        from ..providers.local_diffusion import LocalDiffusionProvider

        pipeline.step(
            LocalDiffusionProvider(),
            model=LOCAL_MODEL,
            prompt=illustration_prompt(brief),
            modality=Modality.IMAGE,
            # Newspaper text goes in metadata: free-form, and it lands in the
            # manifest hash — so the headline is part of the asset's provenance.
            metadata={"newspaper": newspaper_fields(brief)},
        )
        return pipeline

    if backend == "cloud":
        from genblaze_gmicloud import GMICloudImageProvider

        provider = GMICloudImageProvider(api_key=os.environ.get("GMI_API_KEY"))
        register_pricing(provider)
        pipeline.step(
            provider,
            model=PRIMARY_MODEL,
            prompt=front_page_prompt(brief),
            modality=Modality.IMAGE,
            fallback_models=FALLBACK_MODELS,
            params={"aspect_ratio": "3:4", "resolution": "1024x1365"},
        )
        return pipeline

    raise ValueError(f"unknown backend: {backend!r} (expected 'local' or 'cloud')")


def generate_front_page(brief: DivergenceBrief, *, backend: str = "local",
                        sink=None, timeout: float = 300.0):
    """Run the pipeline and return the PipelineResult.

    With backend='local' and sink=None the run is fully offline: the asset is a
    file:// image on disk and the manifest still verifies. Pass a sink (see
    storage.backblaze_sink) to upload to B2.
    """
    # raise_on_failure=False keeps failed steps inspectable via result.failed_steps()
    # rather than raising; it also pins the behaviour ahead of the 0.4.0 default flip.
    return build_pipeline(brief, backend=backend).run(
        sink=sink, timeout=timeout, raise_on_failure=False,
    )
