<script lang="ts">
  /**
   * Where you are in the story, and the way around it: a dotted line down the full height of the
   * window, on the left, with every dot spaced evenly along it: a large dot for each chapter and, under
   * the chapter being told, a small dot for each of its cards. Dots fill in as you reach them.
   * Choosing a chapter's dot goes to that chapter's first card; choosing a card's dot goes to the card.
   * On a wide window every dot carries its name beside it; on a narrow one the name shows on hover.
   */
  let {
    chapters,
    current,
    cards,
    active,
    onGo,
    onChapter,
  }: {
    chapters: { id: string; index: number; title: string; period: { start: number; end: number | null } }[]
    current: string
    cards: { title: string; kicker: string }[]
    active: number
    onGo: (card: number) => void
    onChapter: (id: string) => void
  } = $props()

  const currentIndex = $derived(chapters.find((c) => c.id === current)?.index ?? 0)
  // a name beside its dot: always there on a wide window, on hover or focus otherwise
  const label =
    'font-display ml-2.5 max-w-[168px] truncate rounded-sm bg-white/90 px-1.5 py-0.5 text-left tracking-wide whitespace-nowrap uppercase shadow-sm transition-opacity opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 lg:opacity-100 group-hover:max-w-none'
</script>

<nav aria-label="Chapters" class="pointer-events-none fixed top-8 bottom-8 left-5 z-20 hidden md:block">
  <ol class="relative flex h-full flex-col items-start justify-between">
    <!-- the dotted line behind the dots -->
    <span aria-hidden="true" class="absolute top-1.5 bottom-1.5 left-1.5 -translate-x-1/2 border-l border-dotted border-[var(--ink-3)]"></span>
    {#each chapters as chapter (chapter.id)}
      {@const reached = chapter.index <= currentIndex}
      <li class="relative flex h-3 items-center">
        <button
          type="button"
          onclick={() => onChapter(chapter.id)}
          aria-label="Chapter {chapter.index}: {chapter.title}"
          aria-current={chapter.id === current ? 'step' : undefined}
          class="group pointer-events-auto relative flex cursor-pointer items-center py-1.5"
        >
          <span class="block h-3 w-3 shrink-0 rounded-full border border-[var(--ink)] transition-colors duration-500 group-hover:ring-2 group-hover:ring-[var(--ink)]/25 {reached ? 'bg-[var(--ink)]' : 'bg-[var(--m3-sky)]'}"></span>
          <span class="{label} text-[10px] {chapter.id === current ? 'font-semibold text-[var(--ink)]' : 'text-[var(--ink-2)]'}">{chapter.index} · {chapter.title}</span>
        </button>
      </li>
      {#if chapter.id === current}
        {#each cards as card, i (i)}
          <li class="relative flex h-3 items-center">
            <button
              type="button"
              onclick={() => onGo(i)}
              aria-label="{card.kicker}: {card.title}"
              aria-current={i === active ? 'step' : undefined}
              class="group pointer-events-auto relative flex cursor-pointer items-center py-1.5 pl-[3px]"
            >
              <span class="block h-1.5 w-1.5 shrink-0 rounded-full border border-[var(--ink)] transition-colors duration-500 group-hover:ring-2 group-hover:ring-[var(--ink)]/25 {i <= active ? 'bg-[var(--ink)]' : 'bg-[var(--m3-sky)]'} {i === active ? 'ring-2 ring-[var(--ink)]/25' : ''}"></span>
              <span class="{label} ml-[13px] text-[9px] {i === active ? 'font-semibold text-[var(--ink)]' : 'text-[var(--ink-3)]'}">{card.title}</span>
            </button>
          </li>
        {/each}
      {/if}
    {/each}
  </ol>
</nav>
