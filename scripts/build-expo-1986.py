"""
Expo 86 and the city around it in 1986, from OpenHistoricalMap.

OpenHistoricalMap (openhistoricalmap.org, data CC0) has the fair mapped as its mappers reconstructed it:
the six colour zones, the pavilions and their names, the monorail and the people mover, the gondolas, all
dated 2 May to 13 October 1986. It also dates the SkyTrain's first line (11 December 1985), the new Cambie
Bridge (8 December 1985), Pacific Boulevard (1985) and the other roads of the time. This takes, within the
map's extent:

  zones      the fair's zone outlines (leisure areas dated to the fair)
  pavilions  the buildings dated to the fair, with their names
  movers     the monorail, the people mover and the gondolas
  skytrain   the SkyTrain's track valid in 1986, marked where it runs in tunnel
  roads      the major roads valid in 1986 (trunk, primary, secondary), marked where they are bridges

Its dates and shapes are its mappers'; they are a reconstruction from site plans and photographs, not a
survey, and the project has not checked them pavilion by pavilion.

Usage: python3 scripts/build-expo-1986.py <cache json> src/lib/data/expo1986.json
"""
import json
import os
import sys
import urllib.parse
import urllib.request

OVERPASS = 'https://overpass-api.openhistoricalmap.org/api/interpreter'
BOX = '49.258,-123.14,49.295,-123.05'
QUERY = f'''[out:json][timeout:180];
(
  way["start_date"~"^1986-05"]({BOX});
  relation["start_date"~"^1986-05"]({BOX});
  way["railway"]({BOX});
  way["highway"~"^(motorway|trunk|primary|secondary)$"]({BOX});
);
out tags geom;'''


def year(s):
    try:
        return float(str(s)[:4]) + (0.5 if len(str(s)) > 4 else 0)
    except (TypeError, ValueError):
        return None


def valid_1986(t):
    s, e = year(t.get('start_date')), year(t.get('end_date'))
    return (s is None or s <= 1986.5) and (e is None or e > 1986.5)


def pts(w):
    return [[round(p['lon'], 6), round(p['lat'], 6)] for p in w.get('geometry', []) if p]


def main(cache, out):
    if not os.path.exists(cache):
        req = urllib.request.Request(OVERPASS, data=urllib.parse.urlencode({'data': QUERY}).encode(), headers={'User-Agent': 'research-map/0.1'})
        open(cache, 'wb').write(urllib.request.urlopen(req, timeout=240).read())
    els = json.load(open(cache))['elements']
    zones, pavilions, movers, skytrain, roads = [], [], [], [], []
    for e in els:
        t = e.get('tags', {})
        if e['type'] != 'way':
            continue
        g = pts(e)
        if len(g) < 2:
            continue
        fair = str(t.get('start_date', '')).startswith('1986-05')
        if str(t.get('start_date', '')).startswith('1986') and (t.get('landuse') == 'recreation_ground' or t.get('leisure') in ('recreation_ground', 'park')) and 'Zone' in t.get('name', '') and g[0] == g[-1]:
            zones.append({'name': t.get('name', ''), 'ring': g[:-1]})
        elif fair and t.get('building') and g[0] == g[-1]:
            pavilions.append({'name': t.get('name', ''), 'ring': g[:-1], 'levels': t.get('building:levels')})
        elif fair and (t.get('railway') in ('monorail', 'rail', 'funicular') or t.get('aerialway')):
            movers.append({'name': t.get('name', ''), 'line': g, 'kind': t.get('aerialway') and 'gondola' or t.get('railway')})
        elif t.get('railway') in ('subway', 'light_rail') and valid_1986(t) and (year(t.get('start_date')) or 0) >= 1983:
            skytrain.append({'line': g, 'tunnel': t.get('tunnel') == 'yes' or t.get('layer', '0').startswith('-')})
        elif t.get('highway') in ('motorway', 'trunk', 'primary', 'secondary') and valid_1986(t):
            roads.append({'name': t.get('name', ''), 'line': g, 'bridge': t.get('bridge') == 'yes' or t.get('bridge') == 'viaduct', 'since': t.get('start_date')})
    data = {'source': "OpenHistoricalMap (openhistoricalmap.org), CC0: the Expo 86 grounds as its mappers reconstructed them, and the SkyTrain and major roads valid in 1986. Made by scripts/build-expo-1986.py.",
            'zones': zones, 'pavilions': pavilions, 'movers': movers, 'skytrain': skytrain, 'roads': roads}
    json.dump(data, open(out, 'w'), separators=(',', ':'))
    print(len(zones), 'zones,', len(pavilions), 'pavilions,', len(movers), 'movers,', len(skytrain), 'SkyTrain ways (', sum(1 for s in skytrain if s['tunnel']), 'in tunnel),', len(roads), 'roads (', sum(1 for r in roads if r['bridge']), 'bridges )')
    print(sorted({z['name'] for z in zones}))


main(*sys.argv[1:3])
