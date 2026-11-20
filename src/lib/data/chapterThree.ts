/**
 * Chapter 3 told on the map: neighbours and exclusion, 1907 to 1942.
 *
 * The district's buildings are still Goad's 1912 atlas, raised as in chapter 2 (src/lib/data/district1912.ts):
 * the nearest record of the streets through these decades. The three neighbourhoods are outlined on the
 * street grid by the streets the accounts give for them (scripts/build-districts.py); they are a
 * convenience for the map, not surveyed limits.
 */
import { type GrowthBuilding, type MapChapter } from './stops'
import { district, districtTo, footprintAt, inRing } from './district1912'
import sroGround from './sroGround.json'
import landmarkPlaces from './landmarks.json'
import { models as buildingModels } from './models'
import streets1887 from './streets1887.json'
import sroByYear from './sroByYear.json'
import flats1917 from './flats1917.json'
import districts from './districts1907.json'
import { chapterThreePhotos } from './chapterThreePhotos'

const SOUTH = Math.PI / 2
const RED = '#8e4233'
const hotels = (sroByYear.buildings as unknown as GrowthBuilding[]).map((h, i) => {
  const ground = (sroGround.ground as number[])[i]
  return { ...h, ground, built: h.built == null ? null : Math.max(h.built, ground) }
})
const streets = streets1887.edges
const chinatown = districts.chinatown as [number, number][]
const paueruGai = districts.paueruGai as [number, number][]
const hogansAlley = districts.hogansAlley as [number, number][]
const corner = districts.corners as unknown as Record<string, [number, number]>

const underHotel = (b: { lon: number; lat: number }) => hotels.some((h) => h.parts.some((p) => inRing(b.lon, b.lat, p.ring)))
const landmark = (id: string, name: string, fill?: string): GrowthBuilding[] => {
  const m = buildingModels.find((x) => x.id === id)
  if (!m || !m.anchor) return []
  return [{ name, built: 1903, fill, lon: m.anchor[0], lat: m.anchor[1], parts: m.parts.filter((p) => p.kind === 'prism') as GrowthBuilding['parts'] }]
}
const landmarks = (): GrowthBuilding[] => [...landmark('carnegie-1903', 'Carnegie Library'), ...landmark('woodwards-1903', "Woodward's"), ...landmark('bcer-1912', 'BC Electric terminal')]
const bcerIndex = footprintAt('brick', landmarkPlaces.bcer.lon, landmarkPlaces.bcer.lat)
const bcer = (b: (typeof district)[number]) => b.kind === 'brick' && b.i === bcerIndex
const cityHallIndex = footprintAt('brick', -123.10025, 49.28073)
const cityHall = (b: (typeof district)[number]) => b.kind === 'brick' && b.i === cityHallIndex
const inAny = (b: { lon: number; lat: number }) => inRing(b.lon, b.lat, chinatown) || inRing(b.lon, b.lat, paueruGai) || inRing(b.lon, b.lat, hogansAlley)
const neighbourhoodsRise: GrowthBuilding[] = [
  ...districtTo(1912, (b) => underHotel(b) || bcer(b)).map((b) => (inAny(b) ? { ...b, fill: RED } : b)),
  ...landmarks(),
  ...hotels.map((h) => (inAny(h) ? { ...h, fill: RED } : h)),
]

const SHORE = `The shoreline is that of about 1900 until 1917, then the one with the False Creek flats filled, as in chapter 2.`
const ATLAS = `The buildings are those of Goad's 1912 atlas, the nearest record of the streets through these decades, at assumed heights of 11 m brick and 7 m wood; today's SRO hotels stand at their LiDAR heights.`
const OUTLINES = `The neighbourhoods are outlined by the streets the accounts give for them, on today's street lines: Chinatown from Carrall to Main between Hastings and Keefer, its extent by the end of the 1900s as Simon Fraser University's Chinese Canadian history site gives it (from Canton Alley, just west of Carrall), with Pender as its spine; Paueru Gai from Main to Heatley between Railway and Cordova, as Canada's Historic Places gives the neighbourhood before 1942, its centre along Powell from Main to Jackson; Hogan's Alley from Main to Jackson between Union and Prior, the lane itself, with the Black community's churches and businesses on the streets around it. Each shaded into the streets around it; the outlines are a convenience for the map, not surveyed limits.`

const middle = (ring: [number, number][]): [number, number] => [ring.slice(0, -1).reduce((a, p) => a + p[0], 0) / (ring.length - 1), ring.slice(0, -1).reduce((a, p) => a + p[1], 0) / (ring.length - 1)]

export const chapterThree: MapChapter = {
  chapterId: 'neighbours-and-exclusion',
  title: 'Neighbours and exclusion',
  bare: true,
  oldShoreline: true,
  sites: [
    // the three neighbourhoods, each named above the middle of its outline
    { id: 'chinatown', label: 'Chinatown', stem: 16, lon: middle(chinatown)[0], lat: middle(chinatown)[1], located: false, basis: 'The middle of the outline drawn for the neighbourhood: a label, not a place.' },
    { id: 'paueru-gai', label: 'Paueru Gai', stem: 16, lon: middle(paueruGai)[0], lat: middle(paueruGai)[1], located: false, basis: 'The middle of the outline drawn for the neighbourhood: a label, not a place.' },
    { id: 'hogans-alley', label: "Hogan's Alley", stem: 16, lon: middle(hogansAlley)[0], lat: middle(hogansAlley)[1], located: false, basis: 'The middle of the outline drawn for the neighbourhood: a label, not a place.' },
    {
      id: 'city-hall-1907',
      label: 'City Hall, 1907',
      stem: 14,
      lon: -123.10025,
      lat: 49.28073,
      located: true,
      basis: "The building marked City Hall in Goad's 1912 atlas: the old market hall on Westminster Avenue (Main Street) behind the Carnegie Library, the city hall from 1898 to 1929.",
    },
    {
      id: 'powell-grounds',
      label: 'Powell Street Grounds',
      lon: (corner.dunlevyPowell[0] + corner.jacksonPowell[0]) / 2,
      lat: corner.dunlevyPowell[1] - 0.0004,
      located: true,
      basis: "Today's Oppenheimer Park, between Dunlevy and Jackson south of Powell: the Powell Street Grounds, home of the Asahi baseball club.",
    },
    {
      id: 'cn-station',
      label: 'Canadian Northern station, 1919',
      stem: 12,
      lon: -123.09785,
      lat: 49.27375,
      located: true,
      basis: "Today's Pacific Central Station on the flats, opened in 1919 as the Canadian Northern's terminal, drawn from the City's footprint at its LiDAR height.",
    },
    {
      id: 'jungle-1931',
      label: 'Encampment, 1931',
      lon: -123.0938,
      lat: 49.2857,
      located: false,
      basis: "The encampment of unemployed men on the site of the old Hastings Mill and the railway land east of Dunlevy in the summer of 1931, by Major Matthews' note on the City Archives photograph, whose title calls it 'the jungle', the word of the time for such camps; marked on the mill site.",
    },
  ],
  routes: [
    {
      id: 'riot-1907',
      // from the rally at city hall west along Hastings to Carrall and into Chinatown on Pender; then back
      // east along Hastings to Main, north to Powell and east along Powell into Paueru Gai
      points: [[-123.1001, 49.2810], corner.mainHastings, corner.carrallHastings, corner.carrallPender, [-123.1030, 49.28035], corner.carrallPender, corner.carrallHastings, corner.mainHastings, corner.mainPowell, corner.dunlevyPowell, corner.jacksonPowell],
      drawIn: true,
      colour: '#8e4233',
      located: false,
      basis: "The accounts have the crowd rally at city hall, move on Chinatown along Hastings and Carrall, then march to Powell Street. The streets taken between are not given; the line is drawn on the direct ones.",
      caveat: 'The route is drawn on the direct streets between the places the accounts name; the streets the crowd actually took are not recorded here.',
    },
    {
      id: 'trek-1935',
      // out of the yards on the flats, east along the railway
      points: [[-123.0975, 49.2736], [-123.0900, 49.2729], [-123.0800, 49.2722], [-123.0700, 49.2716], [-123.0620, 49.2713]],
      drawIn: true,
      located: false,
      basis: 'The trekkers left on 3 June 1935 atop freight cars bound east. Which yard they boarded in is not given here; the line is drawn out of the yards on the flats along the railway.',
      caveat: 'Drawn out of the railway yards on the flats; the yard the trekkers boarded in is not given here.',
    },
  ],
  stops: [
    {
      id: 'neighbours',
      kicker: '1900 to 1941',
      title: 'Three neighbourhoods',
      text: [
        'The hotel district shares its streets with Chinatown along Pender and Carrall, with Paueru Gai, the Japanese Canadian neighbourhood along Powell Street, and with Hogan\'s Alley, the city\'s Black community, in the lane between Union and Prior.',
        'All three grow in the same decades as the hotels, and under the same landlords\' city.',
      ],
      view: { lon: -123.0985, lat: 49.2800, dist: 1700, theta: SOUTH, phi: 0.8 },
      sites: ['chinatown', 'paueru-gai', 'hogans-alley'],
      routes: [],
      land: '1900',
      edges: { width: 0.55, colour: '#7a7a7a' },
      models: [],
      // the three neighbourhoods fill in year by year, their buildings in red, as the count runs to 1941
      // each fill arrives a year before the buildings on it
      growth: { from: 1900, to: 1941, ms: 10000, delay: 1200, buildings: neighbourhoodsRise, landAt: [[1911, '1912'], [1916, '1917']] },
      context: {
        outlines: [chinatown, paueruGai, hogansAlley],
        lines: [],
        names: [],
        streets,
        streetStyle: { width: 0.8, colour: '#8c8c8c', opacity: 0.8 },
        note: `The red buildings are those inside the three outlines, each rising in the year chapter 2's count gives it: the City's property records where the lot's building still stands, otherwise a year drawn at random between 1887 and 1912, so the filling-in is a stand-in for the neighbourhoods' growth, not a record of it. Nothing is added after 1912, the atlas's year; today's SRO hotels inside the outlines rise in their recorded years. ${OUTLINES} ${ATLAS} ${SHORE} The lines are the streets as surveyed by 1887.`,
        sourceId: 'anderson-chinatown',
      },
      eventId: 'riot-1907',
    },
    {
      id: 'riot',
      kicker: '7 September 1907',
      title: 'The riot',
      text: [
        'On the evening of 7 September 1907 a rally of the Asiatic Exclusion League at city hall draws thousands. The crowd moves on Chinatown, breaking windows along Pender and Carrall, then marches to Powell Street, where Japanese Canadian residents hold the mob off.',
        'Nearly every building in Chinatown is damaged. The federal government pays compensation, and negotiates limits on Japanese immigration.',
      ],
      view: { lon: -123.1000, lat: 49.2815, dist: 1300, theta: SOUTH, phi: 0.8 },
      sites: ['chinatown', 'paueru-gai', 'city-hall-1907', 'powell-grounds'],
      routes: ['riot-1907'],
      land: '1900',
      edges: { width: 0.55, colour: '#7a7a7a' },
      // city hall, where the rally was, in the dark of the chapter's public buildings
      models: [['city-hall-1907', 'city-hall-1907', '#3b3b3b']],
      growth: { from: 1907, to: 1907, buildings: [...districtTo(1907, (b) => underHotel(b) || bcer(b) || cityHall(b)).map((b) => (inRing(b.lon, b.lat, chinatown) || inRing(b.lon, b.lat, paueruGai) ? { ...b, fill: RED } : b)), ...landmarks(), ...hotels.filter((h) => (h.built ?? 9999) <= 1907)] },
      // the crowd's way named along Hastings
      lettering: [{ text: 'THE CROWD, 7 SEPTEMBER 1907', at: corner.carrallHastings, along: [corner.carrallHastings, corner.mainHastings], px: 8, colour: '#2b2b2b', tracking: 0.25 }],
      context: {
        lines: [],
        names: [],
        streets,
        streetStyle: { width: 0.8, colour: '#8c8c8c', opacity: 0.8 },
        note: `The red buildings are those of the 1912 atlas within the two neighbourhoods' outlines, standing for the neighbourhoods the crowd attacked; which buildings were damaged is not mapped here. The dark building is the city hall of the day, the old market hall on Westminster Avenue behind the Carnegie Library, as the atlas marks it, at an assumed height. The red dashed line is the crowd's way as the accounts give it, from city hall to Chinatown and on to Powell Street, drawn on the direct streets. ${OUTLINES} ${ATLAS} ${SHORE}`,
        sourceId: 'tce-1907-riot',
      },
      eventId: 'riot-1907',
    },
    {
      id: 'exclusion',
      kicker: '1 July 1923',
      title: 'Exclusion',
      text: [
        'Law follows violence. The Chinese Immigration Act of 1 July 1923 bans virtually all Chinese immigration until its repeal in 1947. Chinatown calls the day Humiliation Day.',
        'It separates families and leaves a bachelor society of men living alone, many of them in rooms along Pender and in the hotels around it.',
      ],
      view: { lon: -123.1000, lat: 49.2796, dist: 900, theta: SOUTH, phi: 0.8 },
      sites: ['chinatown'],
      routes: [],
      land: '1917',
      edges: { width: 0.55, colour: '#7a7a7a' },
      models: [],
      // Chinatown outlined; the hotels standing by 1923 turn red one by one outward from it, the rest of the atlas white
      highlight: { from: middle(chinatown), ms: 7000 },
      growth: { from: 1923, to: 1923, buildings: [...districtTo(1912, (b) => underHotel(b) || bcer(b)), ...landmarks(), ...hotels.filter((h) => (h.built ?? 9999) <= 1923).map((h) => ({ ...h, fill: RED }))] },
      context: {
        outlines: [chinatown],
        lines: [],
        names: [],
        streets,
        streetStyle: { width: 0.8, colour: '#8c8c8c', opacity: 0.8 },
        note: `The red buildings are today's SRO hotels standing by 1923, in Chinatown and around it: the rooms where many of the men left alone by the act lived. Which hotels housed them is not recorded here. By 1923 Chinatown had grown east along Pender toward Gore, past the outline drawn here, which is its extent at the end of the 1900s, and the atlas is eleven years old by then: the outline stands for the neighbourhood, not its exact extent. ${OUTLINES} ${ATLAS} ${SHORE}`,
        sourceId: 'tce-chinese-immigration-act',
      },
      eventId: 'exclusion-act',
    },
    {
      id: 'relief',
      kicker: '1931 to 1935',
      title: 'The Depression',
      text: [
        'The Depression fills the district with unemployed men: in the hotels, and in a camp of shacks on the old mill site. In April 1935 about 1,500 strike from the federal relief camps and gather in Vancouver.',
        'After two months of protest, on 3 June more than 1,000 of them leave on top of freight cars, bound for Ottawa.',
      ],
      view: { lon: -123.0960, lat: 49.2785, dist: 2600, theta: SOUTH, phi: 0.75 },
      sites: ['jungle-1931', 'cn-station'],
      routes: ['trek-1935'],
      // a freight train leaves the yards eastward, again and again
      arrivals: [{ model: 'freight-train-1935', route: 'trek-1935', ms: 10000, loop: true, scale: 3 }],
      land: '1917',
      edges: { width: 0.55, colour: '#7a7a7a' },
      // the Canadian Northern's station on the flats, in the dark of the terminals
      models: [['cn-station', 'cn-station-1919', '#3b3b3b']],
      growth: { from: 1935, to: 1935, buildings: [...districtTo(1912, (b) => underHotel(b) || bcer(b)), ...landmarks(), ...hotels.filter((h) => (h.built ?? 9999) <= 1935).map((h) => ({ ...h, fill: RED }))] },
      context: {
        lines: flats1917.rail as [number, number][][],
        names: [],
        streets: [...streets, ...(flats1917.streets as number[][][])],
        streetStyle: { width: 0.8, colour: '#8c8c8c', opacity: 0.8 },
        note: `The red buildings are today's SRO hotels standing by 1935: the rooms the unemployed filled. The dark building is the Canadian Northern's station of 1919 on the flats, today's Pacific Central, from the City's footprint at its LiDAR height, which is the mean over the roof and lower than its hall. The encampment is marked on the old mill site, where Major Matthews' note on the 1931 photograph puts it; the archive's title for the photograph calls it 'the jungle', the word of the time for such camps. The dashed line is the trek's way out, drawn from the railway yards on the flats; which yard the men boarded in is not given here. The railways and roads on the flats are today's centrelines, kept where they lie on the fill. ${ATLAS} ${SHORE}`,
        sourceId: 'tce-on-to-ottawa',
      },
      eventId: 'on-to-ottawa',
    },
    {
      id: 'uprooting',
      kicker: '24 February 1942',
      title: 'Paueru Gai emptied',
      text: [
        'Beginning 24 February 1942, some 21,000 Japanese Canadians are removed from the West Coast without charge. The federal government sells their property out from under them.',
        'Powell Street empties. Its stores, its hotels and the Powell Street Grounds pass to other hands, and the neighbourhood does not return.',
      ],
      view: { lon: -123.0965, lat: 49.2830, dist: 900, theta: SOUTH, phi: 0.8 },
      sites: ['paueru-gai', 'powell-grounds'],
      routes: [],
      land: '1917',
      edges: { width: 0.55, colour: '#7a7a7a' },
      models: [],
      // the neighbourhood's buildings drawn faint: standing, but emptied
      faint: [...districtTo(1912, (b) => underHotel(b) || bcer(b)), ...hotels.filter((h) => (h.built ?? 9999) <= 1942)].filter((b) => inRing(b.lon, b.lat, paueruGai)),
      growth: { from: 1942, to: 1942, buildings: [...districtTo(1912, (b) => underHotel(b) || bcer(b)), ...landmarks(), ...hotels.filter((h) => (h.built ?? 9999) <= 1942)].filter((b) => !inRing(b.lon, b.lat, paueruGai)) },
      context: {
        outlines: [paueruGai],
        lines: [],
        names: [],
        streets,
        streetStyle: { width: 0.8, colour: '#8c8c8c', opacity: 0.8 },
        note: `The buildings inside the outline are drawn faint: standing, but emptied of the people who had lived and worked in them. They are the 1912 atlas's buildings and today's SRO hotels inside Paueru Gai's outline; the outline is the neighbourhood as Canada's Historic Places bounds it. ${OUTLINES} ${ATLAS} ${SHORE}`,
        sourceId: 'tce-internment',
      },
      eventId: 'uprooting-1942',
    },
  ],
}

// Archival photographs for each card, kept in chapterThreePhotos.ts.
for (const stop of chapterThree.stops) stop.photos ??= chapterThreePhotos[stop.id]
