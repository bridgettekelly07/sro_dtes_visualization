<script lang="ts">
  /**
   * Archival photographs for a stop, shown inside the stop's card.
   * One photograph is large; the rest are thumbnails that swap in when chosen.
   * A photograph whose file is not in the project yet is left out, so adding
   * the file later is all it takes for it to appear.
   */
  import type { Photo } from '../data/stops'

  let { photos }: { photos: Photo[] } = $props()

  const base = `${import.meta.env.BASE_URL}images/`
  let missing = $state<Record<string, boolean>>({})
  const available = $derived(photos.filter((p) => !missing[p.file]))
  let chosen = $state<string | null>(null)
  const current = $derived(available.find((p) => p.file === chosen) ?? available[0])
</script>

{#if current}
  <div class="mt-4">
    <figure>
    <a href={current.recordUrl} target="_blank" rel="noreferrer" title="Open the archive record">
      <img
        src={base + current.file}
        alt={current.alt}
        class="max-h-[34vh] w-full rounded-sm object-contain"
        onerror={() => { if (current) missing = { ...missing, [current.file]: true } }}
      />
    </a>
    <figcaption class="mt-2 text-xs leading-snug text-[var(--ink-2)]">
      <span class="font-display font-semibold tracking-wide text-[var(--ink)] uppercase">{current.title}</span>
      <span class="tabular-nums"> · {current.date}</span>
      {#if current.note}<span class="block">{current.note}</span>{/if}
      <span class="block text-[var(--ink-3)]">{current.credit}, {current.ref}. Public domain.</span>
    </figcaption>
    </figure>

    {#if available.length > 1}
      <div class="mt-2 flex gap-1.5 overflow-x-auto">
        {#each available as p (p.file)}
          <button
            type="button"
            onclick={() => (chosen = p.file)}
            aria-label="{p.title}, {p.date}"
            aria-pressed={p.file === current.file}
            class="h-12 w-16 shrink-0 overflow-hidden rounded-sm border-2 {p.file === current.file ? 'border-[var(--ink)]' : 'border-transparent opacity-70 hover:opacity-100'}"
          >
            <img src={base + p.file} alt="" class="h-full w-full object-cover" onerror={() => (missing = { ...missing, [p.file]: true })} />
          </button>
        {/each}
      </div>
    {/if}
  </div>
{/if}

<!-- Files not yet in the project are tried once, out of sight, so they can be ruled out. -->
<div class="hidden">
  {#each photos as p (p.file)}
    <img src={base + p.file} alt="" onerror={() => (missing = { ...missing, [p.file]: true })} />
  {/each}
</div>
