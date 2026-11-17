"""
A year built for each building in Goad's 1912 atlas (src/lib/data/goad1912.json), where one is recorded.

  City of Vancouver Open Data, 'Property tax report' (property-tax-report), field year_built, for the
  2025 assessment year, joined to 'Property parcel polygons' (property-parcel-polygons) by the
  property's land coordinate (tax_coord).

A footprint takes the year of the lot its middle stands on, if that lot's building today is recorded as
built in 1912 or before: the building the atlas draws is then, most likely, the one still standing.
Where several properties share a lot (a strata), the earliest year is kept. Footprints on lots whose
building today is later, or which have no year, are left undated (null): the 1912 building has gone and
its year is not in the record. BC Assessment's year built is the original construction year for most
old buildings, but some carry a rounded or estimated year (1901, 1905 and 1910 are over-represented).

Output, in the same order as goad1912.json: { brick: [year or null, ...], frame: [...] }

Usage: python3 scripts/build-goad-years.py <cache folder> src/lib/data/goad1912Years.json
"""
import json
import os
import sys
import urllib.parse
import urllib.request

API = 'https://opendata.vancouver.ca/api/explore/v2.1/catalog/datasets'
W, E, S, N = -123.1370, -123.0690, 49.2655, 49.2935


def fetch(path, params, out):
    if not os.path.exists(out):
        url = f'{API}/{path}?{urllib.parse.urlencode(params)}'
        req = urllib.request.Request(url, headers={'User-Agent': 'research-map/0.1'})
        open(out, 'wb').write(urllib.request.urlopen(req, timeout=300).read())
    return json.load(open(out))


def inside(x, y, ring):
    c = False
    for k in range(len(ring)):
        (x1, y1), (x2, y2) = ring[k], ring[k - 1]
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
            c = not c
    return c


def main(cache, out):
    os.makedirs(cache, exist_ok=True)
    parcels = fetch('property-parcel-polygons/exports/geojson', {'where': f'in_bbox(geom, {S}, {W}, {N}, {E})'}, os.path.join(cache, 'parcels-goad.geojson'))['features']
    years = ','.join(f'"{y}"' for y in range(1860, 1913))
    tax = fetch('property-tax-report/exports/json', {
        'where': f'year_built in ({years}) and tax_assessment_year="2025"',
        'select': 'land_coordinate,year_built',
    }, os.path.join(cache, 'tax-by-1912.json'))
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
    goad = json.load(open('src/lib/data/goad1912.json'))
    result = {}
    for kind in ('brick', 'frame'):
        out_years = []
        for ring in goad[kind]:
            x = sum(p[0] for p in ring) / len(ring)
            y = sum(p[1] for p in ring) / len(ring)
            year = None
            for r, yy, a, b, c, d in lots:
                if a <= x <= b and c <= y <= d and inside(x, y, r):
                    year = yy
                    break
            out_years.append(year)
        result[kind] = out_years
    dated = sum(1 for k in result for y in result[k] if y)
    total = sum(len(result[k]) for k in result)
    print(f'{dated} of {total} footprints dated, {sum(1 for k in result for y in result[k] if y and y <= 1903)} by 1903')
    json.dump({'source': "Year built from the City of Vancouver property tax report (2025), by the lot each footprint of Goad's 1912 atlas stands on; null where the lot's building today is later than 1912 or has no year. Made by scripts/build-goad-years.py.", **result}, open(out, 'w'), separators=(',', ':'))


main(*sys.argv[1:3])
