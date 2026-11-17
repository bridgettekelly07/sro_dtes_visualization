"""Turn the Canadian Hydrographic Service's sea-bed survey into depth contours for the map.

Source: Canadian Hydrographic Service Non-Navigational (NONNA) Bathymetric Data, 10 m product,
Open Government Licence - Canada. Not to be used for navigation. Fetched from the service's
Web Coverage Service as a text grid:

  https://nonna-geoserver.data.chs-shc.ca/geoserver/wcs?service=WCS&version=2.0.1&request=GetCoverage
    &coverageId=nonna__NONNA 10 Coverage
    &subset=X(-13710665.08,-13696750.15)&subset=Y(6317729.20,6326772.87)&format=text/plain

The subset is the map's extent (longitude -123.165 to -123.04, latitude 49.252 to 49.305) in Web
Mercator. Values are heights in metres, so depths are negative; cells with no survey hold a very
large number.

Method: the grid is smoothed a little (the raw soundings are noisy), then a line is traced at each
depth in LEVELS by marching squares, and the pieces are joined into continuous lines.

Usage: python3 scripts/build-depth-contours.py <depth.asc> public/data/district/depth-contours.json
"""
import json
import math
import re
import sys

LEVELS = [-2, -5, -10, -15, -20, -30, -40, -50, -60]   # metres; negative is below the water
SMOOTH_PASSES = 2
MIN_POINTS = 8          # drop specks
R = 20037508.342789244  # half the width of the Web Mercator world, in metres


def to_lonlat(x, y):
    return (x / R * 180, math.degrees(2 * math.atan(math.exp(y / R * math.pi)) - math.pi / 2))


def main(src, dst):
    text = open(src).read()
    cols, rows = map(int, re.search(r"GridEnvelope2D\[1\.\.(\d+), 1\.\.(\d+)\]", text).groups())
    p = {k: float(v) for k, v in re.findall(r'PARAMETER\["(elt_\d_\d)", ([-\d.E]+)\]', text)}
    dx, x0, dy, y0 = p["elt_0_0"], p["elt_0_2"], p["elt_1_1"], p["elt_1_2"]   # cell (c, r) is at x0 + c*dx, y0 + r*dy
    values = [float(v) for v in text.split("Band 0:")[1].split()]
    assert len(values) == cols * rows, (len(values), cols, rows)
    grid = [[None if v > 1e30 else v for v in values[r * cols:(r + 1) * cols]] for r in range(rows)]
    known = [v for row in grid for v in row if v is not None]
    print(f"{cols} x {rows} cells; {len(known) / (cols * rows):.0%} surveyed; depths {min(known):.1f} to {max(known):.1f} m")

    for _ in range(SMOOTH_PASSES):   # average each cell with its surveyed neighbours
        out = [row[:] for row in grid]
        for r in range(rows):
            for c in range(cols):
                if grid[r][c] is None:
                    continue
                near = [grid[rr][cc] for rr in (r - 1, r, r + 1) for cc in (c - 1, c, c + 1)
                        if 0 <= rr < rows and 0 <= cc < cols and grid[rr][cc] is not None]
                out[r][c] = sum(near) / len(near)
        grid = out

    lines = []
    for level in LEVELS:
        # each crossing sits on a grid edge, named by the cell and whether the edge runs across or down
        links = {}
        def crossing(r, c, across):
            a = grid[r][c]
            b = grid[r][c + 1] if across else grid[r + 1][c]
            t = (level - a) / (b - a)
            return ((r, c, across), (c + t, r) if across else (c, r + t))
        for r in range(rows - 1):
            for c in range(cols - 1):
                a, b, cc, d = grid[r][c], grid[r][c + 1], grid[r + 1][c + 1], grid[r + 1][c]
                if None in (a, b, cc, d):
                    continue
                pts = []
                if (a < level) != (b < level): pts.append(crossing(r, c, True))
                if (b < level) != (cc < level): pts.append(crossing(r, c + 1, False))
                if (d < level) != (cc < level): pts.append(crossing(r + 1, c, True))
                if (a < level) != (d < level): pts.append(crossing(r, c, False))
                for k in range(0, len(pts) - 1, 2):
                    (ka, pa), (kb, pb) = pts[k], pts[k + 1]
                    links.setdefault(ka, []).append((kb, pa, pb))
                    links.setdefault(kb, []).append((ka, pb, pa))
        # join the pieces end to end
        used = set()
        def walk(start):
            chain, key = [], start
            while True:
                step = next(((nk, pa, pb) for nk, pa, pb in links.get(key, []) if frozenset((key, nk)) not in used), None)
                if step is None:
                    return chain
                nk, pa, pb = step
                used.add(frozenset((key, nk)))
                if not chain:
                    chain.append(pa)
                chain.append(pb)
                key = nk
        ends = [k for k, v in links.items() if len(v) == 1]
        for start in ends + list(links):
            chain = walk(start)
            if len(chain) >= MIN_POINTS:
                lines.append({"z": level, "pts": [[round(v, 6) for v in to_lonlat(x0 + (c + 0.5) * dx, y0 + (r + 0.5) * dy)] for c, r in chain[::2] + chain[-1:]]})
        print(f"  {level:>4} m: {sum(1 for l in lines if l['z'] == level)} lines")

    out = {
        "source": "Canadian Hydrographic Service, NONNA-10 bathymetric data, Open Government Licence - Canada. Not for navigation.",
        "levels": LEVELS,
        "lines": lines,
    }
    json.dump(out, open(dst, "w"), separators=(",", ":"))
    print(len(lines), "lines,", sum(len(l["pts"]) for l in lines), "points")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
