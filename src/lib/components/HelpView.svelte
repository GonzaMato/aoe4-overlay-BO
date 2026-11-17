<script lang="ts">
 import { t } from '$lib/i18n';
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
   message=!isTauri?$t("Vista de navegador: el diagnóstico nativo requiere Windows.", "Browser preview. Native diagnostics require Windows."):!native?.available?$t("Falta un idioma OCR compatible. Revisá los paquetes de idioma de Windows.", "A compatible OCR language is missing. Check your Windows language packs."):!native.gameActive?$t("AoE4 no está en primer plano. Volvé al juego para renovar las lecturas.", "Return to AoE4 to refresh readings."):status?.condition==='manual'?$t("Este paso necesita confirmación manual.", "This step requires manual confirmation."):$t("Diagnóstico actualizado.", "Diagnostics updated.");
  }catch{message=$t("No se pudo obtener el diagnóstico de Windows. Reintentá después de reiniciar la app.", "Couldn’t get Windows diagnostics. Restart the app and try again.");}finally{busy=false;}
 }
 async function copy(){try{await navigator.clipboard.writeText(report);message=$t("Diagnóstico copiado. Compartilo solo donde vos elijas.", "Diagnostics copied. Share them wherever you choose.");}catch{message=$t("No se pudo copiar. Podés seleccionar el texto del diagnóstico.", "Couldn’t copy diagnostics. You can select the text below.");}}
 async function updates(){checking=true;update=$t("Consultando GitHub…", "Checking GitHub…");try{update=await checkRelease(packageInfo.version);}catch(e){update=e instanceof Error&&e.name!=='TypeError'?e.message:$t("Sin conexión con GitHub. Revisá internet o abrí Descargas.", "Couldn’t reach GitHub. Check your connection or open Downloads.");}finally{checking=false;}}
 onMount(()=>{void send('setup-status-request');});
</script>
<div class="help">
 <header><span class="label">{$t("Ayuda y versiones", "Help and releases")}</span><h2>{$t("Todo listo para pedir una mano.", "Help and support")}</h2><p>AoE4 Overlay {packageInfo.version} · GPLv3</p></header>
 <section><h3>{$t("Configurar el juego", "Game setup")}</h3><p>{$t("Volvé al recorrido de configuración para elegir un build y comprobar los contadores con el juego abierto.", "Open guided setup to choose a build and check the counters with the game running.")}</p><button onclick={onSetup}>{$t("Abrir configuración guiada", "Open guided setup")}</button></section>
 <section><h3>{$t("Diagnóstico", "Diagnostics")}</h3><p>{$t("Incluye versión, pantallas, escala, disponibilidad del OCR y la última lectura. No incluye tu nombre, historial, rutas personales ni capturas. No se envía automáticamente.", "The report includes the app version, displays, scale, OCR availability, and latest reading. It excludes your name, history, personal paths, and screenshots. You choose whether to share it.")}</p><div class="actions"><button disabled={busy} onclick={()=>void refresh()}>{busy?$t("Consultando…", "Checking…"):$t("Preparar diagnóstico", "Prepare diagnostics")}</button><button disabled={!report||busy} onclick={()=>void copy()}>{$t("Copiar diagnóstico", "Copy diagnostics")}</button></div><p role="status">{message}</p>{#if report}<label>{$t("Esto es lo que vas a compartir", "Report preview")}<textarea readonly rows="15" value={report}></textarea></label>{/if}<p class="note">{$t("Una captura puede ayudar a entender el problema; adjuntala voluntariamente después de revisar lo que muestra.", "A screenshot can help explain the issue. Review what it shows before sharing it.")}</p></section>
 <section><h3>{$t("Versiones y descargas", "Releases and downloads")}</h3><p>{$t("Buscamos novedades solo cuando lo pedís. La descarga y la instalación son manuales; tus builds se conservan al actualizar.", "The app checks for updates on request. Download and install updates manually. Your builds carry over.")}</p><div class="actions"><button disabled={checking} onclick={()=>void updates()}>{$t("Buscar actualizaciones", "Check for updates")}</button><button onclick={()=>void openReleases().catch(()=>update=$t("No se pudo abrir el navegador. Usá github.com/GonzaMato/aoe4-overlay-BO/releases.", "Couldn’t open the browser. Visit github.com/GonzaMato/aoe4-overlay-BO/releases."))}>{$t("Descargas", "Downloads")}</button></div><p role="status">{update}</p><p class="note">{$t("Antes de actualizar, exportá un respaldo desde Ajustes → Respaldo y cerrá con «Salir de la app».", "Before updating, export a backup under Settings → Backup and select Quit app.")}</p></section>
</div>
<style>
 .help{max-width:850px;margin:10px auto 40px}h2{font:600 34px var(--font-num);margin:8px 0}h3{font-size:20px;margin:0 0 10px}header{margin-bottom:25px}section{padding:24px;border:1px solid var(--line);border-radius:10px;background:var(--card);margin-bottom:18px}p{color:var(--soft);line-height:1.6}.actions{display:flex;gap:10px;flex-wrap:wrap}button{padding:10px 16px;border:1px solid var(--line-strong);border-radius:6px;background:var(--bg);font:inherit;color:inherit;cursor:pointer}button:hover{border-color:var(--accent)}button:disabled{opacity:.45;cursor:default}.note{color:var(--dim);font-size:12px}label{display:block;color:var(--soft)}textarea{margin-top:8px;display:block;width:100%;padding:12px;background:var(--bg);color:var(--text);border:1px solid var(--line-strong);border-radius:6px;resize:vertical;font:12px/1.5 Consolas,monospace}
</style>
