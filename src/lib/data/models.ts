/**
 * Buildings drawn on the map for the early chapters, each built from a few
 * simple parts. They are massing studies: footprints from a scale plan where
 * there is one, forms from period photographs otherwise, and heights always
 * estimated. `evidence` says exactly what each one
 * rests on, so nothing here is mistaken for a survey.
 */

import { millSite1889, millSiteAnchor, millSiteEarly } from './millSite'
import { granvilleAnchor, granvilleBuildings1870 } from './granville1870'
import { granvilleBuildings1885, granvilleFootprints1885 } from './granville1885'
import { byrnesBlock1889, granvilleBuildings1889 } from './granville1889'
import landmarks from './landmarks.json'
import goad1912 from './goad1912.json'
import { footprintAt } from './district1912'
import viaducts1972 from './viaducts1972.json'

/** One piece of a building. Distances are metres; x and y are east and north of the site before the group is turned. */
export type Part =
  | { kind: 'gable' | 'hip'; x: number; y: number; w: number; d: number; eave: number; ridge: number; rot?: number }
  | { kind: 'box'; x: number; y: number; w: number; d: number; h: number; rot?: number; z0?: number; legs?: number; drop?: number; afloat?: boolean }
  /** A building raised straight up from its real footprint: `ring` is [lon, lat] points, `h` the height in metres. x and y are unused. */
  | { kind: 'prism'; x: number; y: number; ring: [number, number][]; h: number; z0?: number; follow?: boolean }

export interface BuildingModel {
  id: string
  name: string
  /** Turn of the whole group, in degrees anticlockwise, so that its y axis points the way the site faces. */
  bearing: number
  parts: Part[]
  /** What the model is drawn from, and how far that evidence goes. */
  evidence: string
  /** Where the photograph or drawing can be seen. */
  imageUrl?: string
  /** `plan`: footprints measured off a scale plan. `photo`: forms read from a photograph. `type`: a building of this kind, with no image of the building itself. */
  basis: 'plan' | 'photo' | 'type'
  /** Where the parts are measured from, as [lon, lat], when that is not the site the model is shown at. */
  anchor?: [number, number]
  /** The lowest level any part stands at, in metres above the sea: a yard built out on piles sits this high over water. */
  minBase?: number
  /** Stand each part on the ground where there is ground, and on piles at `minBase` only where it is over water. */
  piles?: boolean
}

const prisms = (key: keyof typeof landmarks): Part[] =>
  landmarks[key].parts.map((p) => ({ kind: 'prism' as const, x: 0, y: 0, ring: p.ring as [number, number][], h: p.h }))

// Every building of 1912, raised to an assumed height: brick at three storeys, wood at two.
const goadFootprints = (rings: number[][][], h: number): Part[] =>
  rings.map((ring) => ({ kind: 'prism' as const, x: 0, y: 0, ring: ring as [number, number][], h }))

/**
 * Each viaduct as one continuous deck: a ribbon 15 m wide along its centreline, offset left and right with
 * mitred corners so the bends are smooth, 1.5 m deep with its underside 8 m up, and a pier every 30 m.
 */
function viaductDecks(anchor: [number, number]): Part[] {
  const kx = 111_320 * Math.cos((anchor[1] * Math.PI) / 180)
  const ky = 111_200
  const parts: Part[] = []
  for (const key of ['georgia', 'dunsmuir'] as const) {
    const pts = (viaducts1972[key] as number[][]).map(([lon, lat]) => [(lon - anchor[0]) * kx, (lat - anchor[1]) * ky])
    // the direction at each point: the mean of the stretches either side
    const dirs = pts.map((_, i) => {
      const a = pts[Math.max(0, i - 1)]
      const b = pts[Math.min(pts.length - 1, i + 1)]
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
      return [(b[0] - a[0]) / len, (b[1] - a[1]) / len]
    })
    const half = 7.5
    const left = pts.map((p, i) => [p[0] - dirs[i][1] * half, p[1] + dirs[i][0] * half])
    const right = pts.map((p, i) => [p[0] + dirs[i][1] * half, p[1] - dirs[i][0] * half])
    const ring = [...left, ...right.reverse()].map(([x, y]) => [anchor[0] + x / kx, anchor[1] + y / ky] as [number, number])
    parts.push({ kind: 'prism', x: 0, y: 0, ring, h: 1.5, z0: 8, follow: true })
    // piers down to the ground every 30 m along the line
    let carried = 0
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1]
      const [bx, by] = pts[i]
      const len = Math.hypot(bx - ax, by - ay)
      if (!len) continue
      for (let d = carried; d <= len; d += 30) {
        parts.push({ kind: 'box', x: ax + ((bx - ax) * d) / len, y: ay + ((by - ay) * d) / len, w: 1.6, d: 1.6, h: 8 })
        carried = d + 30 - len
      }
    }
  }
  return parts
}

export const models: BuildingModel[] = [
  {
    id: 'goad-1912',
    name: 'Every building in 1912',
    bearing: 0,
    basis: 'plan',
    anchor: [-123.1, 49.281],
    evidence: `Footprints read by colour from Goad's 1912 atlas, as georectified by the City of Vancouver: pink is brick, yellow is wood. Heights are assumed, as the atlas gives none: brick at about three storeys (11 m), wood at two (7 m). Neighbouring buildings that share walls sometimes read as one footprint.`,
    parts: [...goadFootprints(goad1912.brick, 11), ...goadFootprints(goad1912.frame, 7)],
  },
  {
    id: 'carnegie-1903',
    name: 'Carnegie Library, 1903',
    bearing: 0,
    basis: 'plan',
    anchor: [landmarks.carnegie.lon, landmarks.carnegie.lat],
    evidence: `The building as it stands today, raised from the City's footprint and 2009 LiDAR height. It is the 1903 library.`,
    parts: prisms('carnegie'),
  },
  {
    id: 'woodwards-1903',
    name: "Woodward's, Hastings and Abbott",
    bearing: 0,
    basis: 'type',
    anchor: [landmarks.woodwards.lon, landmarks.woodwards.lat],
    evidence: `Today's footprints at the corner of Hastings and Abbott, standing in for the store Woodward's established there in 1903. The store was enlarged many times and largely rebuilt in 2010; its 1903 outline has not been traced.`,
    parts: prisms('woodwards'),
  },
  {
    id: 'library-1957',
    name: 'Central library, 1957',
    bearing: 0,
    basis: 'plan',
    anchor: [landmarks['library-1957'].lon, landmarks['library-1957'].lat],
    evidence: `Today's footprint at the north-west corner of Burrard and Robson, 750 Burrard Street, on a lot the City's property records date to 1956: the central library that opened in 1957 and served until 1995. Its LiDAR height takes in the storeys added after the library left.`,
    parts: prisms('library-1957'),
  },
  {
    id: 'cn-station-1919',
    name: 'Canadian Northern station, 1919',
    bearing: 0,
    basis: 'plan',
    anchor: [landmarks['cn-station'].lon, landmarks['cn-station'].lat],
    evidence: `Today's Pacific Central Station on the False Creek flats, opened in 1919 as the Canadian Northern's terminal, from the City's footprint and 2009 LiDAR height. The LiDAR height is the mean over the roof, lower than the central hall.`,
    parts: prisms('cn-station'),
  },
  {
    id: 'city-hall-1907',
    name: 'City Hall, 1898 to 1929',
    bearing: 0,
    basis: 'plan',
    anchor: [-123.10025, 49.28073],
    evidence: `The building marked City Hall in Goad's 1912 atlas: the old market hall on Westminster Avenue (Main Street), behind the Carnegie Library, the city hall from 1898 to 1929. Drawn at an assumed 14 m, about three storeys; its height has not been checked.`,
    parts: [{ kind: 'prism', x: 0, y: 0, ring: goad1912.brick[footprintAt('brick', -123.10025, 49.28073)] as [number, number][], h: 14 }],
  },
  {
    id: 'bcer-1912',
    name: 'BC Electric Railway terminal, as drawn in 1912',
    bearing: 0,
    basis: 'plan',
    anchor: [landmarks.bcer.lon, landmarks.bcer.lat],
    evidence: `The brick building at the junction of Hastings and Carrall in Goad's 1912 atlas, marked as the B.C. Electric Railway Company's offices, with the track curving into it. Raised to six storeys, about 24 m, as the heritage register describes it. Found in goad1912.json by the point of the junction.`,
    parts: [{ kind: 'prism', x: 0, y: 0, ring: goad1912.brick[footprintAt('brick', landmarks.bcer.lon, landmarks.bcer.lat)] as [number, number][], h: 24 }],
  },
  {
    id: 'bcer-1911',
    name: 'BC Electric Railway terminal, 1911',
    bearing: 0,
    basis: 'plan',
    anchor: [landmarks.bcer.lon, landmarks.bcer.lat],
    evidence: `Today's footprint at 425 Carrall Street. The 2009 LiDAR height there is not the building's, so it is drawn at six storeys, about 24 m, as the heritage register describes it. The footprint may take in more than the terminal.`,
    parts: prisms('bcer'),
  },
  {
    id: 'hastings-mill-1889',
    name: 'Hastings Mill, as surveyed in 1889',
    bearing: 0,
    basis: 'plan',
    anchor: millSiteAnchor,
    minBase: 2,
    piles: true,
    evidence:
      `Footprints, positions and orientations are measured off the 1889 fire insurance plan of the mill site (Dakin Publishing Co., sheet 13; City of Vancouver Archives, MAP 338, LEG1319.489), read by eye from the scan and good to a few metres. The plan was tied to the ground by Dunlevy Avenue and Railway Street. The ground under the yard is the plan's dry ground, which the 1885 fire insurance map's inset of the mill confirms; the corner the plan marks as still being filled is left as water. Roof forms and heights are estimates from the plan's storey counts and the 1872 photograph. This is the site in November 1889, two years after this chapter ends.`,
    imageUrl: 'https://searcharchives.vancouver.ca/plan-of-vancouver-1889-fire-map-hastings-saw-mill-to-dunlevy-avenue',
    parts: millSite1889,
  },
  {
    id: 'hastings-mill-early',
    name: 'Hastings Mill, before the railway',
    bearing: 0,
    basis: 'plan',
    anchor: millSiteAnchor,
    minBase: 2,
    piles: true,
    evidence:
      `Footprints, positions and orientations are measured off the 1889 fire insurance plan of the mill site (Dakin Publishing Co., sheet 13; City of Vancouver Archives, MAP 338, LEG1319.489), read by eye from the scan and good to a few metres. The plan was tied to the ground by Dunlevy Avenue and Railway Street. Roof forms and heights are estimates from the plan's storey counts and the 1872 photograph. For the 1860s and 1870s the 1889 layout is thinned to the mill, its engine house and stack, the wharf, the store, the boarding house and five dwellings, which is roughly what the 1872 photograph shows. Which of the 1889 buildings actually stood that early is not established.`,
    imageUrl: 'https://searcharchives.vancouver.ca/plan-of-vancouver-1889-fire-map-hastings-saw-mill-to-dunlevy-avenue',
    parts: millSiteEarly,
  },
  {
    id: 'granville-1870',
    name: 'Granville, as surveyed in March 1870',
    bearing: 0,
    basis: 'plan',
    anchor: granvilleAnchor,
    minBase: 1.5,
    piles: true,
    evidence:
      `Footprints, positions and orientations are measured off the 1870 Plan of the Town of Granville (J. B. Launders, Lands and Works Office; City of Vancouver Archives, MAP 978), read by eye from the scan and good to a metre or two. The plan was tied to the ground by its own scale bar and by Abbott, Water, Cordova and Cambie streets. It names only the Jail and the Custom House. The L-shaped building at the foot of Carrall Street is unnamed; it is taken to be Deighton's. Roofs and heights are assumed: the plan gives footprints only.`,
    imageUrl: 'https://searcharchives.vancouver.ca/plan-of-town-of-granville-burrard-inlet-b-c',
    parts: granvilleBuildings1870,
  },
  {
    id: 'granville-1885',
    name: 'Granville, as mapped in August 1885',
    bearing: 0,
    basis: 'plan',
    anchor: granvilleAnchor,
    minBase: 1.5,
    piles: true,
    evidence:
      `Footprints, positions and uses are read by eye off the Sanborn fire insurance map of August 1885 (City of Vancouver Archives, MAP 553). The map was fitted to the 1870 government plan by the four corners of the block between Abbott and Carrall; it draws that block about 5 m deeper than the survey does, so positions are good to a few metres. Only the main buildings are traced. Storeys are the map's; roof forms and heights in metres are assumed.`,
    imageUrl: 'https://searcharchives.vancouver.ca/granville-townsite-b-c-aug-1885',
    parts: granvilleBuildings1885,
  },
  {
    id: 'granville-1885-burned',
    name: 'Granville after the fire of 13 June 1886',
    bearing: 0,
    basis: 'plan',
    anchor: granvilleAnchor,
    evidence:
      `The footprints of the buildings on the August 1885 fire insurance map, left flat on the ground to stand for what the fire destroyed. More was built between that map and the fire, so this understates the loss.`,
    imageUrl: 'https://searcharchives.vancouver.ca/granville-townsite-b-c-aug-1885',
    parts: granvilleFootprints1885,
  },
  {
    id: 'byrnes-block',
    name: 'Byrnes Block, 1886 to 1887',
    bearing: 0,
    basis: 'plan',
    anchor: [-123.10459, 49.283263],
    evidence:
      `The building as it stands today: its footprint from the City's 2015 building footprints and its height (10.4 m) from the City's 2009 LiDAR, at 2 Water Street and 203-221 Carrall Street. It was built in 1886 to 1887 and enlarged after the railway arrived, so today's outline is larger than the first building.`,
    imageUrl: 'https://historicplaces.ca/en/rep-reg/place-lieu.aspx?id=2529',
    parts: [{ kind: 'box', x: 0, y: 0, w: 42.7, d: 21.8, h: 10.4, rot: 74.2 }],
  },
  {
    id: 'granville-1889',
    name: 'The rebuilt town between Cambie and Carrall, 1889',
    bearing: 0,
    basis: 'plan',
    anchor: granvilleAnchor,
    minBase: 1.5,
    piles: true,
    evidence:
      `Footprints, positions and storeys are read by eye off two sheets of the 1889 Dakin fire insurance plan (City of Vancouver Archives, LEG1319.479 and LEG1319.480), each fitted to the 1870 townsite plan by its lot lines. Positions are good to a few metres. Only the main buildings are traced; heights in metres and roof forms are assumed.`,
    imageUrl: 'https://searcharchives.vancouver.ca/plan-of-vancouver-1889-fire-map-water-street-to-abbott-street-to-dupont-street-to-carrall-street',
    parts: granvilleBuildings1889,
  },
  {
    id: 'byrnes-block-1889',
    name: 'Byrnes Block, as drawn in 1889',
    bearing: 0,
    basis: 'plan',
    anchor: granvilleAnchor,
    evidence:
      `The building at the south-west corner of Water and Carrall on the 1889 Dakin plan: two storeys, with a bakery and two saloons on the ground floor, drawn with heavy walls. Taken to be the Byrnes Block from its corner and its date; the plan does not name it. Smaller than the building today, which was added to later.`,
    imageUrl: 'https://searcharchives.vancouver.ca/plan-of-vancouver-1889-fire-map-water-street-to-abbott-street-to-dupont-street-to-carrall-street',
    parts: byrnesBlock1889,
  },
  {
    id: 'saloon-1867',
    name: 'Deighton\'s saloon, 1867',
    // Water Street runs about 15 degrees off east-west here.
    bearing: -15,
    basis: 'type',
    evidence:
      'No photograph of the 1867 Globe Saloon is held by the City of Vancouver Archives; the only image of it there is a newspaper drawing made in 1940. The Canadian Encyclopedia says only that mill workers put it up within a day, so it is drawn as a single small plank shed. Its size and position on the lot are assumed.',
    parts: [{ kind: 'gable', x: -7, y: -6, w: 7.5, d: 4, eave: 2.4, ridge: 3.6 }],
  },
  {
    id: 'passenger-train-1910',
    name: 'A Canadian Pacific passenger train',
    bearing: 0, // set from the way it is travelling
    basis: 'type',
    evidence: 'A locomotive, tender and four coaches at the lengths of the time, as a type: no particular train. Drawn a little larger than life so that it can be seen.',
    parts: [
      { kind: 'box', x: 0, y: 42, w: 3, d: 12, h: 4 },   // locomotive
      { kind: 'box', x: 0, y: 33, w: 3, d: 5, h: 3 },   // tender
      { kind: 'box', x: 0, y: 20, w: 3, d: 18, h: 4 },
      { kind: 'box', x: 0, y: 0, w: 3, d: 18, h: 4 },
      { kind: 'box', x: 0, y: -20, w: 3, d: 18, h: 4 },
      { kind: 'box', x: 0, y: -40, w: 3, d: 18, h: 4 },
    ],
  },
  {
    id: 'freight-train-1935',
    name: 'A freight train',
    bearing: 0, // set from the way it is travelling
    basis: 'type',
    evidence: 'A locomotive, tender and eight boxcars at the lengths of the time, as a type: the trekkers rode on top of cars like these. Drawn a little larger than life so that it can be seen.',
    parts: [
      { kind: 'box', x: 0, y: 56, w: 3, d: 12, h: 4 },   // locomotive
      { kind: 'box', x: 0, y: 47, w: 3, d: 5, h: 3 },   // tender
      { kind: 'box', x: 0, y: 38, w: 3, d: 11, h: 3.6 },
      { kind: 'box', x: 0, y: 25, w: 3, d: 11, h: 3.6 },
      { kind: 'box', x: 0, y: 12, w: 3, d: 11, h: 3.6 },
      { kind: 'box', x: 0, y: -1, w: 3, d: 11, h: 3.6 },
      { kind: 'box', x: 0, y: -14, w: 3, d: 11, h: 3.6 },
      { kind: 'box', x: 0, y: -27, w: 3, d: 11, h: 3.6 },
      { kind: 'box', x: 0, y: -40, w: 3, d: 11, h: 3.6 },
      { kind: 'box', x: 0, y: -53, w: 3, d: 11, h: 3.6 },
    ],
  },
  {
    id: 'steamship-1910',
    name: 'A Pacific steamship',
    bearing: 0, // set from the way it is travelling
    basis: 'type',
    evidence: "A hull, superstructure and funnels at about the size of the Canadian Pacific's Empress liners of the 1890s to 1910s, as a type: no particular ship. Drawn a little larger than life so that it can be seen.",
    parts: [
      { kind: 'box', x: 0, y: 0, w: 13, d: 130, h: 7, afloat: true },        // hull
      { kind: 'box', x: 0, y: 60, w: 6, d: 10, h: 3, afloat: true },        // bow, narrowing
      { kind: 'box', x: 0, y: -2, w: 9, d: 60, h: 4, z0: 7, afloat: true },  // superstructure
      { kind: 'box', x: 0, y: 12, w: 3, d: 3, h: 7, z0: 11, afloat: true },  // funnels
      { kind: 'box', x: 0, y: -14, w: 3, d: 3, h: 7, z0: 11, afloat: true },
    ],
  },
  {
    id: 'streetcar-1955',
    name: 'A streetcar',
    bearing: 0, // set from the way it is travelling
    basis: 'type',
    evidence: 'A single car at the length of the BC Electric cars of the 1950s, as a type: no particular car. Drawn larger than life so that it can be seen.',
    parts: [{ kind: 'box', x: 0, y: 0, w: 2.6, d: 15, h: 3.4 }],
  },
  {
    id: 'viaducts-1972',
    name: 'The Georgia and Dunsmuir viaducts, 1972',
    bearing: 0,
    basis: 'plan',
    anchor: [-123.1035, 49.2774],
    evidence: "Each viaduct as one deck along its centreline from the City's street data, which keeps the 1972 alignment: 15 m wide, 1.5 m deep, kept 8 m above the ground beneath it, on piers every 30 m. The real deck ran at its own grade, meeting the ground at each end; that profile is not traced.",
    parts: viaductDecks([-123.1035, 49.2774]),
  },
  {
    id: 'deighton-canoe',
    name: 'Deighton\'s canoe',
    bearing: 0, // set from the way it is travelling
    basis: 'type',
    evidence:
      `The Canadian Encyclopedia has Deighton land by canoe with his wife, her mother and her cousin; an 1875 newspaper account adds a barrel of whisky, a dog and some hens. No drawing of the canoe exists. It is shown as a dugout about nine metres long with four seated figures and one barrel. Where it came ashore is not recorded beyond "near Stamp's Mill", so it is shown coming along the shore from the mill. On the map it is drawn larger than life so that it can be seen.`,
    parts: [
      // the hull, narrowing to bow and stern
      { kind: 'box', x: 0, y: 0, w: 1.05, d: 6.4, h: 0.45, afloat: true },
      { kind: 'box', x: 0, y: 3.7, w: 0.7, d: 1.0, h: 0.5, afloat: true },
      { kind: 'box', x: 0, y: -3.7, w: 0.7, d: 1.0, h: 0.5, afloat: true },
      { kind: 'box', x: 0, y: 4.55, w: 0.32, d: 0.7, h: 0.62, afloat: true },
      { kind: 'box', x: 0, y: -4.55, w: 0.32, d: 0.7, h: 0.62, afloat: true },
      // four people: a body and a head each
      ...[2.5, 1.1, -0.5, -2.9].flatMap((y): Part[] => [
        { kind: 'box', x: 0, y, w: 0.46, d: 0.32, h: 0.62, z0: 0.4, afloat: true },
        { kind: 'box', x: 0, y, w: 0.24, d: 0.24, h: 0.26, z0: 1.06, afloat: true },
      ]),
      // the paddles, bow and stern
      { kind: 'box', x: 0.62, y: 2.75, w: 0.07, d: 0.07, h: 1.35, z0: 0.05, afloat: true },
      { kind: 'box', x: -0.62, y: -2.65, w: 0.07, d: 0.07, h: 1.35, z0: 0.05, afloat: true },
      // the barrel
      { kind: 'box', x: 0, y: -1.65, w: 0.62, d: 0.62, h: 0.85, z0: 0.35, afloat: true },
    ],
  },
  {
    id: 'deighton-house-1886',
    name: 'Deighton House, before the fire',
    bearing: -15,
    basis: 'type',
    evidence:
      'The hotel itself is not in any photograph found so far. It is drawn as the kind of building the 1886 photograph of this corner shows next door: two storeys in wood, a hipped roof, a chimney, and a verandah roof on posts around the ground floor. Placed on the south-west corner of Carrall and Water, where the source puts it. Treat the form as typical of the corner, not as a portrait.',
    imageUrl: 'https://commons.wikimedia.org/wiki/File:Maple_Tree_Corner_Vancouver_1886.jpg',
    parts: [
      { kind: 'hip', x: -12, y: -11, w: 18, d: 12, eave: 6.4, ridge: 9 },
      { kind: 'box', x: -12, y: -11, w: 23, d: 17, h: 0.25, z0: 3.1, legs: 4.5 }, // verandah roof on posts
      { kind: 'box', x: -16, y: -11, w: 0.9, d: 0.9, h: 10.3 }, // chimney
    ],
  },
]
