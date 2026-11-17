"""
The parts of the three Expo landmarks, from the City's 2009 building footprints.

The City's 'Building Footprints 2009' dataset (building-footprints-2009) draws each building as the parts
of its roof, each with its own LiDAR height and roof type. The project's footprints.json keeps only the
outline of each building; this keeps the parts, for Science World, Canada Place and BC Place: every part
of the building whose outline is the landmark's footprint in landmarks.json, by its bldgid.

The 2009 LiDAR predates BC Place's new roof of 2011, so its dome part is still the air-supported roof of
1983. Canada Place's parts include the Pan Pacific hotel and the office tower at its shore end, both of
1986, and the convention centre's later additions.

Writes src/lib/data/expoParts.json: { key: [{ ring, h, roof }] }

Usage: python3 scripts/build-expo-parts.py <cache folder> src/lib/data/expoParts.json
"""
import json
import os
import sys
import urllib.parse
import urllib.request

API = 'https://opendata.vancouver.ca/api/explore/v2.1/catalog/datasets/building-footprints-2009/exports/geojson'
BOXES = {
    'science-world': (49.2722, -123.1052, 49.2746, -123.1023),
    'canada-place': (49.2870, -123.1130, 49.2905, -123.1070),
    'bc-place': (49.2752, -123.1145, 49.2775, -123.1098),
}


def inside(x, y, r):
    c = False
    for k in range(len(r)):
        (x1, y1), (x2, y2) = r[k], r[k - 1]
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
            c = not c
    return c


def main(cache, out):
    os.makedirs(cache, exist_ok=True)
    landmarks = json.load(open('src/lib/data/landmarks.json'))
    result = {}
    for key, (s, w, n, e) in BOXES.items():
        path = os.path.join(cache, f'{key}.geojson')
        if not os.path.exists(path):
            url = f'{API}?{urllib.parse.urlencode({"where": f"in_bbox(geom, {s}, {w}, {n}, {e})"})}'
            open(path, 'wb').write(urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'research-map/0.1'}), timeout=120).read())
        feats = json.load(open(path))['features']
        main_ring = landmarks[key]['parts'][0]['ring']
        # the building is the bldgid most of whose parts fall inside the landmark's outline
        votes = {}
        for f in feats:
            g = f['geometry']['coordinates'][0]
            cx = sum(p[0] for p in g) / len(g)
            cy = sum(p[1] for p in g) / len(g)
            if inside(cx, cy, main_ring):
                votes[f['properties']['bldgid']] = votes.get(f['properties']['bldgid'], 0) + 1
        bid = max(votes, key=votes.get)
        parts = []
        for f in feats:
            if f['properties']['bldgid'] != bid:
                continue
            g = f['geometry']['coordinates'][0]
            if g[0] == g[-1]:
                g = g[:-1]
            parts.append({'ring': [[round(x, 6), round(y, 6)] for x, y in g], 'h': round(f['properties']['hgt_agl'], 1), 'roof': f['properties']['rooftype']})
        result[key] = parts
        print(key, len(parts), 'parts')
    json.dump({'source': "The City of Vancouver's 'Building Footprints 2009' (building-footprints-2009): each landmark's roof parts with their LiDAR heights and roof types. Made by scripts/build-expo-parts.py.", **result}, open(out, 'w'), separators=(',', ':'))


main(*sys.argv[1:3])
