"""
The streets of the city as surveyed by 1887, drawn on today's centrelines.

  City of Vancouver, Canadian Pacific Town Site. Ross and Ceperley, [between 1887 and 1889].
  City of Vancouver Archives, AM1594-: MAP 33. Public domain.
  https://searcharchives.vancouver.ca/city-of-vancouver-canadian-pacific-town-site

The map shows the surveyed city of 1887: the Canadian Pacific's townsite west of Cambie, the 1870
Granville townsite, and District Lots 196 and 181 east to Boundary Avenue (now Glen Drive). Those
streets are still where they were laid out, so they are drawn here from the City's street centrelines
(public/data/district/dtes-streets.json), keeping only:
  - streets that appear on the 1887 map (listed below by today's names; several had other names then:
    Westminster Avenue is Main, Oppenheimer is East Cordova, Dupont is Pender, Harris is Georgia,
    Barnard is Union, Carl Avenue is Princess, Boundary Avenue is Glen Drive);
  - pieces lying on land in the 1880s (public/data/district/land-1880s.json), since anything on later
    fill did not exist;
  - pieces north of False Creek.
A street on the map was not necessarily built: many were lines on paper through stumps in 1887.

Each street is drawn by its two edges, a chain (66 ft, about 20 m) apart. Where an edge runs into a
crossing street, or into the water, that part is cut out, so the edges meet at the corners as block
outlines instead of crossing each other.

Usage: python3 scripts/build-streets-1887.py src/lib/data/streets1887.json
"""
import json
import math
import re
import sys

HALF = 10.06   # half a chain, in metres
STEP = 2.0     # how finely each edge is tested, in metres

ON_1887_MAP = {
    # District Lots 196 and 181, east of Carrall
    'RAILWAY ST', 'ALEXANDER ST', 'POWELL ST', 'E CORDOVA ST', 'E HASTINGS ST', 'E PENDER ST', 'KEEFER ST',
    'E GEORGIA ST', 'UNION ST', 'PRIOR ST', 'COLUMBIA ST', 'MAIN ST', 'GORE AV', 'DUNLEVY AV', 'JACKSON AV',
    'PRINCESS AV', 'HEATLEY AV', 'HAWKS AV', 'CAMPBELL AV', 'RAYMUR AV', 'GLEN DRIVE',
    # the Granville townsite of 1870
    'WATER ST', 'W CORDOVA ST', 'W HASTINGS ST', 'W PENDER ST', 'CARRALL ST', 'ABBOTT ST', 'CAMBIE ST', 'TROUNCE ALLEY',
    # the Canadian Pacific townsite, downtown and the West End
    'BEATTY ST', 'HAMILTON ST', 'HOMER ST', 'RICHARDS ST', 'SEYMOUR ST', 'GRANVILLE ST', 'HORNBY ST', 'HOWE ST',
    'BURRARD ST', 'THURLOW ST', 'BUTE ST', 'JERVIS ST', 'BROUGHTON ST', 'NICOLA ST', 'CARDERO ST', 'BIDWELL ST',
    'DENMAN ST', 'GILFORD ST', 'CHILCO ST', 'DUNSMUIR ST', 'W GEORGIA ST', 'MELVILLE ST', 'ALBERNI ST', 'ROBSON ST',
    'HARO ST', 'BARCLAY ST', 'SMITHE ST', 'NELSON ST', 'COMOX ST', 'PENDRELL ST', 'HELMCKEN ST', 'DAVIE ST',
    'DRAKE ST', 'BURNABY ST', 'HARWOOD ST', 'PACIFIC ST',
}
NORTH_OF_FALSE_CREEK = 49.2705


def main(out):
    streets = json.load(open('public/data/district/dtes-streets.json'))
    terrain = json.load(open('public/data/district/dtes-terrain.json'))
    land = json.load(open('public/data/district/land-1880s.json'))
    lon0, lat0, lon1, lat1 = terrain['bbox']
    nx, ny = land['nx'], land['ny']
    rows = []
    for runs in land['rows']:
        row, x, on = bytearray(nx), 0, False
        for n in runs:
            if on:
                row[x:x + n] = b'\x01' * min(n, nx - x)
            x += n
            on = not on
        rows.append(row)

    def on_land(lon, lat):
        i, j = int((lon - lon0) / (lon1 - lon0) * nx), int((lat - lat0) / (lat1 - lat0) * ny)
        return 0 <= i < nx and 0 <= j < ny and rows[j][i] == 1

    kept = []
    for seg in streets['segments']:
        name = re.sub(r'^[\d\-/ ]+', '', seg['h']).strip()
        if name not in ON_1887_MAP:
            continue
        c = seg['c']
        mid = [(c[0][0] + c[-1][0]) / 2, (c[0][1] + c[-1][1]) / 2]
        if min(p[1] for p in c) < NORTH_OF_FALSE_CREEK:
            continue
        if not all(on_land(*p) for p in (c[0], mid, c[-1])):
            continue
        kept.append([[round(lon, 6), round(lat, 6)] for lon, lat in c])
    edges = outline(kept, on_land)
    json.dump({
        'source': 'Streets on the 1887 Ross and Ceperley map of the Canadian Pacific townsite (City of Vancouver Archives, MAP 33), drawn on the City of Vancouver open data street centrelines where they lay on 1880s land. Made by scripts/build-streets-1887.py.',
        'lines': kept,
        'edges': edges,
    }, open(out, 'w'))
    print(f'{len(kept)} street pieces kept, {len(edges)} edge pieces')


def outline(lines, on_land):
    """The streets' edges, each cut where it enters another street or the water."""
    lat0 = 49.28
    kx, ky = 111_320 * math.cos(math.radians(lat0)), 111_200
    lon_ref = -123.1
    to_m = lambda p: ((p[0] - lon_ref) * kx, (p[1] - lat0) * ky)
    to_ll = lambda q: [round(q[0] / kx + lon_ref, 6), round(q[1] / ky + lat0, 6)]
    segs = []   # (ax, ay, bx, by, line index)
    for k, line in enumerate(lines):
        m = [to_m(p) for p in line]
        for a, b in zip(m, m[1:]):
            segs.append((a[0], a[1], b[0], b[1], k))
    # a coarse grid of the segments, so each test only looks at its neighbours
    CELL = 40.0
    grid = {}
    for idx, (ax, ay, bx, by, _k) in enumerate(segs):
        for gx in range(int(min(ax, bx) // CELL) - 1, int(max(ax, bx) // CELL) + 2):
            for gy in range(int(min(ay, by) // CELL) - 1, int(max(ay, by) // CELL) + 2):
                grid.setdefault((gx, gy), []).append(idx)

    def inside_other(x, y, own):
        for idx in grid.get((int(x // CELL), int(y // CELL)), ()):
            if idx in own:
                continue
            ax, ay, bx, by, _k = segs[idx]
            dx, dy = bx - ax, by - ay
            t = max(0.0, min(1.0, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy or 1)))
            if math.hypot(x - ax - dx * t, y - ay - dy * t) < HALF - 0.3:
                return True
        return False

    out = []
    for k, line in enumerate(lines):
        m = [to_m(p) for p in line]
        own = {i for i, sg in enumerate(segs) if sg[4] == k}
        for side in (1, -1):
            run = []
            for a, b in zip(m, m[1:]):
                dx, dy = b[0] - a[0], b[1] - a[1]
                length = math.hypot(dx, dy)
                if not length:
                    continue
                nx, ny = -dy / length * side * HALF, dx / length * side * HALF
                n = max(1, int(length / STEP))
                for s_ in range(n + 1):
                    x, y = a[0] + dx * s_ / n + nx, a[1] + dy * s_ / n + ny
                    ll = to_ll((x, y))
                    if inside_other(x, y, own) or not on_land(*ll):
                        if len(run) > 1:
                            out.append(run)
                        run = []
                    else:
                        if not run or run[-1] != ll:
                            run.append(ll)
            if len(run) > 1:
                out.append(run)
    # keep only the ends of each straight run
    simple = []
    for run in out:
        keep = [run[0]]
        for i in range(1, len(run) - 1):
            (ax, ay), (bx, by), (cx, cy) = to_m(keep[-1]), to_m(run[i]), to_m(run[i + 1])
            cross = abs((bx - ax) * (cy - ay) - (by - ay) * (cx - ax)) / (math.hypot(cx - ax, cy - ay) or 1)
            if cross > 0.4:
                keep.append(run[i])
        keep.append(run[-1])
        if math.dist(to_m(keep[0]), to_m(keep[-1])) > 3:
            simple.append(keep)
    return simple


main(sys.argv[1])
