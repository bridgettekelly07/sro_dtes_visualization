"""
The shoreline when the first train came in, May 1887, as a land mask like land-1880s.json.

The Canadian Pacific laid its line along the Burrard Inlet foreshore in 1886 and 1887, on fill and
trestle over the beach below the bluff. This is the 1880s land with that roadbed added: a strip about
12 m either side of the line the map draws for the first train (the line Goad's 1912 atlas shows, from
src/lib/data/cpr1912.ts; the 1889 plan's track across the mill site, from src/lib/data/millSite.ts; and
the stand-in on today's tracks east of the atlas, from the approachFromEast points in stops.ts), carried
on to the end of the line, the terminus marked near today's Waterfront Station, with about 30 m of
station ground round it. Water
shut in between the roadbed and the old shore is filled where it is under about 1.4 ha (400 cells);
larger coves are left as water, as the line crossed them on trestle.

The strip's width is a drawing choice, not a survey: the 1887 roadbed's real edges are not traced.

Usage: python3 scripts/build-land-1887.py public/data/district/land-1887.json
"""
import json
import re
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


def points(text):
    return [(float(a), float(b)) for a, b in re.findall(r'\[\s*(-123\.\d+)\s*,\s*(49\.\d+)\s*\]', text)]


def main(out):
    old = json.load(open('public/data/district/land-1880s.json'))
    lon0, lat0, lon1, lat1 = json.load(open('public/data/district/dtes-terrain.json'))['bbox']
    nx, ny = old['nx'], old['ny']
    land = cells(old)

    cpr = points(open('src/lib/data/cpr1912.ts').read())
    mill = points(re.search(r'export const millTrack[^\n]*', open('src/lib/data/millSite.ts').read()).group(0))
    stops = open('src/lib/data/stops.ts').read()
    east = points(re.search(r'const approachFromEast[^\]]*\](?:[^;]*?)\n\]', stops, re.S).group(0))
    east = [p for p in east if p[0] > max(q[0] for q in cpr)]
    # on to the end of the line: from the atlas line's west end to the terminus marked on the map (the
    # 'terminus' site in stops.ts, near today's Waterfront Station), with the station ground around it
    terminus = (-123.1135, 49.2862)
    west_end = min(cpr, key=lambda p: p[0])
    end = [west_end, terminus]

    def cell(lon, lat):
        return (lon - lon0) / (lon1 - lon0) * nx, (lat - lat0) / (lat1 - lat0) * ny

    added = 0
    for line in (cpr, mill, east, end):
        for (xa, ya), (xb, yb) in zip(line, line[1:]):
            (ia, ja), (ib, jb) = cell(xa, ya), cell(xb, yb)
            steps = int(max(abs(ib - ia), abs(jb - ja)) * 2) + 1
            for k in range(steps + 1):
                ci, cj = round(ia + (ib - ia) * k / steps), round(ja + (jb - ja) * k / steps)
                for dj in range(-2, 3):
                    for di in range(-2, 3):
                        if 0 <= ci + di < nx and 0 <= cj + dj < ny and not land[cj + dj][ci + di]:
                            land[cj + dj][ci + di] = 1
                            added += 1

    # the station ground: about 30 m round the terminus
    ti, tj = cell(*terminus)
    for dj in range(-5, 6):
        for di in range(-5, 6):
            ci, cj = round(ti) + di, round(tj) + dj
            if di * di + dj * dj <= 25 and 0 <= ci < nx and 0 <= cj < ny and not land[cj][ci]:
                land[cj][ci] = 1
                added += 1

    # water shut in between the roadbed and the old shore is filled, whatever its size: the line ran on
    # trestle over tidal flats, and what was flat and what was open water behind it is not known
    seen = [bytearray(nx) for _ in range(ny)]
    filled = 0
    for j in range(ny):
        for i in range(nx):
            if land[j][i] or seen[j][i]:
                continue
            comp, stack, edge = [], [(i, j)], False
            seen[j][i] = 1
            while stack:
                a, b = stack.pop()
                comp.append((a, b))
                for c, d in ((a + 1, b), (a - 1, b), (a, b + 1), (a, b - 1)):
                    if not (0 <= c < nx and 0 <= d < ny):
                        edge = True
                        continue
                    if not land[d][c] and not seen[d][c]:
                        seen[d][c] = 1
                        stack.append((c, d))
            if not edge:
                for a, b in comp:
                    land[b][a] = 1
                filled += len(comp)
    print(f'{added} cells of roadbed and {filled} cells of shut-in water added: {(added + filled) * old["cell"] ** 2 / 1e6:.3f} km2')

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
               'source': "The 1880s land (land-1880s.json) with the Canadian Pacific's 1887 roadbed along the inlet added. Made by scripts/build-land-1887.py."}, open(out, 'w'))


main(sys.argv[1])
