"""
The shoreline of 1912, read from Goad's atlas, as a land mask like land-1880s.json.

Goad's 1912 atlas (see build-goad-1912.py) washes the water along every shore and pier in pale blue,
and draws the high-water line as a solid line on the land side of that wash. Fill only ever moved the
shore outward, so the 1912 land is the 1880s land plus whatever 1880s water had become land by 1912.

Method, on the 1880s water only (the atlas's ink lines are thin, so every pixel is checked and a cell
counts as open only if it is pale all through): starting from points of open water in Burrard Inlet and False Creek,
spread through pale pixels (white or the blue wash) and stop at the atlas's ink. What the spread reaches
was still water in 1912; 1880s water it does not reach had been filled. Ground narrower than about 20 m is left as water,
so the atlas's water-lot lines and the narrow piers on piles are not counted as land.

Usage: python3 scripts/build-shore-1912.py <tile cache folder> public/data/district/land-1912.json <preview.png>
"""
import json
import math
import os
import struct
import subprocess
import sys
import time
import urllib.request
from collections import deque

TILE = 'https://maps.vancouver.ca/server/rest/services/Hosted/1912GoadsFireInsuranceMap/MapServer/tile/{z}/{y}/{x}'
Z = 18
W, E, S, N = -123.1380, -123.0680, 49.2650, 49.2940
CELL = 4
SEEDS = [(-123.1000, 49.2905), (-123.0880, 49.2895), (-123.1100, 49.2905), (-123.0950, 49.2700), (-123.1040, 49.2725)]


def tx(lon): return (lon + 180) / 360 * 2 ** Z
def ty(lat):
    r = math.radians(lat)
    return (1 - math.log(math.tan(r) + 1 / math.cos(r)) / math.pi) / 2 * 2 ** Z
def lon_of(px): return px / 256 / 2 ** Z * 360 - 180
def lat_of(py): return math.degrees(math.atan(math.sinh(math.pi - 2 * math.pi * py / 256 / 2 ** Z)))


def bmp_pixels(path):
    data = open(path, 'rb').read()
    off, = struct.unpack_from('<I', data, 10)
    w, h = struct.unpack_from('<ii', data, 18)
    step = struct.unpack_from('<H', data, 28)[0] // 8
    stride = (w * step + 3) & ~3
    top_down = h < 0
    h = abs(h)
    def px(x, y):
        i = off + (y if top_down else h - 1 - y) * stride + x * step
        return data[i + 2], data[i + 1], data[i]
    return px


def tile(cache, x, y):
    jpg = os.path.join(cache, f'{Z}_{y}_{x}.jpg')
    bmp = jpg[:-4] + '.bmp'
    if not os.path.exists(jpg):
        req = urllib.request.Request(TILE.format(z=Z, y=y, x=x), headers={'User-Agent': 'research-map/0.1'})
        try:
            open(jpg, 'wb').write(urllib.request.urlopen(req, timeout=30).read())
        except Exception:
            return None
        time.sleep(0.05)
    if not os.path.exists(bmp):
        r = subprocess.run(['sips', '-s', 'format', 'bmp', jpg, '--out', bmp], capture_output=True)
        if r.returncode:
            return None
    return bmp_pixels(bmp)


def main(cache, out, preview):
    X0, X1, Y0, Y1 = int(tx(W)), int(tx(E)), int(ty(N)), int(ty(S))
    per = 256 // CELL
    cols, rows = (X1 - X0 + 1) * per, (Y1 - Y0 + 1) * per
    light = bytearray(cols * rows)   # 1 pale (paper or wash), 0 ink or colour
    blue = bytearray(cols * rows)
    for y in range(Y0, Y1 + 1):
        for x in range(X0, X1 + 1):
            px = tile(cache, x, y)
            for cy in range(per):
                for cx in range(per):
                    i = ((y - Y0) * per + cy) * cols + (x - X0) * per + cx
                    if px is None:
                        light[i] = 1   # outside the atlas: open water or nothing drawn
                        continue
                    pale = wash = 0
                    # every pixel is looked at: a cell is pale only if all of it is, so the atlas's thin
                    # shoreline and track lines always stop the spread
                    for oy in range(CELL):
                        for ox in range(CELL):
                            r, g, b = px(cx * CELL + ox, cy * CELL + oy)
                            if min(r, g, b) > 185 and max(r, g, b) - min(r, g, b) < 40 or (b > r + 12 and g > r and r > 140):
                                pale += 1
                            if b > r + 12 and g > r and r > 140:
                                wash += 1
                    light[i] = 1 if pale == CELL * CELL else 0
                    blue[i] = 1 if wash * 2 >= CELL * CELL else 0
    print(f'{(X1 - X0 + 1) * (Y1 - Y0 + 1)} tiles read')

    terrain = json.load(open('public/data/district/dtes-terrain.json'))
    old = json.load(open('public/data/district/land-1880s.json'))
    lon0, lat0, lon1, lat1 = terrain['bbox']
    nx, ny = old['nx'], old['ny']
    land = []
    for runs in old['rows']:
        row, x, on = bytearray(nx), 0, False
        for n in runs:
            if on:
                row[x:x + n] = b'\x01' * min(n, nx - x)
            x += n
            on = not on
        land.append(row)

    def old_land_at_cell(i):
        cx, cy = i % cols, i // cols
        lon, lat = lon_of(X0 * 256 + (cx + 0.5) * CELL), lat_of(Y0 * 256 + (cy + 0.5) * CELL)
        mi, mj = int((lon - lon0) / (lon1 - lon0) * nx), int((lat - lat0) / (lat1 - lat0) * ny)
        if not (0 <= mi < nx and 0 <= mj < ny):
            return True
        # a little land around the 1880s shore is allowed for, so the spread can reach the wash
        return land[mj][mi] == 1 and all(land[b][a] == 1 for a, b in ((mi - 1, mj), (mi + 1, mj), (mi, mj - 1), (mi, mj + 1)) if 0 <= a < nx and 0 <= b < ny)

    # spread from open water through pale cells, only over the 1880s water
    allowed = bytearray(0 if old_land_at_cell(i) else 1 for i in range(cols * rows))
    water = bytearray(cols * rows)
    q = deque()
    for lon, lat in SEEDS:
        cx, cy = int((tx(lon) - X0) * per), int((ty(lat) - Y0) * per)
        i = cy * cols + cx
        if 0 <= cx < cols and 0 <= cy < rows and allowed[i]:
            water[i] = 1
            q.append(i)
    while q:
        i = q.popleft()
        cx, cy = i % cols, i // cols
        for nxc, nyc in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
            if 0 <= nxc < cols and 0 <= nyc < rows:
                j = nyc * cols + nxc
                if allowed[j] and light[j] and not water[j]:
                    water[j] = 1
                    q.append(j)

    # onto the mask's 6 m cells: 1880s water that the spread reached in under a third of its area is now land
    hit = [[0] * nx for _ in range(ny)]
    tot = [[0] * nx for _ in range(ny)]
    for i in range(cols * rows):
        if not allowed[i]:
            continue
        cx, cy = i % cols, i // cols
        lon, lat = lon_of(X0 * 256 + (cx + 0.5) * CELL), lat_of(Y0 * 256 + (cy + 0.5) * CELL)
        mi, mj = int((lon - lon0) / (lon1 - lon0) * nx), int((lat - lat0) / (lat1 - lat0) * ny)
        if 0 <= mi < nx and 0 <= mj < ny:
            tot[mj][mi] += 1
            hit[mj][mi] += water[i]
    # Only on the Burrard Inlet side: in False Creek the atlas draws proposed lots and streets over the
    # tidal flats, which were not filled until 1913 to 1917. Pieces of fewer than 30 cells (about 0.1 ha) are dropped.
    north_of = int((49.2790 - lat0) / (lat1 - lat0) * ny)
    new = [[0] * nx for _ in range(ny)]
    for j in range(north_of, ny):
        for i in range(nx):
            if not land[j][i] and tot[j][i] >= 6 and hit[j][i] * 3 < tot[j][i]:
                new[j][i] = 1
    # Anything under about 20 m across is left as water: the water-lot lines the atlas rules out into the
    # inlet, and the narrow piers and wharves, which stood on piles over the water (the sheds on them are
    # still drawn, as buildings). Shrink the new ground by two cells and grow it back.
    def shrink(g):
        return [[1 if g[j][i] and all(g[b][a] for a, b in ((i - 1, j), (i + 1, j), (i, j - 1), (i, j + 1)) if 0 <= a < nx and 0 <= b < ny) else 0 for i in range(nx)] for j in range(ny)]
    def grow(g):
        return [[1 if g[j][i] or any(g[b][a] for a, b in ((i - 1, j), (i + 1, j), (i, j - 1), (i, j + 1)) if 0 <= a < nx and 0 <= b < ny) else 0 for i in range(nx)] for j in range(ny)]
    opened = grow(grow(shrink(shrink(new))))
    new = [[new[j][i] & opened[j][i] for i in range(nx)] for j in range(ny)]
    made = 0
    seen = [[0] * nx for _ in range(ny)]
    for j in range(ny):
        for i in range(nx):
            if new[j][i] and not seen[j][i]:
                comp, stack = [], [(i, j)]
                seen[j][i] = 1
                while stack:
                    a, b = stack.pop()
                    comp.append((a, b))
                    for c, d in ((a + 1, b), (a - 1, b), (a, b + 1), (a, b - 1)):
                        if 0 <= c < nx and 0 <= d < ny and new[d][c] and not seen[d][c]:
                            seen[d][c] = 1
                            stack.append((c, d))
                if len(comp) >= 30:
                    for a, b in comp:
                        land[b][a] = 1
                    made += len(comp)
    # Water left enclosed inside the new ground (pale yards and roofs the spread reached through a gap)
    # is filled: on the inlet side, any pocket of water not joined to the open water and smaller than
    # 400 cells (about 1.4 ha) becomes land.
    seen = [[0] * nx for _ in range(ny)]
    for j in range(north_of, ny):
        for i in range(nx):
            if land[j][i] or seen[j][i]:
                continue
            # the whole body of water this cell is in, however large
            comp, stack, edge = [], [(i, j)], False
            seen[j][i] = 1
            while stack:
                a, b = stack.pop()
                comp.append((a, b))
                for c, d in ((a + 1, b), (a - 1, b), (a, b + 1), (a, b - 1)):
                    if not (0 <= c < nx and 0 <= d < ny) or d < north_of:
                        edge = True
                        continue
                    if not land[d][c] and not seen[d][c]:
                        seen[d][c] = 1
                        stack.append((c, d))
            if len(comp) <= 400 and not edge:
                for a, b in comp:
                    land[b][a] = 1
                made += len(comp)
    # Whatever the atlas builds on was ground by 1912: every building it draws (goad1912.json, from
    # build-goad-1912.py) with about 12 m around it, and the CPR's line along the waterfront (cpr1912.ts)
    # with about 15 m either side, which ran on fill. This picks up the filled north edge of False Creek
    # around Carrall and Columbia, which the colour reading above leaves out. The new ground is then
    # closed (grown five cells, about 30 m, and shrunk back, so the fill reads as one edge and not as islands round each building) and any enclosed water under 400 cells filled.
    import re
    extra = [[0] * nx for _ in range(ny)]
    def cell_of(lon, lat):
        return int((lon - lon0) / (lon1 - lon0) * nx), int((lat - lat0) / (lat1 - lat0) * ny)
    def ll_of(i, j):
        return lon0 + (i + 0.5) / nx * (lon1 - lon0), lat0 + (j + 0.5) / ny * (lat1 - lat0)
    def inside(lon, lat, ring):
        c, n = False, len(ring)
        for k in range(n):
            (x1, y1), (x2, y2) = ring[k], ring[k - 1]
            if (y1 > lat) != (y2 > lat) and lon < (x2 - x1) * (lat - y1) / (y2 - y1) + x1:
                c = not c
        return c
    goad = json.load(open('src/lib/data/goad1912.json'))
    track = [tuple(map(float, m)) for m in re.findall(r'\[\s*(-123\.\d+)\s*,\s*(49\.\d+)\s*\]', open('src/lib/data/cpr1912.ts').read())]
    def track_lat(lon):
        for (xa, ya), (xb, yb) in zip(track, track[1:]):
            if min(xa, xb) <= lon <= max(xa, xb):
                return ya + (yb - ya) * (lon - xa) / (xb - xa or 1e-9)
        # beyond the line's ends (the piers lie west of its west end), the end's own latitude
        west, east = min(track, key=lambda p: p[0]), max(track, key=lambda p: p[0])
        return west[1] if lon < west[0] else east[1]
    def old_land_share(ring):
        n = 0
        for lon, lat in ring:
            i, j = cell_of(lon, lat)
            n += 1 if 0 <= i < nx and 0 <= j < ny and land[j][i] else 0
        return n / len(ring)
    # The sheds on the Canadian Pacific's piers stood on piles over the water, not on fill: a building west
    # of Carrall whose middle is more than 35 m out beyond the line, on what was water in the 1880s, is a
    # pier shed. No ground is made under it, and any the colour reading made under it is given back to the
    # water, so the piers read as piers. (The piers are listed in goad1912.json's order: pier sheds.)
    piers = []
    for kind in ('brick', 'frame'):
        for k, ring in enumerate(goad[kind]):
            lon = sum(p[0] for p in ring) / len(ring)
            lat = sum(p[1] for p in ring) / len(ring)
            tl = track_lat(lon)
            if lon < -123.1043 and tl is not None and (lat - tl) * 111_200 > 35 and old_land_share(ring) < 0.5:
                piers.append((kind, k, ring))
    pier_set = {(k, i) for k, i, _ in piers}
    for kind in ('brick', 'frame'):
        for k, ring in enumerate(goad[kind]):
            if (kind, k) in pier_set:
                continue
            a0, b0 = cell_of(min(p[0] for p in ring), min(p[1] for p in ring))
            a1, b1 = cell_of(max(p[0] for p in ring), max(p[1] for p in ring))
            for j in range(max(b0, 0), min(b1 + 1, ny)):
                for i in range(max(a0, 0), min(a1 + 1, nx)):
                    if inside(*ll_of(i, j), ring):
                        extra[j][i] = 1
    print(f'{len(piers)} pier sheds left over the water')
    for _ in range(2):
        extra = grow(extra)
    for (xa, ya), (xb, yb) in zip(track, track[1:]):
        (ia, ja), (ib, jb) = cell_of(xa, ya), cell_of(xb, yb)
        steps = max(abs(ib - ia), abs(jb - ja), 1)
        for k in range(steps + 1):
            ci, cj = round(ia + (ib - ia) * k / steps), round(ja + (jb - ja) * k / steps)
            for dj in range(-2, 3):
                for di in range(-2, 3):
                    if 0 <= ci + di < nx and 0 <= cj + dj < ny:
                        extra[cj + dj][ci + di] = 1
    added = 0
    for j in range(ny):
        for i in range(nx):
            if extra[j][i] and not land[j][i]:
                land[j][i] = 1
                added += 1
    closed = land
    for _ in range(5):
        closed = grow(closed)
    for _ in range(5):
        closed = shrink(closed)
    for j in range(ny):
        for i in range(nx):
            if closed[j][i] and not land[j][i]:
                land[j][i] = 1
                added += 1
    seen = [[0] * nx for _ in range(ny)]
    for j in range(ny):
        for i in range(nx):
            if land[j][i] or seen[j][i]:
                continue
            comp, stack, edge = [], [(i, j)], False
            seen[j][i] = 1
            while stack and len(comp) <= 400:
                a, b = stack.pop()
                comp.append((a, b))
                for c, d in ((a + 1, b), (a - 1, b), (a, b + 1), (a, b - 1)):
                    if not (0 <= c < nx and 0 <= d < ny):
                        edge = True
                        continue
                    if not land[d][c] and not seen[d][c]:
                        seen[d][c] = 1
                        stack.append((c, d))
            if stack:
                # too big to be a pocket: mark the rest of this body seen so it is not walked again
                while stack:
                    a, b = stack.pop()
                    for c, d in ((a + 1, b), (a - 1, b), (a, b + 1), (a, b - 1)):
                        if 0 <= c < nx and 0 <= d < ny and not land[d][c] and not seen[d][c]:
                            seen[d][c] = 1
                            stack.append((c, d))
                continue
            if not edge:
                for a, b in comp:
                    land[b][a] = 1
                added += len(comp)
    # the piers: back to water where the 1880s had water, outside the strip of the line itself
    strip = [[0] * nx for _ in range(ny)]
    for (xa, ya), (xb, yb) in zip(track, track[1:]):
        (ia, ja), (ib, jb) = cell_of(xa, ya), cell_of(xb, yb)
        steps = max(abs(ib - ia), abs(jb - ja), 1)
        for k in range(steps + 1):
            ci, cj = round(ia + (ib - ia) * k / steps), round(ja + (jb - ja) * k / steps)
            for dj in range(-3, 4):
                for di in range(-3, 4):
                    if 0 <= ci + di < nx and 0 <= cj + dj < ny:
                        strip[cj + dj][ci + di] = 1
    original = [[0] * nx for _ in range(ny)]
    for j in range(ny):
        for i in range(nx):
            original[j][i] = 1
    for runs_j, runs in enumerate(old['rows']):
        x, on = 0, False
        for n in runs:
            if not on:
                for i in range(x, min(x + n, nx)):
                    original[runs_j][i] = 0
            x += n
            on = not on
    back = 0
    for kind, k, ring in piers:
        a0, b0 = cell_of(min(p[0] for p in ring), min(p[1] for p in ring))
        a1, b1 = cell_of(max(p[0] for p in ring), max(p[1] for p in ring))
        for j in range(max(b0 - 1, 0), min(b1 + 2, ny)):
            for i in range(max(a0 - 1, 0), min(a1 + 2, nx)):
                if land[j][i] and not original[j][i] and not strip[j][i]:
                    land[j][i] = 0
                    back += 1
    added -= back
    made += added
    print(f'{back} cells under the pier sheds given back to the water')
    print(f'{added} cells added under the atlas\'s buildings and the CPR line')
    print(f'{made} cells of 1880s water were land by 1912: {made * old["cell"] ** 2 / 1e6:.3f} km2')

    rows_out = []
    for row in land:
        runs, cur, n = [], 0, 0
        for v in row:
            if v == cur:
                n += 1
            else:
                runs.append(n)
                cur, n = v, 1
        runs.append(n)
        rows_out.append(runs)
    json.dump({**{k: v for k, v in old.items() if k != 'rows'}, 'rows': rows_out,
               'source': "The 1880s land (land-1880s.json) with the ground made by 1912 added, as Goad's 1912 atlas shows it. Made by scripts/build-shore-1912.py."}, open(out, 'w'))

    # preview: grey 1880s land, black new land, white water
    old_rows = old['rows']
    ppm = preview[:-4] + '.ppm'
    with open(ppm, 'wb') as f:
        f.write(f'P6 {nx} {ny} 255\n'.encode())
        for j in range(ny - 1, -1, -1):
            orig, x, on = bytearray(nx), 0, False
            for n in old_rows[j]:
                if on:
                    orig[x:x + n] = b'\x01' * min(n, nx - x)
                x += n
                on = not on
            f.write(bytes(c for i in range(nx) for c in ((150, 150, 150) if orig[i] else (0, 0, 0) if land[j][i] else (255, 255, 255))))
    subprocess.run(['sips', '-s', 'format', 'png', ppm, '--out', preview], capture_output=True)


main(*sys.argv[1:4])
