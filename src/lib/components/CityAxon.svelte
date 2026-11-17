<script lang="ts">
  import { onMount } from 'svelte'

  /**
   * The Downtown Eastside as an axonometric line drawing.
   *
   * Every building is its footprint pushed up to its surveyed height, drawn as
   * white faces with ink outlines. Buildings are painted from the back of the
   * view to the front, so nearer ones hide what is behind them, the way a
   * hand-drawn axonometric is built up.
   *
   * Styling hooks: each building is a <g class="building" data-id="..."> holding
   * a `.walls` path and a `.roof` path, so colour or texture can be assigned
   * per building or per face later. The ground is one <g class="ground"> with a
   * path each for `.blocks`, `.parks`, `.rail` and `.shore`.
   */
  interface Building {
    id: number
    h: number
    ring: number[] // x0, y0, x1, y1 ... in metres east and north of the origin
  }
  /** Line work at ground level. Rings and lines are flat x, y lists like a building's ring. */
  interface Ground {
    blocks: number[][]
    parks: { name: string | null; ring: number[] }[]
    rail: number[][]
    shore: number[][]
  }
  interface Drawn {
    id: number
    h: number
    depth: number
    walls: string
    roof: string
  }

  const ELEVATION = 38 // degrees the viewpoint sits above the horizon
  const VIEWS = [
    { label: 'from the south-east', azimuth: 35 },
    { label: 'from the south-west', azimuth: -55 },
    { label: 'from the north-west', azimuth: -145 },
    { label: 'from the north-east', azimuth: 125 },
  ]

  /** `fill` makes the drawing take the whole window instead of sitting in the page as a figure. */
  let { fill = false }: { fill?: boolean } = $props()

  let buildings = $state<Building[]>([])
  let ground = $state<Ground | null>(null)
  let failed = $state(false)
  let viewIndex = $state(0)

  onMount(async () => {
    try {
      const base = `${import.meta.env.BASE_URL}data/`
      const [footprints, groundData] = await Promise.all([
        fetch(`${base}dtes-footprints.json`).then((r) => r.json()),
        fetch(`${base}dtes-ground.json`).then((r) => r.json()),
      ])
      buildings = footprints.buildings
      ground = groundData
    } catch {
      failed = true
    }
  })

  const drawing = $derived.by(() => {
    const a = (VIEWS[viewIndex].azimuth * Math.PI) / 180
    const e = (ELEVATION * Math.PI) / 180
    const [cosA, sinA, sinE, cosE] = [Math.cos(a), Math.sin(a), Math.sin(e), Math.cos(e)]
    // "Away" is the direction the viewer looks along the ground; "right" is across the page.
    const right = (x: number, y: number) => x * cosA + y * sinA
    const away = (x: number, y: number) => -x * sinA + y * cosA
    const px = (x: number, y: number) => right(x, y).toFixed(1)
    const py = (x: number, y: number, z: number) => (-away(x, y) * sinE - z * cosE).toFixed(1)

    let [minX, minY, maxX, maxY] = [Infinity, Infinity, -Infinity, -Infinity]
    const drawn: Drawn[] = buildings.map((b) => {
      const n = b.ring.length / 2
      let area = 0
      let depth = 0
      for (let i = 0; i < n; i++) {
        const [x1, y1] = [b.ring[2 * i], b.ring[2 * i + 1]]
        const [x2, y2] = [b.ring[2 * ((i + 1) % n)], b.ring[2 * ((i + 1) % n) + 1]]
        area += x1 * y2 - x2 * y1
        depth += away(x1, y1)
        const sx = right(x1, y1)
        const syGround = -away(x1, y1) * sinE
        minX = Math.min(minX, sx)
        maxX = Math.max(maxX, sx)
        maxY = Math.max(maxY, syGround)
        minY = Math.min(minY, syGround - b.h * cosE)
      }
      const ccw = area > 0

      let walls = ''
      let roof = ''
      for (let i = 0; i < n; i++) {
        const [x1, y1] = [b.ring[2 * i], b.ring[2 * i + 1]]
        const [x2, y2] = [b.ring[2 * ((i + 1) % n)], b.ring[2 * ((i + 1) % n) + 1]]
        roof += `${i ? 'L' : 'M'}${px(x1, y1)} ${py(x1, y1, b.h)}`
        // A wall is drawn only when its outside face is turned toward the viewer.
        const [nx, ny] = ccw ? [y2 - y1, x1 - x2] : [y1 - y2, x2 - x1]
        if (away(nx, ny) < 0) {
          walls += `M${px(x1, y1)} ${py(x1, y1, 0)}L${px(x2, y2)} ${py(x2, y2, 0)}L${px(x2, y2)} ${py(x2, y2, b.h)}L${px(x1, y1)} ${py(x1, y1, b.h)}Z`
        }
      }
      return { id: b.id, h: b.h, depth: depth / n, walls, roof: roof + 'Z' }
    })

    drawn.sort((p, q) => q.depth - p.depth)

    // Ground line work lies flat at height zero and is drawn before any building.
    const flatPath = (points: number[], close: boolean) => {
      let d = ''
      for (let i = 0; i < points.length; i += 2) {
        const [x, y] = [points[i], points[i + 1]]
        d += `${i ? 'L' : 'M'}${px(x, y)} ${py(x, y, 0)}`
        const [sx, sy] = [right(x, y), -away(x, y) * sinE]
        minX = Math.min(minX, sx)
        maxX = Math.max(maxX, sx)
        minY = Math.min(minY, sy)
        maxY = Math.max(maxY, sy)
      }
      return close ? d + 'Z' : d
    }
    const groundPaths = ground && {
      blocks: ground.blocks.map((r) => flatPath(r, true)).join(''),
      parks: ground.parks.map((p) => flatPath(p.ring, true)).join(''),
      rail: ground.rail.map((r) => flatPath(r, false)).join(''),
      shore: ground.shore.map((r) => flatPath(r, false)).join(''),
    }

    const pad = 30
    return {
      drawn,
      ground: groundPaths,
      box: { x: minX - pad, y: minY - pad, w: maxX - minX + 2 * pad, h: maxY - minY + 2 * pad },
    }
  })

  // Pan and zoom by moving a window (the SVG viewBox) over the drawing.
  let zoom = $state(1)
  let centre = $state<{ x: number; y: number } | null>(null)
  let svg = $state<SVGSVGElement>()

  const viewBox = $derived.by(() => {
    const { box } = drawing
    if (!Number.isFinite(box.w)) return '0 0 100 60'
    const c = centre ?? { x: box.x + box.w / 2, y: box.y + box.h / 2 }
    const [w, h] = [box.w / zoom, box.h / zoom]
    return `${c.x - w / 2} ${c.y - h / 2} ${w} ${h}`
  })

  function currentCentre() {
    const { box } = drawing
    return centre ?? { x: box.x + box.w / 2, y: box.y + box.h / 2 }
  }
  function zoomBy(factor: number) {
    zoom = Math.min(24, Math.max(1, zoom * factor))
    if (zoom === 1) centre = null
  }
  function reset() {
    zoom = 1
    centre = null
  }
  function rotate() {
    viewIndex = (viewIndex + 1) % VIEWS.length
    reset()
  }

  let drag: { x: number; y: number } | null = null
  function onpointerdown(event: PointerEvent) {
    drag = { x: event.clientX, y: event.clientY }
    svg?.setPointerCapture(event.pointerId)
  }
  function onpointermove(event: PointerEvent) {
    if (drag && svg) {
      // Convert the drag from screen pixels to drawing units at the current zoom.
      const unitsPerPixel = drawing.box.w / zoom / svg.clientWidth
      const c = currentCentre()
      centre = { x: c.x - (event.clientX - drag.x) * unitsPerPixel, y: c.y - (event.clientY - drag.y) * unitsPerPixel }
      drag = { x: event.clientX, y: event.clientY }
      return
    }
    highlight(event.target as Element)
  }
  function onpointerup() {
    drag = null
  }
  function onwheel(event: WheelEvent) {
    // Plain scrolling stays with the page; pinch or ctrl/cmd + scroll zooms.
    if (!event.ctrlKey && !event.metaKey) return
    event.preventDefault()
    zoomBy(event.deltaY < 0 ? 1.2 : 1 / 1.2)
  }

  // Hover is handled directly on the element: re-rendering 2,600 buildings to restyle one is wasteful.
  let hoveredEl: Element | null = null
  let hovered = $state<{ id: string; h: string } | null>(null)
  function highlight(target: Element | null) {
    const g = target?.closest?.('g.building') ?? null
    if (g === hoveredEl) return
    hoveredEl?.classList.remove('is-hovered')
    hoveredEl = g
    g?.classList.add('is-hovered')
    hovered = g ? { id: g.getAttribute('data-id') ?? '', h: g.getAttribute('data-h') ?? '' } : null
  }
</script>

<figure class={fill ? 'flex h-dvh flex-col bg-white' : 'rounded-lg border border-stone-200 bg-white'}>
  <figcaption class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-stone-200 px-4 py-3">
    <div>
      <p class="text-sm font-semibold text-stone-900">The Downtown Eastside, seen {VIEWS[viewIndex].label}</p>
      <p class="text-xs text-stone-600">
        {#if hovered}
          Building {hovered.id} · {hovered.h} m tall
        {:else}
          {buildings.length.toLocaleString('en-CA')} buildings at surveyed height. Drag to move; pinch or ctrl-scroll to zoom.
        {/if}
      </p>
    </div>
    <div class="flex gap-1 text-sm">
      <button type="button" class="control" onclick={rotate}>Rotate</button>
      <button type="button" class="control" onclick={() => zoomBy(1.5)} aria-label="Zoom in">+</button>
      <button type="button" class="control" onclick={() => zoomBy(1 / 1.5)} aria-label="Zoom out">−</button>
      <button type="button" class="control" onclick={reset}>Reset</button>
    </div>
  </figcaption>

  {#if failed}
    <p class="p-6 text-sm text-stone-600">The building data could not be loaded.</p>
  {:else}
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <svg
      bind:this={svg}
      {viewBox}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Axonometric line drawing of buildings in the Downtown Eastside"
      class="block w-full cursor-grab touch-none select-none active:cursor-grabbing {fill ? 'min-h-0 flex-1' : 'aspect-[16/10]'}"
      {onpointerdown}
      {onpointermove}
      {onpointerup}
      onpointerleave={() => highlight(null)}
      {onwheel}
    >
      {#if drawing.ground}
        <g class="ground">
          <path class="shore" d={drawing.ground.shore} />
          <path class="blocks" d={drawing.ground.blocks} />
          <path class="parks" d={drawing.ground.parks} />
          <path class="rail" d={drawing.ground.rail} />
        </g>
      {/if}
      {#each drawing.drawn as b}
        <g class="building" data-id={b.id} data-h={b.h}>
          <path class="walls" d={b.walls} />
          <path class="roof" d={b.roof} />
        </g>
      {/each}
    </svg>
  {/if}

  <p class="border-t border-stone-200 px-4 py-2 text-xs text-stone-500">
    City of Vancouver Open Data: building footprints 2009, block outlines, railways, parks and shoreline 2002. Buildings built or demolished since 2009 are not reflected.
  </p>
</figure>

<style>
  /* Ink on paper. Line weight stays constant on screen however far the drawing is zoomed. */
  .building path {
    fill: #ffffff;
    stroke: #1c1917;
    stroke-width: 0.6;
    stroke-linejoin: round;
    vector-effect: non-scaling-stroke;
  }
  /* Ground: lighter than the buildings so they stay in front. Blocks are the
     kerb lines; the white between them is the street. */
  .ground path {
    fill: none;
    stroke-linejoin: round;
    stroke-linecap: round;
    vector-effect: non-scaling-stroke;
  }
  .ground .blocks {
    stroke: #a8a29e;
    stroke-width: 0.6;
  }
  .ground .parks {
    stroke: #78716c;
    stroke-width: 0.6;
    stroke-dasharray: 1 3;
  }
  .ground .rail {
    stroke: #57534e;
    stroke-width: 0.6;
    stroke-dasharray: 5 3;
  }
  .ground .shore {
    stroke: #1c1917;
    stroke-width: 1.2;
  }
  .building :global(.roof) {
    stroke-width: 0.8;
  }
  :global(g.building.is-hovered) path {
    fill: #fde68a;
  }
  .control {
    border: 1px solid #d6d3d1;
    border-radius: 0.375rem;
    padding: 0.125rem 0.625rem;
    background: #fff;
  }
  .control:hover {
    border-color: #1c1917;
  }
</style>
