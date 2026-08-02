"""Compose a newspaper front page around a generated illustration.

Diffusion models cannot render legible headline text, so the front page is a
deterministic PIL layout — masthead, dated header, real headline from the
divergence brief, column rules — with the AI-generated illustration placed below
the fold. This gives crisp, correct front pages while the genuinely generative
part (the illustration) stays generated.

The synthetic-content watermark is burned in here too, so every front page
carries it regardless of how the illustration was produced.
"""
from __future__ import annotations

import io

from PIL import Image, ImageDraw, ImageFont

W, H = 1024, 1365  # 3:4 portrait
PAPER = (238, 234, 224)
INK = (26, 24, 20)
RULE = (60, 54, 46)
MUTED = (120, 112, 100)
WATERMARK = "AI-GENERATED · RealityShift"


def compose_front_page(
    illustration: Image.Image,
    *,
    masthead: str,
    headline: str,
    subhead: str = "",
    dateline: str = "",
) -> bytes:
    """Return PNG bytes of the composed front page."""
    page = Image.new("RGB", (W, H), PAPER)
    d = ImageDraw.Draw(page)
    margin = 56

    f_masthead = _font(64, bold=True, serif=True)
    f_date = _font(20, serif=True)
    f_head = _font(58, bold=True, serif=True)
    f_sub = _font(28, serif=True)
    f_body = _font(15, serif=True)

    y = 44
    _centered(d, masthead, f_masthead, y, INK)
    y += 78
    d.line([(margin, y), (W - margin, y)], fill=RULE, width=3)
    y += 8
    _centered(d, dateline or "An edition from a world that doesn't exist", f_date, y, MUTED)
    y += 34
    d.line([(margin, y), (W - margin, y)], fill=RULE, width=1)
    y += 26

    # Headline (wrapped)
    y = _wrapped(d, headline, f_head, margin, y, W - 2 * margin, INK, leading=6)
    if subhead:
        y += 6
        y = _wrapped(d, subhead, f_sub, margin, y, W - 2 * margin, MUTED, leading=4)
    y += 18

    # Illustration below the fold, framed.
    ill_h = 520
    ill = _fit(illustration, W - 2 * margin, ill_h)
    ix = (W - ill.width) // 2
    page.paste(ill, (ix, y))
    d.rectangle([ix - 1, y - 1, ix + ill.width, y + ill.height], outline=RULE, width=2)
    y += ill.height + 22

    # Two columns of placeholder body text (no legible copy — it's a prop).
    _placeholder_columns(d, margin, y, W - margin, H - 90, f_body)

    # Synthetic-content watermark band.
    _watermark(page)

    buf = io.BytesIO()
    page.save(buf, format="PNG", optimize=True)
    return buf.getvalue()


def _centered(d, text, font, y, fill):
    w = d.textbbox((0, 0), text, font=font)[2]
    d.text(((W - w) / 2, y), text, font=font, fill=fill)


def _wrapped(d, text, font, x, y, max_w, fill, leading=4):
    words = text.split()
    line = ""
    lh = d.textbbox((0, 0), "Ag", font=font)[3] + leading
    for word in words:
        trial = f"{line} {word}".strip()
        if d.textbbox((0, 0), trial, font=font)[2] <= max_w:
            line = trial
        else:
            d.text((x, y), line, font=font, fill=fill)
            y += lh
            line = word
    if line:
        d.text((x, y), line, font=font, fill=fill)
        y += lh
    return y


def _placeholder_columns(d, x0, y0, x1, y1, font):
    col_gap = 28
    col_w = (x1 - x0 - col_gap) // 2
    lh = d.textbbox((0, 0), "Ag", font=font)[3] + 5
    import random
    rng = random.Random(len(str(y0)))
    for cx in (x0, x0 + col_w + col_gap):
        y = y0
        while y < y1 - lh:
            w = int(col_w * rng.uniform(0.7, 1.0)) if y + 2 * lh < y1 else int(col_w * rng.uniform(0.3, 0.6))
            d.line([(cx, y + lh // 2), (cx + w, y + lh // 2)], fill=(150, 143, 130), width=2)
            y += lh
        d.line([(cx + col_w + col_gap // 2, y0), (cx + col_w + col_gap // 2, y1)], fill=(200, 194, 182), width=1)


def _watermark(page: Image.Image):
    w, h = page.size
    band = max(28, h // 34)
    overlay = Image.new("RGBA", page.size, (0, 0, 0, 0))
    dd = ImageDraw.Draw(overlay)
    dd.rectangle([0, h - band, w, h], fill=(12, 12, 18, 210))
    font = _font(max(13, band // 2), bold=True)
    bbox = dd.textbbox((0, 0), WATERMARK, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    dd.text(((w - tw) / 2, h - band + (band - th) / 2 - bbox[1]), WATERMARK, font=font, fill=(255, 255, 255, 235))
    page.paste(Image.alpha_composite(page.convert("RGBA"), overlay).convert("RGB"), (0, 0))


def _fit(img: Image.Image, max_w: int, max_h: int) -> Image.Image:
    img = img.convert("RGB")
    scale = min(max_w / img.width, max_h / img.height)
    return img.resize((max(1, int(img.width * scale)), max(1, int(img.height * scale))), Image.LANCZOS)


def _font(size: int, *, bold: bool = False, serif: bool = False) -> ImageFont.ImageFont:
    candidates = []
    if serif:
        candidates += [
            "/System/Library/Fonts/Supplemental/Georgia Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Georgia.ttf",
            "/System/Library/Fonts/Supplemental/Times New Roman Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Times New Roman.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf",
        ]
    candidates += [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]
    for path in candidates:
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default()
