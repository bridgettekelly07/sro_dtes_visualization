"""
Today's SRO buildings with the year each was built, for raising them on the map in order.

Joins three files already in the project:
  public/data/district/sro-buildings.json  the 2024 SRO Tenant Survey's list (Appendix B), with parcels
  public/data/district/sro-massing.json    each building's parts: footprint and LiDAR height
  public/data/district/sro-years.json      year built, from the City's property tax report
                                           (scripts/fetch-sro-years.py)

Usage: python3 scripts/build-sro-years.py src/lib/data/sroByYear.json
"""
import json
import sys

buildings = json.load(open('public/data/district/sro-buildings.json'))['buildings']
massing = json.load(open('public/data/district/sro-massing.json'))['buildings']
years = json.load(open('public/data/district/sro-years.json'))['years']

out = []
for m in massing:
    b = buildings[m['i']]
    built = years.get(b['name'], {}).get('built')
    parts = [{'kind': 'prism', 'x': 0, 'y': 0, 'ring': [[round(x, 6), round(y, 6)] for x, y in p['r']], 'h': round(p['h'], 1)} for p in m['parts'] if p.get('h')]
    if not parts:
        continue
    out.append({'name': b['name'], 'addr': b['addr'], 'rooms': b.get('rooms'), 'built': built, 'lon': b['lon'], 'lat': b['lat'], 'parts': parts})
out.sort(key=lambda r: (r['built'] or 9999, r['name']))
json.dump({'source': 'SRO buildings from the 2024 SRO Tenant Survey (Appendix B); footprints and heights from City of Vancouver building footprints and LiDAR; year built from the City property tax report. Made by scripts/build-sro-years.py.', 'buildings': out}, open(sys.argv[1], 'w'))
dated = [r for r in out if r['built']]
print(len(out), 'buildings,', len(dated), 'dated,', sum(1 for r in dated if r['built'] <= 1914), 'built by 1914')
