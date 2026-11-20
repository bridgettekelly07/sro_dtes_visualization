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
import landmarks from './landmarks.json'
import goad1912 from './goad1912.json'
import { footprintAt } from './district1912'
import viaducts1972 from './viaducts1972.json'
import expoParts from './expoParts.json'
import expo1986 from './expo1986.json'

/** One piece of a building. Distances are metres; x and y are east and north of the site before the group is turned. */
export type Part =
  | { kind: 'gable' | 'hip'; x: number; y: number; w: number; d: number; eave: number; ridge: number; rot?: number }
  | { kind: 'box'; x: number; y: number; w: number; d: number; h: number; rot?: number; z0?: number; legs?: number; drop?: number; afloat?: boolean }
  /** A building raised straight up from its real footprint: `ring` is [lon, lat] points, `h` the height in metres. x and y are unused. */
  | { kind: 'prism'; x: number; y: number; ring: [number, number][]; h: number; z0?: number; follow?: boolean }
  /** A curved form as a mesh, in metres from (x, y), z up from the ground: its triangles, and the lines drawn in ink. */
  | { kind: 'solid'; x: number; y: number; verts: [number, number, number][]; tris: [number, number, number][]; lines: [number, number][] }

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

const prisms = (key: keyof typeof landmarks): Part[] =>
  landmarks[key].parts.map((p) => ({ kind: 'prism' as const, x: 0, y: 0, ring: p.ring as [number, number][], h: p.h }))

type Solid = Extract<Part, { kind: 'solid' }>
/** A geodesic sphere: an icosahedron split `n` times and pushed out to radius `r`, centred `z` up. Every edge is drawn, as the struts of a geodesic dome are. */
function geodesic(r: number, z: number, n: number, x = 0, y = 0): Solid {
  const t = (1 + Math.sqrt(5)) / 2
  let v: number[][] = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]]
  let f: number[][] = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]]
  const norm = (p: number[]) => { const l = Math.hypot(p[0], p[1], p[2]); return [p[0] / l, p[1] / l, p[2] / l] }
  v = v.map(norm)
  for (let k = 0; k < n; k++) {
    const mid = new Map<string, number>()
    const m = (a: number, b: number) => {
      const key = a < b ? `${a}:${b}` : `${b}:${a}`
      if (!mid.has(key)) { v.push(norm([(v[a][0] + v[b][0]) / 2, (v[a][1] + v[b][1]) / 2, (v[a][2] + v[b][2]) / 2])); mid.set(key, v.length - 1) }
      return mid.get(key) as number
    }
    f = f.flatMap(([a, b, c]) => { const ab = m(a, b), bc = m(b, c), ca = m(c, a); return [[a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]] })
  }
  const edges = new Set<string>()
  for (const [a, b, c] of f) for (const [p, q] of [[a, b], [b, c], [c, a]]) edges.add(p < q ? `${p}:${q}` : `${q}:${p}`)
  return {
    kind: 'solid', x, y,
    verts: v.map(([a, b, c]) => [a * r, b * r, z + c * r] as [number, number, number]),
    tris: f as [number, number, number][],
    lines: [...edges].map((e) => e.split(':').map(Number) as [number, number]),
  }
}
/**
 * A sail: a tent of `n` sides, its base of radius `r` at `z0`, its peak `h` above at (x, y), the sides
 * drawn in so the fabric sweeps up to the peak, with a mast standing 3 m above it.
 */
function sail(x: number, y: number, r: number, z0: number, h: number, n = 8): Solid {
  const verts: [number, number, number][] = [[0, 0, z0 + h], [0, 0, z0 + h + 3]]
  // three rings: the base, and two drawn in, so each face curves up like stretched fabric
  const rings = [[1, 0], [0.45, 0.4], [0.18, 0.75]]
  for (const [k, t] of rings) for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; verts.push([Math.cos(a) * r * k, Math.sin(a) * r * k, z0 + h * t]) }
  const at = (ring: number, i: number) => 2 + ring * n + (i % n)
  const tris: [number, number, number][] = []
  const lines: [number, number][] = [[0, 1]]
  for (let i = 0; i < n; i++) {
    for (let ring = 0; ring < 2; ring++) {
      tris.push([at(ring, i), at(ring, i + 1), at(ring + 1, i + 1)], [at(ring, i), at(ring + 1, i + 1), at(ring + 1, i)])
      lines.push([at(ring, i), at(ring + 1, i)])
    }
    tris.push([at(2, i), at(2, i + 1), 0])
    lines.push([at(2, i), 0], [at(0, i), at(0, i + 1)])
  }
  return { kind: 'solid', x, y, verts, tris, lines }
}
/** A dome over a footprint: the ring drawn in to its middle in `bands` steps on a quarter-ellipse rising `h` from `z0`; the ink is a few rings and a radial line every `every` corners. */
function domeOver(ring: [number, number][], anchor: [number, number], z0: number, h: number, bands = 7, every = 4): Solid {
  const kx = 111_320 * Math.cos((anchor[1] * Math.PI) / 180)
  const ky = 111_200
  const pts = (ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1] ? ring.slice(0, -1) : ring).map(([lon, lat]) => [(lon - anchor[0]) * kx, (lat - anchor[1]) * ky])
  const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length
  const cy = pts.reduce((a, p) => a + p[1], 0) / pts.length
  const n = pts.length
  const verts: [number, number, number][] = []
  for (let b = 0; b < bands; b++) {
    const t = b / bands
    const k = Math.cos((t * Math.PI) / 2)
    const z = z0 + h * Math.sin((t * Math.PI) / 2)
    for (const [x, y] of pts) verts.push([cx + (x - cx) * k, cy + (y - cy) * k, z])
  }
  verts.push([cx, cy, z0 + h])
  const top = verts.length - 1
  const tris: [number, number, number][] = []
  const lines: [number, number][] = []
  for (let b = 0; b < bands - 1; b++)
    for (let i = 0; i < n; i++) {
      const a = b * n + i, c = b * n + ((i + 1) % n), d = (b + 1) * n + i, e = (b + 1) * n + ((i + 1) % n)
      tris.push([a, c, e], [a, e, d])
      if (b % 2 === 0) lines.push([a, c])
      if (i % every === 0) lines.push([a, d])
    }
  for (let i = 0; i < n; i++) {
    const a = (bands - 1) * n + i, c = (bands - 1) * n + ((i + 1) % n)
    tris.push([a, c, top])
    if (i % every === 0) lines.push([a, top])
  }
  return { kind: 'solid', x: 0, y: 0, verts, tris, lines }
}
/** A footprint's long axis, as a unit vector in metres east and north, and its length. */
function longAxis(ring: [number, number][], anchor: [number, number]) {
  const kx = 111_320 * Math.cos((anchor[1] * Math.PI) / 180)
  const pts = ring.map(([lon, lat]) => [(lon - anchor[0]) * kx, (lat - anchor[1]) * 111_200])
  const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length
  const cy = pts.reduce((a, p) => a + p[1], 0) / pts.length
  let sxx = 0, syy = 0, sxy = 0
  for (const [x, y] of pts) { sxx += (x - cx) ** 2; syy += (y - cy) ** 2; sxy += (x - cx) * (y - cy) }
  const a = 0.5 * Math.atan2(2 * sxy, sxx - syy)
  const u = [Math.cos(a), Math.sin(a)]
  const along = pts.map(([x, y]) => (x - cx) * u[0] + (y - cy) * u[1])
  return { u, c: [cx, cy], len: Math.max(...along) - Math.min(...along) }
}
const anchorOf = (key: 'science-world' | 'canada-place' | 'bc-place'): [number, number] => [landmarks[key].lon, landmarks[key].lat]
const footprintOf = (key: 'science-world' | 'canada-place' | 'bc-place') => landmarks[key].parts[0].ring as [number, number][]

/**
 * One of the Expo landmarks from its 2009 roof parts: each part a prism at its height, except the parts
 * that are the curved forms. Science World's tallest part is its sphere; BC Place's tallest is its dome;
 * Canada Place's pitched parts between 33 and 50 m are its sails.
 */
function expoBuilding(key: 'science-world' | 'canada-place' | 'bc-place'): Part[] {
  const anchor = anchorOf(key)
  const kx = 111_320 * Math.cos((anchor[1] * Math.PI) / 180)
  const ky = 111_200
  const parts = (expoParts as unknown as Record<string, { ring: [number, number][]; h: number; roof: string }[]>)[key]
  const local = (ring: [number, number][]) => ring.map(([lon, lat]) => [(lon - anchor[0]) * kx, (lat - anchor[1]) * ky])
  const centre = (pts: number[][]) => [pts.reduce((a, p) => a + p[0], 0) / pts.length, pts.reduce((a, p) => a + p[1], 0) / pts.length]
  const area = (pts: number[][]) => Math.abs(pts.reduce((a, p, i) => { const q = pts[(i + 1) % pts.length]; return a + p[0] * q[1] - q[0] * p[1] }, 0)) / 2
  const tallest = Math.max(...parts.map((p) => p.h))
  const out: Part[] = []
  for (const p of parts) {
    const pts = local(p.ring)
    const [cx, cy] = centre(pts)
    if (key === 'science-world' && p.h === tallest) {
      // the sphere: centred on its part, as wide as the part, its top at the part's height
      const r = pts.reduce((a, q) => a + Math.hypot(q[0] - cx, q[1] - cy), 0) / pts.length
      out.push(geodesic(r, p.h - r, 2, cx, cy))
      continue
    }
    if (key === 'bc-place' && p.h === tallest) {
      out.push({ kind: 'prism', x: 0, y: 0, ring: p.ring, h: 30 })
      out.push(domeOver(p.ring, anchor, 30, p.h - 30))
      continue
    }
    if (key === 'canada-place' && p.roof === 'Pitched' && p.h >= 33 && p.h <= 50 && area(pts) >= 200) {
      // a sail: a tent over its part, from the roof below it to the part's height
      const r = Math.sqrt(area(pts) / Math.PI)
      out.push({ kind: 'prism', x: 0, y: 0, ring: p.ring, h: 20 })
      out.push(sail(cx, cy, r, 20, p.h - 20 - 3))
      continue
    }
    out.push({ kind: 'prism', x: 0, y: 0, ring: p.ring, h: p.h })
  }
  return out
}

// Every building of 1912, raised to an assumed height: brick at three storeys, wood at two.
const goadFootprints = (rings: number[][][], h: number): Part[] =>
  rings.map((ring) => ({ kind: 'prism' as const, x: 0, y: 0, ring: ring as [number, number][], h }))

/**
 * Decks along centrelines: each line a ribbon `half` metres either side of it, offset left and right with
 * mitred corners so the bends are smooth, `depth` deep with its underside `z0` above the ground beneath it,
 * and a pier every `every` metres. Each deck is a prism followed by its piers, so a card can lay it in.
 */
function decksAlong(lines: number[][][], anchor: [number, number], half: number, depth: number, z0: number, every: number, pier: number): Part[] {
  const kx = 111_320 * Math.cos((anchor[1] * Math.PI) / 180)
  const ky = 111_200
  const parts: Part[] = []
  for (const line of lines) {
    const pts = line.map(([lon, lat]) => [(lon - anchor[0]) * kx, (lat - anchor[1]) * ky])
    // the direction at each point: the mean of the stretches either side
    const dirs = pts.map((_, i) => {
      const a = pts[Math.max(0, i - 1)]
      const b = pts[Math.min(pts.length - 1, i + 1)]
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
      return [(b[0] - a[0]) / len, (b[1] - a[1]) / len]
    })
    const left = pts.map((p, i) => [p[0] - dirs[i][1] * half, p[1] + dirs[i][0] * half])
    const right = pts.map((p, i) => [p[0] + dirs[i][1] * half, p[1] - dirs[i][0] * half])
    const ring = [...left, ...right.reverse()].map(([x, y]) => [anchor[0] + x / kx, anchor[1] + y / ky] as [number, number])
    parts.push({ kind: 'prism', x: 0, y: 0, ring, h: depth, z0, follow: true })
    // piers down to the ground along the line
    let carried = every / 2
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1]
      const [bx, by] = pts[i]
      const len = Math.hypot(bx - ax, by - ay)
      if (!len) continue
      let d = carried
      for (; d <= len; d += every) parts.push({ kind: 'box', x: ax + ((bx - ax) * d) / len, y: ay + ((by - ay) * d) / len, w: pier, d: pier, h: z0 })
      carried = d - len
    }
  }
  return parts
}

/** Each viaduct as one continuous deck: 15 m wide, 1.5 m deep, its underside 8 m up, a pier every 30 m. */
const viaductDecks = (anchor: [number, number]): Part[] =>
  decksAlong([viaducts1972.georgia as number[][], viaducts1972.dunsmuir as number[][]], anchor, 7.5, 1.5, 8, 30, 1.6)

/**
 * The SkyTrain's elevated line of 1985 as one centreline, from OpenHistoricalMap's track: the ways above
 * ground from just east of Stadium station, past Main Street station and along Terminal Avenue to the top of
 * the Grandview cut (west of there the line runs in the Dunsmuir tunnel and the open cut at Stadium, east of
 * there in the cut). OpenHistoricalMap draws each track as its own way; starting from the westmost, each way
 * is joined to the next whose start meets its end, so the line follows one track all the way and has no jog.
 */
export const guidewayLine: [number, number][] = (() => {
  const W = -123.1085, E = -123.069, S = 49.2618
  const kx = 111_320 * Math.cos((49.27 * Math.PI) / 180)
  const gap = (a: number[], b: number[]) => Math.hypot((a[0] - b[0]) * kx, (a[1] - b[1]) * 111_200)
  const ways = (expo1986.skytrain as { line: [number, number][]; tunnel: boolean }[])
    .filter((w) => !w.tunnel)
    .map((w) => (w.line[0][0] > w.line[w.line.length - 1][0] ? [...w.line].reverse() : w.line))
    .map((l) => l.filter((p) => p[0] >= W && p[0] <= E && p[1] >= S))
    .filter((l) => l.length >= 2)
    .sort((x, y) => x[0][0] - y[0][0])
  if (!ways.length) return []
  const line = ways[0].slice()
  const used = new Set([0])
  for (;;) {
    const last = line[line.length - 1]
    let best = -1
    let near = 8
    ways.forEach((w, i) => {
      if (used.has(i)) return
      const g = gap(w[0], last)
      if (g < near) [best, near] = [i, g]
    })
    if (best < 0) break
    used.add(best)
    line.push(...ways[best].slice(1))
  }
  return line
})()
const guidewayAnchor: [number, number] = [-123.1000, 49.2730]
/** The guideway: one deck 9 m wide for the two tracks along the line, its underside 7 m up, on piers every 30 m. */
const guideway = (): Part[] => decksAlong([guidewayLine], guidewayAnchor, 4.5, 1.8, 7, 30, 2)

export const models: BuildingModel[] = [
  {
    id: 'goad-1912',
    name: 'Every building in 1912',
    bearing: 0,
    basis: 'plan',
    anchor: [-123.1, 49.281],
    evidence: `Footprints read by colour from Goad's 1912 atlas, as georectified by the City of Vancouver: pink is brick, yellow is wood. Heights are assumed, as the atlas gives none: brick at about three storeys (11 m), wood at two (7 m). Neighbouring buildings that share walls sometimes read as one footprint.`,
    parts: [...goadFootprints(goad1912.brick, 11), ...goadFootprints(goad1912.frame, 7)],
  },
  {
    id: 'carnegie-1903',
    name: 'Carnegie Library, 1903',
    bearing: 0,
    basis: 'plan',
    anchor: [landmarks.carnegie.lon, landmarks.carnegie.lat],
    evidence: `The building as it stands today, raised from the City's footprint and 2009 LiDAR height. It is the 1903 library.`,
    parts: prisms('carnegie'),
  },
  {
    id: 'woodwards-1903',
    name: "Woodward's, Hastings and Abbott",
    bearing: 0,
    basis: 'type',
    anchor: [landmarks.woodwards.lon, landmarks.woodwards.lat],
    evidence: `The large brick building on the block north of Hastings between Abbott and Cambie in Goad's 1912 atlas: the store as it stood in 1912, after its first additions, raised to an assumed 20 m. The store of 1903 was smaller and the store of later years filled the block; neither outline has been traced. It was demolished in 2006 but for its oldest corner.`,
    parts: prisms('woodwards'),
  },
  {
    id: 'library-1957',
    name: 'Central library, 1957',
    bearing: 0,
    basis: 'plan',
    anchor: [landmarks['library-1957'].lon, landmarks['library-1957'].lat],
    evidence: `Today's footprint at the north-west corner of Burrard and Robson, 750 Burrard Street, on a lot the City's property records date to 1956: the central library that opened in 1957 and served until 1995. Its LiDAR height takes in the storeys added after the library left.`,
    parts: prisms('library-1957'),
  },
  {
    id: 'science-world-1986',
    name: 'Expo Centre, 1986 (Science World)',
    bearing: 0,
    basis: 'plan',
    anchor: anchorOf('science-world'),
    evidence: `The building's parts from the City's 2009 footprints, each at its own LiDAR height: the low wings and the pedestal raised as they are, and on the sphere's part a geodesic sphere centred on it, its radius the part's, its top at the part's height of 45 m. Every strut is drawn.`,
    parts: expoBuilding('science-world'),
  },
  {
    id: 'canada-place-1986',
    name: 'Canada Place, the Canada Pavilion of 1986',
    bearing: 0,
    basis: 'plan',
    evidence: `The building's parts from the City's 2009 footprints, each at its own LiDAR height. The pitched parts between 33 and 50 m, the five large and four small roof parts down the pier, are the sails: each drawn as a tent on a mast over its part, rising from the roof to the part's height. The rest, the deck building and, at the shore end, the hotel and the office tower, are raised as they are. The footprints take in the convention centre's later additions.`,
    anchor: anchorOf('canada-place'),
    parts: expoBuilding('canada-place'),
  },
  {
    id: 'bc-place-1986',
    name: 'BC Place stadium, as it was in 1986',
    bearing: 0,
    basis: 'plan',
    evidence: `The building's parts from the City's 2009 footprints, each at its own LiDAR height. The roof part is drawn as a dome over the oval, rising from the bowl at 30 m to the part's height of 63 m: the air-supported fabric roof of 1983, which the 2009 LiDAR still records, before the masts and retractable roof of 2011.`,
    anchor: anchorOf('bc-place'),
    parts: expoBuilding('bc-place'),
  },
  {
    id: 'cn-station-1919',
    name: 'Canadian Northern station, 1919',
    bearing: 0,
    basis: 'plan',
    anchor: [landmarks['cn-station'].lon, landmarks['cn-station'].lat],
    evidence: `Today's Pacific Central Station on the False Creek flats, opened in 1919 as the Canadian Northern's terminal, from the City's footprint and 2009 LiDAR height. The LiDAR height is the mean over the roof, lower than the central hall.`,
    parts: prisms('cn-station'),
  },
  {
    id: 'city-hall-1907',
    name: 'City Hall, 1898 to 1929',
    bearing: 0,
    basis: 'plan',
    anchor: [-123.10025, 49.28073],
    evidence: `The building marked City Hall in Goad's 1912 atlas: the old market hall on Westminster Avenue (Main Street), behind the Carnegie Library, the city hall from 1898 to 1929. Drawn at an assumed 14 m, about three storeys; its height has not been checked.`,
    parts: [{ kind: 'prism', x: 0, y: 0, ring: goad1912.brick[footprintAt('brick', -123.10025, 49.28073)] as [number, number][], h: 14 }],
  },
  {
    id: 'bcer-1912',
    name: 'BC Electric Railway terminal, as drawn in 1912',
    bearing: 0,
    basis: 'plan',
    anchor: [landmarks.bcer.lon, landmarks.bcer.lat],
    evidence: `The brick building at the junction of Hastings and Carrall in Goad's 1912 atlas, marked as the B.C. Electric Railway Company's offices, with the track curving into it. Raised to six storeys, about 24 m, as the heritage register describes it. Found in goad1912.json by the point of the junction.`,
    parts: [{ kind: 'prism', x: 0, y: 0, ring: goad1912.brick[footprintAt('brick', landmarks.bcer.lon, landmarks.bcer.lat)] as [number, number][], h: 24 }],
  },
  {
    id: 'bcer-1911',
    name: 'BC Electric Railway terminal, 1911',
    bearing: 0,
    basis: 'plan',
    anchor: [landmarks.bcer.lon, landmarks.bcer.lat],
    evidence: `Today's footprint at 425 Carrall Street. The 2009 LiDAR height there is not the building's, so it is drawn at six storeys, about 24 m, as the heritage register describes it. The footprint may take in more than the terminal.`,
    parts: prisms('bcer'),
  },
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
    id: 'passenger-train-1910',
    name: 'A Canadian Pacific passenger train',
    bearing: 0, // set from the way it is travelling
    basis: 'type',
    evidence: 'A locomotive, tender and four coaches at the lengths of the time, as a type: no particular train. Drawn a little larger than life so that it can be seen.',
    parts: [
      { kind: 'box', x: 0, y: 42, w: 3, d: 12, h: 4 },   // locomotive
      { kind: 'box', x: 0, y: 33, w: 3, d: 5, h: 3 },   // tender
      { kind: 'box', x: 0, y: 20, w: 3, d: 18, h: 4 },
      { kind: 'box', x: 0, y: 0, w: 3, d: 18, h: 4 },
      { kind: 'box', x: 0, y: -20, w: 3, d: 18, h: 4 },
      { kind: 'box', x: 0, y: -40, w: 3, d: 18, h: 4 },
    ],
  },
  {
    id: 'freight-train-1935',
    name: 'A freight train',
    bearing: 0, // set from the way it is travelling
    basis: 'type',
    evidence: 'A locomotive, tender and eight boxcars at the lengths of the time, as a type: the trekkers rode on top of cars like these. Drawn a little larger than life so that it can be seen.',
    parts: [
      { kind: 'box', x: 0, y: 56, w: 3, d: 12, h: 4 },   // locomotive
      { kind: 'box', x: 0, y: 47, w: 3, d: 5, h: 3 },   // tender
      { kind: 'box', x: 0, y: 38, w: 3, d: 11, h: 3.6 },
      { kind: 'box', x: 0, y: 25, w: 3, d: 11, h: 3.6 },
      { kind: 'box', x: 0, y: 12, w: 3, d: 11, h: 3.6 },
      { kind: 'box', x: 0, y: -1, w: 3, d: 11, h: 3.6 },
      { kind: 'box', x: 0, y: -14, w: 3, d: 11, h: 3.6 },
      { kind: 'box', x: 0, y: -27, w: 3, d: 11, h: 3.6 },
      { kind: 'box', x: 0, y: -40, w: 3, d: 11, h: 3.6 },
      { kind: 'box', x: 0, y: -53, w: 3, d: 11, h: 3.6 },
    ],
  },
  {
    id: 'steamship-1910',
    name: 'A Pacific steamship',
    bearing: 0, // set from the way it is travelling
    basis: 'type',
    evidence: "A hull, superstructure and funnels at about the size of the Canadian Pacific's Empress liners of the 1890s to 1910s, as a type: no particular ship. Drawn a little larger than life so that it can be seen.",
    parts: [
      { kind: 'box', x: 0, y: 0, w: 13, d: 130, h: 7, afloat: true },        // hull
      { kind: 'box', x: 0, y: 60, w: 6, d: 10, h: 3, afloat: true },        // bow, narrowing
      { kind: 'box', x: 0, y: -2, w: 9, d: 60, h: 4, z0: 7, afloat: true },  // superstructure
      { kind: 'box', x: 0, y: 12, w: 3, d: 3, h: 7, z0: 11, afloat: true },  // funnels
      { kind: 'box', x: 0, y: -14, w: 3, d: 3, h: 7, z0: 11, afloat: true },
    ],
  },
  {
    id: 'streetcar-1955',
    name: 'A streetcar',
    bearing: 0, // set from the way it is travelling
    basis: 'type',
    evidence: 'A single car at the length of the BC Electric cars of the 1950s, as a type: no particular car. Drawn larger than life so that it can be seen.',
    parts: [{ kind: 'box', x: 0, y: 0, w: 2.6, d: 15, h: 3.4 }],
  },
  {
    id: 'viaducts-1972',
    name: 'The Georgia and Dunsmuir viaducts, 1972',
    bearing: 0,
    basis: 'plan',
    anchor: [-123.1035, 49.2774],
    evidence: "Each viaduct as one deck along its centreline from the City's street data, which keeps the 1972 alignment: 15 m wide, 1.5 m deep, kept 8 m above the ground beneath it, on piers every 30 m. The real deck ran at its own grade, meeting the ground at each end; that profile is not traced.",
    parts: viaductDecks([-123.1035, 49.2774]),
  },
  {
    id: 'skytrain-1985',
    name: 'The SkyTrain guideway, 1985',
    bearing: 0,
    basis: 'plan',
    anchor: guidewayAnchor,
    evidence: "The elevated stretch of the first line, on OpenHistoricalMap's track dated 11 December 1985, from just east of Stadium station past Main Street station and along Terminal Avenue to the Grandview cut: one deck 9 m wide for the two tracks, 1.8 m deep, its underside kept 7 m above the ground beneath it, on piers every 30 m. Its real height varies along the line and is not traced; which stretches stand on the guideway and which run at grade is read from the line's course, not from a survey.",
    parts: guideway(),
  },
  {
    id: 'skytrain-car-1985',
    name: 'A SkyTrain',
    bearing: 0, // set from the way it is travelling
    basis: 'type',
    evidence: "A four-car train of the first line's Mark I cars, each about 12.7 m long and 2.5 m wide, as a type: no particular train. It rides on the deck of the modelled guideway, 8.8 m up.",
    parts: [-19.2, -6.4, 6.4, 19.2].map((y) => ({ kind: 'box' as const, x: 0, y, w: 2.5, d: 12.2, h: 3.2, z0: 8.8 })),
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
