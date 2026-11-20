<script lang="ts">
  /**
   * The story told on the map, chapter after chapter. The map stays fixed behind the page; the text
   * for each stop scrolls past on the left, and as a stop reaches the middle of
   * the window the camera flies to its view and its sites appear on the ground.
   *
   * The map does not respond to the pointer here, so that scrolling anywhere
   * on the page moves the story and never zooms the map.
   */
  import { onMount, untrack } from 'svelte'
  import Map3D from './Map3D.svelte'
  import StopPhotos from './StopPhotos.svelte'
  import ChapterRail from './ChapterRail.svelte'
  import { loadAll } from './data.js'
  import { makeProj, mapBbox } from './projection.js'
  import { css, hexOf } from './colours.js'
  import { WATER } from './groundTexture.js'
  import { PARK } from './parkShade.js'
  import { shoreOutline } from './terrain.js'
  import { layoutAnnotation, type GroundLabel } from './annotate'
  import type { GrowthBuilding, LandTime, MapChapter, Pickable, SideStory, Site, StoryScene } from '../data/stops'
  import { frontBearing } from './hotelFront.js'
  import { chapters } from '../data/chapters'
  import { sourceById } from '../data/sources'
  import { models as buildingModels, type Part } from '../data/models'

  let { story }: { story: MapChapter[] } = $props()

  // Every card of every chapter in one run, and which chapter each belongs to.
  const stops = $derived(story.flatMap((c) => c.stops))
  const chapterOf = $derived(story.flatMap((c) => c.stops.map(() => c)))
  const firstOf = $derived(story.map((c) => stops.indexOf(c.stops[0])))
  const numberOf = (id: string) => chapters.find((c) => c.id === id)?.index ?? 0

  // Charcoal washes: grey, quiet, and the water darkening away from shore.
  WATER.tint = 0
  WATER.deep = 0.5
  WATER.deepM = 1400
  WATER.mottle = 0.11
  WATER.mottle2 = 0.02
  PARK.mottle = 0.07
  PARK.grain = 0.02

  let data = $state.raw<any>(null)
  // No extra lines are drawn on the ground for now. The 1880s shoreline used to be one, laid over
  // today's water's edge; the water itself is now cut to that shoreline instead (see below).
  const oldShore: number[][][] = []
  let todayShore: number[][][] = []
  const noStreets: number[][][] = []
  let thenShore: number[][][] = []
  // land-and-water masks by time: the 1880s one is loaded with the map, the others after
  const lands: Partial<Record<LandTime, unknown>> = {}
  const shoreLines: Partial<Record<LandTime, number[][][]>> = {}
  // the lettering present at every stop: the two shorelines' names
  let baseLabels: GroundLabel[] = []
  const OLD_SHORE = 'SHORELINE 1880S'
  onMount(async () => {
    // Street names are painted into images, so the typeface has to have arrived before the map is built.
    await Promise.all([document.fonts.load('700 40px "din-2014-narrow"'), document.fonts.load('700 96px "din-2014"')]).catch(() => {})
    const loaded = await loadAll()
    let terrain = loaded.terrain
    if (story.some((c) => c.oldShoreline) && terrain) {
      // Before swapping, trace today's shoreline from today's mask, to dot it in over the older one.
      // The outline comes in mask cells (x east, y south from the north-west corner).
      const [west, south, east, north] = terrain.bbox
      const { nx, ny } = terrain.land
      todayShore = (shoreOutline(terrain) ?? []).map((ring: number[][]) => {
        const line = ring.filter((_, i) => i % 3 === 0).map(([x, y]) => [west + (x / nx) * (east - west), north - (y / ny) * (north - south)])
        return [...line, line[0]]
      })
      // Swap today's land-and-water mask for the 1880s one, so the map shows water where the
      // city has since filled it in. The heights stay as they are; filled ground is drawn at sea level.
      try {
        const response = await fetch(`${import.meta.env.BASE_URL}data/district/land-1880s.json`)
        lands.today = terrain.land   // today's mask, kept for the cards of the late 1980s on
        terrain = { ...terrain, land: await response.json() }
        lands['1880s'] = terrain.land
        // the shorelines of later times, swapped in by the cards that need them
        for (const key of ['1887', '1900', '1912', '1917', '1973', '1986'] as const) {
          fetch(`${import.meta.env.BASE_URL}data/district/land-${key}.json`)
            .then((r) => r.json())
            .then((m) => {
              lands[key] = m
              // its shoreline as lines too, for lettering along it
              shoreLines[key] = (shoreOutline({ ...terrain, land: m }) ?? []).map((ring: number[][]) => {
                const line = ring.filter((_, i) => i % 3 === 0).map(([x, y]) => [west + (x / nx) * (east - west), north - (y / ny) * (north - south)])
                return [...line, line[0]]
              })
            })
            .catch(() => {})
        }
        // the 1880s water's edge as lines too, to letter its name along it
        thenShore = (shoreOutline(terrain) ?? []).map((ring: number[][]) => {
          const line = ring.filter((_, i) => i % 3 === 0).map(([x, y]) => [west + (x / nx) * (east - west), north - (y / ny) * (north - south)])
          return [...line, line[0]]
        })
      } catch {
        // keep today's shoreline if the file cannot be read
      }
    }
    data = { ...loaded, terrain, trees: null }
  })
  const proj = $derived(data?.streets ? makeProj(mapBbox(data.surveyed, data.streets.bbox)) : null)
  const ready = $derived(!!(data && proj && data.surveyed.length && data.foot))
  const colourOf = () => hexOf(css('--m3-bldg'))

  let map = $state<{ fly: (view: object, ms?: number) => void; marks: (sites: object[], paths: number[][][], lines?: number[][][], accent?: number[][][]) => void; land: (mask: unknown, ms?: number) => void; bridges: (on: boolean) => void; dots: (list: { lon: number; lat: number; r: number }[]) => void; screenOf: (lon: number, lat: number, h?: number) => { x: number; y: number; on: boolean } | null; streetFill: (lines: number[][][], w?: number, style?: object) => void; edges: (e?: { width?: number; colour?: string }) => void; models: (list: object[]) => void; dotted: (lines: number[][][]) => void; groundText: (labels: object[]) => void; fine: (groups: object[]) => void; burn: (area: object | null) => void; burnReach: (m: number) => void; burnOpacity: (o: number) => void }>()
  let mapReady = $state(false)
  let fail = $state('')
  let active = $state(0)
  // the year a stop's growth has reached, shown large over the map while it runs
  let yearShown = $state<number | null>(null)
  // a card's figure, shown large once the camera has settled
  let statShown = $state<{ value: string; label: string } | null>(null)

  const siteById = $derived(new Map(story.flatMap((c) => c.sites).map((s) => [s.id, s])))
  const event = (id?: string) => chapters.flatMap((c) => c.events).find((e) => e.id === id)

  // The stop nearest the middle of the window is the active one.
  let sections = $state<HTMLElement[]>([])
  onMount(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) active = Number((entry.target as HTMLElement).dataset.index)
        }
      },
      { rootMargin: '-50% 0px -50% 0px' },
    )
    sections.forEach((el) => el && observer.observe(el))
    // Scrolling settles on the next card, centred in the window.
    const root = document.documentElement
    root.style.scrollSnapType = 'y mandatory'
    return () => {
      observer.disconnect()
      root.style.scrollSnapType = ''
    }
  })

  // Move the camera and redraw the marks whenever the active stop changes.
  const routeById = $derived(new Map(story.flatMap((c) => c.routes).map((r) => [r.id, r])))
  let first = true
  let drawing = 0 // the route animation in flight, so a newer stop can cancel it
  // what the last card left standing, so the next can sink it as it arrives
  // A building chosen on the map: the camera goes in to it and a panel says what is recorded about it.
  let focus = $state<Pickable | null>(null)
  let overPick = $state(false)
  // a building's own history being followed from a card, and the step it is at
  let side = $state<{ story: SideStory; year: number } | null>(null)
  // the same, kept apart from the reactive `side` for the map's own use
  let sideNow: { story: SideStory; year: number } | null = null
  let lastMarks: [object[], number[][][], number[][][]?, number[][][]?] | null = null
  let sceneStep = -1
  let sceneWide = false
  let dotsRun = 0
  /** The scene of the step the year has reached: the name over the door, places named, a path, people leaving. */
  const sceneFor = (s: { story: SideStory; year: number }, again = false) => {
    const k = stepAt(s.story, s.year)
    if (k === sceneStep && !again) return
    sceneStep = k
    const p = s.story.pick
    const scene: StoryScene = s.story.steps[k].scene ?? {}
    // the name stays until a later step changes it
    const name = s.story.steps.slice(0, k + 1).findLast((q) => q.scene?.name)?.scene?.name ?? p.name
    const tall = Math.max(...p.parts.map((q) => q.h))
    const site = (label: string, lon: number, lat: number, stem: number) => ({ id: label, label, lon, lat, stem, rise: 5, located: true, basis: '' })
    // a step that reaches beyond the building (other places, a path, people leaving) is seen from above, wide
    // enough to take them in; the others from the street
    const reach: [number, number][] = [...(scene.places ?? []).map((q): [number, number] => [q.lon, q.lat]), ...(scene.path ?? [])]
    const wide = reach.length > 0 || !!scene.leaving
    if (wide) {
      const kx0 = 111_320 * Math.cos((p.lat * Math.PI) / 180)
      const all: [number, number][] = [[p.lon, p.lat], ...reach]
      const lon = (Math.min(...all.map((q) => q[0])) + Math.max(...all.map((q) => q[0]))) / 2
      const lat = (Math.min(...all.map((q) => q[1])) + Math.max(...all.map((q) => q[1]))) / 2
      const span = Math.max(...all.map((q) => Math.hypot((q[0] - lon) * kx0, (q[1] - lat) * 111_200)))
      map?.fly({ lon, lat, dist: Math.max(260, span * 3.4 + 160), theta: Math.PI / 2, phi: 0.95, offsetX: lastFly?.offsetX ?? 0 }, 1800)
    } else if (sceneWide) focusOn(p, sideFrom, s.story.stage?.(s.year).subject)
    sceneWide = wide
    map?.marks([site(name, p.lon, p.lat, tall + 1.5), ...(scene.places ?? []).map((q) => site(q.label, q.lon, q.lat, q.stem ?? 14))], [], [], scene.path ? [scene.path] : [])
    // figures walking away from the building
    const run = ++dotsRun
    const n = scene.leaving ?? 0
    if (!n) { map?.dots([]); return }
    const kx = 111_320 * Math.cos((p.lat * Math.PI) / 180)
    const going = Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2 + 0.5; return [Math.cos(a), Math.sin(a), 30 + ((i * 37) % 45)] })
    const t0 = performance.now()
    const tick = (now: number) => {
      if (run !== dotsRun || !sideNow) return
      const t = Math.min(1, (now - t0) / 7000)
      map?.dots(going.map(([x, y, d]) => ({ lon: p.lon + (x * (10 + d * t)) / kx, lat: p.lat + (y * (10 + d * t)) / 111_200, r: 3.2 })))
      if (t < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }
  const stepAt = (story: SideStory, year: number) => Math.max(0, story.steps.findLastIndex((s) => s.year <= year))
  let lastSent: { lon: number; lat: number }[] = []
  let lastFly: { view: object; offsetX: number } | null = null
  // the same building, kept apart from the reactive `focus` so that drawing a card does not come to depend on it
  let focusNow: Pickable | null = null
  const isFocus = (m: { lon: number; lat: number }) => !!focusNow && m.lon === focusNow.lon && m.lat === focusNow.lat
  /**
   * The list as the map gets it. With a building chosen it stands alone: white, its street fronts drawn from
   * its photograph; whatever stands across its streets is taken away so it can be seen from them, and the
   * rest of the city is left as pale outlines.
   */
  const withFocus = <T extends { lon: number; lat: number }>(list: T[]): T[] => {
    const p = focusNow
    if (!p) return list
    const kx = 111_320 * Math.cos((p.lat * Math.PI) / 180)
    // each front's outward direction (east, north) and how far the building reaches that way
    const fronts = (p.front?.faces ?? []).map((f) => {
      const n = [Math.sin((f.toward * Math.PI) / 180), Math.cos((f.toward * Math.PI) / 180)]
      const reach = Math.max(...p.parts.flatMap((q) => q.ring.map(([lon, lat]) => (lon - p.lon) * kx * n[0] + (lat - p.lat) * 111_200 * n[1])))
      return { n, reach }
    })
    // a building followed through the years: how much of it is up in the year chosen, whether its photograph
    // has been taken yet, and what stands around it then
    const st = sideNow
    const tall = Math.max(...p.parts.map((q) => q.h))
    const stage = st?.story.stage?.(st.year)
    const frame = stage && typeof stage.built === 'object' ? stage.built.frame : 0
    const up = stage ? (stage.built === 'plot' ? 0 : 1) : st?.story.rise ? Math.max(0, Math.min(1, (st.year - st.story.rise[0]) / Math.max(1e-6, st.story.rise[1] - st.story.rise[0]))) : 1
    // the fronts are drawn in line; the photograph stays in the panel beside the map and is not laid on the model
    const front = p.front && up >= 1 && !frame ? { ...p.front, faces: p.front.faces.map(({ photo: _, ...f }) => f) } : null
    const look = { fill: '#ffffff', faint: false, ...(frame ? { frame } : front ? { front } : up >= 1 ? { detail: true } : {}) }
    const parts = p.parts.map((q) => ({ kind: 'prism' as const, x: 0, y: 0, ring: q.ring, h: q.h === tall ? Math.max(0.05, q.h * up) : stage && stage.lower === false ? 0.05 : q.h }))
    // what else the year's record calls for: a building that stood there before
    const extras = (stage?.extras ?? []) as unknown as T[]
    if (st?.story.around) list = st.story.around(st.year).map((b) => ({ lon: b.lon, lat: b.lat, bearing: 0, minBase: 0, parts: b.parts }) as unknown as T)
    // a card that does not draw the building itself still shows it once chosen
    const standIn = list.some(isFocus) ? [] : [{ lon: p.lon, lat: p.lat, bearing: 0, minBase: 0, parts, ...look } as unknown as T]
    return [...extras, ...standIn, ...list].flatMap((m): T[] => {
      if (extras.includes(m)) return [m]
      if (isFocus(m)) return [{ ...m, ...(st ? { parts } : {}), ...look }]
      const x = (m.lon - p.lon) * kx, y = (m.lat - p.lat) * 111_200
      if (Math.hypot(x, y) < 260 && fronts.some((f) => x * f.n[0] + y * f.n[1] > f.reach + 6)) return []
      return [{ ...m, fill: undefined, faint: true }]
    })
  }
  /** The pickable building under a point of the window, if any: the one whose outline on screen is smallest. */
  /** The side stories a card carries. */
  const talesOf = (stop: (typeof stops)[number] | undefined): SideStory[] => (stop ? [...(stop.sideStory ? [stop.sideStory] : []), ...(stop.sideStories ?? [])] : [])
  const pickAt = (x: number, y: number): Pickable | null => {
    // the buildings that can be chosen on this card: those it lists, and the hotel of each of its side stories
    const list = [...(stops[active]?.pickable ?? []), ...talesOf(stops[active]).map((t) => t.pick)]
    if (!list.length || !map) return null
    let best: Pickable | null = null
    let size = Infinity
    for (const p of list) {
      let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity]
      for (const part of p.parts)
        for (const [lon, lat] of part.ring)
          for (const h of [0, part.h]) {
            const q = map.screenOf(lon, lat, h)
            if (!q || !q.on) continue
            x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y)
          }
      if (x < x0 - 5 || x > x1 + 5 || y < y0 - 5 || y > y1 + 5) continue   // a little room round a small building
      const area = (x1 - x0) * (y1 - y0)
      if (area < size) [best, size] = [p, area]
    }
    return best
  }
  const offMap = (e: MouseEvent) => !!(e.target as HTMLElement).closest('article, nav, button, a, summary, details')
  // the compass side the camera last stood on for a side story, so it turns only when a year asks for another
  let sideFrom: number | undefined
  const focusOn = (p: Pickable, from?: number, subject?: { lon: number; lat: number; size: number; tall: number }) => {
    focus = focusNow = p
    map?.models(withFocus(lastSent))
    const tall = Math.max(...p.parts.map((q) => q.h))
    const main = p.parts.filter((q) => q.h >= tall * 0.7)   // the building itself, not a low wing behind it
    const kx = 111_320 * Math.cos((p.lat * Math.PI) / 180)
    const pts = main.flatMap((q) => q.ring)
    const mid = { lon: (Math.min(...pts.map((q) => q[0])) + Math.max(...pts.map((q) => q[0]))) / 2, lat: (Math.min(...pts.map((q) => q[1])) + Math.max(...pts.map((q) => q[1]))) / 2 }
    // stand in the street the building fronts, or on the corner between its two streets, a little above eye level
    let dir = [0, -1]
    if (from != null || p.front) {
      const b = ((from ?? frontBearing(p.front!)) * Math.PI) / 180
      dir = [Math.sin(b), Math.cos(b)]
    }
    // far enough back to take in its height, and its width as seen from there
    const wide = Math.max(...pts.map(([lon, lat]) => Math.abs((lon - mid.lon) * kx * dir[1] - (lat - mid.lat) * 111_200 * dir[0]))) * 2
    const fov = Math.tan((20 * Math.PI) / 180)
    // how far its front stands toward the camera from its middle
    const reach = Math.max(...pts.map(([lon, lat]) => (lon - mid.lon) * kx * dir[0] + (lat - mid.lat) * 111_200 * dir[1]))
    const room = 1 - 2 * Math.abs(lastFly?.offsetX ?? 0)   // the share of the window left beside the panel
    // a building with no drawn front is seen from further back, whole
    const dist = (Math.max((tall * 1.25) / (2 * fov), (wide * 1.15) / (2 * fov * (window.innerWidth / window.innerHeight) * Math.max(0.35, room))) + 6) * (p.front ? 1 : 1.6) * (sideNow ? 1.45 : 1)   // a side story stands back, for the names and places it puts round the building
    if (subject) {
      // something else stands in for the building in this year (what was there before it): frame that, with room to see round it
      const d = Math.max((subject.tall * 2.4) / (2 * fov), (subject.size * 2.6) / (2 * fov * (window.innerWidth / window.innerHeight) * Math.max(0.35, room))) + 10
      map?.fly({ lon: subject.lon, lat: subject.lat, dist: d, theta: Math.atan2(-dir[1], dir[0]), phi: 1.4, lift: subject.tall * 0.4, offsetX: lastFly?.offsetX ?? 0 }, 1800)
      return
    }
    // theta turns the camera about the place: east is 0, south a quarter turn on
    // look at the front itself, so a deep building is framed by its face and not by its middle
    map?.fly({ lon: mid.lon + (dir[0] * reach) / kx, lat: mid.lat + (dir[1] * reach) / 111_200, dist, theta: Math.atan2(-dir[1], dir[0]), phi: 1.47, lift: tall * 0.45, offsetX: lastFly?.offsetX ?? 0 }, 1800)
  }
  const follow = (story: SideStory) => {
    side = sideNow = { story, year: story.span[0] }
    sideFrom = story.stage?.(story.span[0]).from
    sceneWide = false
    focusOn(story.pick, sideFrom, story.stage?.(story.span[0]).subject)
    sceneFor(sideNow, true)
    burnFor(sideNow)
  }
  /** Ground the year's record shows as burned. */
  const burnFor = (s: { story: SideStory; year: number }) => {
    const ring = s.story.pick.parts.reduce((a, q) => (q.h > a.h ? q : a)).ring
    const poly = s.story.stage?.(s.year).burn ?? (s.story.steps[stepAt(s.story, s.year)].scene?.burn ? ring : undefined)
    map?.burn(poly ? { poly, from: poly[0], colour: '#2a2a2a', opacity: 0.42, reach: 1e6 } : null)
  }
  /** The year chosen on a side story's slider: the building and what stands round it are drawn for that year. */
  const setYear = (year: number) => {
    if (!sideNow) return
    side = sideNow = { ...sideNow, year }
    // a year can ask to be seen from another side (the burned town lies west of the wooden hotel)
    const from = sideNow.story.stage?.(year).from
    if (from !== sideFrom) { sideFrom = from; focusOn(sideNow.story.pick, from, sideNow.story.stage?.(year).subject) } else map?.models(withFocus(lastSent))
    burnFor(sideNow)
    sceneFor(sideNow)
  }
  const unfocus = () => {
    if (!focusNow) return
    focus = focusNow = null
    if (sideNow) { map?.burn(null); dotsRun++; map?.dots([]); if (lastMarks) map?.marks(...lastMarks) }
    side = sideNow = null
    map?.models(lastSent)
    if (lastFly) map?.fly({ ...lastFly.view, offsetX: lastFly.offsetX }, 1600)
  }
  let lastShown: { lon: number; lat: number; bearing: number; parts: Part[]; minBase: number; piles?: boolean; fill?: string; faint?: boolean }[] = []

  /** The first `share` of a line, by length, ending on an interpolated point. */
  function partial(points: [number, number][], share: number): number[][] {
    const lengths = points.slice(1).map((p, i) => Math.hypot(p[0] - points[i][0], p[1] - points[i][1]))
    let remaining = lengths.reduce((a, b) => a + b, 0) * share
    const out: number[][] = [points[0]]
    for (let i = 0; i < lengths.length && remaining > 0; i++) {
      const [a, b] = [points[i], points[i + 1]]
      const t = Math.min(1, remaining / lengths[i])
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t])
      remaining -= lengths[i]
    }
    return out
  }

  /** Metres of ground to one pixel of screen at a stop's view. */
  const mPerPxOf = (layout: { metresPerPx: number } | null, stop: { view: { dist: number } }) =>
    layout ? layout.metresPerPx : (stop.view.dist * 2 * Math.tan((20 * Math.PI) / 180)) / window.innerHeight

  $effect(() => {
    const stop = stops[active]
    if (!mapReady || !map || !stop) return
    const mapNow = map
    // the card's marks go to the map through here, so they can be put back when a side story lets go of them
    const marksNow = (...a: [object[], number[][][], number[][][]?, number[][][]?]) => { lastMarks = a; if (!sideNow) mapNow.marks(...a) }
    focusNow = null
    sideNow = null
    untrack(() => { focus = null; side = null })   // a new card lets go of any building chosen on the last
    // the shoreline of the card's time
    const landNow = lands[stop.land ?? '1880s']
    // a change of shore between cards slides in as the camera flies
    if (landNow) mapNow.land(landNow, first ? 0 : 1600)
    mapNow.edges(stop.edges)
    mapNow.bridges(!!stop.bridges)
    mapNow.dots([])
    // filled streets carry their own outline, at the fill's edge
    mapNow.streetFill(stop.context?.streetFill ?? noStreets, 20, { width: 0.5, colour: '#3b3b3b', opacity: 0.6, ...(stop.context?.streetStyle ?? {}) })
    const sites = [
      ...stop.sites.map((id) => siteById.get(id)).filter((s): s is Site => !!s),
      // each hotel with a side story is named on the map, on a stem over its roof, and can be chosen there
      ...talesOf(stop).map((t): Site => ({ id: `tale-${t.pick.name}`, label: `◆ Side story: ${t.pick.name}`, lon: t.pick.lon, lat: t.pick.lat, located: true, basis: '', stem: Math.max(...t.pick.parts.map((q) => q.h)) + 8 })),
    ]
    const pairs = (stop.paths ?? []).map((pair) =>
      pair.map((id) => siteById.get(id)).filter((s): s is Site => !!s).map((s) => [s.lon, s.lat]),
    )
    const routes = (stop.routes ?? []).map((id) => routeById.get(id)).filter((r) => !!r)
      // lines built in an earlier card stand whole; only a line in a colour of its own (a path walked) is still drawn in
      .map((r) => (stop.railLaid && !r.colour ? { ...r, drawIn: false } : r))
    const tracks = routes.filter((r) => r.track)
    const still = routes.filter((r) => !r.drawIn && !r.solid && !r.track && !r.colour).map((r) => r.points)
    // routes in a colour of their own, dashed in it
    const accentStill = routes.filter((r) => !r.drawIn && !r.track && r.colour).map((r) => r.points)
    const shore = [...oldShore, ...routes.filter((r) => r.solid).map((r) => r.points)] // solid lines
    const moving = routes.filter((r) => r.drawIn && !r.track && !r.colour)
    const accentMoving = routes.filter((r) => r.drawIn && !r.track && r.colour)

    // The text panel covers the left of the window, so the subject is framed in the middle of
    // what is left: the space between the panel's right edge and the window's.
    const width = window.innerWidth
    // the card's right edge: its left padding (wider from md up, to clear the chapter rail), its width, a gap
    // the cards stand clear of the chapter rail, and of its labels on a wide window
    const panelRight = Math.min(width, (width >= 1024 ? 224 : width >= 768 ? 64 : 16) + 384 + 16)
    const offsetX = width >= 640 ? (panelRight + width) / 2 / width - 0.5 : 0
    const flight = first ? 0 : 2200
    // A stop with an annotation is framed by it; its rings, leaders and names go on the ground.
    const layout = stop.annotation ? layoutAnnotation(stop.annotation, { width, height: window.innerHeight, panelRight }) : null
    // A period map's lines go under the annotation, fainter than it.
    const context: { lines: [number, number][][]; dash?: [number, number]; width: number; colour: string; opacity: number }[] = stop.context ? [{ lines: stop.context.lines, dash: [mPerPxOf(layout, stop) * 3, mPerPxOf(layout, stop) * 6] as [number, number], width: 0.8, colour: '#555555', opacity: 0.8 }, { lines: stop.context.minor ?? [], dash: [mPerPxOf(layout, stop) * 1, mPerPxOf(layout, stop) * 4] as [number, number], width: 0.7, colour: '#666666', opacity: 0.6 }] : []
    // boundaries, as solid ink
    if (stop.context?.outlines?.length) context.push({ lines: stop.context.outlines as [number, number][][], width: 1.4, colour: '#1f1f1f', opacity: 0.95 })
    // major roads and bridges, as heavier grey lines
    if (stop.context?.roads?.length) context.push({ lines: stop.context.roads as [number, number][][], width: 1.8, colour: '#5a5a5a', opacity: 0.9 })
    // Burned ground: a charcoal smudge. Where the stop says where the fire began, it starts with
    // nothing burned and spreads out from there once the camera has settled.
    const burnArea = stop.context?.burnArea
    const BURN_OPACITY = 0.42
    const burnFrom = stop.context?.burnFrom
    const burnMax = burnArea && burnFrom
      ? Math.max(...burnArea.map(([lon, lat]) => Math.hypot((lon - burnFrom[0]) * 72_600, (lat - burnFrom[1]) * 111_200))) + 60
      : 0
    mapNow.burn(burnArea ? { poly: burnArea, from: burnFrom ?? burnArea[0], colour: '#2a2a2a', opacity: BURN_OPACITY, reach: burnFrom ? 0 : 1e6 } : null)
    // Streets of the time: their edges, cut into block outlines, as the lightest line on the map.
    const streetEdges = stop.context?.streetFill ? [] : (stop.context?.streets ?? [])   // where streets are filled, the fill is outlined instead
    const streetStyle = { width: 0.45, colour: '#a6a6a6', opacity: 0.55, ...(stop.context?.streetStyle ?? {}) }
    const streetGroup = [
      ...(stop.context?.parcels?.length ? [{ lines: stop.context.parcels, width: 0.35, colour: '#b9b9b9', opacity: 0.55 }] : []),
      ...(streetEdges.length ? [{ lines: streetEdges, ...streetStyle }] : []),
    ]
    // A stop can hold back its subheadings until its buildings have risen.
    const labelsLater = !!stop.labelsAfterRise && !!stop.rises?.length
    const featureFine = layout ? layout.featureFine : []
    const featureLabels = layout ? layout.featureLabels : []
    const restFine = [...context, ...(layout ? layout.fine : []), ...(labelsLater ? [] : featureFine)]
    const laterFine = [...context, ...(layout ? layout.fine : []), ...featureFine]
    // Streets that draw themselves in, nearest the starting point first.
    const streetsFrom = stop.context?.streetsFrom
    const streetOrder = streetsFrom
      ? [...streetEdges].sort(
          (a, b) =>
            Math.hypot(a[0][0] - streetsFrom[0], (a[0][1] - streetsFrom[1]) * 1.53) -
            Math.hypot(b[0][0] - streetsFrom[0], (b[0][1] - streetsFrom[1]) * 1.53),
        )
      : []
    const streetsAt = (k: number) => {
      const n = streetOrder.length
      const lines = streetOrder.flatMap((line, i) => {
        const share = Math.max(0, Math.min(1, (k * n * 1.6 - i) / (n * 0.6)))
        return share > 0 ? [partial(line as [number, number][], share)] : []
      })
      return lines.length ? [{ lines, ...streetStyle }] : []
    }
    const baseFine = [...(streetsFrom ? [] : streetGroup), ...restFine]
    // A railway: two rails and the ties across them, drawn as the map symbol rather than to gauge,
    // so it reads at any distance. `share` is how much of each line has been laid.
    const trackPx = mPerPxOf(layout, stop)
    const trackFine = (share: number) => {
      const rails: number[][][] = []
      const ties: number[][][] = []
      for (const r of tracks) {
        const pts = partial(r.points, share)
        if (pts.length < 2) continue
        const [lon0, lat0] = pts[0]
        const kx = 111_320 * Math.cos((lat0 * Math.PI) / 180)
        const ky = 111_200
        const m = pts.map(([lon, lat]) => [(lon - lon0) * kx, (lat - lat0) * ky])
        const back = ([x, y]: number[]) => [lon0 + x / kx, lat0 + y / ky]
        const gauge = trackPx * 1.5
        const left: number[][] = []
        const right: number[][] = []
        m.forEach((p, i) => {
          const a = m[Math.max(0, i - 1)]
          const b = m[Math.min(m.length - 1, i + 1)]
          const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
          const nx = -(b[1] - a[1]) / len
          const ny = (b[0] - a[0]) / len
          left.push(back([p[0] + nx * gauge, p[1] + ny * gauge]))
          right.push(back([p[0] - nx * gauge, p[1] - ny * gauge]))
        })
        rails.push(left, right)
        // a tie every few pixels along the line, reaching a little past each rail
        const every = trackPx * 6
        const reach = trackPx * 3.4
        let carried = 0
        for (let i = 1; i < m.length; i++) {
          const [ax, ay] = m[i - 1]
          const [bx, by] = m[i]
          const len = Math.hypot(bx - ax, by - ay)
          if (!len) continue
          const tx = (bx - ax) / len
          const ty = (by - ay) / len
          let d = carried
          for (; d <= len; d += every) {
            const cx = ax + tx * d
            const cy = ay + ty * d
            ties.push([back([cx - ty * reach, cy + tx * reach]), back([cx + ty * reach, cy - tx * reach])])
          }
          carried = d - len
        }
      }
      return rails.length ? [{ lines: rails, width: 1.1, colour: '#1f1f1f', opacity: 0.9 }, { lines: ties, width: 1, colour: '#1f1f1f', opacity: 0.85 }] : []
    }
    const laying = tracks.some((r) => r.drawIn)
    mapNow.fine([...baseFine, ...trackFine(laying ? 0 : 1)])
    // Lettering is sized in pixels for the view it will be seen from.
    const mPerPx = mPerPxOf(layout, stop)
    const mPerDegLon = 111_200 * Math.cos((49.285 * Math.PI) / 180)
    const base = baseLabels.map((l) => {
      // a stop can name the shoreline it shows, near where it is seen
      if (l.text === OLD_SHORE && stop.shoreLabel) return { ...l, lines: shoreLines[stop.land ?? '1880s'] ?? l.lines, text: stop.shoreLabel.text, near: stop.shoreLabel.near, size: mPerPx * 20, offset: mPerPx * 8, colour: '#3a3a3a', tracking: 0.14 }
      // the 1880s shore keeps its name in 1887: only the railway's roadbed has been added to it
      if (l.text === OLD_SHORE && !['1880s', '1887'].includes(stop.land ?? '1880s')) return { ...l, text: '' }
      // once the shore is today's, the dashed line stays but needs no name
      if (l.text === 'SHORELINE TODAY' && stop.land === 'today') return { ...l, text: '' }
      if (l.text !== OLD_SHORE) return layout ? { ...l, size: Math.min(l.size, mPerPx * 13), offset: Math.min(l.offset, mPerPx * 6.5) } : l
      // The 1880s shoreline's name: small and grey, and begun just outside an annotation's rings so it stays in frame.
      const a = stop.annotation
      // An annotation shows the shoreline's name only where it asks to: elsewhere it gets in the way.
      if (a && !a.shoreName) return { ...l, text: '' }
      const near = a ? [a.centre[0] + (a.radii[a.radii.length - 1] + mPerPx * 10) / mPerDegLon, a.centre[1]] : l.near
      return { ...l, near, size: mPerPx * 7.5, offset: mPerPx * 5, tracking: 0.06 }
    })
    const ownAll = (stop.lettering ?? []).map((l) => {
      const line = l.along ?? [l.at, [l.at[0] + 0.08, l.at[1]]]
      return { text: l.text, lines: [line], near: l.at, size: mPerPx * l.px, offset: 0, colour: l.colour ?? '#ffffff', forward: true, tracking: l.tracking, later: !!l.later }
    })
    // lettering marked `later` waits for the stop's growth to finish
    const holdLetters = !!stop.growth && stop.growth.to > stop.growth.from && ownAll.some((l) => l.later)
    const own = holdLetters ? ownAll.filter((l) => !l.later) : ownAll
    const names = (stop.context?.names ?? []).map((n) => ({ text: n.text, lines: [n.along], near: n.along[0], size: mPerPx * 6.5, offset: mPerPx * 3, colour: '#666666', forward: true, tracking: 0.12 }))
    const textNow = [...base.filter((l) => l.text), ...own, ...names, ...(layout ? layout.labels : [])]
    mapNow.groundText(labelsLater ? textNow : [...textNow, ...featureLabels])
    mapNow.fly({ ...(layout ? layout.view : stop.view), offsetX }, flight)
    lastFly = { view: layout ? layout.view : stop.view, offsetX }
    first = false

    // The buildings standing at this stop, each placed at its site.
    const standingOf = (list: [string, string, string?][]) =>
      list.flatMap(([siteId, modelId, fill]) => {
        const site = siteById.get(siteId)
        const model = buildingModels.find((b) => b.id === modelId)
        if (!site || !model) return []
        const [lon, lat] = model.anchor ?? [site.lon, site.lat]
        return [{ lon, lat, bearing: (model.bearing * Math.PI) / 180, parts: model.parts, minBase: model.minBase ?? 0, piles: model.piles ?? false, fill, faint: false }]
      })
    const standing = standingOf(stop.models ?? [])
    // and, faintly, any buildings the stop draws as context: kept apart from `standing`, so a card can
    // swap its standing buildings without losing them
    const faintShown = (stop.faint ?? []).map((b) => ({ lon: b.lon, lat: b.lat, bearing: 0, parts: b.parts, minBase: b.minBase ?? 0, piles: b.piles ?? false, fill: b.fill, faint: true }))
    const run = ++drawing
    // The scene on its way out: whatever the last card left standing that this one does not keep sinks
    // into the ground as the camera flies, so one card's buildings do not simply vanish into the next's.
    type Shown = { lon: number; lat: number; bearing: number; parts: Part[]; minBase: number; piles?: boolean; fill?: string; faint?: boolean }
    const keyOf = (m: Shown) => `${m.lon.toFixed(6)},${m.lat.toFixed(6)},${m.parts.length}`
    // What the last card showed. Whatever this card does not keep sinks away; whatever is new to it rises;
    // what both show stays as it is. The two lists are compared the first time this card draws its buildings.
    const prevShown = lastShown
    const prevKeys = new Set(prevShown.map(keyOf))
    lastShown = []
    let current: Shown[] = standing
    // what a growth count has standing besides `standing`, so a rise on the same card keeps it in view
    let extras: Shown[] = []
    // whatever is travelling right now, shown on top of the card's buildings whoever drew them last
    let vehicles: Shown[] = []
    const TRANS_MS = 1100
    const transFrom = performance.now()
    const sunk = (m: Shown, k: number): Shown => ({
      ...m,
      parts: m.parts.map((p) =>
        p.kind === 'box' ? { ...p, h: Math.max(0.05, p.h * k), z0: (p.z0 ?? 0) * k }
        : p.kind === 'prism' ? { ...p, h: Math.max(0.05, p.h * k) }
        : p.kind === 'solid' ? { ...p, verts: p.verts.map(([x, y, z]) => [x, y, z * Math.max(0.01, k)] as [number, number, number]) }
        : { ...p, eave: Math.max(0.05, p.eave * k), ridge: Math.max(0.06, p.ridge * k) },
      ),
    })
    let outgoing: Shown[] = []
    const incoming = new Set<string>()
    let settled = false
    let transitioning = !first
    // the lists are compared at the first frame, once the card has drawn everything it starts with
    const settle = () => {
      if (settled) return
      settled = true
      const keys = new Set(current.map(keyOf))
      outgoing = prevShown.filter((m) => !keys.has(keyOf(m)))
      for (const m of current) if (!prevKeys.has(keyOf(m))) incoming.add(keyOf(m))
      if (!outgoing.length && !incoming.size) transitioning = false
    }
    // everything goes to the map through here, so a chosen building keeps its look while the card animates
    const send = (list: Shown[]) => {
      lastSent = list
      mapNow.models(withFocus(list))
    }
    const showModels = (list: Shown[]) => {
      current = list
      lastShown = list
      if (!transitioning) return send([...list, ...faintShown, ...vehicles])
      if (!settled) {
        // until then, the last card's buildings stay as they were
        const keys = new Set(list.map(keyOf))
        return send([...list, ...faintShown, ...vehicles, ...prevShown.filter((m) => !keys.has(keyOf(m)))])
      }
      const t = Math.max(0, Math.min(1, (performance.now() - transFrom) / TRANS_MS))
      const e = t * t * (3 - 2 * t)
      send([...list.map((m) => (incoming.has(keyOf(m)) ? sunk(m, e) : m)), ...faintShown, ...vehicles, ...outgoing.map((m) => sunk(m, 1 - e))])
    }
    const showVehicles = (list: Shown[]) => {
      vehicles = list
      showModels(current)
    }
    if (transitioning) {
      const step = (now: number) => {
        if (run !== drawing) return
        settle()
        if (now - transFrom >= TRANS_MS) {
          transitioning = false
          showModels(current)
          return
        }
        showModels(current)
        requestAnimationFrame(step)
      }
      requestAnimationFrame(step)
    }
    // Anything that travels in: placed at its start, then moved to its end once the camera has settled.
    const scaledParts = (model: (typeof buildingModels)[number], k: number) =>
      model.parts.map((part) => {
        if (part.kind === 'prism' || part.kind === 'solid') return part
        const big = { ...part, x: part.x * k, y: part.y * k, w: part.w * k, d: part.d * k }
        if (big.kind === 'box') return { ...big, h: big.h * k, z0: (big.z0 ?? 0) * k }
        return { ...big, eave: big.eave * k, ridge: big.ridge * k }
      })
    const headingOf = (from: number[], to: number[]) => Math.atan2(-(to[0] - from[0]) * Math.cos((to[1] * Math.PI) / 180), to[1] - from[1])
    const arriving = (stop.arrivals ?? []).flatMap((a) => {
      const model = buildingModels.find((b) => b.id === a.model)
      if (!model || !a.from || !a.to) return []
      return [{ from: a.from, to: a.to, parts: scaledParts(model, a.scale ?? 1), bearing: headingOf(a.from, a.to) }]
    })
    const placed = (share: number) =>
      arriving.map((a) => ({
        lon: a.from[0] + (a.to[0] - a.from[0]) * share,
        lat: a.from[1] + (a.to[1] - a.from[1]) * share,
        bearing: a.bearing,
        parts: a.parts,
        minBase: 0,
      }))
    // Anything that travels along one of the chapter's routes: a train on its line, a ship on its course.
    const routed = (stop.arrivals ?? []).flatMap((a) => {
      const model = buildingModels.find((b) => b.id === a.model)
      const route = a.route ? routeById.get(a.route) : undefined
      if (!model || !route || route.points.length < 2) return []
      const pts = a.reverse ? [...route.points].reverse() : route.points
      const kx = 111_320 * Math.cos((pts[0][1] * Math.PI) / 180)
      const dist = [0]
      for (let i = 1; i < pts.length; i++) dist.push(dist[i - 1] + Math.hypot((pts[i][0] - pts[i - 1][0]) * kx, (pts[i][1] - pts[i - 1][1]) * 111_200))
      return [{ pts, dist, total: dist[dist.length - 1], parts: scaledParts(model, a.scale ?? 1), ms: a.ms ?? 9000, loop: !!a.loop, fill: a.fill, then: a.then, arrived: false, after: a.after }]
    })
    const alongRoute = (r: (typeof routed)[number], share: number) => {
      const d = Math.max(0, Math.min(r.total, share * r.total))
      let i = 1
      while (i < r.dist.length - 1 && r.dist[i] < d) i++
      const a = r.pts[i - 1]
      const b = r.pts[i]
      const seg = r.dist[i] - r.dist[i - 1] || 1
      const k = (d - r.dist[i - 1]) / seg
      return { lon: a[0] + (b[0] - a[0]) * k, lat: a[1] + (b[1] - a[1]) * k, bearing: headingOf(a, b), parts: r.parts, minBase: 0, fill: r.fill }
    }
    // A burn, then a rebuild: the charcoal spreads from where the fire began, and once it has
    // burned through, the buildings in `rises` grow up out of the ground one after another.
    const BURN_MS = 4200
    const rising = (stop.rises ?? []).flatMap(([siteId, modelId, fill]) => {
      const site = siteById.get(siteId)
      const model = buildingModels.find((b) => b.id === modelId)
      if (!site || !model) return []
      const [lon, lat] = model.anchor ?? [site.lon, site.lat]
      return model.parts.map((part) => ({ lon, lat, bearing: (model.bearing * Math.PI) / 180, part, minBase: model.minBase ?? 0, piles: model.piles ?? false, fill }))
    })
    // Buildings standing when the stop opens that the fire takes: each sinks as the charcoal reaches it.
    const burning = (stop.burns ?? []).flatMap(([siteId, modelId]) => {
      const site = siteById.get(siteId)
      const model = buildingModels.find((b) => b.id === modelId)
      if (!site || !model) return []
      const [lon, lat] = model.anchor ?? [site.lon, site.lat]
      return model.parts.map((part) => ({ lon, lat, bearing: (model.bearing * Math.PI) / 180, part, minBase: model.minBase ?? 0, piles: model.piles ?? false, fill: undefined as string | undefined }))
    })
    const metresFrom = (r: (typeof rising)[number], from: number[]) => {
      const kx = 111_320 * Math.cos((from[1] * Math.PI) / 180)
      return Math.hypot((r.lon - from[0]) * kx + r.part.x, (r.lat - from[1]) * 111_200 + r.part.y)
    }
    const heightened = (r: (typeof rising)[number], k: number) => {
      const p = r.part
      const q =
        p.kind === 'box' ? { ...p, h: Math.max(0.05, p.h * k), z0: (p.z0 ?? 0) * k }
        : p.kind === 'prism' ? { ...p, h: Math.max(0.05, p.h * k), z0: (p.z0 ?? 0) * k }   // a raised deck comes up with its piers
        : p.kind === 'solid' ? { ...p, verts: p.verts.map(([x, y, z]) => [x, y, z * Math.max(0.01, k)] as [number, number, number]) }
        : { ...p, eave: Math.max(0.05, p.eave * k), ridge: Math.max(0.06, p.ridge * k) }
      return { lon: r.lon, lat: r.lat, bearing: r.bearing, parts: [q], minBase: r.minBase, piles: r.piles, fill: r.fill }
    }
    const STREETS_MS = 2600
    // Where the stop says where the town grew from, its buildings rise in order of distance from there.
    if (stop.risesFrom) {
      const [fx, fy] = stop.risesFrom
      const kx = 111_320 * Math.cos((fy * Math.PI) / 180)
      const at = (r: (typeof rising)[number]) => {
        const p = r.part
        return Math.hypot(r.lon + p.x / kx - fx, (r.lat + p.y / 111_200 - fy) * 1.53)
      }
      rising.sort((a, b) => at(a) - at(b))
    }
    vehicles = placed(0)
    showModels([...standing, ...burning.map((r) => heightened(r, 1))])
    if (burnFrom || rising.length || streetsFrom) {
      const start = performance.now() + flight * 0.8
      const riseAt = start + (burnFrom ? BURN_MS + 900 : streetsFrom ? STREETS_MS * 0.55 : 0)
      const each = 1400 // how long one building takes to rise
      let labelled = false
      let risenThen = false
      const gap = rising.length > 1 ? Math.min(90, 4200 / rising.length) : 0
      const step = (now: number) => {
        if (run !== drawing) return
        if (streetsFrom) mapNow.fine([...streetsAt(Math.max(0, Math.min(1, (now - start) / STREETS_MS))), ...(labelled ? laterFine : restFine)])
        let reach = Infinity
        if (burnFrom) {
          const k = Math.max(0, Math.min(1, (now - start) / BURN_MS))
          reach = burnMax * (1 - Math.pow(1 - k, 1.6))
          mapNow.burnReach(reach)
          // the charcoal lifts as the town starts to rise again
          if (rising.length) {
            const f = Math.max(0, Math.min(1, (now - riseAt) / 1600))
            mapNow.burnOpacity(BURN_OPACITY * (1 - f * f * (3 - 2 * f)))
          }
        }
        // The first in the list rises alone; the rest follow together, staggered.
        const up = rising
          .map((r, i) => {
            const t0 = riseAt + (stop.risesFrom ? i * gap : i === 0 ? 0 : each * 0.7 + i * gap)
            const k = Math.max(0, Math.min(1, (now - t0) / each))
            return k > 0 ? heightened(r, 1 - Math.pow(1 - k, 3)) : null
          })
          .filter((m) => m !== null)
        // what is still standing of the old town: each building sinks over the 25 m behind the fire's front
        const left = burning.flatMap((r) => {
          if (!burnFrom || now < start) return [heightened(r, 1)]
          const k = 1 - Math.max(0, Math.min(1, (reach - metresFrom(r, burnFrom)) / 25))
          return k > 0.02 ? [heightened(r, k)] : []
        })
        if (rising.length || burning.length) showModels([...standing, ...extras, ...left, ...up])
        const end = riseAt + each * 0.7 + rising.length * gap + each
        // once the last building is up, the subheadings and their leaders are drawn in
        if (labelsLater && !labelled && now >= end) {
          labelled = true
          mapNow.groundText([...textNow, ...featureLabels])
          mapNow.fine([...(streetsFrom ? streetsAt(1) : streetGroup), ...laterFine])
        }
        // and the card's standing buildings change as it says, once the rise is done
        if (stop.risesThen && !risenThen && now >= end) {
          risenThen = true
          const fresh = standingOf(stop.risesThen)
          standing.splice(0, standing.length, ...fresh)
          showModels([...standing, ...extras, ...left, ...up])
        }
        if (now < Math.max(labelsLater ? end + 50 : 0, end, burnFrom ? riseAt + 1600 : 0, streetsFrom ? start + STREETS_MS : 0)) requestAnimationFrame(step)
      }
      requestAnimationFrame(step)
    }

    // A railway is laid from its first point to its last once the camera has settled.
    if (laying) {
      const [from, duration] = [performance.now() + flight * 0.7, 5200]
      const lay = (now: number) => {
        if (run !== drawing) return
        const t = Math.max(0, Math.min(1, (now - from) / duration))
        if (t > 0) mapNow.fine([...baseFine, ...trackFine(t)])
        if (t < 1) requestAnimationFrame(lay)
      }
      requestAnimationFrame(lay)
    }

    // Growth: buildings come up as a running year passes the year each was built. Those built before
    // `from` stand from the start; those built after `to`, or with no year, are left out.
    const growth = stop.growth
    if (growth) {
      // a building at full height is made once and reused, so a count over thousands stays smooth
      const full = new Map<(typeof growth.buildings)[number], ReturnType<typeof scaled>>()
      const scaled = (b: (typeof growth.buildings)[number], k: number) => ({
        lon: b.lon,
        lat: b.lat,
        bearing: 0,
        parts: b.parts.map((p) => ({ ...p, h: Math.max(0.05, p.h * k) })),
        minBase: b.minBase ?? 0,
        piles: b.piles ?? false,
        fill: b.fill,
      })
      const asModel = (b: (typeof growth.buildings)[number], k: number) => {
        if (k < 1) return scaled(b, k)
        let m = full.get(b)
        if (!m) full.set(b, (m = scaled(b, 1)))
        return m
      }
      const dated = growth.buildings.filter((b) => b.built != null && b.built <= growth.to)
      const before = dated.filter((b) => (b.built as number) < growth.from)
      const during = dated.filter((b) => (b.built as number) >= growth.from)
      const counting = growth.to > growth.from
      yearShown = counting ? growth.from : null
      const staticList = [...standing, ...before.map((b) => asModel(b, 1)), ...(counting ? [] : during.map((b) => asModel(b, 1)))]
      extras = staticList.slice(standing.length)
      const hl = stop.highlight
      if (!counting && hl) {
        // the coloured buildings take their colour one by one, nearest the given place first
        const kx = 111_320 * Math.cos((hl.from[1] * Math.PI) / 180)
        const order = staticList
          .filter((m) => m.fill)
          .map((m) => ({ m, d: Math.hypot((m.lon - hl.from[0]) * kx, (m.lat - hl.from[1]) * 111_200) }))
          .sort((a, b) => a.d - b.d)
          .map((o) => o.m)
        const plainOf = (m: (typeof staticList)[number]) => ({ ...m, fill: undefined })
        const t0 = performance.now() + flight * 0.8 + (hl.delay ?? 600)
        const ms = hl.ms ?? 6000
        const tint = (now: number) => {
          if (run !== drawing) return
          const k = Math.max(0, Math.min(1, (now - t0) / ms))
          const lit = new Set(order.slice(0, Math.floor(k * order.length)))
          showModels(staticList.map((m) => (m.fill && !lit.has(m) ? plainOf(m) : m)))
          if (k < 1) requestAnimationFrame(tint)
        }
        showModels(staticList.map((m) => (m.fill ? plainOf(m) : m)))
        requestAnimationFrame(tint)
      } else showModels(staticList)
      let landShown = stop.land ?? '1880s'
      let linesShown = 0
      if (counting) {
        const ms = growth.ms ?? 7000
        const t0 = performance.now() + flight * 0.8 + (growth.delay ?? 0)
        const perYear = ms / (growth.to - growth.from + 1)
        const grow = (now: number) => {
          if (run !== drawing) return
          const years = Math.max(0, (now - t0) / perYear)
          yearShown = Math.min(growth.to, growth.from + Math.floor(years))
          // and the shoreline changes as the count passes the year it changed
          const due = (growth.landAt ?? []).filter(([y]) => (yearShown as number) >= y).pop()
          if (due && lands[due[1]] && landShown !== due[1]) {
            landShown = due[1]
            mapNow.land(lands[due[1]], 2800)   // the shore slides out over about three years of the count
          }
          // and lines laid on new ground come in as the count passes their year
          const dueLines = (growth.linesAt ?? []).filter(([y]) => (yearShown as number) >= y)
          if (dueLines.length !== linesShown) {
            linesShown = dueLines.length
            mapNow.fine([...baseFine, ...trackFine(1), ...dueLines.flatMap(([, g]) => g)])
          }
          const up = during.flatMap((b) => {
            // each building takes about a year and a half of the count to reach its height
            const k = Math.max(0, Math.min(1, (years - ((b.built as number) - growth.from)) / 1.5))
            return k > 0 ? [asModel(b, 1 - Math.pow(1 - k, 3))] : []
          })
          showModels([...standing, ...before.map((b) => asModel(b, 1)), ...up])
          if (years < growth.to - growth.from + 1.5) requestAnimationFrame(grow)
          // the names held back come in once the last buildings are up
          else {
            if (holdLetters) mapNow.groundText([...textNow, ...ownAll.filter((l) => l.later), ...(labelsLater ? [] : featureLabels)])
            if (stop.marksAfterGrowth) marksNow(sites, [...pairs, ...still], shore, accentStill)
          }
        }
        requestAnimationFrame(grow)
      }
    } else {
      yearShown = null
    }

    // Structures laid along their length: a deck's ring grows out from its start, its piers following.
    const laid = (stop.lay ?? []).flatMap((l) => {
      const site = siteById.get(l.site)
      const model = buildingModels.find((b) => b.id === l.model)
      if (!site || !model) return []
      const [lon, lat] = model.anchor ?? [site.lon, site.lat]
      // the model's parts in units: each prism and the boxes that follow it
      const units: { deck: Extract<Part, { kind: 'prism' }>; piers: Part[] }[] = []
      for (const part of model.parts) {
        if (part.kind === 'prism') units.push({ deck: part, piers: [] })
        else if (units.length) units[units.length - 1].piers.push(part)
      }
      return [{ lon, lat, bearing: (model.bearing * Math.PI) / 180, units, fill: l.fill, ms: l.ms ?? 5000 }]
    })
    const layShare = (l: (typeof laid)[number], share: number): Shown => {
      const parts: Part[] = []
      l.units.forEach((unit, u) => {
        const k = Math.max(0, Math.min(1, share * l.units.length - u))
        if (k <= 0) return
        const ring = unit.deck.ring
        const n = ring.length / 2
        const m = k * (n - 1)
        const i = Math.floor(m)
        const f = m - i
        const at = (side: number[][], j: number) => side[j]
        const left = ring.slice(0, n)
        const right = ring.slice(n).reverse()
        const lerp = (a: number[], b: number[]): [number, number] => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]
        const leftPart = [...left.slice(0, i + 1), ...(i < n - 1 ? [lerp(at(left, i), at(left, i + 1))] : [])] as [number, number][]
        const rightPart = [...right.slice(0, i + 1), ...(i < n - 1 ? [lerp(at(right, i), at(right, i + 1))] : [])] as [number, number][]
        if (leftPart.length >= 2) parts.push({ ...unit.deck, ring: [...leftPart, ...rightPart.reverse()] })
        const piersIn = Math.floor(k * unit.piers.length)
        parts.push(...unit.piers.slice(0, piersIn))
      })
      return { lon: l.lon, lat: l.lat, bearing: l.bearing, parts, minBase: 0, piles: false, fill: l.fill }
    }
    if (laid.length) {
      const from = performance.now() + flight * 0.8
      const layStep = (now: number) => {
        if (run !== drawing) return
        const list = laid.map((l) => layShare(l, Math.max(0, Math.min(1, (now - from) / l.ms))))
        showModels([...standing, ...extras, ...list.filter((m) => m.parts.length)])
        if (laid.some((l) => now - from < l.ms)) requestAnimationFrame(layStep)
      }
      requestAnimationFrame(layStep)
    }

    // A card's figure: shown once the camera has settled.
    statShown = null
    if (stop.stat) {
      const st = stop.stat
      const at = performance.now() + flight * 0.8 + (st.after ?? 1500)
      const showStat = (now: number) => {
        if (run !== drawing) return
        if (now >= at) statShown = { value: st.value, label: st.label }
        else requestAnimationFrame(showStat)
      }
      requestAnimationFrame(showStat)
    }
    // People gathered in a place: the dots appear a few at a time once the camera has settled.
    const crowd = stop.crowd
    if (crowd && crowd.points.length) {
      const t0 = performance.now() + flight * 0.8 + (crowd.after ?? 1500)
      const gather = (now: number) => {
        if (run !== drawing) return
        const k = Math.max(0, Math.min(1, (now - t0) / 4000))
        mapNow.dots(crowd.points.slice(0, Math.round(k * crowd.points.length)).map(([lon, lat]) => ({ lon, lat, r: crowd.r ?? 5 })))
        if (k < 1) requestAnimationFrame(gather)
      }
      requestAnimationFrame(gather)
    }

    // People walking together: a column of dots moves along a route from its start to its end.
    const pr = stop.procession
    const prRoute = pr ? routeById.get(pr.route) : undefined
    if (pr && prRoute && prRoute.points.length >= 2) {
      const pts = prRoute.points
      const kx = 111_320 * Math.cos((pts[0][1] * Math.PI) / 180)
      const dist = [0]
      for (let i = 1; i < pts.length; i++) dist.push(dist[i - 1] + Math.hypot((pts[i][0] - pts[i - 1][0]) * kx, (pts[i][1] - pts[i - 1][1]) * 111_200))
      const total = dist[dist.length - 1]
      const column = pr.length ?? 160
      let seed = 1992
      const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
      // each walker's place back along the column, and a little to one side
      const people = Array.from({ length: pr.count }, () => ({ back: rand() * column, side: (rand() - 0.5) * 12 }))
      const at = (d: number, side: number) => {
        const c = Math.max(0, Math.min(total, d))
        let i = 1
        while (i < dist.length - 1 && dist[i] < c) i++
        const a = pts[i - 1], b = pts[i]
        const seg = dist[i] - dist[i - 1] || 1
        const k = (c - dist[i - 1]) / seg
        const ux = ((b[0] - a[0]) * kx) / seg, uy = ((b[1] - a[1]) * 111_200) / seg
        return { lon: a[0] + (b[0] - a[0]) * k + (-uy * side) / kx, lat: a[1] + (b[1] - a[1]) * k + (ux * side) / 111_200 }
      }
      const t0 = performance.now() + flight * 0.8 + (pr.delay ?? 1500)
      const ms = pr.ms ?? 16000
      const marchStep = (now: number) => {
        if (run !== drawing) return
        const t = Math.max(0, Math.min(1, (now - t0) / ms))
        // the head walks the whole route and the column closes up behind it at the end
        const head = t * (total + column)
        mapNow.dots(now < t0 ? [] : people.map((w) => ({ ...at(head - w.back, w.side), r: 6 })).filter((_, i) => head - people[i].back >= 0))
        if (t < 1) requestAnimationFrame(marchStep)
      }
      requestAnimationFrame(marchStep)
    }

    // People leaving: small figures walk out from the buildings, away from a place, and go.
    const sc = stop.scatter
    if (sc && sc.from.length) {
      let seed = 1986
      const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
      const total = sc.from.reduce((a, f) => a + f.weight, 0)
      const kx = 111_320 * Math.cos((sc.away[1] * Math.PI) / 180)
      const walkers = Array.from({ length: sc.count }, () => {
        let r = rand() * total
        const f = sc.from.find((x) => (r -= x.weight) <= 0) ?? sc.from[0]
        const dx = (f.lon - sc.away[0]) * kx
        const dy = (f.lat - sc.away[1]) * 111_200
        const base = Math.atan2(dy, dx) + (rand() - 0.5) * 1.6
        const reach = sc.reach[0] + rand() * (sc.reach[1] - sc.reach[0])
        return { lon: f.lon, lat: f.lat, dx: (Math.cos(base) * reach) / kx, dy: (Math.sin(base) * reach) / 111_200, start: rand() * 0.45 }
      })
      // each a see-through grey dot on the ground, far larger than life so it reads at the scale of the district
      const t0 = performance.now() + flight * 0.8 + (sc.delay ?? 1500)
      const ms = sc.ms ?? 7000
      const walk = (now: number) => {
        if (run !== drawing) return
        const t = (now - t0) / ms
        const list: { lon: number; lat: number; r: number }[] = []
        for (const w of walkers) {
          const k = Math.max(0, Math.min(1, (t - w.start) / 0.55))
          if (k <= 0 || k >= 1) continue
          const fade = k < 0.15 ? k / 0.15 : k > 0.8 ? (1 - k) / 0.2 : 1
          list.push({ lon: w.lon + w.dx * k, lat: w.lat + w.dy * k, r: 9 * fade })
        }
        mapNow.dots(list)
        if (t < 1.05) requestAnimationFrame(walk)
      }
      requestAnimationFrame(walk)
    }

    // A clearance: the old buildings stand picked out, go down, and the new ones come up in their place.
    const clearing = stop.clear
    if (clearing) {
      const asShown = (b: GrowthBuilding, k: number, picked = true): Shown => ({
        lon: b.lon,
        lat: b.lat,
        bearing: 0,
        parts: b.parts.map((p) => ({ ...p, h: Math.max(0.05, p.h * k) })),
        minBase: b.minBase ?? 0,
        piles: b.piles ?? false,
        ...(picked ? { fill: b.fill ?? clearing.fill } : { faint: true }),
      })
      const pickAt = clearing.pick == null ? null : performance.now() + flight * 0.8 + clearing.pick
      const t0 = performance.now() + flight * 0.8 + (clearing.at ?? 2500)
      const ms = clearing.ms ?? 1600
      const ease = (k: number) => k * k * (3 - 2 * k)
      const clearStep = (now: number) => {
        if (run !== drawing) return
        const t = now - t0
        let list: Shown[]
        if (t < 0) list = clearing.old.map((b) => asShown(b, 1, pickAt == null || now >= pickAt))
        else if (t < ms) list = clearing.old.map((b) => asShown(b, 1 - ease(t / ms)))
        else if (t < ms * 2) list = clearing.then.map((b) => asShown(b, ease((t - ms) / ms)))
        else list = clearing.then.map((b) => asShown(b, 1))
        showModels([...standing, ...extras, ...list])
        if (t < ms * 2) requestAnimationFrame(clearStep)
      }
      requestAnimationFrame(clearStep)
    }

    if (arriving.length) {
      const [from, duration] = [performance.now() + flight * 0.8, 9000]
      const glide = (now: number) => {
        if (run !== drawing) return
        const t = Math.max(0, Math.min(1, (now - from) / duration))
        showVehicles(placed(1 - Math.pow(1 - t, 2))) // slowing as it nears the shore
        if (t < 1) requestAnimationFrame(glide)
      }
      requestAnimationFrame(glide)
    }
    if (routed.length) {
      // they set off once the routes have been drawn in, and a looping one starts again at the end
      const from = performance.now() + flight * 0.6
      const travel = (now: number) => {
        if (run !== drawing) return
        let going = false
        const list = routed.map((r) => {
          const raw = (now - from - (r.after ?? 3200)) / r.ms
          if (raw < 0) {
            going = true   // still waiting to set off; one told when to set off is not shown until then
            return r.after != null ? null : alongRoute(r, 0)
          }
          if (r.loop) {
            going = true
            return alongRoute(r, raw % 1)
          }
          const t = Math.min(1, raw)
          if (t < 1) going = true
          else if (r.then && !r.arrived) {
            // at its coming, the card's buildings change as the stop says
            r.arrived = true
            const fresh = standingOf(r.then)
            current = [...fresh, ...current.slice(standing.length)]
            standing.splice(0, standing.length, ...fresh)
          }
          return alongRoute(r, 1 - Math.pow(1 - t, 2)) // slowing as it comes in
        })
        showVehicles([...(arriving.length ? placed(1) : []), ...list.filter((v): v is NonNullable<typeof v> => !!v)])
        if (going || now < from) requestAnimationFrame(travel)
      }
      requestAnimationFrame(travel)
    }

    // Marks in a sequence: the old rings close and the new open at each step's time.
    if (stop.marksSequence?.length) {
      const steps = stop.marksSequence.map((st) => ({ after: st.after, sites: st.sites.map((id) => siteById.get(id)).filter((x): x is Site => !!x) }))
      const t0 = performance.now() + flight * 0.8
      const SWAP = 700
      const scaled = (list: Site[], k: number) => list.map((x) => ({ ...x, ring: (x.ring ?? 22) * k }))
      const tick = (now: number) => {
        if (run !== drawing) return
        const t = now - t0
        let shown: Site[] = []
        let done = true
        for (let i = 0; i < steps.length; i++) {
          const next = steps[i + 1]
          if (t < steps[i].after) {
            done = false
            break
          }
          if (!next || t < next.after - SWAP) {
            shown = steps[i].sites
            if (next) done = false
            break
          }
          if (t < next.after) {
            // closing this step's rings, then opening the next's
            const k = (t - (next.after - SWAP)) / SWAP
            shown = k < 0.5 ? scaled(steps[i].sites, 1 - k * 2) : scaled(next.sites, (k - 0.5) * 2)
            done = false
            break
          }
        }
        marksNow(shown, [...pairs, ...still], shore, accentStill)
        if (!done) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
      return
    }
    // a card can hold its site marks back until its count has run
    const sitesNow = stop.marksAfterGrowth && stop.growth && stop.growth.to > stop.growth.from ? [] : sites
    if (!moving.length && !accentMoving.length) {
      marksNow(sitesNow, [...pairs, ...still], shore, accentStill)
      return
    }
    // A route is drawn from its first point to its last, starting as the camera settles.
    marksNow(sitesNow, [...pairs, ...still], shore, accentStill)
    const [delay, duration] = [flight * 0.6, 3200]
    const start = performance.now() + delay
    // a route marked `undrawAfter` is erased again from its far end, that long after it is drawn
    const ERASE = 2200
    const shareOf = (r: { undrawAfter?: number }, now: number) => {
      const drawn = Math.max(0, Math.min(1, (now - start) / duration))
      if (r.undrawAfter == null || drawn < 1) return drawn
      return 1 - Math.max(0, Math.min(1, (now - start - duration - r.undrawAfter) / ERASE))
    }
    const stillGoing = (now: number) => [...moving, ...accentMoving].some((r) => (now - start) / duration < 1 || (r.undrawAfter != null && now - start - duration - r.undrawAfter < ERASE))
    const frame = (now: number) => {
      if (run !== drawing) return
      if (now > start) marksNow(sites, [...pairs, ...still, ...moving.map((r) => partial(r.points, shareOf(r, now)))], shore, [...accentStill, ...accentMoving.map((r) => partial(r.points, shareOf(r, now)))])
      if (stillGoing(now)) requestAnimationFrame(frame)
    }
    requestAnimationFrame(frame)
  })
</script>

<div class="relative bg-[var(--m3-sky)] text-[var(--ink)]">
  <!-- The map: fixed behind everything, and deaf to the pointer -->
  <div class="pointer-events-none sticky top-0 h-dvh w-full overflow-hidden">
    {#if ready}
      <Map3D
        bind:this={map}
        {data}
        {proj}
        scen={null}
        mode="tenure"
        theme="light"
        plain
        bare={story.every((c) => c.bare)}
        {colourOf}
        bandsOf={() => null}
        sel={null}
        onSelect={() => {}}
        onHover={() => {}}
        onFail={(message: string) => (fail = message)}
        onBusy={() => {}}
        onReady={() => {
          map?.dotted(todayShore)
          // Each shoreline named in lettering laid on the ground along it: today's in white beside its
          // dashed line, the 1880s edge small and grey just off the shore, east of the mill.
          baseLabels = [
            { text: 'SHORELINE TODAY', lines: todayShore, near: [-123.0985, 49.289], size: 30, offset: 10, colour: '#ffffff' },
            { text: OLD_SHORE, lines: thenShore, near: [-123.0908, 49.286], size: 24, offset: 10, colour: '#666666' },
          ]
          map?.groundText(baseLabels)
          mapReady = true
        }}
      />
    {/if}
    <!-- the year a stop's growth has reached -->
    {#if yearShown !== null}
      <p class="font-display pointer-events-none absolute right-8 bottom-6 text-7xl font-semibold tracking-tight text-[var(--ink)]/75 tabular-nums">{yearShown}</p>
    {/if}
    <!-- what a card's colours stand for -->
    {#if stops[active]?.legend?.length && !focus}
      <ul class="font-display pointer-events-none absolute top-6 right-8 space-y-1.5 bg-[#1f1f1f] px-3 py-2.5 text-xs tracking-wide text-white uppercase">
        {#each stops[active].legend ?? [] as item (item.label)}
          <li class="flex items-center gap-2"><span class="inline-block h-3 w-3 border border-white/60" style:background={item.colour}></span>{item.label}</li>
        {/each}
      </ul>
    {/if}
    {#if statShown && !focus}
      <div class="font-display pointer-events-none absolute right-8 bottom-6 text-right text-[var(--ink)]">
        <p class="text-6xl font-semibold tracking-tight tabular-nums opacity-80">{statShown.value}</p>
        <p class="mt-1 max-w-xs text-xs tracking-wide uppercase opacity-70">{statShown.label}</p>
      </div>
    {/if}
    {#if fail || !mapReady}
      <p class="absolute right-4 bottom-4 rounded-md bg-white/85 px-3 py-1.5 text-xs text-[var(--ink-2)]">
        {fail ? `The map could not start: ${fail}` : 'Drawing the map…'}
      </p>
    {/if}
  </div>

  <!-- a building chosen on the map: what is recorded about it, and the way back -->
  {#if focus}
    <aside class="pointer-events-auto fixed top-1/2 left-4 z-30 max-h-[92dvh] w-full max-w-sm -translate-y-1/2 overflow-y-auto rounded-lg bg-white/95 p-6 shadow-sm md:left-16 lg:left-56">
      <p class="font-display text-xs tracking-wide text-[var(--ink-3)] uppercase">{side ? 'One hotel' : 'SRO hotel'}</p>
      <h2 class="font-display mt-1 text-2xl font-semibold tracking-tight">{focus.name}</h2>
      {#if focus.photo}
        <figure class="mt-4">
          <img src="{import.meta.env.BASE_URL}images/{focus.photo.file}" alt={focus.photo.alt} class="max-h-64 w-full object-cover grayscale" />
          <figcaption class="mt-1.5 text-[11px] leading-snug text-[var(--ink-3)]">
            {focus.photo.title}, {focus.photo.date}. <a href={focus.photo.recordUrl} target="_blank" rel="noreferrer" class="underline">{focus.photo.credit}</a>
          </figcaption>
        </figure>
      {/if}
      {#if side}
        {@const at = stepAt(side.story, side.year)}
        {@const step = side.story.steps[at]}
        {@const src = step.sourceId ? sourceById.get(step.sourceId) : null}
        {@const [y0, y1] = side.story.span}
        <div class="mt-5 border-t border-[var(--rule-soft)] pt-4">
          <!-- the year, dragged: the steps, the building and what stands round it follow -->
          <div class="flex items-baseline justify-between">
            <label for="side-year" class="font-display text-xs tracking-wide text-[var(--ink-3)] uppercase">Drag the year</label>
            <output for="side-year" class="font-display text-3xl font-semibold tracking-tight text-[#8e4233] tabular-nums">{side.year}</output>
          </div>
          <div class="relative mt-2">
            <input id="side-year" type="range" min={y0} max={y1} step="1" value={side.year} oninput={(e) => setYear(Number(e.currentTarget.value))} class="side-year w-full" aria-valuetext="{side.year}: {step.title}" />
            <!-- a mark at each step's year; choosing one goes to it -->
            <div class="relative mt-1 h-7">
              {#each side.story.steps as s, k (s.year)}
                <button type="button" onclick={() => setYear(s.year)} style="left: calc({((s.year - y0) / (y1 - y0)) * 100}% * 0.94 + 3%)" class="font-display absolute top-0 -translate-x-1/2 cursor-pointer text-[10px] tabular-nums {k === at ? 'font-semibold text-[#8e4233]' : 'text-[var(--ink-3)]'}" aria-label="Go to {s.year}: {s.title}">
                  <span class="mx-auto block h-1.5 w-px {k === at ? 'bg-[#8e4233]' : 'bg-[var(--ink-3)]'}"></span>{#if k === at || k === 0 || (s.year - side.story.steps[k - 1].year) / (y1 - y0) > 0.09}{s.year}{/if}
                </button>
              {/each}
            </div>
          </div>
          <p class="font-display mt-3 text-xs tracking-wide text-[#8e4233] uppercase tabular-nums">{step.kicker}</p>
          <h3 class="font-display mt-1 text-lg font-semibold tracking-tight">{step.title}</h3>
          {#each step.text as paragraph (paragraph)}
            <p class="mt-2 text-sm leading-relaxed text-[var(--ink-2)]">{paragraph}</p>
          {/each}
          {#if src}
            <p class="mt-2 text-[11px] text-[var(--ink-3)]">{#if src.url}<a href={src.url} target="_blank" rel="noreferrer" class="underline">{src.author}</a>{:else}{src.author}{/if}</p>
          {/if}
          {#if side.story.note}
            <details class="mt-3 text-xs leading-relaxed text-[var(--ink-3)]">
              <summary class="font-display cursor-pointer tracking-wide uppercase">What this shows and leaves out</summary>
              <p class="mt-2">{side.story.note}</p>
            </details>
          {/if}
        </div>
      {/if}
      <dl class="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm {side ? 'hidden' : ''}">
        {#each focus.facts as fact (fact.label)}
          <dt class="font-display text-xs tracking-wide text-[var(--ink-3)] uppercase">{fact.label}</dt>
          <dd class="text-[var(--ink)]">{fact.value}</dd>
        {/each}
      </dl>
      {#if focus.note && !side}<p class="mt-4 text-xs leading-relaxed text-[var(--ink-3)]">{focus.note}</p>{/if}
      <button type="button" onclick={unfocus} class="font-display mt-5 cursor-pointer bg-[#1f1f1f] px-3 py-1.5 text-xs tracking-wide text-white uppercase">← Back to the map</button>
    </aside>
  {/if}
  <ChapterRail
    {chapters}
    current={chapterOf[active]?.chapterId ?? ''}
    cards={(chapterOf[active]?.stops ?? []).map((s) => ({ title: s.title, kicker: s.kicker, tale: !!(s.sideStory || s.sideStories?.length) }))}
    active={active - stops.indexOf(chapterOf[active]?.stops[0])}
    onGo={(i) => sections[stops.indexOf(chapterOf[active]?.stops[0]) + i]?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
    onChapter={(id) => {
      // a chapter's dot goes straight to its first card, without scrolling through the cards between
      const first = story.find((c) => c.chapterId === id)?.stops[0]
      if (first) sections[stops.indexOf(first)]?.scrollIntoView({ behavior: 'instant', block: 'center' })
    }}
  />

  <!-- The story: one tall section per stop, pulled up over the map -->
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <div
    class="relative -mt-[100dvh] {overPick ? 'cursor-pointer' : ''}"
    onclick={(e) => {
      if (offMap(e)) return
      const p = pickAt(e.clientX, e.clientY)
      const tale = p && talesOf(stops[active]).find((t) => t.pick === p)
      if (tale) follow(tale)
      else if (p) focusOn(p)
      else unfocus()
    }}
    onmousemove={(e) => (overPick = !offMap(e) && !focus && !!pickAt(e.clientX, e.clientY))}
  >
    {#each stops as stop, i (stop.id)}
      {@const ev = event(stop.eventId)}
      {@const source = stop.sourceId ? sourceById.get(stop.sourceId) : null}
      <section bind:this={sections[i]} data-index={i} class="flex min-h-dvh snap-center snap-always items-center px-4 py-24 md:pr-10 md:pl-16 lg:pl-56">
        <article
          class="w-full max-w-sm rounded-lg bg-white/92 p-6 shadow-sm backdrop-blur-sm transition-opacity duration-500 {focus ? 'pointer-events-none opacity-0' : i === active ? 'opacity-100' : 'opacity-40'}"
        >
          {#if firstOf.includes(i)}
            <p class="font-display mb-4 text-xs font-semibold tracking-wide text-[var(--ink-3)] uppercase">Chapter {numberOf(chapterOf[i].chapterId)} · {chapterOf[i].title}</p>
          {/if}
          <p class="font-display text-xs tracking-wide text-[var(--ink-3)] uppercase tabular-nums">{stop.kicker}</p>
          <h2 class="font-display mt-1 text-2xl font-semibold tracking-tight">{stop.title}</h2>
          {#each stop.text as paragraph (paragraph)}
            <p class="mt-3 leading-relaxed text-[var(--ink-2)]">{paragraph}</p>
          {/each}

          {#each talesOf(stop) as tale (tale.label)}
            <!-- a hotel's own history, followed from this card: set apart in the accent colour, with its picture -->
            <button type="button" onclick={() => i === active && follow(tale)} class="group mt-4 flex w-full cursor-pointer items-stretch overflow-hidden border-l-4 border-[#8e4233] bg-[#8e4233]/8 text-left hover:bg-[#8e4233] hover:text-white">
              {#if tale.pick.photo}
                <img src="{import.meta.env.BASE_URL}images/{tale.pick.photo.file}" alt="" class="h-20 w-20 shrink-0 object-cover grayscale" />
              {/if}
              <span class="flex flex-col justify-center px-3 py-2">
                <span class="font-display text-[10px] tracking-widest text-[#8e4233] uppercase group-hover:text-white">◆ Side story</span>
                <span class="font-display text-base leading-tight font-semibold">{tale.pick.name}</span>
                <span class="mt-0.5 text-xs text-[var(--ink-3)] group-hover:text-white">{tale.span[0]} to {tale.span[1]} · follow it through the years →</span>
              </span>
            </button>
          {/each}

          {#if stop.pickable?.length}
            <!-- the buildings that can be gone to, by name, for when they are small on the map -->
            <ul class="mt-4 flex flex-wrap gap-1.5">
              {#each stop.pickable as p (p.name)}
                <li><button type="button" onclick={() => i === active && focusOn(p)} class="font-display cursor-pointer border border-[#8e4233] px-2 py-1 text-[11px] tracking-wide text-[#8e4233] uppercase hover:bg-[#8e4233] hover:text-white">{p.name}</button></li>
              {/each}
            </ul>
          {/if}

          {#if stop.photos?.length}
            <StopPhotos photos={stop.photos} />
          {/if}

          <!-- Sources and caveats, folded away until asked for -->
          <details class="mt-4 border-t border-[var(--rule-soft)] pt-3 text-xs text-[var(--ink-3)]">
            <summary class="font-display cursor-pointer tracking-wide uppercase select-none">Sources and notes</summary>
            <div class="mt-2 space-y-1">
            {#if ev}
              <p>
                {ev.verified ? 'Source' : 'Not yet verified. Check against'}:
                {ev.citations.map((c) => sourceById.get(c.sourceId)).filter((src) => !!src).map((src) => `${src.author}, "${src.title}"`).join('; ')}
              </p>
            {:else if source}
              <p>Source: {source.author}, {source.title}</p>
            {/if}
            {#if stop.context}
              <p>{stop.context.note} {sourceById.get(stop.context.sourceId)?.author}.</p>
            {/if}
            {#each stop.sites as id (id)}
              {@const site = siteById.get(id)}
              {#if site && !site.located}
                <p class="text-rose-700">{site.label}: location not yet confirmed.</p>
              {/if}
            {/each}
            {#each stop.models ?? [] as [, modelId] (modelId)}
              {@const model = buildingModels.find((b) => b.id === modelId)}
              {#if model && model.basis === 'type'}
                <p class="text-rose-700">{model.name}: drawn as a typical building, not from an image of it.</p>
              {/if}
            {/each}
            {#each stop.routes ?? [] as id (id)}
              {@const route = routeById.get(id)}
              {#if route && !route.located}
                <p class="text-rose-700">{route.caveat ?? "The dashed line follows today's tracks, as a stand-in for the original route."}</p>
              {/if}
            {/each}
            </div>
          </details>
        </article>
      </section>
    {/each}

  </div>
</div>

<style>
  .side-year { accent-color: #8e4233; cursor: ew-resize; }
</style>
