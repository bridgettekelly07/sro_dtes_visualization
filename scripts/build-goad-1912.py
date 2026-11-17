"""
Every building in the DTES in 1912, read from Goad's atlas by colour.

  Goad's Fire Insurance Map 1912 (georectified). Chas. E. Goad, 1912; digitized, georectified and
  mosaicked by the City of Vancouver Archives and GIS team. City of Vancouver Open Data, public domain.
  https://opendata.vancouver.ca/explore/dataset/goads-fire-insurance-map-1912-georectified/
  Served as map tiles at maps.vancouver.ca (Hosted/1912GoadsFireInsuranceMap/MapServer), which
  carry their own coordinates, so no hand fitting is needed.

The atlas colours buildings by material: pink for brick, yellow for frame (wood). Each tile is read
at 4 x 4 pixels a cell (about 1.6 m on the ground); a cell is brick or frame if most of it is that
colour. Joined cells of one material make one footprint, traced round its edge and simplified. Lines
drawn between neighbouring buildings usually split them apart, but not always: a run of party-walled
shops can come out as one footprint. Small pieces (under about 34 m2) and slivers thinner than about 3.4 m (lines and lettering) are
dropped, and each outline is simplified to within about 2.5 m, so the cells' stair-steps do not show. The colours
alone say nothing of height or use.

Usage: python3 scripts/build-goad-1912.py <tile cache folder> src/lib/data/goad1912.json
"""
import json
import math
import os
import struct
import subprocess
import sys
import time
import urllib.request

TILE = 'https://maps.vancouver.ca/server/rest/services/Hosted/1912GoadsFireInsuranceMap/MapServer/tile/{z}/{y}/{x}'
Z = 18
W, E, S, N = -123.1360, -123.0700, 49.2660, 49.2930
CELL = 4          # pixels a cell
MIN_CELLS = 14     # about 34 m2
MIN_WIDTH = 2.2    # cells (about 3.4 m): thinner pieces are lines and lettering, not buildings


def tx(lon):
    return (lon + 180) / 360 * 2 ** Z


def ty(lat):
    r = math.radians(lat)
    return (1 - math.log(math.tan(r) + 1 / math.cos(r)) / math.pi) / 2 * 2 ** Z


def lon_of(px):
    return px / 256 / 2 ** Z * 360 - 180


def lat_of(py):
    n = math.pi - 2 * math.pi * py / 256 / 2 ** Z
    return math.degrees(math.atan(math.sinh(n)))


def bmp_pixels(path):
    data = open(path, 'rb').read()
    off, = struct.unpack_from('<I', data, 10)
    w, h = struct.unpack_from('<ii', data, 18)
    bpp, = struct.unpack_from('<H', data, 28)
    step = bpp // 8
    stride = (w * step + 3) & ~3
    top_down = h < 0
    h = abs(h)

    def px(x, y):
        row = y if top_down else h - 1 - y
        i = off + row * stride + x * step
        return data[i + 2], data[i + 1], data[i]   # BGR(A)
    return w, h, px


def material(r, g, b):
    if r < 190:
        return 0
    if g > 170 and g - b >= 35 and r - g < 40:
        return 2   # frame, yellow
    if r - g >= 18 and r - b >= 8:
        return 1   # brick, pink
    return 0


def simplify(pts, tol):
    """Douglas-Peucker on a closed ring of (x, y) cell corners, tolerance in cells."""
    if len(pts) < 5:
        return pts
    # split the ring at its two farthest points and simplify each half as an open line
    a = 0
    b = max(range(len(pts)), key=lambda k: (pts[k][0] - pts[0][0]) ** 2 + (pts[k][1] - pts[0][1]) ** 2)

    def dp(line):
        if len(line) < 3:
            return line
        (x1, y1), (x2, y2) = line[0], line[-1]
        dx, dy = x2 - x1, y2 - y1
        length = math.hypot(dx, dy) or 1
        far, k = 0, 0
        for i in range(1, len(line) - 1):
            d = abs(dy * (line[i][0] - x1) - dx * (line[i][1] - y1)) / length
            if d > far:
                far, k = d, i
        if far <= tol:
            return [line[0], line[-1]]
        return dp(line[:k + 1])[:-1] + dp(line[k:])
    first = dp(pts[a:b + 1])
    second = dp(pts[b:] + pts[:1])
    return first[:-1] + second[:-1]


def main(cache, out):
    os.makedirs(cache, exist_ok=True)
    X0, X1, Y0, Y1 = int(tx(W)), int(tx(E)), int(ty(N)), int(ty(S))
    per = 256 // CELL
    cols, rows = (X1 - X0 + 1) * per, (Y1 - Y0 + 1) * per
    grid = bytearray(cols * rows)
    for y in range(Y0, Y1 + 1):
        for x in range(X0, X1 + 1):
            jpg = os.path.join(cache, f'{Z}_{y}_{x}.jpg')
            bmp = jpg[:-4] + '.bmp'
            if not os.path.exists(jpg):
                req = urllib.request.Request(TILE.format(z=Z, y=y, x=x), headers={'User-Agent': 'research-map/0.1'})
                open(jpg, 'wb').write(urllib.request.urlopen(req, timeout=30).read())
                time.sleep(0.05)
            if not os.path.exists(bmp):
                subprocess.run(['sips', '-s', 'format', 'bmp', jpg, '--out', bmp], check=True, capture_output=True)
            w, h, px = bmp_pixels(bmp)
            for cy in range(per):
                for cx in range(per):
                    n = [0, 0, 0]
                    for oy in range(0, CELL, 2):
                        for ox in range(0, CELL, 2):
                            n[material(*px(cx * CELL + ox, cy * CELL + oy))] += 1
                    v = 1 if n[1] * 2 >= sum(n) else 2 if n[2] * 2 >= sum(n) else 0
                    grid[((y - Y0) * per + cy) * cols + (x - X0) * per + cx] = v
    print(f'{(X1 - X0 + 1) * (Y1 - Y0 + 1)} tiles read')

    # joined cells of one material, each traced round its outer edge
    seen = bytearray(cols * rows)
    out_rings = {1: [], 2: []}
    for start in range(cols * rows):
        v = grid[start]
        if not v or seen[start]:
            continue
        stack, cells = [start], []
        seen[start] = 1
        while stack:
            i = stack.pop()
            cells.append(i)
            cx, cy = i % cols, i // cols
            for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                if 0 <= nx < cols and 0 <= ny < rows:
                    j = ny * cols + nx
                    if grid[j] == v and not seen[j]:
                        seen[j] = 1
                        stack.append(j)
        if len(cells) < MIN_CELLS:
            continue
        inside = set(cells)
        # boundary edges, each directed so the inside is on the left; corners are cell-grid points
        nxt = {}
        for i in cells:
            cx, cy = i % cols, i // cols
            if cy == 0 or (i - cols) not in inside:
                nxt[(cx, cy)] = (cx + 1, cy)
            if cx == cols - 1 or (i + 1) not in inside:
                nxt.setdefault((cx + 1, cy), (cx + 1, cy + 1))
            if cy == rows - 1 or (i + cols) not in inside:
                nxt.setdefault((cx + 1, cy + 1), (cx, cy + 1))
            if cx == 0 or (i - 1) not in inside:
                nxt.setdefault((cx, cy + 1), (cx, cy))
        # the longest loop is the outer edge
        best = []
        used = set()
        for a in list(nxt):
            if a in used:
                continue
            loop, p = [], a
            while p not in used and p in nxt:
                used.add(p)
                loop.append(p)
                p = nxt[p]
            if len(loop) > len(best):
                best = loop
        # keep the corners only
        corners = [p for k, p in enumerate(best)
                   if (best[k - 1][0] - p[0], best[k - 1][1] - p[1]) != (p[0] - best[(k + 1) % len(best)][0], p[1] - best[(k + 1) % len(best)][1])]
        corners = simplify(corners, 1.6)
        if len(corners) < 3:
            continue
        # drop slivers: a footprint's mean width is about twice its area over its perimeter
        area = abs(sum(corners[k][0] * corners[(k + 1) % len(corners)][1] - corners[(k + 1) % len(corners)][0] * corners[k][1] for k in range(len(corners)))) / 2
        perim = sum(math.dist(corners[k], corners[(k + 1) % len(corners)]) for k in range(len(corners)))
        if area < MIN_CELLS or 2 * area / (perim or 1) < MIN_WIDTH / 2:
            continue
        ring = [[round(lon_of(X0 * 256 + qx * CELL), 6), round(lat_of(Y0 * 256 + qy * CELL), 6)] for qx, qy in corners]
        ring.append(ring[0])
        out_rings[v].append(ring)
    json.dump({
        'source': "Goad's Fire Insurance Map 1912 (georectified), City of Vancouver Open Data, public domain; read by colour from the City's map tiles. Made by scripts/build-goad-1912.py.",
        'brick': out_rings[1],
        'frame': out_rings[2],
    }, open(out, 'w'))
    print(f"{len(out_rings[1])} brick and {len(out_rings[2])} frame footprints")


main(sys.argv[1], sys.argv[2])
