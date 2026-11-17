"""
The three neighbourhoods of chapter 3 as outlines on the street grid, and the corners the chapter needs.

Each outline is the block of streets the accounts give for the neighbourhood, drawn on today's street
centrelines (public/data/district/dtes-streets.json), which keep the 1880s survey's lines here:

  Chinatown     Carrall Street to Gore Avenue, East Pender Street to East Georgia Street. Chinatown in
                1907 was along Dupont (Pender) and Carrall, growing east and south in the decades after.
  Paueru Gai    Main Street to Jackson Avenue, Alexander Street to East Cordova Street, along Powell
                Street with the Powell Street Grounds (Oppenheimer Park) at its heart.
  Hogan's Alley Main Street to Jackson Avenue, Union Street to Prior Street: the lane between those two
                streets. Accounts give Gore or Jackson as its east end.

The outlines are a convenience for the map, not surveyed limits: each neighbourhood shaded into the
streets around it. Each corner is the closest pair of points on the two streets' centrelines.

Writes src/lib/data/districts1907.json: { chinatown, paueruGai, hogansAlley: [[lon, lat], ...] (closed),
corners: { name: [lon, lat] } }

Usage: python3 scripts/build-districts.py src/lib/data/districts1907.json
"""
import json
import sys


def main(out):
    segs = json.load(open('public/data/district/dtes-streets.json'))['segments']
    by = {}
    for s in segs:
        name = ' '.join(s['h'].split()[1:])
        by.setdefault(name, []).extend(s['c'])

    def corner(a, b):
        pa, pb = by[a], by[b]
        best, at = 1e9, None
        for x1, y1 in pa:
            for x2, y2 in pb:
                d = (x1 - x2) ** 2 + ((y1 - y2) * 1.53) ** 2
                if d < best:
                    best, at = d, [round((x1 + x2) / 2, 6), round((y1 + y2) / 2, 6)]
        return at

    def ring(west, east, north, south):
        r = [corner(west, north), corner(east, north), corner(east, south), corner(west, south)]
        return r + [r[0]]

    data = {
        'source': "Outlines on today's street centrelines (City of Vancouver Open Data), by the streets the accounts give for each neighbourhood. Made by scripts/build-districts.py.",
        'chinatown': ring('CARRALL ST', 'GORE AV', 'E PENDER ST', 'E GEORGIA ST'),
        'paueruGai': ring('MAIN ST', 'JACKSON AV', 'ALEXANDER ST', 'E CORDOVA ST'),
        'hogansAlley': ring('MAIN ST', 'JACKSON AV', 'UNION ST', 'PRIOR ST'),
        'corners': {
            'mainHastings': corner('MAIN ST', 'E HASTINGS ST'),
            'carrallHastings': corner('CARRALL ST', 'E HASTINGS ST'),
            'carrallPender': corner('CARRALL ST', 'E PENDER ST'),
            'mainPowell': corner('MAIN ST', 'POWELL ST'),
            'dunlevyPowell': corner('DUNLEVY AV', 'POWELL ST'),
            'jacksonPowell': corner('JACKSON AV', 'POWELL ST'),
            'granvilleHastings': corner('GRANVILLE ST', 'W HASTINGS ST'),
            'mainStation': corner('MAIN ST', 'STATION ST'),
        },
    }
    json.dump(data, open(out, 'w'), separators=(',', ':'))
    for k, v in data['corners'].items():
        print(k, v)


main(sys.argv[1])
