<script>
  // @ts-nocheck
  // Copied from sro_floorplate_optimizer (frontend/src/components/Map3D.svelte) at commit e506b7b,
  // with additions here for the base map: the `plain` and `bare` props, an `onReady` callback once
  // the first drawing is up, and fly(), marks() and models() passed through to District3D.
  // The three.js district. This component owns the element and the lifecycle;
  // the drawing lives in lib/district3d.js. Building the district blocks the
  // main thread for a moment, so every heavy step is queued behind a paint:
  // the page shows its new state and the loading overlay first, then builds.
  import { onMount, tick } from "svelte";
  import { District3D } from "./district3d.js";

  let { data, proj, scen, mode, theme, colourOf, bandsOf, sel, onSelect, onHover, onFail, onBusy, plain = false, bare = false, onReady = null } = $props();
  let wrap = $state(), labels = $state();
  let d3 = null, started = $state(false), alive = true;

  // heavy work runs one job at a time, each after the browser has painted
  let chain = Promise.resolve(), queued = new Set();
  function heavy(key, fn) {
    if (queued.has(key)) return;           // a build of this kind is already waiting; it will see the latest props
    queued.add(key);
    chain = chain.then(async () => {
      queued.delete(key);
      if (!alive) return;
      onBusy && onBusy(true);
      await tick();
      // one paint before the heavy work; a hidden tab never paints, so fall back to a short timer
      await new Promise((r) => { let done = false; const go = () => { if (!done) { done = true; setTimeout(r, 0); } }; requestAnimationFrame(go); setTimeout(go, 300); });
      if (!alive) return;
      try { fn(); } finally { onBusy && onBusy(false); }
    });
  }

  onMount(() => {
    d3 = new District3D(wrap, labels, { onSelect, onHover });
    d3.setPlain(plain);
    d3.setBare(bare);
    if (import.meta.env.DEV) window.__d3 = d3;   // for poking at the scene from the console
    d3.setData(data, proj);
    heavy("init", () => {
      if (!d3.init()) { onFail("this browser could not start a WebGL context."); return; }
      d3.resize();
      d3.fit();
      d3.setStyle(colourOf, bandsOf);
      d3.setSelected(sel);
      d3.build();
      started = true;
      d3.start(onFail);
      onReady && onReady();
    });
    const ro = new ResizeObserver(() => { if (started) d3.resize(); });
    ro.observe(wrap);
    return () => { alive = false; ro.disconnect(); d3.dispose(); };
  });

  // the policy's colours and bands, rebuilt whenever the scenario or the reading of it changes
  $effect(() => {
    void scen; void mode;
    if (!started) return;
    heavy("scene", () => { d3.setStyle(colourOf, bandsOf); d3.build(); });
  });
  $effect(() => { if (started) d3.setSelected(sel); });
  // the theme's tokens, re-read once the interface has switched
  $effect(() => { void theme; if (started) heavy("theme", () => { d3.colours(); d3.build(); }); });

  export function zoom(f) { d3 && d3.zoom(f); }
  export function fly(view, ms) { d3 && d3.flyTo(view, ms); }
  export function marks(sites, paths, lines) { d3 && d3.setMarks(sites, paths, lines); }
  export function models(list) { d3 && d3.setModels(list); }
  export function dotted(lines) { d3 && d3.setDotted(lines); }
  export function groundText(labels) { d3 && d3.setGroundText(labels); }
  export function fine(groups) { d3 && d3.setFine(groups); }
  export function burn(area) { d3 && d3.setBurn(area); }
  export function land(mask, ms) { d3 && d3.setLand(mask, ms); }
  export function edges(e) { d3 && d3.setModelEdge(e); }
  export function burnReach(m) { d3 && d3.setBurnReach(m); }
  export function burnOpacity(o) { d3 && d3.setBurnOpacity(o); }
  // the land before the city, or the city: a rebuild, so it is queued like the others
  $effect(() => { const on = bare; if (!started) return; heavy("bare", () => { d3.setBare(on); d3.build(); }); });
</script>

<div class="map-3d" bind:this={wrap}>
  <div class="map-3d-labels" bind:this={labels}></div>
</div>

<style>
  .map-3d { position: absolute; inset: 0; overflow: hidden; }
  .map-3d :global(canvas) { display: block; width: 100%; height: 100%; touch-action: none; cursor: grab; }
  .map-3d:global(.orbiting) :global(canvas) { cursor: move; }
  .map-3d:global(.picking) :global(canvas) { cursor: pointer; }
  .map-3d-labels { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
  .map-3d-labels :global(.lbl) { position: absolute; transform: translate(-50%, -100%); white-space: nowrap;
    font-family: "din-2014-narrow", "DIN 2014 Narrow", "DIN Condensed", sans-serif; font-size: 11px; color: var(--ink);
    text-shadow: 0 1px 3px var(--surface), 0 0 6px var(--surface); }
  .map-3d-labels :global(.lbl.sel) { font-weight: 600; font-size: 12.5px; }
  .map-3d-labels :global(.lbl.mark) { font-family: "din-2014", "DIN 2014", "DIN Alternate", sans-serif; font-size: 11.5px; font-weight: 600; letter-spacing: 0.09em; text-transform: uppercase;
    /* base map: white on a black tab, so the name reads over the drawing */
    color: #fff; background: #1f1f1f; padding: 2px 6px 1px; text-shadow: none; }
</style>
