<script lang="ts">
  /**
   * Where you are in the story, and the way around it: a dotted line down the full height of the
   * window, on the left, with every dot spaced evenly along it: a large dot for each chapter and, under
   * the chapter being told, a small dot for each of its cards. Dots fill in as you reach them.
   * Choosing a chapter's dot goes to that chapter's first card; choosing a card's dot goes to the card.
   * Only the chapter being told carries its name, small and without a plate, and only on a wide window;
   * every other name shows when its dot is pointed at, so the line stays out of the way of the map.
   * A card that carries a hotel's side story has a small red diamond beside its dot.
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
    cards: { title: string; kicker: string; tale?: boolean }[]
    active: number
    onGo: (card: number) => void
    onChapter: (id: string) => void
  } = $props()

  const currentIndex = $derived(chapters.find((c) => c.id === current)?.index ?? 0)
  // a name beside its dot, shown when the dot is pointed at
  const label =
    'font-display ml-2.5 rounded-sm bg-white/90 px-1.5 py-0.5 text-left tracking-wide whitespace-nowrap uppercase shadow-sm transition-opacity opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'
  // the name of the chapter being told: always there on a wide window, plain lettering with no plate
  const here =
    'font-display ml-2.5 max-w-[168px] truncate text-left text-[10px] font-semibold tracking-wide whitespace-nowrap text-[var(--ink-2)] uppercase transition-opacity opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 lg:opacity-100'
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
          <span class={chapter.id === current ? here : `${label} text-[10px] text-[var(--ink-2)]`}>{chapter.index} · {chapter.title}</span>
        </button>
      </li>
      {#if chapter.id === current}
        {#each cards as card, i (i)}
          <li class="relative flex h-3 items-center">
            <button
              type="button"
              onclick={() => onGo(i)}
              aria-label="{card.kicker}: {card.title}{card.tale ? ' (with a hotel side story)' : ''}"
              aria-current={i === active ? 'step' : undefined}
              class="group pointer-events-auto relative flex cursor-pointer items-center py-1.5 pl-[3px]"
            >
              <span class="block h-1.5 w-1.5 shrink-0 rounded-full border border-[var(--ink)] transition-colors duration-500 group-hover:ring-2 group-hover:ring-[var(--ink)]/25 {i <= active ? 'bg-[var(--ink)]' : 'bg-[var(--m3-sky)]'} {i === active ? 'ring-2 ring-[var(--ink)]/25' : ''}"></span>
              <!-- a card that carries a hotel's side story: a red mark beside its dot -->
              {#if card.tale}<span aria-hidden="true" class="absolute top-1/2 left-[13px] block h-1.5 w-1.5 -translate-y-1/2 rotate-45 bg-[#8e4233]"></span>{/if}
              <span class="{label} ml-[13px] text-[9px] {i === active ? 'font-semibold text-[var(--ink)]' : 'text-[var(--ink-3)]'}">{card.title}</span>
            </button>
          </li>
        {/each}
      {/if}
    {/each}
  </ol>
</nav>
