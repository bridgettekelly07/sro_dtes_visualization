"""
Buildings from the hotel-boom years that still stand, raised from today's footprints.

Footprints are the City of Vancouver's building footprints (public/data/district/footprints.json),
picked by hand at each address; heights are the City's 2009 LiDAR unless noted.

  Carnegie Library, 401 Main Street, 1903: the footprint at the south-west corner of Main and Hastings.
  Woodward's, 101 West Hastings Street, 1903: the store stood on the block north of Hastings between
    Abbott and Cambie, and was demolished in 2006 but for its oldest corner, so today's footprint there
    is the redevelopment of 2010. It is drawn instead from Goad's 1912 atlas (src/lib/data/goad1912.json):
    the large brick building on that block, the store as it stood in 1912 after its first additions, at
    an assumed 20 m. (An earlier version picked three footprints on the south side of Hastings by mistake.)
  BC Electric Railway terminal, 425 Carrall Street, 1911: the footprint at the south-west corner of
    Carrall and Hastings. Its LiDAR height (5.7 m) is not the building's; it is drawn at six storeys,
    about 24 m, as the heritage register describes it.
  Central library, 750 Burrard Street (969 Robson), 1957: the footprint at the north-west corner of Burrard
    and Robson, on a lot the property records date to 1956, at its 2009 LiDAR height, which includes the
    additions made when the library moved out in 1995.
  Canadian Northern station (Pacific Central), 1150 Station Street, 1919: the footprint of the station on
    the False Creek flats, at its 2009 LiDAR height, which is the mean over the roof and lower than the
    central hall.

Usage: python3 scripts/build-landmarks.py src/lib/data/landmarks.json
"""
import json
import sys

PICK = {
    'carnegie': {'name': 'Carnegie Library', 'rings': [4397]},
    'woodwards': {'name': "Woodward's", 'goad': [-123.10834, 49.28250], 'h': 20},
    'bcer': {'name': 'BC Electric Railway terminal', 'rings': [4675], 'h': 24},
    'cn-station': {'name': 'Canadian Northern station', 'rings': [4430]},
    'library-1957': {'name': 'Central library, 1957', 'rings': [2387]},
    'science-world': {'name': 'Expo Centre (Science World), 1986', 'rings': [4760]},
    'canada-place': {'name': 'Canada Place, the Canada Pavilion, 1986', 'rings': [861]},
    'bc-place': {'name': 'BC Place stadium, 1983', 'rings': [568]},
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


goad = json.load(open('src/lib/data/goad1912.json'))['brick']


def goad_ring(lon, lat):
    # the atlas's brick building whose middle is nearest the point
    def far(r):
        return ((sum(p[0] for p in r) / len(r) - lon) * 72600) ** 2 + ((sum(p[1] for p in r) / len(r) - lat) * 111200) ** 2
    return min(goad, key=far)


out = {}
for key, spec in PICK.items():
    if 'goad' in spec:
        r = goad_ring(*spec['goad'])
        out[key] = {'name': spec['name'], 'lon': round(sum(p[0] for p in r) / len(r), 6), 'lat': round(sum(p[1] for p in r) / len(r), 6), 'parts': [{'kind': 'prism', 'x': 0, 'y': 0, 'ring': r, 'h': spec['h']}]}
        continue
    parts = [{'kind': 'prism', 'x': 0, 'y': 0, 'ring': ring(i), 'h': spec.get('h', d['heights'][i])} for i in spec['rings']]
    pts = [p for part in parts for p in part['ring']]
    out[key] = {'name': spec['name'], 'lon': round(sum(p[0] for p in pts) / len(pts), 6), 'lat': round(sum(p[1] for p in pts) / len(pts), 6), 'parts': parts}
json.dump(out, open(sys.argv[1], 'w'))
print({k: (v['lon'], v['lat']) for k, v in out.items()})
