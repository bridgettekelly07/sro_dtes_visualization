"""
The streets of 1985 and 1986, as centrelines to fill in white on the chapter 5 cards.

Today's street centrelines (public/data/district/dtes-streets.json, City of Vancouver Open Data) stand in
for the streets of the time almost everywhere: the grid was laid out long before. Two kinds are left out:

  the bridges and viaducts, which the map models as decks; and
  the streets on the north shore of False Creek between the Granville Bridge and Main Street, south of
  the old yards' edge, which were laid out after the fair on its grounds.

On that shore the major roads OpenHistoricalMap dates to 1986 (src/lib/data/expo1986.json: Pacific
Boulevard of 1985 and the like) are drawn instead.

Usage: python3 scripts/build-streets-1986.py src/lib/data/streets1986.json
"""
import json
import re
import sys

BRIDGE = re.compile(r'BRIDGE|VIADUCT')


def after_fair(lon, lat):
    # the fair's grounds on the north shore of False Creek, rebuilt after 1986
    if -123.1280 < lon < -123.1120:
        return 49.2690 < lat < 49.2745
    if -123.1120 <= lon < -123.1010:
        return 49.2690 < lat < 49.2765
    return False


streets = json.load(open('public/data/district/dtes-streets.json'))['segments']
expo = json.load(open('src/lib/data/expo1986.json'))
lines = []
for s in streets:
    c = s['c']
    if BRIDGE.search(s.get('h') or ''):
        continue
    mid = c[len(c) // 2]
    if after_fair(*mid) or after_fair(*c[0]) and after_fair(*c[-1]):
        continue
    lines.append([[round(x, 6), round(y, 6)] for x, y in c])
kept = len(lines)
for r in expo['roads']:
    if r['bridge']:
        continue
    pts = [p for p in r['line'] if after_fair(*p)]
    if len(pts) >= 2:
        lines.append(r['line'])
json.dump({'source': "Today's street centrelines (City of Vancouver Open Data) less the bridges and the streets laid out on the fair's grounds after 1986, with OpenHistoricalMap's major roads of 1986 there instead. Made by scripts/build-streets-1986.py.", 'lines': lines}, open(sys.argv[1], 'w'), separators=(',', ':'))
print(kept, 'of today\'s segments kept,', len(lines) - kept, 'roads of 1986 on the fair\'s grounds')
