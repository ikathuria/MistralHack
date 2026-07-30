"""Visible synthetic-content watermark.

One of the two required synthetic-media markings (the other is the machine-
readable Genblaze manifest). Composited onto the image bytes after generation so
it is provider-independent and cannot be omitted per-provider — the pipeline
routes every generated image through here before upload.

Deliberately not a prompt instruction: asking the model to draw a watermark is
unreliable and easy to crop. This burns it into the pixels.
"""
from __future__ import annotations

import io

from PIL import Image, ImageDraw, ImageFont

_LABEL = "AI-GENERATED · RealityShift"


def apply_watermark(image_bytes: bytes, label: str = _LABEL) -> bytes:
    """Return PNG bytes with a synthetic-content banner along the bottom edge."""
    img = Image.open(io.BytesIO(image_bytes)).convert("RGBA")
    w, h = img.size

    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    band_h = max(24, h // 22)
    draw.rectangle([0, h - band_h, w, h], fill=(10, 10, 16, 200))

    font = _font(max(12, band_h // 2))
    bbox = draw.textbbox((0, 0), label, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    tx = (w - tw) / 2
    ty = h - band_h + (band_h - th) / 2 - bbox[1]
    draw.text((tx, ty), label, fill=(255, 255, 255, 235), font=font)

    out = Image.alpha_composite(img, overlay).convert("RGB")
    buf = io.BytesIO()
    out.save(buf, format="PNG", optimize=True)
    return buf.getvalue()


def _font(size: int) -> ImageFont.ImageFont:
    for path in (
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    ):
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default()
