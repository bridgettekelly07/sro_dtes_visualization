"""
The shoreline of a given year, from OpenHistoricalMap's dated coastlines, as a land mask like land-1917.json.

OpenHistoricalMap (openhistoricalmap.org, data CC0) maps Vancouver's coastline as ways with start and end
dates, each segment valid while that stretch of shore stood. For a year Y this takes every coastline way
valid in Y (begun by Y, and ended after it or not at all), draws it on the mask's grid as a wall, and floods
the water from points out in Burrard Inlet and False Creek, through cells that were water in the 1880s
(land-1880s.json): the fill only ever moved the shore outward, so nothing that was land then is water now.
What the flood reaches is water in Y; the rest is land.

Where OpenHistoricalMap's coastline has a gap for a year, the flood can run through it into ground that had
been filled; the preview image shows the result for checking. Its dates are those its mappers give.

Usage: python3 scripts/build-land-ohm.py <coastline geojson cache> <year> public/data/district/land-<year>.json <preview.png>
"""
import json
import os
import subprocess
import sys
import urllib.parse
import urllib.request
from collections import deque

OVERPASS = 'https://overpass-api.openhistoricalmap.org/api/interpreter'
QUERY = '[out:json][timeout:150];way["natural"="coastline"](49.245,-123.17,49.31,-123.03);out tags geom;'
SEEDS = [(-123.1000, 49.2905), (-123.0880, 49.2895), (-123.1150, 49.2920), (-123.1300, 49.2700), (-123.1200, 49.2705), (-123.1100, 49.2722)]


def cells(m):
    out = []
    for runs in m['rows']:
        row, x, on = bytearray(m['nx']), 0, False
        for n in runs:
            if on:
                row[x:x + n] = b'\x01' * min(n, m['nx'] - x)
            x += n
            on = not on
        out.append(row)
    return out


def year_of(s):
    try:
        return int(str(s)[:4])
    except (TypeError, ValueError):
        return None


def main(cache, year, out, preview):
    year = int(year)
    if not os.path.exists(cache):
        req = urllib.request.Request(OVERPASS, data=urllib.parse.urlencode({'data': QUERY}).encode(), headers={'User-Agent': 'research-map/0.1'})
        open(cache, 'wb').write(urllib.request.urlopen(req, timeout=200).read())
    ways = [e for e in json.load(open(cache))['elements'] if e['type'] == 'way']
    valid = []
    for w in ways:
        s, e = year_of(w.get('tags', {}).get('start_date')), year_of(w.get('tags', {}).get('end_date'))
        if (s is None or s <= year) and (e is None or e > year):
            valid.append([(p['lon'], p['lat']) for p in w['geometry']])
    old = json.load(open('public/data/district/land-1880s.json'))
    lon0, lat0, lon1, lat1 = json.load(open('public/data/district/dtes-terrain.json'))['bbox']
    nx, ny = old['nx'], old['ny']
    was_land = cells(old)
    wall = [bytearray(nx) for _ in range(ny)]

    def cell(lon, lat):
        return (lon - lon0) / (lon1 - lon0) * nx, (lat - lat0) / (lat1 - lat0) * ny

    for line in valid:
        for (xa, ya), (xb, yb) in zip(line, line[1:]):
            (ia, ja), (ib, jb) = cell(xa, ya), cell(xb, yb)
            steps = int(max(abs(ib - ia), abs(jb - ja)) * 2) + 1
            for k in range(steps + 1):
                ci, cj = int(ia + (ib - ia) * k / steps), int(ja + (jb - ja) * k / steps)
                for di, dj in ((0, 0), (1, 0), (0, 1)):
                    if 0 <= ci + di < nx and 0 <= cj + dj < ny:
                        wall[cj + dj][ci + di] = 1
    water = [bytearray(nx) for _ in range(ny)]
    q = deque()
    for lon, lat in SEEDS:
        i, j = cell(lon, lat)
        i, j = int(i), int(j)
        if 0 <= i < nx and 0 <= j < ny and not was_land[j][i] and not wall[j][i]:
            water[j][i] = 1
            q.append((i, j))
    while q:
        i, j = q.popleft()
        for a, b in ((i + 1, j), (i - 1, j), (i, j + 1), (i, j - 1)):
            if 0 <= a < nx and 0 <= b < ny and not water[b][a] and not wall[b][a] and not was_land[b][a]:
                water[b][a] = 1
                q.append((a, b))
    # the wall itself is the shore: it takes the side of the water beside it, so the edge is not a ridge of land
    for j in range(ny):
        for i in range(nx):
            if wall[j][i] and not was_land[j][i]:
                n = sum(water[b][a] for a, b in ((i + 1, j), (i - 1, j), (i, j + 1), (i, j - 1)) if 0 <= a < nx and 0 <= b < ny)
                if n >= 2:
                    water[j][i] = 2
    land = [bytearray(0 if water[j][i] else 1 for i in range(nx)) for j in range(ny)]
    rows = []
    for row in land:
        runs, cur, n = [], 0, 0
        for v in row:
            if v == cur:
                n += 1
            else:
                runs.append(n)
                cur, n = v, 1
        runs.append(n)
        rows.append(runs)
    json.dump({**{k: v for k, v in old.items() if k != 'rows'}, 'rows': rows,
               'source': f"The shoreline of {year} from OpenHistoricalMap's dated coastlines (CC0), within the water of the 1880s. Made by scripts/build-land-ohm.py."}, open(out, 'w'))
    print(f'{year}: {len(valid)} coastline ways valid; water cells {sum(1 for r in water for v in r if v)}')
    # preview: grey 1880s land, black land made since, white water
    ppm = preview[:-4] + '.ppm'
    with open(ppm, 'wb') as f:
        f.write(f'P6 {nx} {ny} 255\n'.encode())
        for j in range(ny - 1, -1, -1):
            f.write(bytes(c for i in range(nx) for c in ((150, 150, 150) if was_land[j][i] else (0, 0, 0) if land[j][i] else (255, 255, 255))))
    subprocess.run(['sips', '-s', 'format', 'png', ppm, '--out', preview], capture_output=True)


main(*sys.argv[1:5])
