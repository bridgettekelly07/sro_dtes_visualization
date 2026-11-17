<script lang="ts">
  /**
   * The base map: the Downtown Eastside in 3D, in greyscale, filling the window.
   *
   * The drawing comes from the sro_floorplate_optimizer project (Map3D.svelte
   * and district3d.js in this folder). This component loads the data and sets
   * the map up as a neutral base: no SRO highlighting, no hover or selection,
   * no trees. Colours are the `--m3-*` tokens in src/app.css.
   */
  import { onMount } from 'svelte'
  import Map3D from './Map3D.svelte'
  import { loadAll } from './data.js'
  import { makeProj, mapBbox } from './projection.js'
  import { css, hexOf } from './colours.js'
  import { WATER } from './groundTexture.js'
  import { PARK } from './parkShade.js'

  // Charcoal: the washes over water and parks are held to grey and kept quiet,
  // a soft cloudiness with little grain, calmer than the optimizer's own settings
  // (mottle 0.14 and 0.04 for water, 0.14 and grain 0.04 for parks).
  WATER.tint = 0
  WATER.deep = 0.5 // how much darker the water gets far from shore
  WATER.deepM = 1400 // metres from shore over which most of that darkening happens
  WATER.mottle = 0.11 // broad clouds
  WATER.mottle2 = 0.02 // finer layer
  PARK.mottle = 0.07
  PARK.grain = 0.02

  // Raw: the files are large and never change, so they need no reactivity inside them.
  let data = $state.raw<any>(null)
  onMount(async () => {
    // Street names are painted into images, so the typeface has to have arrived before the map is built.
    await document.fonts.load('700 40px "din-2014-narrow"').catch(() => {})
    const loaded = await loadAll()
    data = { ...loaded, trees: null } // no trees for now; delete this override to bring them back
  })

  const proj = $derived(data?.streets ? makeProj(mapBbox(data.surveyed, data.streets.bbox)) : null)
  const ready = $derived(!!(data && proj && data.surveyed.length && data.foot))

  // Every building, SRO or not, takes the one building colour.
  const colourOf = () => hexOf(css('--m3-bldg'))

  let map = $state<{ zoom: (factor: number) => void }>()
  let fail = $state('')
  let busy = $state(0)
</script>

<div class="relative h-dvh w-full overflow-hidden bg-[var(--m3-sky)] text-[var(--ink)]">
  {#if ready}
    <Map3D
      bind:this={map}
      {data}
      {proj}
      scen={null}
      mode="tenure"
      theme="light"
      plain
      {colourOf}
      bandsOf={() => null}
      sel={null}
      onSelect={() => {}}
      onHover={() => {}}
      onFail={(message: string) => (fail = message)}
      onBusy={(on: boolean) => (busy = Math.max(0, busy + (on ? 1 : -1)))}
    />
  {/if}

  <p class="pointer-events-none absolute top-3 left-3 rounded-md bg-white/80 px-3 py-1.5 text-xs text-[var(--ink-2)] backdrop-blur-sm">
    {#if fail}
      The 3D view could not start: {fail}
    {:else if !ready}
      Loading the district…
    {:else}
      Drag to move, shift-drag to orbit, scroll to zoom.
    {/if}
  </p>

  <div class="absolute top-3 right-3 flex flex-col gap-1">
    <button type="button" class="control" aria-label="Zoom in" onclick={() => map?.zoom(0.7)}>+</button>
    <button type="button" class="control" aria-label="Zoom out" onclick={() => map?.zoom(1 / 0.7)}>−</button>
  </div>

  {#if busy > 0}
    <p class="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-md bg-white/80 px-3 py-1 text-xs">Drawing…</p>
  {/if}
</div>

<style>
  .control {
    width: 2rem;
    height: 2rem;
    border: 1px solid var(--rule);
    border-radius: 0.375rem;
    background: rgb(255 255 255 / 0.9);
  }
  .control:hover {
    border-color: var(--ink);
  }
</style>
