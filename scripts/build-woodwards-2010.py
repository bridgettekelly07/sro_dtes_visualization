"""
The Woodward's redevelopment of 2010, from the City's 2009 building footprints.

The City's 'Building Footprints 2009' dataset (building-footprints-2009) draws each building as the parts
of its roof, each with its own LiDAR height. The 2009 survey caught the redevelopment with its towers up,
a year before it opened. This keeps every roof part of the buildings on the store's block, north of
Hastings between Abbott and Cambie, east of the block's older buildings on the Cambie side: the two
towers (bldgid 146601, the taller, and 146466), the buildings along Hastings (146384) and the building
at the corner of Hastings and Abbott (145980).

Which part is the store's retained corner of 1903 to 1908 is not marked in the data. The heights are the
LiDAR's of 2009, so anything unfinished then is as it stood.

Writes src/lib/data/woodwards2010.json: { parts: [{ ring, h, bldg }] }

Usage: python3 scripts/build-woodwards-2010.py <cache folder> src/lib/data/woodwards2010.json
"""
import json
import os
import sys
import urllib.parse
import urllib.request

API = 'https://opendata.vancouver.ca/api/explore/v2.1/catalog/datasets/building-footprints-2009/exports/geojson'
BLDGS = {146601, 146466, 146384, 145980}


def main(cache, out):
    os.makedirs(cache, exist_ok=True)
    path = os.path.join(cache, 'building-footprints-2009.geojson')
    if not os.path.exists(path):
        url = f'{API}?{urllib.parse.urlencode({"where": "in_bbox(geom, 49.2819, -123.1098, 49.2832, -123.1068)"})}'
        open(path, 'wb').write(urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'research-map/0.1'}), timeout=120).read())
    parts = []
    for f in json.load(open(path))['features']:
        p = f['properties']
        if int(p['bldgid']) not in BLDGS:
            continue
        g = f['geometry']['coordinates'][0]
        if f['geometry']['type'] == 'MultiPolygon':
            g = g[0]
        if g[0] == g[-1]:
            g = g[:-1]
        parts.append({'ring': [[round(x, 6), round(y, 6)] for x, y in g], 'h': round(p['hgt_agl'], 1), 'bldg': int(p['bldgid'])})
    parts.sort(key=lambda q: q['h'])
    json.dump({'source': "The City of Vancouver's 'Building Footprints 2009' (building-footprints-2009): the roof parts of the Woodward's redevelopment with their LiDAR heights. Made by scripts/build-woodwards-2010.py.", 'parts': parts}, open(out, 'w'), separators=(',', ':'))
    print(len(parts), 'parts; tallest', max(q['h'] for q in parts), 'm')


main(*sys.argv[1:3])
