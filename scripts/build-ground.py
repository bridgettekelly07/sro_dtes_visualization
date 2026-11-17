"""Convert City of Vancouver ground layers (GeoJSON) into the line work the map draws under the buildings.

Sources, all from the Vancouver Open Data Portal (opendata.vancouver.ca), exported as GeoJSON:
  block-outlines                 city blocks; the gaps between them are the streets
  railways                       rail lines
  parks-polygon-representation   park boundaries
  shoreline-2002                 the shoreline (whole city; clipped here)
The first three were exported with
  where=in_bbox(geo_point_2d, 49.2725, -123.115, 49.2925, -123.073)

Usage: python3 scripts/build-ground.py <folder with the four .geojson files> public/data/dtes-ground.json

Output coordinates are metres east and north of ORIGIN (the same origin as build-footprints.py).
"""
import json
import math
import os
import sys

ORIGIN = {"lon": -123.094, "lat": 49.2825}
M_PER_DEG_LAT = 111_200.0
M_PER_DEG_LON = M_PER_DEG_LAT * math.cos(math.radians(ORIGIN["lat"]))
# Drawing extent in local metres: the footprint area plus a margin.
X_MIN, X_MAX, Y_MIN, Y_MAX = -1520, 1420, -1020, 900
MIN_STEP_M = 1.5  # drop vertices closer together than this


def local(pt):
    return ((pt[0] - ORIGIN["lon"]) * M_PER_DEG_LON, (pt[1] - ORIGIN["lat"]) * M_PER_DEG_LAT)


def inside(p):
    return X_MIN <= p[0] <= X_MAX and Y_MIN <= p[1] <= Y_MAX


def thin(points):
    out = [points[0]]
    for p in points[1:]:
        if math.dist(p, out[-1]) >= MIN_STEP_M:
            out.append(p)
    if out[-1] != points[-1]:
        out.append(points[-1])
    return out


def flat(points):
    return [round(v, 1) for p in points for v in p]


def clip_line(coords):
    """Split a line into the runs that lie inside the extent."""
    runs, run = [], []
    for p in map(local, coords):
        if inside(p):
            run.append(p)
        else:
            if len(run) >= 2:
                runs.append(run)
            run = []
    if len(run) >= 2:
        runs.append(run)
    return [flat(thin(r)) for r in runs]


def rings(geometry):
    polygons = [geometry["coordinates"]] if geometry["type"] == "Polygon" else geometry["coordinates"]
    for polygon in polygons:
        ring = [local(p) for p in polygon[0]]
        if any(inside(p) for p in ring):
            yield flat(thin(ring[:-1] if ring[0] == ring[-1] else ring))


def load(folder, name):
    return [f for f in json.load(open(os.path.join(folder, name + ".geojson")))["features"] if f["geometry"]]


def main(folder, dst):
    out = {
        "source": "City of Vancouver Open Data: block outlines, railways, parks, shoreline 2002",
        "origin": ORIGIN,
        "blocks": [r for f in load(folder, "block-outlines") for r in rings(f["geometry"])],
        "parks": [
            {"name": f["properties"].get("park_name"), "ring": r}
            for f in load(folder, "parks-polygon-representation")
            for r in rings(f["geometry"])
        ],
        "rail": [r for f in load(folder, "railways") for r in clip_line(f["geometry"]["coordinates"])],
        "shore": [r for f in load(folder, "shoreline-2002") for r in clip_line(f["geometry"]["coordinates"])],
    }
    json.dump(out, open(dst, "w"), separators=(",", ":"))
    print({k: len(v) for k, v in out.items() if isinstance(v, list)}, os.path.getsize(dst), "bytes")
    print("parks:", sorted({p["name"] for p in out["parks"] if p["name"]}))


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
