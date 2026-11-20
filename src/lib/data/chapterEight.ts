/**
 * Chapter 8 told on the map: the rooms today.
 *
 * The buildings are those of the 2024 SRO Tenant Survey's Appendix B (public/data/district/sro-buildings.json:
 * 143 buildings, 6,517 rooms), each with its owner type, operator and whether its rooms are rented on the
 * market. 135 of them have a footprint in the project (src/lib/data/sroByYear.json) and are drawn; the
 * figures on the cards are the survey's own totals over all 143. The city around them is today's
 * footprints dated by the property records, as in chapters 5 to 7.
 *
 * Rents are not in the project. Condition is shown by the City's count of open by-law issues per building
 * (src/lib/data/sroIssues.json), a snapshot of one day.
 */
import { type GrowthBuilding, type MapChapter, type Pickable } from './stops'
import sroBuildings from '../../../public/data/district/sro-buildings.json'
import landmarks from './landmarks.json'
import { roomCounts } from './rooms'
import { hotelPhotos } from './hotelPhotos'
import sroIssues from './sroIssues.json'
import { BRIDGES86, CITY, DARK, GUIDEWAY, RED, SHORE, SOUTH, corner, edges, hotels, lateCity, landmark, rail, skytrainIds, streetFill, streetStyle, streets } from './chapterFive'
import { redevelopment } from './chapterSix'
import { inRing } from './district1912'

type Listed = { name: string; rooms: number; tenure: string; ownerType: string; operator: string; note?: string }
const survey = sroBuildings.buildings as unknown as Listed[]
const byName = new Map(survey.map((b) => [b.name, b]))
const sum = (list: Listed[]) => list.reduce((a, b) => a + (b.rooms || 0), 0)
const fmt = (n: number) => n.toLocaleString('en-CA')
// buildings the survey found closed (for renovation, after fire, or turned to other uses): still on its list, drawn pale
const isClosed = (b: Listed | undefined) => !!b?.note && /closed/i.test(b.note)
const shut = survey.filter(isClosed)
const owned = (o: string) => survey.filter((b) => b.ownerType === o)
const rented = (t: string) => survey.filter((b) => b.tenure === t)

const MID = '#8c8c8c'
const PALE = '#e3d9d5'
const EMPTY = '#cfcfcf'
type Ring = [number, number][]
// the Regent, shut since 2018 and being rebuilt; the Balmoral was demolished by 2024 and is not drawn
const closed = (['regent'] as const).map((k): GrowthBuilding => {
  const l = landmarks[k]
  return { name: l.name, built: 1900, fill: EMPTY, lon: l.lon, lat: l.lat, parts: l.parts.map((p) => ({ kind: 'prism' as const, x: 0, y: 0, ring: p.ring as Ring, h: p.h })) }
})
const closedRings = (['balmoral', 'regent', 'winters'] as const).flatMap((k) => landmarks[k].parts.map((p) => p.ring as Ring))
const woodwardsBlock: Ring = [[-123.1072, 49.28199], [-123.10955, 49.28251], [-123.10914, 49.28345], [-123.10679, 49.28293]]
const listed = hotels
const around = lateCity
  .standingBy(2025)
  .filter((b) => !closedRings.some((r) => inRing(b.lon, b.lat, r)) && !((b.built ?? 0) >= 2004 && inRing(b.lon, b.lat, woodwardsBlock)))

/** Today's city, with each SRO building coloured by what the card is about. */
const city = (fill: (b: Listed | undefined, h: (typeof hotels)[number]) => string | undefined): GrowthBuilding[] => [
  ...around,
  ...landmark('carnegie-1903'),
  ...landmark('bcer-1912'),
  ...redevelopment,
  ...closed,
  ...listed.map((h) => ({ ...h, fill: isClosed(byName.get(h.name)) ? EMPTY : fill(byName.get(h.name), h) })),
]

const models: [string, string][] = [
  ['expo-grounds', 'science-world-1986'],
  ['expo-grounds', 'bc-place-1986'],
  ['canada-pavilion', 'canada-place-1986'],
  ['viaducts', 'viaducts-1972'],
  ['guideway', 'skytrain-1985'],
]
const LIST = `The buildings are those of the 2024 SRO Tenant Survey's list (Appendix B), transcribed from the report: 143 buildings and ${fmt(sum(survey))} rooms. ${listed.length} of them have a footprint in the project and are drawn; the figures are the survey's totals over all 143. The Regent, closed since 2018, is pale grey, and the Balmoral, demolished by 2024, is gone; pale grey too are the ${shut.length} buildings on the list that the survey found closed (${shut.map((b) => b.name.replace(/\w\S*/g, (w) => w[0] + w.slice(1).toLowerCase())).join(', ')}): their ${fmt(sum(shut))} rooms are still in the survey's totals. Three more are on the list as designated under the by-law but not run as SROs. BC Place is still drawn with the dome it lost in 2010.`
const MAP = `${LIST} ${CITY} ${GUIDEWAY} ${BRIDGES86} ${SHORE}`
const context = (note: string, sourceId: string) => ({ lines: rail, names: [], streets, streetFill, streetStyle, note: `${note} ${MAP}`, sourceId })
const base = { routes: ['cpr-main-5', ...skytrainIds], land: 'today' as const, bridges: true, edges, models, sites: [] as string[], faint: lateCity.backdrop(2025) }
const wide = { lon: -123.1010, lat: 49.2818, dist: 2300, theta: SOUTH, phi: 0.72 }

// unresolved by-law issues on file at each building, from the City's open data on the day it was read
const openIssues = sroIssues.issues as Record<string, { open: number; units: number }>
const withIssues = listed.filter((h) => openIssues[h.name])
const issuesTotal = withIssues.reduce((a, h) => a + openIssues[h.name].open, 0)
const worst = [...withIssues].sort((a, b) => openIssues[b.name].open - openIssues[a.name].open)[0]
const PALE_RED = '#d9b3ab'
const MID_RED = '#b3766a'
const issuesDate = new Date(`${sroIssues.retrieved}T12:00:00`).toLocaleDateString('en-CA', { day: 'numeric', month: 'long', year: 'numeric' })

const core = (year: number) => roomCounts.find((r) => r.series === 'core-private' && r.year === year)!.rooms
const byBoom = listed.filter((h) => h.built != null && h.built <= 1914).length
const dated = listed.filter((h) => h.built != null).length

// The hotels of the boom, each to be chosen on the map: what the survey and the property records say of it.
const ownerOf = (b: Listed) => (b.ownerType === 'Chinese Society' ? 'A Chinese benevolent society' : b.ownerType === 'Private' ? 'Private' : b.ownerType)
const boomHotels: Pickable[] = listed
  .filter((h) => h.built != null && h.built <= 1914)
  .map((h) => {
    const b = byName.get(h.name)
    const parts = h.parts.filter((p) => p.kind === 'prism').map((p) => ({ ring: p.ring as Ring, h: p.h }))
    const tall = Math.max(...parts.map((p) => p.h))
    return {
      name: h.name.replace(/\w\S*/g, (w) => w[0] + w.slice(1).toLowerCase()),
      lon: h.lon,
      lat: h.lat,
      parts,
      photo: hotelPhotos[h.name],
      facts: [
        { label: 'Address', value: (h as unknown as { addr: string }).addr },
        { label: 'Built', value: `${h.built}, by the lot's property record` },
        { label: 'Rooms', value: `${b?.rooms ?? h.rooms} in 2024` },
        ...(b ? [{ label: 'Owner', value: ownerOf(b) }, { label: 'Run by', value: b.operator === 'Chinese Society' ? 'A Chinese benevolent society' : b.operator }, { label: 'Rooms are', value: b.tenure === 'market' ? 'rented on the market' : b.tenure === 'nonmarket' ? 'non-market housing' : 'not surveyed' }] : []),
        { label: 'Height', value: `about ${Math.round(tall)} m, from the 2009 LiDAR` },
      ],
      note: "The building is today's footprint raised to its measured height. Its floors and windows are drawn by rule from that height, as a type: they are not the building's own storeys, bays or openings, and its street front is not yet recorded.",
    }
  })

export const chapterEight: MapChapter = {
  chapterId: 'rooms-today',
  title: 'The rooms today',
  bare: true,
  oldShoreline: true,
  sites: [],
  routes: [],
  stops: [
    {
      id: 'rooms-today',
      kicker: '2024',
      title: 'The rooms today',
      text: [
        `This is what remains. The 2024 SRO Tenant Survey lists 143 buildings and ${fmt(sum(survey))} rooms: single rooms, most with a shared bathroom down the hall.`,
        'They are still the last housing before the street.',
      ],
      view: wide,
      ...base,
      highlight: { from: corner.mainHastings, ms: 7000 },
      stat: { value: fmt(sum(survey)), label: 'rooms in 143 buildings, 2024', after: 8000 },
      growth: { from: 2025, to: 2025, buildings: city(() => RED) },
      context: context(`Every building on the survey's list turns red outward from Main and Hastings. That most rooms share a bathroom is the type as the City's surveys define it, not counted building by building here.`, 'sro-tenant-survey-2024'),
    },
    {
      id: 'who-owns',
      kicker: '2024',
      title: 'Who owns them',
      text: [
        `Private owners hold ${owned('Private').length} of the buildings and ${fmt(sum(owned('Private')))} rooms, a little under half.`,
        `Governments own ${owned('Government').length} buildings with ${fmt(sum(owned('Government')))} rooms, most of them run by non-profit societies. Non-profits own ${owned('Non-profit').length} more (${fmt(sum(owned('Non-profit')))} rooms), and Chinese benevolent societies ${owned('Chinese Society').length} (${fmt(sum(owned('Chinese Society')))} rooms).`,
      ],
      view: wide,
      ...base,
      legend: [
        { colour: RED, label: 'Private' },
        { colour: DARK, label: 'Government' },
        { colour: MID, label: 'Non-profit' },
        { colour: PALE, label: 'Chinese society' },
      ],
      stat: { value: fmt(sum(owned('Private'))), label: 'rooms still privately owned', after: 2500 },
      growth: { from: 2025, to: 2025, buildings: city((b) => (!b ? undefined : b.ownerType === 'Private' ? RED : b.ownerType === 'Government' ? DARK : b.ownerType === 'Non-profit' ? MID : PALE)) },
      context: context(`Each building is coloured by its owner type as Appendix B gives it; the survey does not say which government owns a building. The public and non-profit ownership is largely the result of the purchases of chapter 7.`, 'sro-tenant-survey-2024'),
    },
    {
      id: 'market',
      kicker: '2024',
      title: 'Half in the market',
      text: [
        `${fmt(sum(rented('market')))} rooms in ${rented('market').length} buildings are rented on the private market, at whatever the owner can get. ${fmt(sum(rented('nonmarket')))} rooms in ${rented('nonmarket').length} buildings are non-market housing, held at rents people on assistance can pay.`,
        'Each private room that is sold, emptied or re-rented at more is one fewer at the bottom of the market.',
      ],
      view: wide,
      ...base,
      legend: [
        { colour: RED, label: 'Market rooms' },
        { colour: DARK, label: 'Non-market rooms' },
        { colour: '#ffffff', label: 'Not surveyed' },
      ],
      stat: { value: fmt(sum(rented('market'))), label: 'rooms rented on the private market', after: 2500 },
      growth: { from: 2025, to: 2025, buildings: city((b) => (!b ? undefined : b.tenure === 'market' ? RED : b.tenure === 'nonmarket' ? DARK : undefined)) },
      context: context(`Market and non-market are the survey's two groups of buildings; ${rented('not surveyed').length} buildings (${fmt(sum(rented('not surveyed')))} rooms) it did not survey are white. What the rooms rent for is not shown as a figure: the City's surveys could not be opened to read. A news report of the City's 2023 survey gives the average rent of a private SRO room as $561 in 2019 and $681 in 2023, and the rooms renting at the old $375 shelter rate as 1,700 in 2003 and 52 in 2023; these are secondhand and wait on the council report itself. That non-market rents are held to what assistance pays is the general meaning of the term, not a figure from the survey.`, 'sro-tenant-survey-2024'),
    },
    {
      id: 'same-buildings',
      kicker: '1900 to 2024',
      title: 'The same buildings',
      text: [
        `These are the hotels of chapter 2. Of the ${dated} buildings on the map that the property records date, ${byBoom} were standing by 1914: built in the boom to lodge loggers, miners and fishers between seasons.`,
        'More than a century on, they are housing of last resort, in buildings never meant to be lived in for a lifetime.',
        'Choose a red hotel on the map to go to it.',
      ],
      pickable: boomHotels,
      view: wide,
      ...base,
      legend: [
        { colour: RED, label: 'Built by 1914' },
        { colour: MID, label: 'Built since' },
        { colour: '#ffffff', label: 'No year on record' },
      ],
      stat: { value: `${byBoom} of ${dated}`, label: 'dated SRO buildings were standing by 1914', after: 2500 },
      growth: { from: 2025, to: 2025, buildings: city((_, h) => (h.built == null ? undefined : h.built <= 1914 ? RED : MID)) },
      context: context(`A building's year is its lot's in the City's property tax report, as in chapter 2; ${listed.length - dated} buildings have no year there and are white. The buildings' open by-law issues are on the next card. That they were not meant to be lived in for a lifetime is the chapter's reading of what they were built for.`, 'cov-property-tax'),
    },
    {
      id: 'state-of-repair',
      kicker: issuesDate,
      title: 'The state of the buildings',
      text: [
        `The City keeps a public record of rental buildings with unresolved issues under its by-laws: maintenance, building, electrical, plumbing. On ${issuesDate}, ${withIssues.length} of the SRO buildings on this map were on it, with ${fmt(issuesTotal)} issues outstanding between them.`,
        `One building alone had ${openIssues[worst.name].open}.`,
      ],
      view: wide,
      ...base,
      legend: [
        { colour: RED, label: '10 or more open issues' },
        { colour: MID_RED, label: '5 to 9' },
        { colour: PALE_RED, label: '1 to 4' },
        { colour: '#ffffff', label: 'None on file' },
      ],
      stat: { value: `${withIssues.length} of ${listed.length}`, label: 'SRO buildings with unresolved by-law issues on file', after: 2500 },
      growth: { from: 2025, to: 2025, buildings: city((_, h) => { const n = openIssues[h.name]?.open ?? 0; return n >= 10 ? RED : n >= 5 ? MID_RED : n >= 1 ? PALE_RED : undefined }) },
      context: context(`The counts are from the City's open dataset "Rental standards: current issues", read on ${issuesDate} and matched to the survey's list by street address. It is a snapshot of one day: the City updates it daily and keeps no history in it. It covers licensed rental buildings of five or more units, counts open issues without saying what they are or how serious, and does not include fire by-law orders. A white building has no open issue on file, or is not in the dataset's scope; it is not a statement that the building is in good repair. Two pairs of names on the list share an address and so share a count. The building with the most is the ${worst.name.replace(/\w\S*/g, (w) => w[0] + w.slice(1).toLowerCase())}, ${(worst as unknown as { addr: string }).addr}. What tenants themselves report (pests, heat, bathrooms, elevators) is in the 2024 SRO Tenant Survey, which could not be opened to read.`, 'cov-rental-standards'),
    },
    {
      id: 'what-remains',
      kicker: '1970 to 2023',
      title: 'What remains',
      text: [
        `In January 1970 there were ${fmt(core(1970))} privately owned SRO rooms in the downtown core. In January 2023 there were ${fmt(core(2023))}.`,
        'Some were bought to be kept as housing. The rest were closed, converted, demolished or burned, across every chapter of this story: the by-law, the fair, the market, the fires.',
        'The rooms that are left are on this map.',
      ],
      view: { lon: -123.1005, lat: 49.2816, dist: 1700, theta: SOUTH, phi: 0.75 },
      ...base,
      stat: { value: `${fmt(core(1970))} → ${fmt(core(2023))}`, label: 'privately owned SRO rooms in the downtown core, 1970 and 2023', after: 2500 },
      growth: { from: 2025, to: 2025, buildings: city(() => RED) },
      context: context(`The two figures are the City's counts of privately owned SRO rooms in the downtown core (Burrard Street to Clark Drive): ${fmt(core(1970))} on 1 January 1970, from Table A1 of the 2009 survey, and ${fmt(core(2023))} in January 2023, from the 2023 survey, which includes rooms owned by Chinese benevolent societies and private rooms run by non-profits. The count falls when rooms close, are converted or demolished, and also when government buys them: rooms in public hands leave it but are still lived in. The red buildings are all of the 2024 survey's list, public and private.`, 'cov-survey-2009'),
    },
  ],
}
