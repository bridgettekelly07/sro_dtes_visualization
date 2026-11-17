"""Turn measurements taken off the 1889 fire insurance plan of Hastings Mill into buildings for the map.

Source: Dakin Publishing Co., "Plan of Vancouver, 1889 [fire map]", sheet 13, "Hastings Saw Mill to
Dunlevy Avenue". City of Vancouver Archives, MAP 338, LEG1319.489. Public domain.
  https://searcharchives.vancouver.ca/plan-of-vancouver-1889-fire-map-hastings-saw-mill-to-dunlevy-avenue

Every position below is a pixel position on the Archives' full-size scan (3789 x 3012 pixels), read by eye
from the scan on screen. Expect each to be good to a few metres, not better.

How the plan is tied to the ground:
  Scale    Railway Street and Dunlevy Avenue are both marked 66 feet wide and both measure about 190
           pixels across, so one pixel is 0.1057 m.
  North    Dunlevy Avenue runs true north on the ground and 43 degrees clockwise from "up" on the scan.
  Anchor   Where the centre lines of Dunlevy Avenue and Railway Street cross: pixel (1057.7, 2631.2) on
           the scan, and longitude -123.09523, latitude 49.28487 in the City's street data.
Two checks came out right: Railway Street's bearing (N70E on the plan, N71E on the ground), and the
shore at the marine ways, which lands within a few metres of the 1880s shoreline in the UBC dataset.

Heights are not on the plan except as storey counts; they are estimates from those and from the 1872
photograph.

Usage: python3 scripts/build-mill-site.py src/lib/data/millSite.ts public/data/district/mill-site-land.json

The second file is the ground under the site. Run scripts/build-old-land.py afterwards to add it to the
1880s land.
"""
import math
import sys

M_PER_PX = 0.1057
NORTH = math.radians(43)          # true north, clockwise from "up" on the scan
ANCHOR_PX = (1057.7, 2631.2)
ANCHOR = (-123.09523, 49.28487)   # lon, lat
ALONG_SCAN = 43.0                 # degrees anticlockwise from east of the scan's left-to-right direction


def ground(px, py):
    """Metres east and north of the anchor for a pixel on the scan."""
    r, u = (px - ANCHOR_PX[0]) * M_PER_PX, -(py - ANCHOR_PX[1]) * M_PER_PX
    return (r * math.cos(NORTH) - u * math.sin(NORTH), r * math.sin(NORTH) + u * math.cos(NORTH))


def turn(dx, dy):
    """Degrees anticlockwise from east of a direction given in scan pixels (right, down)."""
    e, n = ground(ANCHOR_PX[0] + dx, ANCHOR_PX[1] + dy)
    return math.degrees(math.atan2(n, e))


def part(kind, px, py, long_px, short_px, rot, **more):
    """A building whose long side is `long_px` pixels, lying along `rot`."""
    x, y = ground(px, py)
    p = {"kind": kind, "x": round(x, 1), "y": round(y, 1), "w": round(long_px * M_PER_PX, 1), "d": round(short_px * M_PER_PX, 1), "rot": round(rot, 1)}
    p.update(more)
    return p


def upright(kind, px, py, w_px, h_px, **more):
    """A building drawn square to the scan: its long side is whichever of width and height is greater."""
    return part(kind, px, py, max(w_px, h_px), min(w_px, h_px), ALONG_SCAN if w_px >= h_px else ALONG_SCAN + 90, **more)


house = dict(eave=3.0, ridge=4.8)   # one storey, as the plan marks most dwellings
deck = dict(h=0.4, z0=-0.4, legs=9, drop=2.4)   # a planked platform on piles, its top at yard level

mill_turn = turn(3600 - 3034.8, 2257 - 1348.4)
wharf_turn = turn(0.904, -0.428)

# name -> (period it is known for, the part). "early" parts are kept in the thinned-out earlier model.
site = [
    # the mill, lettered A on the plan, with the engine and machine house B against its west side
    ("saw mill (A)", True, part("gable", 3317.4, 1802.7, 1070, 170, mill_turn, eave=8, ridge=13)),
    ("engine and machine house (B)", True, part("gable", 3086.6, 1748.0, 252, 178, mill_turn, eave=6, ridge=9)),
    ("stack", True, part("box", 3120, 1790, 18, 18, mill_turn, h=26)),
    # the wharf on the north side, and the planked yard behind it
    ("wharf", True, part("box", 2719, 538, 80 / M_PER_PX, 45 / M_PER_PX, wharf_turn, **deck)),
    ("lumber piles", True, upright("box", 2084, 1201, 710, 85, h=3.0)),
    ("lumber piles", False, upright("box", 2117, 1381, 805, 118, h=3.5)),
    ("lumber piles", False, upright("box", 2274, 1594, 284, 95, h=3.0)),
    ("lumber shed (C)", False, upright("gable", 2442, 1435, 133, 96, eave=4, ridge=6)),
    ("yard office", False, upright("box", 2197.9, 1438.2, 37, 37, h=3)),
    # the store and warehouse, lettered E, on the western shore
    ("store and warehouse (E)", True, upright("gable", 1691, 1597, 244, 215, eave=5.5, ridge=8.5)),
    # the boarding house, lettered D: a long range, a cross wing at its head, and a kitchen
    ("boarding house (D)", True, upright("gable", 2027.7, 1593.6, 104, 266, eave=5.5, ridge=8)),
    ("boarding house, head", True, upright("gable", 2024.7, 1479.6, 170, 59, eave=5.5, ridge=7.5)),
    ("boarding house kitchen", False, upright("box", 2116.5, 1648.3, 89, 96, h=3.2)),
    # the shore to the west
    ("marine ways", False, upright("box", 1209.5, 1734.5, 41, 218, h=0.5)),
    ("boat house", False, upright("gable", 1483.1, 1689.8, 30, 74, eave=2.4, ridge=3.6)),
    ("cabin", False, upright("gable", 1369.1, 1734.2, 37, 67, eave=2.4, ridge=3.6)),
    # the dwellings, by the plan's own numbers
    ("dwelling 1", True, upright("hip", 681.1, 2155.8, 126, 163, eave=6, ridge=9)),   # marked two and a half storeys
    ("dwelling 2", False, upright("gable", 1184.3, 2252.0, 74, 148, **house)),
    ("dwelling 3", False, upright("gable", 1558.2, 2619.0, 74, 96, **house)),
    ("dwelling 4", False, upright("gable", 1518.2, 2403.0, 67, 81, **house)),
    ("dwelling 5", True, upright("gable", 1462.6, 2059.6, 148, 104, **house)),
    ("dwelling 6", True, upright("gable", 1662.4, 2104.0, 118, 74, **house)),
    ("office 7", False, upright("gable", 1840.0, 2044.6, 96, 74, **house)),
    ("storage 8", False, upright("gable", 1988.0, 1889.4, 81, 118, **house)),
    ("dwelling 9", True, upright("gable", 2113.8, 2015.2, 74, 74, **house)),
    ("dwelling 10", False, upright("gable", 2069.4, 2118.8, 67, 74, **house)),
    ("dwelling 11", False, upright("gable", 2010.2, 2259.4, 81, 59, **house)),
    ("dwelling 12", False, upright("gable", 2057.5, 2348.2, 74, 59, **house)),
    ("dwelling 13", False, upright("gable", 2187.8, 2333.4, 59, 89, **house)),
    ("dwelling 16", True, upright("gable", 2350.8, 2015.2, 89, 89, **house)),
    ("building 16, west", False, upright("gable", 444.3, 2481.4, 111, 74, **house)),
]


# The edge of the site against the water, traced off the plan's heavy outline, as scan pixels in order.
# West to east: the shore past the marine ways to the store; up the store's side; across the head of the
# yard (the pier to the west and the wharf to the north stand on piles and are left out, as is the corner
# marked "being filled in with slabs and sawdust"); down the mill's outer side to its end; back along the
# log pond's shore; then the bottom and left edges of the scan to close it.
LAND_PX = [
    (0, 1430), (174.7, 1497.4), (396.7, 1630.6), (692.7, 1763.8), (929.5, 1837.8), (1210.7, 1843.7),
    (1269.9, 1837.8), (1432.7, 1808.2), (1589.6, 1734.2), (1574.8, 1527.0), (1551.1, 1334.6),
    (1560.0, 1068.0), (1678.4, 1068.2), (2426.2, 837.1), (2900.0, 900.0), (3320.1, 1441.0),
    (3616.1, 2223.4), (3556.9, 2253.0), (3438.5, 2031.0), (3364.5, 2016.2), (3275.7, 2075.4),
    (3172.1, 2297.4), (3157.3, 2534.2), (3181.0, 3012.0), (0, 3012),
]


# The Canadian Pacific main track where it crosses the sheet, west to east, as scan pixels. It enters at the
# left edge along the shore, passes south of the store and cuts between the numbered dwellings. The last two
# points, where it leaves the sheet, are the least certain: the scan shows several lines converging there.
TRACK_PX = [
    (174.7, 1592.1), (840.7, 1897.0), (1284.7, 2104.2), (1632.8, 2296.4), (1884.4, 2444.4),
    (2130.0, 2620.0), (2372.8, 2799.6), (2560.0, 2990.0),
]

# What the plan names, for annotating the site: a short name, the plan's own words where it has any, and
# the spot on the scan each one points at.
ANNOTATE_PX = [
    ("SAW MILL", "built 1866, 60,000 feet a day", 3317, 1803),
    ("ENGINE HOUSE", "ten boilers and a machine shop", 3087, 1748),
    ("FILL", "being filled in with slabs and sawdust", 3450, 800),
    ("WHARF", "lumber stacked 22 feet high", 2719, 538),
    ("LUMBER YARD", "piles 6 to 12 feet high", 2100, 1290),
    ("STORE", "general merchandise, feed, warehouse", 1691, 1597),
    ("BOARDING HOUSE", "with its own kitchen", 2028, 1594),
    ("MARINE WAYS", "", 1210, 1735),
    ("SHANTIES", "shore lined with S.P. shanties", 700, 1700),
    ("MAIN TRACK", "Canadian Pacific Railway", 1285, 2104),
    ("DWELLINGS", "sixteen, old and cheap", 1990, 2190),
]


def lonlat(e, n):
    return (ANCHOR[0] + e / 72600.0, ANCHOR[1] + n / 111200.0)


def ts(p, name):
    fields = ", ".join(f"{k}: {repr(v) if isinstance(v, str) else str(v).lower() if isinstance(v, bool) else v}" for k, v in p.items())
    return f"  {{ {fields} }}, // {name}"


def main(dst, land_dst):
    mill = ground(3317.4, 1802.7)
    yard = ground(2400, 1650)
    out = [
        "// Generated by scripts/build-mill-site.py from measurements off the 1889 fire insurance plan.",
        "// Do not edit by hand: change the measurements in the script and run it again.",
        "import type { Part } from './models'",
        "",
        "/** Where Dunlevy Avenue and Railway Street cross: the point every part below is measured from. */",
        f"export const millSiteAnchor: [number, number] = [{ANCHOR[0]}, {ANCHOR[1]}]",
        "/** The middle of the saw mill, and the middle of the whole site, as [lon, lat]. */",
        "export const millCentre: [number, number] = [%.5f, %.5f]" % lonlat(*mill),
        "export const millYardCentre: [number, number] = [%.5f, %.5f]" % lonlat(*yard),
        "",
        "/** Every building on the 1889 plan. */",
        "export const millSite1889: Part[] = [",
        *[ts(p, name) for name, _, p in site],
        "]",
        "",
        "/** The Canadian Pacific main track across the plan, west to east, as [lon, lat]. */",
        "export const millTrack: [number, number][] = [" + ", ".join("[%.6f, %.6f]" % lonlat(*ground(x, y)) for x, y in TRACK_PX) + "]",
        "/** What the plan names on the site: a name, the plan's words, and where it points, as [lon, lat]. */",
        "export const millAnnotations: { label: string; note: string; at: [number, number] }[] = [",
        *["  { label: %r, note: %r, at: [%.6f, %.6f] }," % (name, note, *lonlat(*ground(x, y))) for name, note, x, y in ANNOTATE_PX],
        "]",
        "",
        "/** The same site thinned to the mill, wharf, store, boarding house and a few dwellings. */",
        "export const millSiteEarly: Part[] = [",
        *[ts(p, name) for name, early, p in site if early],
        "]",
        "",
    ]
    open(dst, "w").write("\n".join(out))
    # the ground under the site, for scripts/build-old-land.py to add to the 1880s land
    import json
    land = {
        "source": "Dakin Publishing Co., Plan of Vancouver, 1889, sheet 13 (City of Vancouver Archives, MAP 338, LEG1319.489): "
                  "the site's edge against the water, traced by eye off the scan. Made by scripts/build-mill-site.py.",
        "polygons": [[[round(v, 6) for v in lonlat(*ground(x, y))] for x, y in LAND_PX]],
    }
    json.dump(land, open(land_dst, "w"), separators=(",", ":"))
    print(f"mill: {mill[0]:.0f} m east, {mill[1]:.0f} m north of the anchor; turned {mill_turn:.1f} degrees; {1070 * M_PER_PX:.0f} m long, {170 * M_PER_PX:.0f} m wide")
    print(f"wharf turned {wharf_turn:.1f} degrees; {len(site)} parts, {sum(1 for s in site if s[1])} in the early model")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
