"""
The three neighbourhoods of chapter 3 as outlines on the street grid, and the corners the chapter needs.

Each outline is the block of streets the accounts give for the neighbourhood, drawn on today's street
centrelines (public/data/district/dtes-streets.json), which keep the 1880s survey's lines here:

  Chinatown     Carrall Street to Main Street, East Hastings Street to Keefer Street: about four blocks by
                the end of the 1900s (1900 to 1909), as Simon Fraser University's Chinese Canadian history site gives it
                (Canton Alley, just west of Carrall, to Westminster Avenue, now Main; Hastings to Keefer).
                Pender (Dupont) was its spine, not its edge. It grew east toward Gore in the decades after.
  Paueru Gai    Main Street to Heatley Avenue, Railway Street to East Cordova Street, as Canada's Historic
                Places gives the Japanese Canadian neighbourhood before 1942; its commercial and social
                centre ran along Powell Street from Main to Jackson.
  Hogan's Alley Main Street to Jackson Avenue, Union Street to Prior Street: the lane between those two
                streets. Accounts give Gore or Jackson as its east end.

The outlines are a convenience for the map, not surveyed limits: each neighbourhood shaded into the
streets around it. Each corner is the closest pair of points on the two streets' centrelines.

Also, for chapter 4: macleanHousing (Gore to Jackson, Union to Keefer: the MacLean Park housing of 1962),
macleanPark (Heatley to Hawks, Keefer to Georgia: the new park of 1963), raymur (Campbell to Raymur,
Hastings to Union: Raymur Place, later Stamps Place) and hogansWest (Main to Gore, Union to Prior).

Writes src/lib/data/districts1907.json: { chinatown, paueruGai, hogansAlley, ...: [[lon, lat], ...] (closed),
corners: { name: [lon, lat] } }

Usage: python3 scripts/build-districts.py src/lib/data/districts1907.json
"""
import json
import sys


def main(out):
    segs = json.load(open('public/data/district/dtes-streets.json'))['segments']
    segs_all = segs
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

    def street_line(*names):
        # the street's centreline from its pieces, chained west to east, always taking the piece that reaches furthest east
        segs = []
        for s_ in segs_all:
            if ' '.join(s_['h'].split()[1:]) in names:
                c = s_['c']
                segs.append(c if c[0][0] <= c[-1][0] else c[::-1])
        start = min(segs, key=lambda sg: sg[0][0])
        pts, used = list(start), {id(start)}
        while True:
            nxt = [sg for sg in segs if id(sg) not in used and abs(sg[0][0] - pts[-1][0]) < 2e-5 and abs(sg[0][1] - pts[-1][1]) < 2e-5]
            if not nxt:
                break
            sg = max(nxt, key=lambda sg: sg[-1][0])
            used.add(id(sg))
            pts += sg[1:]
        return [[round(x, 6), round(y, 6)] for x, y in pts]

    data = {
        # Hastings Street's own line, Burrard to the east edge, for the streetcar and the lettering
        'hastings': street_line('W HASTINGS ST', 'E HASTINGS ST'),
        # chapter 5: Pacific and Expo boulevards, today's road along the north shore of False Creek, the
        # inland edge of the Expo 86 grounds as near as the street data gives it
        'expoEdge': street_line('PACIFIC BOULEVARD', 'EXPO BOULEVARD'),
        'source': "Outlines on today's street centrelines (City of Vancouver Open Data), by the streets the accounts give for each neighbourhood. Made by scripts/build-districts.py.",
        'chinatown': ring('CARRALL ST', 'MAIN ST', 'E HASTINGS ST', 'KEEFER ST'),
        'paueruGai': ring('MAIN ST', 'HEATLEY AV', 'RAILWAY ST', 'E CORDOVA ST'),
        'hogansAlley': ring('MAIN ST', 'JACKSON AV', 'UNION ST', 'PRIOR ST'),
        # chapter 4: the blocks cleared for public housing in the 1960s, by the streets the accounts give,
        # and the western half of Hogan's Alley, levelled for the viaducts
        'macleanHousing': ring('GORE AV', 'JACKSON AV', 'UNION ST', 'KEEFER ST'),
        'macleanPark': ring('HEATLEY AV', 'HAWKS AV', 'KEEFER ST', 'E GEORGIA ST'),
        'raymur': ring('CAMPBELL AV', 'RAYMUR AV', 'E HASTINGS ST', 'UNION ST'),
        'hogansWest': ring('MAIN ST', 'GORE AV', 'UNION ST', 'PRIOR ST'),
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
