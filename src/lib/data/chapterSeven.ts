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
import { hotelStories } from './hotelStories'
import { inRing } from './district1912'
import landmarks from './landmarks.json'
import { BRIDGES86, CITY, DARK, GUIDEWAY, RED, SHORE, SOUTH, corner, edges, hotels, lateCity, landmark, rail, skytrainIds, streetFill, streetStyle, streets } from './chapterFive'
import { redevelopment, woodwardsKept, woodwardsNew } from './chapterSix'
import { chapterSevenPhotos } from './chapterSevenPhotos'

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
const BOUGHT = /518 Richards|1161 Granville|375 Princess|404 Hawks|166 E Hastings|429 W Pender|261 \/ 265 E Hastings|456 E Hastings|258 E Hastings/
// the Regent (160 East Hastings) and the Balmoral are not on the 2024 list; they are drawn from footprints picked by address
const listed = hotels
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
  ...(o.balmoralRegent === null ? [] : [picked('balmoral', o.balmoralRegent ?? RED), picked('regent', o.balmoralRegent ?? RED)]),
  ...(o.winters === null ? [] : [picked('winters', o.winters ?? RED)]),
]

const models: [string, string, string?][] = [
  ['expo-grounds', 'science-world-1986'],
  ['expo-grounds', 'bc-place-1986'],
  ['canada-pavilion', 'canada-place-1986'],
  ['viaducts', 'viaducts-1972'],
  ['guideway', 'skytrain-1985'],
  ['woodwards-w', 'woodwards-w-tower'],
  ['woodwards-w', 'woodwards-w', RED],
]
const PICKED = `The Balmoral, the Regent and the Winters are not in the 2024 survey's list of SRO buildings, having closed or burned; each is the footprint nearest its address's place along its block, at its LiDAR height, not confirmed against a plan.`
const MAP = `${CITY} BC Place is still drawn with the dome it lost in 2010. ${PICKED} ${GUIDEWAY} ${BRIDGES86} ${SHORE}`
const context = (note: string, sourceId: string, more: object = {}) => ({ lines: rail, names: [], streets, streetFill, streetStyle, note: `${note} ${MAP}`, sourceId, ...more })
const base = { routes: ['cpr-main-5', ...skytrainIds], railLaid: true, land: 'today' as const, bridges: true, edges, models }

const balmoral = landmarks.balmoral
const regent = landmarks.regent
const winters = landmarks.winters
// East Hastings between Main and Gore, where the encampment's last blocks were cleared
const columbiaHastings: [number, number] = [-123.10226, 49.28138]
const along = (a: [number, number], b: [number, number], n: number) => Array.from({ length: n }, (_, i) => ({ lon: a[0] + ((b[0] - a[0]) * (i + 0.5)) / n, lat: a[1] + ((b[1] - a[1]) * (i + 0.5)) / n, weight: 1 }))

export const chapterSeven: MapChapter = {
  chapterId: 'speculation-and-loss',
  title: 'Speculation and loss',
  bare: true,
  oldShoreline: true,
  sites: [
    { id: 'woodwards-rebuilt', label: "Woodward's, rebuilt 2010", stem: 128, lon: -123.10816, lat: 49.28293, located: true, basis: "The taller tower of the redevelopment, at Abbott and Cordova streets, from the City's 2009 footprints." },
    { id: 'overdose', label: 'Overdose emergency, 2016', ring: 420, lon: corner.mainHastings[0] - 0.0012, lat: corner.mainHastings[1] + 0.0004, located: false, basis: 'A ring over the blocks around Main and Hastings, not a boundary: the emergency was declared for the whole province.' },
    { id: 'balmoral', label: 'Balmoral Hotel', stem: 26, lon: balmoral.lon, lat: balmoral.lat, located: true, basis: 'The Balmoral, 159 East Hastings: the footprint nearest that address along the north side of the block.' },
    { id: 'regent', label: 'Regent Hotel', stem: 14, lon: regent.lon, lat: regent.lat, located: true, basis: 'The Regent, 160 East Hastings: the footprint at that address on the south side of the block.' },
    { id: 'winters', label: 'Winters Hotel, 203 Abbott', stem: 20, lon: winters.lon, lat: winters.lat, located: true, basis: 'The Winters Hotel, 203 Abbott Street at Water Street: the footprint on the east side of Abbott at the Water Street end of the block, picked by address.' },
    { id: 'encampment', label: 'East Hastings encampment', stem: 12, lon: (corner.mainHastings[0] + columbiaHastings[0]) / 2, lat: corner.mainHastings[1] + 0.0001, located: true, basis: 'East Hastings Street between Columbia and Main streets, the block cleared on the first day of the removal by Global News\'s account.' },
  ],
  routes: [],
  stops: [
    {
      id: 'province-buys',
      sideStories: hotelStories['province-buys'],
      kicker: '2007',
      title: 'The Province buys hotels',
      text: [
        'Hotels are being sold and emptied as land prices rise. In early 2007 the Province buys ten SRO hotels, 595 rooms in all, to keep them as housing.',
        `By the Province's later count it bought 13 buildings that year; renovated, they hold about 855 units of supportive housing.`,
      ],
      view: { lon: -123.1000, lat: 49.2816, dist: 2100, theta: SOUTH, phi: 0.77 },
      sites: [],
      ...base,
      faint: backdrop(2007),
      stat: { value: '595', label: 'rooms in the ten hotels bought in 2007', after: 3500 },
      growth: { from: 2007, to: 2007, buildings: city(2007, { bought: true, store: false }) },
      context: context(
        `Checked 20 November 2026: the mayor's bulletin gives 595 rooms in ten SRO hotels, and the card now says so (an earlier version called one of the ten an apartment building). The 13 buildings and about 855 units are from the Province's release of 24 March 2017 on the end of the renovations (news.gov.bc.ca/releases/2017MNGD0050-000837); an earlier version gave 13 hotels and about 900 rooms by 2011, which was not found on a page read. The two counts, ten and 13, are each source's own. The dark buildings are the ten the Province bought in 2007, as BC Housing listed them then: the Marble Arch, the St. Helen's, the Carl Rooms, the Rice Block, the Molson's Bank building, the Park Hotel, the Walton, the Orange Hall, the Orwell and the Savoy. Eight are found in the 2024 survey's list by their addresses; the Orange Hall (329 to 341 Gore; the heritage register gives 341, four storeys, 1907) is picked by address from the footprints and not confirmed. The Rice Block and the Molson's Bank building (the Roosevelt Hotel) had each other's addresses in the project's list and are corrected here: the Rice Block at 404 Hawks, the Roosevelt at 166 East Hastings. The Carl Rooms is at 335 Princess in the 2007 list and 375 Princess in the 2024 one; they are taken as one building. The list is read from a bulletin of the mayor's of April 2007 that reprints BC Housing's table; the City's 2007 report gives the same totals. That hotels were being sold and emptied as prices rose is the chapter's summary, not a count. The other SRO hotels of today's list standing by 2007 are red. Woodward's block is empty: the store was demolished in 2006.`,
        'sullivan-bulletin-2007',
      ),
      eventId: 'province-buys-hotels',
    },
    {
      id: 'woodwards-rebuilt',
      kicker: '2006 to 2010',
      title: "Woodward's rebuilt",
      text: [
        'Eighteen months after buying the building, the City picks a developer for the block. In 2006 the store is demolished, all but its oldest corner at Hastings and Abbott. In 2010 the block reopens as a mix: two towers of market condominiums, shops, a university arts school and social housing, with a red "W" turning above it again.',
        'The squatters had demanded that all of it be social housing. Of its 736 homes, 200 are: a little over a quarter.',
      ],
      view: { lon: -123.1079, lat: 49.2829, dist: 640, theta: SOUTH - 0.45, phi: 1.08 },
      sites: ['woodwards-rebuilt'],
      ...base,
      faint: backdrop(2009),
      growth: { from: 2010, to: 2010, buildings: [...city(2009).filter((b) => !((b.built ?? 0) >= 2004 && inRing(b.lon, b.lat, woodwardsBlock))), ...woodwardsKept.map((b) => ({ ...b, fill: DARK }))] },   // today's footprints of the new buildings would stand in the way of their rising
      // the store stands dark and comes down around its oldest corner, which stays; the towers, the lower
      // buildings and the W rise in its place
      clear: { old: landmark('woodwards-1903'), then: woodwardsNew, fill: DARK, at: 3000, ms: 3200 },
      stat: { value: '200 of 736', label: 'homes are non-market; the squat demanded all of them', after: 9500 },
      context: context(
        `Checked 20 November 2026: the count of homes is The Tyee's (25 February 2015): 536 market condominiums and 200 below-market units, 125 of them single rooms at the shelter rate and 75 with rent geared to income. An earlier version said about a fifth, CBC's figure, which may be measured differently. The dark store that comes down is Woodward's as Goad's 1912 atlas draws it, at an assumed 20 m. What rises is the redevelopment from the roof parts of the City's 2009 footprints at their LiDAR heights, surveyed a year before it opened: the two towers, about 120 m and 96 m, and the lower buildings along Hastings. The oldest corner of the store, at Hastings and Abbott, was kept and built into it: it is taken to be the building the City's footprints draw on that corner, and stands while the rest comes down. The red "W" is drawn as a type over that corner, a letter of about 5 m on a lattice tower of about 20 m, neither measured, and placed on the corner's roof by judgement; the W there today is understood to be a replica made for the reopening, which the sources read do not confirm. The dates and the developer's selection are as CBC News gave them in 2022.`,
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
        `Checked 20 November 2026: the City's reports refuse automated reading. Summaries of them give 4,500 rooms over thirty years in the 2015 survey and 5,000 in the 2020 report; neither was read. The plan's boundary and sub-areas are not drawn: they are not yet read into the project. Today's SRO buildings standing by 2014 turn red outward from Main and Hastings; they are not a list of the 4,500 rooms, which the plan counts across the stock.`,
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
      sideStories: hotelStories['balmoral-regent'],
      kicker: '2017 to 2020',
      title: 'The Balmoral and the Regent',
      text: [
        'Two of the largest hotels on Hastings have been let fall apart by their owners. In June 2017 the City orders the Balmoral emptied as unsafe, and at the end of June 2018 it shuts the Regent. More than 200 tenants lose their rooms: the City relocates 92 from the Regent, and finds 131 rooms for those ordered out of the Balmoral.',
        'Council votes to expropriate both in November 2019, and the City takes them over in 2020.',
      ],
      view: { lon: -123.1008, lat: 49.2814, dist: 760, theta: SOUTH, phi: 0.7 },
      sites: ['balmoral', 'regent'],
      ...base,
      faint: backdrop(2018),
      growth: { from: 2018, to: 2018, buildings: city(2018, { balmoralRegent: DARK }) },
      scatter: { from: [{ lon: balmoral.lon, lat: balmoral.lat, weight: 1 }, { lon: regent.lon, lat: regent.lat, weight: 1 }], count: 60, away: [-123.1008, 49.2814], reach: [250, 700], ms: 9000, delay: 2200 },
      stat: { value: '200+', label: 'tenants left the two hotels', after: 3000 },
      context: context(
        `Checked 20 November 2026: the figures are the Georgia Straight's (29 June 2018: 92 tenants relocated from the Regent, and more than 200 lower-income tenants gone from the block with both hotels closed) and Global News's (10 June 2017: 131 rooms found for the Balmoral's tenants, with perhaps 30 to 50 more people unaccounted for). An earlier version said about 300, which is on no page read. Global News dates the Balmoral order to 2 June 2017. The two dark buildings are the Balmoral (159 East Hastings) and the Regent (160 East Hastings). Each grey dot leaving stands for about five of the more than 300 tenants; where they went is not recorded here. The dates are from Global News: the Balmoral's tenants were to be out by 12 June 2017, the Regent was shut at the end of June 2018, council voted in November 2019 and a settlement was announced in December 2020 (the City's own 2020 report is inconsistent on the years). The owners were the Sahota family; that they let the buildings fall apart is the City's account in ordering them closed. The Balmoral was demolished by 2024.`,
        'cov-report-2020',
      ),
      eventId: 'balmoral-regent',
    },
    {
      id: 'winters-fire',
      sideStories: hotelStories['winters-fire'],
      kicker: '11 April 2022',
      title: 'The Winters Hotel fire',
      text: [
        `On 11 April 2022 fire guts the Winters Hotel, a four-storey SRO in Gastown. The fire puts 140 people out of the building, which also holds a women's shelter, and sends five to hospital.`,
        'The City has the building pulled down within days. During the demolition the bodies of two residents, Mary Ann Garlow and Dennis Guay, are found in the ruins.',
        'A coroner\'s inquest in 2024 hears that the sprinklers, not reset after a fire three days earlier, never came on.',
      ],
      view: { lon: -123.1064, lat: 49.2834, dist: 620, theta: SOUTH, phi: 0.68 },
      sites: ['winters'],
      ...base,
      faint: backdrop(2022),
      growth: { from: 2022, to: 2022, buildings: city(2022, { balmoralRegent: EMPTY, winters: null }) },
      // the hotel stands dark, the charcoal spreads over it, and it comes down
      clear: { old: [picked('winters')], then: [], fill: DARK, at: 5200, ms: 2400 },
      stat: { value: '140', label: 'people displaced from the building; two died', after: 8500 },
      context: context(
        `Checked 20 November 2026: the card now follows the Global News page cited: 140 people displaced from the building, five in hospital, two dead, and sprinklers that never deployed, not having been reset straight after the earlier fire. An earlier version gave 71 residents, which is not on that page. The dark building is the Winters Hotel at 203 Abbott Street, picked by address; the charcoal is the fire, and the building comes down as it was demolished that month. The account is from Global News's reporting of April 2022 and of the coroner's inquest, whose verdict of 5 February 2024 ruled both deaths accidental: the sprinklers had been ordered reset on 8 April and never deployed. One report gives 71 residents displaced from the Winters; another gives 140, counting the hotel next door. CBC's reporting, first used here, could only be read in summary. The Balmoral and the Regent, closed, are grey.`,
        'global-winters-inquest-2024',
        { burnArea: winters.parts[0].ring as Ring, burnFrom: [winters.lon, winters.lat] as [number, number] },
      ),
      eventId: 'winters-fire',
    },
    {
      id: 'decampment',
      kicker: '5 April 2023',
      title: 'The tents on Hastings',
      text: [
        'With rooms closed, burned and too dear, people are living in tents along East Hastings. More than a hundred tents line the street.',
        `On 5 April 2023 City crews, with police, begin removing the tents and structures still there, about 80 by the City's count, block by block. Shelters say they are overwhelmed.`,
      ],
      view: { lon: -123.0996, lat: 49.2815, dist: 1000, theta: SOUTH, phi: 0.62 },
      sites: ['encampment'],
      ...base,
      faint: backdrop(2023),
      growth: { from: 2023, to: 2023, buildings: city(2023, { balmoralRegent: EMPTY, winters: null }) },
      scatter: { from: along(columbiaHastings, corner.mainHastings, 24), count: 80, away: [-123.0999, 49.2813], reach: [300, 900], ms: 10000, delay: 2500 },
      stat: { value: '≈ 80', label: 'tents and structures left to remove on 5 April 2023', after: 3500 },
      context: context(
        `Checked 20 November 2026: the card now follows the Global News page cited: more than 100 tents, about 80 tents and structures remaining by the City's count on 5 April, removed block by block from Columbia toward Main with police. An earlier version gave 180 structures at the peak, 94 taken down over two days and about a hundred police; none of those is on the page. Each grey dot is one of the 94 structures the City says its crews took down, leaving East Hastings between Columbia and Main streets, the block Global News reports cleared on the first day; the Globe and Mail gives the stretch as Main to Abbott, and the next day police closed Main to Gore. Their places along the street and where the people went are illustrative. The figures (180 structures at the peak, 94 removed) are the City's, as CBC News reported them, read in summary; the City and police gave falling assaults and fires as their reasons, and residents and advocates said the removal did more harm than good. That people were in tents because rooms were closed, burned or too dear is the chapter's argument, not the sources' wording. The Winters Hotel's site is empty; the Balmoral and the Regent, closed, are grey.`,
        'global-decampment-2023',
      ),
      eventId: 'hastings-decampment',
    },
  ],
}

// Photographs for each card, kept in chapterSevenPhotos.ts.
for (const stop of chapterSeven.stops) stop.photos ??= chapterSevenPhotos[stop.id]
