"""
Parcel outlines around Hastings Street, for the cards before Goad's 1912 atlas.

The lots laid out in the surveys of the 1870s and 1880s, most of them 25 feet wide, still largely
divide the district; many have since been joined into bigger sites. These are today's parcels, from
City of Vancouver Open Data, 'Property parcel polygons' (property-parcel-polygons), kept only where
they lie on the 1880s land (public/data/district/land-1880s.json), so nothing on later fill is drawn.

Usage: python3 scripts/build-parcels.py <parcels.geojson> src/lib/data/parcelsHastings.json
"""
import json
import sys

src = json.load(open(sys.argv[1]))
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


out = []
for f in src['features']:
    g = f['geometry']
    polys = [g['coordinates']] if g['type'] == 'Polygon' else g['coordinates']
    for poly in polys:
        ring = poly[0]
        cx = sum(p[0] for p in ring) / len(ring)
        cy = sum(p[1] for p in ring) / len(ring)
        if on_land(cx, cy):
            out.append([[round(p[0], 6), round(p[1], 6)] for p in ring])
json.dump({'source': "City of Vancouver Open Data, 'Property parcel polygons', on the 1880s land. Made by scripts/build-parcels.py.", 'rings': out}, open(sys.argv[2], 'w'))
print(len(out), 'parcels')
