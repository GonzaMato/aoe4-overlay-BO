<script lang="ts">
 import CivFlag from './CivFlag.svelte';
 import { t, locale, label, resourceLabel } from '#lib/i18n.ts';
 import { onMount } from 'svelte';
 import type { Build, Settings } from '#lib/types.ts';
 import type { RosterEntry, SetupStatus } from '#lib/setup.ts';
 import { canConfirm } from '#lib/onboarding.ts';
 import { isTauri, send, nativeDiagnostic, openBuildPicker } from '#lib/bridge.ts';
 import { parsePack, type BuildPack } from '#lib/build-pack.ts';
 import { hasMissingStarterBuilds } from '#lib/defaults.ts';
 import { prettyHotkey } from '#lib/hotkeys.ts';
 import SetupView from './SetupView.svelte';
 import PlayerNameField from './PlayerNameField.svelte';
 let {settings=$bindable(),builds,status,roster=[],onPack,replacing,onReplace,onBackup,onDone}:{
  settings:Settings;builds:Build[];status:SetupStatus|null;roster?:RosterEntry[];
  onPack:(pack:BuildPack)=>void;replacing:boolean;onReplace:()=>Promise<void>;onBackup:()=>void;onDone:()=>void
 }=$props();

 type Stage='start'|'advance'|'calibrate'|'ready';
 let stage=$state<Stage>('start'),now=$state(Date.now()),error=$state(''),loading=$state(false),correcting=$state(false),busy=$state(false);
 let ocrAvailable=$state<boolean|null>(null);
 let confirmReplace=$state(false);
 let evidenceSince=$state(0);
 const sample=$derived(status?.sample??null);
 const ready=$derived(settings.setup.enabled&&canConfirm(sample,now,evidenceSince));
 const selected=$derived(builds.find(b=>b.id===settings.activeBuildId));
 const missingStarterBuilds=$derived(hasMissingStarterBuilds(builds,$locale));
 const automatic=$derived(settings.setup.enabled&&settings.setup.autoAdvance&&settings.onboarding==='complete');
 const resources = ['food', 'wood', 'gold', 'stone'] as const;
 const trail=$derived([$t("Tu partida", "Your match"),$t("Cómo avanzar", "How to advance"),$t("Listo para jugar", "Ready to play")]);
 const position=$derived(stage==='start'?0:stage==='ready'?2:1);

 onMount(()=>{
  stage=settings.onboarding==='pending'?'start':settings.onboarding==='detecting'?'calibrate':'ready';
  void send('setup-status-request');
  const timer=setInterval(()=>now=Date.now(),1000);return()=>clearInterval(timer);
 });
 async function addPack(){
  loading=true;error='';
  try {const r=await fetch($locale === 'es' ? '/builds/starter-pack.json' : '/builds/starter-pack.en.json');if(!r.ok)throw new Error($t("No se encontró el paquete incluido.", "Couldn’t find the bundled starter pack."));onPack(parsePack(await r.text()));}
  catch(e){error=String(e);}finally{loading=false;}
 }
 async function readingAvailable(){
  if(!isTauri)return false;
  try {const result=await nativeDiagnostic();ocrAvailable=result?.available??null;return !!result?.available;}catch{return false;}
 }
 /** The recommended path: hotkeys advance steps. Screen reading still picks the build and syncs the clock. */
 async function manual(){
  busy=true;error='';
  try {
   const available=await readingAvailable();
   settings.setup.enabled=available;settings.setup.autoAdvance=false;settings.ocr.enabled=false;
   settings.onboarding='skipped';stage='ready';
  } finally {busy=false;}
 }
 async function detect(){
  error='';busy=true;
  try {
   if(!isTauri){error=$t("La lectura de pantalla está disponible en la app de Windows.", "Screen reading is available in the Windows app.");return;}
   if(!await readingAvailable()){error=$t("Falta un idioma OCR compatible con tu perfil. En Windows, revisá Hora e idioma → Idioma y región, instalá el paquete de idioma y reiniciá la app.", "A compatible OCR language is missing. In Windows, go to Time & language → Language & region, install the language pack, and restart the app.");return;}
   evidenceSince=Date.now();settings.onboarding='detecting';settings.setup.enabled=true;settings.setup.autoAdvance=true;stage='calibrate';
   await send('setup-retry');
  }catch(e){error=$t(`No se pudo iniciar la detección: ${String(e)}`, `Couldn’t start detection. ${String(e)}`);}
  finally{busy=false;}
 }
 function confirm(){if(!settings.setup.enabled||!canConfirm(status?.sample,Date.now(),evidenceSince))return;settings.onboarding='complete';settings.setup.enabled=true;settings.setup.autoAdvance=true;stage='ready';}
</script>

{#snippet starterPack()}
 {#if confirmReplace}
  <p>{$t("Esto reemplaza todos los builds de tu biblioteca con el paquete inicial y descarta las ediciones que les hiciste. Podés exportar un respaldo antes de confirmar.", "This replaces every build in your library with the starter pack and discards your build edits. You can export a backup before confirming.")}</p>
  <div class="actions">
   <button type="button" disabled={replacing} onclick={onBackup}>{$t("Exportar respaldo", "Export backup")}</button>
   <button type="button" disabled={replacing} onclick={()=>void onReplace()}>{replacing?$t("Reemplazando…", "Replacing…"):$t("Confirmar reemplazo", "Confirm replacement")}</button>
   <button type="button" class="quiet" disabled={replacing} onclick={()=>confirmReplace=false}>{$t("Cancelar", "Cancel")}</button>
  </div>
 {:else}
  {#if missingStarterBuilds}
   <p>{$t("El paquete inicial trae dos aperturas por civilización, con fuentes y metas de avance automático.", "The starter pack has two openings per civilization, with sources and automatic advancement goals.")}</p>
  {/if}
  <div class="actions">
   {#if missingStarterBuilds}
    <button type="button" disabled={loading || replacing} onclick={()=>void addPack()}>{loading?$t("Cargando paquete…", "Loading pack…"):$t("Añadir aperturas del paquete inicial", "Add starter pack openings")}</button>
   {/if}
   {#if builds.length}
    <button type="button" class="quiet" disabled={loading || replacing} onclick={()=>confirmReplace=true}>{$t("Dejar solo el paquete inicial", "Keep only the starter pack")}</button>
   {/if}
  </div>
 {/if}
{/snippet}

<div class="welcome">
 <header><span class="eyebrow">{$t("Prepará tu próxima partida", "Get ready for your next match")}</span><h2>{$t("Tu build, dentro del juego.", "Your build in the game")}</h2><p>{$t("Elegí la apertura y jugá. El overlay te muestra un paso a la vez.", "Choose an opening and play. The overlay shows one step at a time.")}</p></header>
 <ol class="trail" aria-label={$t("Progreso de configuración", "Setup progress")}>
  {#each trail as text,i}<li class:current={position===i} class:done={position>i}><span>{i+1}</span>{text}</li>{/each}
 </ol>

 {#if stage==='start'}
 <section>
  <h3>{$t("¿Con qué vas a jugar?", "What will you play?")}</h3>
  {@render starterPack()}
  <div class="build-picker"><span>{$t("Build para la partida", "Build for this match")}</span>
   <button class="selected-build" onclick={()=>void openBuildPicker().catch(e=>error=String(e))}>
    {#if selected}<CivFlag civ={selected.civ} size={32}/><span>{label(selected.civ,$locale)} · {selected.name}</span>{/if}
    <strong>{$t('Elegir build…','Choose build…')}</strong>
   </button>
   <small class="note">{prettyHotkey(settings.hotkeys.chooseBuild, $locale)} · {$t('también desde el juego','also works in game')}</small>
  </div>
  {#if selected?.provenance}<p class="note">{$t(`Autor: ${selected.provenance.author} · Revisión de instrucciones: ${selected.provenance.reviewedAt}`, `Author: ${selected.provenance.author} · Instructions reviewed ${selected.provenance.reviewedAt}`)}</p>{/if}
  <div class="name"><PlayerNameField bind:settings {roster} optional /></div>
  <div class="next"><button class="primary" disabled={!selected} onclick={()=>stage='advance'}>{$t("Continuar", "Continue")}</button></div>
 </section>

 {:else if stage==='advance'}
 <section>
  <h3>{$t("¿Cómo querés pasar de paso?", "How do you want to move through steps?")}</h3>
  <div class="choices">
   <button class="choice recommended" disabled={busy} onclick={()=>void manual()}>
    <span class="badge">{$t("Recomendado", "Recommended")}</span>
    <strong>{$t("Con teclas", "With hotkeys")}</strong>
    <span>{$t(`${prettyHotkey(settings.hotkeys.next, $locale)} pasa al siguiente paso y ${prettyHotkey(settings.hotkeys.prev, $locale)} vuelve. Funciona siempre, sin configurar nada.`, `${prettyHotkey(settings.hotkeys.next, $locale)} moves to the next step and ${prettyHotkey(settings.hotkeys.prev, $locale)} goes back. Works right away, no setup.`)}</span>
   </button>
   <button class="choice" disabled={busy||!isTauri} onclick={()=>void detect()}>
    <span class="badge quiet">Beta</span>
    <strong>{$t("Automático por aldeanos", "Automatic from villagers")}</strong>
    <span>{$t("La app lee los contadores de aldeanos y avanza sola. Necesita una partida abierta para comprobar la lectura (un minuto).", "The app reads the villager counters and advances on its own. Needs an open match to check the reading (about a minute).")}</span>
   </button>
  </div>
  {#if !isTauri}<p class="note">{$t("Vista de navegador: la lectura automática necesita la aplicación de Windows.", "Browser preview. Automatic reading requires the Windows app.")}</p>{/if}
  <div class="next"><button class="quiet" onclick={()=>stage='start'}>← {$t("Atrás", "Back")}</button></div>
 </section>

 {:else if stage==='calibrate'}
 <section>
  <h3>{$t("Abrí una partida y compará los cinco números.", "Open a match and compare all five counters.")}</h3>
  <p>{$t('Usá ventana sin bordes y dejá visible el HUD. Volvé al juego unos segundos y presioná', 'Use borderless windowed mode and keep the HUD visible. Return to the game for a few seconds, then press')} <kbd>Alt + Tab</kbd> {$t('para confirmar acá. El avance automático espera tu confirmación.', 'to confirm here. Automatic advancement starts after you confirm.')}</p>
  <div class="status" role="status">{ocrAvailable===false?$t("Falta un idioma OCR", "An OCR language is missing"):status?.message??$t("Volvé a AoE4 para comenzar la lectura.", "Return to AoE4 to start reading.")}</div>
  <div class="counters">
   {#each resources as key}<div><span>{resourceLabel(key, $locale)}</span><strong>{sample?.workers[key]??'—'}</strong></div>{/each}
   <div><span>{$t("Inactivos", "Idle")}</span><strong>{sample?.idle??'—'}</strong></div>
  </div>
  <p class="reading">{#if sample}Total: <b>{sample.total}</b> · {$t(`Última captura hace ${Math.max(0,Math.floor((now-sample.at)/1000))} s.`, `Last reading ${Math.max(0,Math.floor((now-sample.at)/1000))} s ago.`)} {ready?$t("Lectura lista para confirmar.", "Reading ready to confirm."):$t("Volvé al juego para obtener una lectura estable y reciente.", "Return to the game for a recent, stable reading.")}{:else}{$t("Todavía no hay una lectura completa. No se toman los contadores vacíos como cero.", "Waiting for a reading from all five counters. Blank counters are treated as missing.")}{/if}</p>
  <div class="next"><button class="primary" disabled={!ready} onclick={confirm}>{$t("Los cinco números coinciden", "All five numbers match")}</button><button onclick={()=>{correcting=!correcting;}}>{$t("No coinciden", "Numbers don’t match")}</button></div>
  {#if correcting}<div class="correction"><p>{$t("Volvé a detectar o marcá las regiones en «Calibración de contadores».", "Retry detection or select the regions under Counter calibration.")}</p><SetupView bind:settings {builds} {status} {roster}/></div>{/if}
  <div class="actions"><button class="quiet" onclick={()=>{evidenceSince=Date.now();void send('setup-retry');}}>{$t("Reintentar detección", "Retry detection")}</button><button class="quiet" disabled={busy} onclick={()=>void manual()}>{$t("Usar teclas por ahora", "Use hotkeys for now")}</button></div>
 </section>

 {:else}
 <section>
  <span class="success">{automatic?$t("Lectura confirmada", "Reading confirmed"):$t("Todo listo", "All set")}</span><h3>{$t("Ya podés jugar.", "You’re ready to play.")}</h3>
  {#if automatic}
   <p>{$t("Los pasos de aldeanos avanzan solos al cumplir su condición. Construir, subir de edad y otras acciones que no se pueden comprobar siguen esperando tu confirmación.", "Villager steps advance on their own when they meet the rule. Confirm buildings, age-ups, and other manual tasks yourself.")}</p>
  {:else}
   <p>{$t("Abrí AoE4 en ventana sin bordes. El overlay aparece al entrar al juego y pasás de paso con tus teclas.", "Open AoE4 in borderless windowed mode. The overlay appears in game and you move through steps with your hotkeys.")}</p>
  {/if}
  {#if settings.setup.enabled}
   <p class="note">{settings.setup.playerName
    ?$t(`En la pantalla de carga reconozco a «${settings.setup.playerName}» y elijo el build de tu civilización.`, `On the loading screen I look for “${settings.setup.playerName}” and pick your civilization’s build.`)
    :$t("Cuando elijas un build durante una partida, aprendo tu nombre para elegirlo solo la próxima vez.", "When you choose a build during a match, I learn your name to pick it for you next time.")}</p>
  {/if}
  <dl>
   <div><dt>{$t("Pasar al siguiente paso", "Next step")}</dt><dd>{prettyHotkey(settings.hotkeys.next, $locale)}</dd></div>
   <div><dt>{$t("Volver al paso anterior", "Previous step")}</dt><dd>{prettyHotkey(settings.hotkeys.prev, $locale)}</dd></div>
   <div><dt>{$t("Elegir otro build", "Choose another build")}</dt><dd>{prettyHotkey(settings.hotkeys.chooseBuild, $locale)}</dd></div>
   <div><dt>{$t("Mostrar u ocultar el overlay", "Show or hide overlay")}</dt><dd>{prettyHotkey(settings.hotkeys.toggleVisible, $locale)}</dd></div>
  </dl>
  {#if !automatic && isTauri}
   <div class="offer">
    <div><strong>{$t("¿Querés que avance solo?", "Want it to advance on its own?")}</strong><span>{$t("Después de tu primera partida, comprobá la lectura de aldeanos y los pasos de recursos avanzan sin teclas.", "After your first match, check the villager reading and resource steps advance without hotkeys.")}</span></div>
    <button disabled={busy} onclick={()=>void detect()}>{$t("Activar avance automático", "Turn on automatic advance")}</button>
   </div>
  {/if}
  {@render starterPack()}
  <div class="next"><button class="primary" onclick={onDone}>{$t("Ir a mis builds", "Go to my builds")}</button><button class="quiet" onclick={()=>stage='start'}>{$t("Cambiar build o nombre", "Change build or name")}</button></div>
 </section>
 {/if}
 {#if error}<p class="error" role="alert">{error}</p>{/if}
</div>
<style>
 .selected-build{display:flex;align-items:center;gap:12px;text-align:left;width:100%}.selected-build>span{flex:1;min-width:0}.selected-build strong{margin-left:auto;flex:none;color:var(--accent);font-size:12px}
 .build-picker{display:grid;gap:8px}.name{margin-top:22px}
 .choices{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-top:8px}
 .choice{display:flex;flex-direction:column;align-items:flex-start;gap:8px;text-align:left;padding:18px;line-height:1.5}.choice strong{font-size:17px}.choice>span:last-child{color:var(--soft);font-size:13px}
 .choice.recommended{border-color:var(--accent)}.badge{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--accent)}.badge.quiet{color:var(--dim)}
 .offer{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-top:22px;padding:14px 16px;border:1px solid var(--line-strong);border-radius:8px;background:var(--bg)}.offer div{display:grid;gap:4px}.offer span{color:var(--dim);font-size:13px}
 .welcome{max-width:920px;margin:10px auto 40px}header{margin-bottom:28px}.eyebrow{color:var(--accent);text-transform:uppercase;letter-spacing:.09em;font-size:12px}h2{font:600 38px var(--font-num);margin:8px 0}h3{font-size:23px;margin:0 0 12px}p{color:var(--soft);line-height:1.6}section{border:1px solid var(--line-strong);border-radius:12px;padding:30px;background:var(--card)}.trail{display:flex;list-style:none;padding:0;margin:0 0 24px;gap:24px}.trail li{display:flex;gap:10px;align-items:center;color:var(--dim)}.trail span{display:grid;place-items:center;border:1px solid var(--line-strong);width:28px;height:28px;border-radius:50%}.trail .current{color:var(--text)}.trail .current span,.trail .done span{border-color:var(--accent);color:var(--accent)}.actions,.next{display:flex;flex-wrap:wrap;gap:10px;margin-top:22px}.next{padding-top:20px;border-top:1px solid var(--line)}button{padding:10px 16px;border:1px solid var(--line-strong);border-radius:6px;background:var(--bg);font:inherit;color:inherit;cursor:pointer}button:hover:enabled{border-color:var(--accent)}button:disabled{opacity:.45;cursor:default}.primary{background:var(--accent);border-color:var(--accent);color:var(--bg);font-weight:600}.quiet{background:transparent}.counters{display:grid;grid-template-columns:repeat(5,1fr);margin:20px 0;border:1px solid var(--line-strong);border-radius:8px;overflow:hidden}.counters div{padding:18px;border-right:1px solid var(--line-strong);background:var(--bg)}.counters div:last-child{border:0}.counters span{display:block;color:var(--dim)}.counters strong{display:block;font:600 44px var(--font-num);color:var(--accent);margin-top:4px}.status{border-left:3px solid var(--accent);padding:8px 14px}.reading,.note{font-size:13px;color:var(--dim)}.error{color:var(--late)}.success{color:var(--accent)}dl div{display:flex;justify-content:space-between;gap:20px;padding:12px 0;border-bottom:1px solid var(--line)}dd{margin:0;color:var(--accent)}.correction{margin-top:20px}kbd{color:var(--text)}@media(max-width:750px){.trail{gap:10px;font-size:12px}section{padding:20px}.counters div{padding:10px}.counters strong{font-size:32px}.choices{grid-template-columns:1fr}.offer{flex-direction:column;align-items:flex-start}}
</style>
