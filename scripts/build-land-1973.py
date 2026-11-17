"""
The shoreline of 1973 to 1983, as a land mask like land-1917.json.

OpenHistoricalMap (openhistoricalmap.org, data CC0) maps False Creek's water as a polygon dated 1908 to
1983: the creek after the flats east of Main were filled and before the north shore was rebuilt for
Expo 86. This takes the 1917 land (land-1917.json) and, south of the downtown peninsula's shore (below
latitude 49.2795) and west of Clark Drive, makes water exactly what that polygon covers and land the rest.
Burrard Inlet is left as in 1917.

Usage: python3 scripts/build-land-1973.py <OpenHistoricalMap False Creek relation json> public/data/district/land-1973.json
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


def rings_of(members, role):
    """The member ways of a role joined end to end into closed rings."""
    segs = [[(p['lon'], p['lat']) for p in m['geometry']] for m in members if m.get('role') == role and m.get('geometry')]
    rings = []
    while segs:
        ring = segs.pop(0)
        changed = True
        while ring[0] != ring[-1] and changed:
            changed = False
            for k, s in enumerate(segs):
                if s[0] == ring[-1]:
                    ring += s[1:]
                elif s[-1] == ring[-1]:
                    ring += s[::-1][1:]
                elif s[-1] == ring[0]:
                    ring = s[:-1] + ring
                elif s[0] == ring[0]:
                    ring = s[::-1][:-1] + ring
                else:
                    continue
                segs.pop(k)
                changed = True
                break
        rings.append(ring)
    return rings


def inside(x, y, ring):
    c = False
    for k in range(len(ring)):
        (x1, y1), (x2, y2) = ring[k], ring[k - 1]
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
            c = not c
    return c


rel = [e for e in json.load(open(sys.argv[1]))['elements'] if e.get('tags', {}).get('start_date') == '1908'][0]
outers, inners = rings_of(rel['members'], 'outer'), rings_of(rel['members'], 'inner')
m1917 = json.load(open('public/data/district/land-1917.json'))
land = cells(m1917)
lon0, lat0, lon1, lat1 = json.load(open('public/data/district/dtes-terrain.json'))['bbox']
nx, ny = m1917['nx'], m1917['ny']
changed = 0
for j in range(ny):
    lat = lat0 + (j + 0.5) / ny * (lat1 - lat0)
    if lat >= 49.2795:
        continue
    for i in range(nx):
        lon = lon0 + (i + 0.5) / nx * (lon1 - lon0)
        if lon > -123.0700:
            continue
        wet = any(inside(lon, lat, r) for r in outers) and not any(inside(lon, lat, r) for r in inners)
        v = 0 if wet else 1
        if land[j][i] != v:
            land[j][i] = v
            changed += 1
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
           'source': "land-1917.json with False Creek as OpenHistoricalMap's water polygon of 1908 to 1983 (CC0). Made by scripts/build-land-1973.py."}, open(sys.argv[2], 'w'))
print(f'{changed} cells changed; outer rings {len(outers)} ({[len(r) for r in outers]}), inner {len(inners)}')
