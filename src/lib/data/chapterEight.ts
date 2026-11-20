/**
 * Chapter 8 told on the map: the rooms today.
 *
 * The buildings are those of the 2024 SRO Tenant Survey's Appendix B (public/data/district/sro-buildings.json:
 * 143 buildings, 6,517 rooms), each with its owner type, operator and whether its rooms are rented on the
 * market. 135 of them have a footprint in the project (src/lib/data/sroByYear.json) and are drawn; the
 * figures on the cards are the survey's own totals over all 143. The city around them is today's
 * footprints dated by the property records, as in chapters 5 to 7.
 *
 * What the project does not have: rents and the condition of the buildings. Those cards are not made.
 */
import { type GrowthBuilding, type MapChapter } from './stops'
import sroBuildings from '../../../public/data/district/sro-buildings.json'
import landmarks from './landmarks.json'
import { roomCounts } from './rooms'
import { BRIDGES86, CITY, DARK, GUIDEWAY, RED, SHORE, SOUTH, corner, edges, hotels, lateCity, landmark, rail, skytrainIds, streetFill, streetStyle, streets } from './chapterFive'
import { redevelopment } from './chapterSix'
import { inRing } from './district1912'

type Listed = { name: string; rooms: number; tenure: string; ownerType: string; operator: string }
const survey = sroBuildings.buildings as unknown as Listed[]
const byName = new Map(survey.map((b) => [b.name, b]))
const sum = (list: Listed[]) => list.reduce((a, b) => a + (b.rooms || 0), 0)
const fmt = (n: number) => n.toLocaleString('en-CA')
const owned = (o: string) => survey.filter((b) => b.ownerType === o)
const rented = (t: string) => survey.filter((b) => b.tenure === t)

const MID = '#8c8c8c'
const PALE = '#e3d9d5'
const EMPTY = '#cfcfcf'
type Ring = [number, number][]
const closed = (['balmoral', 'regent'] as const).map((k): GrowthBuilding => {
  const l = landmarks[k]
  return { name: l.name, built: 1900, fill: EMPTY, lon: l.lon, lat: l.lat, parts: l.parts.map((p) => ({ kind: 'prism' as const, x: 0, y: 0, ring: p.ring as Ring, h: p.h })) }
})
const closedRings = (['balmoral', 'regent', 'winters'] as const).flatMap((k) => landmarks[k].parts.map((p) => p.ring as Ring))
const woodwardsBlock: Ring = [[-123.1072, 49.28199], [-123.10955, 49.28251], [-123.10914, 49.28345], [-123.10679, 49.28293]]
// the survey's entry at 160 East Hastings is the Regent's building, closed: drawn grey from its footprint
const listed = hotels.filter((h) => !/^160 E Hastings/.test((h as unknown as { addr: string }).addr))
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
  ...listed.map((h) => ({ ...h, fill: fill(byName.get(h.name), h) })),
]

const models: [string, string][] = [
  ['expo-grounds', 'science-world-1986'],
  ['expo-grounds', 'bc-place-1986'],
  ['canada-pavilion', 'canada-place-1986'],
  ['viaducts', 'viaducts-1972'],
  ['guideway', 'skytrain-1985'],
]
const LIST = `The buildings are those of the 2024 SRO Tenant Survey's list (Appendix B), transcribed from the report: 143 buildings and ${fmt(sum(survey))} rooms. ${listed.length} of them have a footprint in the project and are drawn; the figures are the survey's totals over all 143. The Balmoral and the Regent, closed, are pale grey. BC Place is still drawn with the dome it lost in 2010.`
const MAP = `${LIST} ${CITY} ${GUIDEWAY} ${BRIDGES86} ${SHORE}`
const context = (note: string, sourceId: string) => ({ lines: rail, names: [], streets, streetFill, streetStyle, note: `${note} ${MAP}`, sourceId })
const base = { routes: ['cpr-main-5', ...skytrainIds], land: 'today' as const, bridges: true, edges, models, sites: [] as string[], faint: lateCity.backdrop(2025) }
const wide = { lon: -123.1010, lat: 49.2818, dist: 2300, theta: SOUTH, phi: 0.72 }

const core = (year: number) => roomCounts.find((r) => r.series === 'core-private' && r.year === year)!.rooms
const byBoom = listed.filter((h) => h.built != null && h.built <= 1914).length
const dated = listed.filter((h) => h.built != null).length

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
      context: context(`Market and non-market are the survey's two groups of buildings; ${rented('not surveyed').length} buildings (${fmt(sum(rented('not surveyed')))} rooms) it did not survey are white. What the rooms rent for is not in the project: the rents the survey and the Carnegie Community Action Project's hotel reports give are not yet read into it, so no figure is shown. That non-market rents are held to what assistance pays is the general meaning of the term, not a figure from the survey.`, 'sro-tenant-survey-2024'),
    },
    {
      id: 'same-buildings',
      kicker: '1900 to 2024',
      title: 'The same buildings',
      text: [
        `These are the hotels of chapter 2. Of the ${dated} buildings on the map that the property records date, ${byBoom} were standing by 1914: built in the boom to lodge loggers, miners and fishers between seasons.`,
        'More than a century on, they are housing of last resort, in buildings never meant to be lived in for a lifetime.',
      ],
      view: wide,
      ...base,
      legend: [
        { colour: RED, label: 'Built by 1914' },
        { colour: MID, label: 'Built since' },
        { colour: '#ffffff', label: 'No year on record' },
      ],
      stat: { value: `${byBoom} of ${dated}`, label: 'dated SRO buildings were standing by 1914', after: 2500 },
      growth: { from: 2025, to: 2025, buildings: city((_, h) => (h.built == null ? undefined : h.built <= 1914 ? RED : MID)) },
      context: context(`A building's year is its lot's in the City's property tax report, as in chapter 2; ${listed.length - dated} buildings have no year there and are white. What condition the buildings are in is not in the project: the City's inspection and standards-of-maintenance records are not yet read into it, so no building is marked by its state of repair. That they were not meant to be lived in for a lifetime is the chapter's reading of what they were built for.`, 'cov-property-tax'),
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
