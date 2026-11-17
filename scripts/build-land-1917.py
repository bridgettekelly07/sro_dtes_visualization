"""
The shoreline after the False Creek flats were filled, as a land mask like land-1912.json.

The eastern basin of False Creek, a tidal flat reaching almost to Clark Drive, was filled for the
Great Northern and Canadian Northern railway terminals. The City's area profile of the flats says the
filling began in 1915 and was complete by 1917, with both railways' terminals there by 1919; other
accounts give 1912 to 1916, or 1917 to 1925 for parts of it.

The outline of that fill is taken from today's shore: today's land east of Main Street and south of the
1912 shore of the flats is added to the 1912 land. West of Main (the Expo lands, Science World) and the
Burrard Inlet waterfront are left as they were in 1912; their later fills are not drawn here.

Usage: python3 scripts/build-land-1917.py public/data/district/land-1917.json
"""
import json
import sys


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


terrain = json.load(open('public/data/district/dtes-terrain.json'))
today = cells(terrain['land'])
m1912 = json.load(open('public/data/district/land-1912.json'))
land = cells(m1912)
lon0, lat0, lon1, lat1 = terrain['bbox']
nx, ny = m1912['nx'], m1912['ny']
EAST_OF_MAIN, WEST_LIMIT_EAST, SOUTH, NORTH = -123.0997, -123.0700, 49.2600, 49.2775
added = 0
for j in range(ny):
    lat = lat0 + (j + 0.5) / ny * (lat1 - lat0)
    if not (SOUTH < lat < NORTH):
        continue
    for i in range(nx):
        lon = lon0 + (i + 0.5) / nx * (lon1 - lon0)
        if EAST_OF_MAIN < lon < WEST_LIMIT_EAST and today[j][i] and not land[j][i]:
            land[j][i] = 1
            added += 1
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
json.dump({**{k: v for k, v in m1912.items() if k != 'rows'}, 'rows': rows,
           'source': "land-1912.json with the False Creek flats east of Main filled, on today's outline (filled 1915 to 1917 by the City's account). Made by scripts/build-land-1917.py."}, open(sys.argv[1], 'w'))
print(f'{added} cells added: {added * m1912["cell"] ** 2 / 1e6:.2f} km2')
