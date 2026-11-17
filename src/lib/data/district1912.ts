/**
 * The district coming up, year by year: every building of Goad's 1912 atlas, each rising in the year
 * given for it by scripts/build-goad-order.py. Where the City's property records give a year
 * (scripts/build-goad-years.py) it is used. Where no year is recorded, because the building has gone,
 * it is given one at random, spread evenly from 1887 to 1912 and in no order of place, so the district
 * fills in gradually; that year is a stand-in, not a record, and is the same on every card. Nothing
 * comes up before the ground under it was filled.
 */
import type { GrowthBuilding } from './stops'
import goad1912 from './goad1912.json'
import goad1912Years from './goad1912Years.json'

export const district = (['brick', 'frame'] as const).flatMap((kind) =>
  (goad1912[kind] as number[][][]).map((ring, i) => {
    const lon = ring.reduce((a, p) => a + p[0], 0) / ring.length
    const lat = ring.reduce((a, p) => a + p[1], 0) / ring.length
    return { kind, i, ring: ring as [number, number][], lon, lat, at: (goad1912Years.at[kind] as number[])[i] }
  }),
)
/** The atlas's buildings up to the end of `until`, leaving out any that `skip` says to. */
export const districtTo = (until: number, skip?: (b: (typeof district)[number]) => boolean): GrowthBuilding[] =>
  district
    .filter((b) => b.at < until + 1 && !skip?.(b))
    .map((b) => ({
      name: '',
      built: b.at,
      lon: b.lon,
      lat: b.lat,
      parts: [{ kind: 'prism', x: 0, y: 0, ring: b.ring, h: b.kind === 'brick' ? 11 : 7 }],
      // a shed out over the water stands on piles, its floor about 2 m above the sea
      piles: true,
      minBase: 2,
    }))
export const inRing = (lon: number, lat: number, ring: number[][]) => {
  let c = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) c = !c
  }
  return c
}
