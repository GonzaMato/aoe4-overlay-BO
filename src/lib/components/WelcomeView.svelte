<script lang="ts">
 import { onMount } from 'svelte';
 import type { Build, Settings } from '$lib/types';
 import type { SetupStatus } from '$lib/setup';
 import { canConfirm } from '$lib/onboarding';
 import { isTauri, send, nativeDiagnostic } from '$lib/bridge';
 import { parsePack, type BuildPack } from '$lib/build-pack';
 import SetupView from './SetupView.svelte';
 let {settings=$bindable(),builds,status,onUse,onPack,onDone}:{settings:Settings;builds:Build[];status:SetupStatus|null;onUse:(id:string)=>void;onPack:(pack:BuildPack)=>void;onDone:()=>void}=$props();
 let stage=$state(0),now=$state(Date.now()),error=$state(''),loading=$state(false),correcting=$state(false);
 let ocrAvailable=$state<boolean|null>(null);
 let evidenceSince=$state(Date.now());
 const sample=$derived(status?.sample??null);
 const ready=$derived(settings.setup.enabled&&canConfirm(sample,now,evidenceSince));
 const selected=$derived(builds.find(b=>b.id===settings.activeBuildId));
 const labels=[['food','Comida'],['wood','Madera'],['gold','Oro'],['stone','Piedra']] as const;
 onMount(()=>{stage=settings.onboarding==='detecting'?1:0;void send('setup-status-request');const timer=setInterval(()=>now=Date.now(),1000);return()=>clearInterval(timer);});
 async function addPack(){
  loading=true;error='';
  try {const r=await fetch('/builds/starter-pack.json');if(!r.ok)throw new Error('No se encontró el paquete incluido.');onPack(parsePack(await r.text()));}
  catch(e){error=String(e);}finally{loading=false;}
 }
 async function detect(){
  error='';
  try {
   const result=await nativeDiagnostic();ocrAvailable=result?.available??null;
   if(!isTauri){error='La lectura de pantalla está disponible en la app de Windows.';return;}
   if(result&&!result.available){error='Falta un idioma OCR compatible con tu perfil. En Windows, revisá Hora e idioma → Idioma y región, instalá el paquete de idioma y reiniciá la app.';return;}
   evidenceSince=Date.now();settings.onboarding='detecting';settings.setup.enabled=true;stage=1;
   await send('setup-retry');
  }catch(e){error=`No se pudo iniciar la detección: ${String(e)}`;}
 }
 function confirm(){if(!settings.setup.enabled||!canConfirm(status?.sample,Date.now(),evidenceSince))return;settings.onboarding='complete';settings.setup.enabled=true;stage=2;}
 function skip(){settings.onboarding='skipped';settings.setup.enabled=false;settings.ocr.enabled=false;onDone();}
</script>

<div class="welcome">
 <header><span class="eyebrow">Prepará tu próxima partida</span><h2>Tu build, dentro del juego.</h2><p>Elegí la apertura, comprobá los aldeanos y dejá que el overlay te acompañe.</p></header>
 <ol class="trail" aria-label="Progreso de configuración">
  {#each ['Elegir build','Comprobar lectura','Listo para jugar'] as label,i}<li class:current={stage===i} class:done={stage>i}><span>{i+1}</span>{label}</li>{/each}
 </ol>
 {#if stage===0}
 <section>
  <h3>¿Qué vas a practicar?</h3>
  <p>El paquete inicial ofrece una apertura por civilización, con fuente y criterios de avance preparados. Se añade a tu biblioteca sin reemplazar tus builds.</p>
  <div class="actions"><button disabled={loading} onclick={()=>void addPack()}>{loading?'Cargando paquete…':'Añadir paquete de civilizaciones'}</button></div>
  <label>Build para la partida<select value={settings.activeBuildId??''} onchange={e=>onUse(e.currentTarget.value)}><option value="" disabled>Elegí un build</option>{#each builds as b}<option value={b.id}>{b.civ} · {b.name}</option>{/each}</select></label>
  {#if selected?.provenance}<p class="note">Autor: {selected.provenance.author} · Revisión de instrucciones: {selected.provenance.reviewedAt}</p>{/if}
  <div class="next"><button class="primary" disabled={!selected||!isTauri} onclick={()=>void detect()}>Continuar con detección</button><button class="quiet" onclick={skip}>Usar sin OCR</button></div>
  {#if !isTauri}<p class="note">Vista de navegador: la detección necesita la aplicación de Windows.</p>{/if}
 </section>
 {:else if stage===1}
 <section>
  <h3>Abrí una partida y compará los cinco números.</h3>
  <p>Usá ventana sin bordes y dejá visible el HUD. Volvé al juego unos segundos; después usá <kbd>Alt + Tab</kbd> para confirmar acá. El avance automático espera tu confirmación.</p>
  <div class="status" role="status">{ocrAvailable===false?'Falta un idioma OCR':status?.message??'Volvé a AoE4 para comenzar la lectura.'}</div>
  <div class="counters">
   {#each labels as [key,label]}<div><span>{label}</span><strong>{sample?.workers[key]??'—'}</strong></div>{/each}
   <div><span>Inactivos</span><strong>{sample?.idle??'—'}</strong></div>
  </div>
  <p class="reading">{#if sample}Total: <b>{sample.total}</b> · Última captura hace {Math.max(0,Math.floor((now-sample.at)/1000))} s. {ready?'Lectura lista para confirmar.':'Volvé al juego para obtener una lectura estable y reciente.'}{:else}Todavía no hay una lectura completa. No se toman los contadores vacíos como cero.{/if}</p>
  <div class="next"><button class="primary" disabled={!ready} onclick={confirm}>Los cinco números coinciden</button><button onclick={()=>{correcting=!correcting;}}>No coinciden</button></div>
  {#if correcting}<div class="correction"><p>Volvé a detectar o marcá las regiones desde «Corregir la detección».</p><SetupView bind:settings {builds} {status} {onUse}/></div>{/if}
  <div class="actions"><button class="quiet" onclick={()=>{evidenceSince=Date.now();void send('setup-retry');}}>Reintentar detección</button><button class="quiet" onclick={skip}>Usar sin OCR</button></div>
 </section>
 {:else}
 <section>
  <span class="success">Lectura confirmada</span><h3>Ya podés volver a la partida.</h3>
  <p>Los pasos de aldeanos avanzan al cumplir su condición. Construir, subir de edad y otras acciones que no se pueden comprobar siguen esperando tu confirmación.</p>
  <dl><div><dt>Confirmar una tarea manual</dt><dd>{settings.hotkeys.next}</dd></div><div><dt>Volver a la tarea anterior</dt><dd>{settings.hotkeys.prev}</dd></div><div><dt>Mostrar u ocultar el overlay</dt><dd>{settings.hotkeys.toggleVisible}</dd></div></dl>
  <p class="note">Si el reloj del juego no se reconoce, inicialo con {settings.hotkeys.start}. Al terminar el build, confirmá la última tarea para ocultar el overlay.</p>
  <div class="next"><button class="primary" onclick={onDone}>Ir a mis builds</button></div>
 </section>
 {/if}
 {#if error}<p class="error" role="alert">{error}</p>{/if}
</div>
<style>
 .welcome{max-width:920px;margin:10px auto 40px}header{margin-bottom:28px}.eyebrow{color:var(--accent);text-transform:uppercase;letter-spacing:.09em;font-size:12px}h2{font:600 38px var(--font-num);margin:8px 0}h3{font-size:23px;margin:0 0 12px}p{color:var(--soft);line-height:1.6}section{border:1px solid var(--line-strong);border-radius:12px;padding:30px;background:var(--card)}.trail{display:flex;list-style:none;padding:0;margin:0 0 24px;gap:24px}.trail li{display:flex;gap:10px;align-items:center;color:var(--dim)}.trail span{display:grid;place-items:center;border:1px solid var(--line-strong);width:28px;height:28px;border-radius:50%}.trail .current{color:var(--text)}.trail .current span,.trail .done span{border-color:var(--accent);color:var(--accent)}label{display:flex;flex-direction:column;gap:9px;margin-top:26px}select{width:100%;padding:12px;background:var(--bg);border:1px solid var(--line-strong);border-radius:6px;font:inherit;color:inherit}.actions,.next{display:flex;flex-wrap:wrap;gap:10px;margin-top:22px}.next{padding-top:20px;border-top:1px solid var(--line)}button{padding:10px 16px;border:1px solid var(--line-strong);border-radius:6px;background:var(--bg);font:inherit;color:inherit;cursor:pointer}button:hover{border-color:var(--accent)}button:disabled{opacity:.45;cursor:default}.primary{background:var(--accent);border-color:var(--accent);color:var(--bg);font-weight:600}.quiet{background:transparent}.counters{display:grid;grid-template-columns:repeat(5,1fr);margin:20px 0;border:1px solid var(--line-strong);border-radius:8px;overflow:hidden}.counters div{padding:18px;border-right:1px solid var(--line-strong);background:var(--bg)}.counters div:last-child{border:0}.counters span{display:block;color:var(--dim)}.counters strong{display:block;font:600 44px var(--font-num);color:var(--accent);margin-top:4px}.status{border-left:3px solid var(--accent);padding:8px 14px}.reading,.note{font-size:13px;color:var(--dim)}.error{color:var(--late)}.success{color:var(--accent)}dl div{display:flex;justify-content:space-between;gap:20px;padding:12px 0;border-bottom:1px solid var(--line)}dd{margin:0;color:var(--accent)}.correction{margin-top:20px}kbd{color:var(--text)}@media(max-width:750px){.trail{gap:10px;font-size:12px}section{padding:20px}.counters div{padding:10px}.counters strong{font-size:32px}}
</style>
