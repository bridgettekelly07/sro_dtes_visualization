"""
Divide the atlas's joined brick blocks along today's lot lines.

Goad's 1912 atlas separates brick buildings that share a wall only by a thin line, which the colour
reading of build-goad-1912.py does not see, so a row of them comes out as one footprint running the
length of the block. Today's parcels keep the lot pattern of the 1880s surveys here, so each joined
footprint (brick, over MIN_AREA) is cut along the parcel lines: the pieces are the footprint's overlap
with each parcel, each simplified to lose the cell-grid's steps. Pieces under MIN_PIECE are dropped.

A joined footprint that a parcel line does not cross is left as it is, and frame buildings are left as
they are: the atlas draws them standing apart. The buildings the story draws whole (KEEP) are not cut.

Parcels: property-parcel-polygons from the City's open data, as fetched by build-goad-years.py into
its cache folder.

Usage: python3 scripts/split-goad-blocks.py <cache folder> src/lib/data/goad1912.json
"""
import json
import os
import sys

MIN_AREA = 900     # m2: smaller brick footprints are single buildings
# buildings the story draws whole, left uncut whatever their size: a point inside each
KEEP = [(-123.10025, 49.28073),   # City Hall of 1898 to 1929, on Westminster Avenue
        (-123.10469, 49.28123),   # the BC Electric terminal at Hastings and Carrall
        (-123.11264, 49.28613)]   # the CPR station at the head of Granville
MIN_PIECE = 30     # m2
TOL = 1.8          # m: simplification

KX, KY = 72_600, 111_200


def area(r):
    a = 0
    for (x1, y1), (x2, y2) in zip(r, r[1:] + r[:1]):
        a += x1 * y2 - x2 * y1
    return abs(a) / 2 * KX * KY


def clip(subject, clipper):
    """Sutherland-Hodgman: the part of `subject` inside the convex (or near-convex) `clipper`."""
    def inside(p, a, b):
        return (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]) >= 0
    def cross(p, q, a, b):
        dx, dy = q[0] - p[0], q[1] - p[1]
        ex, ey = b[0] - a[0], b[1] - a[1]
        den = dx * ey - dy * ex
        if abs(den) < 1e-18:
            return q
        t = ((a[0] - p[0]) * ey - (a[1] - p[1]) * ex) / den
        return [p[0] + dx * t, p[1] + dy * t]
    # the clipper counter-clockwise
    s = 0
    for (x1, y1), (x2, y2) in zip(clipper, clipper[1:] + clipper[:1]):
        s += x1 * y2 - x2 * y1
    if s < 0:
        clipper = clipper[::-1]
    out = subject
    for a, b in zip(clipper, clipper[1:] + clipper[:1]):
        if not out:
            break
        inp, out = out, []
        prev = inp[-1]
        for cur in inp:
            if inside(cur, a, b):
                if not inside(prev, a, b):
                    out.append(cross(prev, cur, a, b))
                out.append(cur)
            elif inside(prev, a, b):
                out.append(cross(prev, cur, a, b))
            prev = cur
    return out


def simplify(pts, tol_m):
    def dist(p, a, b):
        ax, ay = a[0] * KX, a[1] * KY
        bx, by = b[0] * KX, b[1] * KY
        px, py = p[0] * KX, p[1] * KY
        dx, dy = bx - ax, by - ay
        if dx == 0 and dy == 0:
            return ((px - ax) ** 2 + (py - ay) ** 2) ** 0.5
        t = max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
        return ((px - ax - dx * t) ** 2 + (py - ay - dy * t) ** 2) ** 0.5
    def dp(line):
        if len(line) < 3:
            return line
        far, k = 0, 0
        for i in range(1, len(line) - 1):
            d = dist(line[i], line[0], line[-1])
            if d > far:
                far, k = d, i
        if far <= tol_m:
            return [line[0], line[-1]]
        return dp(line[:k + 1])[:-1] + dp(line[k:])
    if len(pts) < 4:
        return pts
    closed = dp(pts + [pts[0]])
    return closed[:-1]


def main(cache, path):
    goad = json.load(open(path))
    parcels = json.load(open(os.path.join(cache, 'parcels-goad.geojson')))['features']
    lots = []
    for f in parcels:
        g = f['geometry']
        rings = [g['coordinates'][0]] if g['type'] == 'Polygon' else [p[0] for p in g['coordinates']]
        for r in rings:
            r = [list(p) for p in r]
            if r[0] == r[-1]:
                r = r[:-1]
            xs, ys = [p[0] for p in r], [p[1] for p in r]
            lots.append((r, min(xs), max(xs), min(ys), max(ys)))
    out, split, pieces = [], 0, 0
    def holds(ring, p):
        c = False
        for k in range(len(ring)):
            (x1, y1), (x2, y2) = ring[k], ring[k - 1]
            if (y1 > p[1]) != (y2 > p[1]) and p[0] < (x2 - x1) * (p[1] - y1) / (y2 - y1) + x1:
                c = not c
        return c
    for ring in goad['brick']:
        if area(ring) < MIN_AREA or any(holds(ring, p) for p in KEEP):
            out.append(ring)
            continue
        xs, ys = [p[0] for p in ring], [p[1] for p in ring]
        x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
        got = []
        for lot, a, b, c, d in lots:
            if b < x0 or a > x1 or d < y0 or c > y1:
                continue
            piece = clip(ring, lot)
            if len(piece) >= 3 and area(piece) >= MIN_PIECE:
                got.append(piece)
        covered = sum(area(p) for p in got)
        if len(got) >= 2 and covered >= area(ring) * 0.6:
            split += 1
            for piece in got:
                sp = simplify(piece, TOL)
                if len(sp) >= 3 and area(sp) >= MIN_PIECE:
                    out.append([[round(x, 6), round(y, 6)] for x, y in sp])
                    pieces += 1
        else:
            out.append(ring)
    print(f'{split} joined brick footprints cut into {pieces} pieces; {len(goad["brick"])} brick footprints before, {len(out)} after')
    goad['brick'] = out
    goad['source'] = goad.get('source', '') + " Joined brick footprints cut along today's lot lines by scripts/split-goad-blocks.py."
    json.dump(goad, open(path, 'w'), separators=(',', ':'))


main(*sys.argv[1:3])
