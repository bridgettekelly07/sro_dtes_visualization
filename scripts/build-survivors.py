"""
The buildings standing today that were already standing by 1972, from today's footprints.

For the years after Goad's 1912 atlas there is no map of every building in the project, so the later
chapters draw the city from the other end: today's building footprints (public/data/district/footprints.json,
with 2009 LiDAR heights), keeping only those on lots whose building the City's property records date to
1972 or before. These are the survivors: what stood then and still stands. Buildings of those years that
have since been demolished are missing, so the city is drawn emptier than it was, and the notes say so.

A footprint takes the year of the lot its middle stands on (the earliest, where several properties share
a lot). Lots whose record is later than 1972, or missing, give nothing.

Parcels: property-parcel-polygons and the property tax report, as fetched by build-goad-years.py and this
script into the cache folder.

Writes src/lib/data/builtBy1972.json: { buildings: [{ ring, h, built }] }

With `wide` as a fourth argument, the parcels are fetched over the whole map extent (parcels-wide.geojson)
and the context footprints beyond the surveyed extent (public/data/district/dtes-context.json, the 2009
footprints) are dated too, so the city reaches the edges of the map: chapter 5 uses this.

Usage: python3 scripts/build-survivors.py <cache folder> src/lib/data/builtBy1972.json [last year, default 1972] [wide]
"""
import json
import os
import sys
import urllib.parse
import urllib.request

API = 'https://opendata.vancouver.ca/api/explore/v2.1/catalog/datasets'


def fetch(path, params, out):
    if not os.path.exists(out):
        url = f'{API}/{path}?{urllib.parse.urlencode(params)}'
        req = urllib.request.Request(url, headers={'User-Agent': 'research-map/0.1'})
        open(out, 'wb').write(urllib.request.urlopen(req, timeout=600).read())
    return json.load(open(out))


def inside(x, y, ring):
    c = False
    for k in range(len(ring)):
        (x1, y1), (x2, y2) = ring[k], ring[k - 1]
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
            c = not c
    return c


def main(cache, out, last='1972', wide=''):
    last = int(last)
    if wide:
        parcels = fetch('property-parcel-polygons/exports/geojson', {'where': 'in_bbox(geom, 49.252, -123.165, 49.305, -123.04)'}, os.path.join(cache, 'parcels-wide.geojson'))['features']
    else:
        parcels = json.load(open(os.path.join(cache, 'parcels-goad.geojson')))['features']
    years = ','.join(f'"{y}"' for y in range(1860, last + 1))
    tax = fetch('property-tax-report/exports/json', {
        'where': f'year_built in ({years}) and tax_assessment_year="2025"',
        'select': 'land_coordinate,year_built',
    }, os.path.join(cache, f'tax-by-{last}.json'))
    built = {}
    for r in tax:
        y, c = int(r['year_built']), r['land_coordinate']
        built[c] = min(y, built.get(c, 9999))
    lots = []
    for f in parcels:
        y = built.get(f['properties']['tax_coord'])
        if y is None:
            continue
        g = f['geometry']
        rings = [g['coordinates'][0]] if g['type'] == 'Polygon' else [p[0] for p in g['coordinates']]
        for r in rings:
            xs, ys = [p[0] for p in r], [p[1] for p in r]
            lots.append((r, y, min(xs), max(xs), min(ys), max(ys)))
    sources = ['public/data/district/footprints.json'] + (['public/data/district/dtes-context.json'] if wide else [])
    found = []
    # the lots in a coarse grid, so each footprint looks only at the lots near it
    grid = {}
    for lot in lots:
        for gx in range(int(lot[2] * 500), int(lot[3] * 500) + 1):
            for gy in range(int(lot[4] * 500), int(lot[5] * 500) + 1):
                grid.setdefault((gx, gy), []).append(lot)
    for src in sources:
        found += dated(json.load(open(src)), grid)
    found.sort(key=lambda b: b['built'])
    json.dump({'source': f"Today's building footprints (City of Vancouver Open Data, LiDAR heights){' over the whole map extent' if wide else ''} on lots whose building the City's property tax report dates to {last} or before. Made by scripts/build-survivors.py.", 'buildings': found}, open(out, "w"), separators=(",", ":"))
    print(len(found), f'buildings standing today were built by {last};', sum(1 for b in found if b['built'] <= 1950), 'by 1950')


def dated(fp, grid):
    ox, oy = fp['origin']
    sc = fp['scale']
    heights = fp['heights']
    found = []
    for i, enc in enumerate(fp['rings']):
        x, y = enc[0], enc[1]
        pts = [(x, y)]
        for k in range(2, len(enc), 2):
            x += enc[k]
            y += enc[k + 1]
            pts.append((x, y))
        ring = [[round(ox + a * sc, 6), round(oy + b * sc, 6)] for a, b in pts]
        cx = sum(p[0] for p in ring) / len(ring)
        cy = sum(p[1] for p in ring) / len(ring)
        year = None
        for r, yy, a, b, c, d in grid.get((int(cx * 500), int(cy * 500)), []):
            if a <= cx <= b and c <= cy <= d and inside(cx, cy, r):
                year = yy
                break
        if year is None:
            continue
        h = heights[i]
        found.append({'ring': ring, 'h': round(h, 1) if h else 8, 'built': year})
    return found


main(*sys.argv[1:5])
