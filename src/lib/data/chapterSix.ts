/**
 * Chapter 6 told on the map: compounding crises, 1987 to 2003.
 *
 * The city is drawn as in chapter 5, from today's footprints dated by the City's property records to the
 * card's year or before (src/lib/data/builtBy2025.json, shared with chapter 5), with the 1912 atlas faintly behind them where no survivor stands.
 * The shore is today's, the bridges, viaducts and SkyTrain guideway are modelled, and the fair is gone:
 * of its buildings only the Expo Centre (Science World), BC Place and Canada Place stay.
 */
import { type GrowthBuilding, type MapChapter } from './stops'
import { hotelStories } from './hotelStories'
import landmarks from './landmarks.json'
import woodwards2010 from './woodwards2010.json'
import {
  BRIDGES86,
  CITY,
  DARK,
  GUIDEWAY,
  RED,
  SHORE,
  SOUTH,
  datedFootprints,
  lateCity,
  corner,
  edges,
  hotelsBy,
  landmark,
  rail,
  skytrainIds,
  streetFill,
  streetStyle,
  streets,
} from './chapterFive'
import { chapterSixPhotos } from './chapterSixPhotos'

const dated = datedFootprints.filter((b) => b.built <= 2003)
const { standingBy, backdrop } = lateCity

// 139 East Hastings, where Insite opened: placed by its number along the 100 block's north side, between
// Columbia (101) and Main; the building picked is the dated footprint nearest that point.
const insiteAt: [number, number] = [-123.1012, 49.2817]
const insiteBuilding = (() => {
  let best: (typeof dated)[number] | null = null
  let near = Infinity
  for (const b of dated) {
    const lon = b.ring.reduce((a, p) => a + p[0], 0) / b.ring.length
    const lat = b.ring.reduce((a, p) => a + p[1], 0) / b.ring.length
    const d = Math.hypot((lon - insiteAt[0]) * 72_600, (lat - insiteAt[1]) * 111_200)
    if (d < near) [best, near] = [b, d]
  }
  return best
})()
const isInsite = (b: GrowthBuilding) => !!insiteBuilding && b.parts.some((p) => p.kind === 'prism' && p.ring === insiteBuilding.ring)

/** The city of a year: the survivors, the three old landmarks and today's SRO hotels standing by then. */
const city = (year: number, o: { carnegie?: string; woodwards?: string; hotels?: string | null; insite?: string } = {}): GrowthBuilding[] => [
  ...standingBy(year).map((b) => (o.insite && isInsite(b) ? { ...b, fill: o.insite } : b)),
  ...landmark('carnegie-1903', o.carnegie),
  ...landmark('woodwards-1903', o.woodwards),
  ...landmark('bcer-1912'),
  ...hotelsBy(year, () => (o.hotels === null ? undefined : (o.hotels ?? RED))),
]

// The tent city outside Woodward's: dots on the sidewalks of the store's block, along Hastings west from
// Abbott and along Abbott north from Hastings, placed within a few metres of the street centrelines so they show clear of the atlas's building outline, which overhangs today's street lines. Their number and
// places are illustrative: the camp's size is not recorded here.
const tentCity: [number, number][] = (() => {
  let seed = 2002
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  const abbottHastings: [number, number] = [-123.1072, 49.28199]
  const toCambie = [-123.10955 - abbottHastings[0], 49.28251 - abbottHastings[1]]   // along Hastings, the block's length
  const toCordova = [-123.10679 - abbottHastings[0], 49.28293 - abbottHastings[1]]   // along Abbott
  const m = (east: number, north: number) => [east / 72_600, north / 111_200]
  const out: [number, number][] = []
  for (let i = 0; i < 40; i++) {
    const t = 0.08 + rand() * 0.6, [ox, oy] = (() => { const o = -4 + rand() * 7; return m(0.32 * o, 0.95 * o) })()
    out.push([abbottHastings[0] + toCambie[0] * t + ox, abbottHastings[1] + toCambie[1] * t + oy])
  }
  for (let i = 0; i < 20; i++) {
    const t = 0.12 + rand() * 0.5, [ox, oy] = (() => { const o = -3 + rand() * 8; return m(-0.96 * o, 0.27 * o) })()
    out.push([abbottHastings[0] + toCordova[0] * t + ox, abbottHastings[1] + toCordova[1] * t + oy])
  }
  return out.sort(() => rand() - 0.5)
})()

// The redevelopment that opened in 2010: each roof part of the City's 2009 footprints at its LiDAR height.
const roofParts = woodwards2010.parts as unknown as { ring: [number, number][]; h: number; bldg: number }[]
const roofPart = (p: (typeof roofParts)[number]): GrowthBuilding => ({
  name: "Woodward's redevelopment",
  built: 2010,
  lon: p.ring.reduce((a, q) => a + q[0], 0) / p.ring.length,
  lat: p.ring.reduce((a, q) => a + q[1], 0) / p.ring.length,
  parts: [{ kind: 'prism', x: 0, y: 0, ring: p.ring, h: p.h }],
})
// the building at Hastings and Abbott (bldgid 145980 in the City's footprints): the store's oldest corner, kept
const KEPT = 145980
/** The corner of the old store that was kept and built into the redevelopment. */
export const woodwardsKept: GrowthBuilding[] = roofParts.filter((p) => p.bldg === KEPT).map(roofPart)

/** Where the W stands: over the kept corner, on its higher roof. */
export const woodwardsWAt = (() => {
  const roof = roofParts.filter((p) => p.bldg === KEPT).sort((x, y) => y.h - x.h)[0]
  const at = roofPart(roof)
  return { lon: at.lon, lat: at.lat, roof: roof.h }
})()
/** What was built new on the block: the two towers and the lower buildings. */
export const woodwardsNew: GrowthBuilding[] = roofParts.filter((p) => p.bldg !== KEPT).map(roofPart)
export const redevelopment: GrowthBuilding[] = [...woodwardsKept, ...woodwardsNew]

const oppenheimer: [number, number] = [-123.0943, 49.2829]

const models: [string, string, string?][] = [
  ['expo-grounds', 'science-world-1986'],
  ['expo-grounds', 'bc-place-1986'],
  ['canada-pavilion', 'canada-place-1986'],
  ['viaducts', 'viaducts-1972'],
  ['guideway', 'skytrain-1985'],
  ['woodwards-w', 'woodwards-w-tower'],
  ['woodwards-w', 'woodwards-w', RED],
]
const MAP = `${CITY} The fair's pavilions are gone; the Expo Centre (Science World), BC Place and Canada Place stay as modelled in chapter 5. ${GUIDEWAY} ${BRIDGES86} ${SHORE}`
const context = (note: string, sourceId: string) => ({ lines: rail, names: [], streets, streetFill, streetStyle, note: `${note} ${MAP}`, sourceId })
const base = { routes: ['cpr-main-5', ...skytrainIds], railLaid: true, land: 'today' as const, bridges: true, edges, models }

export const chapterSix: MapChapter = {
  chapterId: 'compounding-crises',
  title: 'Compounding crises',
  bare: true,
  oldShoreline: true,
  sites: [
    { id: 'march-carnegie', label: 'Carnegie Community Centre', stem: 20, lon: landmarks.carnegie.lon, lat: landmarks.carnegie.lat, located: true, basis: 'The Carnegie Community Centre at Main and Hastings.' },
    { id: 'march-park', label: 'Oppenheimer Park', stem: 12, lon: oppenheimer[0], lat: oppenheimer[1], located: true, basis: 'Oppenheimer Park, on Powell Street between Dunlevy and Jackson avenues.' },
    { id: 'march-hall', label: 'Japanese Language Hall', stem: 12, lon: -123.0916, lat: 49.2841, located: true, basis: 'The Vancouver Japanese Language School and Japanese Hall, 487 Alexander Street: placed by its number along the 400 block, near Princess Avenue, not on a surveyed footprint.' },
    { id: 'woodwards-w', label: '', lon: woodwardsWAt.lon, lat: woodwardsWAt.lat, located: false, basis: "The W over Woodward's: placed on the roof of the store's oldest corner, at Hastings and Abbott, by judgement." },
    { id: 'woodwards-closed', label: "Woodward's, closed 1993", stem: 22, lon: landmarks.woodwards.lon, lat: landmarks.woodwards.lat, located: true, basis: "The Woodward's store on the block north of Hastings between Abbott and Cambie streets; marked on the store as Goad's 1912 atlas draws it." },
    { id: 'woodsquat', label: 'Woodsquat, 2002', stem: 22, lon: landmarks.woodwards.lon, lat: landmarks.woodwards.lat, located: true, basis: "The empty Woodward's building at Hastings and Abbott streets, where the rally was held and the squat began." },
    { id: 'emergency', label: 'Public health emergency, 1997', ring: 420, lon: corner.mainHastings[0] - 0.0012, lat: corner.mainHastings[1] + 0.0004, located: false, basis: 'A ring over the blocks around Main and Hastings, not a boundary: the declaration named no area on the map.' },
    { id: 'insite', label: 'Insite, 139 East Hastings', stem: 20, lon: insiteAt[0], lat: insiteAt[1], located: true, basis: "Placed by its street number along the north side of the 100 block of East Hastings; the building is the dated footprint nearest that point, not confirmed against a plan." },
  ],
  routes: [
    {
      id: 'march-path',
      points: [[landmarks.carnegie.lon, landmarks.carnegie.lat], oppenheimer, [-123.0916, 49.2841]],
      drawIn: true,
      colour: RED,
      located: false,
      basis: 'A line joining the three places the march is known to keep, in the order it keeps them.',
      caveat: "The red dashed line joins the Carnegie, Oppenheimer Park and the Japanese Language Hall in the march's order. It is not the route: the streets the march walks between them, and its stops on the way, are not in the sources read.",
    },
  ],
  stops: [
    {
      id: 'memorial-march',
      kicker: '14 February 1992',
      title: 'The march',
      text: [
        'After the murder of Cheryl Ann Joe, her family and neighbours gather on 14 February 1992 in the parking lot where she was found, to remember her.',
        "The memorial becomes the Women's Memorial March, walked every 14 February since, honouring missing and murdered Indigenous women and girls. It gathers at the Carnegie, stops through the neighbourhood where women were last seen or found, comes to a healing circle in Oppenheimer Park and ends with a feast at the Japanese Language Hall.",
      ],
      view: { lon: -123.0958, lat: 49.2822, dist: 1950, theta: SOUTH, phi: 0.7 },
      sites: ['march-carnegie', 'march-park', 'march-hall'],
      ...base,
      routes: [...base.routes, 'march-path'],
      faint: backdrop(1992),
      growth: { from: 1992, to: 1992, buildings: city(1992, { carnegie: DARK, hotels: null }) },
      context: context(
        `The red dashed line joins the march's three known places in order, straight across the blocks so that it is not mistaken for the streets walked. The march's own notices give where it gathers (the Carnegie Community Centre, at Main and Hastings), the healing circle in Oppenheimer Park and the feast at the Japanese Language Hall, 487 Alexander Street, and say that it stops where women were last seen or found; none of the pages read names the streets it walks. The parking lot of the 1992 gathering, off Powell Street, is not located and is not marked. The hall is placed by its street number. The Carnegie is dark; the hotels are white on this card.`,
        'tce-memorial-march',
      ),
      eventId: 'memorial-march',
    },
    {
      id: 'woodwards-closes',
      kicker: '1993',
      title: "Woodward's closes",
      text: [
        "Woodward's has stood at Hastings and Abbott since 1903, a department store that filled its block and was a gathering place for the neighbourhood. In 1993 it closes, and the building stands empty.",
        'The property is sold to a private developer in 1995, bought by the Province in 2001 and by the City in 2003.',
      ],
      view: { lon: -123.1078, lat: 49.2824, dist: 800, theta: SOUTH, phi: 0.8 },
      sites: ['woodwards-closed'],
      ...base,
      faint: backdrop(1993),
      growth: { from: 1993, to: 1993, buildings: city(1993, { woodwards: DARK }) },
      context: context(
        `The dark building is Woodward's as Goad's 1912 atlas draws it, on the block north of Hastings between Abbott and Cambie, at an assumed 20 m: the store had grown to fill the block by 1993, and that later outline is not traced. Today's SRO hotels standing by 1993 are red.`,
        'cov-woodwards-2003',
      ),
      eventId: 'woodwards-closes',
    },
    {
      id: 'health-emergency',
      kicker: '25 September 1997',
      title: 'A public health emergency',
      text: [
        'HIV spreads fast among people who inject drugs in the neighbourhood: in 1996 and 1997 the rate of new infection reaches 19 per cent, called the most explosive outbreak in the Western world. On 25 September 1997 the Vancouver/Richmond Health Board declares a public health emergency.',
        'The hotels absorb people whom the health and housing systems have dropped, without the staffing or repair to support them.',
      ],
      view: { lon: -123.1000, lat: 49.2814, dist: 1500, theta: SOUTH, phi: 0.78 },
      sites: ['emergency'],
      ...base,
      faint: backdrop(1997),
      highlight: { from: corner.mainHastings, ms: 6000 },
      growth: { from: 1997, to: 1997, buildings: city(1997) },
      context: context(
        `Checked 20 November 2026: the date of the declaration is on the Georgia Straight's page, and the 19 per cent incidence of 1996 to 1997 is The Tyee's, quoting the BC Centre for Excellence in HIV/AIDS. An earlier version gave more than a quarter of 1,200 people tested as positive; that is on neither page and was taken out. The ring is a label over the blocks around Main and Hastings, not a boundary. The date is as the Georgia Straight gives it; a Health Canada release of 14 November 1997 says the board had recently declared a health emergency and gives the study: 1,200 people who inject drugs, 27 per cent of them HIV-positive. Journal articles put new infections at about 18 per cent a year at the peak. Today's SRO hotels standing by 1997 turn red outward from Main and Hastings: they are where rooms were, not a map of cases.`,
        'straight-emergency-1997',
      ),
      eventId: 'health-emergency-1997',
    },
    {
      id: 'woodsquat',
      kicker: '14 September to 12 December 2002',
      title: 'Woodsquat',
      text: [
        "Woodward's has stood empty for nine years. On 14 September 2002, after a rally at Abbott and Hastings, housing activists occupy the building and demand that it become social housing: \"homes, not jails\".",
        'Six days in, police in riot gear arrest 54 squatters. The squatters come back, and a tent city grows on the sidewalk outside. It lasts until 12 December, when its residents accept rooms in hotels.',
        'The City buys the building in 2003.',
      ],
      view: { lon: -123.1082, lat: 49.2823, dist: 600, theta: SOUTH, phi: 0.38 },
      sites: ['woodsquat'],
      ...base,
      faint: backdrop(2002),
      growth: { from: 2002, to: 2002, buildings: city(2002, { woodwards: DARK }) },
      crowd: { points: tentCity, r: 4.5, after: 2500 },
      stat: { value: '54', label: 'squatters arrested, six days into the occupation', after: 7500 },
      context: context(
        `Checked 20 November 2026: the dates and the 54 arrests are from the CBC article's text, supplied by hand; the one other page read says only that police arrested several people. The dates, the 54 arrests, the tent city and what was built are as CBC News told them twenty years on; that a rally at Abbott and Hastings began it, with the first squatters entering by a ladder through a boarded window, is Julie Chapman's account. The grey dots are the tent city on the sidewalks along the block's Hastings and Abbott sides: their number and places are illustrative, not a count, and the camp's size is not recorded here. The dark building is Woodward's as Goad's 1912 atlas draws it, at an assumed 20 m; the store had grown to fill its block by then, and that outline is not traced. The hotels the camp's residents moved to are not named in the sources read. Today's SRO hotels standing by 2002 are red.`,
        'cbc-woodsquat-2022',
      ),
      eventId: 'woodsquat',
    },
    {
      id: 'insite',
      kicker: 'September 2003',
      title: 'Insite',
      text: [
        'In September 2003 Insite opens at 139 East Hastings Street: the first legal supervised drug injection site in North America.',
      ],
      view: { lon: -123.1010, lat: 49.2815, dist: 620, theta: SOUTH, phi: 0.82 },
      sites: ['insite'],
      ...base,
      faint: backdrop(2003),
      growth: { from: 2003, to: 2003, buildings: city(2003, { insite: DARK }) },
      context: context(
        `The dark building stands for Insite at 139 East Hastings: it is the dated footprint nearest that number's place along the block, not confirmed against a plan; a 2025 account puts Insite in the building beside 123 East Hastings, which fits. Onsite, the detox, opened above it in September 2007. Today's SRO hotels standing by 2003 are red.`,
        'phs-insite',
      ),
      eventId: 'insite',
    },
    {
      id: 'sra-bylaw',
      sideStories: hotelStories['sra-bylaw'],
      kicker: '2003',
      title: 'The Single Room Accommodation By-law',
      text: [
        'The City enacts the Single Room Accommodation By-law. It regulates the conversion and demolition of rooms under 320 square feet in rooming houses and residential hotels in the downtown core.',
        'From now on an owner must apply to council for a permit to convert or demolish a designated room, and council may refuse it or attach conditions, among them a fee for each room lost.',
      ],
      view: { lon: -123.1000, lat: 49.2818, dist: 1900, theta: SOUTH, phi: 0.77 },
      sites: [],
      ...base,
      faint: backdrop(2003),
      highlight: { from: corner.mainHastings, ms: 7000 },
      stat: { value: String(hotelsBy(2003).length), label: "of today's SRO buildings on this map were standing in 2003", after: 8000 },
      growth: { from: 2003, to: 2003, buildings: city(2003) },
      context: context(
        `The red buildings are today's SRO buildings (the 2024 SRO Tenant Survey's list) standing by 2003, turning red outward from Main and Hastings; the figure counts them. They stand in for the buildings the by-law designated: its own schedule of 2003 is not yet read into the project, and buildings designated then and since lost are not drawn. The permit and its conditions are as the City's fact sheet on the by-law sets them out; the fee council could attach was $5,000 a room at first and $15,000 from 2007, and far higher since. Accounts of 2006 give about 180 or 198 buildings designated, and later City reports about 9,400 rooms; the by-law's own schedule could not be opened to settle the count.`,
        'cov-report-2020',
      ),
      eventId: 'sra-bylaw',
    },
  ],
}

// Photographs for each card, kept in chapterSixPhotos.ts.
for (const stop of chapterSix.stops) stop.photos ??= chapterSixPhotos[stop.id]
