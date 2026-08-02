"""Local image generation — a Genblaze SyncProvider backed by a local model.

Generates the front page entirely on-device (no cloud provider, no API key, no
per-image cost): a diffusion model produces the illustration, then the newspaper
compositor lays out the page around it. The result is a normal Genblaze asset, so
the manifest, provenance hash, and B2 storage all work unchanged — local
generation only changes who makes the pixels.

torch/diffusers are imported lazily, so `import realityshift_media` never
requires them. Set RS_MEDIA_STUB=1 (or leave torch uninstalled) to use a
deterministic PIL placeholder illustration — how the tests and CI run without a
multi-GB model.

Model: SDXL-Turbo — 1–2 step generation, ~7 GB, fits a 24 GB machine and runs on
Apple Silicon via the Metal (MPS) backend. Override with RS_DIFFUSION_MODEL.
"""
from __future__ import annotations

import hashlib
import io
import os
import tempfile
from typing import Any

from genblaze_core.models.asset import Asset
from genblaze_core.providers.base import SyncProvider

from ..newspaper import compose_front_page

_DEFAULT_MODEL = os.environ.get("RS_DIFFUSION_MODEL", "stabilityai/sdxl-turbo")


def _stub_mode() -> bool:
    if os.environ.get("RS_MEDIA_STUB") == "1":
        return True
    try:
        import torch  # noqa: F401
        return False
    except Exception:
        return True


class LocalDiffusionProvider(SyncProvider):
    """Illustration via a local diffusion model, composed into a front page."""

    name = "local-diffusion"

    def __init__(self, *, model: str | None = None, steps: int = 2, **kw: Any) -> None:
        super().__init__(**kw)
        self._model_id = model or _DEFAULT_MODEL
        self._steps = steps
        self._pipe = None  # lazily loaded diffusion pipeline

    # ── the SyncProvider contract ────────────────────────────────────────────
    def generate(self, step, config=None):  # noqa: ANN001
        illustration = self._illustration(step.prompt or "", seed=_seed(step.prompt or ""))

        paper = (step.metadata or {}).get("newspaper", {})
        png = compose_front_page(
            illustration,
            masthead=paper.get("masthead", "The Chronicle"),
            headline=paper.get("headline", "The month in policy"),
            subhead=paper.get("subhead", ""),
            dateline=paper.get("dateline", ""),
        )

        path = _write_temp(png)
        step.assets.append(Asset(
            url=f"file://{path}",
            media_type="image/png",
            sha256=hashlib.sha256(png).hexdigest(),
            size_bytes=len(png),
            width=1024,
            height=1365,
        ))
        return step

    # ── illustration backends ────────────────────────────────────────────────
    def _illustration(self, prompt: str, *, seed: int):
        from PIL import Image

        if _stub_mode():
            return _placeholder_illustration(prompt, seed)

        pipe = self._load_pipe()
        import torch

        gen = torch.Generator(device=pipe.device).manual_seed(seed)
        # SDXL-Turbo: guidance_scale must be 0, very few steps.
        image: Image.Image = pipe(
            prompt=prompt,
            num_inference_steps=max(1, self._steps),
            guidance_scale=0.0,
            generator=gen,
        ).images[0]
        return image

    def _load_pipe(self):
        if self._pipe is not None:
            return self._pipe
        import torch
        from diffusers import AutoPipelineForText2Image

        device = "mps" if torch.backends.mps.is_available() else ("cuda" if torch.cuda.is_available() else "cpu")
        dtype = torch.float16 if device in ("mps", "cuda") else torch.float32
        pipe = AutoPipelineForText2Image.from_pretrained(self._model_id, torch_dtype=dtype)
        pipe = pipe.to(device)
        pipe.set_progress_bar_config(disable=True)
        self._pipe = pipe
        return pipe


def _seed(text: str) -> int:
    return int(hashlib.sha256(text.encode()).hexdigest()[:8], 16)


def _write_temp(png: bytes) -> str:
    fd, path = tempfile.mkstemp(suffix=".png", prefix="rs-frontpage-")
    with os.fdopen(fd, "wb") as fh:
        fh.write(png)
    return path


def _placeholder_illustration(prompt: str, seed: int):
    """Deterministic non-ML illustration — a stylised abstract for tests / no-torch."""
    from PIL import Image, ImageDraw
    import random

    rng = random.Random(seed)
    w, h = 768, 512
    top = (rng.randint(60, 120), rng.randint(90, 150), rng.randint(120, 180))
    img = Image.new("RGB", (w, h), top)
    d = ImageDraw.Draw(img, "RGBA")
    for _ in range(40):
        x, y = rng.randint(0, w), rng.randint(0, h)
        r = rng.randint(30, 160)
        d.ellipse([x - r, y - r, x + r, y + r],
                  fill=(rng.randint(40, 220), rng.randint(40, 200), rng.randint(60, 200), 40))
    _ = io.BytesIO  # keep import used
    return img
