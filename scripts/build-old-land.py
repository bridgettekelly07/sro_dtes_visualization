"""Re-cut the map's land and water to the shoreline of the 1880s.

The map knows land from water through a mask of 6 m cells (dtes-terrain.json, "land"), which is today's
shore. This script produces the same mask for the 1880s, so the early chapters show water where the
city has since filled it in.

Method: for every cell that is land today and lies within REACH_M of the old shoreline (Lesack and
Proctor, "Vancouver's Old Streams, 1880-1920", doc.kml from OldStreamsPolylineGoogleEarth.kmz), find
the nearest point on that shoreline and ask which side of it the cell is on. A cell on the water side
was water in the 1880s and has been filled since; it becomes water. A cell on the land side stays.

Which side of each shoreline piece is the water side is worked out from today's mask: fill only ever
pushed the water outward, so today's water always lies on the old water side.

The old shoreline comes in separate pieces with gaps between them. A cell whose nearest point is the
loose end of a piece is left as it is today, since there is no shoreline there to judge it by.

Land that existed in the 1880s but is water today (little or none here) is not restored.

Any further files named on the command line are polygons of ground to add back as land, where a plan of the
time shows land that the old shoreline dataset does not. The Hastings Mill site is one: its outline is the
1889 plan's dry ground (public/data/district/mill-site-land.json), leaving out the wharf, the pier and the corner
that plan marks as still being filled. The 1885 fire insurance map's inset of the mill agrees: it draws the yard,
store, boarding house and dwellings on land, with the mill at the water's edge.

Current build:
  SURVEY=public/data/district/shore-1870-granville.json python3 scripts/build-old-land.py \
      public/data/district/dtes-terrain.json <doc.kml> public/data/district/land-1880s.json <preview.png> \
      public/data/district/mill-site-land.json

A surveyed shoreline can replace the dataset's along a stretch: set SURVEY to a JSON file of {"lines": [[[lon,
lat], ...]]}, each line west to east. Where a dataset piece runs within SURVEY_M of a surveyed line and inside
its span of longitude, those points are swapped for the surveyed ones, so the piece stays whole. Used for
Granville, where the 1870 government plan draws the high-water line (public/data/district/shore-1870-granville.json).

Usage:
  python3 scripts/build-old-land.py public/data/district/dtes-terrain.json <doc.kml> \\
      public/data/district/land-1880s.json <preview.png> [public/data/district/mill-site-land.json ...]
"""
import json
import math
import os
import re
import struct
import sys
import zlib
from collections import deque

REACH_M = 600    # only land this close to the old shoreline is judged
END_GUARD = 45   # samples (about 270 m) at a loose end of a shoreline piece that judge nothing


SURVEY_M = 80   # how near a dataset piece must run to a surveyed line for it to be replaced


def splice(raw, s_line):
    """The piece with its points along the surveyed line's stretch swapped for the surveyed points."""
    lo, hi = s_line[0][0], s_line[-1][0]
    kx = 111_320 * math.cos(math.radians(s_line[0][1]))
    def near(p):
        best = min(math.hypot((p[0] - q[0]) * kx, (p[1] - q[1]) * 111_200) for q in s_line)
        return best < SURVEY_M
    hits = [i for i, p in enumerate(raw) if lo <= p[0] <= hi and near(p)]
    if len(hits) < 2:
        return raw
    a, b = hits[0], hits[-1]
    eastward = raw[b][0] > raw[a][0]
    middle = [tuple(q) for q in (s_line if eastward else s_line[::-1])]
    print(f"  spliced {b - a + 1} dataset points for {len(middle)} surveyed ones")
    return raw[:a] + middle + raw[b + 1:]


def main(terrain_path, kml_path, out_path, preview_path=None, *extra_land):
    t = json.load(open(terrain_path))
    m = t["land"]
    nx, ny, cell = m["nx"], m["ny"], m["cell"]
    lon0, lat0, lon1, lat1 = t["bbox"]

    # today's mask, row 0 at the south edge as in the file
    land = [bytearray(nx) for _ in range(ny)]
    for j, runs in enumerate(m["rows"]):
        x, on = 0, False
        for n in runs:
            if on:
                for i in range(x, min(nx, x + n)):
                    land[j][i] = 1
            x += n
            on = not on

    def cell_of(lon, lat):
        return ((lon - lon0) / (lon1 - lon0) * nx, (lat - lat0) / (lat1 - lat0) * ny)

    # the old shoreline, every piece, as cell coordinates
    text = open(kml_path, encoding="utf-8", errors="replace").read()
    survey = json.load(open(os.environ["SURVEY"]))["lines"] if os.environ.get("SURVEY") else []
    lines = []
    for placemark in re.findall(r"<Placemark[^>]*>(.*?)</Placemark>", text, flags=re.S):
        kind = re.search(r"<td>Type</td>\s*<td>([^<]*)</td>", placemark)
        if not kind or kind.group(1).strip() != "Shoreline":
            continue
        for coords in re.findall(r"<coordinates>(.*?)</coordinates>", placemark, flags=re.S):
            raw = [tuple(map(float, tok.split(",")[:2])) for tok in coords.split()]
            for s_line in survey:
                raw = splice(raw, s_line)
            pts = [cell_of(*p) for p in raw]
            if len(pts) > 1:
                lines.append(pts)

    inside = lambda i, j: 0 <= i < nx and 0 <= j < ny

    # every piece resampled to about one point per cell, each with the direction the line runs there
    samples = []   # (x, y, tx, ty, piece, at a loose end)
    piece_points = []
    for k, line in enumerate(lines):
        pts = []
        for (x0, y0), (x1, y1) in zip(line, line[1:]):
            n = max(1, int(math.dist((x0, y0), (x1, y1))))
            pts += [(x0 + (x1 - x0) * s / n, y0 + (y1 - y0) * s / n) for s in range(n)]
        pts.append(line[-1])
        piece_points.append(pts)

    # which side is water, per piece: count today's water to the left and to the right of the line
    water_side = []
    for k, pts in enumerate(piece_points):
        left = right = 0
        for q in range(2, len(pts) - 2, 3):
            tx, ty = pts[q + 2][0] - pts[q - 2][0], pts[q + 2][1] - pts[q - 2][1]
            length = math.hypot(tx, ty) or 1
            nxn, nyn = -ty / length, tx / length   # the left of the direction of travel
            for off in (5, 10, 20, 40, 60, 80):
                for sign in (1, -1):
                    i, j = int(pts[q][0] + sign * nxn * off), int(pts[q][1] + sign * nyn * off)
                    if inside(i, j) and not land[j][i]:
                        if sign > 0:
                            left += 1
                        else:
                            right += 1
        water_side.append(1 if left >= right else -1)
        print(f"  piece {k}: {len(pts)} points, water to the {'left' if left >= right else 'right'} ({left} against {right})")

    for k, pts in enumerate(piece_points):
        for q, (x, y) in enumerate(pts):
            a, b = pts[max(0, q - 2)], pts[min(len(pts) - 1, q + 2)]
            length = math.dist(a, b) or 1
            loose = q < END_GUARD or q >= len(pts) - END_GUARD
            samples.append((x, y, (b[0] - a[0]) / length, (b[1] - a[1]) / length, k, loose))

    # spread outward from the shoreline, so every cell within reach knows its nearest shoreline point
    reach = int(REACH_M / cell)
    owner = [[-1] * nx for _ in range(ny)]
    wall = [bytearray(nx) for _ in range(ny)]
    queue = deque()
    for idx, (x, y, *_rest) in enumerate(samples):
        i, j = int(x), int(y)
        if inside(i, j) and owner[j][i] < 0:
            owner[j][i] = idx
            wall[j][i] = 1
            queue.append((i, j, 0))
    while queue:
        i, j, d = queue.popleft()
        if d >= reach:
            continue
        for di, dj in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (1, -1), (-1, 1), (-1, -1)):
            a, b = i + di, j + dj
            if inside(a, b) and owner[b][a] < 0:
                owner[b][a] = owner[j][i]
                queue.append((a, b, d + 1))

    # judge every cell of today's land that the shoreline reaches
    water = [bytearray(1 - v for v in row) for row in land]
    flooded = 0
    for j in range(ny):
        for i in range(nx):
            idx = owner[j][i]
            if idx < 0 or not land[j][i]:
                continue
            x, y, tx, ty, k, loose = samples[idx]
            if loose:
                continue
            side = tx * (j + 0.5 - y) - ty * (i + 0.5 - x)   # positive to the left of the line
            if side * water_side[k] > 0:
                water[j][i] = 1
                flooded += 1
    print(f"{len(lines)} shoreline pieces; {flooded} cells of today's land become water: {flooded * cell * cell / 1e6:.2f} square km")

    # ground that a plan of the time shows as land, added on top (see scripts/build-mill-site.py)
    for extra in extra_land:
        added = 0
        for ring in json.load(open(extra))["polygons"]:
            cells = [cell_of(lon, lat) for lon, lat in ring]
            for j in range(max(0, int(min(c[1] for c in cells))), min(ny, int(max(c[1] for c in cells)) + 1)):
                for i in range(max(0, int(min(c[0] for c in cells))), min(nx, int(max(c[0] for c in cells)) + 1)):
                    x, y, inside_ring = i + 0.5, j + 0.5, False
                    for (x1, y1), (x2, y2) in zip(cells, cells[1:] + cells[:1]):   # ray casting
                        if (y1 > y) != (y2 > y) and x < x1 + (y - y1) * (x2 - x1) / (y2 - y1):
                            inside_ring = not inside_ring
                    if inside_ring and water[j][i]:
                        water[j][i] = 0
                        added += 1
        print(f"{extra}: {added} cells of water become land again: {added * cell * cell / 1e4:.1f} hectares")

    rows = []
    for j in range(ny):
        runs, on, count = [], False, 0   # runs alternate water, land, water... starting with water
        for i in range(nx):
            is_land = not water[j][i]
            if is_land == on:
                count += 1
            else:
                runs.append(count)
                on, count = is_land, 1
        runs.append(count)
        rows.append(runs)
    out = {
        "cell": cell, "nx": nx, "ny": ny, "rows": rows,
        "note": "Land in the 1880s: today's mask with the fill removed, cut to the original shoreline "
                "of Lesack and Proctor, Vancouver's Old Streams, 1880-1920 (doi:10.5683/SP2/UEJGTV, CC0). "
                "Ground shown as land on plans of the time is added. Made by scripts/build-old-land.py.",
    }
    json.dump(out, open(out_path, "w"), separators=(",", ":"))

    if preview_path:
        # grey: land then and now; white: water then and now; mid: land today that was water; black: the old shoreline
        raw = bytearray()
        for j in range(ny - 1, -1, -1):
            raw.append(0)
            for i in range(nx):
                raw.append(0 if wall[j][i] else (150 if land[j][i] and not water[j][i] else 205 if land[j][i] else 255))
        def chunk(tag, data):
            return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xffffffff)
        png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", nx, ny, 8, 0, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(bytes(raw), 6)) + chunk(b"IEND", b"")
        open(preview_path, "wb").write(png)


if __name__ == "__main__":
    main(*sys.argv[1:])
