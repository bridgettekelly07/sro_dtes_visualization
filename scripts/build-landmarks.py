"""
Buildings from the hotel-boom years that still stand, raised from today's footprints.

Footprints are the City of Vancouver's building footprints (public/data/district/footprints.json),
picked by hand at each address; heights are the City's 2009 LiDAR unless noted.

  Carnegie Library, 401 Main Street, 1903: the footprint at the south-west corner of Main and Hastings.
  Woodward's, 101 West Hastings Street, 1903: the three footprints at the south-west corner of Abbott
    and Hastings, standing in for the first store, which the later store grew around.
  BC Electric Railway terminal, 425 Carrall Street, 1911: the footprint at the south-west corner of
    Carrall and Hastings. Its LiDAR height (5.7 m) is not the building's; it is drawn at six storeys,
    about 24 m, as the heritage register describes it.

Usage: python3 scripts/build-landmarks.py src/lib/data/landmarks.json
"""
import json
import sys

PICK = {
    'carnegie': {'name': 'Carnegie Library', 'rings': [4397]},
    'woodwards': {'name': "Woodward's", 'rings': [2545, 4996, 1909]},
    'bcer': {'name': 'BC Electric Railway terminal', 'rings': [4675], 'h': 24},
}

d = json.load(open('public/data/district/footprints.json'))
ox, oy = d['origin']
sc = d['scale']


def ring(i):
    r = d['rings'][i]
    x, y = r[0], r[1]
    pts = [(x, y)]
    for k in range(2, len(r), 2):
        x += r[k]
        y += r[k + 1]
        pts.append((x, y))
    return [[round(ox + a * sc, 6), round(oy + b * sc, 6)] for a, b in pts]


out = {}
for key, spec in PICK.items():
    parts = [{'kind': 'prism', 'x': 0, 'y': 0, 'ring': ring(i), 'h': spec.get('h', d['heights'][i])} for i in spec['rings']]
    pts = [p for part in parts for p in part['ring']]
    out[key] = {'name': spec['name'], 'lon': round(sum(p[0] for p in pts) / len(pts), 6), 'lat': round(sum(p[1] for p in pts) / len(pts), 6), 'parts': parts}
json.dump(out, open(sys.argv[1], 'w'))
print({k: (v['lon'], v['lat']) for k, v in out.items()})
