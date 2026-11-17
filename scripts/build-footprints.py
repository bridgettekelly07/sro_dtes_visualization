"""Convert City of Vancouver building footprints (GeoJSON) into the compact file the map draws.

Source: Vancouver Open Data Portal, dataset "building-footprints-2009" (footprints with
heights from the 2009 LiDAR survey), exported for the Downtown Eastside bounding box:

  https://opendata.vancouver.ca/api/explore/v2.1/catalog/datasets/building-footprints-2009/exports/geojson
    ?where=in_bbox(geo_point_2d, 49.2745, -123.112, 49.2905, -123.076)
    &select=bldgid,hgt_agl,baseelev_m,rooftype,area_m2,geom

Usage: python3 scripts/build-footprints.py <raw.geojson> public/data/dtes-footprints.json

Output coordinates are metres east and north of ORIGIN, rounded to 0.1 m.
"""
import json
import math
import sys

ORIGIN = {"lon": -123.094, "lat": 49.2825}
M_PER_DEG_LAT = 111_200.0
M_PER_DEG_LON = M_PER_DEG_LAT * math.cos(math.radians(ORIGIN["lat"]))
MIN_AREA_M2 = 12  # sheds and survey noise
MIN_HEIGHT_M = 2


def to_local(ring):
    flat = []
    for lon, lat in ring:
        flat.append(round((lon - ORIGIN["lon"]) * M_PER_DEG_LON, 1))
        flat.append(round((lat - ORIGIN["lat"]) * M_PER_DEG_LAT, 1))
    # GeoJSON repeats the first point at the end; the map closes rings itself.
    if len(flat) >= 4 and flat[:2] == flat[-2:]:
        flat = flat[:-2]
    return flat


def main(src, dst):
    features = json.load(open(src))["features"]
    buildings = []
    for f in features:
        p, g = f["properties"], f["geometry"]
        if not g or (p.get("area_m2") or 0) < MIN_AREA_M2:
            continue
        height = p.get("hgt_agl") or 0
        if height < MIN_HEIGHT_M:
            continue
        polygons = [g["coordinates"]] if g["type"] == "Polygon" else g["coordinates"]
        for polygon in polygons:
            outer = to_local(polygon[0])  # holes (light wells) are not drawn yet
            if len(outer) >= 6:
                buildings.append({"id": p["bldgid"], "h": round(height, 1), "ring": outer})
    out = {
        "source": "City of Vancouver Open Data, Building footprints 2009",
        "origin": ORIGIN,
        "buildings": buildings,
    }
    json.dump(out, open(dst, "w"), separators=(",", ":"))
    heights = sorted(b["h"] for b in buildings)
    print(f"{len(features)} features -> {len(buildings)} buildings; "
          f"median height {heights[len(heights)//2]} m, tallest {heights[-1]} m")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
