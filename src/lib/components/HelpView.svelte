<script lang="ts">
 import { onMount } from 'svelte';
 import { monitorOptions, nativeDiagnostic, openReleases, send, isTauri } from '$lib/bridge';
 import { diagnosticText } from '$lib/diagnostics';
 import { checkRelease } from '$lib/releases';
 import type { Settings } from '$lib/types';
 import type { SetupStatus } from '$lib/setup';
 import packageInfo from '../../../package.json';
 let {settings,status,failedHotkeys,onSetup}:{settings:Settings;status:SetupStatus|null;failedHotkeys:string[];onSetup:()=>void}=$props();
 let report=$state(''),message=$state(''),update=$state(''),busy=$state(false),checking=$state(false);
 async function refresh(){
  busy=true;message='';
  try {const [native,monitors]=await Promise.all([nativeDiagnostic(),monitorOptions()]);
   report=diagnosticText({version:packageInfo.version,native,monitors,status,onboarding:settings.onboarding,failedHotkeys,condition:status?.condition??'none'});
   message=!isTauri?'Vista de navegador: el diagnóstico nativo requiere Windows.':!native?.available?'Falta un idioma OCR compatible. Revisá los paquetes de idioma de Windows.':!native.gameActive?'AoE4 no está en primer plano. Volvé al juego para renovar las lecturas.':status?.condition==='manual'?'Este paso necesita confirmación manual.':'Diagnóstico actualizado.';
  }catch{message='No se pudo obtener el diagnóstico de Windows. Reintentá después de reiniciar la app.';}finally{busy=false;}
 }
 async function copy(){try{await navigator.clipboard.writeText(report);message='Diagnóstico copiado. Compartilo solo donde vos elijas.';}catch{message='No se pudo copiar. Podés seleccionar el texto del diagnóstico.';}}
 async function updates(){checking=true;update='Consultando GitHub…';try{update=await checkRelease(packageInfo.version);}catch(e){update=e instanceof Error&&e.name!=='TypeError'?e.message:'Sin conexión con GitHub. Revisá internet o abrí Descargas.';}finally{checking=false;}}
 onMount(()=>{void send('setup-status-request');});
</script>
<div class="help">
 <header><span class="label">Ayuda y versiones</span><h2>Todo listo para pedir una mano.</h2><p>AoE4 Overlay {packageInfo.version} · GPLv3</p></header>
 <section><h3>Configurar el juego</h3><p>Volvé al recorrido de configuración para elegir un build y comprobar los contadores con el juego abierto.</p><button onclick={onSetup}>Abrir configuración guiada</button></section>
 <section><h3>Diagnóstico</h3><p>Incluye versión, pantallas, escala, disponibilidad del OCR y la última lectura. No incluye tu nombre, historial, rutas personales ni capturas. No se envía automáticamente.</p><div class="actions"><button disabled={busy} onclick={()=>void refresh()}>{busy?'Consultando…':'Preparar diagnóstico'}</button><button disabled={!report||busy} onclick={()=>void copy()}>Copiar diagnóstico</button></div><p role="status">{message}</p>{#if report}<label>Esto es lo que vas a compartir<textarea readonly rows="15" value={report}></textarea></label>{/if}<p class="note">Una captura puede ayudar a entender el problema; adjuntala voluntariamente después de revisar lo que muestra.</p></section>
 <section><h3>Versiones y descargas</h3><p>Buscamos novedades solo cuando lo pedís. La descarga y la instalación son manuales; tus builds se conservan al actualizar.</p><div class="actions"><button disabled={checking} onclick={()=>void updates()}>Buscar actualizaciones</button><button onclick={()=>void openReleases().catch(()=>update='No se pudo abrir el navegador. Usá github.com/GonzaMato/aoe4-overlay-BO/releases.')}>Descargas</button></div><p role="status">{update}</p><p class="note">Antes de actualizar, exportá un respaldo desde Ajustes → Respaldo y cerrá con «Salir de la app».</p></section>
</div>
<style>
 .help{max-width:850px;margin:10px auto 40px}h2{font:600 34px var(--font-num);margin:8px 0}h3{font-size:20px;margin:0 0 10px}header{margin-bottom:25px}section{padding:24px;border:1px solid var(--line);border-radius:10px;background:var(--card);margin-bottom:18px}p{color:var(--soft);line-height:1.6}.actions{display:flex;gap:10px;flex-wrap:wrap}button{padding:10px 16px;border:1px solid var(--line-strong);border-radius:6px;background:var(--bg);font:inherit;color:inherit;cursor:pointer}button:hover{border-color:var(--accent)}button:disabled{opacity:.45;cursor:default}.note{color:var(--dim);font-size:12px}label{display:block;color:var(--soft)}textarea{margin-top:8px;display:block;width:100%;padding:12px;background:var(--bg);color:var(--text);border:1px solid var(--line-strong);border-radius:6px;resize:vertical;font:12px/1.5 Consolas,monospace}
</style>
