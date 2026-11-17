"""
Granville in August 1885, traced from the fire insurance map made ten months before the fire.

  Granville [Townsite], B.C. Aug., 1885. Sanborn Map & Publishing Co., New York.
  City of Vancouver Archives, AM1594-: MAP 553. Public domain.
  https://searcharchives.vancouver.ca/granville-townsite-b-c-aug-1885

Everything below is a position on the archive's scan (4342 x 3645 pixels), read by eye from
enlarged views of it. North is at the top. The map calls today's Water Street "Front",
Cordova "Willow", Abbott "Wood (arbitrary)" and Carrall "Water (arbitrary)": the last two
were the map-maker's own names for streets that had none.

How the map is tied to the ground
  It is fitted to the 1870 government plan (see build-granville-1870.py), which is itself
  tied to today's streets. The block between Abbott and Carrall, Water and Cordova, appears
  on both: its four corners on this map are laid on its four corners on the plan. That takes
  a stretch of 2.7 per cent east to west. By its own scale bar this map draws the block about
  5 m deeper than the survey does, so positions are good to a few metres, no better.

Only the main buildings are traced: outhouses and the smallest sheds are left out, and so
are the blocks west of Abbott and south of Cordova, which the map shows thinly built.

Usage: python3 scripts/build-granville-1885.py src/lib/data/granville1885.ts
"""
import math
import sys

# the same numbers as build-granville-1870.py
M_PER_PX, ANCHOR_PX, ANCHOR = 0.0995, (3079.0, 3208.0), (-123.10638, 49.28388)
UX, UY = (-0.9637, 0.2670), (0.2670, 0.9637)
M_PER_DEG_LAT = 111_200
M_PER_DEG_LON = 111_320 * math.cos(math.radians(ANCHOR[1]))
KX, KY = 1.027, 1.0  # this map's pixels to the 1870 plan's, east-west and north-south


def to_1870(p):
    """A pixel on the 1885 scan as a pixel on the 1870 plan (which is drawn south-up)."""
    return (2975 - (p[0] - 2038) * KX, 3109 - (p[1] - 778) * KY)


def metres(p):
    q = to_1870(p)
    dx, dy = q[0] - ANCHOR_PX[0], q[1] - ANCHOR_PX[1]
    return ((dx * UX[0] + dy * UY[0]) * M_PER_PX, (dx * UX[1] + dy * UY[1]) * M_PER_PX)


def lonlat(p):
    e, n = metres(p)
    return [round(ANCHOR[0] + e / M_PER_DEG_LON, 6), round(ANCHOR[1] + n / M_PER_DEG_LAT, 6)]


# The enlarged views the measurements were taken from: (left, top, scan pixels per view pixel)
VIEW = {'w': (1950, 620, 1.4133), 'e': (2850, 620, 1.4133), 'n': (1700, 150, 2.524)}


def px(view, x, y):
    x0, y0, k = VIEW[view]
    return (x0 + x * k, y0 + y * k)


# storeys: (eave, ridge) in metres. The map marks two-storey buildings; the rest are one.
ONE, TWO, HALL, SHED = (3.0, 4.4), (6.0, 7.8), (4.4, 6.2), (2.4, 3.0)

# name, view, left, top, right, bottom (in that view), height, turn (degrees anticlockwise off the grid)
BUILDINGS = [
    # ---- Front Street, south side, from Abbott east to Carrall ----
    ('lot 23, corner of Abbott', 'w', 62, 113, 107, 180, ONE, 0),
    ('Tenements', 'w', 62, 232, 98, 390, ONE, 0),
    ('Restaurant', 'w', 120, 125, 152, 212, ONE, 0),
    ('Saloon', 'w', 152, 125, 192, 212, ONE, 0),
    ("General merchandise", 'w', 195, 125, 222, 270, ONE, 0),
    ('Rooms', 'w', 222, 125, 268, 212, ONE, 0),
    ('B.C. Bakery and restaurant', 'w', 268, 125, 297, 288, ONE, 0),
    ('Barber', 'w', 297, 125, 325, 215, ONE, 0),
    ('General merchandise', 'w', 368, 115, 420, 235, ONE, 0),
    ('Chinese store', 'w', 424, 115, 470, 250, ONE, 0),
    ('Saloon and wash house', 'w', 470, 115, 517, 205, ONE, 0),
    ('Sheds', 'w', 475, 290, 498, 405, SHED, 0),
    ('Chinese dwellings', 'w', 500, 290, 530, 405, ONE, 0),
    ('Saloon', 'w', 545, 115, 608, 240, ONE, 0),
    ('Public Hall', 'w', 562, 245, 607, 402, HALL, 0),
    ('Granville Hotel', 'w', 625, 113, 695, 248, TWO, 0),
    ('Granville Hotel dining room and kitchen', 'w', 628, 248, 672, 382, ONE, 0),
    ('stable', 'w', 195, 338, 248, 400, SHED, 0),
    ('stable', 'w', 270, 343, 316, 405, SHED, 0),
    ('stable', 'w', 433, 367, 470, 405, SHED, 0),
    ('Telegraph office', 'e', 93, 125, 115, 160, ONE, 0),
    ('Lodging', 'e', 95, 170, 117, 322, ONE, 0),
    ('Jail', 'e', 118, 180, 152, 238, ONE, 0),
    ('Jail kitchen and yard buildings', 'e', 118, 238, 175, 330, ONE, 0),
    ('Wood house and storage', 'e', 47, 378, 180, 402, SHED, 0),
    ('Dwelling', 'e', 175, 130, 235, 190, ONE, -15),
    ('Dwelling', 'e', 253, 135, 295, 215, ONE, 0),
    ('Deighton Hotel', 'e', 345, 120, 425, 235, TWO, 11.7),
    ('Deighton Hotel rooms', 'e', 380, 285, 435, 332, ONE, 11.7),
    ('Deighton Hotel storage', 'e', 345, 295, 378, 345, SHED, 11.7),
    ('stable', 'e', 200, 378, 245, 402, SHED, 0),
    ('stable', 'e', 283, 350, 322, 410, SHED, 0),
    ('stable', 'e', 322, 350, 377, 410, SHED, 0),
    # ---- the same block, facing Cordova ----
    ('Dwelling', 'w', 335, 488, 382, 585, TWO, 0),
    ('Dwelling', 'w', 430, 580, 470, 712, ONE, 0),
    ('Shed', 'w', 475, 572, 498, 712, SHED, 0),
    ('Dwelling', 'w', 498, 625, 570, 712, ONE, 0),
    ('stable', 'w', 538, 467, 613, 530, SHED, 0),
    ('stable', 'w', 632, 487, 672, 530, SHED, 0),
    ('Storage', 'w', 617, 582, 648, 632, SHED, 0),
    ('Barber and commercial', 'e', 185, 470, 250, 530, ONE, -15),
    ('stable', 'e', 258, 465, 325, 540, SHED, 0),
    ('Dwelling', 'e', 333, 472, 370, 540, ONE, 0),
    ('Real estate office and dwelling', 'e', 395, 450, 485, 500, ONE, 11.7),
    ('Dwelling', 'e', 400, 555, 497, 625, TWO, 11.7),
    ('Dwelling', 'e', 175, 690, 215, 720, ONE, 0),
    # ---- north of Front Street, built out over the water on piles ----
    ('Sunnyside Hotel', 'n', 612, 45, 660, 165, TWO, 25),
    ('Dwelling and saloon', 'n', 537, 98, 575, 185, ONE, 0),
    ('Fishing shed', 'n', 520, 98, 537, 185, SHED, 0),
    ('Chinese wash house', 'n', 180, 75, 205, 172, ONE, 0),
]

# ---- planking the map draws on piles over the beach and the water: name, view, left, top, right, bottom ----
DECKS = [
    ('planked on piles, under the Sunnyside Hotel and its neighbours', 'n', 470, 95, 690, 187),
    ('raised plank walk along the north side of Front Street', 'n', 135, 222, 668, 240),
    ('planking under the Chinese wash house', 'n', 172, 68, 212, 180),
    ('plank to the platform', 'n', 205, 180, 212, 224),
    ('plank to the platform', 'n', 462, 187, 470, 224),
]

parts = []
for name, view, x1, y1, x2, y2 in DECKS:
    a, b = px(view, x1, y1), px(view, x2, y2)
    e, n = metres(((a[0] + b[0]) / 2, (a[1] + b[1]) / 2))
    w, d = (b[0] - a[0]) * KX * M_PER_PX, (b[1] - a[1]) * KY * M_PER_PX
    # a deck a quarter of a metre thick, its top at the buildings' floor, on posts every 4 m
    parts.append(f"  {{ kind: 'box', x: {e:.1f}, y: {n:.1f}, w: {w:.1f}, d: {d:.1f}, h: 0.25, z0: -0.25, rot: -15.5, legs: 4, drop: 1.6 }}, // {name}")
for name, view, x1, y1, x2, y2, (eave, ridge), turn in BUILDINGS:
    a, b = px(view, x1, y1), px(view, x2, y2)
    e, n = metres(((a[0] + b[0]) / 2, (a[1] + b[1]) / 2))
    across = (b[0] - a[0]) * KX * M_PER_PX  # east to west
    deep = (b[1] - a[1]) * KY * M_PER_PX  # north to south
    # the ridge runs the long way
    if across >= deep:
        w, d, rot = across, deep, -15.5 + turn
    else:
        w, d, rot = deep, across, 74.5 + turn
    parts.append(f"  {{ kind: 'gable', x: {e:.1f}, y: {n:.1f}, w: {w:.1f}, d: {d:.1f}, eave: {eave}, ridge: {ridge}, rot: {rot:.1f} }}, // {name}")

# ---- the same buildings as bare footprints, for the stop after the fire ----
footprints = []
for name, view, x1, y1, x2, y2, _heights, turn in BUILDINGS:
    a, b = px(view, x1, y1), px(view, x2, y2)
    e, n = metres(((a[0] + b[0]) / 2, (a[1] + b[1]) / 2))
    footprints.append(f"  {{ kind: 'box', x: {e:.1f}, y: {n:.1f}, w: {(b[0] - a[0]) * KX * M_PER_PX:.1f}, d: {(b[1] - a[1]) * KY * M_PER_PX:.1f}, h: 0.15, rot: {-15.5 + turn:.1f} }}, // {name}")

# ---- the lines the map draws: the block in two rows either side of its alley, and the
# plank walk along the north side of Front Street ----
LINES = [
    [px('w', 62, 113), px('e', 413, 112), px('e', 476, 408), px('w', 62, 406), px('w', 62, 113)],
    [px('w', 62, 450), px('e', 484, 447), px('e', 540, 725), px('w', 62, 728), px('w', 62, 450)],
    [px('n', 135, 233), px('n', 665, 233)],  # raised plank walk
    [px('n', 470, 95), px('n', 690, 95), px('n', 690, 185), px('n', 470, 185), px('n', 470, 95)],  # planking on piles
]

# names as the map gives them, each along the line its lettering should run (west to east, south to north)
NAMES = [
    ('FRONT STREET', [px('n', 150, 208), px('n', 600, 208)]),
    ('WILLOW STREET', [px('n', 250, 632), px('n', 700, 632)]),
    ('WOOD STREET', [px('n', 100, 560), px('n', 100, 260)]),
    ('WATER STREET', [px('n', 790, 640), px('n', 735, 380)]),
]

PLACES = {
    'centre': px('w', 520, 300),
    'deightonHotel': px('e', 385, 178),
    'granvilleHotel': px('w', 660, 180),
    'sunnysideHotel': px('n', 636, 105),
    'publicHall': px('w', 585, 325),
    'jail': px('e', 135, 209),
    'chineseStore': px('w', 447, 180),
}


def ts_line(line):
    return '[' + ', '.join(str(lonlat(p)) for p in line) + ']'


out = [
    '// Generated by scripts/build-granville-1885.py. Do not edit: change the measurements there.',
    '// Traced by eye from the Sanborn fire insurance map of August 1885 (City of Vancouver Archives, MAP 553).',
    "import type { Part } from './models'",
    '',
    '/** The main buildings standing in August 1885. Measured from the same point as the 1870 plan. */',
    'export const granvilleBuildings1885: Part[] = [',
    *parts,
    ']',
    '',
    '/** The block between Abbott and Carrall in its two rows, the plank walk, and the planking over the water. */',
    'export const granvilleLines1885: [number, number][][] = [',
    *[f'  {ts_line(line)},' for line in LINES],
    ']',
    '',
    '/** Street names as the 1885 map gives them. */',
    'export const granvilleStreetNames1885: { text: string; along: [number, number][] }[] = [',
    *[f"  {{ text: '{text}', along: {ts_line(line)} }}," for text, line in NAMES],
    ']',
    '',
    '/** The same buildings as footprints flat on the ground. */',
    'export const granvilleFootprints1885: Part[] = [',
    *footprints,
    ']',
    '',
    '/** Places the story points at. */',
    'export const granvillePlaces1885 = {',
    *[f'  {key}: {lonlat(p)} as [number, number],' for key, p in PLACES.items()],
    '}',
    '',
]
open(sys.argv[1], 'w').write('\n'.join(out))
print(f'{len(parts)} building parts')
