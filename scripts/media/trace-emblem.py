"""One-time: redraws the round OSCUR emblem (WordPress's icon.png, 600x600) as SVG, in a version for each theme.

The ring, arrowhead and dot are drawn from measured geometry. The skyline's three grays are traced from the image:
upsampled 3x, the pixels inside areas of one pure gray seed their regions, antialiased pixels join the nearest
seed, and each region becomes polygons, simplified. The layers stack so that no seam shows: all the grays in the
lightest tone, then the two darker ones in the middle tone, then the darkest.

Writes, with the same shapes:
  site/public/media/brand/oscur-emblem.svg       for light backgrounds
  site/public/media/brand/oscur-emblem-dark.svg  for dark ones: the tones invert and the sky is the page
  site/public/favicon.svg                        light or dark with the browser's color scheme

Run from the repo root, after scripts/migrate/wp-export.mjs, with Python 3 and numpy, scipy, shapely and Pillow:
  python scripts/media/trace-emblem.py
"""
import math
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage
from shapely.geometry import Point, box
from shapely.ops import unary_union

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'migration/raw/uploads/2024/07/icon.png'
S = 3                                   # tracing scale
CX, CY = 299.5, 299.4                   # the ring's center and edges, fitted to the image
R_IN, R_OUT = 257.35, 281.85
R_MID, RING_W = (R_IN + R_OUT) / 2, R_OUT - R_IN
DOT = (568.0, 270.5, 25.0)              # where the ring starts
ARROW = 'M484 175.5 575 134 571 246Z'   # where it ends
LEVELS = [46, 116, 162, 255, 0]         # the skyline's grays, the white sky, the black ring

LIGHT = {'paper': '#ffffff', '1': '#a2a2a2', '2': '#747474', '3': '#2e2e2e', 'ink': '#000000'}
DARK = {'paper': 'none', '1': '#5d5d5d', '2': '#8b8b8b', '3': '#d1d1d1', 'ink': '#f2f2f2'}

img = Image.open(SRC).convert('LA')
big = img.resize((img.width * S, img.height * S), Image.BICUBIC)
lum = np.asarray(big, dtype=float)[..., 0]
yy, xx = np.mgrid[0:lum.shape[0], 0:lum.shape[1]]
inside = np.hypot((xx + 0.5) / S - CX, (yy + 0.5) / S - CY) < R_IN - 0.3

# An antialiased edge between black and white passes through every gray, so only pixels well inside an area of
# one level are seeds.
levels = np.array(LEVELS)
nearest = np.abs(lum[..., None] - levels[None, None, :]).argmin(axis=2)
seeds = np.zeros(lum.shape, bool)
for i, level in enumerate(levels):
    seeds |= ndimage.binary_erosion(np.abs(lum - level) < 8, iterations=2) & (nearest == i)
_, (iy, ix) = ndimage.distance_transform_edt(~seeds, return_indices=True)
cls = nearest[iy, ix]


def polygons(mask):
    """The union of a mask's pixels, in the image's pixel units."""
    boxes = []
    for y, row in enumerate(mask):
        if row.any():
            edges = np.flatnonzero(np.diff(np.r_[0, row.astype(np.int8), 0]))
            boxes += [box(x0 / S, y / S, x1 / S, (y + 1) / S) for x0, x1 in zip(edges[::2], edges[1::2])]
    return unary_union(boxes)


def under_ring(geom):
    """Extends a layer outward under the ring, so its edge never shows against the ring."""
    zone = Point(CX, CY).buffer(R_IN + 8, 32).difference(Point(CX, CY).buffer(R_IN + 0.3, 32))
    return geom.union(geom.buffer(4).intersection(zone))


def path(geom):
    geom = geom.simplify(0.35, preserve_topology=True)
    parts = []
    for poly in [geom] if geom.geom_type == 'Polygon' else geom.geoms:
        if poly.area >= 6:
            for ring in [poly.exterior, *poly.interiors]:
                parts.append('M' + ' '.join(f'{x:.1f} {y:.1f}' for x, y in list(ring.coords)[:-1]) + 'Z')
    return ''.join(parts)


light, mid, dark = (inside & (cls == LEVELS.index(level)) for level in (162, 116, 46))


def at(deg):
    t = math.radians(deg)
    return CX + R_MID * math.cos(t), CY - R_MID * math.sin(t)


# The ring runs clockwise from the dot round to the arrowhead, which hides its end.
x0, y0 = at(math.degrees(math.atan2(CY - DOT[1], DOT[0] - CX)))
x1, y1 = at(29.5)
shapes = f'''  <circle class="em-paper" cx="{CX}" cy="{CY}" r="{R_IN + 6:.1f}"/>
  <path class="em-1" d="{path(under_ring(polygons(light | mid | dark)))}"/>
  <path class="em-2" d="{path(under_ring(polygons(mid | dark)))}"/>
  <path class="em-3" d="{path(under_ring(polygons(dark)))}"/>
  <path class="em-ring" d="M{x0:.1f} {y0:.1f}A{R_MID:.1f} {R_MID:.1f} 0 1 1 {x1:.1f} {y1:.1f}" stroke-width="{RING_W:.1f}"/>
  <path class="em-ink" d="{ARROW}"/>
  <circle class="em-ink" cx="{DOT[0]}" cy="{DOT[1]}" r="{DOT[2]}"/>'''


def rules(colors, indent='    '):
    return '\n'.join(indent + rule for rule in [
        f'.em-paper {{ fill: {colors["paper"]}; }}',
        f'.em-1 {{ fill: {colors["1"]}; }}',
        f'.em-2 {{ fill: {colors["2"]}; }}',
        f'.em-3 {{ fill: {colors["3"]}; }}',
        f'.em-ink {{ fill: {colors["ink"]}; }}',
        f'.em-ring {{ fill: none; stroke: {colors["ink"]}; }}',
    ])


def svg(comment, style):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600">
  <!-- {comment} Made by scripts/media/trace-emblem.py. -->
  <style>
{style}
  </style>
{shapes}
</svg>
'''


files = {
    'site/public/media/brand/oscur-emblem.svg':
        svg('The OSCUR emblem, for light backgrounds (oscur-emblem-dark.svg is the dark version).', rules(LIGHT)),
    'site/public/media/brand/oscur-emblem-dark.svg':
        svg('The OSCUR emblem, for dark backgrounds (oscur-emblem.svg is the light version).', rules(DARK)),
    'site/public/favicon.svg':
        svg("The OSCUR emblem for browser tabs, light or dark with the browser's color scheme.",
            rules(LIGHT) + '\n    @media (prefers-color-scheme: dark) {\n' + rules(DARK, '      ') + '\n    }'),
}
for name, text in files.items():
    (ROOT / name).write_text(text, encoding='utf-8', newline='\n')
    print(f'{name}: {len(text)} bytes')
