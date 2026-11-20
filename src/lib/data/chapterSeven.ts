/**
 * Chapter 7 told on the map: speculation and loss, 2003 to the present.
 *
 * The city is drawn as in chapters 5 and 6, from today's footprints dated by the City's property records
 * (src/lib/data/builtBy2025.json), with the Woodward's redevelopment from the City's 2009 roof parts once
 * it is built. Three hotels this chapter is about are not in the 2024 survey's list of SRO buildings,
 * because they have since closed or burned: the Balmoral, the Regent and the Winters. Their footprints
 * are picked by address (scripts/build-landmarks.py) and added here.
 */
import { type GrowthBuilding, type MapChapter } from './stops'
import { inRing } from './district1912'
import landmarks from './landmarks.json'
import { BRIDGES86, CITY, DARK, GUIDEWAY, RED, SHORE, SOUTH, corner, edges, hotels, lateCity, landmark, rail, skytrainIds, streetFill, streetStyle, streets } from './chapterFive'
import { redevelopment } from './chapterSix'

const { standingBy, backdrop } = lateCity
const EMPTY = '#cfcfcf'
type Ring = [number, number][]
const picked = (key: 'balmoral' | 'regent' | 'winters' | 'orange-hall' | 'molsons-bank', fill?: string): GrowthBuilding => {
  const l = landmarks[key]
  return { name: l.name, built: 1900, fill, lon: l.lon, lat: l.lat, parts: l.parts.map((p) => ({ kind: 'prism' as const, x: 0, y: 0, ring: p.ring as Ring, h: p.h })) }
}
const pickedRings = (['balmoral', 'regent', 'winters', 'orange-hall', 'molsons-bank'] as const).flatMap((k) => landmarks[k].parts.map((p) => p.ring as Ring))
// the store's block north of Hastings, Abbott to Cambie: once rebuilt, the redevelopment's parts stand in for today's footprints there
const woodwardsBlock: Ring = [[-123.1072, 49.28199], [-123.10955, 49.28251], [-123.10914, 49.28345], [-123.10679, 49.28293]]
const centre = (b: { lon: number; lat: number }) => b

// The ten buildings the Province bought in 2007, by their addresses in the 2024 survey's list; the Orange
// Hall and the Molson's Bank building are not in that list under those addresses and are picked by address.
const BOUGHT = /518 Richards|1161 Granville|375 Princess|404 Hawks|429 W Pender|261 \/ 265 E Hastings|456 E Hastings|258 E Hastings/
// the survey's entry at 160 East Hastings is the Regent's building; it is drawn from its picked footprint instead
const listed = hotels.filter((h) => !/^160 E Hastings/.test((h as unknown as { addr: string }).addr))
const wasBought = (h: (typeof hotels)[number]) => BOUGHT.test((h as unknown as { addr: string }).addr)

type Opts = { bought?: boolean; store?: boolean; balmoralRegent?: string | null; winters?: string | null; hotels?: string }
/** The city of a year, with the chapter's own buildings in the state the card needs. */
const city = (year: number, o: Opts = {}): GrowthBuilding[] => [
  ...standingBy(year).filter((b) => !pickedRings.some((r) => inRing(centre(b).lon, centre(b).lat, r)) && !(year >= 2010 && (b.built ?? 0) >= 2004 && inRing(b.lon, b.lat, woodwardsBlock))),
  ...landmark('carnegie-1903'),
  ...landmark('bcer-1912'),
  ...(o.store ? landmark('woodwards-1903') : []),
  ...(year >= 2010 ? redevelopment : []),
  // a building with no year in the records is drawn where a source places it in these years (the Carl Rooms, bought in 2007)
  ...listed.filter((h) => (h.built ?? (wasBought(h) ? 0 : 9999)) <= year).map((h) => ({ ...h, fill: o.bought && wasBought(h) ? DARK : (o.hotels ?? RED) })),
  picked('orange-hall', o.bought ? DARK : RED),
  picked('molsons-bank', o.bought ? DARK : RED),
  ...(o.balmoralRegent === null ? [] : [picked('balmoral', o.balmoralRegent ?? RED), picked('regent', o.balmoralRegent ?? RED)]),
  ...(o.winters === null ? [] : [picked('winters', o.winters ?? RED)]),
]

const models: [string, string][] = [
  ['expo-grounds', 'science-world-1986'],
  ['expo-grounds', 'bc-place-1986'],
  ['canada-pavilion', 'canada-place-1986'],
  ['viaducts', 'viaducts-1972'],
  ['guideway', 'skytrain-1985'],
]
const PICKED = `The Balmoral, the Regent and the Winters are not in the 2024 survey's list of SRO buildings, having closed or burned; each is the footprint nearest its address's place along its block, at its LiDAR height, not confirmed against a plan.`
const MAP = `${CITY} BC Place is still drawn with the dome it lost in 2010. ${PICKED} ${GUIDEWAY} ${BRIDGES86} ${SHORE}`
const context = (note: string, sourceId: string, more: object = {}) => ({ lines: rail, names: [], streets, streetFill, streetStyle, note: `${note} ${MAP}`, sourceId, ...more })
const base = { routes: ['cpr-main-5', ...skytrainIds], land: 'today' as const, bridges: true, edges, models }

const balmoral = landmarks.balmoral
const regent = landmarks.regent
const winters = landmarks.winters
// East Hastings between Main and Gore, where the encampment's last blocks were cleared
const goreHastings: [number, number] = [-123.09747, 49.28129]
const columbiaHastings: [number, number] = [-123.10226, 49.28138]
const along = (a: [number, number], b: [number, number], n: number) => Array.from({ length: n }, (_, i) => ({ lon: a[0] + ((b[0] - a[0]) * (i + 0.5)) / n, lat: a[1] + ((b[1] - a[1]) * (i + 0.5)) / n, weight: 1 }))

export const chapterSeven: MapChapter = {
  chapterId: 'speculation-and-loss',
  title: 'Speculation and loss',
  bare: true,
  oldShoreline: true,
  sites: [
    { id: 'woodwards-rebuilt', label: "Woodward's, rebuilt 2010", stem: 30, lon: -123.10816, lat: 49.28293, located: true, basis: "The taller tower of the redevelopment, at Abbott and Cordova streets, from the City's 2009 footprints." },
    { id: 'overdose', label: 'Overdose emergency, 2016', ring: 420, lon: corner.mainHastings[0] - 0.0012, lat: corner.mainHastings[1] + 0.0004, located: false, basis: 'A ring over the blocks around Main and Hastings, not a boundary: the emergency was declared for the whole province.' },
    { id: 'balmoral', label: 'Balmoral Hotel', stem: 26, lon: balmoral.lon, lat: balmoral.lat, located: true, basis: 'The Balmoral, 159 East Hastings: the footprint nearest that address along the north side of the block.' },
    { id: 'regent', label: 'Regent Hotel', stem: 14, lon: regent.lon, lat: regent.lat, located: true, basis: 'The Regent, 160 East Hastings: the footprint at that address on the south side of the block.' },
    { id: 'winters', label: 'Winters Hotel, 203 Abbott', stem: 20, lon: winters.lon, lat: winters.lat, located: true, basis: 'The Winters Hotel, 203 Abbott Street at Water Street: the footprint on the east side of Abbott at the Water Street end of the block, picked by address.' },
    { id: 'encampment', label: 'East Hastings encampment', stem: 12, lon: (corner.mainHastings[0] + goreHastings[0]) / 2, lat: corner.mainHastings[1] + 0.0001, located: true, basis: 'East Hastings Street between Main Street and Gore Avenue, the block police closed off on the second day of the removal.' },
  ],
  routes: [],
  stops: [
    {
      id: 'province-buys',
      kicker: '2007',
      title: 'The Province buys hotels',
      text: [
        'Hotels are being sold and emptied as land prices rise. In early 2007 the Province buys ten buildings, nine SRO hotels and one apartment building, 595 units in all, to keep them as housing.',
        'By 2011 BC Housing has bought and renovated 13 hotels with about 900 rooms.',
      ],
      view: { lon: -123.1000, lat: 49.2816, dist: 2100, theta: SOUTH, phi: 0.77 },
      sites: [],
      ...base,
      faint: backdrop(2007),
      stat: { value: '595', label: 'units in the ten buildings bought in 2007', after: 3500 },
      growth: { from: 2007, to: 2007, buildings: city(2007, { bought: true, store: false }) },
      context: context(
        `The dark buildings are the ten the Province bought in 2007, as BC Housing listed them then: the Marble Arch, the St. Helen's, the Carl Rooms, the Rice Block, the Molson's Bank building, the Park Hotel, the Walton, the Orange Hall, the Orwell and the Savoy. Eight are found in the 2024 survey's list by their addresses; the Orange Hall (329 to 341 Gore) and the Molson's Bank building (166 East Hastings) are picked by address from the footprints and not confirmed. The list is read from a bulletin of the mayor's of April 2007 that reprints BC Housing's table; the City's 2007 report gives the same totals. That hotels were being sold and emptied as prices rose is the chapter's summary, not a count. The other SRO hotels of today's list standing by 2007 are red. Woodward's block is empty: the store was demolished in 2006.`,
        'sullivan-bulletin-2007',
      ),
      eventId: 'province-buys-hotels',
    },
    {
      id: 'woodwards-rebuilt',
      kicker: '2006 to 2010',
      title: "Woodward's rebuilt",
      text: [
        'Eighteen months after buying the building, the City picks a developer for the block. The store is demolished in 2006, and in 2010 the block reopens as a mix: market condominiums, shops, a university arts school and social housing, with the old "W" kept above it.',
        'The squatters had demanded that all of it be social housing. About a fifth of it is.',
      ],
      view: { lon: -123.1082, lat: 49.2824, dist: 760, theta: SOUTH, phi: 0.72 },
      sites: ['woodwards-rebuilt'],
      ...base,
      faint: backdrop(2009),
      growth: { from: 2010, to: 2010, buildings: city(2009) },
      // the store stands dark, comes down, and the redevelopment rises in its place
      clear: { old: landmark('woodwards-1903'), then: redevelopment, fill: DARK, at: 3000, ms: 2600 },
      stat: { value: '≈ 20%', label: 'of the block is social housing; the squat demanded 100%', after: 9500 },
      context: context(
        `The dark store that comes down is Woodward's as Goad's 1912 atlas draws it, at an assumed 20 m. What rises is the redevelopment from the roof parts of the City's 2009 footprints at their LiDAR heights, surveyed a year before it opened: the two towers, about 120 m and 96 m, and the lower buildings along Hastings. The oldest corner of the store was kept and built into it; which part that is is not marked in the data, and the "W" on its tower is not modelled. The dates, the developer's selection and the share of social housing are as CBC News gave them in 2022.`,
        'cbc-woodsquat-2022',
      ),
      eventId: 'olympics-woodwards',
    },
    {
      id: 'dtes-plan',
      kicker: 'March 2014',
      title: 'The Downtown Eastside Plan',
      text: [
        'Council adopts the Downtown Eastside Plan in March 2014. It calls for replacing 4,500 SRO rooms with self-contained units over thirty years.',
        'Until they are replaced, the rooms are still the housing.',
      ],
      view: { lon: -123.1000, lat: 49.2816, dist: 2000, theta: SOUTH, phi: 0.77 },
      sites: [],
      ...base,
      faint: backdrop(2014),
      highlight: { from: corner.mainHastings, ms: 7000 },
      stat: { value: '4,500', label: 'SRO rooms to be replaced over thirty years', after: 8000 },
      growth: { from: 2014, to: 2014, buildings: city(2014) },
      context: context(
        `The plan's boundary and sub-areas are not drawn: they are not yet read into the project. Today's SRO buildings standing by 2014 turn red outward from Main and Hastings; they are not a list of the 4,500 rooms, which the plan counts across the stock.`,
        'cov-report-2016',
      ),
      eventId: 'dtes-plan',
    },
    {
      id: 'overdose-emergency',
      kicker: 'April 2016',
      title: 'A second emergency',
      text: [
        'A toxic drug supply is killing people across the province. In April 2016 the provincial health officer and the health minister declare a public health emergency over opioid overdoses.',
        'It is the second public health emergency in twenty years to fall hardest on these blocks.',
      ],
      view: { lon: -123.1000, lat: 49.2814, dist: 1500, theta: SOUTH, phi: 0.78 },
      sites: ['overdose'],
      ...base,
      faint: backdrop(2016),
      growth: { from: 2016, to: 2016, buildings: city(2016) },
      context: context(
        `The ring is a label over the blocks around Main and Hastings, not a boundary: the emergency was declared for all of British Columbia. That it fell hardest on these blocks is the chapter's reading, after the health emergency of 1997; no figure for the neighbourhood is given here, and the hotels are red as where the rooms are, not as a map of deaths.`,
        'bc-gov-overdose-2016',
      ),
      eventId: 'overdose-emergency',
    },
    {
      id: 'balmoral-regent',
      kicker: '2017 to 2020',
      title: 'The Balmoral and the Regent',
      text: [
        'Two of the largest hotels on Hastings have been let fall apart by their owners. The City orders the Balmoral and the Regent closed as unsafe, and more than 300 tenants are displaced.',
        'In 2020 the City expropriates both buildings.',
      ],
      view: { lon: -123.1008, lat: 49.2814, dist: 760, theta: SOUTH, phi: 0.7 },
      sites: ['balmoral', 'regent'],
      ...base,
      faint: backdrop(2018),
      growth: { from: 2018, to: 2018, buildings: city(2018, { balmoralRegent: DARK }) },
      scatter: { from: [{ lon: balmoral.lon, lat: balmoral.lat, weight: 1 }, { lon: regent.lon, lat: regent.lat, weight: 1 }], count: 60, away: [-123.1008, 49.2814], reach: [250, 700], ms: 9000, delay: 2200 },
      stat: { value: '300+', label: 'tenants displaced from the two hotels', after: 3000 },
      context: context(
        `The two dark buildings are the Balmoral (159 East Hastings) and the Regent (160 East Hastings). Each grey dot leaving stands for about five of the more than 300 tenants; where they went is not recorded here. The City's reports disagree on the years of the closures: one page gives 2017 and 2018, another 2018 and 2019. That the owners let the buildings fall apart is the City's account in ordering them closed.`,
        'cov-report-2020',
      ),
      eventId: 'balmoral-regent',
    },
    {
      id: 'winters-fire',
      kicker: '11 April 2022',
      title: 'The Winters Hotel fire',
      text: [
        'On 11 April 2022 fire guts the Winters Hotel, a four-storey SRO in Gastown. More than 70 residents lose their homes and everything in them.',
        'The City has the building pulled down within days. During the demolition two bodies are found in the ruins.',
      ],
      view: { lon: -123.1064, lat: 49.2834, dist: 620, theta: SOUTH, phi: 0.68 },
      sites: ['winters'],
      ...base,
      faint: backdrop(2022),
      growth: { from: 2022, to: 2022, buildings: city(2022, { balmoralRegent: EMPTY, winters: null }) },
      // the hotel stands dark, the charcoal spreads over it, and it comes down
      clear: { old: [picked('winters')], then: [], fill: DARK, at: 5200, ms: 2400 },
      stat: { value: '70+', label: 'residents lost their homes; two people died', after: 8500 },
      context: context(
        `The dark building is the Winters Hotel at 203 Abbott Street, picked by address; the charcoal is the fire, and the building comes down as it was demolished that month. The account is from CBC News's reporting of April 2022, read in summary: the date, the residents displaced, the demolition, and the two bodies found on 22 April. The Balmoral and the Regent, closed, are grey.`,
        'cbc-winters-2022',
        { burnArea: winters.parts[0].ring as Ring, burnFrom: [winters.lon, winters.lat] as [number, number] },
      ),
      eventId: 'winters-fire',
    },
    {
      id: 'decampment',
      kicker: '5 and 6 April 2023',
      title: 'The tents on Hastings',
      text: [
        'With rooms closed, burned and too dear, people are living in tents along East Hastings. At its peak the encampment has 180 structures.',
        'On 5 and 6 April 2023 City crews and police remove it, taking down 94 structures. Shelters say they are overwhelmed.',
      ],
      view: { lon: -123.0996, lat: 49.2815, dist: 1000, theta: SOUTH, phi: 0.62 },
      sites: ['encampment'],
      ...base,
      faint: backdrop(2023),
      growth: { from: 2023, to: 2023, buildings: city(2023, { balmoralRegent: EMPTY, winters: null }) },
      scatter: { from: along(columbiaHastings, goreHastings, 24), count: 94, away: [-123.0999, 49.2813], reach: [300, 900], ms: 10000, delay: 2500 },
      stat: { value: '94', label: 'structures taken down on 5 and 6 April 2023', after: 3500 },
      context: context(
        `Each grey dot is one of the 94 structures the City says its crews took down, leaving East Hastings between Columbia Street and Gore Avenue; their places along the street and where the people went are illustrative. The figures (180 structures at the peak, 94 removed) are the City's, as CBC News reported them, read in summary; the City and police gave falling assaults and fires as their reasons, and residents and advocates said the removal did more harm than good. That people were in tents because rooms were closed, burned or too dear is the chapter's argument, not the sources' wording. The Winters Hotel's site is empty; the Balmoral and the Regent, closed, are grey.`,
        'cbc-decampment-2023',
      ),
      eventId: 'hastings-decampment',
    },
  ],
}
