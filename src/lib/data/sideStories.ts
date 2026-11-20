/**
 * The hotels' own histories, each followed from a card of the main story (stops.ts, SideStory): the map goes
 * to the hotel, a year is dragged, and the steps, the building and what stands round it follow.
 *
 * `story()` puts one together. The building is only its plot before the year it was built and after the year
 * it came down, and stands whole between. Around it are today's footprints that the property records date to
 * the year chosen or before (builtBy2025.json): survivors only, so early years look emptier than they were.
 *
 * Each step's facts are from the page named by its `sourceId`, read on the date in sources.ts; `note` says
 * what the pages read leave out.
 */
import type { GrowthBuilding, Pickable, SideStory } from './stops'
import builtBy2025 from './builtBy2025.json'
import landmarks from './landmarks.json'
import { inRing } from './district1912'
import { pickOf } from './hotelPicks'

type Ring = [number, number][]
const dated = (builtBy2025.buildings as { ring: Ring; h: number; built: number }[]).map((b) => ({
  ...b,
  lon: b.ring.reduce((a, q) => a + q[0], 0) / b.ring.length,
  lat: b.ring.reduce((a, q) => a + q[1], 0) / b.ring.length,
}))

/** What stands within a few blocks of a building in a given year, less the building itself. */
export function aroundOf(pick: Pickable): (year: number) => GrowthBuilding[] {
  const kx = 111_320 * Math.cos((pick.lat * Math.PI) / 180)
  const near = dated.filter((b) => Math.hypot((b.lon - pick.lon) * kx, (b.lat - pick.lat) * 111_200) < 420 && !pick.parts.some((p) => inRing(b.lon, b.lat, p.ring)))
  return (year) => near.filter((b) => b.built <= year).map((b) => ({ name: '', built: b.built, lon: b.lon, lat: b.lat, parts: [{ kind: 'prism' as const, x: 0, y: 0, ring: b.ring, h: b.h }] }))
}

/** A building that is not on the 2024 list (closed, burned or demolished), from the footprints picked for it. */
export function landmarkPick(key: 'balmoral' | 'regent' | 'winters', name: string, address: string, built: string): Pickable {
  const l = landmarks[key]
  return {
    name,
    lon: l.lon,
    lat: l.lat,
    parts: l.parts.map((p) => ({ ring: p.ring as Ring, h: p.h })),
    facts: [{ label: 'Address', value: address }, { label: 'Built', value: built }],
    note: 'The model is the footprint picked for this address, raised to its measured height; its floors and windows are drawn by rule, not from the building.',
  }
}

const SURVIVORS = "Around it are today's buildings that the property records say were standing by the year chosen; what has been demolished since is missing, so the early years look emptier than they were. The name over the building is the one it had in the year chosen, where a source gives it. Figures walking away stand for people put out; they are not a count. A red dashed line joins two places in a straight line, not along the streets taken."

/** One hotel's story: the years it runs over, when it was built (and, if it is gone, when it came down), and its steps. */
export function story(pick: Pickable, o: { label: string; built: number; gone?: number; from?: number; /** The compass side to see it from, for a building with no drawn front to say. */ face?: number; steps: SideStory['steps']; note: string }): SideStory {
  const first = Math.min(o.from ?? o.built, ...o.steps.map((s) => s.year))
  return {
    label: o.label,
    pick,
    span: [first, Math.max(2024, ...o.steps.map((s) => s.year))],
    steps: o.steps,
    stage: (year) => ({ built: year < o.built || (o.gone != null && year >= o.gone) ? ('plot' as const) : ('whole' as const), lower: year >= o.built && !(o.gone != null && year >= o.gone), from: o.face }),
    around: aroundOf(pick),
    note: `Drag the year to move through the building's life. Before ${o.built} only its plot is drawn${o.gone != null ? `, and again from ${o.gone}, when it came down` : ''}. ${SURVIVORS} ${o.note}`,
  }
}

export { pickOf }
