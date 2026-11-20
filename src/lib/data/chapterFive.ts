/**
 * Chapter 5 told on the map: naming the Downtown Eastside, 1973 to 1986.
 *
 * The city is drawn as in chapter 4: today's footprints at their LiDAR heights where the City's property
 * records date the lot's building to the card's year or before (src/lib/data/builtBy2025.json, made by
 * scripts/build-survivors.py over the whole map, each footprint with its lot's year), and behind them, faintly, Goad's 1912 atlas on
 * the lots where no survivor stands.
 */
import { type GrowthBuilding, type MapChapter } from './stops'
import { districtTo, inRing } from './district1912'
import { models as buildingModels, guidewayLine } from './models'
import streets1887 from './streets1887.json'
import sroByYear from './sroByYear.json'
import sroGround from './sroGround.json'
import builtBy2025 from './builtBy2025.json'
import districts from './districts1907.json'
import landmarks from './landmarks.json'
import flats1917 from './flats1917.json'
import { cprLine1912 } from './cpr1912'
import expo1986 from './expo1986.json'
import streets1986 from './streets1986.json'
import { chapterFivePhotos } from './chapterFivePhotos'

export const SOUTH = Math.PI / 2
export const RED = '#8e4233'
export const DARK = '#3b3b3b'
// the streets filled white on their centrelines, and their edges drawn over them as a fine dark line
export const streets = streets1887.edges as number[][][]
export const streetFill = streets1986.lines as number[][][]
const ring = (k: string) => (districts as unknown as Record<string, [number, number][]>)[k]
export const corner = districts.corners as unknown as Record<string, [number, number]>
const cleared = [ring('macleanHousing'), ring('macleanPark'), ring('raymur'), ring('hogansWest')]
const inAny = (rings: [number, number][][], b: { lon: number; lat: number }) => rings.some((r) => inRing(b.lon, b.lat, r))

export const hotels = (sroByYear.buildings as unknown as (GrowthBuilding & { rooms?: number })[]).map((h, i) => {
  const ground = (sroGround.ground as number[])[i]
  return { ...h, ground, built: h.built == null ? null : Math.max(h.built, ground) }
})
const underHotel = (b: { lon: number; lat: number }) => hotels.some((h) => h.parts.some((p) => inRing(b.lon, b.lat, p.ring)))
const landmarkRings = [landmarks.carnegie, landmarks.woodwards, landmarks.bcer, landmarks['science-world'], landmarks['canada-place'], landmarks['bc-place']].flatMap((l) => l.parts.map((p) => p.ring as [number, number][]))
const sameRing = (a: [number, number][], b: [number, number][]) => a.length === b.length && a[0][0] === b[0][0] && a[0][1] === b[0][1]
const underLandmark = (b: { lon: number; lat: number; parts: { ring: [number, number][] }[] }) => landmarkRings.some((r) => inRing(b.lon, b.lat, r) || b.parts.some((p) => sameRing(p.ring, r)))

export const landmark = (id: string, fill?: string): GrowthBuilding[] => {
  const m = buildingModels.find((x) => x.id === id)
  if (!m || !m.anchor) return []
  return [{ name: m.name, built: 1903, fill, lon: m.anchor[0], lat: m.anchor[1], parts: m.parts.filter((p) => p.kind === 'prism') as GrowthBuilding['parts'] }]
}
export const anchors = (carnegie?: string): GrowthBuilding[] => [...landmark('carnegie-1903', carnegie), ...landmark('woodwards-1903'), ...landmark('bcer-1912')]
export const hotelsBy = (year: number, fill: (h: (typeof hotels)[number]) => string | undefined = () => RED) =>
  hotels.filter((h) => (h.built ?? 9999) <= year).map((h) => ({ ...h, fill: fill(h) }))

/**
 * The city of a later year, from a set of today's footprints dated by the property records
 * (builtBy1986.json, builtBy2003.json): `standingBy` the survivors of a year, `backdrop` the faint 1912
 * stand-ins on the lots where no survivor of that year stands, `city` the survivors with the landmarks
 * and the hotels. Chapters 5 and 6 share it.
 */
export function cityFrom(dated: { ring: [number, number][]; h: number; built: number }[]) {
  const survivors = dated.map((b) => {
    const lon = b.ring.reduce((a, p) => a + p[0], 0) / b.ring.length
    const lat = b.ring.reduce((a, p) => a + p[1], 0) / b.ring.length
    return { name: '', built: b.built, lon, lat, parts: [{ kind: 'prism' as const, x: 0, y: 0, ring: b.ring, h: b.h }] }
  })
  const standingBy = (year: number): GrowthBuilding[] => survivors.filter((b) => b.built <= year && !underHotel(b) && !underLandmark(b))
  const cellOf = (lon: number, lat: number) => `${Math.floor(lon * 720)}:${Math.floor(lat * 1112)}`
  const survivorCells = new Map<string, { ring: [number, number][]; built: number }[]>()
  for (const b of survivors) {
    for (const p of b.parts) {
      const lons = p.ring.map((q) => q[0])
      const lats = p.ring.map((q) => q[1])
      for (let x = Math.floor(Math.min(...lons) * 720); x <= Math.floor(Math.max(...lons) * 720); x++)
        for (let y = Math.floor(Math.min(...lats) * 1112); y <= Math.floor(Math.max(...lats) * 1112); y++) {
          const k = `${x}:${y}`
          if (!survivorCells.has(k)) survivorCells.set(k, [])
          survivorCells.get(k)!.push({ ring: p.ring, built: b.built })
        }
    }
  }
  const underSurvivorBy = (year: number) => (b: { lon: number; lat: number }) => (survivorCells.get(cellOf(b.lon, b.lat)) ?? []).some((sv) => sv.built <= year && inRing(b.lon, b.lat, sv.ring))
  /** The faint stand-ins behind the survivors: the 1912 atlas where no survivor of the card's year stands, and not in the blocks the 1960s cleared. */
  const backdrop = (year: number): GrowthBuilding[] => districtTo(1912, (b) => underHotel(b) || underSurvivorBy(year)(b) || inAny(cleared, b))
  const city = (year: number, carnegie?: string, hotelFill?: (h: (typeof hotels)[number]) => string | undefined): GrowthBuilding[] => [...standingBy(year), ...anchors(carnegie), ...hotelsBy(year, hotelFill)]
  return { standingBy, backdrop, city }
}
/** Today's dated footprints over the whole map: each chapter asks it for the city of its cards' years. */
export const datedFootprints = builtBy2025.buildings as { ring: [number, number][]; h: number; built: number }[]
export const lateCity = cityFrom(datedFootprints)
const { standingBy, backdrop, city } = lateCity
void standingBy

// Stand-ins for the hotels the by-law closed or that came down: the project has no list of them, so these
// are the larger brick buildings of the faint 1912 backdrop in the hotel blocks, picked at random (seeded),
// one for about fifty of the 2,300 units. Their places are illustrative only.
const areaOf = (r: [number, number][]) => {
  const kx = 111_320 * Math.cos((r[0][1] * Math.PI) / 180)
  let a = 0
  for (let i = 0; i < r.length; i++) {
    const [x1, y1] = r[i], [x2, y2] = r[(i + 1) % r.length]
    a += (x1 * kx) * (y2 * 111_200) - (x2 * kx) * (y1 * 111_200)
  }
  return Math.abs(a) / 2
}
const lostHotels: GrowthBuilding[] = (() => {
  let seed = 1974
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  const pool = backdrop(1974)
    .filter((b) => b.lon > -123.1080 && b.lon < -123.0940 && b.lat > 49.2793 && b.lat < 49.2852 && !inAny(cleared, b))
    .filter((b) => b.parts.some((p) => p.kind === 'prism' && p.h >= 10 && areaOf(p.ring as [number, number][]) > 280))
    .map((b) => ({ b, k: rand() }))
    .sort((x, y) => x.k - y.k)
  return pool.slice(0, 46).map((x) => x.b)
})()
const backdrop1974 = backdrop(1974).filter((b) => !lostHotels.some((l) => l.lon === b.lon && l.lat === b.lat))

export const CITY = `The buildings drawn in full are today's footprints at their LiDAR heights, kept where the City's property records date the lot's building to the card's year or before: the survivors. The faint buildings behind them are those of Goad's 1912 atlas on the lots where no survivor is shown, standing in for buildings of the time since demolished; anything built after 1912 and demolished since is missing. Beyond the district the survivors reach the edges of the map, from the City's wider 2009 footprints dated the same way; lots with no year in the records are left empty. The streets are filled white on today's centrelines, without the bridges (modelled) or the streets laid out on the fair's grounds after 1986, where OpenHistoricalMap's roads of 1986 stand instead; a few streets of later developments elsewhere may show.`
export const SHORE = `From this chapter on the shore is today's: the filling of False Creek's flats and of the inlet's waterfront was done, and what changed after (the creek's north shore rebuilt for the fair, the seawall, the shore at the towers' sites) is small at the map's scale. It is a stand-in for the shore of each card's year, not traced from a map of the time. The railways are the Canadian Pacific's waterfront line as the 1912 atlas draws it, and on the flats today's centrelines kept where they lie on the fill.`
export const edges = { width: 0.55, colour: '#7a7a7a' }
export const streetStyle = { width: 0.5, colour: '#3b3b3b', opacity: 0.6 }
export const rail = flats1917.rail as [number, number][][]

// 1986 from OpenHistoricalMap: the fair's zones and pavilions, its movers, the SkyTrain, the major roads
type Line = [number, number][]
const ex = expo1986 as unknown as {
  zones: { name: string; ring: Line }[]
  pavilions: { name: string; ring: Line; levels: string | null }[]
  movers: { name: string; line: Line; kind: string }[]
  skytrain: { line: Line; tunnel: boolean }[]
  roads: { name: string; line: Line; bridge: boolean }[]
}
const pavilions: GrowthBuilding[] = ex.pavilions.map((p) => {
  const lon = p.ring.reduce((a, q) => a + q[0], 0) / p.ring.length
  const lat = p.ring.reduce((a, q) => a + q[1], 0) / p.ring.length
  return { name: p.name, built: 1986, fill: DARK, lon, lat, parts: [{ kind: 'prism', x: 0, y: 0, ring: p.ring, h: p.levels ? Number(p.levels) * 4.5 : 8 }] }
})
// the stretch on the guideway is modelled (models.ts, skytrain-1985); these lines are the rest, in tunnel or at grade
const onGuideway = (p: [number, number]) => p[0] >= -123.1085 && p[0] <= -123.069 && p[1] >= 49.2618
const skytrainRoutes = ex.skytrain.map((sk, i) => ({
  id: `skytrain-${i}`,
  points: sk.tunnel ? sk.line : sk.line.filter((p) => !onGuideway(p)),
  drawIn: true,
  track: !sk.tunnel,
  located: true,
  basis: sk.tunnel ? "The SkyTrain in tunnel under downtown, as OpenHistoricalMap maps it, dated 11 December 1985." : "The SkyTrain's guideway, as OpenHistoricalMap maps it, dated 11 December 1985.",
}))
const moverRoutes = ex.movers.map((m, i) => ({
  id: `mover-${i}`,
  points: m.line,
  drawIn: false,
  solid: m.kind !== 'gondola',
  located: true,
  basis: `${m.name || 'The fair\'s monorail'}, as OpenHistoricalMap maps it for the fair.`,
}))
export const skytrainIds = skytrainRoutes.filter((r) => r.points.length >= 2).map((r) => r.id)
// two trains on the guideway, one each way, setting off once it is laid
export const trains = (after: number) => [
  { model: 'skytrain-car-1985', route: 'skytrain-guideway', ms: 26000, loop: true, after, fill: '#ffffff' },
  { model: 'skytrain-car-1985', route: 'skytrain-guideway', ms: 26000, loop: true, reverse: true, after: after + 9000, fill: '#ffffff' },
]
const moverIds = moverRoutes.map((r) => r.id)
const fairCentre: [number, number] = [-123.1080, 49.2745]
export const BRIDGES86 = `The Granville (1954), Burrard (1932) and new Cambie (8 December 1985) bridges are modelled from today's centrelines in the City's street data, as the project's main map draws them: decks climbing to their clearance on piers, the Burrard with its towers; the Georgia viaduct of 1972 as in chapter 4. Their decks' profiles are approximations, not surveyed.`
export const GUIDEWAY = `The SkyTrain's elevated guideway is modelled on OpenHistoricalMap's track from just east of Stadium station past Main Street station and along Terminal Avenue to the Grandview cut: one deck 9 m wide for the two tracks, following one of the two tracks so it runs without a break, kept 7 m above the ground, on piers every 30 m. Its real height varies and is not traced. West of Stadium the line is dashed in tunnel and drawn as track where it runs at grade. The trains are four-car trains of Mark I cars as a type, running each way.`
const OHM = `The fair is drawn as OpenHistoricalMap's mappers reconstructed it from site plans and photographs (CC0): its pavilions and stands, dark, raised as low blocks at 8 m (or 4.5 m a storey where the map gives storeys), its monorail and people mover as solid lines and its gondolas dashed. The project has not checked it pavilion by pavilion.`

// Hotels the reports of 1986 name as putting tenants out for the fair: the Patricia, the Metropole and the Dominion
const EVICTING = /^(PATRICIA HOTEL|METROPOLE HOTEL|DOMINION HOTEL)$/

export const chapterFive: MapChapter = {
  chapterId: 'naming-the-dtes',
  title: 'Naming the Downtown Eastside',
  bare: true,
  oldShoreline: true,
  sites: [
    { id: 'skid-road', label: 'Skid Road', ring: 260, lon: corner.mainHastings[0] - 0.002, lat: corner.mainHastings[1] + 0.0004, located: false, basis: 'The name the newspapers and the city used for the district. A label over the district, not a boundary.' },
    { id: 'dtes', label: 'The Downtown Eastside', ring: 260, lon: corner.mainHastings[0] - 0.002, lat: corner.mainHastings[1] + 0.0004, located: false, basis: 'The name the Downtown Eastside Residents Association gave the neighbourhood in 1973. A label over the district, not a boundary: the sources found do not give the association\'s boundaries.' },
    { id: 'carnegie-centre', label: 'Carnegie Community Centre, 1980', stem: 20, lon: landmarks.carnegie.lon, lat: landmarks.carnegie.lat, located: true, basis: "Today's building at Main and Hastings, which opened as the Carnegie Community Centre on 20 January 1980." },
    { id: 'waterfront-station', label: 'Waterfront station', stem: 10, lon: -123.1118, lat: 49.2859, located: true, basis: "The SkyTrain's western terminus in the old Canadian Pacific station at the foot of Seymour Street; marked at today's station." },
    { id: 'main-station', label: 'Main Street station', stem: 10, lon: -123.1007, lat: 49.2731, located: true, basis: "The SkyTrain's station at Main Street and Terminal Avenue, today's Main Street–Science World; marked at today's station." },
    { id: 'expo-grounds', label: 'Expo 86', stem: 14, lon: fairCentre[0], lat: fairCentre[1], located: true, basis: "The middle of the fair's grounds as OpenHistoricalMap's zones draw them." },
    { id: 'patricia', label: 'Patricia Hotel', stem: 18, lon: -123.09507, lat: 49.28152, located: true, basis: "The Patricia Hotel, 403 East Hastings Street, from the 2024 survey's list." },
    { id: 'guideway', label: 'SkyTrain guideway', lon: -123.1000, lat: 49.2730, located: true, basis: "The elevated stretch of the SkyTrain's first line." },
    { id: 'viaducts', label: 'Georgia viaduct', lon: -123.1035, lat: 49.2774, located: true, basis: "The viaducts of 1972, on their centrelines from the City's street data." },
    { id: 'canada-pavilion', label: 'Canada Pavilion, Burrard Inlet', stem: 10, lon: -123.1117, lat: 49.2888, located: true, basis: "The Canada Pavilion, off the main grounds, on the pier at the foot of Howe and Burrard streets (today's Canada Place)." },
  ],
  routes: [
    {
      id: 'cpr-main-5',
      points: cprLine1912,
      drawIn: false,
      track: true,
      located: true,
      basis: "The Canadian Pacific's main line along the waterfront, read off Goad's 1912 atlas.",
    },
    ...skytrainRoutes.filter((r) => r.points.length >= 2),
    { id: 'skytrain-guideway', points: guidewayLine, drawIn: false, located: true, basis: "The SkyTrain's elevated line, as modelled; not drawn as a line." },
    ...moverRoutes,
  ],
  stops: [
    {
      id: 'naming',
      kicker: '1973',
      title: 'Naming the Downtown Eastside',
      text: [
        'For decades the city has called the district Skid Road. In 1973 the people who live in it form the Downtown Eastside Residents Association, with Bruce Eriksen as its organizer, and give their neighbourhood a name of its own.',
        'The hotels are its housing, and the association\'s first fight is to make them safe.',
      ],
      view: { lon: -123.1000, lat: 49.2810, dist: 2400, theta: SOUTH, phi: 0.76 },
      sites: ['skid-road', 'dtes'],
      marksSequence: [
        { sites: ['skid-road'], after: 0 },
        { sites: ['dtes'], after: 4000 },
      ],
      routes: ['cpr-main-5'],
      land: 'today',
      bridges: true,
      edges,
      models: [['viaducts', 'viaducts-1972']],
      faint: backdrop(1973),
      growth: { from: 1973, to: 1973, buildings: city(1973) },
      context: {
        lines: rail,
        names: [],
        streets,
        streetFill,
        streetStyle,
        note: `The ring is a label over the district, not a boundary: the sources found do not give the association's boundaries. Today's SRO hotels standing by 1973 are red. ${CITY} ${SHORE}`,
        sourceId: 'hasson-ley',
      },
      eventId: 'dera-founded',
    },
    {
      id: 'fire-bylaw',
      kicker: '1974 to 1976',
      title: 'The Fire By-law',
      text: [
        'Hotel fires kill tenants, and the residents\' association presses the City to act. From mid-1974 the City enforces its Fire By-law on the hotels: owners must bring their buildings up to the by-law\'s fire safety standards, starting with the Downtown Eastside\'s hotels of more than twenty rooms.',
        'Most owners pay for the work. Others close their hotels, convert them or tear them down rather than pay, and the rooms go with them.',
      ],
      view: { lon: -123.0990, lat: 49.2822, dist: 1250, theta: SOUTH, phi: 0.8 },
      sites: [],
      routes: ['cpr-main-5'],
      land: 'today',
      bridges: true,
      edges,
      models: [['viaducts', 'viaducts-1972']],
      faint: backdrop1974,
      highlight: { from: corner.mainHastings, ms: 6000 },
      // the losses: stand-ins picked out dark once the inventory is red, then taken down
      clear: { old: lostHotels, then: [], fill: DARK, pick: 7500, at: 11000, ms: 2200 },
      stat: { value: '≈ 2,300', label: 'rental units closed, converted or demolished by 1976', after: 7500 },
      growth: { from: 1974, to: 1974, buildings: city(1974, undefined, (h) => ((h.rooms ?? 0) > 20 ? RED : undefined)) },
      context: {
        lines: rail,
        names: [],
        streets,
        streetFill,
        streetStyle,
        note: `What the by-law asked of each hotel in detail is not in the sources the project has; the City's 2007 report describes it as upgrading hotels under the Fire By-law, beginning in mid-1974 with Downtown Eastside buildings of more than twenty rooms. The red buildings are today's SRO hotels of more than twenty rooms standing by 1974, the ones the enforcement reached first, turning red outward from Main and Hastings; the smaller ones are white. Room counts are today's, from the 2024 SRO Tenant Survey. The fire most often named as the spur is the Commercial Hotel's on Cambie Street, on 21 October 1973, in which five people died; that is from a local history page, not yet confirmed in a record, and is not drawn. A 2023 journal article (Masuda and others, Abandoning the SRO) finds in the City Archives that a crackdown under the Lodging House By-law shut fifteen flophouses in February 1972 and that 400 units were lost that year; the buildings are not named there. The dark buildings that then come down stand for the hotels that closed, converted or were demolished: the project has no list of them, so they are 46 of the larger brick buildings of the faint 1912 backdrop in the hotel blocks, picked at random, one for about fifty of the 2,300 units. Their places are illustrative, not the hotels that were lost. The 2,300 is a 1977 City Planning estimate for the downtown peninsula and Strathcona, not counted building by building. That fires drove the residents' pressure is the account of the movement's own advocates; the project has not traced a source for particular fires. ${CITY} ${SHORE}`,
        sourceId: 'cov-survey-2007',
      },
      eventId: 'fire-bylaw-enforcement',
    },
    {
      id: 'carnegie-centre',
      kicker: '20 January 1980',
      title: 'The Carnegie reopens',
      text: [
        'The Carnegie has stood empty since 1968. The residents\' association proposes it become a community centre with a library, and council agrees in 1978.',
        'On 20 January 1980 it opens again, as the Carnegie Community Centre: "the living room of the Downtown Eastside".',
      ],
      view: { lon: -123.1001, lat: 49.2810, dist: 700, theta: SOUTH, phi: 0.8 },
      sites: ['carnegie-centre'],
      routes: [],
      land: 'today',
      bridges: true,
      edges,
      models: [['viaducts', 'viaducts-1972']],
      faint: backdrop(1980),
      growth: { from: 1980, to: 1980, buildings: city(1980, DARK) },
      context: {
        lines: [],
        names: [],
        streets,
        streetFill,
        streetStyle,
        note: `The dark building is the Carnegie, as it stands today; white since it stopped being the main library in 1957, it is dark again here. Today's SRO hotels standing by 1980 are red. The phrase "the living room of the Downtown Eastside" is how the centre has long been described; its first use is not traced here. ${CITY} ${SHORE}`,
        sourceId: 'cov-carnegie-page',
      },
      eventId: 'carnegie-centre',
    },
    {
      id: 'skytrain',
      kicker: '11 December 1985',
      title: 'The SkyTrain',
      text: [
        'The city builds for the fair. On 11 December 1985 the SkyTrain opens, from Waterfront to New Westminster: in tunnel under downtown, then up on its guideway past the stadium and out along Terminal Avenue, a few blocks south of the hotels.',
        'A new Cambie Bridge opens three days before it, and Pacific Boulevard is laid along the north shore of False Creek.',
      ],
      view: { lon: -123.1060, lat: 49.2790, dist: 2800, theta: SOUTH, phi: 0.75 },
      sites: ['waterfront-station', 'main-station'],
      routes: ['cpr-main-5', ...skytrainIds],
      land: 'today',
      bridges: true,
      edges,
      models: [['expo-grounds', 'bc-place-1986'], ['viaducts', 'viaducts-1972']],
      lay: [{ site: 'guideway', model: 'skytrain-1985', fill: DARK, ms: 7000 }],
      arrivals: trains(8200),   // once the deck is laid (it starts as the camera settles and takes 7 s)
      faint: backdrop(1985),
      growth: { from: 1985, to: 1985, buildings: city(1985) },
      context: {
        lines: rail,
        names: [],
        streets,
        streetFill,
        streetStyle,
        note: `The SkyTrain is drawn as OpenHistoricalMap maps it and dates it, 11 December 1985; the guideway, dark, is laid out from the west. ${GUIDEWAY} Free service began that day and full service on 3 January 1986; the first line was about 21 km long, to New Westminster. ${BRIDGES86} Today's SRO hotels standing by 1985 are red. ${CITY} ${SHORE}`,
        sourceId: 'translink-buzzer-2017',
      },
    },
    {
      id: 'expo',
      kicker: '2 May to 13 October 1986',
      title: 'A world\'s fair',
      text: [
        'Expo 86 opens on 2 May on 67 hectares along the north and east shores of False Creek: six colour zones of pavilions, theatres and rides, joined by a monorail, with the Canada Pavilion on the inlet at the foot of Howe Street.',
        'The fair is a few blocks from the hotels, and millions of visitors are expected.',
      ],
      view: { lon: -123.1070, lat: 49.2790, dist: 2900, theta: SOUTH, phi: 0.74 },
      sites: ['expo-grounds', 'canada-pavilion'],
      routes: ['cpr-main-5', ...skytrainIds.map((id) => id), ...moverIds],
      land: 'today',
      bridges: true,
      edges,
      models: [['expo-grounds', 'science-world-1986'], ['expo-grounds', 'bc-place-1986'], ['canada-pavilion', 'canada-place-1986'], ['viaducts', 'viaducts-1972'], ['guideway', 'skytrain-1985']],
      arrivals: trains(1500),
      faint: backdrop(1986),
      growth: { from: 1986, to: 1986, buildings: [...city(1986), ...pavilions] },
      context: {
        lines: rail,
        names: [],
        streets,
        streetFill,
        streetStyle,
        note: `${OHM} The fair's three landmarks are modelled from their parts in the City's 2009 footprints: the Expo Centre (Science World) with its geodesic sphere, BC Place with the air-supported dome it had until 2010, and Canada Place with its sails. ${GUIDEWAY} ${BRIDGES86} Today's SRO hotels standing by 1986 are red. ${CITY} ${SHORE}`,
        sourceId: 'tce-expo-86',
      },
    },
    {
      id: 'evictions',
      kicker: 'February and March 1986',
      title: 'Evicted for the fair',
      text: [
        'Long-term tenants are evicted so their rooms can be let to visitors. An estimated 700 to 1,000 residents are put out, mostly in February and March, before the fair opens.',
        'At the Patricia, some fifty or sixty residents are given a week to go. Olaf Solheim, who had lived there for decades, dies within weeks of being moved.',
        'Almost all the hotels go back to housing within a year. The people who lived in them do not all come back.',
      ],
      view: { lon: -123.1010, lat: 49.2795, dist: 2300, theta: SOUTH, phi: 0.77 },
      sites: ['patricia'],
      routes: ['cpr-main-5', ...skytrainIds],
      land: 'today',
      bridges: true,
      edges,
      models: [['expo-grounds', 'science-world-1986'], ['expo-grounds', 'bc-place-1986'], ['viaducts', 'viaducts-1972'], ['guideway', 'skytrain-1985']],
      arrivals: trains(1500),
      faint: backdrop(1986),
      growth: { from: 1986, to: 1986, buildings: [...city(1986, undefined, (h) => (EVICTING.test(h.name) ? DARK : RED)), ...pavilions] },
      // the residents leave the hotels, walking out away from the fair: one figure for about five people
      scatter: { from: hotelsBy(1986).map((h) => ({ lon: h.lon, lat: h.lat, weight: ((h as { rooms?: number }).rooms ?? 20) * (EVICTING.test(h.name) ? 4 : 1) })), count: 170, away: fairCentre, reach: [500, 1300], ms: 9000, delay: 1800 },
      stat: { value: '700–1,000', label: 'residents evicted, mostly in February and March 1986', after: 2500 },
      context: {
        lines: rail,
        names: [],
        streets,
        streetFill,
        streetStyle,
        note: `Each dark figure walking out, drawn far larger than life, stands for about five of the 700 to 1,000 residents evicted, Olds's estimate (1989) as the City's 2007 report gives it. The three dark hotels are those the reports of the time name as putting tenants out: the Patricia, where the Pacific Tribune of 5 March 1986 counts 60 residents forced out on a week's notice and the Globe and Mail about 50, and the Metropole and the Dominion, named in the Tribune. The Regal Place on West Hastings, where about 50 had until 19 March, is not in today's list and is not drawn. The residents' association counted about 30 hotels renovating and a tenants' group listed more than 40 buildings; those are not named in what has been read, so the other figures leave today's SRO hotels in proportion to their rooms, with more from the three named. Where the tenants went is not recorded here. Olaf Solheim's death is as Canada's History tells it; accounts differ on how much notice he had. The estimates differ too: up to 1,000 by the residents' association's survey, about 600 by May by Jim Green's count, 500 to 600 in one later account; the City's report says the number of rooms converted could not be established. ${OHM} ${BRIDGES86} Today's SRO hotels standing by 1986 are red. ${CITY} ${SHORE}`,
        sourceId: 'olds-expo',
      },
      eventId: 'expo-evictions',
    },
  ],
}

// Photographs for each card, kept in chapterFivePhotos.ts.
for (const stop of chapterFive.stops) stop.photos ??= chapterFivePhotos[stop.id]
