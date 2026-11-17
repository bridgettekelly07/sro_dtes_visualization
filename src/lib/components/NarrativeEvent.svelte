<script lang="ts">
  import type { ChapterEvent } from '../data/types'
  import { sourceById } from '../data/sources'

  let { event }: { event: ChapterEvent } = $props()

  const years = $derived(event.endYear ? `${event.year}–${event.endYear}` : `${event.year}`)
</script>

<!-- One entry on a narrative chapter's rail: the event as history, with no recommendations. -->
<li id="event-{event.id}" class="relative scroll-mt-4 pb-8 pl-8 last:pb-0">
  <span
    class="absolute top-1.5 left-0 h-3 w-3 rounded-full border-2 {event.verified
      ? 'border-stone-900 bg-stone-900'
      : 'border-stone-400 bg-stone-50'}"
    aria-hidden="true"
  ></span>

  <p class="font-mono text-sm tabular-nums text-stone-500">{years}</p>
  <h3 class="mt-0.5 text-lg font-semibold text-stone-900">{event.title}</h3>
  <p class="mt-1 text-stone-700">{event.summary}</p>

  <div class="mt-2 text-xs text-stone-500">
    {#if !event.verified}
      <p class="font-medium text-rose-700">Not yet verified. Check against:</p>
    {/if}
    <ul class="space-y-0.5">
      {#each event.citations as citation (citation.sourceId)}
        {@const source = sourceById.get(citation.sourceId)}
        <li>
          {#if source?.url}
            <a href={source.url} target="_blank" rel="noreferrer" class="underline decoration-stone-300 underline-offset-2 hover:decoration-stone-600">
              {source.author}, <cite>{source.title}</cite>
            </a>{:else}{source?.author}, <cite>{source?.title}</cite>{/if}{citation.locator ? `, ${citation.locator}` : ''}
          {#if citation.note}<span class="block">{citation.note}</span>{/if}
        </li>
      {/each}
    </ul>
  </div>
</li>
