<script lang="ts">
  import { onMount } from 'svelte';
  import { finishRegionSelection, isTauri, regionSelectorGeometry } from '$lib/bridge';
  import { physicalRegion, selectionRect, type Point, type Rectangle } from '$lib/region';

  let start = $state<Point | null>(null);
  let rect = $state<Rectangle | null>(null);
  let error = $state('');
  let busy = $state(false);
  let bounds = $state<Rectangle | null>(null);
  let width = $state(1), height = $state(1);
  let target = $state<'workers' | 'idle'>('workers');
  const candidate = $derived.by(() => {
    if (!rect || !bounds) return null;
    try { return physicalRegion(rect, bounds, width, height, target); } catch { return null; }
  });

  async function resize() {
    start = null; rect = null; width = window.innerWidth; height = window.innerHeight;
    try { bounds = isTauri ? await regionSelectorGeometry() : { x:0,y:0,width,height }; }
    catch(e) { error = String(e); }
  }
  onMount(() => { target = new URLSearchParams(window.location.search).get('target') === 'idle' ? 'idle' : 'workers'; void resize(); });
  function down(event: PointerEvent) {
    if (busy || event.button !== 0 || (event.target as Element).closest('aside')) return;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    start = { x:event.clientX, y:event.clientY }; rect = null; error = '';
  }
  function move(event: PointerEvent) {
    if (start) rect = selectionRect(start, {x:event.clientX,y:event.clientY}, width, height);
  }
  function up(event: PointerEvent) {
    if (!start) return;
    move(event); start = null;
    if (rect && bounds) {
      try { physicalRegion(rect, bounds, width, height, target); }
      catch(e) { error = e instanceof Error ? e.message : String(e); }
    }
  }
  async function finish(save: boolean) {
    if (busy || (save && !candidate)) return;
    busy = true;
    try { await finishRegionSelection(save ? candidate : null, target); }
    catch(e) { error = String(e); busy = false; }
  }
</script>

<svelte:head><title>Seleccionar región OCR</title></svelte:head>
<svelte:window onresize={() => void resize()} onkeydown={e => { if (e.key === 'Escape') { e.preventDefault(); void finish(false); } }} />
<div class="canvas" role="application" aria-label={target === 'idle' ? 'Seleccionar aldeanos inactivos con el mouse' : 'Seleccionar cuatro contadores de aldeanos con el mouse'} tabindex="-1"
  onpointerdown={down} onpointermove={move} onpointerup={up} onpointercancel={() => start = null}>
  {#if rect}
    <div class="selection" style:left="{rect.x}px" style:top="{rect.y}px" style:width="{rect.width}px" style:height="{rect.height}px">
      {#if target === 'workers'}{#each ['Comida', 'Madera', 'Oro', 'Piedra'] as label, i}<div class="row-guide" style:top="{i * 25}%"><span>{label}</span></div>{/each}{/if}
    </div>
  {/if}
  <aside>
    {#if target === 'idle'}
    <strong>Seleccioná el número de aldeanos inactivos</strong>
    <p>Está arriba de los recursos, junto al aldeano con “Z”. Encerrá solo el número: dejá afuera el ícono y el contador de población. Dejá espacio para hasta tres cifras.</p>
    <p class="example">Este contador se suma a comida + madera + oro + piedra.</p>
    {:else}
    <strong>Seleccioná los cuatro números de aldeanos</strong>
    <p>Solo los números de comida, madera, oro y piedra, incluidos los ceros. Dejá afuera los íconos y los recursos acumulados. Centrá un número en cada franja.</p>
    <p class="example">Ejemplo: 10 + 9 + 0 + 0 = 19 aldeanos asignados.</p>
    {/if}
    {#if candidate}<span class="dimensions">Región: {candidate.width} × {candidate.height} px</span>{/if}
    {#if error}<p class="error" role="alert">{error}</p>{/if}
    <div class="buttons">
      <button class="save" disabled={!candidate || !!start || busy || !isTauri} onclick={() => void finish(true)}>{busy ? 'Guardando…' : 'Guardar región'}</button>
      <button disabled={busy} onclick={() => void finish(false)}>Cancelar · Esc</button>
    </div>
  </aside>
</div>

<style>
  :global(html), :global(body) { overflow: hidden; }
  .canvas { position: fixed; inset: 0; cursor: crosshair; touch-action: none; user-select: none; background: rgba(0,0,0,.12); outline: none; }
  .selection { position: absolute; border: 2px solid #f2b33d; background: transparent; box-shadow: 0 0 0 20000px rgba(0,0,0,.25); pointer-events: none; }
  .row-guide { position: absolute; width: 100%; height: 25%; border-top: 1px dashed #f2b33d; }
  .row-guide:first-child { border-top: 0; }
  .row-guide span { position: absolute; left: calc(100% + 8px); top: 50%; transform: translateY(-50%); padding: 2px 6px; background: #12151a; color: #f2b33d; font-size: 12px; }
  .example { font-size: 13px; color: var(--accent); }
  aside { position: absolute; top: 24px; left: 50%; transform: translateX(-50%); width: min(560px, calc(100% - 32px)); padding: 18px 22px; background: #12151a; border: 1px solid #f2b33d; border-radius: 12px; cursor: default; box-shadow: 0 8px 30px #0008; }
  strong { font-size: 18px; } p { margin: 8px 0 12px; color: var(--soft); } .error { color: var(--late); } .dimensions { color: var(--dim); }
  .buttons { display: flex; gap: 10px; margin-top: 12px; } button { padding: 8px 16px; border: 1px solid var(--line-strong); background: var(--card); border-radius: 6px; cursor: pointer; }
  button.save { background: var(--accent); color: var(--bg); font-weight: 600; } button:disabled { opacity: .45; cursor: default; }
  button:focus-visible { outline: 2px solid white; outline-offset: 2px; }
</style>
