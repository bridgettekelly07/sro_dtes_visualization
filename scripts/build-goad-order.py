"""
When each building of Goad's 1912 atlas is raised on the map: the year it is drawn coming up.

  Dated buildings (a year in src/lib/data/goad1912Years.json, from the City's property records) come up
  in that year.

  Undated buildings, whose year is not recorded (the building has gone), are given a year at random,
  evenly spread from 1887 to 1912, in no order of place, so the district fills in gradually rather than
  spreading out from one point. The draw is seeded, so it is the same every time, and the same building
  comes up in the same year on every card. This is a stand-in, not a record.

  Nothing comes up before its ground exists: a building on ground filled by 1898 (land-1900.json but not
  land-1887.json) comes up no earlier than 1898, and one on ground first drawn in 1912 no earlier than 1912.

Adds `at` ({ brick: [...], frame: [...] }, a year with a fraction, in the order of goad1912.json) to
goad1912Years.json.

Usage: python3 scripts/build-goad-order.py src/lib/data/goad1912Years.json
"""
import json
import random
import sys


def cells(m):
    out = []
    for runs in m['rows']:
        row, x, on = bytearray(m['nx']), 0, False
        for n in runs:
            if on:
                row[x:x + n] = b'\x01' * min(n, m['nx'] - x)
            x += n
            on = not on
        out.append(row)
    return out


def main(path):
    years = json.load(open(path))
    goad = json.load(open('src/lib/data/goad1912.json'))
    lon0, lat0, lon1, lat1 = json.load(open('public/data/district/dtes-terrain.json'))['bbox']
    m87 = json.load(open('public/data/district/land-1887.json'))
    nx, ny = m87['nx'], m87['ny']
    l87 = cells(m87)
    l00 = cells(json.load(open('public/data/district/land-1900.json')))

    def on(mask, ring):
        # the share of the footprint's corners standing on this ground
        hits = 0
        for lon, lat in ring:
            i, j = int((lon - lon0) / (lon1 - lon0) * nx), int((lat - lat0) / (lat1 - lat0) * ny)
            hits += 1 if not (0 <= i < nx and 0 <= j < ny) or mask[j][i] else 0
        return hits / len(ring)

    def ground(ring):
        # the first shore on which every corner stands on land: a wharf or shed built out over the water
        # waits for the fill the atlas shows under it
        if on(l87, ring) >= 0.999:
            return 1887
        return 1898 if on(l00, ring) >= 0.999 else 1912

    rng = random.Random(1912)
    at = {}
    for kind in ('brick', 'frame'):
        out = []
        for ring, year in zip(goad[kind], years[kind]):
            g = ground(ring)
            if year:
                out.append(max(year, g))
            else:
                out.append(round(rng.uniform(max(1887, g), 1912.95), 2))
        at[kind] = out
    years['at'] = at
    json.dump(years, open(path, 'w'), separators=(',', ':'))
    print('dated', sum(1 for k in ('brick', 'frame') for y in years[k] if y), 'of', sum(len(years[k]) for k in ('brick', 'frame')))


main(sys.argv[1])
