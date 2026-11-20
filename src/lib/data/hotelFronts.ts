/**
 * The street fronts of the hotels that can be gone to on the map, each read by eye from its one photograph
 * (hotelPhotos.ts): how many storeys, how many window bays on each front, what kind of window, whether there
 * is a cornice. Which wall is which street is from the footprint and the street centrelines.
 *
 * These are counts from an oblique photograph, not a measured survey: a front seen at a steep angle or behind
 * trees is counted as well as it can be, and `read` says for each hotel what could and could not be seen.
 * Storey heights and window sizes are spaced evenly within the building's LiDAR height.
 *
 * The photographs are not laid on the models now: they did not sit well with the line drawing, and are shown
 * beside the map instead. The corners recorded under `photo` are kept in case that is tried again.
 * As it was: a front with a `photo` carried the photograph itself in place of drawn windows: its four corners were
 * picked by eye in the photograph and the picture is squared up to the wall through them. The corners are
 * good to a few pixels, so the picture can sit a little off at the edges, and whatever stood in front of
 * the building (trees, wires, cars, signs) is flattened onto the wall with it.
 */
import type { Front } from './stops'

export const hotelFronts: Record<string, { front: Front; read: string }> = {
  'PENNSYLVANIA HOTEL': {
    front: { storeys: 5, cornice: 'light', turret: true, faces: [{ toward: 0, bays: 2, kind: 'oriel', photo: { quad: [[0.106, 0.925], [0.375, 0.938], [0.375, 0.258], [0.106, 0.323]] } }, { toward: 270, bays: 6, kind: 'oriel', photo: { quad: [[0.453, 0.938], [0.809, 0.894], [0.809, 0.523], [0.453, 0.258]] } }] },
    read: 'Five storeys, with bay windows up the four upper floors of both fronts and a pointed turret on the corner. The two bays of the short front are clear in the photograph; the six on the long front are counted at an angle. The balconies between the bays are not drawn.',
  },
  'DOMINION HOTEL': {
    front: { storeys: 3, cornice: 'light', faces: [{ toward: 15, bays: 9, kind: 'arched', photo: { quad: [[0.138, 0.750], [0.497, 0.762], [0.497, 0.125], [0.138, 0.285]] } }, { toward: 285, bays: 20, kind: 'arched' }] },
    read: 'Three storeys with round-headed windows. The nine windows of the short front are counted from the photograph; the long front is behind trees there and is drawn at the same spacing. The cut-off corner with its doorway is not in the footprint.',
  },
  'NEW COLUMBIA (TAWOW)': {
    front: { storeys: 6, faces: [{ toward: 1, bays: 3, kind: 'flat', photo: { quad: [[0.396, 0.669], [0.688, 0.656], [0.688, 0.258], [0.396, 0.148]] } }, { toward: 91, bays: 6, kind: 'pair', photo: { quad: [[0.067, 0.625], [0.396, 0.669], [0.396, 0.148], [0.067, 0.331]] } }] },
    read: 'Six storeys of plain windows, in pairs on the long front, both counted partly through trees. The dark cladding of the top storey and the fire escapes are not drawn.',
  },
  'EUROPE HOTEL': {
    front: { storeys: 6, cornice: 'heavy', faces: [{ toward: 180, bays: 14, kind: 'flat' }, { toward: 344, bays: 14, kind: 'flat' }, { toward: 270, bays: 1, kind: 'bow', photo: { quad: [[0.329, 0.883], [0.528, 0.875], [0.545, 0.141], [0.293, 0.148]] } }] },
    read: 'Six storeys coming to a point, under a deep cornice. The photograph looks straight at the point, so the windows down each side are counted at a steep angle and may be one or two out. The point is drawn rounded, as a half-circle on the flat end of the footprint, with three lights to a floor as the photograph shows.',
  },
  'HILDON HOTEL': {
    front: { storeys: 6, cornice: 'heavy', faces: [{ toward: 16, bays: 4, kind: 'flat', photo: { quad: [[0.434, 0.854], [0.653, 0.803], [0.653, 0.071], [0.430, 0.310]] } }] },
    read: 'Six storeys of single windows under a bracketed cornice, with a pub at the street. The front is seen at an angle: four windows to a floor is the count, and could be five.',
  },
  'IVANHOE HOTEL': {
    front: { storeys: 5, cornice: 'heavy', faces: [{ toward: 271, bays: 6, kind: 'wide', piers: true, photo: { quad: [[0.177, 0.841], [0.669, 0.811], [0.669, 0.124], [0.177, 0.283]] } }, { toward: 181, bays: 8, kind: 'flat', photo: { quad: [[0.669, 0.811], [0.844, 0.785], [0.844, 0.403], [0.669, 0.124]] } }] },
    read: 'Five storeys. The Main Street front has six wide windows to a floor between brick piers; the side has eight narrower ones, counted at an angle. The awnings and fire escapes are not drawn.',
  },
  'REGAL HOTEL': {
    front: { storeys: 5, cornice: 'heavy', faces: [{ toward: 314, bays: 3, kind: 'pair', photo: { quad: [[0.273, 0.856], [0.544, 0.900], [0.539, 0.062], [0.258, 0.292]] } }] },
    read: 'Three bays of paired windows under a heavy bracketed cornice. The number of storeys is the least certain thing here: the signs cover part of the front.',
  },
  "ST. HELEN'S HOTEL": {
    front: { storeys: 5, cornice: 'heavy', faces: [{ toward: 135, bays: 5, kind: 'flat', photo: { quad: [[0.516, 0.853], [0.777, 0.827], [0.777, 0.294], [0.516, 0.111]] } }] },
    read: 'Five storeys, five windows to a floor, under a bracketed cornice, with shops at the street.',
  },
  'DEL MAR HOTEL': {
    front: { storeys: 4, cornice: 'heavy', faces: [{ toward: 134, bays: 2, kind: 'pair', photo: { quad: [[0.184, 0.904], [0.469, 0.704], [0.448, 0.019], [0.234, 0.254]], band: [0.27, 1] } }] },
    read: 'A narrow front of four storeys, two bays of paired windows between piers, under a bracketed cornice. The long side wall is blank, as it is on the building.',
  },
  'HAMPTON HOTEL': {
    front: { storeys: 3, cornice: 'heavy', faces: [{ toward: 0, bays: 4, kind: 'wide', piers: true, photo: { quad: [[0.144, 0.904], [0.766, 0.904], [0.766, 0.117], [0.141, 0.117]] } }] },
    read: 'Three storeys: a glazed ground floor, and four wide windows to a floor above between brick piers, under a bracketed cornice. The photograph is square on to the front.',
  },
  'MURRAY HOTEL': {
    front: { storeys: 4, cornice: 'light', faces: [{ toward: 134, bays: 3, kind: 'pair', giant: true, photo: { quad: [[0.169, 0.818], [0.325, 0.814], [0.325, 0.123], [0.169, 0.236]] } }] },
    read: 'Three bays, each under a tall arch two storeys high, with a row of small windows above. The windows inside the arches are simplified to pairs.',
  },
  'UNITED ROOMS': {
    front: { storeys: 4, cornice: 'light', faces: [{ toward: 180, bays: 2, kind: 'triple', piers: true, photo: { quad: [[0.204, 0.766], [0.631, 0.758], [0.621, 0.159], [0.233, 0.150]] } }] },
    read: 'A narrow front of four storeys: two bays of three windows each between piers, over a shopfront. The photograph is square on to the front. Its patterned brickwork is not drawn.',
  },
  "DANNY'S INN/ROOMS": {
    front: { storeys: 3, cornice: 'light', faces: [{ toward: 104, bays: 12, kind: 'arched', photo: { quad: [[0.039, 0.967], [0.938, 0.858], [0.903, 0.005], [0.075, 0.350]], band: [0.36, 1] } }] },
    read: 'Two upper storeys of round-headed windows, twelve to a floor, counted from the photograph. The ground floor is not in the photograph and is drawn as shopfronts by rule.',
  },
}
