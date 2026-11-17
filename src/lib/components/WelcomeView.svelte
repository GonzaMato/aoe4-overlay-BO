<script lang="ts">
 import { t, locale, label, resourceLabel } from '$lib/i18n';
 import { onMount } from 'svelte';
 import type { Build, Settings } from '$lib/types';
 import type { SetupStatus } from '$lib/setup';
 import { canConfirm } from '$lib/onboarding';
 import { isTauri, send, nativeDiagnostic } from '$lib/bridge';
 import { parsePack, type BuildPack } from '$lib/build-pack';
 import { prettyHotkey } from '$lib/hotkeys';
 import SetupView from './SetupView.svelte';
 let {settings=$bindable(),builds,status,onUse,onPack,onDone}:{settings:Settings;builds:Build[];status:SetupStatus|null;onUse:(id:string)=>void;onPack:(pack:BuildPack)=>void;onDone:()=>void}=$props();
 let stage=$state(0),now=$state(Date.now()),error=$state(''),loading=$state(false),correcting=$state(false);
 let ocrAvailable=$state<boolean|null>(null);
 let evidenceSince=$state(Date.now());
 const sample=$derived(status?.sample??null);
 const ready=$derived(settings.setup.enabled&&canConfirm(sample,now,evidenceSince));
 const selected=$derived(builds.find(b=>b.id===settings.activeBuildId));
 const resources = ['food', 'wood', 'gold', 'stone'] as const;
 onMount(()=>{stage=settings.onboarding==='detecting'?1:0;void send('setup-status-request');const timer=setInterval(()=>now=Date.now(),1000);return()=>clearInterval(timer);});
 async function addPack(){
  loading=true;error='';
  try {const r=await fetch($locale === 'es' ? '/builds/starter-pack.json' : '/builds/starter-pack.en.json');if(!r.ok)throw new Error($t("No se encontró el paquete incluido.", "Couldn’t find the bundled starter pack."));onPack(parsePack(await r.text()));}
  catch(e){error=String(e);}finally{loading=false;}
 }
 async function detect(){
  error='';
  try {
   const result=await nativeDiagnostic();ocrAvailable=result?.available??null;
   if(!isTauri){error=$t("La lectura de pantalla está disponible en la app de Windows.", "Screen reading is available in the Windows app.");return;}
   if(result&&!result.available){error=$t("Falta un idioma OCR compatible con tu perfil. En Windows, revisá Hora e idioma → Idioma y región, instalá el paquete de idioma y reiniciá la app.", "A compatible OCR language is missing. In Windows, go to Time & language → Language & region, install the language pack, and restart the app.");return;}
   evidenceSince=Date.now();settings.onboarding='detecting';settings.setup.enabled=true;stage=1;
   await send('setup-retry');
  }catch(e){error=$t(`No se pudo iniciar la detección: ${String(e)}`, `Couldn’t start detection. ${String(e)}`);}
 }
 function confirm(){if(!settings.setup.enabled||!canConfirm(status?.sample,Date.now(),evidenceSince))return;settings.onboarding='complete';settings.setup.enabled=true;stage=2;}
 function skip(){settings.onboarding='skipped';settings.setup.enabled=false;settings.ocr.enabled=false;onDone();}
</script>

<div class="welcome">
 <header><span class="eyebrow">{$t("Prepará tu próxima partida", "Get ready for your next match")}</span><h2>{$t("Tu build, dentro del juego.", "Your build in the game")}</h2><p>{$t("Elegí la apertura, comprobá los aldeanos y dejá que el overlay te acompañe.", "Choose an opening and check the villager counters to set up your overlay.")}</p></header>
 <ol class="trail" aria-label={$t("Progreso de configuración", "Setup progress")}>
  {#each [$t("Elegir build", "Choose a build"),$t("Comprobar lectura", "Check counters"),$t("Listo para jugar", "Ready to play")] as label,i}<li class:current={stage===i} class:done={stage>i}><span>{i+1}</span>{label}</li>{/each}
 </ol>
 {#if stage===0}
 <section>
  <h3>{$t("¿Qué vas a practicar?", "What will you practice?")}</h3>
  <p>{$t("El paquete inicial ofrece una apertura por civilización, con fuente y criterios de avance preparados. Se añade a tu biblioteca sin reemplazar tus builds.", "The starter pack adds one opening per civilization to your library, with sources and advancement rules. It keeps your existing builds.")}</p>
  <div class="actions"><button disabled={loading} onclick={()=>void addPack()}>{loading?$t("Cargando paquete…", "Loading pack…"):$t("Añadir paquete de civilizaciones", "Add civilization starter pack")}</button></div>
  <label>{$t("Build para la partida", "Build for this match")}<select value={settings.activeBuildId??''} onchange={e=>onUse(e.currentTarget.value)}><option value="" disabled>{$t("Elegí un build", "Choose a build")}</option>{#each builds as b}<option value={b.id}>{label(b.civ, $locale)} · {b.name}</option>{/each}</select></label>
  {#if selected?.provenance}<p class="note">{$t(`Autor: ${selected.provenance.author} · Revisión de instrucciones: ${selected.provenance.reviewedAt}`, `Author: ${selected.provenance.author} · Instructions reviewed ${selected.provenance.reviewedAt}`)}</p>{/if}
  <div class="next"><button class="primary" disabled={!selected||!isTauri} onclick={()=>void detect()}>{$t("Continuar con detección", "Continue with detection")}</button><button class="quiet" onclick={skip}>{$t("Usar sin OCR", "Continue without OCR")}</button></div>
  {#if !isTauri}<p class="note">{$t("Vista de navegador: la detección necesita la aplicación de Windows.", "Browser preview. Detection requires the Windows app.")}</p>{/if}
 </section>
 {:else if stage===1}
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
  {#if correcting}<div class="correction"><p>{$t("Volvé a detectar o marcá las regiones desde «Corregir la detección».", "Retry detection or select the regions under Fix detection.")}</p><SetupView bind:settings {builds} {status} {onUse}/></div>{/if}
  <div class="actions"><button class="quiet" onclick={()=>{evidenceSince=Date.now();void send('setup-retry');}}>{$t("Reintentar detección", "Retry detection")}</button><button class="quiet" onclick={skip}>{$t("Usar sin OCR", "Continue without OCR")}</button></div>
 </section>
 {:else}
 <section>
  <span class="success">{$t("Lectura confirmada", "Reading confirmed")}</span><h3>{$t("Ya podés volver a la partida.", "You can return to the match.")}</h3>
  <p>{$t("Los pasos de aldeanos avanzan al cumplir su condición. Construir, subir de edad y otras acciones que no se pueden comprobar siguen esperando tu confirmación.", "Villager steps advance when they meet the rule. Confirm buildings, age-ups, and other manual tasks yourself.")}</p>
  <dl><div><dt>{$t("Confirmar una tarea manual", "Confirm a manual task")}</dt><dd>{prettyHotkey(settings.hotkeys.next, $locale)}</dd></div><div><dt>{$t("Volver a la tarea anterior", "Return to the previous task")}</dt><dd>{prettyHotkey(settings.hotkeys.prev, $locale)}</dd></div><div><dt>{$t("Mostrar u ocultar el overlay", "Show or hide overlay")}</dt><dd>{prettyHotkey(settings.hotkeys.toggleVisible, $locale)}</dd></div></dl>
  <p class="note">{$t(`Si el reloj del juego no se reconoce, inicialo con ${prettyHotkey(settings.hotkeys.start, $locale)}. Al terminar el build, confirmá la última tarea para ocultar el overlay.`, `If the game clock goes unread, start it with ${prettyHotkey(settings.hotkeys.start, $locale)}. Confirm the final task to hide the overlay when your build is complete.`)}</p>
  <div class="next"><button class="primary" onclick={onDone}>{$t("Ir a mis builds", "Go to my builds")}</button></div>
 </section>
 {/if}
 {#if error}<p class="error" role="alert">{error}</p>{/if}
</div>
<style>
 .welcome{max-width:920px;margin:10px auto 40px}header{margin-bottom:28px}.eyebrow{color:var(--accent);text-transform:uppercase;letter-spacing:.09em;font-size:12px}h2{font:600 38px var(--font-num);margin:8px 0}h3{font-size:23px;margin:0 0 12px}p{color:var(--soft);line-height:1.6}section{border:1px solid var(--line-strong);border-radius:12px;padding:30px;background:var(--card)}.trail{display:flex;list-style:none;padding:0;margin:0 0 24px;gap:24px}.trail li{display:flex;gap:10px;align-items:center;color:var(--dim)}.trail span{display:grid;place-items:center;border:1px solid var(--line-strong);width:28px;height:28px;border-radius:50%}.trail .current{color:var(--text)}.trail .current span,.trail .done span{border-color:var(--accent);color:var(--accent)}label{display:flex;flex-direction:column;gap:9px;margin-top:26px}select{width:100%;padding:12px;background:var(--bg);border:1px solid var(--line-strong);border-radius:6px;font:inherit;color:inherit}.actions,.next{display:flex;flex-wrap:wrap;gap:10px;margin-top:22px}.next{padding-top:20px;border-top:1px solid var(--line)}button{padding:10px 16px;border:1px solid var(--line-strong);border-radius:6px;background:var(--bg);font:inherit;color:inherit;cursor:pointer}button:hover{border-color:var(--accent)}button:disabled{opacity:.45;cursor:default}.primary{background:var(--accent);border-color:var(--accent);color:var(--bg);font-weight:600}.quiet{background:transparent}.counters{display:grid;grid-template-columns:repeat(5,1fr);margin:20px 0;border:1px solid var(--line-strong);border-radius:8px;overflow:hidden}.counters div{padding:18px;border-right:1px solid var(--line-strong);background:var(--bg)}.counters div:last-child{border:0}.counters span{display:block;color:var(--dim)}.counters strong{display:block;font:600 44px var(--font-num);color:var(--accent);margin-top:4px}.status{border-left:3px solid var(--accent);padding:8px 14px}.reading,.note{font-size:13px;color:var(--dim)}.error{color:var(--late)}.success{color:var(--accent)}dl div{display:flex;justify-content:space-between;gap:20px;padding:12px 0;border-bottom:1px solid var(--line)}dd{margin:0;color:var(--accent)}.correction{margin-top:20px}kbd{color:var(--text)}@media(max-width:750px){.trail{gap:10px;font-size:12px}section{padding:20px}.counters div{padding:10px}.counters strong{font-size:32px}}
</style>
