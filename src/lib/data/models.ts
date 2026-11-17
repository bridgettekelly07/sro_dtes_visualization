/**
 * Buildings drawn on the map for the early chapters, each built from a few
 * simple parts. They are massing studies: footprints from a scale plan where
 * there is one, forms from period photographs otherwise, and heights always
 * estimated. `evidence` says exactly what each one
 * rests on, so nothing here is mistaken for a survey.
 */

import { millSite1889, millSiteAnchor, millSiteEarly } from './millSite'
import { granvilleAnchor, granvilleBuildings1870 } from './granville1870'
import { granvilleBuildings1885, granvilleFootprints1885 } from './granville1885'
import { byrnesBlock1889, granvilleBuildings1889 } from './granville1889'

/** One piece of a building. Distances are metres; x and y are east and north of the site before the group is turned. */
export type Part =
  | { kind: 'gable' | 'hip'; x: number; y: number; w: number; d: number; eave: number; ridge: number; rot?: number }
  | { kind: 'box'; x: number; y: number; w: number; d: number; h: number; rot?: number; z0?: number; legs?: number; drop?: number; afloat?: boolean }

export interface BuildingModel {
  id: string
  name: string
  /** Turn of the whole group, in degrees anticlockwise, so that its y axis points the way the site faces. */
  bearing: number
  parts: Part[]
  /** What the model is drawn from, and how far that evidence goes. */
  evidence: string
  /** Where the photograph or drawing can be seen. */
  imageUrl?: string
  /** `plan`: footprints measured off a scale plan. `photo`: forms read from a photograph. `type`: a building of this kind, with no image of the building itself. */
  basis: 'plan' | 'photo' | 'type'
  /** Where the parts are measured from, as [lon, lat], when that is not the site the model is shown at. */
  anchor?: [number, number]
  /** The lowest level any part stands at, in metres above the sea: a yard built out on piles sits this high over water. */
  minBase?: number
  /** Stand each part on the ground where there is ground, and on piles at `minBase` only where it is over water. */
  piles?: boolean
}

export const models: BuildingModel[] = [
  {
    id: 'hastings-mill-1889',
    name: 'Hastings Mill, as surveyed in 1889',
    bearing: 0,
    basis: 'plan',
    anchor: millSiteAnchor,
    minBase: 2,
    piles: true,
    evidence:
      `Footprints, positions and orientations are measured off the 1889 fire insurance plan of the mill site (Dakin Publishing Co., sheet 13; City of Vancouver Archives, MAP 338, LEG1319.489), read by eye from the scan and good to a few metres. The plan was tied to the ground by Dunlevy Avenue and Railway Street. The ground under the yard is the plan's dry ground, which the 1885 fire insurance map's inset of the mill confirms; the corner the plan marks as still being filled is left as water. Roof forms and heights are estimates from the plan's storey counts and the 1872 photograph. This is the site in November 1889, two years after this chapter ends.`,
    imageUrl: 'https://searcharchives.vancouver.ca/plan-of-vancouver-1889-fire-map-hastings-saw-mill-to-dunlevy-avenue',
    parts: millSite1889,
  },
  {
    id: 'hastings-mill-early',
    name: 'Hastings Mill, before the railway',
    bearing: 0,
    basis: 'plan',
    anchor: millSiteAnchor,
    minBase: 2,
    piles: true,
    evidence:
      `Footprints, positions and orientations are measured off the 1889 fire insurance plan of the mill site (Dakin Publishing Co., sheet 13; City of Vancouver Archives, MAP 338, LEG1319.489), read by eye from the scan and good to a few metres. The plan was tied to the ground by Dunlevy Avenue and Railway Street. Roof forms and heights are estimates from the plan's storey counts and the 1872 photograph. For the 1860s and 1870s the 1889 layout is thinned to the mill, its engine house and stack, the wharf, the store, the boarding house and five dwellings, which is roughly what the 1872 photograph shows. Which of the 1889 buildings actually stood that early is not established.`,
    imageUrl: 'https://searcharchives.vancouver.ca/plan-of-vancouver-1889-fire-map-hastings-saw-mill-to-dunlevy-avenue',
    parts: millSiteEarly,
  },
  {
    id: 'granville-1870',
    name: 'Granville, as surveyed in March 1870',
    bearing: 0,
    basis: 'plan',
    anchor: granvilleAnchor,
    minBase: 1.5,
    piles: true,
    evidence:
      `Footprints, positions and orientations are measured off the 1870 Plan of the Town of Granville (J. B. Launders, Lands and Works Office; City of Vancouver Archives, MAP 978), read by eye from the scan and good to a metre or two. The plan was tied to the ground by its own scale bar and by Abbott, Water, Cordova and Cambie streets. It names only the Jail and the Custom House. The L-shaped building at the foot of Carrall Street is unnamed; it is taken to be Deighton's. Roofs and heights are assumed: the plan gives footprints only.`,
    imageUrl: 'https://searcharchives.vancouver.ca/plan-of-town-of-granville-burrard-inlet-b-c',
    parts: granvilleBuildings1870,
  },
  {
    id: 'granville-1885',
    name: 'Granville, as mapped in August 1885',
    bearing: 0,
    basis: 'plan',
    anchor: granvilleAnchor,
    minBase: 1.5,
    piles: true,
    evidence:
      `Footprints, positions and uses are read by eye off the Sanborn fire insurance map of August 1885 (City of Vancouver Archives, MAP 553). The map was fitted to the 1870 government plan by the four corners of the block between Abbott and Carrall; it draws that block about 5 m deeper than the survey does, so positions are good to a few metres. Only the main buildings are traced. Storeys are the map's; roof forms and heights in metres are assumed.`,
    imageUrl: 'https://searcharchives.vancouver.ca/granville-townsite-b-c-aug-1885',
    parts: granvilleBuildings1885,
  },
  {
    id: 'granville-1885-burned',
    name: 'Granville after the fire of 13 June 1886',
    bearing: 0,
    basis: 'plan',
    anchor: granvilleAnchor,
    evidence:
      `The footprints of the buildings on the August 1885 fire insurance map, left flat on the ground to stand for what the fire destroyed. More was built between that map and the fire, so this understates the loss.`,
    imageUrl: 'https://searcharchives.vancouver.ca/granville-townsite-b-c-aug-1885',
    parts: granvilleFootprints1885,
  },
  {
    id: 'byrnes-block',
    name: 'Byrnes Block, 1886 to 1887',
    bearing: 0,
    basis: 'plan',
    anchor: [-123.10459, 49.283263],
    evidence:
      `The building as it stands today: its footprint from the City's 2015 building footprints and its height (10.4 m) from the City's 2009 LiDAR, at 2 Water Street and 203-221 Carrall Street. It was built in 1886 to 1887 and enlarged after the railway arrived, so today's outline is larger than the first building.`,
    imageUrl: 'https://historicplaces.ca/en/rep-reg/place-lieu.aspx?id=2529',
    parts: [{ kind: 'box', x: 0, y: 0, w: 42.7, d: 21.8, h: 10.4, rot: 74.2 }],
  },
  {
    id: 'granville-1889',
    name: 'The rebuilt town between Cambie and Carrall, 1889',
    bearing: 0,
    basis: 'plan',
    anchor: granvilleAnchor,
    minBase: 1.5,
    piles: true,
    evidence:
      `Footprints, positions and storeys are read by eye off two sheets of the 1889 Dakin fire insurance plan (City of Vancouver Archives, LEG1319.479 and LEG1319.480), each fitted to the 1870 townsite plan by its lot lines. Positions are good to a few metres. Only the main buildings are traced; heights in metres and roof forms are assumed.`,
    imageUrl: 'https://searcharchives.vancouver.ca/plan-of-vancouver-1889-fire-map-water-street-to-abbott-street-to-dupont-street-to-carrall-street',
    parts: granvilleBuildings1889,
  },
  {
    id: 'byrnes-block-1889',
    name: 'Byrnes Block, as drawn in 1889',
    bearing: 0,
    basis: 'plan',
    anchor: granvilleAnchor,
    evidence:
      `The building at the south-west corner of Water and Carrall on the 1889 Dakin plan: two storeys, with a bakery and two saloons on the ground floor, drawn with heavy walls. Taken to be the Byrnes Block from its corner and its date; the plan does not name it. Smaller than the building today, which was added to later.`,
    imageUrl: 'https://searcharchives.vancouver.ca/plan-of-vancouver-1889-fire-map-water-street-to-abbott-street-to-dupont-street-to-carrall-street',
    parts: byrnesBlock1889,
  },
  {
    id: 'saloon-1867',
    name: 'Deighton\'s saloon, 1867',
    // Water Street runs about 15 degrees off east-west here.
    bearing: -15,
    basis: 'type',
    evidence:
      'No photograph of the 1867 Globe Saloon is held by the City of Vancouver Archives; the only image of it there is a newspaper drawing made in 1940. The Canadian Encyclopedia says only that mill workers put it up within a day, so it is drawn as a single small plank shed. Its size and position on the lot are assumed.',
    parts: [{ kind: 'gable', x: -7, y: -6, w: 7.5, d: 4, eave: 2.4, ridge: 3.6 }],
  },
  {
    id: 'deighton-canoe',
    name: 'Deighton\'s canoe',
    bearing: 0, // set from the way it is travelling
    basis: 'type',
    evidence:
      `The Canadian Encyclopedia has Deighton land by canoe with his wife, her mother and her cousin; an 1875 newspaper account adds a barrel of whisky, a dog and some hens. No drawing of the canoe exists. It is shown as a dugout about nine metres long with four seated figures and one barrel. Where it came ashore is not recorded beyond "near Stamp's Mill", so it is shown coming along the shore from the mill. On the map it is drawn larger than life so that it can be seen.`,
    parts: [
      // the hull, narrowing to bow and stern
      { kind: 'box', x: 0, y: 0, w: 1.05, d: 6.4, h: 0.45, afloat: true },
      { kind: 'box', x: 0, y: 3.7, w: 0.7, d: 1.0, h: 0.5, afloat: true },
      { kind: 'box', x: 0, y: -3.7, w: 0.7, d: 1.0, h: 0.5, afloat: true },
      { kind: 'box', x: 0, y: 4.55, w: 0.32, d: 0.7, h: 0.62, afloat: true },
      { kind: 'box', x: 0, y: -4.55, w: 0.32, d: 0.7, h: 0.62, afloat: true },
      // four people: a body and a head each
      ...[2.5, 1.1, -0.5, -2.9].flatMap((y): Part[] => [
        { kind: 'box', x: 0, y, w: 0.46, d: 0.32, h: 0.62, z0: 0.4, afloat: true },
        { kind: 'box', x: 0, y, w: 0.24, d: 0.24, h: 0.26, z0: 1.06, afloat: true },
      ]),
      // the paddles, bow and stern
      { kind: 'box', x: 0.62, y: 2.75, w: 0.07, d: 0.07, h: 1.35, z0: 0.05, afloat: true },
      { kind: 'box', x: -0.62, y: -2.65, w: 0.07, d: 0.07, h: 1.35, z0: 0.05, afloat: true },
      // the barrel
      { kind: 'box', x: 0, y: -1.65, w: 0.62, d: 0.62, h: 0.85, z0: 0.35, afloat: true },
    ],
  },
  {
    id: 'deighton-house-1886',
    name: 'Deighton House, before the fire',
    bearing: -15,
    basis: 'type',
    evidence:
      'The hotel itself is not in any photograph found so far. It is drawn as the kind of building the 1886 photograph of this corner shows next door: two storeys in wood, a hipped roof, a chimney, and a verandah roof on posts around the ground floor. Placed on the south-west corner of Carrall and Water, where the source puts it. Treat the form as typical of the corner, not as a portrait.',
    imageUrl: 'https://commons.wikimedia.org/wiki/File:Maple_Tree_Corner_Vancouver_1886.jpg',
    parts: [
      { kind: 'hip', x: -12, y: -11, w: 18, d: 12, eave: 6.4, ridge: 9 },
      { kind: 'box', x: -12, y: -11, w: 23, d: 17, h: 0.25, z0: 3.1, legs: 4.5 }, // verandah roof on posts
      { kind: 'box', x: -16, y: -11, w: 0.9, d: 0.9, h: 10.3 }, // chimney
    ],
  },
]
