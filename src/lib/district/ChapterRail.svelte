<script lang="ts">
  /**
   * Where you are in the story: a dotted line down the full height of the window, on the left, with
   * every dot spaced evenly along it: a large dot for
   * each chapter and, under the chapter being told, a small dot for each of its cards. Dots fill
   * in as you reach them. Choosing a card's dot scrolls to it.
   */
  let {
    chapters,
    current,
    cards,
    active,
    onGo,
  }: {
    chapters: { id: string; index: number; title: string; period: { start: number; end: number | null } }[]
    current: string
    cards: { title: string; kicker: string }[]
    active: number
    onGo: (card: number) => void
  } = $props()

  const currentIndex = $derived(chapters.find((c) => c.id === current)?.index ?? 0)
</script>

<nav aria-label="Chapters" class="pointer-events-auto fixed top-8 bottom-8 left-5 z-20 hidden md:block">
  <ol class="relative flex h-full flex-col items-center justify-between">
    <!-- the dotted line behind the dots -->
    <span aria-hidden="true" class="absolute top-1.5 bottom-1.5 left-1/2 -translate-x-1/2 border-l border-dotted border-[var(--ink-3)]"></span>
    {#each chapters as chapter (chapter.id)}
      {@const reached = chapter.index <= currentIndex}
      <li class="relative flex items-center justify-center">
        <button
          type="button"
          onclick={() => chapter.id === current && onGo(0)}
          aria-label="Chapter {chapter.index}: {chapter.title}"
          aria-current={chapter.id === current ? 'step' : undefined}
          class="peer relative block h-3 w-3 rounded-full border border-[var(--ink)] transition-colors duration-500 {reached ? 'bg-[var(--ink)]' : 'bg-[var(--m3-sky)]'} {chapter.id === current ? 'cursor-pointer' : 'cursor-default'}"
        ></button>
        <span
          class="font-display pointer-events-none absolute top-[-5px] left-5 z-30 rounded-sm bg-white/95 px-1.5 py-0.5 whitespace-nowrap text-[10px] tracking-wide text-[var(--ink-2)] uppercase opacity-0 shadow-sm transition-opacity peer-hover:opacity-100 peer-focus-visible:opacity-100"
        >
          {chapter.index} · {chapter.title}
        </span>
      </li>
      {#if chapter.id === current}
        {#each cards as card, i (i)}
          <li class="relative flex items-center justify-center">
            <button
              type="button"
              onclick={() => onGo(i)}
              aria-label="{card.kicker}: {card.title}"
              aria-current={i === active ? 'step' : undefined}
              class="peer relative block h-1.5 w-1.5 cursor-pointer rounded-full border border-[var(--ink)] transition-colors duration-500 {i <= active ? 'bg-[var(--ink)]' : 'bg-[var(--m3-sky)]'} {i === active ? 'ring-2 ring-[var(--ink)]/25' : ''}"
            ></button>
            <span
              class="font-display pointer-events-none absolute top-[-8px] left-5 z-30 rounded-sm bg-white/95 px-1.5 py-0.5 whitespace-nowrap text-[10px] tracking-wide text-[var(--ink-2)] uppercase opacity-0 shadow-sm transition-opacity peer-hover:opacity-100 peer-focus-visible:opacity-100"
            >
              {card.kicker} · {card.title}
            </span>
          </li>
        {/each}
      {/if}
    {/each}
  </ol>
</nav>
