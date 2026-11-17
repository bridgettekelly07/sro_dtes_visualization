"""
The shoreline by 1986, as a land mask like land-1917.json.

Through the middle of the century the north shore of False Creek, the Canadian Pacific's yards between
the Burrard Bridge and Main Street, was filled out further; by Expo 86 the fair's grounds, BC Place and
the pavilions on the east shore stood on that fill. This takes the land of 1973 (land-1973.json, from
OpenHistoricalMap's False Creek of 1908 to 1983) and adds today's land along the north shore of False
Creek between the Granville Bridge and Main Street (between latitudes 49.2700 and 49.2790), the ground
rebuilt for the fair.

Today's outline is a stand-in: the shore of 1986 is close to today's along the north shore, but parts of
it were rebuilt after the fair (the seawall, the towers' sites), and the south shore's later changes are
not drawn because only today's land north of 49.2680 is taken. Burrard Inlet's later fills are left as
they were in 1917.

Usage: python3 scripts/build-land-1986.py public/data/district/land-1986.json
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
m1917 = json.load(open('public/data/district/land-1973.json'))
land = cells(m1917)
lon0, lat0, lon1, lat1 = terrain['bbox']
nx, ny = m1917['nx'], m1917['ny']
WEST, EAST, SOUTH, NORTH = -123.1300, -123.0990, 49.2700, 49.2790
added = 0
for j in range(ny):
    lat = lat0 + (j + 0.5) / ny * (lat1 - lat0)
    if not (SOUTH < lat < NORTH):
        continue
    for i in range(nx):
        lon = lon0 + (i + 0.5) / nx * (lon1 - lon0)
        if WEST < lon < EAST and today[j][i] and not land[j][i]:
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
json.dump({**{k: v for k, v in m1917.items() if k != 'rows'}, 'rows': rows,
           'source': "land-1973.json with the north shore of False Creek filled out to today's outline between the Granville Bridge and Main Street, as a stand-in for the shore of 1986. Made by scripts/build-land-1986.py."}, open(sys.argv[1], 'w'))
print(f'{added} cells added: {added * m1917["cell"] ** 2 / 1e6:.2f} km2')
