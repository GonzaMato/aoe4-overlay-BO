<script lang="ts">
 import CivFlag from './CivFlag.svelte';
 import { prettyHotkey } from '$lib/hotkeys';
 import { t, locale, label } from '$lib/i18n';
 import { onMount } from 'svelte';
 import type { Snippet } from 'svelte';
 import { send, isTauri, openRegionSelector, monitorOptions, openBuildPicker } from '$lib/bridge';
 import { automaticAllowed } from '$lib/onboarding';
 import type { Settings, Build } from '$lib/types';
 import type { RosterEntry, SetupStatus } from '$lib/setup';
 import PlayerNameField from './PlayerNameField.svelte';
 let {settings=$bindable(),status,builds,roster=[],onCalibrate,manualCalibration}:{
   settings:Settings;status:SetupStatus|null;builds:Build[];roster?:RosterEntry[];onCalibrate?:()=>void;manualCalibration?:Snippet;
 }=$props();
 let selectionError=$state('');
 let pickerError=$state('');
 const selected=$derived(builds.find(build=>build.id===settings.activeBuildId));
 const needsConfirmation=$derived(!automaticAllowed(settings.onboarding) && ((settings.setup.enabled && settings.setup.autoAdvance) || settings.ocr.enabled));
 function setReading(on:boolean) {
   settings.setup.enabled=on;
   if(!on) {settings.setup.autoAdvance=false;if(settings.onboarding==='detecting')settings.onboarding='skipped';}
 }
 /** Villager advancement waits until the five counters are confirmed once in Home. */
 function setAutoAdvance(on:boolean) {
   settings.setup.autoAdvance=on;
   if(on && settings.onboarding!=='complete')settings.onboarding='detecting';
   if(!on && settings.onboarding==='detecting')settings.onboarding='skipped';
 }
 async function select(target:'workers'|'idle') {
   try {
     const monitors=await monitorOptions(),g=status?.geometry;
     const index=g?monitors.findIndex(m=>g.x>=m.position.x && g.x<m.position.x+m.size.width && g.y>=m.position.y && g.y<m.position.y+m.size.height):0;
     await openRegionSelector(Math.max(0,index),target);selectionError='';
   }catch(e){selectionError=String(e);}
 }
 onMount(()=>{void send('setup-status-request');});
</script>

<div class="setup-group">
<section class="setup-card">
 <label class="toggle">
  <span><strong>{$t("Leer la pantalla del juego", "Read the game screen")}</strong><small>{$t("Reconoce tu civilización en la pantalla de carga, elige su build y sincroniza el reloj con la partida.", "Recognizes your civilization on the loading screen, picks its build, and syncs the timer with the match.")}</small></span>
  <input type="checkbox" role="switch" checked={settings.setup.enabled} onchange={e=>setReading(e.currentTarget.checked)} />
 </label>
 <label class="toggle second" class:off={!settings.setup.enabled}>
  <span><strong>{$t("Avanzar con los contadores de aldeanos", "Advance from villager counters")} <em>Beta</em></strong><small>{$t("Los pasos de recursos avanzan solos. Construir y subir de edad siguen con teclas.", "Resource steps advance on their own. Buildings and age-ups still use hotkeys.")}</small></span>
  <input type="checkbox" role="switch" disabled={!settings.setup.enabled} checked={settings.setup.enabled && settings.setup.autoAdvance} onchange={e=>setAutoAdvance(e.currentTarget.checked)} />
 </label>
 {#if needsConfirmation && onCalibrate}
  <div class="confirmation">
   <p>{$t("El avance automático espera la confirmación de los cinco contadores.", "Automatic advancement is waiting for you to confirm all five counters.")}</p>
   <button onclick={onCalibrate}>{$t("Confirmar en Inicio", "Confirm in Home")}</button>
  </div>
 {:else if settings.setup.enabled}
  <p class="status" role="status">{status?.message || $t("Esperando AoE4", "Waiting for AoE4")}</p>
 {:else if settings.ocr.enabled}
  <p class="status" role="status">{$t("Avance automático con regiones manuales", "Automatic advancement using manual regions")}</p>
 {/if}
 <details class="inline-details">
  <summary>{$t("Detalles de detección y reloj", "Detection and clock details")}</summary>
  <dl>
   <div><dt>{$t("Pantalla y perfil", "Screen and profile")}</dt><dd>{status?.profile || $t("Se detectan al volver al juego", "Detected when you return to the game")}</dd></div>
   <div><dt>{$t("Aldeanos", "Villagers")}</dt><dd>{status?.counters || $t("Comida, madera, oro, piedra e inactivos", "Food, wood, gold, stone and idle")}</dd></div>
   <div><dt>{$t("Reloj", "Clock")}</dt><dd>{status?.clock || $t("Esperando reloj de partida", "Waiting for the in-game clock")}</dd></div>
   <div><dt>{$t("Civilización y build", "Civilization and build")}</dt><dd>{status?.civilization || $t("Ingresá tu nombre o elegí un build", "Enter your player name or choose a build")}</dd></div>
  </dl>
  <div class="actions">
   <button disabled={!settings.setup.enabled} onclick={()=>void send('setup-retry')}>{$t("Volver a detectar", "Detect again")}</button>
   <button disabled={!settings.setup.enabled} onclick={()=>void send('setup-clock-resume')}>{$t("Volver al reloj del juego", "Use game clock")}</button>
  </div>
 </details>
</section>

<section class="setup-card">
 <h3>{$t("Build actual", "Current build")}</h3>
  <button class="selected-build" onclick={()=>{pickerError='';void openBuildPicker().catch(e=>pickerError=String(e));}}>
   {#if selected}<CivFlag civ={selected.civ} size={32}/><span>{label(selected.civ,$locale)} · {selected.name}</span>{/if}
   <strong>{$t('Elegir build…','Choose build…')}</strong>
  </button>
 {#if settings.hotkeys.chooseBuild}<small class="shortcut">{prettyHotkey(settings.hotkeys.chooseBuild, $locale)}</small>{/if}
 {#if pickerError}<p class="error" role="alert">{pickerError}</p>{/if}
 <div class="fields">
  <PlayerNameField bind:settings {roster} />
  <label>{$t("Modo", "Mode")}<select bind:value={settings.setup.mode}>{#each [...new Set([settings.setup.mode,...settings.modes])] as mode}<option value={mode}>{label(mode, $locale)}</option>{/each}</select></label>
 </div>
 {#if !settings.setup.enabled}<p class="note">{$t("Activá «Leer la pantalla del juego» para que el build se elija solo.", "Turn on “Read the game screen” to have the build chosen for you.")}</p>{/if}
</section>

<details class="setup-card calibration">
 <summary>{$t("Calibración de contadores", "Counter calibration")}</summary>
 {#if settings.setup.enabled || !manualCalibration}
  <p class="note">{$t("Marcá solo los números. La corrección se guarda en el perfil de esta pantalla.", "Select just the digits. Corrections are saved to this screen’s profile.")}</p>
  {#if !status?.geometry}<p class="note">{$t("Volvé a AoE4 con el HUD visible para detectar la pantalla.", "Return to AoE4 with the HUD visible to detect the screen.")}</p>{/if}
  <div class="actions">
   <button disabled={!isTauri || !status?.geometry} onclick={()=>void select('workers')}>{$t("Marcar los cuatro recursos", "Select the four resource counters")}</button>
   <button disabled={!isTauri || !status?.geometry} onclick={()=>void select('idle')}>{$t("Marcar inactivos", "Select the idle counter")}</button>
   {#if !manualCalibration}<button onclick={()=>void send('overlay-action','editPosition')}>{$t("Mover overlay", "Move overlay")}</button>{/if}
  </div>
  {#if selectionError}<p class="error" role="alert">{selectionError}</p>{/if}
  {#if manualCalibration}<p class="note">{$t("Para elegir las regiones por monitor, desactivá «Leer la pantalla del juego».", "To select regions by monitor, turn off “Read the game screen”.")}</p>{/if}
 {:else}
  {@render manualCalibration()}
 {/if}
</details>
</div>
<style>
 .setup-group { display: grid; gap: 14px; }
 .setup-card { padding: 18px 22px; border: 1px solid var(--line); border-radius: 10px; background: var(--card); }
 h3 { margin: 0 0 12px; font-size: 17px; }
 label { color: var(--soft); }
 .toggle { display: flex; justify-content: space-between; align-items: center; gap: 20px; cursor: pointer; }
 .toggle strong { font-size: 17px; color: var(--text); }
 .toggle small { display: block; color: var(--dim); margin-top: 4px; }
 .toggle.second { margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--line); }
 .toggle.off { opacity: .55; cursor: default; }
 .toggle em { font-style: normal; font-size: 11px; font-weight: 400; color: var(--dim); margin-left: 6px; text-transform: uppercase; letter-spacing: .06em; }
 .status { color: var(--soft); font-size: 13px; margin: 12px 0 0; }
 .confirmation { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; border-left: 2px solid var(--accent); padding-left: 12px; margin-top: 14px; }
 .confirmation p { margin: 0; color: var(--soft); font-size: 13px; }
 .confirmation button { color: var(--accent); }
 .inline-details { border-top: 1px solid var(--line); margin-top: 14px; padding-top: 12px; }
 .inline-details summary { color: var(--soft); font-size: 13px; }
 dl { margin: 8px 0 12px; }
 dl div { display: grid; grid-template-columns: 140px minmax(0, 1fr); gap: 12px; padding: 6px 0; }
 dt, .shortcut { color: var(--dim); }
 dd { margin: 0; overflow-wrap: anywhere; }
 .actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
 button, input, select { font: inherit; color: inherit; }
 button { padding: 8px 12px; border: 1px solid var(--line-strong); border-radius: 6px; background: var(--bg); cursor: pointer; }
 button:hover:enabled { border-color: var(--accent); }
 button:disabled { opacity: .45; cursor: default; }
 .selected-build { display: flex; width: 100%; align-items: center; gap: 12px; text-align: left; }
 .selected-build > span { flex: 1; min-width: 0; overflow-wrap: anywhere; }
 .selected-build strong { margin-left: auto; max-width: 46%; color: var(--accent); font-size: 12px; }
 .shortcut { display: inline-block; font-size: 12px; margin-top: 6px; }
 .fields { display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); align-items: start; gap: 14px; margin-top: 16px; }
 .fields label { display: grid; gap: 6px; }
 .fields select { min-width: 0; width: 100%; padding: 8px; border: 1px solid var(--line-strong); border-radius: 6px; background: var(--bg); }
 .note { color: var(--dim); font-size: 13px; line-height: 1.5; margin: 12px 0 0; }
 summary { cursor: pointer; font-weight: 600; }
 .error { color: var(--late); }
 @media (max-width: 560px) {
  .setup-card { padding: 16px; }
  .fields { grid-template-columns: 1fr; }
  dl div { grid-template-columns: minmax(100px, 1fr) minmax(0, 2fr); }
 }
</style>
