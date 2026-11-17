<script lang="ts">
 import { onMount } from 'svelte';
 import { takeOverlayActivation, onOverlayActivation } from '$lib/bridge';
 import Compact from '$lib/components/Compact.svelte';
 import Panel from '$lib/components/Panel.svelte';
 import { bindHotkeys, isTauri, keepAlive, loadData, makeClickThrough, on, onDataChanged, placeOverlay, send, unbindHotkeys, gameActive, onGameFocus, onRegionSelecting, setEditing, dragOverlay, overlayPosition, onNativeEdit, readWorkers } from '$lib/bridge';
 import { clampIndex, indexForPop } from '$lib/steps';
 import { PracticeClock, newPractice, recordArrival } from '$lib/practice';
 import { parseVillagerReading, nextWorkerTarget, VillagerTotalGate } from '$lib/ocr';
 import type { AppData, HotkeyAction, Practice } from '$lib/types';

 let data = $state<AppData | null>(null);
 let stepIndex = $state(0);
 let visible = $state(true);
 let active = $state(!isTauri);
 let editing = $state(false);
 let suspended = $state(false);
 let selecting = $state(false);
 let preview = $state(false);
 let root = $state<HTMLDivElement>();
 let elapsed = $state<number | null>(null);
 let practice: Practice | null = null;
 let clock = new PracticeClock();
 let failedHotkeys: string[] = [];
 let lastActiveId: string | null = null;
 let ocrBusy = false;
 const gate = new VillagerTotalGate();
 let ocrMessage = $state('');
 let error = $state('');
 const settings = $derived(data?.settings ?? null);
 const build = $derived(data ? (data.builds.find(b => b.id === data!.settings.activeBuildId) ?? null) : null);
 const index = $derived(clampIndex(build, stepIndex));
 const hotkeyKey = $derived(settings ? JSON.stringify(settings.hotkeys) : '');

 function report() {
   elapsed = practice ? Math.floor(clock.elapsed()) : null;
   void send('practice-status', { elapsed, running: clock.running, step: index + 1, buildName: build?.name ?? '', recording: !!practice, editing });
 }
 function savePractice() { if (practice) void send('practice-update', practice); }
 function invalidateOcr() { gate.reset(); }
 function arrive() {
   if (practice && build) { recordArrival(practice, build, index, clock.elapsed()); savePractice(); }
   report();
 }
 function finish() {
   invalidateOcr();
   if (!practice) return;
   clock.pause(); practice.finishedAt = Date.now(); savePractice();
   void send('practice-finished', practice.id);
   practice = null; report();
 }
 function applyData(incoming: AppData) {
   if (incoming.settings.activeBuildId !== lastActiveId) {
     finish(); lastActiveId = incoming.settings.activeBuildId; stepIndex = 0;
     clock = new PracticeClock(); elapsed = null;
   }
   const positionChanged = JSON.stringify(data?.settings.position) !== JSON.stringify(incoming.settings.position);
   data = incoming;
   if (editing && root && positionChanged) {
     const rect = root.getBoundingClientRect(), s = incoming.settings;
     void placeOverlay(rect.width, rect.height, s.corner, s.offsetX, s.offsetY, s.position).catch(e => error = String(e));
   }
 }
 function persist(patch: Partial<AppData['settings']>) {
   void send('overlay-settings', patch);
 }
 async function edit(value = !editing) {
   try {
     if (!value && data) { data.settings.position = await overlayPosition(); persist({ position: data.settings.position }); }
     await setEditing(value || preview); editing = value; visible = true; report();
   } catch (e) { error = String(e); }
 }
 function start() {
   if (!build?.steps.length) return;
   if (!practice) { invalidateOcr(); practice = newPractice(build); clock = new PracticeClock(); }
   clock.start(); visible = true; arrive();
 }
 function adjust(delta: number) {
   if (!practice) return;
   const before = clock.elapsed(); clock.adjust(delta);
   const applied = clock.elapsed() - before;
   practice.arrivals.forEach(a => a.elapsed = Math.max(0, Math.round(a.elapsed + applied)));
   savePractice(); report();
 }
 const actions: Record<HotkeyAction, () => void> = {
   next() { invalidateOcr(); if (!build) return; if (index === build.steps.length - 1) { finish(); return; } stepIndex = clampIndex(build, index + 1); arrive(); },
   prev() { invalidateOcr(); if (build) stepIndex = clampIndex(build, index - 1); report(); },
   start,
   pauseClock() { invalidateOcr(); if (!practice) start(); else { if (clock.running) clock.pause(); else clock.start(); report(); } },
   clockPlus() { adjust(5); }, clockMinus() { adjust(-5); },
   resetPractice() { finish(); stepIndex = 0; clock = new PracticeClock(); start(); },
   resetClock() { finish(); start(); },
   finishPractice: finish,
   editPosition() { void edit(); },
   toggleVisible() { visible = !visible; },
   toggleCompact() { if (data) { data.settings.compact = !data.settings.compact; persist({ compact: data.settings.compact }); } },
   cycleBuild() {
     if (!data || !build) return;
     const sameCiv = data.builds.filter(b => b.civ === build.civ);
     const pool = sameCiv.length > 1 ? sameCiv : data.builds;
     if (pool.length < 2) return;
     const target = pool[(pool.findIndex(b => b.id === build.id) + 1) % pool.length];
     const pop = build.steps[index]?.pop ?? null;
     const wasRunning = clock.running, seconds = clock.elapsed(); finish();
     lastActiveId = target.id; data.settings.activeBuildId = target.id;
     stepIndex = indexForPop(target, pop);
     clock = new PracticeClock(); clock.adjust(seconds);
     if (wasRunning) { practice = newPractice(target); clock.start(); recordArrival(practice, target, stepIndex, seconds); savePractice(); }
     persist({ activeBuildId: target.id }); report();
   }
 };
 async function scan() {
   if (!settings?.ocr.enabled || settings.ocr.source !== 'workers' || !settings.ocr.idleRegion || !active || editing || selecting || !clock.running || !build || ocrBusy) return;
   ocrBusy = true;
   const generation = gate.generation, buildId = build.id, previousIndex = index;
   try {
     const rows = await readWorkers(settings.ocr);
     if (!gate.isCurrent(generation) || !active || editing || selecting || !clock.running || build?.id !== buildId || index !== previousIndex) return;
     const reading = parseVillagerReading(rows);
     const total = reading?.total ?? null, stable = gate.read(total);
     const target = nextWorkerTarget(build, index);
     ocrMessage = reading === null
       ? `Revisá las regiones: comida ${rows[0] || '—'}, madera ${rows[1] || '—'}, oro ${rows[2] || '—'}, piedra ${rows[3] || '—'}, inactivos ${rows[4] || '—'}. Se necesitan cinco números.`
       : `Aldeanos: ${total} · C ${reading.workers.food} / M ${reading.workers.wood} / O ${reading.workers.gold} / P ${reading.workers.stone} + ${reading.idle} inactivos${stable === null ? ' · confirmando' : target === null ? ' · siguiente paso manual' : ` · objetivo ${target}`}`;
     if (stable !== null && target !== null && stable >= target) actions.next();
   } catch (e) { gate.reset(); ocrMessage = String(e); }
   finally { ocrBusy = false; void send('ocr-status', ocrMessage); }
 }
 onMount(() => {
   let alive = true, polling = false;
   const updateFocus = (value: boolean) => { active = value; if (value) preview = false; };
   const activate = async () => {
     if (await takeOverlayActivation()) {
       const inGame = await gameActive();
       if (alive) { updateFocus(inGame); visible = true; preview = !inGame; }
     }
   };
   void makeClickThrough().catch(e => error = String(e));
   void loadData().then(applyData);
   const stops = [
     keepAlive(),
     onDataChanged(applyData),
     onGameFocus(updateFocus),
     onOverlayActivation(() => void activate().catch(e => error = String(e))),
     onRegionSelecting(value => { selecting = value; invalidateOcr(); }),
     on('hotkeys-suspend', value => suspended = Boolean(value)),
     on('hotkey-status-request', () => void send('hotkey-status', failedHotkeys)),
     on('overlay-action', value => actions[value as HotkeyAction]?.()),
     onNativeEdit(() => void edit(true)),
     on('practice-status-request', report),
     on('restore-session', () => { practice = null; clock = new PracticeClock(); stepIndex = 0; elapsed = null; invalidateOcr(); report(); }),
     on('goto-step', value => { invalidateOcr(); stepIndex = clampIndex(build, Number(value) || 0); visible = true; report(); })
   ];
   const focus = async () => {
     if (polling) return; polling = true;
     try { const value = await gameActive(); if (alive) { updateFocus(value); await activate(); } }
     catch { if (alive) active = false; }
     finally { polling = false; }
   };
   void focus(); const focusTimer = setInterval(() => void focus(), 1000);
   const tick = setInterval(report, 500);
   const ocrTimer = setInterval(() => void scan(), 700);
   return () => { alive = false; stops.forEach(stop => stop()); clearInterval(tick); clearInterval(focusTimer); clearInterval(ocrTimer); void unbindHotkeys(); };
 });
 $effect(() => { void setEditing(editing || preview).catch(e => error = String(e)); });
 $effect(() => {
   if (!hotkeyKey) return;
   if (suspended || selecting || !active) { void unbindHotkeys(); return; }
   void bindHotkeys(JSON.parse(hotkeyKey), action => actions[action as HotkeyAction]?.()).then(failed => { failedHotkeys = failed; void send('hotkey-status', failed); });
 });
 $effect(() => {
   JSON.stringify(settings?.ocr); active; editing;
   invalidateOcr();
 });
 $effect(() => {
   if (!root || !settings || editing) return;
   const { corner, offsetX, offsetY, position } = settings;
   const place = () => { const rect = root!.getBoundingClientRect(); if (rect.width && rect.height) void placeOverlay(rect.width, rect.height, corner, offsetX, offsetY, position).catch(e => error = String(e)); };
   place(); const observer = new ResizeObserver(place); observer.observe(root);
   return () => observer.disconnect();
 });
 $effect(() => {
   if (editing && root && settings) {
     const rect = root.getBoundingClientRect(), s = settings;
     void overlayPosition().then(p => placeOverlay(rect.width, rect.height, s.corner, s.offsetX, s.offsetY, p)).catch(e => error = String(e));
   }
 });
</script>

<svelte:head><title>AoE4 Overlay</title></svelte:head>
{#if data && settings && !selecting && ((visible && active) || editing || preview)}
 <div class="stage" class:browser={!isTauri}>
  <div bind:this={root} class="root" style="zoom: {settings.scale}; opacity: {settings.opacity}">
   {#if preview && !editing}
    <div class="previewbar"><span>Vista previa · Volvé a AoE4 para jugar</span><button type="button" onclick={() => preview = false}>Ocultar</button></div>
   {/if}
   {#if editing}
    <div class="editbar">
     <button type="button" onpointerdown={() => void dragOverlay().catch(e => error = String(e))}>⠿ Arrastrá a cualquier monitor</button>
     <button type="button" onclick={() => void edit(false)}>Listo</button>
    </div>
   {/if}
   {#if error}<div class="notice">{error}</div>{/if}
   {#if settings.ocr.enabled}<div class="ocr-status">OCR · {ocrMessage || 'Esperando partida y reloj'}</div>{/if}
   {#if !build}<div class="notice">No hay builds cargados. Creá uno en la ventana de gestión.</div>
   {:else if settings.compact}<Compact {build} stepIndex={index} accent={settings.accent} {elapsed} showClock={settings.showClock} />
   {:else}<Panel {build} stepIndex={index} accent={settings.accent} {elapsed} showClock={settings.showClock} hotkeys={settings.hotkeys} />{/if}
  </div>
 </div>
{/if}
<style>
 :global(html), :global(body) { overflow: hidden; }
 .stage { display: flex; align-items: flex-start; }
 .stage.browser { min-height: 100vh; padding: 32px; background: #2a3226; }
 .root { display: inline-block; line-height: 0; }
 .root > :global(*) { line-height: normal; }
 .notice { width: 320px; padding: 16px; background: var(--bg); border: 1px solid var(--line); border-radius: 10px; color: var(--soft); }
 .editbar { display: flex; gap: 6px; background: #1b2028; padding: 8px; border: 1px solid #f2b33d; }
 .previewbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 8px 10px; background: #1b2028; color: var(--soft); font-size: 12px; }
 .previewbar button { border: 1px solid var(--line-strong); border-radius: 4px; background: var(--bg); padding: 5px 8px; cursor: pointer; }
 .editbar button { background: #323946; border: 0; padding: 8px; cursor: move; }
 .ocr-status { background: #12151a; color: #9aa2ae; padding: 4px 10px; font-size: 12px; max-width: 380px; }
</style>
