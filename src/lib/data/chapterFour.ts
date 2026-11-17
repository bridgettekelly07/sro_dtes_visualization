/**
 * Chapter 4 told on the map: the centre moves west, 1950 to 1972.
 *
 * For these years there is no map of every building in the project, so the city is drawn from the other
 * end: today's building footprints at their LiDAR heights, kept where the City's property records date
 * the lot's building to the card's year or before (src/lib/data/builtBy1972.json, made by
 * scripts/build-survivors.py). They are the survivors: what stood then and still stands. Buildings of
 * those years since demolished are missing, so the city is drawn emptier than it was. In the blocks that
 * the 1960s cleared, the houses that went are stood in for by Goad's 1912 atlas, until they go.
 */
import { type GrowthBuilding, type MapChapter } from './stops'
import { districtTo, inRing } from './district1912'
import { models as buildingModels } from './models'
import streets1887 from './streets1887.json'
import sroByYear from './sroByYear.json'
import sroGround from './sroGround.json'
import builtBy1972 from './builtBy1972.json'
import districts from './districts1907.json'
import landmarks from './landmarks.json'
import flats1917 from './flats1917.json'
import { cprLine1912 } from './cpr1912'
import { chapterFourPhotos } from './chapterFourPhotos'

const SOUTH = Math.PI / 2
const RED = '#8e4233'
const DARK = '#3b3b3b'
const streets = [...streets1887.edges, ...(flats1917.streets as number[][][])]
const ring = (k: string) => (districts as unknown as Record<string, [number, number][]>)[k]
const corner = districts.corners as unknown as Record<string, [number, number]>
const chinatown = ring('chinatown')
const hogansAlley = ring('hogansAlley')
const hogansWest = ring('hogansWest')
const macleanHousing = ring('macleanHousing')
const macleanPark = ring('macleanPark')
const raymur = ring('raymur')
const cleared = [macleanHousing, macleanPark, raymur]
const inAny = (rings: [number, number][][], b: { lon: number; lat: number }) => rings.some((r) => inRing(b.lon, b.lat, r))
const middle = (r: [number, number][]): [number, number] => [r.slice(0, -1).reduce((a, p) => a + p[0], 0) / (r.length - 1), r.slice(0, -1).reduce((a, p) => a + p[1], 0) / (r.length - 1)]

const hotels = (sroByYear.buildings as unknown as GrowthBuilding[]).map((h, i) => {
  const ground = (sroGround.ground as number[])[i]
  return { ...h, ground, built: h.built == null ? null : Math.max(h.built, ground) }
})
const underHotel = (b: { lon: number; lat: number }) => hotels.some((h) => h.parts.some((p) => inRing(b.lon, b.lat, p.ring)))
const landmarkRings = [landmarks.carnegie, landmarks.woodwards, landmarks.bcer].flatMap((l) => l.parts.map((p) => p.ring as [number, number][]))
// a survivor is one of the landmarks' own footprints when its ring is the same ring, or its middle falls inside one
const sameRing = (a: [number, number][], b: [number, number][]) => a.length === b.length && a[0][0] === b[0][0] && a[0][1] === b[0][1]
const underLandmark = (b: { lon: number; lat: number; parts: { ring: [number, number][] }[] }) => landmarkRings.some((r) => inRing(b.lon, b.lat, r) || b.parts.some((p) => sameRing(p.ring, r)))

/** The survivors standing by `year`: today's footprints on lots dated to that year or before. */
const survivors = (builtBy1972.buildings as { ring: [number, number][]; h: number; built: number }[]).map((b) => {
  const lon = b.ring.reduce((a, p) => a + p[0], 0) / b.ring.length
  const lat = b.ring.reduce((a, p) => a + p[1], 0) / b.ring.length
  return { name: '', built: b.built, lon, lat, parts: [{ kind: 'prism' as const, x: 0, y: 0, ring: b.ring, h: b.h }] }
})
const standingBy = (year: number, skip?: (b: GrowthBuilding) => boolean): GrowthBuilding[] =>
  survivors.filter((b) => b.built <= year && !underHotel(b) && !underLandmark(b) && !skip?.(b))
/** The houses of the blocks later cleared, stood in for by the 1912 atlas, until the year they went. */
const oldHouses = (rings: [number, number][][]): GrowthBuilding[] => districtTo(1912, (b) => underHotel(b)).filter((b) => inAny(rings, b))
const landmark = (id: string, fill?: string): GrowthBuilding[] => {
  const m = buildingModels.find((x) => x.id === id)
  if (!m || !m.anchor) return []
  return [{ name: m.name, built: 1903, fill, lon: m.anchor[0], lat: m.anchor[1], parts: m.parts.filter((p) => p.kind === 'prism') as GrowthBuilding['parts'] }]
}
const anchors = (carnegie?: string): GrowthBuilding[] => [...landmark('carnegie-1903', carnegie), ...landmark('woodwards-1903'), ...landmark('bcer-1912')]
const hotelsBy = (year: number) => hotels.filter((h) => (h.built ?? 9999) <= year).map((h) => ({ ...h, fill: RED }))

/**
 * The rest of the city, faintly: where no survivor is shown, the building of Goad's 1912 atlas stands in.
 * Most of the atlas's buildings were still standing in the 1950s and 1960s, so this fills the blocks that
 * today's dated footprints leave empty; buildings put up between 1912 and the card's year that have since
 * been demolished are still missing, and some atlas buildings had already gone. Survivors are indexed on
 * a 100 m grid so the test runs once at load.
 */
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
/** Under a survivor the card shows: one on the lot and built by the card's year. */
const underSurvivorBy = (year: number) => (b: { lon: number; lat: number }) => (survivorCells.get(cellOf(b.lon, b.lat)) ?? []).some((sv) => sv.built <= year && inRing(b.lon, b.lat, sv.ring))
const backdrop = (year: number): GrowthBuilding[] => districtTo(1912, (b) => underHotel(b) || underSurvivorBy(year)(b) || inAny([...cleared, hogansWest], b))

const SURVIVORS = `The buildings drawn in full are today's footprints at their LiDAR heights, kept where the City's property records date the lot's building to the card's year or before: the survivors, what stood then and still stands. The faint buildings behind them are those of Goad's 1912 atlas on the lots where no survivor is shown, standing in for the buildings of the time since demolished: most of the atlas's buildings were still standing in these years, though some had gone, and anything built after 1912 and demolished since is missing. Today's SRO hotels are red.`
const CLEARED = `In the blocks the 1960s cleared, the houses that went are stood in for by the buildings of Goad's 1912 atlas, until the card where they go.`
const SHORE = `The shoreline is the one with the False Creek flats filled, as at 1917; later fills along Burrard Inlet are not drawn. The railways are the Canadian Pacific's waterfront line as the 1912 atlas draws it, and on the flats today's centrelines kept where they lie on the fill, as the successors of the yards laid out there.`
const edges = { width: 0.55, colour: '#7a7a7a' }
const streetStyle = { width: 0.8, colour: '#8c8c8c', opacity: 0.8 }

// Hastings Street's own line from the street data, east edge to Carrall: the streetcar's way in to the terminal
const hastingsLine = (districts as unknown as { hastings: [number, number][] }).hastings
const HASTINGS: [number, number][] = [...hastingsLine.filter((p) => p[0] >= corner.carrallHastings[0] - 0.0002 && p[0] <= -123.076).reverse(), corner.carrallHastings]

export const chapterFour: MapChapter = {
  chapterId: 'centre-moves-west',
  title: 'The centre moves west',
  bare: true,
  oldShoreline: true,
  sites: [
    { id: 'old-centre', label: 'Main and Hastings, the old centre', ring: 140, lon: corner.mainHastings[0], lat: corner.mainHastings[1], located: true, basis: 'The crossroads of the city in 1911: the Carnegie Library, the City Hall and the interurban terminal within a block. Marked at the intersection on today\'s street lines.' },
    { id: 'new-centre', label: 'Granville and Georgia, the new centre', ring: 140, lon: -123.1190, lat: 49.2830, located: true, basis: 'The corner of Granville and Georgia streets, where the department stores, the new library of 1957 and the office towers of the 1960s gathered: marked at the intersection on today\'s street lines.' },
    { id: 'library-1957', label: 'New central library, 1957', stem: 26, lon: landmarks['library-1957'].lon, lat: landmarks['library-1957'].lat, located: true, basis: "Today's building at the north-west corner of Burrard and Robson, 750 Burrard Street, which the property records date to 1956: the central library of 1957 to 1995." },
    { id: 'carnegie-1957', label: 'Carnegie: library to 1957, museum to 1968', stem: 20, lon: landmarks.carnegie.lon, lat: landmarks.carnegie.lat, located: true, basis: "Today's building at Main and Hastings, the main library until the new central library opened on Burrard Street in 1957, then the Vancouver Museum until 1968, then empty." },
    { id: 'bcer-closed', label: 'Interurban terminal, closed 1958', stem: 26, lon: landmarks.bcer.lon, lat: landmarks.bcer.lat, located: true, basis: 'The BC Electric terminal at Hastings and Carrall; interurban passenger service ended in 1958. When service into this terminal stopped is not given by the source.' },
    { id: 'maclean-housing', label: 'MacLean Park housing, 1962', stem: 14, lon: middle(macleanHousing)[0], lat: middle(macleanHousing)[1], located: false, basis: 'The public housing built on the old MacLean Park, by the accounts between Union and Keefer, Gore and Jackson: the block, not the buildings.' },
    { id: 'maclean-park', label: 'New MacLean Park, 1963', stem: 6, lon: middle(macleanPark)[0], lat: middle(macleanPark)[1], located: false, basis: 'The park made in 1963 by clearing a block of houses between Keefer and Georgia, Heatley and Hawks, by one account.' },
    { id: 'raymur', label: 'Raymur Place, 1960s', stem: 14, lon: middle(raymur)[0], lat: middle(raymur)[1], located: false, basis: 'The Raymur Place project (later Stamps Place) on Campbell Avenue between Hastings and Union, by the accounts; its dates differ between them, from 1962 to 1970.' },
    { id: 'hogans-alley', label: "Hogan's Alley", stem: 12, lon: middle(hogansAlley)[0], lat: middle(hogansAlley)[1], located: false, basis: 'The middle of the outline drawn for the neighbourhood: a label, not a place.' },
    { id: 'chinatown', label: 'Chinatown', stem: 16, lon: middle(chinatown)[0], lat: middle(chinatown)[1], located: false, basis: 'The middle of the outline drawn for the neighbourhood: a label, not a place.' },
    { id: 'viaducts', label: 'Georgia and Dunsmuir viaducts, 1972', stem: 14, lon: -123.1035, lat: 49.2774, located: true, basis: "On the viaducts' centrelines from the City's street data, which keep the alignment of 1972." },
  ],
  routes: [
    {
      id: 'cpr-main-4',
      // the Canadian Pacific's waterfront line, as the 1912 atlas draws it: still the line in these years
      points: cprLine1912,
      drawIn: false,
      track: true,
      located: true,
      basis: "The Canadian Pacific's main line along the waterfront, read off Goad's 1912 atlas; it ran there through these years.",
    },
    {
      id: 'hastings-streetcar',
      // the Hastings line, the last streetcar route, from the east edge of the map west to Burrard
      points: HASTINGS,
      drawIn: false,
      track: true,
      located: false,
      basis: 'The Hastings streetcar line, drawn on Hastings Street\'s centreline from the City\'s street data, from the east edge of the map in to the terminal at Carrall. The last streetcar in regular service ran on this line in April 1955; the line ran on west of Carrall too, and its tracks\' exact positions are not traced.',
      caveat: 'The track is drawn down the centreline of Hastings Street from the east to Carrall; its exact position is not traced, and the line continued west.',
    },
    {
      id: 'freeway-1967',
      // the elevated freeway of the 1967 plan: along the waterfront, through Maple Tree Square, down
      // Carrall through Chinatown, then east along Prior
      points: [[-123.1200, 49.2882], [-123.1150, 49.2868], [-123.1100, 49.2850], [-123.1060, 49.2840], [-123.1042, 49.2834], [-123.1044, 49.2805], [-123.1046, 49.2770], [-123.1000, 49.2765], [-123.0950, 49.2762], [-123.0850, 49.2758], [-123.0770, 49.2755]],
      drawIn: true,
      colour: '#8e4233',
      // drawn, held, and erased again: proposed and never built
      undrawAfter: 2500,
      located: false,
      basis: 'The 1967 plan as the accounts describe it: an elevated freeway along the Burrard Inlet waterfront, through Maple Tree Square, down Carrall Street through Chinatown, and east along Prior Street to the highway. Drawn on those streets; the engineers\' alignment is not traced.',
      caveat: 'Drawn on the streets the accounts name; the plan\'s own alignment is not traced.',
    },
  ],
  stops: [
    {
      id: 'skid-road',
      kicker: '1950s',
      title: 'The centre moves west',
      text: [
        'After the war the city\'s centre drifts west, to Granville and Georgia: the department stores, the offices, the new library. Hastings and Main, the crossroads of 1911, is left behind.',
        'The district gets a name, Skid Road. Its hotels stop being improved. The men in them are older now, and stay.',
      ],
      view: { lon: -123.1080, lat: 49.2822, dist: 3200, theta: SOUTH, phi: 0.75 },
      sites: ['old-centre', 'new-centre'],
      // the old centre ringed first; its ring closes and the new centre's opens
      marksSequence: [
        { sites: ['old-centre'], after: 0 },
        { sites: ['new-centre'], after: 4000 },
      ],
      routes: ['cpr-main-4'],
      faint: backdrop(1955),
      land: '1917',
      edges,
      models: [],
      growth: { from: 1955, to: 1955, buildings: [...standingBy(1955), ...oldHouses([...cleared, hogansWest]), ...anchors(), ...hotelsBy(1955)] },
      context: {
        lines: flats1917.rail as [number, number][][],   // the railways on the flats, today's centrelines kept where they lie on the fill
        names: [],
        streets,
        streetStyle,
        note: `The two rings mark the crossroads of 1911 at Main and Hastings and the new centre at Granville and Georgia; both are drawn at the intersections on today's street lines, as markers, not measured extents. ${SURVIVORS} ${CLEARED} ${SHORE} The lines are the streets as surveyed by 1887, with today's on the flats.`,
        sourceId: 'hasson-ley',
      },
      eventId: 'streetcars-end',
    },
    {
      id: 'rails',
      kicker: '1955 to 1958',
      title: 'Rails to rubber',
      text: [
        'On 22 April 1955 the last streetcar in regular service runs, on the Hastings line. Trolley buses take over. In 1958 the interurbans stop too, and the terminal at Carrall and Hastings loses its trains.',
        'The district had grown up around its rails. Now they are lifted.',
      ],
      view: { lon: -123.1040, lat: 49.2828, dist: 2200, theta: SOUTH, phi: 0.78 },
      sites: ['bcer-closed'],
      routes: ['cpr-main-4', 'hastings-streetcar'],
      // the last car comes in along Hastings to the terminal, which stands in black until it arrives, then goes white: closed
      arrivals: [{ model: 'streetcar-1955', route: 'hastings-streetcar', ms: 10000, scale: 2.6, then: [['bcer', 'bcer-1912']] }],
      faint: backdrop(1955),
      land: '1917',
      edges,
      models: [['bcer', 'bcer-1912', DARK]],
      growth: { from: 1955, to: 1955, buildings: [...standingBy(1955), ...oldHouses([...cleared, hogansWest]), ...landmark('carnegie-1903'), ...landmark('woodwards-1903'), ...hotelsBy(1955)] },
      context: {
        lines: flats1917.rail as [number, number][][],   // the railways on the flats, today's centrelines kept where they lie on the fill
        names: [],
        streets,
        streetStyle,
        note: `The track is the Hastings streetcar line on the street's centreline from the City's data, drawn from the east edge of the map in to the terminal at Carrall; the line ran on west as well. The last streetcar in regular service ran on it in April 1955, on a date the accounts give as the 21st, 22nd or 24th. The car is a type, not a particular one, drawn larger than life. The terminal stands black until the car arrives, then white: the trains are done with it. The source for the interurban's end in 1958 does not say when service into the Carrall Street terminal stopped. ${SURVIVORS} ${CLEARED} ${SHORE}`,
        sourceId: 'translink-buzzer-2017',
      },
      eventId: 'streetcars-end',
    },
    {
      id: 'library',
      kicker: '1957',
      title: 'The library leaves',
      text: [
        'In 1957 a new central library opens on Burrard Street, and the Carnegie at Main and Hastings stops being the city\'s main library. It becomes the Vancouver Museum until 1968, and then stands empty.',
        'The institutions follow the stores and the offices west. What is left is the hotels.',
      ],
      // from the Carnegie west to Burrard and Robson: the new library rises in black, and when it is up
      // the Carnegie, black till then, goes white
      view: { lon: -123.1110, lat: 49.2822, dist: 2600, theta: SOUTH, phi: 0.78 },
      sites: ['carnegie-1957', 'library-1957'],
      routes: ['cpr-main-4'],
      faint: backdrop(1957),
      land: '1917',
      edges,
      models: [['carnegie', 'carnegie-1903', DARK]],
      rises: [['library-1957', 'library-1957', DARK]],
      risesThen: [['carnegie', 'carnegie-1903']],
      growth: { from: 1957, to: 1957, buildings: [...standingBy(1957, (b) => inRing(b.lon, b.lat, landmarks['library-1957'].parts[0].ring as [number, number][])), ...oldHouses([...cleared, hogansWest]), ...landmark('woodwards-1903'), ...landmark('bcer-1912'), ...hotelsBy(1957)] },
      context: {
        lines: flats1917.rail as [number, number][][],   // the railways on the flats, today's centrelines kept where they lie on the fill
        names: [],
        streets,
        streetStyle,
        note: `The new library rises on its site at the north-west corner of Burrard and Robson, today's building at 750 Burrard, which the property records date to 1956 and whose LiDAR height takes in the storeys added after the library left in 1995. It stands black; the Carnegie, black while it is still the main library, goes white once the new one is up. ${SURVIVORS} ${SHORE}`,
        sourceId: 'cov-carnegie-page',
      },
      eventId: 'library-moves',
    },
    {
      id: 'clearance',
      kicker: '1958 to 1967',
      title: 'Strathcona cleared',
      text: [
        'In 1958 council adopts a redevelopment plan that would demolish nearly all of Strathcona. Blocks of houses are expropriated and levelled for public housing: the MacLean Park project in 1962, a new park in 1963, Raymur Place after it.',
        'By 1967 fifteen blocks are gone. The people in them, many from Chinatown, are moved into the projects or out.',
      ],
      // framed to take in all three blocks, Raymur Place at the east
      view: { lon: -123.0900, lat: 49.2782, dist: 1750, theta: SOUTH, phi: 0.78 },
      sites: ['maclean-housing', 'maclean-park', 'raymur'],
      routes: ['cpr-main-4'],
      faint: backdrop(1968),
      land: '1917',
      edges,
      models: [],
      // the rest of the city as it stood, the hotels in red; the three blocks are the clearance's
      growth: { from: 1968, to: 1968, buildings: [...standingBy(1968, (b) => inAny(cleared, b)), ...oldHouses([hogansWest]), ...anchors(), ...hotelsBy(1968)] },
      // the old houses of the three blocks stand picked out, go down, and the projects come up in their place
      clear: { old: oldHouses(cleared), then: standingBy(1968).filter((b) => inAny(cleared, b)), fill: DARK, at: 2500, ms: 1800 },
      context: {
        outlines: [macleanHousing, macleanPark, raymur],
        lines: flats1917.rail as [number, number][][],   // the railways on the flats, today's centrelines kept where they lie on the fill
        names: [],
        streets,
        streetStyle,
        note: `The three outlines are the blocks the accounts name for the clearance: MacLean Park housing between Union and Keefer, Gore and Jackson; the new park between Keefer and Georgia, Heatley and Hawks; Raymur Place on Campbell between Hastings and Union. The accounts give fifteen blocks cleared by 1967 and do not list them all, so other cleared blocks are not shown; the dates of the Raymur project differ between accounts. The houses that stood in these blocks are the buildings of Goad's 1912 atlas, picked out in black; they go down, and what rises in their place is the public housing as it stands today, dark as well. ${SURVIVORS} ${SHORE}`,
        sourceId: 'vhf-chan-house',
      },
      eventId: 'strathcona-clearance',
    },
    {
      id: 'freeway',
      kicker: '1967',
      title: 'The freeway',
      text: [
        'In October 1967 council approves an elevated eight-lane freeway down Carrall Street through Chinatown, the first piece of a system along the waterfront and out along Prior Street. Strathcona\'s residents, led by Mary Lee Chan, form the Strathcona Property Owners and Tenants Association.',
        'They win a federal freeze on renewal funds. In January 1968 council rescinds the Carrall Street route.',
      ],
      view: { lon: -123.1030, lat: 49.2800, dist: 2600, theta: SOUTH, phi: 0.76 },
      sites: ['chinatown', 'hogans-alley'],
      routes: ['cpr-main-4', 'freeway-1967'],
      faint: backdrop(1967),
      land: '1917',
      edges,
      models: [],
      growth: { from: 1967, to: 1967, buildings: [...standingBy(1967), ...oldHouses([hogansWest]), ...anchors(), ...hotelsBy(1967).map((h) => ({ ...h, fill: undefined }))] },
      context: {
        outlines: [chinatown, hogansAlley],
        lines: flats1917.rail as [number, number][][],   // the railways on the flats, today's centrelines kept where they lie on the fill
        names: [],
        streets,
        streetStyle,
        note: `The red dashed line is the freeway of the 1967 plan as the accounts describe it, drawn on the streets they name: along the waterfront, through Maple Tree Square, down Carrall and east along Prior. It is drawn in and then erased: proposed, and never built. The plan's own alignment is not traced. The accounts differ on where the waterfront route ran and on whether the Carrall route ended with council's reversal in January 1968 or with the federal freeze. ${SURVIVORS.replace(' Today\'s SRO hotels are red.', '')} The hotels are white on this card. ${SHORE}`,
        sourceId: 'ptm-georgia-viaduct',
      },
      eventId: 'freeway-fight',
    },
    {
      id: 'viaducts',
      kicker: '1967 to 1972',
      title: 'The viaducts',
      text: [
        'The freeway is stopped, but its first stage is already under way. From 1967 the City levels the western half of Hogan\'s Alley for the Georgia and Dunsmuir viaducts, which open in 1972.',
        'They are the only part of the plan ever built. The Black neighbourhood under them is gone.',
      ],
      view: { lon: -123.1030, lat: 49.2775, dist: 1400, theta: SOUTH, phi: 0.78 },
      sites: ['viaducts', 'hogans-alley'],
      routes: ['cpr-main-4'],
      faint: backdrop(1972),
      land: '1917',
      edges,
      models: [],
      // the viaducts are laid along their length from Beatty eastward, deck and piers, the Georgia first
      lay: [{ site: 'viaducts', model: 'viaducts-1972', fill: DARK, ms: 6000 }],
      growth: { from: 1972, to: 1972, buildings: [...standingBy(1972), ...anchors(), ...hotelsBy(1972)] },
      context: {
        outlines: [hogansAlley],
        lines: flats1917.rail as [number, number][][],   // the railways on the flats, today's centrelines kept where they lie on the fill
        names: [],
        streets,
        streetStyle,
        note: `The viaducts are drawn as decks on the centrelines the City's street data gives for them, which keep the 1972 alignment, kept about 8 m above the ground beneath them; their real grade, meeting the ground at each end, is not traced. The houses of Hogan's Alley west of Gore, drawn from the 1912 atlas on the earlier cards, are gone here. ${SURVIVORS} ${SHORE}`,
        sourceId: 'tce-hogans-alley',
      },
      eventId: 'viaducts',
    },
  ],
}

// Archival photographs for each card, kept in chapterFourPhotos.ts.
for (const stop of chapterFour.stops) stop.photos ??= chapterFourPhotos[stop.id]
