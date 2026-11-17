"""
The shoreline around 1900, as a land mask like land-1887.json.

Between the first train (1887) and Goad's atlas (1912), the one change to the inlet shore that is dated
is the Canadian Pacific's yard west of Carrall Street: Major Matthews records it as filled ground by 1898,
with the inlet seeping through it. So this is the 1887 land (land-1887.json) with the 1912 land added
west of Carrall and north of Water Street, the yard and the railway's wharves. East of Carrall the
shore is left as in 1887; the fill and piers there are drawn only from 1912. False Creek is as in 1887.

Usage: python3 scripts/build-land-1900.py public/data/district/land-1900.json
"""
import json
import sys

CARRALL = -123.1043
WATER_ST = 49.2830


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


def main(out):
    a = json.load(open('public/data/district/land-1887.json'))
    b = json.load(open('public/data/district/land-1912.json'))
    lon0, lat0, lon1, lat1 = json.load(open('public/data/district/dtes-terrain.json'))['bbox']
    nx, ny = a['nx'], a['ny']
    land, later = cells(a), cells(b)
    i_max = int((CARRALL - lon0) / (lon1 - lon0) * nx)
    j_min = int((WATER_ST - lat0) / (lat1 - lat0) * ny)
    added = 0
    for j in range(j_min, ny):
        for i in range(0, i_max):
            if later[j][i] and not land[j][i]:
                land[j][i] = 1
                added += 1
    print(f'{added} cells of the yard added: {added * a["cell"] ** 2 / 1e6:.3f} km2')
    rows = []
    for row in land:
        runs, cur, n = [], 0, 0
        for v in row:
            if v == cur:
                n += 1
            else:
                runs.append(n)
                cur, n = v, 1
        runs.append(n)
        rows.append(runs)
    json.dump({**{k: v for k, v in a.items() if k != 'rows'}, 'rows': rows,
               'source': "The 1887 land (land-1887.json) with the Canadian Pacific's yard west of Carrall, filled by 1898, from land-1912.json. Made by scripts/build-land-1900.py."}, open(out, 'w'))


main(sys.argv[1])
