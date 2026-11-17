"""
The rebuilt town, three years after the fire, traced from the 1889 fire insurance plan.

  Plan of Vancouver, 1889 [fire map]. Dakin Publishing Co. City of Vancouver Archives,
  AM54-S13-MAP 338. Public domain. Two sheets:
  LEG1319.480 [Water Street to Abbott Street to Dupont Street to Carrall Street]
  https://searcharchives.vancouver.ca/plan-of-vancouver-1889-fire-map-water-street-to-abbott-street-to-dupont-street-to-carrall-street
  LEG1319.479 [Water Street to Homer Street to Dupont Street to Abbott Street], traced only
  as far west as Cambie, the edge of the old townsite
  https://searcharchives.vancouver.ca/plan-of-vancouver-1889-fire-map-water-street-to-homer-street-to-dupont-street-to-abbott-street

Positions are read by eye off the archive's scans (LEG1319.480 is 3780 x 3013 pixels,
LEG1319.479 is 3771 x 3021) in enlarged views. Both sheets are drawn with north to the right
and Water Street at the right with the inlet beyond it; on .480 Abbott runs along the top and
Carrall slants along the bottom, on .479 Cambie runs along the top and Abbott along the bottom.

How the plan is tied to the ground
  It is fitted to the 1870 government plan (build-granville-1870.py), which is tied to today's
  streets. Across the blocks, the lot lines on Hastings, both sides of Cordova and Water are
  laid on the same lines of the 1870 plan, piece by piece. Along the blocks, the line from
  Abbott to Carrall is stretched to the 1870 plan's length (0.1064 m to a scan pixel against
  0.0999 across), which suggests the scan or the sheet is not true in that direction.
  Positions are good to a few metres.

Only the main buildings are traced. Sheds and the smallest outbuildings are left out.
Storeys are the plan's where it marks them; everything else is one storey. Heights in metres
and roof forms are assumed.

Usage: python3 scripts/build-granville-1889.py src/lib/data/granville1889.ts
"""
import math
import sys

# ---- the 1870 plan's transform (see build-granville-1870.py) ----
M_PER_PX, ANCHOR_PX, ANCHOR = 0.0995, (3079.0, 3208.0), (-123.10638, 49.28388)
UX, UY = (-0.9637, 0.2670), (0.2670, 0.9637)
M_PER_DEG_LAT = 111_200
M_PER_DEG_LON = 111_320 * math.cos(math.radians(ANCHOR[1]))

# ---- each sheet onto the 1870 plan ----
# across the blocks (the scan's x, toward Water): matching lot lines, scan x -> 1870 plan y.
# along the blocks (the scan's y, toward Carrall): one lot line, scan y -> 1870 plan x, and
# metres to a scan pixel, set so the block's length matches the 1870 plan.
SHEETS = {
    '480': {'across': [(1150, 1177), (1963, 2032), (2155, 2237), (3025, 3109)], 'y0': 248, 'x0': 2975, 'ky': 0.1064},
    '479': {'across': [(1138, 1177), (1974, 2032), (2165, 2237), (3013, 3109)], 'y0': 1350, 'x0': 4787, 'ky': 0.1038},
}


def across(sheet, x):
    pts = SHEETS[sheet]['across']
    for (a, pa), (b, pb) in zip(pts, pts[1:]):
        if x <= b or (b, pb) == pts[-1]:
            return pa + (x - a) * (pb - pa) / (b - a)
    return pts[-1][1]


def to_1870(sheet, p):
    sh = SHEETS[sheet]
    return (sh['x0'] - (p[1] - sh['y0']) * sh['ky'] / M_PER_PX, across(sheet, p[0]))


def metres(sheet, p):
    q = to_1870(sheet, p)
    dx, dy = q[0] - ANCHOR_PX[0], q[1] - ANCHOR_PX[1]
    return ((dx * UX[0] + dy * UY[0]) * M_PER_PX, (dx * UX[1] + dy * UY[1]) * M_PER_PX)


def lonlat(sheet, p):
    e, n = metres(sheet, p)
    return [round(ANCHOR[0] + e / M_PER_DEG_LON, 6), round(ANCHOR[1] + n / M_PER_DEG_LAT, 6)]


# The enlarged views the measurements were read from: (left, top, scan pixels per view pixel)
K6 = 848 / 800 / 0.6
VIEW = {
    'A': (2000, 80, K6),   # Water to Cordova, the Abbott end
    'B': (2000, 880, K6),  # Water to Cordova, the Carrall end
    'C': (1000, 80, K6),   # Cordova to Hastings, the Abbott end
    'D': (1000, 880, K6),  # Cordova to Hastings, the Carrall end
    'E': (3050, 150, K6),  # north of Water, the Abbott end
    'F': (3050, 700, K6),  # north of Water, the Carrall end
    'Z': (2550, 1350, 848 / 800 / 1.5),  # the corner of Water and Carrall, close
    # sheet .479
    'G': (2050, 1230, K6),  # Water to Cordova, the Cambie end
    'H': (2050, 2030, K6),  # Water to Cordova, the Abbott end
    'I': (3100, 1230, K6),  # north of Water, the Cambie end
    'J': (3100, 2030, K6),  # north of Water, the Abbott end
    'K': (1050, 1230, K6),  # Cordova to Hastings, the Cambie end
    'L': (1050, 2030, K6),  # Cordova to Hastings, the Abbott end
}
SHEET_OF = {v: ('479' if v in 'GHIJKL' else '480') for v in VIEW}


def px(view, x, y):
    x0, y0, k = VIEW[view]
    return (x0 + x * k, y0 + y * k)


ONE, TWO, THREE = (3.2, 4.6), (6.2, 7.6), (9.2, 10.6)

# name on the plan, view, left, top, right, bottom, storeys
BUILDINGS = [
    # ---- Water to Cordova, Cordova side, from Abbott toward Carrall ----
    ('clothing and furnishing goods, dwelling', 'A', 88, 95, 160, 150, TWO),
    ('clothing, pawn, lodgings', 'A', 165, 95, 300, 190, TWO),
    ('saloon, lodgings', 'A', 88, 150, 180, 195, TWO),
    ('tailor, lodgings', 'A', 88, 198, 150, 238, TWO),
    ('Fashion Stable', 'A', 180, 195, 305, 260, ONE),
    ('saloon, lodgings', 'A', 88, 240, 185, 280, TWO),
    ('second-hand goods, fruit', 'A', 88, 280, 160, 310, ONE),
    ('dwelling', 'A', 225, 265, 295, 310, ONE),
    ('blacksmith', 'A', 228, 312, 305, 345, ONE),
    ('tailor, photographer, dwelling', 'A', 88, 345, 230, 378, TWO),
    ('drugs, notions', 'A', 88, 385, 160, 415, ONE),
    ('dwelling', 'A', 232, 412, 290, 440, ONE),
    ('saloon', 'A', 88, 420, 150, 470, ONE),
    ('barber and baths', 'A', 88, 470, 280, 487, ONE),
    ('grocery, dwelling', 'A', 88, 490, 185, 520, TWO),
    ('meat', 'A', 88, 525, 240, 550, ONE),
    ('fruit, cobbler, dwelling', 'A', 88, 552, 150, 580, ONE),
    ('saloon, lodgings', 'A', 88, 585, 200, 625, TWO),
    ('wagon shed', 'A', 225, 585, 305, 625, ONE),
    ('saloon, restaurant, tobacco, lodgings', 'A', 88, 628, 185, 700, TWO),
    ('shed', 'A', 222, 640, 305, 700, ONE),
    ('furniture, upholstering and undertaking', 'A', 88, 705, 305, 738, ONE),
    ('grocery', 'B', 88, 280, 160, 315, ONE),
    ('mattress factory', 'B', 205, 280, 305, 350, ONE),
    ('furnishing goods, clothing', 'B', 88, 318, 160, 345, ONE),
    ('offices, lodgings', 'B', 160, 285, 205, 385, TWO),
    ('books and stationery', 'B', 88, 348, 185, 420, ONE),
    ('storage, drugs, baker, fruit, sausage', 'B', 88, 420, 245, 480, ONE),
    ('saloon', 'B', 245, 385, 300, 462, ONE),
    # ---- Water to Cordova, Water side ----
    ('restaurant', 'A', 340, 95, 390, 205, TWO),
    ('tailor, office, dwellings', 'A', 390, 95, 500, 135, ONE),
    ('saloon, lodgings', 'A', 500, 95, 580, 130, TWO),
    ('store, kitchen, dining room, saloon, office', 'A', 340, 205, 580, 245, ONE),
    ('dwelling', 'A', 340, 290, 375, 320, ONE),
    ('barber, locksmith', 'A', 515, 262, 580, 310, ONE),
    ('tailor, confectioner, barber, dwelling', 'A', 505, 345, 580, 410, ONE),
    ('tenements', 'A', 340, 425, 440, 450, ONE),
    ('produce and fruit', 'A', 440, 415, 580, 470, TWO),
    ('saloon, lodgings', 'A', 480, 480, 580, 520, TWO),
    ('barber, confectioner', 'A', 515, 525, 580, 590, ONE),
    ('Granville Hotel, boarding and lodging house', 'A', 375, 595, 530, 625, TWO),
    ('saloon', 'A', 530, 595, 580, 625, ONE),
    ('Fire Hall No. 1', 'A', 500, 635, 580, 700, TWO),
    ('dwelling', 'A', 450, 710, 495, 738, ONE),
    ('sail maker and ship chandler', 'B', 470, 290, 580, 315, ONE),
    ('second-hand goods, barber and baths', 'B', 345, 330, 478, 412, ONE),
    # ---- Cordova to Hastings, Hastings side ----
    ('Brunswick Hotel, saloon and billiards', 'D', 85, 180, 155, 235, TWO),
    ('dining room, kitchen', 'D', 85, 235, 295, 280, ONE),
    ('laundry', 'D', 185, 180, 275, 197, ONE),
    ('dwelling', 'D', 235, 380, 295, 410, ONE),
    ('blacksmith', 'D', 245, 450, 295, 480, ONE),
    ('hay and feed, dwelling', 'D', 85, 465, 160, 500, TWO),
    ('drugs, dwelling and lodging, furnishing goods', 'D', 235, 495, 295, 605, TWO),
    # ---- Cordova to Hastings, Cordova side ----
    ('saloon, dining room, kitchen', 'C', 470, 95, 545, 195, ONE),
    ('produce, lodgings', 'C', 440, 205, 545, 235, TWO),
    ('dwelling', 'C', 332, 255, 395, 285, ONE),
    ('dwelling', 'C', 332, 295, 410, 312, ONE),
    ('offices, produce', 'C', 420, 245, 545, 310, TWO),
    ('stores', 'C', 420, 320, 545, 385, ONE),
    ('storage of furniture', 'C', 332, 360, 390, 385, ONE),
    ('furniture wareroom', 'C', 380, 425, 545, 465, ONE),
    ('dwelling, saloon, kitchen', 'C', 420, 480, 545, 520, ONE),
    ('dwelling', 'C', 332, 495, 390, 520, ONE),
    ('vacant', 'C', 355, 545, 430, 580, ONE),
    ('offices', 'C', 430, 525, 545, 620, TWO),
    ('stores', 'D', 430, 175, 545, 345, ONE),
    ('storage', 'D', 332, 350, 410, 375, ONE),
    ('stores, hall over', 'D', 430, 350, 545, 455, THREE),
    ('oil warehouse, tin shop', 'D', 355, 385, 420, 465, ONE),
    ('dwelling', 'D', 332, 465, 375, 500, ONE),
    ('clothing and furnishing goods, lodgings', 'D', 375, 465, 440, 570, TWO),
    ('candy factory, tobacco, office, saloon, barber', 'D', 440, 465, 540, 560, ONE),
    ('grocery, dwelling', 'D', 335, 525, 375, 590, TWO),
    # ---- north of Water, built out on piles ----
    ('grocery, hardware and tin shop, auction goods', 'E', 95, 55, 200, 155, ONE),
    ('Salvation Army', 'E', 200, 55, 255, 150, TWO),
    ('fish market, lodgings', 'E', 185, 415, 315, 470, TWO),
    ('restaurant, lodgings', 'F', 80, 225, 195, 265, TWO),
    ('meat', 'F', 80, 268, 220, 315, ONE),
    ('vacant', 'F', 80, 315, 210, 378, ONE),
    ('Sunnyside Hotel, dining room and saloon', 'F', 80, 380, 260, 470, TWO),
    ('dwellings', 'F', 260, 388, 310, 445, ONE),
    # ==== sheet .479, Cambie to Abbott ====
    # ---- Water to Cordova, Cordova side ----
    ('stores, three storeys', 'G', 65, 70, 195, 250, THREE),
    ('millinery, dwelling', 'G', 65, 250, 140, 285, TWO),
    ('International Hotel: grocery, office, restaurant, lodgings', 'G', 65, 390, 200, 495, THREE),
    ('Cosmopolitan Hotel: dining room, kitchen, saloon, restaurant', 'H', 45, 430, 150, 490, TWO),
    ('bakery, barber and baths, tin shop, storage, boarding', 'H', 150, 385, 285, 490, TWO),
    # ---- Water to Cordova, Water side ----
    ("Queen's stable and repository", 'G', 320, 68, 385, 170, ONE),
    ('lodging house', 'G', 385, 68, 445, 165, TWO),
    ('Cabinet Hotel: saloon, lodgings, restaurant, confectioner, barber', 'G', 445, 68, 545, 160, TWO),
    ('Stag and Pheasant Hotel: kitchen, dining room, saloon', 'G', 320, 172, 545, 220, TWO),
    ('Carter House: dining room, saloon', 'G', 400, 228, 545, 265, TWO),
    ('tin shop, plumbing, stoves', 'G', 320, 285, 545, 335, ONE),
    ('dwellings', 'G', 320, 362, 380, 382, ONE),
    ('wagon shop, blacksmith', 'G', 380, 385, 545, 425, ONE),
    ('carpenter', 'G', 330, 445, 370, 470, ONE),
    ('watchmaker', 'G', 430, 445, 545, 462, ONE),
    ('dwellings', 'G', 380, 462, 440, 500, ONE),
    ('saloon, lodgings', 'G', 440, 462, 545, 500, TWO),
    ('dwellings', 'H', 320, 235, 460, 265, ONE),
    ('Edinburgh Hotel: saloon, lodgings', 'H', 460, 230, 545, 265, TWO),
    ('jewelry, dwelling', 'H', 470, 268, 545, 290, ONE),
    ('lodgings, dwelling', 'H', 400, 295, 545, 322, TWO),
    ("Queen's Hotel: boarding and lodging, saloon", 'H', 410, 378, 545, 445, TWO),
    ('lodgings, restaurant, saloon', 'H', 410, 450, 545, 490, TWO),
    ('grocery, second-hand, barber', 'H', 320, 435, 410, 490, ONE),
    ('dwellings', 'H', 320, 380, 345, 435, ONE),
    # ---- north of Water, on piles over the water ----
    ('S.P. Hotel: saloon, dwelling, Chinese wash house', 'I', 58, 65, 170, 140, TWO),
    ('lumber shed and platform', 'I', 200, 65, 278, 115, ONE),
    ('Chinese wash house', 'I', 58, 145, 205, 170, ONE),
    ('produce', 'I', 40, 285, 125, 315, ONE),
    ('tenements', 'I', 58, 385, 150, 468, TWO),
    ('restaurant, lodgings', 'I', 58, 468, 215, 505, TWO),
    ('saloon and billiards, lodgings', 'I', 40, 508, 285, 540, TWO),
    ('general merchandise', 'J', 58, 268, 190, 322, TWO),
    ('hay warehouse', 'J', 190, 268, 280, 378, ONE),
    ('feed and grain', 'J', 58, 325, 190, 375, ONE),
    ("M. A. Harvey's livery, sale and feed stable", 'J', 178, 380, 285, 490, ONE),
    # ---- Cordova to Hastings, Hastings side ----
    ('vacant; clothing, Y.M.C.A.', 'K', 50, 400, 135, 475, TWO),
    ('dwelling, auctioneers', 'L', 50, 237, 265, 270, TWO),
    # ---- Cordova to Hastings, Cordova side ----
    ('offices, jewelry, painting, tailor', 'K', 305, 68, 465, 135, ONE),
    ('grocery, fruit, meat', 'K', 465, 68, 523, 165, ONE),
    ('offices, dressmaker, tea and coffee', 'K', 435, 175, 523, 228, TWO),
    ('offices, dry goods', 'K', 405, 283, 523, 338, TWO),
    ('hardware storage', 'K', 305, 340, 405, 418, ONE),
    ('jewelry, hardware, offices, cigar factory', 'K', 405, 340, 523, 418, TWO),
    ('Hudson\'s Bay Co.: liquors and groceries', 'K', 420, 418, 523, 500, ONE),
    ('storage', 'K', 305, 460, 420, 480, ONE),
    ('storage, lime and hardware', 'K', 305, 500, 420, 548, ONE),
    ('hardware, reading room', 'K', 420, 500, 523, 548, TWO),
    ('clothing and furnishing goods, office', 'K', 470, 550, 523, 590, TWO),
    ('millinery, dwelling', 'K', 435, 595, 523, 615, ONE),
    ('tin shop, hardware, offices', 'K', 305, 615, 523, 660, TWO),
    ('jewelry, tobacco', 'K', 445, 660, 523, 685, ONE),
    ('wholesale wines, liquors and cigars', 'K', 305, 688, 523, 725, ONE),
    ('paints, shed, printing', 'L', 305, 330, 390, 410, ONE),
    ('drugs, books and stationery, dry goods, office, halls over', 'L', 415, 350, 523, 480, THREE),
]

BYRNES = ('Byrnes Block: bakery and two saloons, two storeys', 'Z', 420, 160, 680, 345, TWO)

# the planking on piles north of Water Street
DECK = ('planked and on piling, north of Water Street', 'E', 95, 55, 345, 0)
DECK_END = px('F', 345, 480)


def part(name, view, x1, y1, x2, y2, heights):
    sheet = SHEET_OF[view]
    a, b = px(view, x1, y1), px(view, x2, y2)
    e, n = metres(sheet, ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2))
    along = (b[1] - a[1]) * SHEETS[sheet]['ky']  # along the street, east-south-east
    deep = (b[0] - a[0]) * M_PER_PX  # across, north-north-east
    eave, ridge = heights
    if along >= deep:
        w, d, rot = along, deep, -15.5
    else:
        w, d, rot = deep, along, 74.5
    return f"  {{ kind: 'gable', x: {e:.1f}, y: {n:.1f}, w: {w:.1f}, d: {d:.1f}, eave: {eave}, ridge: {ridge}, rot: {rot:.1f} }}, // {name}"


parts = [part(*b) for b in BUILDINGS]
# the deck: one box from the north side of Water Street to the outer piles
a = px('E', 95, 55)
e, n = metres('480', ((a[0] + DECK_END[0]) / 2, (a[1] + DECK_END[1]) / 2))
deck = f"  {{ kind: 'box', x: {e:.1f}, y: {n:.1f}, w: {(DECK_END[1] - a[1]) * SHEETS['480']['ky']:.1f}, d: {(DECK_END[0] - a[0]) * M_PER_PX:.1f}, h: 0.25, z0: -0.25, rot: -15.5, legs: 5, drop: 1.6 }}, // {DECK[0]}"
byrnes_mid = px(BYRNES[1], (BYRNES[2] + BYRNES[4]) / 2, (BYRNES[3] + BYRNES[5]) / 2)

out = [
    '// Generated by scripts/build-granville-1889.py. Do not edit: change the measurements there.',
    '// Traced by eye from the 1889 Dakin fire insurance plan (City of Vancouver Archives, LEG1319.480).',
    "import type { Part } from './models'",
    '',
    '/** The rebuilt town between Abbott and Carrall in 1889. Measured from the same point as the 1870 plan. */',
    'export const granvilleBuildings1889: Part[] = [',
    deck,
    *parts,
    ']',
    '',
    '/** The Byrnes Block as the 1889 plan draws it, before its later additions. */',
    'export const byrnesBlock1889: Part[] = [',
    part(*BYRNES),
    ']',
    '',
    f"export const byrnesBlock1889At: [number, number] = {lonlat('480', byrnes_mid)}",
    '',
]
open(sys.argv[1], 'w').write('\n'.join(out))
print(f"{len(parts)} buildings, Byrnes Block at {lonlat('480', byrnes_mid)}")
