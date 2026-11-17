<script lang="ts">
  import type { ChapterEvent, Effect, FactionId } from '../data/types'
  import { sourceById } from '../data/sources'

  let { event }: { event: ChapterEvent } = $props()

  const agencyLabel = {
    none: 'Happens to the city',
    respond: 'Office responds',
    decide: 'Office recommends, council decides',
  } as const

  const agencyStyle = {
    none: 'bg-stone-200 text-stone-700',
    respond: 'bg-amber-100 text-amber-900',
    decide: 'bg-sky-100 text-sky-900',
  } as const

  const cap = (s: string) => s[0].toUpperCase() + s.slice(1)
  const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`.replace('-', '−'))

  function describe(effect: Effect): string {
    if (effect.kind === 'capital') return `Capital ${signed(effect.delta)}`
    if (effect.kind === 'faction') return `${cap(effect.faction)} support ${signed(effect.delta)}`
    const delay = effect.delayYears ? ` after ${effect.delayYears} yr` : ''
    return `${cap(effect.indicator)} ${signed(effect.delta)}${delay}`
  }

  const stanceEntries = (stances: Partial<Record<FactionId, number>>) =>
    (Object.entries(stances) as [FactionId, number][]).filter(([, value]) => value !== 0)

  const years = $derived(event.endYear ? `${event.year}–${event.endYear}` : `${event.year}`)
</script>

<article id="event-{event.id}" class="scroll-mt-4 rounded-lg border border-stone-200 bg-white p-5">
  <header class="flex flex-wrap items-baseline gap-x-3 gap-y-2">
    <span class="font-mono text-sm tabular-nums text-stone-500">{years}</span>
    <h3 class="text-lg font-semibold text-stone-900">{event.title}</h3>
  </header>

  <p class="mt-2 text-stone-700">{event.summary}</p>

  <div class="mt-3 flex flex-wrap gap-2 text-xs font-medium">
    <span class="rounded-full px-2.5 py-1 {agencyStyle[event.agency]}">{agencyLabel[event.agency]}</span>
    <span class="rounded-full bg-stone-100 px-2.5 py-1 text-stone-700">{cap(event.jurisdiction)}</span>
    {#if event.verified}
      <span class="rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-900">Verified</span>
    {:else}
      <span class="rounded-full bg-rose-100 px-2.5 py-1 text-rose-900">Not yet verified</span>
    {/if}
  </div>

  {#if event.choices?.length}
    <div class="mt-4 grid gap-3 md:grid-cols-2">
      {#each event.choices as choice (choice.id)}
        {@const historical = choice.id === event.historicalChoiceId}
        <section class="rounded-md border p-4 {historical ? 'border-stone-900' : 'border-stone-200'}">
          <div class="flex items-start justify-between gap-3">
            <h4 class="font-medium text-stone-900">{choice.label}</h4>
            <span class="shrink-0 font-mono text-xs text-stone-500">cost {choice.cost}</span>
          </div>
          {#if historical}
            <p class="mt-1 text-xs font-semibold uppercase tracking-wide text-stone-900">
              What the city did{#if !event.historicalChoiceVerified}<span class="font-normal normal-case tracking-normal text-rose-700"> (not yet verified)</span>{/if}
            </p>
          {/if}

          <dl class="mt-3 space-y-2 text-sm">
            <div>
              <dt class="text-xs uppercase tracking-wide text-stone-500">Backs</dt>
              <dd class="text-stone-700">
                {stanceEntries(choice.stances).filter(([, v]) => v > 0).map(([f]) => cap(f)).join(', ') || 'No one'}
              </dd>
            </div>
            <div>
              <dt class="text-xs uppercase tracking-wide text-stone-500">Opposes</dt>
              <dd class="text-stone-700">
                {stanceEntries(choice.stances).filter(([, v]) => v < 0).map(([f]) => cap(f)).join(', ') || 'No one'}
              </dd>
            </div>
            <div>
              <dt class="text-xs uppercase tracking-wide text-stone-500">If adopted</dt>
              <dd class="text-stone-700">{choice.ifAdopted.map(describe).join(' · ') || 'No effect'}</dd>
            </div>
            <div>
              <dt class="text-xs uppercase tracking-wide text-stone-500">If rejected</dt>
              <dd class="text-stone-700">{choice.ifRejected.map(describe).join(' · ') || 'No effect'}</dd>
            </div>
          </dl>
        </section>
      {/each}
    </div>
    {#if !event.historicalChoiceId}
      <p class="mt-2 text-xs text-stone-500">The city's actual choice has not been recorded for this event.</p>
    {/if}
  {/if}

  <footer class="mt-4 border-t border-stone-100 pt-3 text-sm">
    <p class="text-xs uppercase tracking-wide text-stone-500">{event.verified ? 'Sources' : 'Check against'}</p>
    <ul class="mt-1 space-y-0.5 text-stone-700">
      {#each event.citations as citation (citation.sourceId)}
        {@const source = sourceById.get(citation.sourceId)}
        <li>
          {source?.author}, <cite>{source?.title}</cite> ({source?.year}){citation.locator ? `, ${citation.locator}` : ''}
          {#if citation.note}<span class="block text-xs text-stone-500">{citation.note}</span>{/if}
        </li>
      {/each}
    </ul>
  </footer>
</article>
