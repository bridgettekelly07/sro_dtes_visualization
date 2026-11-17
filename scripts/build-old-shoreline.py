"""Extract the original shoreline (and old streams) of Vancouver for the map's early chapters.

Source: Paul Lesack and Sharon J. Proctor, "Vancouver's Old Streams, 1880-1920", UBC Library,
Borealis dataverse, doi:10.5683/SP2/UEJGTV, licence CC0 1.0. The file used is
OldStreamsPolylineGoogleEarth.kmz, unzipped to doc.kml:
  https://borealisdata.ca/api/access/datafile/74480

Usage: python3 scripts/build-old-shoreline.py <doc.kml> public/data/old-shoreline.json

Each feature in the source carries a Type: "Shoreline", "Stream", or "Educated Guess" (a stream
course the authors inferred). Lines are clipped to the map's area and kept as [lon, lat] lists.
"""
import json
import re
import sys

BBOX = (-123.135, 49.262, -123.04, 49.303)  # west, south, east, north


def main(src, dst):
    text = open(src, encoding="utf-8", errors="replace").read()
    out = {"Shoreline": [], "Stream": [], "Educated Guess": []}
    for placemark in re.findall(r"<Placemark[^>]*>(.*?)</Placemark>", text, flags=re.S):
        kind = re.search(r"<td>Type</td>\s*<td>([^<]*)</td>", placemark)
        kind = kind.group(1).strip() if kind else None
        if kind not in out:
            continue
        for coords in re.findall(r"<coordinates>(.*?)</coordinates>", placemark, flags=re.S):
            run = []
            for token in coords.split():
                lon, lat = (float(v) for v in token.split(",")[:2])
                if BBOX[0] <= lon <= BBOX[2] and BBOX[1] <= lat <= BBOX[3]:
                    run.append([round(lon, 6), round(lat, 6)])
                else:
                    if len(run) > 1:
                        out[kind].append(run)
                    run = []
            if len(run) > 1:
                out[kind].append(run)
    result = {
        "source": "Lesack and Proctor, Vancouver's Old Streams, 1880-1920 (UBC Library, doi:10.5683/SP2/UEJGTV, CC0 1.0)",
        "shoreline": out["Shoreline"],
        "streams": out["Stream"],
        "inferredStreams": out["Educated Guess"],
    }
    json.dump(result, open(dst, "w"), separators=(",", ":"))
    print({k: (len(v), sum(len(r) for r in v)) for k, v in result.items() if isinstance(v, list)})


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
