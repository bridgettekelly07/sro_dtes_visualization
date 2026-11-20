"""
Unresolved by-law issues in today's SRO buildings, from the City's open data.

The City of Vancouver's 'Rental standards: current issues' dataset (rental-standards-current-issues, Open
Government Licence, Vancouver) lists licensed rental buildings of five or more units that have unresolved
issues under the City's by-laws (standards of maintenance, building, electrical, plumbing and others),
with the count outstanding at each address. It is a snapshot: it is updated daily, keeps no history, and
does not say what the issues are. A building that is not in it has no open issue on file, or is not a
licensed rental building of that size; fire by-law orders are not in it.

This matches the dataset's addresses to the SRO buildings of the 2024 survey's list
(src/lib/data/sroByYear.json) by street number and street name, taking every number in a building's
address range. Buildings that share an address in the list (two names, one building) each get the count.

Writes src/lib/data/sroIssues.json: { retrieved, issues: { name: { open, units } } }

Usage: python3 scripts/build-sro-issues.py <cache json> src/lib/data/sroIssues.json
"""
import datetime
import json
import os
import re
import sys
import urllib.request

URL = 'https://opendata.vancouver.ca/api/explore/v2.1/catalog/datasets/rental-standards-current-issues/exports/json'


def key(num, street):
    st = street.upper().replace('STREET', 'ST').replace('AVENUE', 'AV').replace(' AVE', ' AV').replace('.', '').strip()
    st = re.sub(r'^(EAST|WEST) ', lambda m: m.group(1)[0] + ' ', st)
    return str(num).strip(), st


def main(cache, out):
    if not os.path.exists(cache):
        req = urllib.request.Request(URL, headers={'User-Agent': 'research-map/0.1'})
        open(cache, 'wb').write(urllib.request.urlopen(req, timeout=120).read())
    rows = json.load(open(cache))
    by_address = {}
    for h in json.load(open('src/lib/data/sroByYear.json'))['buildings']:
        street = re.sub(r'^[\d\s/\-]+', '', h['addr']).split('/')[0].strip()
        numbers = h['addr'][:h['addr'].find(street)] if street in h['addr'] else h['addr']
        for n in re.findall(r'\d+', numbers):
            by_address.setdefault(key(n, street), []).append(h['name'])
    issues = {}
    for r in rows:
        for name in by_address.get(key(r['streetnumber'], r['street']), []):
            issues[name] = {'open': r['totaloutstanding'], 'units': r['totalunits']}
    stamp = datetime.date.fromtimestamp(os.path.getmtime(cache)).isoformat()
    json.dump({'source': "City of Vancouver Open Data, 'Rental standards: current issues', matched to the 2024 SRO list by address. Made by scripts/build-sro-issues.py.", 'retrieved': stamp, 'issues': issues}, open(out, 'w'), indent=1)
    print(len(issues), 'SRO buildings with open issues;', sum(v['open'] for v in issues.values()), 'issues in all; snapshot of', stamp)


main(*sys.argv[1:3])
