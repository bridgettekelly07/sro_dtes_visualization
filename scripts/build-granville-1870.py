"""
The Granville townsite, traced from the government plan of March 1870.

  Plan of the Town of Granville, Burrard Inlet, B.C. Drawn by J. B. Launders at the
  Lands and Works Office, Victoria, March 1870 (this copy traced 1885).
  City of Vancouver Archives, AM54-S13-: MAP 978. Public domain.
  https://searcharchives.vancouver.ca/plan-of-town-of-granville-burrard-inlet-b-c

Everything below is a position on the archive's scan (5853 x 5198 pixels), read by eye.
The plan is drawn with south at the top: Hastings Street runs along the top, the inlet
is at the bottom, Carrall Street is the slanted left edge and Cambie Street the right.

How the plan is tied to the ground
  scale     its own scale bar: 300 feet measure 919 pixels, so 0.0995 m to a pixel.
            The lots agree: each is 200.5 pixels wide, which is 66 feet, one chain.
  anchor    the middle of Abbott Street where it meets the middle of Water Street,
            pixel (3079, 3208), set on today's centrelines at -123.10638, 49.28388.
  turn      Water Street today runs 15.5 degrees north of west; the plan's rows run with it.
  check     Abbott at Cordova then falls within 2 m of today's centrelines, and Cambie
            at Water within 1 m.

Usage: python3 scripts/build-granville-1870.py src/lib/data/granville1870.ts
"""
import math
import sys

M_PER_PX = 0.0995
ANCHOR_PX = (3079.0, 3208.0)
ANCHOR = (-123.10638, 49.28388)
# what one pixel to the right, and one pixel down, are on the ground (east, north)
UX = (-0.9637, 0.2670)
UY = (0.2670, 0.9637)
M_PER_DEG_LAT = 111_200
M_PER_DEG_LON = 111_320 * math.cos(math.radians(ANCHOR[1]))


def metres(p):
    dx, dy = p[0] - ANCHOR_PX[0], p[1] - ANCHOR_PX[1]
    return ((dx * UX[0] + dy * UY[0]) * M_PER_PX, (dx * UX[1] + dy * UY[1]) * M_PER_PX)


def lonlat(p):
    e, n = metres(p)
    return [round(ANCHOR[0] + e / M_PER_DEG_LON, 6), round(ANCHOR[1] + n / M_PER_DEG_LAT, 6)]


# ---- the blocks: each is two rows of lots with a lane between ----
# rows, top edge and bottom edge (pixels down the scan)
ROWS = {
    'A': (1177, 1572),  # blocks III and IV, facing Hastings
    'B': (1636, 2032),  # blocks III and IV, facing Cordova
    'C': (2237, 2629),  # blocks II and V, facing Cordova
    'D': (2685, 3109),  # blocks II and V, facing Water
}
# The water lots (blocks I and VI, north of Water Street, in the inlet) are left out.
EAST_RIGHT = 2975  # blocks I to III end here, at Abbott
WEST = (3183, 4787)  # blocks IV to VI
LOT = 200.5


def carrall_edge(y):
    """The slanted east edge of blocks I to III, along Carrall."""
    return 1449 + (y - 2677) * 0.2288


blocks, lots = [], []
for top, bottom in ROWS.values():
    # the east column, cut off on the slant
    blocks.append([(carrall_edge(top), top), (EAST_RIGHT, top), (EAST_RIGHT, bottom), (carrall_edge(bottom), bottom), (carrall_edge(top), top)])
    x = EAST_RIGHT - LOT
    while x > carrall_edge(bottom) + 30:
        lots.append([(x, top), (x, bottom)])
        x -= LOT
    # the west column
    blocks.append([(WEST[0], top), (WEST[1], top), (WEST[1], bottom), (WEST[0], bottom), (WEST[0], top)])
    for k in range(1, 8):
        lots.append([(WEST[0] + LOT * k, top), (WEST[0] + LOT * k, bottom)])

# ---- the buildings the plan draws: middle, long axis (as a vector), width; all pixels ----
# kind: (eave, ridge) in metres. Heights are not on the plan; all are assumed single storey
# except the building at the foot of Carrall, given a taller eave as the largest on the shore.
SMALL, HOUSE, LARGE = (2.4, 3.3), (3.0, 4.6), (3.6, 5.6)
BUILDINGS = [
    # name on the plan, middle, long axis, width, heights
    ('foot of Carrall, main wing', (1429.5, 3247), (37, 129), 66, LARGE),
    ('foot of Carrall, side wing', (1507.5, 3262), (21, 49), 50, HOUSE),
    ('Jail', (1769, 2946), (0, 36), 36, SMALL),
    ('Custom House', (1841, 3035.5), (0, 81), 46, HOUSE),
    ('lot 3', (2062.5, 2995.5), (0, 105), 53, HOUSE),
    ('lot 4', (2226, 2999), (8, 92), 58, HOUSE),
    ('lot 5', (2456, 3001), (-8, 110), 60, HOUSE),
    ('lot 6', (2627, 3032), (0, 88), 60, HOUSE),
    ('lot 7', (2794.5, 3029), (-6, 112), 62, HOUSE),
    ('in Water Street at Abbott', (3231, 3169.5), (0, 109), 62, HOUSE),
    ('in Water Street at Abbott, rear', (3219.5, 3097), (0, 36), 39, SMALL),
]

parts = []
for name, mid, axis, width, (eave, ridge) in BUILDINGS:
    e, n = metres(mid)
    ae = (axis[0] * UX[0] + axis[1] * UY[0])
    an = (axis[0] * UX[1] + axis[1] * UY[1])
    length = math.hypot(*axis) * M_PER_PX
    rot = math.degrees(math.atan2(an, ae))
    parts.append(
        f"  {{ kind: 'gable', x: {e:.1f}, y: {n:.1f}, w: {length:.1f}, d: {width * M_PER_PX:.1f}, eave: {eave}, ridge: {ridge}, rot: {rot:.1f} }}, // {name}"
    )

# ---- street names, as the plan has them in pencil; each line is given west to east or
# south to north, the way its lettering should read ----
carrall_mid = lambda y: carrall_edge(y) - 98
NAMES = [
    ('HASTINGS STREET', [(2900, 1013), (1300, 1013)]),
    ('CORDOVA STREET', [(2900, 2134), (1400, 2134)]),
    ('WATER STREET', [(2900, 3208), (1700, 3208)]),
    ('TROUNCE ALLEY', [(4700, 2657), (3250, 2657)]),
    ('ABBOTT STREET', [(3079, 1750), (3079, 3050)]),
    ('CARRALL STREET', [(carrall_mid(1900), 1900), (carrall_mid(3050), 3050)]),
    ('CAMBIE STREET', [(4891, 1750), (4891, 3050)]),
]


def ts_line(line):
    return '[' + ', '.join(str(lonlat(p)) for p in line) + ']'


out = [
    '// Generated by scripts/build-granville-1870.py. Do not edit: change the measurements there.',
    '// Traced by eye from the 1870 Plan of the Town of Granville (City of Vancouver Archives, MAP 978).',
    "import type { Part } from './models'",
    '',
    '/** Where the building parts are measured from: Abbott Street at Water Street. */',
    f'export const granvilleAnchor: [number, number] = {lonlat(ANCHOR_PX)}',
    '',
    '/** The buildings standing in March 1870, as the plan draws them. Heights are assumed. */',
    'export const granvilleBuildings1870: Part[] = [',
    *parts,
    ']',
    '',
    '/** The outline of each row of lots. The gaps between them are the streets and lanes. */',
    'export const granvilleBlocks: [number, number][][] = [',
    *[f'  {ts_line(b)},' for b in blocks],
    ']',
    '',
    '/** The lines dividing one lot from the next. */',
    'export const granvilleLots: [number, number][][] = [',
    *[f'  {ts_line(l)},' for l in lots],
    ']',
    '',
    '/** Street names, each with the line its lettering runs along. */',
    'export const granvilleStreetNames: { text: string; along: [number, number][] }[] = [',
    *[f"  {{ text: '{text}', along: {ts_line(line)} }}," for text, line in NAMES],
    ']',
    '',
    '/** Places on the plan that the story points at. */',
    'export const granvillePlaces = {',
    f'  footOfCarrall: {lonlat((1450, 3250))} as [number, number],',
    f'  jail: {lonlat((1769, 2946))} as [number, number],',
    f'  customHouse: {lonlat((1841, 3035.5))} as [number, number],',
    f'  landing: {lonlat((1500, 3420))} as [number, number],',
    '}',
    '',
]
open(sys.argv[1], 'w').write('\n'.join(out))
print(f'{len(blocks)} rows, {len(lots)} lot lines, {len(parts)} building parts')
