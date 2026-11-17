<script lang="ts">
  import { allEvents, chapters } from '../data/chapters'
  import { tick } from 'svelte'
  import EventCard from './EventCard.svelte'
  import NarrativeEvent from './NarrativeEvent.svelte'
  import Timeline from './Timeline.svelte'
  import RoomsChart from './RoomsChart.svelte'

  let selectedId = $state(chapters[0].id)
  const chapter = $derived(chapters.find((c) => c.id === selectedId) ?? chapters[0])

  const period = (p: { start: number; end: number | null }) =>
    p.end === null ? `${p.start}–now` : `${p.start}–${p.end}`
  const cap = (s: string) => s[0].toUpperCase() + s.slice(1)

  /** Open a chapter and, when an event was picked on the timeline, scroll to its card. */
  async function select(chapterId: string, eventId?: string) {
    selectedId = chapterId
    if (!eventId) return
    await tick()
    document.getElementById(`event-${eventId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // A chapter with no office is read as a story; one with an office is played.
  const isStory = $derived(chapter.office === null)
  const next = $derived(chapters.find((c) => c.index === chapter.index + 1))
  const chronological = $derived([...chapter.events].sort((a, b) => a.year - b.year))

  async function goNext() {
    if (!next) return
    selectedId = next.id
    await tick()
    document.getElementById('chapter-top')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const verifiedCount = allEvents.filter((e) => e.verified).length
</script>

<div class="min-h-screen bg-stone-50 text-stone-900 md:grid md:grid-cols-[18rem_1fr]">
  <nav class="border-b border-stone-200 bg-white p-4 md:sticky md:top-0 md:h-screen md:overflow-y-auto md:border-b-0 md:border-r">
    <h1 class="text-sm font-semibold uppercase tracking-wide text-stone-500">SRO hotels in the DTES</h1>
    <p class="mt-1 text-xs text-stone-500">
      {verifiedCount} of {allEvents.length} events verified
    </p>

    <ol class="mt-4 flex gap-2 overflow-x-auto md:block md:space-y-1">
      {#each chapters as c (c.id)}
        <li class="shrink-0">
          <button
            type="button"
            onclick={() => (selectedId = c.id)}
            aria-current={c.id === selectedId ? 'true' : undefined}
            class="w-full rounded-md px-3 py-2 text-left transition-colors hover:bg-stone-100 aria-[current]:bg-stone-900 aria-[current]:text-white"
          >
            <span class="block font-mono text-xs tabular-nums opacity-70">
              {c.index} · {period(c.period)} · {c.office ? 'Play' : 'Story'}
            </span>
            <span class="block font-medium">{c.title}</span>
          </button>
        </li>
      {/each}
    </ol>
  </nav>

  <main class="mx-auto w-full min-w-0 max-w-4xl p-4 md:p-10">
    <Timeline {selectedId} onselect={select} />
    <div class="mt-4"><RoomsChart /></div>

    <header id="chapter-top" class="mt-10 scroll-mt-4">
      <p class="font-mono text-sm tabular-nums text-stone-500">
        Chapter {chapter.index} · {period(chapter.period)} · {isStory ? 'Story' : 'Play'}
      </p>
      <h2 class="mt-1 text-3xl font-semibold tracking-tight">{chapter.title}</h2>
      <p class="mt-4 text-lg text-stone-700">{chapter.summary}</p>
    </header>

    {#if isStory}
      {#if chapter.body}
        <div class="mt-8 max-w-prose space-y-5 text-lg leading-relaxed text-stone-800">
          {#each chapter.body as paragraph (paragraph.text)}
            {#if paragraph.needsSource}
              <div class="border-l-2 border-rose-300 pl-4">
                <p>{paragraph.text}</p>
                <p class="mt-1 text-xs font-medium text-rose-700">Needs a source</p>
              </div>
            {:else}
              <p>{paragraph.text}</p>
            {/if}
          {/each}
        </div>
      {/if}

      <aside class="mt-8 max-w-prose rounded-lg border border-stone-200 bg-white p-5">
        <p class="text-xs uppercase tracking-wide text-stone-500">The rooms</p>
        <p class="mt-1 text-stone-800">{chapter.sroThread}</p>
      </aside>

      <section class="mt-10">
        <h2 class="text-sm font-semibold uppercase tracking-wide text-stone-500">What happened</h2>
        <ol class="mt-4 max-w-prose border-l border-stone-200 [&>li]:-ml-[6.5px]">
          {#each chronological as event (event.id)}
            <NarrativeEvent {event} />
          {/each}
        </ol>
      </section>
    {:else}
      <dl class="mt-6 grid gap-4 rounded-lg border border-stone-200 bg-white p-5 text-sm md:grid-cols-3">
        <div class="md:col-span-3">
          <dt class="text-xs uppercase tracking-wide text-stone-500">The rooms</dt>
          <dd class="mt-1 text-stone-800">{chapter.sroThread}</dd>
        </div>
        <div>
          <dt class="text-xs uppercase tracking-wide text-stone-500">Player's office</dt>
          <dd class="mt-1 text-stone-800">
            {chapter.office?.title}
            {#if !chapter.office?.verified}<span class="text-rose-700"> (title not verified)</span>{/if}
          </dd>
        </div>
        <div class="md:col-span-2">
          <dt class="text-xs uppercase tracking-wide text-stone-500">Factions with seats</dt>
          <dd class="mt-1 text-stone-800">{chapter.factions.map(cap).join(', ') || 'None'}</dd>
        </div>
      </dl>

      <section class="mt-8 space-y-4">
        <h2 class="text-sm font-semibold uppercase tracking-wide text-stone-500">
          Events ({chapter.events.length})
        </h2>
        {#each chapter.events as event (event.id)}
          <EventCard {event} />
        {:else}
          <p class="text-stone-500">No events written for this chapter yet.</p>
        {/each}
      </section>
    {/if}

    {#if next}
      <button
        type="button"
        onclick={goNext}
        class="mt-12 flex w-full items-center justify-between gap-4 rounded-lg border border-stone-300 bg-white px-5 py-4 text-left transition-colors hover:border-stone-900"
      >
        <span>
          <span class="block text-xs uppercase tracking-wide text-stone-500">
            Next · {period(next.period)} · {next.office ? 'Play' : 'Story'}
          </span>
          <span class="block text-lg font-semibold">{next.title}</span>
        </span>
        <span class="text-2xl" aria-hidden="true">→</span>
      </button>
    {/if}
  </main>
</div>
