"""Which SRO buildings are on the Vancouver Heritage Register.

Reads the City's open dataset "Heritage sites" (opendata.vancouver.ca, dataset heritage-sites, exported as
JSON) and matches it to the project's SRO buildings (src/lib/data/sroByYear.json) by street address: a
register entry matches when its street name is the building's and its street number is one of the
building's; failing that, the register building whose point lies inside the SRO building's footprint. Writes src/lib/data/sroHeritage.json.

    python3 scripts/build-sro-heritage.py <heritage-sites.json>
"""
import json, re, sys, datetime

sites = json.load(open(sys.argv[1]))
sros = json.load(open('src/lib/data/sroByYear.json'))['buildings']

def street(s):
    return re.sub(r'\s+', ' ', s.upper().replace('.', '').strip())

index = {}
for s in sites:
    if s.get('status') != 'Active' or not s.get('streetnumber'):
        continue
    index.setdefault((s['streetnumber'].strip(), street(s['streetname'])), []).append(s)

out = {}
for b in sros:
    m = re.match(r'^([\d\s/\-]+)\s+(.*)$', b.get('addr') or '')
    if not m:
        continue
    numbers = re.findall(r'\d+', m.group(1))
    hits = [s for n in numbers for s in index.get((n, street(m.group(2))), []) if s.get('category') == 'HERITAGE BUILDINGS']
    if not hits:
        # no entry at the address: a register building standing inside this footprint (a corner building
        # registered on its other street)
        def inside(lon, lat, ring):
            c = False
            for i in range(len(ring)):
                (x0, y0), (x1, y1) = ring[i], ring[(i + 1) % len(ring)]
                if (y0 > lat) != (y1 > lat) and lon < x0 + (lat - y0) * (x1 - x0) / (y1 - y0):
                    c = not c
            return c
        hits = [s for s in sites if s.get('status') == 'Active' and s.get('category') == 'HERITAGE BUILDINGS' and s.get('geo_point_2d')
                and any(inside(s['geo_point_2d']['lon'], s['geo_point_2d']['lat'], p['ring']) for p in b['parts'] if p.get('ring'))]
    if not hits:
        continue
    s = sorted(hits, key=lambda s: s.get('evaluationgroup') or 'Z')[0]
    out[b['name']] = {
        'group': s.get('evaluationgroup'),
        'designated': s.get('municipaldesignationm') == 'Yes',
        'registerName': s.get('buildingnamespecifics'),
        'address': f"{s['streetnumber']} {s['streetname']}",
    }

json.dump({
    'source': 'City of Vancouver Open Data, "Heritage sites" (the Vancouver Heritage Register), matched to the SRO buildings by street address. Made by scripts/build-sro-heritage.py.',
    'retrieved': datetime.date.today().isoformat(),
    'buildings': out,
}, open('src/lib/data/sroHeritage.json', 'w'), indent=1)
print(len(out), 'of', len(sros), 'SRO buildings are on the register')
