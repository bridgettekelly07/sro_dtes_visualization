/**
 * Annotating a place in the manner of a survey diagram: dash-dot rings at set
 * distances around a centre, the place's name lettered around the top of the
 * outer ring, and each named part as a smaller subheading on a dotted leader,
 * lettered along the radius. Everything is laid flat on the ground.
 *
 * The drawing is sized for the window it will be seen in. The rings are real
 * distances; the lettering is given a height in pixels and converted to metres
 * for the camera distance chosen, so it reads the same in a small pane and on
 * a large screen.
 */

export interface Annotation {
  /** [lon, lat] the rings are centred on. */
  centre: [number, number]
  /** The place's name, lettered large around the top of the outer ring. */
  title: string
  /** Ring radii in metres, smallest first. */
  radii: number[]
  features: { label: string; note?: string; at: [number, number] }[]
  /** Keep the 1880s shoreline's name beside the rings. */
  shoreName?: boolean
}

export interface FineGroup {
  lines: number[][][]
  /** [length of each mark, distance from one mark to the next] in metres. Left out for a solid line. */
  dash?: [number, number]
  width?: number
  colour?: string
  opacity?: number
}

export interface GroundLabel {
  text: string
  lines: number[][][]
  near: number[]
  size: number
  offset: number
  colour: string
  forward?: boolean
  tracking?: number
}

export interface AnnotationLayout {
  view: { lon: number; lat: number; dist: number; theta: number; phi: number; offsetY: number }
  /** The rings. */
  fine: FineGroup[]
  /** The title and the rings' distances. */
  labels: GroundLabel[]
  /** The leaders from each feature to its subheading. */
  featureFine: FineGroup[]
  /** The subheadings. */
  featureLabels: GroundLabel[]
  /** Metres on the ground to one pixel on screen at this view. */
  metresPerPx: number
}

const M_PER_DEG_LAT = 111_200
const INK = '#2b2b2b'
const SUB_PX = 9.5 // height of the subheadings on screen
const RING_NOTE_PX = 8
const FOV = (40 * Math.PI) / 180 // the map camera's vertical field of view
const TOP = Math.PI / 2
const TILT = 0.78 // the camera's lean from straight down: an oblique view from the south

export function layoutAnnotation(
  a: Annotation,
  viewport: { width: number; height: number; panelRight: number; bottomInset?: number },
): AnnotationLayout {
  const mPerDegLon = M_PER_DEG_LAT * Math.cos((a.centre[1] * Math.PI) / 180)
  const at = (angle: number, r: number): number[] => [
    a.centre[0] + (r * Math.cos(angle)) / mPerDegLon,
    a.centre[1] + (r * Math.sin(angle)) / M_PER_DEG_LAT,
  ]

  // How much room there is, in pixels, either side of the centre and above and below it.
  const free = viewport.width >= 640 ? viewport.width - viewport.panelRight : viewport.width
  const roomX = free / 2 - 14
  // Anything standing over the foot of the window (the photographs) is kept clear of.
  const inset = viewport.bottomInset ?? 0
  // Seen at a lean, the ground is foreshortened up the screen, so more of it fits that way.
  const roomY = (((viewport.height - inset) / 2) * 0.9 - 14) / Math.max(Math.cos(TILT) * 1.25, 0.5)
  const outer = a.radii[a.radii.length - 1]
  const labelRing = outer * 1.1 // where the leaders end and the subheadings begin
  const titlePx = Math.max(13, Math.min(19, Math.min(roomX, roomY) / 15))
  const titleWide = a.title.length * titlePx * 0.84

  // Each part's own bearing from the centre.
  const bearings = a.features
    .map((f) => {
      const east = (f.at[0] - a.centre[0]) * mPerDegLon
      const north = (f.at[1] - a.centre[1]) * M_PER_DEG_LAT
      let angle = Math.atan2(north, east)
      if (angle < -TOP) angle += Math.PI * 2 // run from due south round to due south, so the top is not split
      return { f, angle }
    })
    .sort((p, q) => p.angle - q.angle)
  // Where the window is narrow, a long subheading pointing straight east or west would leave
  // no room for the rings. It is swung up or down instead, far enough off the horizontal for
  // the rings to keep a fair size, and its leader runs to it on the diagonal.
  const wanted = Math.min(roomX * 0.82, roomY - titlePx * 1.6) * 0.92
  const clear = (label: string, angle: number) => {
    const tail = 12 + label.length * SUB_PX * 0.8
    const least = Math.acos(Math.min(1, (roomX * 0.78) / (wanted + tail))) + 0.12 // least angle off the horizontal, and a little more
    if (least <= 0) return angle
    // Always swung downward, to the south: the title has the top of the ring.
    if (Math.cos(angle) >= 0) {
      const a = angle > Math.PI ? angle - Math.PI * 2 : angle
      return Math.abs(a) < least ? -least : angle
    }
    return Math.abs(angle - Math.PI) < least ? Math.PI + least : angle
  }
  // The subheadings are spread so that no two collide and none sits under the title,
  // which takes the top of the ring.
  const spread = (ringPx: number) => {
    const half = Math.max((6.5 * Math.PI) / 180, (SUB_PX * 1.3) / ringPx)
    const titleHalf = titleWide / 2 / ringPx + half * 0.6
    const items = [
      ...bearings.map((b) => ({ ...b, angle: clear(b.f.label, b.angle), half, fixed: false })),
      { f: null as (typeof bearings)[number]['f'] | null, angle: TOP, half: titleHalf, fixed: true },
    ].sort((p, q) => p.angle - q.angle)
    for (let pass = 0; pass < 24; pass++) {
      for (let i = 0; i < items.length; i++) {
        const here = items[i]
        const next = items[(i + 1) % items.length]
        const wrap = i === items.length - 1 ? Math.PI * 2 : 0
        const short = here.half + next.half - (next.angle + wrap - here.angle)
        if (short <= 0) continue
        if (here.fixed) next.angle += short
        else if (next.fixed) here.angle -= short
        else {
          here.angle -= short / 2
          next.angle += short / 2
        }
      }
    }
    return items.filter((it) => it.f).map((it) => ({ f: it.f!, angle: it.angle }))
  }
  // The rings are drawn as large as the lettering allows: each subheading runs outward from
  // the ring along its own bearing and has to stay inside the room on that side, and the
  // title needs its height above the ring.
  const fit = (placed: { f: { label: string }; angle: number }[]) =>
    Math.max(
      Math.min(roomX, roomY) * 0.3,
      Math.min(
        roomY - titlePx * 1.6,
        roomX * 0.82, // the rings themselves, with a margin either side
        ...placed.map(({ f, angle }) => {
          const tail = 12 + f.label.length * SUB_PX * 0.8
          // Seen at a lean, whatever lies nearer the camera (to the south) is drawn larger, so it is given less room.
          const near = Math.sin(angle) < 0 ? 0.78 : 0.95
          return Math.min((roomX * near) / Math.max(Math.abs(Math.cos(angle)), 0.05), roomY / Math.max(Math.abs(Math.sin(angle)), 0.05)) - tail
        }),
      ),
    )
  let ringPx = fit(spread(Math.min(roomX, roomY) * 0.5))
  let placed = spread(ringPx)
  ringPx = fit(placed)
  placed = spread(ringPx)
  const px = ringPx / labelRing // pixels per metre on the ground
  const m = (pixels: number) => pixels / px
  const dist = viewport.height / (2 * Math.tan(FOV / 2) * px)

  // A ring as dash, dot, dash, dot: drawn as its separate marks.
  const dashDot = (r: number) => {
    const marks: number[][][] = []
    const count = Math.max(24, Math.round((2 * Math.PI * r) / m(15)))
    const step = (Math.PI * 2) / count
    for (let i = 0; i < count; i++) {
      const from = i * step
      marks.push(Array.from({ length: 4 }, (_, k) => at(from + (k / 3) * step * 0.52, r)))
      marks.push([at(from + step * 0.72, r), at(from + step * 0.8, r)])
    }
    return marks
  }
  const rings = a.radii.flatMap(dashDot)

  const labels: GroundLabel[] = []
  // The title, read left to right over the top of the outer ring.
  const titleHalf = m(titleWide) / 2 / outer
  const titleArc = Array.from({ length: 49 }, (_, i) => at(TOP + titleHalf - (i / 48) * titleHalf * 3, outer))
  labels.push({ text: a.title.toUpperCase(), lines: [titleArc], near: titleArc[0], size: m(titlePx), offset: m(titlePx * 0.45), colour: INK, forward: true, tracking: 0.22 })

  const leaders: number[][][] = []
  const featureLabels: GroundLabel[] = []
  const size = m(SUB_PX)
  for (const { f, angle } of placed) {
    leaders.push([f.at, at(angle, labelRing)])
    // The subheading runs along the radius. On the western side it is set from its far
    // end inward, so that it still reads left to right.
    const start = labelRing + m(7)
    const length = f.label.length * size * 0.8
    const line = Math.cos(angle) >= 0 ? [at(angle, start), at(angle, start + length * 3)] : [at(angle, start + length), at(angle, start - m(2))]
    featureLabels.push({ text: f.label, lines: [line], near: line[0], size, offset: -size * 0.32, colour: INK, forward: true })
  }

  // Each ring's distance, lettered along the ring where the ring is emptiest: the bearing in
  // the lower half that is furthest from every subheading.
  const apart = (p: number, q: number) => Math.abs(Math.atan2(Math.sin(p - q), Math.cos(p - q)))
  let from = (-60 * Math.PI) / 180
  let best = -1
  for (let deg = -175; deg <= -5; deg += 5) {
    const angle = (deg * Math.PI) / 180
    const room = Math.min(...placed.map((p) => apart(p.angle, angle + 0.12)), Math.PI)
    if (room > best) [best, from] = [room, angle]
  }
  for (const r of a.radii) {
    const arc = Array.from({ length: 25 }, (_, i) => at(from + (i / 24) * 0.9, r))
    labels.push({ text: `${r} M`, lines: [arc], near: arc[0], size: m(RING_NOTE_PX), offset: -m(RING_NOTE_PX) * 1.3, colour: INK, forward: true, tracking: 0.2 })
  }

  return {
    // Looked at from the south at a lean, so the buildings stand up and the lettering still reads across.
    view: { lon: a.centre[0], lat: a.centre[1], dist, theta: Math.PI / 2, phi: TILT, offsetY: inset / 2 / viewport.height },
    fine: [{ lines: rings, width: 1, colour: INK, opacity: 0.85 }],
    labels,
    featureFine: [{ lines: leaders, dash: [m(1.4), m(5)], width: 0.9, colour: INK, opacity: 0.7 }],
    featureLabels,
    metresPerPx: 1 / px,
  }
}
