/**
 * Chapters told on the map: each chapter is a run of stops, and each stop is a
 * camera position, the sites marked on the ground, and the words beside them.
 * Scrolling moves from one stop to the next.
 */

/** A place marked on the map. */
export interface Site {
  id: string
  label: string
  lon: number
  lat: number
  /** True once a source confirms where this was. */
  located: boolean
  /** How the position was arrived at, and what is still uncertain about it. */
  basis: string
}

/** An archival photograph shown at a stop. The file lives in public/images/. */
export interface Photo {
  /** Path under public/images/. */
  file: string
  title: string
  date: string
  /** What the photograph shows, for screen readers. */
  alt: string
  /** The archive's own description, where it gives one. */
  note?: string
  credit: string
  /** The archive's reference number. */
  ref: string
  /** The archive's record for the photograph. */
  recordUrl: string
}

/** Where the camera sits for a stop. */
export interface View {
  /** The point on the ground the camera looks at. */
  lon: number
  lat: number
  /** Metres from that point to the camera. */
  dist: number
  /** Which side the camera sits on, in radians: PI/2 is due south, looking north. Larger swings it toward the west. */
  theta: number
  /** Tilt from straight down, in radians: 0.2 is nearly a plan, 1.3 is nearly at eye level. */
  phi: number
}

export interface Stop {
  id: string
  /** Small line above the title, usually a date. */
  kicker: string
  title: string
  text: string[]
  view: View
  /** Sites shown at this stop, by id. */
  sites: string[]
  /** Dashed lines drawn between sites, each a pair of site ids. */
  paths?: [string, string][]
  /**
   * Rings, leaders and names drawn around a place at this stop, in the manner of a survey
   * diagram. The camera is then set by the annotation to fit it, in place of `view`.
   */
  annotation?: Annotation
  /**
   * Names lettered flat on the map at this stop only, each running east from `at` ([lon, lat]).
   * `px` is the height of the letters on screen; `colour` defaults to white, for names on water.
   */
  lettering?: { text: string; at: [number, number]; px: number; colour?: string; tracking?: number }[]
  /**
   * Buildings that rise from the ground once the stop has arrived, after any burn has spread:
   * each a site id and model id as in `models`, in the order they rise.
   */
  rises?: [string, string][]
  /** Hold back the annotation's subheadings and leaders until the buildings in `rises` are up. */
  labelsAfterRise?: boolean
  /** Buildings standing as the stop opens that a burn takes down as it reaches them, as in `models`. */
  burns?: [string, string][]
  /** Where the town grew from: buildings in `rises` come up in order of distance from here. */
  risesFrom?: [number, number]
  /** Archival photographs shown in the stop's card. */
  photos?: Photo[]
  /** Buildings standing at this stop: each a site id and the id of a model in models.ts. */
  models?: [string, string][]
  /** Things that travel in as the stop arrives: a model from models.ts, moved from one [lon, lat] to another. */
  arrivals?: { model: string; from: [number, number]; to: [number, number]; scale?: number }[]
  /**
   * Faint lines and names from a period map, laid on the ground to give the place its surroundings.
   * `note` says which map, of what date, and how it was put on the ground; it is shown in the card.
   */
  context?: { lines: [number, number][][]; minor?: [number, number][][]; burnArea?: [number, number][]; burnFrom?: [number, number]; /** Where the streets draw themselves in from, nearest first; left out, they are simply there. */ streetsFrom?: [number, number]; /** Street edges, already cut at the crossings into block outlines. */ streets?: number[][][]; names: { text: string; along: [number, number][] }[]; note: string; sourceId: string }
  /** Longer dashed lines along a route, by id. One marked `drawIn` is drawn from its first point to its last as the stop arrives. */
  routes?: string[]
  /** The event in chapters.ts this stop tells, for its sources. */
  eventId?: string
  /** Source for a stop that has no event of its own. */
  sourceId?: string
}

export interface MapChapter {
  chapterId: string
  title: string
  /** Draw the land before the city: no buildings, streets, parks or rail. */
  bare: boolean
  /** Cut the water to the shoreline of the 1880s, in place of today's. */
  oldShoreline: boolean
  sites: Site[]
  routes: Route[]
  stops: Stop[]
}

/** A line along the ground, such as a railway. */
export interface Route {
  id: string
  /** [lon, lat] points, in the order the line should be drawn. */
  points: [number, number][]
  drawIn: boolean
  /** Drawn as a solid line; otherwise dashed. */
  solid?: boolean
  /** Drawn as a railway: two rails with ties across them, laid from the first point to the last when `drawIn`. */
  track?: boolean
  /** True once a source confirms the line ran here. */
  located: boolean
  basis: string
  /** Shown in the card's notes when the line is not located. */
  caveat?: string
}

import { millAnnotations, millCentre, millTrack, millYardCentre } from './millSite'
import type { Annotation } from '../district/annotate'
import { granvillePlaces } from './granville1870'
import { granvillePlaces1885 } from './granville1885'
import streets1887 from './streets1887.json'
import { byrnesBlock1889At } from './granville1889'

const SOUTH = Math.PI / 2

const CVA = 'City of Vancouver Archives'
const record = (slug: string) => `https://searcharchives.vancouver.ca/${slug}`

/**
 * Photographs of Hastings Mill from the years this chapter covers. All six are marked
 * "Copyright status: Public domain" on their archive records.
 */
const millPhotos: Photo[] = [
  {
    file: 'chapter-1/hastings-sawmill-1872_cva-371-3178.jpg',
    title: 'Hastings Sawmill',
    date: '1872',
    alt: 'The mill seen across the water: a long gabled shed with a tall stack, a wharf with a sailing ship alongside, small buildings and tall trees behind.',
    credit: CVA,
    ref: 'CVA 371-3178',
    recordUrl: record('hastings-sawmill-1872'),
  },
  {
    file: 'chapter-1/hastings-sawmill-c1883_mi-p41.jpg',
    title: 'Hastings Sawmill',
    date: 'about 1883',
    alt: 'Mill employees gathered in front of the mill.',
    note: 'Employees in front of the mill.',
    credit: CVA,
    ref: 'Mi P41',
    recordUrl: record('hastings-sawmill-4'),
  },
  {
    file: 'chapter-1/simson-cottage-1885_mi-p16.jpg',
    title: 'The Simson cottage at Hastings Sawmill',
    date: '1885',
    alt: 'A cottage at the mill with a man seated outside, a woman in the doorway and two others nearby.',
    note: 'Calvert Simson in a chair, his sister in the door, and the gardener and his son.',
    credit: CVA,
    ref: 'Mi P16',
    recordUrl: record('simson-cottage-at-hastings-sawmill'),
  },
  {
    file: 'chapter-1/hastings-sawmill-1886_mi-p19.jpg',
    title: 'Hastings Sawmill',
    date: '1886',
    alt: 'The Hastings Sawmill in 1886.',
    credit: CVA,
    ref: 'Mi P19',
    recordUrl: record('hastings-sawmill-2'),
  },
  {
    file: 'chapter-1/hastings-sawmill-july-1886_mi-p36.jpg',
    title: 'Hastings Sawmill',
    date: 'July 1886',
    alt: 'Buildings within the mill site, a month after the fire.',
    note: 'The buildings within the mill site.',
    credit: CVA,
    ref: 'Mi P36',
    recordUrl: record('hastings-sawmill-3'),
  },
  {
    file: 'chapter-1/hastings-sawmill-wharf-c1887_mi-p24.jpg',
    title: 'Hastings Sawmill wharf',
    date: 'about 1887',
    alt: 'The wharf at the Hastings Sawmill.',
    credit: CVA,
    ref: 'Mi P24',
    recordUrl: record('hastings-sawmill-wharf'),
  },
]

/**
 * The Granville townsite, traced from the government plan of March 1870: the rows of lots,
 * whose gaps are the streets and lanes, and the lines between lots.
 */
const townsite1870 = {
  // The plan's blocks and lots (granvilleBlocks, granvilleLots, granvilleStreetNames) are traced
  // but not drawn at this stop: only its buildings are shown.
  lines: [] as [number, number][][],
  names: [] as { text: string; along: [number, number][] }[],
  note: `The buildings are traced from the government's plan of the townsite, March 1870, two and a half years after the saloon opened. The plan does not name the L-shaped building at the foot of Carrall Street; it is taken to be Deighton's because that is where the accounts put him. Heights are assumed.`,
  sourceId: 'granville-plan-1870',
}

/** The Granville townsite's streets alone, from Cambie to Carrall and the shore to Hastings. */
const granvilleStreetEdges = streets1887.edges.filter((line) =>
  line.every(([lon, lat]) => lon > -123.1101 && lon < -123.1037 && lat > 49.2811 && lat < 49.2852),
)

/**
 * The burned ground smudged in charcoal at the fire: the townsite blocks from Cambie to Carrall and the
 * shore to Hastings, which the August 1885 map shows built on. The fire went further; no
 * source gives its edge, so only this part is hatched.
 */
const townBlocks: [number, number][] = [
  [-123.10958, 49.28447], [-123.10426, 49.2835], [-123.10435, 49.28147], [-123.10955, 49.28251],
]

/** The canoe's course: 130 m along the shore from the direction of the mill to the landing. */
const canoeFrom: [number, number] = [granvillePlaces.landing[0] + 118 / 72_600, granvillePlaces.landing[1] + 54 / 111_200]

/**
 * The corner where the saloon stood. No photograph of the 1867 saloon itself is held by the
 * archives; these are the earliest views of the place found there, both public domain.
 */
const saloonPhotos: Photo[] = [
  {
    file: 'chapter-1/gastown-c1880_dist-p11-1.jpg',
    title: 'Gastown, the maple tree',
    date: 'about 1880',
    alt: 'Low wooden buildings with picket fences under a very large maple tree.',
    note: 'The corner at Carrall and Water about thirteen years after the saloon opened. The archive names the Granville Hotel; no photograph of the 1867 saloon is known there.',
    credit: `${CVA}, attributed to Joseph Davis`,
    ref: 'Dist P11.1',
    recordUrl: record('gastown-27'),
  },
  {
    file: 'chapter-1/view-of-granville-1885_dist-p14.jpg',
    title: 'View of Granville',
    date: '1885',
    alt: 'The settlement seen across the water from a rocky shore, with buildings on piles and tall trees behind.',
    note: 'Granville from the water, the way the canoe came in, eighteen years on. Shows the Sunnyside Hotel.',
    credit: CVA,
    ref: 'Dist P14',
    recordUrl: record('view-of-granville'),
  },
]

/** A smoothed line through today's waterfront tracks, east to west, standing in for the 1887 route. */
const approachFromEast: [number, number][] = [
        [-123.0505, 49.2926], [-123.0535, 49.2923], [-123.0565, 49.2914], [-123.0595, 49.2898],
        [-123.0625, 49.2866], [-123.0655, 49.2853], [-123.0685, 49.285], [-123.0715, 49.2846],
        [-123.0745, 49.2846], [-123.0775, 49.2843], [-123.0805, 49.284], [-123.0835, 49.2838],
        [-123.0865, 49.2841], [-123.0895, 49.2852], [-123.0925, 49.2856], [-123.0955, 49.2855],
        [-123.0985, 49.285], [-123.1015, 49.2842], [-123.1045, 49.2842], [-123.1075, 49.2848],
        [-123.1105, 49.2859], [-123.1135, 49.2862],
]

export const chapterOne: MapChapter = {
  chapterId: 'mill-and-terminus',
  title: 'Mill and terminus',
  bare: true,
  oldShoreline: true,
  sites: [
    {
      id: 'mill',
      label: 'Hastings Mill',
      lon: millCentre[0],
      lat: millCentre[1],
      located: true,
      basis:
        'The middle of the saw mill as drawn on the 1889 fire insurance plan, which was tied to the ground by Dunlevy Avenue and Railway Street. It stands about 230 m north of where those streets cross, out beyond the 1880s shoreline: the plan shows the mill and its yard on a wharf and on ground "being filled in with slabs and sawdust".',
    },
    {
      id: 'saloon',
      label: 'Deighton\'s saloon',
      lon: -123.10426,
      lat: 49.2835,
      located: true,
      basis:
        'Marked at Water and Carrall streets. Wikipedia\'s article on Deighton puts his later hotel at the south-west corner of Carrall and Water and calls Maple Tree Square the former site of the saloon. The point is within a few metres of the 1880s shoreline. Wikipedia is a tertiary source; the exact lot is not confirmed.',
    },
    {
      id: 'fire-origin',
      label: 'Clearing fire',
      lon: -123.10912,
      lat: 49.28352,
      located: true,
      basis:
        'Wikipedia\'s article on the fire, citing Lisa Anne Smith\'s Vancouver is Ashes, puts the second clearing fire near the intersection of Cambie and Cordova streets. Marked at that intersection on today\'s street data.',
    },
    {
      id: 'terminus',
      label: 'End of the line',
      lon: -123.1135,
      lat: 49.2862,
      located: false,
      basis:
        'Marked where today\'s waterfront tracks end, near Waterfront Station. Where the first train actually stopped in 1887 needs a source.',
    },
  ],
  routes: [
    {
      id: 'cpr-1887',
      // East to west: the direction the first train came in. Across the mill site the line is the one
      // surveyed on the 1889 plan; either side of it, a smoothed line through today's tracks.
      points: [
        ...approachFromEast.filter((p) => p[0] > millTrack[millTrack.length - 1][0]),
        ...[...millTrack].reverse(),
        ...approachFromEast.filter((p) => p[0] < millTrack[0][0]),
      ],
      drawIn: true,
      track: true,
      located: false,
      basis:
        'A smoothed line through today\'s waterfront tracks, from the City\'s railway data. It stands in for the 1887 route, which is assumed to have followed the same shore. Only the stretch across the mill site is taken from a survey of the time.',
    },
    {
      id: 'cpr-mill-1889',
      points: millTrack,
      drawIn: false,
      solid: true,
      located: true,
      basis:
        'The Canadian Pacific main track as drawn on the 1889 fire insurance plan of the mill site, traced by eye. Where it leaves the east side of the sheet is the least certain part.',
    },
  ],
  stops: [
    {
      id: 'inlet',
      kicker: 'Before 1865',
      title: 'The inlet',
      text: [
        'This is the south shore of Burrard Inlet before the city: land, water and the slope between them.',
        'The water\'s edge is drawn where it ran before the city filled it: along Granville from the government\'s survey of 1870, elsewhere from a reconstruction of the original shore. More than a century of fill has since pushed it out: the port lands to the north and the False Creek flats to the south were tidal water. The dashed line is the shoreline today.',
        'The land has been declared to belong to the Crown, without any negotiation with the Indigenous communities whose home it is.',
      ],
      view: { lon: -123.1, lat: 49.283, dist: 5200, theta: SOUTH + 0.25, phi: 1.0 },
      sites: [],
      lettering: [{ text: 'BURRARD INLET', at: [-123.106, 49.2935], px: 22, tracking: 0.5 }],
      sourceId: 'tce-vancouver',
    },
    {
      id: 'mill',
      kicker: '1865 to 1867',
      title: 'The mill',
      text: [
        'In 1865 Captain Edward Stamp forms a company to cut lumber on the inlet. By June 1867 his mill is cutting for export.',
        'Stamp\'s Mill, later Hastings Mill, is the first commercial operation here. The settlement that becomes Vancouver grows around it.',
      ],
      view: { lon: millYardCentre[0], lat: millYardCentre[1], dist: 760, theta: SOUTH + 0.5, phi: 1.08 },
      sites: [],
      // The parts of the mill drawn at this date, named as the 1889 plan names them.
      annotation: {
        title: 'Hastings Mill',
        centre: millYardCentre,
        radii: [100, 200],
        shoreName: true,
        features: millAnnotations.filter((f) => ['SAW MILL', 'ENGINE HOUSE', 'WHARF', 'STORE', 'BOARDING HOUSE', 'DWELLINGS'].includes(f.label)),
      },
      photos: millPhotos,
      models: [['mill', 'hastings-mill-early']],
      eventId: 'hastings-mill',
    },
    {
      id: 'saloon',
      kicker: 'September 1867',
      title: 'The saloon',
      text: [
        'The mill hands walk about five hours to New Westminster for a drink. That September John "Gassy Jack" Deighton comes ashore by canoe with his family and a barrel of whisky. Within a day the mill hands, paid in whisky, have built him the Globe Saloon, a short way west along the shore.',
        'The settlement that gathers around it takes his nickname: Gastown.',
        'By March 1870, when the colonial government surveys a townsite here and names it Granville, its plan shows nine buildings along the shore, among them a jail and a custom house.',
      ],
      // Close on the saloon; the dashed line leads off east toward the mill.
      view: { lon: -123.10435, lat: 49.2836, dist: 190, theta: SOUTH - 0.5, phi: 1.1 },
      sites: [],
      paths: [['mill', 'saloon']],
      models: [['mill', 'hastings-mill-early'], ['saloon', 'granville-1870']],
      annotation: {
        title: 'Gastown',
        centre: granvillePlaces.footOfCarrall,
        // Close in on the one building; the jail and custom house stand unlabelled to the west.
        radii: [15, 30],
        features: [
          { label: 'SALOON', at: granvillePlaces.footOfCarrall },
          { label: 'LANDING', at: granvillePlaces.landing },
        ],
      },
      // The canoe comes along the shore from the mill, where the account has the family land,
      // following the dashed line. Drawn two and a half times life size so that it can be seen.
      arrivals: [{ model: 'deighton-canoe', from: canoeFrom, to: granvillePlaces.landing, scale: 2.5 }],
      context: townsite1870,
      photos: saloonPhotos,
      eventId: 'gastown',
    },
    {
      id: 'granville-1885',
      kicker: 'August 1885',
      title: 'The town before the fire',
      text: [
        'Eighteen years after the saloon, a fire insurance surveyor maps Granville building by building. Along the waterfront street stand the Deighton Hotel, the Granville Hotel and, out over the water on piles, the Sunnyside Hotel.',
        'Between them are saloons, general stores, a bakery, a barber, a Chinese store and wash house, a public hall, a telegraph office and the jail, with stables behind. Deighton died in 1875; the hotel keeps his name.',
        'Every building on the map is wood.',
      ],
      view: { lon: granvillePlaces1885.centre[0], lat: granvillePlaces1885.centre[1], dist: 420, theta: SOUTH, phi: 0.8 },
      sites: [],
      // The town comes up out of the ground, starting at Maple Tree Square, where it began.
      rises: [['saloon', 'granville-1885']],
      risesFrom: [-123.10426, 49.2835],
      // the hotels are named once the town is built
      labelsAfterRise: true,
      annotation: {
        title: 'Granville',
        centre: granvillePlaces1885.centre,
        // the outer ring takes in every building traced
        radii: [55, 110],
        features: [
          { label: 'DEIGHTON HOTEL', at: granvillePlaces1885.deightonHotel },
          { label: 'GRANVILLE HOTEL', at: granvillePlaces1885.granvilleHotel },
          { label: 'SUNNYSIDE HOTEL', at: granvillePlaces1885.sunnysideHotel },
        ],
      },
      // The townsite's streets draw themselves in from Maple Tree Square, then the buildings rise.
      context: {
        lines: [],
        names: [],
        streets: granvilleStreetEdges,
        streetsFrom: [-123.10426, 49.2835],
        note: `Buildings are traced from the Sanborn fire insurance map of August 1885. Only the main buildings are drawn, positions are good to a few metres, and roof forms and heights are assumed. The streets are the Granville townsite's, surveyed in 1870, drawn on today's street lines.`,
        sourceId: 'sanborn-1885',
      },
      sourceId: 'sanborn-1885',
    },
    {
      id: 'fire',
      kicker: '1886',
      title: 'Fire, then the rebuild',
      text: [
        'On 6 April 1886 the settlement becomes the City of Vancouver. On 13 June a fire lit to clear land near Cambie and Cordova runs north-east through it, destroying between 600 and 1,000 buildings and killing at least 21 people. Residents escape to the shore, many to Hastings Mill, whose manager offers free lumber the next day.',
        'The city is rebuilt at once: 500 buildings within six months. On the corner where Deighton House burned, the Byrnes Block goes up in brick, with shops on the ground floor and, upstairs, the Alhambra Hotel, lodging loggers and fishermen who come and go with the work.',
        'It still stands at Maple Tree Square. Rooms above shops, near the water, for workers who come for the season: this is the building the neighbourhood will be made of. Most of the hotels standing around it now came in the next boom, after 1900.',
      ],
      view: { lon: -123.1035, lat: 49.2838, dist: 4500, theta: SOUTH + 0.2, phi: 0.8 },
      sites: [],
      // Rings on the burned town only. The mill, which did not burn, is a kilometre east and off
      // the frame; the escape route runs out toward it.
      annotation: {
        title: 'Great Fire, 13 June 1886',
        // between where the fire began and the rebuilt blocks, which run south to Hastings
        centre: [-123.1062, 49.2831],
        radii: [125, 250],
        features: [
          { label: 'CLEARING FIRE', at: [-123.10912, 49.28352] },
          { label: 'BYRNES BLOCK, 1887', at: byrnesBlock1889At },
        ],
      },
      context: {
        lines: [],
        names: [],
        burnArea: townBlocks,
        streets: streets1887.edges,
        // the charcoal spreads from where the fire began
        burnFrom: [-123.10912, 49.28352],
        note: `The charcoal covers the townsite blocks from Cambie to Carrall and the shore to Hastings, which the August 1885 fire insurance map shows built on. No source records the fire's own edge, and the city had grown since that map was made, so the burned area was larger than shown. The buildings are left as footprints. The town that rises is traced from two sheets of the 1889 fire insurance plan, three years after the fire, between Cambie and Carrall, the old townsite; the rest of the rebuilt city is not drawn. The Byrnes Block is drawn as that plan shows it, before its later additions; the plan does not name it, and that it is on Deighton House's site rests on secondary accounts. The faint double lines are the streets of the surveyed city on the 1887 Canadian Pacific townsite map, drawn on today's street lines; many were still only surveyed, not built. Later dates for nearby hotels: Dominion 1900-01, Rainier 1907, Europe 1908-09, Hildon (Manitoba) and Traveller's 1909, Metropole 1910, from Canada's Historic Places and the Vancouver Heritage Site Finder.`,
        sourceId: 'dakin-1889-gastown',
      },
      models: [['mill', 'hastings-mill-1889']],
      // The town of 1885 stands as the stop opens and goes down as the fire reaches it.
      burns: [['saloon', 'granville-1885']],
      // After the burn, the Byrnes Block rises first, then the town of 1889.
      rises: [['saloon', 'byrnes-block-1889'], ['saloon', 'granville-1889']],
      eventId: 'incorporation-fire',
    },
    {
      id: 'train',
      kicker: '23 May 1887',
      title: 'The first train',
      text: [
        'The Canadian Pacific Railway extends its line west from Port Moody, along the inlet. On 23 May 1887 the first train arrives in Vancouver.',
        'The mill town is now the end of a railway across the continent.',
      ],
      // From the east, looking west down the shore, so the line runs away from the viewer toward its end.
      view: { lon: -123.103, lat: 49.2848, dist: 4700, theta: 0.45, phi: 1.1 },
      sites: ['mill', 'saloon', 'terminus'],
      models: [['mill', 'hastings-mill-1889']],
      routes: ['cpr-1887'],
      context: {
        lines: [],
        names: [],
        streets: streets1887.edges,
        note: `The faint double lines are the streets of the city as surveyed by 1887, from the Ross and Ceperley map of the Canadian Pacific townsite, drawn on today's street lines where they lay on 1880s land. Many were lines on paper through stumps: a street on the map was not necessarily built.`,
        sourceId: 'cpr-townsite-1887',
      },
      eventId: 'cpr-arrival',
    },
  ],
}
