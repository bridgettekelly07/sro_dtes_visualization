"""
The streets and railways on the False Creek flats, for the map after the flats were filled.

The flats east of Main Street were filled from 1915 to 1917 for the Great Northern and Canadian Northern
railways' terminals and yards. No period map of what was laid out on the fill is in the project, so this
takes today's street centrelines (public/data/district/dtes-streets.json) and railway centrelines
(public/data/district/dtes-rail.json) and keeps the parts that lie on the fill: ground that is land in
land-1917.json and was water in land-1912.json. The railways there are the successors of the two
terminals' yards (Canadian National today, Pacific Central station of 1919); the streets are later, and
only a stand-in for the roads the yards were laid out with.

Writes src/lib/data/flats1917.json: { streets: [[[lon, lat], ...], ...], rail: [...] }

Usage: python3 scripts/build-flats-1917.py src/lib/data/flats1917.json
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


def main(out):
    lon0, lat0, lon1, lat1 = json.load(open('public/data/district/dtes-terrain.json'))['bbox']
    a = json.load(open('public/data/district/land-1912.json'))
    b = json.load(open('public/data/district/land-1917.json'))
    nx, ny = a['nx'], a['ny']
    l12, l17 = cells(a), cells(b)

    def on_fill(lon, lat):
        i, j = int((lon - lon0) / (lon1 - lon0) * nx), int((lat - lat0) / (lat1 - lat0) * ny)
        return 0 <= i < nx and 0 <= j < ny and l17[j][i] and not l12[j][i]

    def clip(line):
        # the runs of the line whose points lie on the fill, with one point carried either side
        runs, cur = [], []
        for k, p in enumerate(line):
            if on_fill(*p):
                if not cur and k > 0:
                    cur.append(line[k - 1])
                cur.append(p)
            elif cur:
                cur.append(p)
                runs.append(cur)
                cur = []
        if cur:
            runs.append(cur)
        return [r for r in runs if len(r) >= 2]

    streets = json.load(open('public/data/district/dtes-streets.json'))
    street_lines = []
    for seg in streets['segments']:
        street_lines += clip([[round(x, 6), round(y, 6)] for x, y in seg['c']])

    rail = json.load(open('public/data/district/dtes-rail.json'))
    ox, oy = rail['origin']
    sc = rail['scale']
    rail_lines = []
    for enc in rail['lines']:
        pts, x, y = [], 0, 0
        for k in range(0, len(enc), 2):
            x += enc[k]
            y += enc[k + 1]
            pts.append([round(ox + x * sc, 6), round(oy + y * sc, 6)])
        rail_lines += clip(pts)
    json.dump({'source': "Today's street and railway centrelines (City of Vancouver Open Data) on the False Creek flats filled by 1917, as a stand-in for what was laid out on the fill. Made by scripts/build-flats-1917.py.", 'streets': street_lines, 'rail': rail_lines}, open(out, 'w'), separators=(',', ':'))
    print(len(street_lines), 'street pieces,', len(rail_lines), 'rail pieces on the fill')


main(sys.argv[1])
