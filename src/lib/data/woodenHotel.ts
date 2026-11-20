/**
 * A wooden hotel of the 1880s, as a type: a two-storey frame building with its gable to the street behind a
 * false front, a porch across the ground floor, sash windows and clapboard siding. No drawing or photograph
 * of the building it stands for is in the project, so nothing here is that building's own: it is what a
 * frame hotel in Granville looked like, drawn so the written record ("a wooden building") can be seen.
 *
 * Metres, x across the front, y back from the street (the front is at y = -d / 2), z up.
 */
import type { Part } from './models'

type V = [number, number, number]

export function woodenHotel(w = 9, d = 15): Extract<Part, { kind: 'solid' }> {
  const verts: V[] = []
  const tris: [number, number, number][] = []
  const lines: [number, number][] = []
  const v = (p: V) => verts.push(p) - 1
  const line = (a: V, b: V) => lines.push([v(a), v(b)])
  const quad = (a: V, b: V, c: V, e: V) => { const i = [v(a), v(b), v(c), v(e)]; tris.push([i[0], i[1], i[2]], [i[0], i[2], i[3]]) }
  const tri = (a: V, b: V, c: V) => tris.push([v(a), v(b), v(c)])
  const hw = w / 2, hd = d / 2, eave = 6.2, ridge = 8.4, top = 9.0, f = -hd, out = 0.05

  // the body: four walls and a gabled roof, its ridge running back from the street
  const c: V[] = [[-hw, f, 0], [hw, f, 0], [hw, hd, 0], [-hw, hd, 0]]
  for (let i = 0; i < 4; i++) {
    const a = c[i], b = c[(i + 1) % 4]
    quad(a, b, [b[0], b[1], eave], [a[0], a[1], eave])
    line(a, [a[0], a[1], eave]); line(a, b); line([a[0], a[1], eave], [b[0], b[1], eave])
  }
  quad([-hw, f, eave], [0, f, ridge], [0, hd, ridge], [-hw, hd, eave])
  quad([hw, f, eave], [0, f, ridge], [0, hd, ridge], [hw, hd, eave])
  tri([-hw, hd, eave], [hw, hd, eave], [0, hd, ridge])
  line([0, f, ridge], [0, hd, ridge]); line([-hw, hd, eave], [0, hd, ridge]); line([hw, hd, eave], [0, hd, ridge])

  // the false front: a flat wall across the gable, taller than the roof, with a plain cornice
  const ff = f - 0.12
  quad([-hw - 0.2, ff, 0], [hw + 0.2, ff, 0], [hw + 0.2, ff, top], [-hw - 0.2, ff, top])
  line([-hw - 0.2, ff, 0], [-hw - 0.2, ff, top]); line([hw + 0.2, ff, 0], [hw + 0.2, ff, top]); line([-hw - 0.2, ff, top], [hw + 0.2, ff, top])
  line([-hw - 0.35, ff - 0.25, top - 0.35], [hw + 0.35, ff - 0.25, top - 0.35]); line([-hw - 0.35, ff - 0.25, top], [hw + 0.35, ff - 0.25, top])
  line([-hw - 0.35, ff - 0.25, top - 0.35], [-hw - 0.35, ff - 0.25, top]); line([hw + 0.35, ff - 0.25, top - 0.35], [hw + 0.35, ff - 0.25, top])
  line([-hw - 0.2, ff, top], [-hw - 0.35, ff - 0.25, top]); line([hw + 0.2, ff, top], [hw + 0.35, ff - 0.25, top])

  // clapboards: a line every half metre up the front and the sides
  const y0 = ff - out
  for (let z = 0.5; z < top - 0.4; z += 0.5) line([-hw - 0.2, y0, z], [hw + 0.2, y0, z])
  for (const x of [-hw - out, hw + out]) for (let z = 0.5; z < eave; z += 0.5) line([x, f, z], [x, hd, z])

  // a rectangle on the front, and on a side wall
  const front = (x0: number, x1: number, z0: number, z1: number, y = y0 - 0.02) => {
    line([x0, y, z0], [x1, y, z0]); line([x1, y, z0], [x1, y, z1]); line([x1, y, z1], [x0, y, z1]); line([x0, y, z1], [x0, y, z0])
  }
  const sash = (x: number, z0: number, z1: number, half = 0.5) => {
    front(x - half, x + half, z0, z1)
    line([x - half, y0 - 0.02, (z0 + z1) / 2], [x + half, y0 - 0.02, (z0 + z1) / 2]); line([x, y0 - 0.02, z0], [x, y0 - 0.02, z1])
    line([x - half - 0.12, y0 - 0.02, z0 - 0.1], [x + half + 0.12, y0 - 0.02, z0 - 0.1]); line([x - half - 0.12, y0 - 0.02, z1 + 0.12], [x + half + 0.12, y0 - 0.02, z1 + 0.12])
  }
  // upstairs three sash windows; downstairs the door between two
  for (const x of [-hw * 0.6, 0, hw * 0.6]) sash(x, 4.0, 5.7)
  for (const x of [-hw * 0.6, hw * 0.6]) sash(x, 0.9, 2.6, 0.6)
  front(-0.55, 0.55, 0, 2.3); front(-0.4, 0.4, 1.1, 2.1); line([-0.55, y0 - 0.02, 2.55], [0.55, y0 - 0.02, 2.55]); front(-0.55, 0.55, 2.3, 2.55)
  // the name board over the porch
  front(-hw * 0.55, hw * 0.55, 6.6, 7.6)
  // windows down each side
  for (const x of [-hw - out - 0.02, hw + out + 0.02]) for (const z of [0.9, 4.0]) for (const y of [-hd * 0.55, -hd * 0.1, hd * 0.35]) {
    line([x, y - 0.45, z], [x, y + 0.45, z]); line([x, y + 0.45, z], [x, y + 0.45, z + 1.6]); line([x, y + 0.45, z + 1.6], [x, y - 0.45, z + 1.6]); line([x, y - 0.45, z + 1.6], [x, y - 0.45, z])
    line([x, y - 0.45, z + 0.8], [x, y + 0.45, z + 0.8])
  }

  // the porch: a boardwalk, four posts, and a lean-to roof across the front
  const p0 = ff - 2.2, pz = 3.0
  quad([-hw - 0.2, ff, pz + 0.5], [hw + 0.2, ff, pz + 0.5], [hw + 0.2, p0, pz], [-hw - 0.2, p0, pz])
  line([-hw - 0.2, p0, pz], [hw + 0.2, p0, pz]); line([-hw - 0.2, ff, pz + 0.5], [-hw - 0.2, p0, pz]); line([hw + 0.2, ff, pz + 0.5], [hw + 0.2, p0, pz]); line([-hw - 0.2, ff, pz + 0.5], [hw + 0.2, ff, pz + 0.5])
  for (let i = 0; i < 4; i++) {
    const x = -hw + (w * i) / 3
    line([x, p0 + 0.1, 0.25], [x, p0 + 0.1, pz])
    line([x - 0.3, p0 + 0.1, pz - 0.35], [x, p0 + 0.1, pz - 0.7]); line([x + 0.3, p0 + 0.1, pz - 0.35], [x, p0 + 0.1, pz - 0.7])
  }
  quad([-hw - 0.2, ff, 0.25], [hw + 0.2, ff, 0.25], [hw + 0.2, p0, 0.25], [-hw - 0.2, p0, 0.25])
  line([-hw - 0.2, p0, 0.25], [hw + 0.2, p0, 0.25]); line([-hw - 0.2, p0, 0], [hw + 0.2, p0, 0]); line([-hw - 0.2, p0, 0], [-hw - 0.2, p0, 0.25]); line([hw + 0.2, p0, 0], [hw + 0.2, p0, 0.25])
  for (let x = -hw + 0.6; x < hw; x += 0.6) line([x, ff, 0.25], [x, p0, 0.25])   // the boards of the walk

  return { kind: 'solid', x: 0, y: 0, verts, tris, lines }
}
