"""Generate an equirectangular illustrated Earth texture for the Cesium globe.

Flat-shaded cartoon look: teal ocean, latitude-banded land palette, light clouds.
Served as a Cesium SingleTileImageryProvider, so the globe needs no tile server
and no Cesium Ion token.
"""
import json
import os
import random
from PIL import Image, ImageDraw, ImageFilter

W, H = 4096, 2048
OCEAN = (54, 158, 176)
OCEAN_DEEP = (38, 128, 148)
SHORE = (30, 112, 132)

# abs(latitude) -> land colour. Real biome banding is also what reads as
# "cartoon Earth": tropical greens, desert belt, temperate greens, boreal
# yellows, ice caps.
STOPS = [
    (0,  (86, 156, 70)),
    (12, (104, 168, 74)),
    (20, (216, 152, 74)),
    (28, (226, 190, 92)),
    (38, (170, 186, 88)),
    (48, (138, 172, 82)),
    (58, (206, 198, 112)),
    (68, (188, 200, 168)),
    (74, (232, 240, 240)),
    (90, (246, 250, 250)),
]


def band_color(abs_lat):
    for i in range(len(STOPS) - 1):
        a, ca = STOPS[i]
        b, cb = STOPS[i + 1]
        if a <= abs_lat <= b:
            t = (abs_lat - a) / (b - a)
            return tuple(round(ca[j] + (cb[j] - ca[j]) * t) for j in range(3))
    return STOPS[-1][1]


def load_rings(path, obj):
    t = json.load(open(path))
    tr = t["transform"]
    sx, sy = tr["scale"]
    tx, ty = tr["translate"]
    arcs = t["arcs"]

    def decode(i):
        rev = i < 0
        if rev:
            i = ~i
        x = y = 0
        pts = []
        for dx, dy in arcs[i]:
            x += dx
            y += dy
            pts.append((x * sx + tx, y * sy + ty))
        return pts[::-1] if rev else pts

    def ring(arc_list):
        out = []
        for a in arc_list:
            out.extend(decode(a))
        return out

    geom = t["objects"][obj]
    rings = []
    for g in geom.get("geometries", [geom]):
        if g["type"] == "Polygon":
            rings.extend(ring(r) for r in g["arcs"])
        elif g["type"] == "MultiPolygon":
            for poly in g["arcs"]:
                rings.extend(ring(r) for r in poly)
    return rings


def unwrap(ring):
    """Make longitudes continuous.

    A ring crossing the antimeridian has consecutive points jumping from ~+180
    to ~-180. Drawn as-is that smears a band right across the map. Removing the
    jumps lets the ring extend past +/-180 instead, and drawing it at three
    horizontal offsets renders the wrap correctly.
    """
    out = [(ring[0][0], ring[0][1])]
    for lon, lat in ring[1:]:
        prev = out[-1][0]
        while lon - prev > 180:
            lon -= 360
        while lon - prev < -180:
            lon += 360
        out.append((lon, lat))
    return out


def build_mask(rings):
    mask = Image.new("L", (W, H), 0)
    d = ImageDraw.Draw(mask)
    for r in rings:
        if len(r) < 3:
            continue
        u = unwrap(r)
        pts = [((lon + 180.0) / 360.0 * W, (90.0 - lat) / 180.0 * H) for lon, lat in u]
        for dx in (-W, 0, W):
            d.polygon([(x + dx, y) for x, y in pts], fill=255)
    return mask


def vertical_ramp(fn):
    col = Image.new("RGB", (1, H))
    p = col.load()
    for y in range(H):
        lat = 90.0 - (y + 0.5) / H * 180.0
        p[0, y] = fn(lat)
    return col.resize((W, H), Image.NEAREST)


def main():
    rings = load_rings("land50.json", "land")
    print(f"land rings: {len(rings)}")

    mask = build_mask(rings)

    bands = vertical_ramp(lambda lat: band_color(abs(lat)))

    def ocean_at(lat):
        t = min(1.0, abs(lat) / 90.0) * 0.5
        return tuple(round(OCEAN[j] + (OCEAN_DEEP[j] - OCEAN[j]) * t) for j in range(3))

    earth = Image.composite(bands, vertical_ramp(ocean_at), mask)

    # Shoreline: a deeper teal ring just outside land, for definition without
    # drawing political borders.
    grown = mask.filter(ImageFilter.MaxFilter(5))
    shore_band = Image.eval(grown, lambda v: v).point(lambda v: 255 if v > 127 else 0)
    shore_band = Image.composite(Image.new("L", (W, H), 0), shore_band, mask)
    earth = Image.composite(
        Image.new("RGB", (W, H), SHORE),
        earth,
        shore_band.filter(ImageFilter.GaussianBlur(1)),
    )

    # Clouds: sparse and soft. Heavy cover buries the land and the choropleth
    # overlay that sits on top of it.
    random.seed(11)
    clouds = Image.new("L", (W, H), 0)
    cd = ImageDraw.Draw(clouds)
    for _ in range(70):
        cy = H * random.choice([0.20, 0.34, 0.50, 0.66, 0.80]) + random.uniform(-40, 40)
        cx = random.uniform(0, W)
        for _ in range(random.randint(3, 6)):
            ox, oy = random.uniform(-140, 140), random.uniform(-26, 26)
            rx, ry = random.uniform(50, 120), random.uniform(14, 30)
            cd.ellipse([cx + ox - rx, cy + oy - ry, cx + ox + rx, cy + oy + ry], fill=110)
    clouds = clouds.filter(ImageFilter.GaussianBlur(14))
    earth = Image.composite(Image.new("RGB", (W, H), (255, 255, 255)), earth, clouds)

    out = "earth-cartoon.png"
    earth.save(out, optimize=True)
    print(f"wrote {out}  {W}x{H}  {os.path.getsize(out)/1024:.0f} KB")


if __name__ == "__main__":
    main()
