"""
The year each SRO building was built, from the City of Vancouver's property tax report.

  City of Vancouver Open Data, 'Property tax report' (property-tax-report), field year_built, for
  the 2025 assessment year. https://opendata.vancouver.ca/explore/dataset/property-tax-report/

Each building in public/data/district/sro-buildings.json is looked up by every civic number and
street its address names. Where several properties share the address (a strata, or a building split across lots), the
earliest year is kept. BC Assessment's year built is usually the original construction year, but for
some buildings it is the year of a later rebuilding, so it is checked against heritage dates in the
story where those are known.

Usage: python3 scripts/fetch-sro-years.py public/data/district/sro-years.json
"""
import json
import re
import sys
import time
import urllib.parse
import urllib.request

API = 'https://opendata.vancouver.ca/api/explore/v2.1/catalog/datasets/property-tax-report/records'


def norm_street(street):
    street = street.upper().strip().rstrip('.')
    street = re.sub(r'\bAV\b', 'AVE', street)
    street = re.sub(r'\bDR\b', 'DRIVE', street)
    # the property data puts the direction last: "E HASTINGS ST" is "HASTINGS ST E"
    m = re.match(r'^([EW])\s+(.*)$', street)
    return f'{m.group(2)} {m.group(1)}' if m else street


def candidates(addr):
    """Every (civic number, street) the address names: "401 / 403 Powell St." gives both numbers on Powell,
    "396 Powell St./ 225 Dunlevy Ave" gives one on each street."""
    parts = [p.strip() for p in re.split(r'/|&', addr) if p.strip()]
    parsed = []
    for p in parts:
        m = re.match(r'^(\d+)\s*(.*)$', p)
        if m:
            parsed.append([m.group(1), m.group(2).strip()])
    out = []
    for i, (civic, street) in enumerate(parsed):
        if not street:
            street = next((s for _, s in parsed[i + 1:] if s), '')
        if street:
            out.append((civic, norm_street(street)))
    return out


def lookup(civic, street):
    where = f'to_civic_number="{civic}" and street_name="{street}" and tax_assessment_year="2025"'
    url = API + '?' + urllib.parse.urlencode({'limit': 20, 'select': 'year_built,big_improvement_year,from_civic_number,to_civic_number,street_name', 'where': where})
    with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'research-map/0.1'}), timeout=30) as r:
        return json.load(r)['results']


def main(out):
    buildings = json.load(open('public/data/district/sro-buildings.json'))['buildings']
    years = {}
    for b in buildings:
        rows = []
        for civic, street in candidates(b['addr']):
            rows += lookup(civic, street)
            time.sleep(0.1)
        built = sorted(int(r['year_built']) for r in rows if r.get('year_built'))
        years[b['name']] = {'addr': b['addr'], 'built': built[0] if built else None, 'records': len(rows)}
        print(f"{b['name'][:34]:34} {b['addr'][:30]:30} {years[b['name']]['built']}")
        time.sleep(0.15)
    json.dump({
        'source': "City of Vancouver Open Data, 'Property tax report', year_built, 2025 assessment; looked up by each building's first civic number and street. Made by scripts/fetch-sro-years.py.",
        'years': years,
    }, open(out, 'w'), indent=1)


main(sys.argv[1])
