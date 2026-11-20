/**
 * Chapter 2 told on the map: the hotel boom, 1890 to 1914.
 *
 * The hotels are today's SRO buildings, raised from their real footprints and heights in the order
 * the City's property records say they were built (src/lib/data/sroByYear.json, made by
 * scripts/build-sro-years.py). They are the survivors: hotels of the same years that have since been
 * demolished are not drawn.
 */
import { type GrowthBuilding, type MapChapter } from './stops'
import { cprLine1912 } from './cpr1912'
import streets1887 from './streets1887.json'
import parcelsHastings from './parcelsHastings.json'
import sroByYear from './sroByYear.json'
import landmarks from './landmarks.json'
import { models as buildingModels } from './models'
import { district, districtTo, footprintAt, inRing } from './district1912'
import sroGround from './sroGround.json'
import { chapterTwoPhotos } from './chapterTwoPhotos'
import flats1917 from './flats1917.json'

const SOUTH = Math.PI / 2
// today's SRO hotels, each with the year its ground existed, so one on fill is not raised before the fill
const hotels = (sroByYear.buildings as unknown as GrowthBuilding[]).map((h, i) => {
  const ground = (sroGround.ground as number[])[i]
  return { ...h, ground, built: h.built == null ? null : Math.max(h.built, ground) }
})
const streets = streets1887.edges

const RED = '#8e4233'
const landmark = (id: string, name: string, fill?: string): GrowthBuilding[] => {
  const m = buildingModels.find((x) => x.id === id)
  if (!m || !m.anchor) return []
  return [{ name, built: 1903, fill, lon: m.anchor[0], lat: m.anchor[1], parts: m.parts.filter((p) => p.kind === 'prism') as GrowthBuilding['parts'] }]
}
/** Whether an atlas building stands where one of today's hotels does: the hotel is drawn instead. */
const underHotel = (b: { lon: number; lat: number }) => hotels.some((h) => h.parts.some((p) => inRing(b.lon, b.lat, p.ring)))

// The Hastings card: the district to 1903, with Woodward's and the Carnegie Library last, in red.
const hastingsRise: GrowthBuilding[] = [...districtTo(1903), ...landmark('carnegie-1903', 'Carnegie Library', RED), ...landmark('woodwards-1903', "Woodward's", RED)]
// The hotels card: the district on to 1914, with today's SRO hotels picked out in red as they go up.
const hotelsRise: GrowthBuilding[] = [
  ...districtTo(1914, underHotel),
  ...landmark('carnegie-1903', 'Carnegie Library'),
  ...landmark('woodwards-1903', "Woodward's"),
  ...hotels.map((h) => ({ ...h, fill: RED })),
]

// The Canadian Pacific's station and piers at the foot of Granville, as the 1912 atlas draws them: the
// station (brick) at the head of Granville Street, and the freight sheds on the piers and along the
// waterfront. Picked out by their place in goad1912.json, checked against the atlas sheet by eye.
const CPR_STATION: [number, number] = [-123.11264, 49.28613]
const CPR_PIER: [number, number] = [-123.1151, 49.2890]
// the station, and the freight sheds on the pier and along the waterfront, found by their places on the sheet
const terminalPlaces: ['brick' | 'frame', number, number][] = [['brick', -123.11264, 49.28613], ['frame', -123.11537, 49.28911], ['frame', -123.11481, 49.28898], ['frame', -123.11515, 49.28792], ['frame', -123.11284, 49.2872], ['frame', -123.11058, 49.28655], ['frame', -123.10905, 49.28613]]
const terminalIds = new Set(terminalPlaces.map(([kind, lon, lat]) => `${kind}-${footprintAt(kind, lon, lat)}`))
const isTerminal = (b: { kind: string; i: number }) => terminalIds.has(`${b.kind}-${b.i}`)
const bcerIndex = footprintAt('brick', landmarks.bcer.lon, landmarks.bcer.lat)
const terminals: GrowthBuilding[] = district
  .filter(isTerminal)
  .map((b) => ({ name: 'Canadian Pacific', built: 1912, fill: '#3b3b3b', lon: b.lon, lat: b.lat, piles: true, minBase: 2, parts: [{ kind: 'prism', x: 0, y: 0, ring: b.ring, h: b.kind === 'brick' ? 11 : 7 }] }))
// The hotels graded by how far they stand from the station: the nearest in the full red, the farthest
// east in the palest. A stand-in for price, on the card's own claim that the cheapest rooms were further
// east: no room rates from the time are in the data.
const metresFromStation = (h: { lon: number; lat: number }) => Math.hypot((h.lon - CPR_STATION[0]) * 72_600, (h.lat - CPR_STATION[1]) * 111_200)
const graded = (h: GrowthBuilding): GrowthBuilding => {
  const k = Math.max(0, Math.min(1, (metresFromStation(h) - 400) / 1600))
  const mix = (a: number, b: number) => Math.round(a + (b - a) * k).toString(16).padStart(2, '0')
  return { ...h, fill: `#${mix(0x8e, 0xe2)}${mix(0x42, 0xc4)}${mix(0x33, 0xbb)}` }
}
// The bust: everything standing by 1913, and the six hotels that still go up after it, in red.
const bustRise: GrowthBuilding[] = [
  ...districtTo(1912, (b) => underHotel(b) || (b.kind === 'brick' && b.i === bcerIndex)),
  ...landmark('carnegie-1903', 'Carnegie Library'),
  ...landmark('woodwards-1903', "Woodward's"),
  ...landmark('bcer-1912', 'BC Electric terminal'),
  ...hotels.map((h) => ((h.built ?? 0) >= 1914 ? { ...h, fill: RED } : h)),
]
const travellersRise: GrowthBuilding[] = [
  ...districtTo(1912, (b) => underHotel(b) || isTerminal(b)),
  ...landmark('carnegie-1903', 'Carnegie Library'),
  ...landmark('woodwards-1903', "Woodward's"),
  ...terminals,
  ...hotels.map(graded),
]

// The Canadian Pacific's main line along the waterfront, as Goad's 1912 atlas draws it.
const cprLine = cprLine1912

const SHORE_1912 = `The shoreline is the one Goad's 1912 atlas draws, read from its wash of blue along the water: the 1880s shore with the Canadian Pacific's yard filled out west of Carrall, and wharves and piers built out on piles. Where the atlas draws a building on what had been water, the ground under it is counted as filled: the strip under the railway along the waterfront, and the edge of False Creek around Carrall and Columbia. That edge is drawn round the buildings, so it is approximate.`

export const chapterTwo: MapChapter = {
  chapterId: 'hotel-boom',
  title: 'The hotel boom',
  bare: true,
  oldShoreline: true,
  sites: [
    { id: 'carnegie', label: 'Carnegie Library, 1903', stem: 18, lon: landmarks.carnegie.lon, lat: landmarks.carnegie.lat, located: true, basis: "Today's building at 401 Main Street, at the south-west corner of Main and Hastings." },
    { id: 'woodwards', label: "Woodward's, 1903", stem: 24, lon: landmarks.woodwards.lon, lat: landmarks.woodwards.lat, located: true, basis: "The store as Goad's 1912 atlas draws it, on the block north of Hastings between Abbott and Cambie: larger than the store of 1903, whose outline is not traced." },
    { id: 'cpr-station', label: 'CPR station', stem: 12, lon: CPR_STATION[0], lat: CPR_STATION[1], located: true, basis: "The brick building at the head of Granville Street on the Canadian Pacific's tracks in Goad's 1912 atlas: the station of 1898 to 1914." },
    { id: 'cpr-pier', label: 'CPR pier and sheds', stem: 8, lon: CPR_PIER[0], lat: CPR_PIER[1], located: true, basis: "The freight sheds on the pier out from the foot of Granville in Goad's 1912 atlas." },
    { id: 'bcer', label: 'Interurban terminal, 1911', stem: 26, lon: landmarks.bcer.lon, lat: landmarks.bcer.lat, located: true, basis: "Today's building at 425 Carrall Street, at the south-west corner of Carrall and Hastings." },
  ],
  routes: [
    {
      id: 'cpr-main',
      points: cprLine,
      drawIn: false,
      track: true,
      located: true,
      basis: "Read by eye off Goad's 1912 atlas: through the yards west of Carrall, along the shore by Railway Street east of it.",
    },
    {
      id: 'steamer-in',
      // the steamships' way in: through the First Narrows and up the inlet to the pier at the foot of Granville
      points: [[-123.1270, 49.2985], [-123.1225, 49.2955], [-123.1190, 49.2928], [-123.1162, 49.2903]],
      drawIn: true,
      located: false,
      basis: 'The ships\' course is not surveyed: a line drawn from the First Narrows to the head of the pier.',
    },
    {
      id: 'train-in',
      // the trains' way in: along the line from the east to the station
      points: [...[...cprLine].reverse().filter((p) => p[0] > CPR_STATION[0]), CPR_STATION],
      drawIn: true,
      located: true,
      basis: "Along the Canadian Pacific's line as Goad's 1912 atlas draws it, to the station.",
    },
    {
      id: 'bcer-track',
      // in along Hastings from the east edge of the map, then turning into the terminal
      points: [[-123.0760, 49.28095], [-123.0850, 49.28110], [-123.0950, 49.28127], [-123.1004, 49.28135], [-123.1022, 49.28143], [-123.1031, 49.28145], [-123.104, 49.28146], [-123.10455, 49.2814], [-123.10478, 49.28124]],
      drawIn: true,
      track: true,
      located: false,
      basis: "Goad's 1912 atlas draws the track along Hastings Street at Carrall and curving into the terminal. The interurban line is drawn here along Hastings to the east edge of the map; where it left Hastings for Westminster Road, on its way to New Westminster, is not traced.",
      caveat: 'The track along Hastings is drawn on the street line; where the interurban turned off Hastings toward New Westminster is not traced.',
    },
  ],
  stops: [
    {
      id: 'hastings',
      kicker: '1890s to 1903',
      title: 'Hastings becomes the centre',
      text: [
        'After the railway arrives, the city grows west and south, but its main street is Hastings. In 1903 two of its anchors open: the Carnegie Library at Main, as the city\'s main library, and Woodward\'s department store at Abbott.',
        'Between them, the first of the hotels are already standing.',
      ],
      view: { lon: -123.1028, lat: 49.2817, dist: 1000, theta: SOUTH, phi: 0.8 },
      // the two anchors named on dotted stems above their roofs, once they are up
      sites: ['carnegie', 'woodwards'],
      marksAfterGrowth: true,
      routes: ['cpr-main'],
      // the shore of 1887, and the railway's yard west of Carrall filled in by 1898
      land: '1887',
      shoreLabel: { text: 'SHORELINE 1903', near: [-123.1075, 49.2861] },
      // Hastings Street is named first; then the district rises, year by year, to 1903, when the two
      // anchors come up in red and are named
      models: [],
      lettering: [
        { text: 'HASTINGS STREET', at: [-123.1040, 49.28146], along: [[-123.1040, 49.28146], [-123.0999, 49.28135]], px: 11, colour: '#2b2b2b', tracking: 0.35 },
        // Main Street, then Westminster Avenue, read northward up the street toward Hastings; nearer the
        // camera than the blocks north of Hastings, where a north-south name is too foreshortened to read
        { text: 'MAIN STREET', at: [-123.0997, 49.2797], along: [[-123.0997, 49.2797], [-123.0997, 49.2812]], px: 12, colour: '#2b2b2b', tracking: 0.35 },
      ],
      growth: { from: 1886, to: 1903, ms: 13000, delay: 1600, buildings: hastingsRise, landAt: [[1898, '1900']] },
      context: {
        lines: [],
        names: [],
        streets,
        parcels: parcelsHastings.rings,
        note: `The shoreline starts as that of 1887, the 1880s shore with the railway's roadbed along it, and changes in 1898 as the Canadian Pacific's yard west of Carrall is filled: by then Major Matthews records the inlet seeping through it. No map of the district's buildings from around 1903 is digitized in the City Archives: the nearest are the 1889 Dakin plan and Goad's 1912 atlas. The buildings are Goad's 1912 atlas, the nearest record of the district's buildings, raised to 1903 in the order they were built. Where the lot's building still stands, the year comes from the City's property records, and buildings recorded as built after 1903 are left out. For most, the building has gone and its year is not recorded: those are given a year at random between 1887 and 1912, in no order of place, so the district fills in gradually; that year is a stand-in, not a record of when each went up, and the ones it puts after 1903 are left out. The property records' years are sometimes rounded or estimated. Under them are the lots, today's parcels on the 1880s land, which keep the pattern of the 1870s and 1880s surveys; some have since been joined. The Carnegie Library is drawn as it stands today. Woodward's is drawn on today's footprints at the corner, standing in for the 1903 store, which was enlarged many times since. The faint lines are the streets as surveyed by 1887.`,
        sourceId: 'cov-property-tax',
      },
      eventId: 'woodwards-opens',
    },
    {
      id: 'hotels',
      kicker: '1900 to 1914',
      title: 'The hotels go up',
      text: [
        'Block by block along Hastings, Cordova, Powell, Carrall and Main, the hotels go up: small single rooms over shops and bars, with shared washrooms down the hall.',
        'Of the 128 buildings on the City\'s list of SRO hotels whose year of building is recorded, 110 went up between 1901 and 1914. Between them they hold almost 5,000 of today\'s rooms.',
      ],
      view: { lon: -123.0985, lat: 49.2808, dist: 2600, theta: SOUTH, phi: 0.75 },
      sites: [],
      routes: ['cpr-main'],
      // lighter edges than the map's ink, so the red hotels read among so many buildings
      edges: { width: 0.55, colour: '#7a7a7a' },
      // the shore of about 1900, and the waterfront filled and built out by 1912
      land: '1900',
      models: [],
      growth: { from: 1900, to: 1914, ms: 12000, buildings: hotelsRise, landAt: [[1912, '1912']] },
      context: {
        lines: [],
        names: [],
        streets,
        note: `The red buildings are today's SRO hotels. Each rises in the year the City's property records give for it, which is usually, but not always, the year it was built; a few are the year of a later rebuilding. Only hotels that still stand and are SROs today are picked out: hotels of the same years that have since been demolished are among the white buildings or missing, so the boom was larger than this. Rooms are today's counts from the 2024 SRO Tenant Survey. The white buildings are Goad's 1912 atlas, each rising in the year the City's property records give for its lot where the building still stands. Most have gone and their year is not recorded: those are given a year at random between 1887 and 1912, so the district fills in gradually; that order is a stand-in, not a record. The shoreline is that of about 1900 (the 1887 shore, with the Canadian Pacific's yard west of Carrall filled by 1898) until the count reaches 1912, when it becomes the one Goad's atlas draws. ${SHORE_1912} The faint lines are the streets as surveyed by 1887.`,
        sourceId: 'cov-property-tax',
      },
      eventId: 'hotel-construction',
    },
    {
      id: 'travellers',
      kicker: '1900s',
      title: 'Built for travellers',
      text: [
        'Vancouver is the end of the line: passengers come off the Canadian Pacific\'s trains and the steamships from Asia. Hundreds of hotels and rooming houses go up within walking distance of the piers to put them up.',
        'The cheapest rooms are further east. In the years that follow, it is loggers, miners and seamen, working away and coming back between jobs, who make them home.',
      ],
      // framed from the station and pier in the west to the hotels east of Main
      view: { lon: -123.1065, lat: 49.2852, dist: 2300, theta: SOUTH, phi: 0.8 },
      // the station and the pier named on stems; the terminals dark, the hotels in a red that pales eastward
      sites: ['cpr-station', 'cpr-pier'],
      // the ways in, drawn as the card arrives: the trains along the line, the ships up the inlet
      routes: ['cpr-main', 'train-in', 'steamer-in'],
      // and, once the ways are drawn, a train comes in along the line and a ship up the inlet
      arrivals: [
        { model: 'passenger-train-1910', route: 'train-in', ms: 9000, scale: 2.6 },
        { model: 'steamship-1910', route: 'steamer-in', ms: 11000, scale: 1.6 },
      ],
      land: '1912',
      edges: { width: 0.55, colour: '#7a7a7a' },
      models: [],
      growth: { from: 1912, to: 1912, buildings: travellersRise },
      context: {
        lines: [],
        names: [],
        streets,
        streetStyle: { width: 0.8, colour: '#8c8c8c', opacity: 0.8 },
        note: `The dark buildings are the Canadian Pacific's station at the head of Granville Street and the freight sheds on its pier and along the waterfront, as Goad's 1912 atlas draws them; the sheds stand on piles over the water. The red buildings are today's SRO hotels, in a red that pales with distance from the station: a stand-in for price, on the claim that the cheapest rooms were further east, since no room rates from the time are in the data. The hotels stand at their real heights, from LiDAR. The white buildings are the rest of the 1912 atlas at assumed heights, 11 m for brick and 7 m for wood, about three and two storeys; the atlas's storey counts have not been read. ${SHORE_1912} The lines are the streets as surveyed by 1887.`,
        sourceId: 'tyee-paulsen-2007',
      },
      sourceId: 'tyee-paulsen-2007',
    },
    {
      id: 'interurban',
      kicker: '1911',
      title: 'The interurban terminal',
      text: [
        'At Carrall and Hastings the BC Electric Railway Company builds its terminal, six storeys, and runs the country\'s most extensive interurban system from it: trains to New Westminster by way of Central Park and Burnaby Lake.',
        'Hastings and Carrall is the crossroads of the city.',
      ],
      view: { lon: -123.1046, lat: 49.2813, dist: 500, theta: SOUTH, phi: 0.8 },
      // the terminal in red, named on a stem; the rest of the atlas in white, no hotels picked out
      sites: ['bcer'],
      context: {
        lines: [],
        names: [],
        streets,
        streetStyle: { width: 0.8, colour: '#8c8c8c', opacity: 0.8 },
        note: `The terminal is the brick building at the junction of Hastings and Carrall in Goad's 1912 atlas, marked as the BC Electric Railway Company's offices, raised to the six storeys the heritage register gives it. The track is drawn along Hastings to the east edge of the map; where the interurban left Hastings for Westminster Road is not traced. The white buildings are the rest of the atlas at assumed heights, 11 m brick and 7 m wood. Where the atlas draws brick buildings sharing walls, the colour reading joins them into one block. ${SHORE_1912} The lines are the streets as surveyed by 1887.`,
        sourceId: 'goad-1912-georectified',
      },
      land: '1912',
      edges: { width: 0.55, colour: '#7a7a7a' },
      models: [['bcer', 'bcer-1912', '#8e4233'], ['carnegie', 'carnegie-1903'], ['woodwards', 'woodwards-1903']],
      growth: { from: 1912, to: 1912, buildings: districtTo(1912, (b) => b.kind === 'brick' && b.i === bcerIndex) },
      routes: ['cpr-main', 'bcer-track'],
      eventId: 'interurban-terminal',
    },
    {
      id: 'bust',
      kicker: '1913 to 1945',
      title: 'The boom ends',
      text: [
        'In 1913 the economy turns down, the real estate bubble bursts and banks fail. Then the war comes. Building stops.',
        'Only six more of today\'s SRO hotels go up in the next thirty years. The rooms built before 1914 are the stock the rest of this story draws down.',
      ],
      view: { lon: -123.0985, lat: 49.2808, dist: 2600, theta: SOUTH, phi: 0.75 },
      sites: [],
      routes: ['cpr-main'],
      land: '1912',
      // the six hotels that still go up, in red; the district in lighter lines
      edges: { width: 0.55, colour: '#7a7a7a' },
      models: [],
      growth: {
        from: 1914,
        to: 1945,
        ms: 8000,
        buildings: bustRise,
        landAt: [[1917, '1917']],
        // the yards and roads on the flats, once they are filled
        linesAt: [[1917, [{ lines: flats1917.streets as number[][][], width: 0.8, colour: '#8c8c8c', opacity: 0.8 }, { lines: flats1917.rail as number[][][], width: 1.0, colour: '#2b2b2b', opacity: 0.9 }]]],
      },
      context: {
        lines: [],
        names: [],
        streets,
        streetStyle: { width: 0.8, colour: '#8c8c8c', opacity: 0.8 },
        note: `The count runs on to 1945 to show how little was added. When the boom ended is given as 1912 by some accounts and 1913 by others; both are popular histories not yet checked against a scholarly one. The red buildings are the six of today's SRO hotels built after 1913, each rising in the year the City's property records give it; the white ones are the rest of the 1912 atlas and the hotels already standing, at assumed heights of 11 m brick and 7 m wood except the hotels, which stand at their LiDAR heights. ${SHORE_1912} At 1917 the count fills the False Creek flats east of Main, filled from 1915 to 1917 for the Great Northern and Canadian Northern terminals by the City's account; the outline is today's. The railways and roads that then appear on the flats are today's centrelines, kept where they lie on the fill: the railways are the successors of the two terminals' yards, the roads a later stand-in for whatever the yards were laid out with. Later fills along Burrard Inlet are not drawn. The lines elsewhere are the streets as surveyed by 1887.`,
        sourceId: 'onthisspot-real-estate',
      },
      sourceId: 'onthisspot-real-estate',
    },
  ],
}

// Archival photographs for each card, kept in chapterTwoPhotos.ts.
for (const stop of chapterTwo.stops) stop.photos ??= chapterTwoPhotos[stop.id]
