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
  /** Marked without a ring: a dotted stem rises from this many metres up (the roof) to the name. */
  stem?: number
  /** The ring's radius in metres, where the mark is a ring; 22 m if left out. */
  ring?: number
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
  /** The photograph's entry in sources.ts. */
  sourceId?: string
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
  /** Words laid on the ground. `later`: held back until the stop's growth has finished. */
  lettering?: { text: string; at: [number, number]; px: number; colour?: string; tracking?: number; along?: [number, number][]; later?: boolean }[]
  /** Names the shoreline drawn at this stop, laid along it near `near`. */
  shoreLabel?: { text: string; near: [number, number] }
  /**
   * Buildings that rise from the ground once the stop has arrived, after any burn has spread:
   * each a site id and model id as in `models`, in the order they rise.
   */
  rises?: [string, string, string?][]
  /** The card's `models` as they stand once the rise is done: a building can change colour when another is up. */
  risesThen?: [string, string, string?][]
  /**
   * Buildings that come up as a running year, shown large over the map, passes the year each was built.
   * Those built before `from` stand from the start; those after `to` or with no year are left out. With
   * `from` equal to `to` they simply stand, without the count.
   */
  growth?: {
    from: number
    to: number
    ms?: number
    /** How long to wait, once the camera has settled, before the count starts. */
    delay?: number
    buildings: GrowthBuilding[]
    landAt?: [number, LandTime][]
    /** Lines on the ground that appear once the count passes a year: roads and railways on new fill. */
    linesAt?: [number, { lines: number[][][]; width?: number; colour?: string; opacity?: number }[]][]
  }
  /** Whose shoreline the map shows at this card: the 1880s (the default), 1912 or after 1917. */
  land?: LandTime
  /** Model the False Creek bridges (Granville, Burrard, Cambie) on the bare land, from today's centrelines. */
  bridges?: boolean
  /** Hold back the annotation's subheadings and leaders until the buildings in `rises` are up. */
  labelsAfterRise?: boolean
  /** Buildings standing as the stop opens that a burn takes down as it reaches them, as in `models`. */
  burns?: [string, string][]
  /** Where the town grew from: buildings in `rises` come up in order of distance from here. */
  risesFrom?: [number, number]
  /** Archival photographs shown in the stop's card. */
  photos?: Photo[]
  /** Buildings standing at this stop: each a site id, the id of a model in models.ts and, optionally, a fill colour to pick it out. */
  models?: [string, string, string?][]
  /** The weight and colour of the buildings' edges on this card, where the default ink is too heavy. */
  edges?: { width?: number; colour?: string }
  /** The coloured buildings of a standing growth take their colour one by one, nearest `from` first, over `ms`. */
  highlight?: { from: [number, number]; ms?: number; delay?: number }
  /**
   * The site marks in a sequence: each step's sites replace the last's at `after` ms once the camera has
   * settled, the old rings closing and the new ones opening.
   */
  marksSequence?: { sites: string[]; after: number }[]
  /**
   * A clearance: `old` stand from the start (in `fill`), sink into the ground from `at` ms after the camera
   * settles over `ms`, and then `then` rise in their place over `ms`.
   */
  /** `pick`: when given, the old buildings stand faint until then (ms), and only then are picked out in `fill`. */
  clear?: { old: GrowthBuilding[]; then: GrowthBuilding[]; fill?: string; at?: number; ms?: number; pick?: number }
  /**
   * Structures laid along their length once the camera has settled, like a railway: a model whose parts
   * are a deck (a prism whose ring runs out along one side and back along the other) followed by its
   * piers in order along it. Each is laid in turn, over `ms`.
   */
  lay?: { site: string; model: string; fill?: string; ms?: number }[]
  /** A figure shown large over the map once the camera has settled, with what it counts beneath it. */
  stat?: { value: string; label: string; after?: number }
  /**
   * People leaving: `count` small figures, each starting at one of `from` (chosen in proportion to `weight`),
   * walk out `reach` metres in a direction away from `away` over `ms`, and go.
   */
  scatter?: { from: { lon: number; lat: number; weight: number }[]; count: number; away: [number, number]; reach: [number, number]; ms?: number; delay?: number; fill?: string }
  /** Hold the site marks back until the growth count has finished. */
  marksAfterGrowth?: boolean
  /** Buildings drawn faintly, as context: the rest of the city, where it is a stand-in rather than a record. */
  faint?: GrowthBuilding[]
  /** Things that travel in as the stop arrives: a model from models.ts, moved from one [lon, lat] to another. */
  arrivals?: {
    model: string
    /** A straight glide from one point to another. */
    from?: [number, number]
    to?: [number, number]
    /** Or along one of the chapter's routes, by id, in the order of its points. */
    route?: string
    /** How long the journey takes; along a route, `loop` starts it again at the end. */
    ms?: number
    loop?: boolean
    /** Along a route: run it from its last point to its first. */
    reverse?: boolean
    /** Along a route: how long after the card opens it sets off, in ms (by default once the routes are drawn in). */
    after?: number
    scale?: number
    /** A fill colour, so a small thing reads at a distance. */
    fill?: string
    /** The card's `models` as they stand once this has arrived: a building can change colour at its coming. */
    then?: [string, string, string?][]
  }[]
  /**
   * Faint lines and names from a period map, laid on the ground to give the place its surroundings.
   * `note` says which map, of what date, and how it was put on the ground; it is shown in the card.
   */
  context?: { lines: [number, number][][]; minor?: [number, number][][]; burnArea?: [number, number][]; burnFrom?: [number, number]; /** Where the streets draw themselves in from, nearest first; left out, they are simply there. */ streetsFrom?: [number, number]; /** Parcel outlines, drawn as the lightest lines. */ parcels?: number[][][]; /** Boundaries drawn as solid ink lines on the ground, such as a neighbourhood's. */ outlines?: number[][][]; /** Major roads and bridges, drawn as heavier solid lines. */ roads?: number[][][]; /** Street edges, already cut at the crossings into block outlines. */ streets?: number[][][]; /** Street centrelines to fill in white on the ground, each about 20 m wide (a chain). */ streetFill?: number[][][]; /** How the streets are drawn, where the faint default is too light. */ streetStyle?: { width?: number; colour?: string; opacity?: number }; names: { text: string; along: [number, number][] }[]; note: string; sourceId: string }
  /** Longer dashed lines along a route, by id. One marked `drawIn` is drawn from its first point to its last as the stop arrives. */
  routes?: string[]
  /** The event in chapters.ts this stop tells, for its sources. */
  eventId?: string
  /** Source for a stop that has no event of its own. */
  sourceId?: string
}

export type LandTime = '1880s' | '1887' | '1900' | '1912' | '1917' | '1973' | '1986' | 'today'

export interface GrowthBuilding {
  name: string
  built: number | null
  /** A fill colour to pick the building out. */
  fill?: string
  /** The year the ground under the building existed, where it stands on fill. */
  ground?: number
  /** Over water, the building stands on piles at this floor height (metres above the sea). */
  piles?: boolean
  minBase?: number
  lon: number
  lat: number
  parts: { kind: 'prism'; x: number; y: number; ring: [number, number][]; h: number }[]
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
  /** Drawn in this colour instead of the map's ink. */
  colour?: string
  /** Once drawn in, erased again this many ms later: a line that was proposed and never built. */
  undrawAfter?: number
  /** Drawn as a railway: two rails with ties across them, laid from the first point to the last when `drawIn`. */
  track?: boolean
  /** True once a source confirms the line ran here. */
  located: boolean
  basis: string
  /** Shown in the card's notes when the line is not located. */
  caveat?: string
}

import { millAnnotations, millCentre, millTrack, millYardCentre } from './millSite'
import { cprLine1912 } from './cpr1912'
import { districtTo } from './district1912'
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
    sourceId: 'cva-371-3178',
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
    sourceId: 'cva-mi-p41',
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
    sourceId: 'cva-mi-p16',
  },
  {
    file: 'chapter-1/hastings-sawmill-1886_mi-p19.jpg',
    title: 'Hastings Sawmill',
    date: '1886',
    alt: 'The mill from the slope above it: board houses, the long mill shed with its stack, lumber stacked in the yard, and the water behind.',
    credit: CVA,
    ref: 'Mi P19',
    recordUrl: record('hastings-sawmill-2'),
    sourceId: 'cva-mi-p19',
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
    sourceId: 'cva-mi-p36',
  },
  {
    file: 'chapter-1/hastings-sawmill-wharf-c1887_mi-p24.jpg',
    title: 'Hastings Sawmill wharf',
    date: 'about 1887',
    alt: 'The wharf at the Hastings Sawmill.',
    credit: CVA,
    ref: 'Mi P24',
    recordUrl: record('hastings-sawmill-wharf'),
    sourceId: 'cva-mi-p24',
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
    sourceId: 'cva-dist-p11-1',
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
    sourceId: 'cva-dist-p14',
  },
]

/**
 * Granville in its last year before the fire. No photograph dated August 1885, the month of the
 * insurance map, was found; these are the nearest, both public domain.
 */
const granvillePhotos: Photo[] = [
  {
    file: 'chapter-1/maple-tree-square-june-1886_cva-256-06.jpg',
    title: 'Carrall Street and Powell Street, 1886',
    date: '7 June 1886',
    alt: 'Men standing under a large maple tree on a dirt square; a two-storey wooden store with a verandah on the left, a horse and cart in front of it.',
    note: 'Maple Tree Square, six days before the fire, ten months after the insurance map.',
    credit: `${CVA}, H. B. Abbott fonds`,
    ref: 'CVA 256-06',
    recordUrl: record('carrall-street-and-powell-street-1886-maple-tree-square'),
    sourceId: 'cva-256-06',
  },
  {
    file: 'chapter-1/sunnyside-hotel-float-1885_wat-p39.jpg',
    title: 'The Sunnyside Hotel float at the foot of Carrall Street',
    date: '1885',
    alt: 'A long plank walkway running out over still water to a float, with a small steamer and rowing boats beyond and a wooded point in the distance.',
    note: 'The float in front of the Sunnyside Hotel, the year of the map.',
    credit: CVA,
    ref: 'Wat P39',
    recordUrl: record('sunnyside-hotel-float-at-foot-of-carrall-street'),
    sourceId: 'cva-wat-p39',
  },
]

/** The city after the fire of 13 June 1886. Both public domain. */
const firePhotos: Photo[] = [
  {
    file: 'chapter-1/city-hall-tent-1886_lgn-1045.jpg',
    title: 'Mayor, council and city officials in front of the City Hall tent',
    date: 'probably September 1886',
    alt: 'Fifteen men in suits around two tables in front of a canvas tent with a sign reading City Hall; a board building on the right.',
    note: 'Mayor M. A. Maclean and council in front of the tent. Long dated 16 June 1886; the archive now puts it in early September 1886, from a newspaper article and a dated poster in the background.',
    credit: CVA,
    ref: 'LGN 1045',
    recordUrl: record('mayor-council-and-city-officials-assembled-in-front-of-tent'),
    sourceId: 'cva-lgn-1045',
  },
  {
    file: 'chapter-1/cordova-street-july-1886_str-p7.jpg',
    title: 'Cordova Street looking west from Carrall Street',
    date: 'July 1886',
    alt: 'A dirt street lined with new board buildings, timber stacked at the left, people in the road; business names are written in ink across the sky.',
    note: 'Five weeks after the fire. The names written across it, among them the Burrard Hotel, were added later by hand. The print is a 1928 copy.',
    credit: CVA,
    ref: 'Str P7',
    recordUrl: record('cordova-street-looking-west-from-carrall-street-july-1886-five-weeks-after-fire'),
    sourceId: 'cva-str-p7',
  },
]

/** The first train, 23 May 1887. Both public domain. */
const trainPhotos: Photo[] = [
  {
    file: 'chapter-1/first-train-crowds-1887_lgn-460.jpg',
    title: 'Crowds at the C.P.R. station for the first train',
    date: '23 May 1887',
    alt: 'A crowd lining a wharf and the tracks below a rock bluff, a locomotive and cars among them, the inlet and a long trestle behind.',
    credit: CVA,
    ref: 'LGN 460',
    recordUrl: record('crowds-at-c-p-r-station-viewing-arrival-of-first-train-in-vancouver'),
    sourceId: 'cva-lgn-460',
  },
  {
    file: 'chapter-1/engine-374-1887_can-p5.jpg',
    title: 'Engine 374 of the first passenger train',
    date: '23 May 1887',
    alt: 'Locomotive 374 hung with evergreen garlands and a portrait of Queen Victoria, its crew and other men standing beside it.',
    note: 'At the freight sheds at the foot of Richards and Seymour streets.',
    credit: CVA,
    ref: 'Can P5',
    recordUrl: record('engine-374-of-first-c-p-r-passenger-train-to-arrive-in-vancouver'),
    sourceId: 'cva-can-p5',
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
        // east of the 1912 atlas's sheets, a stand-in on today's tracks; then the line Goad's 1912
        // atlas draws, east to west, with the 1889 plan's track across the mill site
        ...approachFromEast.filter((p) => p[0] > cprLine1912[cprLine1912.length - 1][0]),
        ...[...cprLine1912].reverse().filter((p) => p[0] > millTrack[millTrack.length - 1][0]),
        ...[...millTrack].reverse(),
        ...[...cprLine1912].reverse().filter((p) => p[0] < millTrack[0][0]),
        // and on to the end of the line, the terminus marked on the map
        [-123.1135, 49.2862],
      ],
      drawIn: true,
      track: true,
      located: false,
      caveat: 'The line is from the 1912 atlas and the 1889 plan; east of Hastings Mill it is a stand-in on today\'s tracks.',
      basis:
        'From Granville Street to east of Hastings Mill, the line Goad\'s 1912 atlas draws, with the 1889 plan\'s track across the mill site; in 1887 much of it ran on a trestle over the tidal foreshore, later filled. East of that, a stand-in on today\'s tracks.',
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
      photos: granvillePhotos,
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
      photos: firePhotos,
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
      sites: ['terminus'],
      // the town as the 1889 plan draws it, two years on, and the mill, as the nearest record of what stood here
      models: [['mill', 'hastings-mill-1889'], ['saloon', 'byrnes-block-1889'], ['saloon', 'granville-1889']],
      // the rest of the city, faintly: the district as the chapter 2 count has it in 1887, a stand-in
      faint: districtTo(1887),
      routes: ['cpr-1887'],
      // the 1880s shore with the railway's roadbed built out along it
      land: '1887',
      context: {
        lines: [],
        names: [],
        streets: streets1887.edges,
        note: `The faint double lines are the streets of the city as surveyed by 1887, from the Ross and Ceperley map of the Canadian Pacific townsite, drawn on today's street lines where they lay on 1880s land. Many were lines on paper through stumps: a street on the map was not necessarily built. The shore is the 1880s one with the railway's roadbed added along it: the Canadian Pacific laid the line on fill and trestle over the beach below the bluff. The roadbed is drawn as a strip about 25 m wide along the line, a drawing choice; its real edges in 1887 have not been traced, and the beach behind it, which the line crossed on trestle, is drawn as ground. The buildings are the town between Cambie and Carrall and the mill as the 1889 fire insurance plan draws them, two years after the train: the nearest record of what stood here. The faint buildings around them are a stand-in for the rest of the city of 1887, which no digitized map records: they are buildings of Goad's 1912 atlas, the few the City's property records date to 1887 or before and a share of the undated ones, chosen at random, as the next chapter's count has them in 1887. Where they stand is not where the city of 1887 was.`,
        sourceId: 'cpr-townsite-1887',
      },
      photos: trainPhotos,
      eventId: 'cpr-arrival',
    },
  ],
}
