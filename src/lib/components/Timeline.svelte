<script lang="ts">
  import { chapters } from '../data/chapters'
  import type { Agency, ChapterEvent } from '../data/types'

  let {
    selectedId,
    onselect,
  }: {
    selectedId: string
    onselect: (chapterId: string, eventId?: string) => void
  } = $props()

  const START = 1865
  const NOW = new Date().getFullYear()
  const TICKS = [1880, 1900, 1920, 1940, 1960, 1980, 2000, 2020]

  // Agency is the one colour-coded dimension. "None" is neutral and hollow,
  // so the two kinds of events the player acts on carry the colour.
  const agency: Record<Agency, { label: string; fill: string; stroke: string }> = {
    none: { label: 'Happens to the city', fill: '#fcfcfb', stroke: '#898781' },
    respond: { label: 'Office responds', fill: '#eb6834', stroke: '#fcfcfb' },
    decide: { label: 'Office recommends, council decides', fill: '#2a78d6', stroke: '#fcfcfb' },
  }

  let width = $state(800)
  const narrow = $derived(width < 640)
  const gutter = $derived(narrow ? 0 : 236)
  const rowH = $derived(narrow ? 56 : 40)
  const axisH = 26
  const padR = 16
  const height = $derived(axisH + chapters.length * rowH + 6)

  const x = (year: number) =>
    gutter + 8 + ((year - START) / (NOW - START)) * (width - gutter - 8 - padR)

  // Events close in time would overlap, so each takes the first free lane.
  const LANES = [0, 11, -11]
  interface Dot {
    event: ChapterEvent
    chapterId: string
    cx: number
    cy: number
    x2: number | null
  }

  const rows = $derived(
    chapters.map((chapter, i) => {
      const top = axisH + i * rowH
      const mid = top + (narrow ? rowH - 20 : rowH / 2)
      const lastX: number[] = LANES.map(() => -Infinity)
      const dots: Dot[] = [...chapter.events]
        .sort((a, b) => a.year - b.year)
        .map((event) => {
          const cx = x(event.year)
          let lane = lastX.findIndex((lx) => cx - lx >= 12)
          if (lane === -1) lane = 0
          lastX[lane] = event.endYear ? x(event.endYear) : cx
          return {
            event,
            chapterId: chapter.id,
            cx,
            cy: mid + LANES[lane],
            x2: event.endYear ? x(event.endYear) : null,
          }
        })
      return {
        chapter,
        top,
        mid,
        x1: x(chapter.period.start),
        x2: x(chapter.period.end ?? NOW),
        dots,
      }
    }),
  )

  let hovered = $state<Dot | null>(null)
  const years = (e: ChapterEvent) => (e.endYear ? `${e.year}–${e.endYear}` : `${e.year}`)
  const period = (p: { start: number; end: number | null }) => `${p.start}–${p.end ?? 'now'}`
</script>

<figure class="rounded-lg border border-stone-200 bg-[#fcfcfb] p-4">
  <figcaption class="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
    <span class="text-sm font-semibold text-stone-900">Chapters and events, {START} to now</span>
    <ul class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-600">
      {#each Object.values(agency) as a (a.label)}
        <li class="flex items-center gap-1.5">
          <svg width="12" height="12" aria-hidden="true">
            <circle cx="6" cy="6" r="4.5" fill={a.fill} stroke={a.stroke === '#fcfcfb' ? a.fill : a.stroke} stroke-width="1.5" />
          </svg>
          {a.label}
        </li>
      {/each}
    </ul>
  </figcaption>

  <div class="relative mt-3 w-full min-w-0" bind:clientWidth={width}>
    <svg {width} {height} role="group" aria-label="Timeline of chapters and events" class="block">
      <!-- Year axis -->
      {#each TICKS as tick (tick)}
        <line x1={x(tick)} x2={x(tick)} y1={axisH - 4} y2={height} stroke="#e1e0d9" stroke-width="1" />
        <text x={x(tick)} y={12} text-anchor="middle" font-size="11" fill="#898781" class="tabular-nums">{tick}</text>
      {/each}

      {#each rows as row (row.chapter.id)}
        {@const selected = row.chapter.id === selectedId}
        <g>
          {#if selected}
            <rect x="0" y={row.top} {width} height={rowH} rx="6" fill="#f0efec" />
          {/if}

          <text
            x={narrow ? 8 : gutter - 8}
            y={narrow ? row.top + 16 : row.mid + 4}
            text-anchor={narrow ? 'start' : 'end'}
            font-size="13"
            font-weight={selected ? 600 : 400}
            fill={selected ? '#0b0b0b' : '#52514e'}
          >
            {row.chapter.index}. {row.chapter.title}
          </text>

          <!-- Chapter span -->
          <rect
            x={row.x1}
            y={row.mid - 3}
            width={Math.max(row.x2 - row.x1, 6)}
            height="6"
            rx="3"
            fill={selected ? '#898781' : '#e1e0d9'}
          />

          <!-- Whole row selects the chapter -->
          <rect
            x="0"
            y={row.top}
            {width}
            height={rowH}
            fill="transparent"
            class="cursor-pointer"
            role="button"
            tabindex="0"
            aria-label="Chapter {row.chapter.index}: {row.chapter.title}, {period(row.chapter.period)}"
            aria-pressed={selected}
            onclick={() => onselect(row.chapter.id)}
            onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onselect(row.chapter.id))}
          />

          {#each row.dots as dot (dot.event.id)}
            {@const a = agency[dot.event.agency]}
            {#if dot.x2 !== null}
              <line x1={dot.cx} x2={dot.x2} y1={dot.cy} y2={dot.cy} stroke={dot.event.agency === 'none' ? a.stroke : a.fill} stroke-width="2" stroke-linecap="round" />
            {/if}
            <circle
              cx={dot.cx}
              cy={dot.cy}
              r={hovered === dot ? 6.5 : 5}
              fill={a.fill}
              stroke={a.stroke}
              stroke-width={dot.event.agency === 'none' ? 1.5 : 2}
              pointer-events="none"
            />
            <!-- Larger invisible hit target -->
            <circle
              cx={dot.cx}
              cy={dot.cy}
              r="10"
              fill="transparent"
              class="cursor-pointer outline-none"
              role="button"
              tabindex="0"
              aria-label="{years(dot.event)}: {dot.event.title}. {a.label}"
              onmouseenter={() => (hovered = dot)}
              onmouseleave={() => (hovered = null)}
              onfocus={() => (hovered = dot)}
              onblur={() => (hovered = null)}
              onclick={() => onselect(dot.chapterId, dot.event.id)}
              onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onselect(dot.chapterId, dot.event.id))}
            />
          {/each}
        </g>
      {/each}
    </svg>

    {#if hovered}
      {@const flip = hovered.cx > width / 2}
      <div
        class="pointer-events-none absolute z-10 w-56 rounded-md border border-stone-200 bg-white p-3 text-sm shadow-md"
        style:top="{hovered.cy + 14}px"
        style:left={flip ? undefined : `${Math.max(hovered.cx - 12, 0)}px`}
        style:right={flip ? `${Math.max(width - hovered.cx - 12, 0)}px` : undefined}
      >
        <p class="font-mono text-xs tabular-nums text-stone-500">{years(hovered.event)}</p>
        <p class="font-medium text-stone-900">{hovered.event.title}</p>
        <p class="mt-1 flex items-center gap-1.5 text-xs text-stone-600">
          <svg width="10" height="10" aria-hidden="true">
            <circle cx="5" cy="5" r="4" fill={agency[hovered.event.agency].fill} stroke={hovered.event.agency === 'none' ? '#898781' : agency[hovered.event.agency].fill} stroke-width="1" />
          </svg>
          {agency[hovered.event.agency].label}
        </p>
      </div>
    {/if}
  </div>
</figure>
