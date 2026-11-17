<script lang="ts">
  import { chapters } from '../data/chapters'
  import { roomCounts, roomSources, type RoomCount, type RoomSeries } from '../data/rooms'

  const X0 = 1970
  const X1 = new Date().getFullYear()
  const Y_MAX = 14000
  const X_TICKS = [1970, 1980, 1990, 2000, 2010, 2020]
  const Y_TICKS = [0, 4000, 8000, 12000]

  // Fixed order and colours: a series keeps its colour whatever else is shown.
  const series: Record<RoomSeries, { label: string; short: string; color: string }> = {
    'core-private': { label: 'Private SRO rooms, Downtown Core', short: 'Downtown Core', color: '#2a78d6' },
    'core-all-open': {
      label: 'All open SRO rooms, including government and non-profit owned',
      short: 'All open rooms',
      color: '#eb6834',
    },
    'dtes-private': { label: 'Private SRO rooms, Downtown Eastside only', short: 'Downtown Eastside', color: '#1baf7a' },
  }
  const seriesIds = Object.keys(series) as RoomSeries[]

  let width = $state(800)
  const height = 320
  const m = { top: 30, right: 54, bottom: 26, left: 48 }

  const x = (year: number) => m.left + ((year - X0) / (X1 - X0)) * (width - m.left - m.right)
  const y = (rooms: number) => m.top + (1 - rooms / Y_MAX) * (height - m.top - m.bottom)
  const fmt = (n: number) => n.toLocaleString('en-CA')

  const bySeries = (id: RoomSeries) =>
    roomCounts.filter((d) => d.series === id).sort((a, b) => a.year - b.year)

  /** Consecutive pairs. A gap over four years is dashed: no survey figure sits between. */
  const segments = $derived(
    seriesIds.flatMap((id) => {
      const pts = bySeries(id)
      return pts.slice(1).map((b, i) => {
        const a = pts[i]
        return { id, key: `${id}-${a.year}`, x1: x(a.year), y1: y(a.rooms), x2: x(b.year), y2: y(b.rooms), gap: b.year - a.year > 4 }
      })
    }),
  )

  // Yearly figures read as a line; the sparse surveys after 2010 get a marker each.
  const markers = $derived(
    roomCounts.filter((d) => d.year > 2010).map((d) => ({ d, cx: x(d.year), cy: y(d.rooms) })),
  )

  const chapterMarks = chapters.filter((c) => c.period.start > X0 && c.period.start < X1 - 3)

  // Value labels on the first and last point of each series only.
  const endLabels = $derived(
    seriesIds.flatMap((id) => {
      const pts = bySeries(id)
      const first = pts[0]
      const last = pts[pts.length - 1]
      const out = [{ key: `${id}-last`, d: last, tx: x(last.year) + 9, ty: y(last.rooms) + 4, end: true }]
      if (pts.length > 2) out.push({ key: `${id}-first`, d: first, tx: x(first.year) + 7, ty: y(first.rooms) - 7, end: false })
      return out
    }),
  )

  // End labels that land within a line height of each other are pushed apart.
  const placedLabels = $derived.by(() => {
    const ends = endLabels.filter((l) => l.end).sort((p, q) => p.ty - q.ty)
    for (let i = 1; i < ends.length; i++) {
      if (ends[i].ty - ends[i - 1].ty < 14) ends[i].ty = ends[i - 1].ty + 14
    }
    return endLabels
  })

  // Hover: snap to the nearest surveyed date and list every series measured then.
  const dates = [...new Set(roomCounts.map((d) => d.year))].sort((a, b) => a - b)
  let hoverYear = $state<number | null>(null)
  const hoverRows = $derived(
    hoverYear === null
      ? []
      : seriesIds
          .map((id) => roomCounts.find((d) => d.series === id && d.year === hoverYear))
          .filter((d): d is RoomCount => d !== undefined),
  )

  function onmove(event: PointerEvent) {
    const px = event.offsetX
    if (px < m.left - 8 || px > width - m.right + 8) return (hoverYear = null)
    const year = X0 + ((px - m.left) / (width - m.left - m.right)) * (X1 - X0)
    hoverYear = dates.reduce((best, d) => (Math.abs(d - year) < Math.abs(best - year) ? d : best))
  }

  const tableRows = [...roomCounts].sort(
    (a, b) => a.year - b.year || seriesIds.indexOf(a.series) - seriesIds.indexOf(b.series),
  )
</script>

<figure class="rounded-lg border border-stone-200 bg-[#fcfcfb] p-4">
  <figcaption>
    <p class="text-sm font-semibold text-stone-900">Private SRO rooms, 1970 to 2023</p>
    <p class="mt-0.5 text-xs text-stone-600">
      City of Vancouver survey counts. Rooms bought by government or non-profits leave the private count.
    </p>
    <ul class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-600">
      {#each seriesIds as id (id)}
        <li class="flex items-center gap-1.5">
          <svg width="16" height="10" aria-hidden="true">
            <line x1="0" x2="16" y1="5" y2="5" stroke={series[id].color} stroke-width="2" />
          </svg>
          {series[id].label}
        </li>
      {/each}
    </ul>
  </figcaption>

  <div class="relative mt-2 w-full min-w-0" bind:clientWidth={width}>
    <svg
      {width}
      {height}
      role="img"
      aria-label="Line chart of private SRO rooms in the Downtown Core and Downtown Eastside by year. The figures are in the table below."
      class="block touch-pan-y"
      onpointermove={onmove}
      onpointerleave={() => (hoverYear = null)}
    >
      {#each Y_TICKS as tick (tick)}
        <line x1={m.left} x2={width - m.right} y1={y(tick)} y2={y(tick)} stroke={tick === 0 ? '#c3c2b7' : '#e1e0d9'} stroke-width="1" />
        <text x={m.left - 8} y={y(tick) + 4} text-anchor="end" font-size="11" fill="#898781" class="tabular-nums">{fmt(tick)}</text>
      {/each}
      {#each X_TICKS as tick (tick)}
        <text x={x(tick)} y={height - 8} text-anchor="middle" font-size="11" fill="#898781" class="tabular-nums">{tick}</text>
      {/each}

      {#each chapterMarks as c (c.id)}
        <line x1={x(c.period.start)} x2={x(c.period.start)} y1={m.top - 6} y2={height - m.bottom} stroke="#c3c2b7" stroke-width="1" stroke-dasharray="2 3" />
        <text x={x(c.period.start) + 4} y={m.top - 12} font-size="11" fill="#52514e">
          Ch. {c.index}<title>{c.title}, from {c.period.start}</title>
        </text>
      {/each}

      {#if hoverYear !== null}
        <line x1={x(hoverYear)} x2={x(hoverYear)} y1={m.top} y2={height - m.bottom} stroke="#898781" stroke-width="1" />
      {/if}

      {#each segments as s (s.key)}
        <line x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke={series[s.id].color} stroke-width="2" stroke-linecap="round" stroke-dasharray={s.gap ? '2 6' : undefined} />
      {/each}

      {#each markers as p (p.d.series + p.d.year)}
        <circle cx={p.cx} cy={p.cy} r="4" fill={series[p.d.series].color} stroke="#fcfcfb" stroke-width="2" />
      {/each}

      {#each hoverRows as d (d.series)}
        <circle cx={x(d.year)} cy={y(d.rooms)} r="5" fill={series[d.series].color} stroke="#fcfcfb" stroke-width="2" />
      {/each}

      {#each placedLabels as l (l.key)}
        <text x={l.tx} y={l.ty} font-size="12" font-weight="600" fill="#0b0b0b" class="tabular-nums">
          {fmt(l.d.rooms)}
        </text>
      {/each}
    </svg>

    {#if hoverYear !== null && hoverRows.length}
      {@const cx = x(hoverYear)}
      {@const flip = cx > width / 2}
      <div
        class="pointer-events-none absolute top-8 z-10 w-56 rounded-md border border-stone-200 bg-white p-3 text-sm shadow-md"
        style:left={flip ? undefined : `${cx + 12}px`}
        style:right={flip ? `${width - cx + 12}px` : undefined}
      >
        <p class="text-xs text-stone-500">{hoverRows[0].asOf}</p>
        <ul class="mt-1 space-y-1">
          {#each hoverRows as d (d.series)}
            <li class="flex items-baseline justify-between gap-3">
              <span class="flex items-center gap-1.5 text-xs text-stone-600">
                <svg width="10" height="10" class="shrink-0" aria-hidden="true">
                  <circle cx="5" cy="5" r="4" fill={series[d.series].color} />
                </svg>
                {series[d.series].short}
              </span>
              <span class="font-semibold tabular-nums text-stone-900">{d.approximate ? '~' : ''}{fmt(d.rooms)}</span>
            </li>
          {/each}
        </ul>
      </div>
    {/if}
  </div>

  <details class="mt-2 text-sm">
    <summary class="cursor-pointer text-xs font-medium text-stone-600">Data and sources</summary>
    <div class="mt-2 max-h-80 overflow-auto">
      <table class="w-full min-w-[34rem] text-left text-xs">
        <thead class="sticky top-0 bg-[#fcfcfb] text-stone-500">
          <tr>
            <th class="py-1 pr-3 font-medium">As of</th>
            <th class="py-1 pr-3 font-medium">Counted</th>
            <th class="py-1 pr-3 text-right font-medium">Rooms</th>
            <th class="py-1 pr-3 text-right font-medium">Buildings</th>
            <th class="py-1 font-medium">Source</th>
          </tr>
        </thead>
        <tbody class="text-stone-700">
          {#each tableRows as d (d.series + d.year)}
            <tr class="border-t border-stone-100 align-top">
              <td class="py-1.5 pr-3 whitespace-nowrap">{d.asOf}</td>
              <td class="py-1.5 pr-3">{series[d.series].short}</td>
              <td class="py-1.5 pr-3 text-right tabular-nums">{d.approximate ? '~' : ''}{fmt(d.rooms)}</td>
              <td class="py-1.5 pr-3 text-right tabular-nums">{d.buildings ?? ''}</td>
              <td class="py-1.5">
                <a href={roomSources[d.sourceId].url} target="_blank" rel="noreferrer" class="underline decoration-stone-300 underline-offset-2 hover:decoration-stone-600">
                  {roomSources[d.sourceId].title}
                </a>, PDF p. {d.pdfPage}
                {#if d.note}<span class="block text-stone-500">{d.note}</span>{/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </details>
</figure>
