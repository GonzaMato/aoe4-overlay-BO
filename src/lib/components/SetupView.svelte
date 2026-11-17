<script lang="ts">
 import { t, locale, label } from '$lib/i18n';
 import { onMount } from 'svelte';
 import { send, isTauri, openRegionSelector, monitorOptions } from '$lib/bridge';
 import type { Settings, Build } from '$lib/types';
 import type { SetupStatus } from '$lib/setup';
 let {settings=$bindable(),status,builds,onUse}:{settings:Settings;status:SetupStatus|null;builds:Build[];onUse:(id:string)=>void}=$props();
 let selectionError=$state('');
 async function select(target:'workers'|'idle') {
   try {
     const monitors=await monitorOptions(),g=status?.geometry;
     const index=g?monitors.findIndex(m=>g.x>=m.position.x && g.x<m.position.x+m.size.width && g.y>=m.position.y && g.y<m.position.y+m.size.height):0;
     await openRegionSelector(Math.max(0,index),target);selectionError='';
   }catch(e){selectionError=String(e);}
 }
 onMount(()=>{void send('setup-status-request');});
</script>

<section class="setup-card">
 <div class="intro"><div><h3>{$t("Entrá al juego. El overlay se prepara.", "Open the game to set up the overlay.")}</h3><p>{$t("Ubica la pantalla, encuentra los aldeanos y toma el tiempo del reloj visible.", "The overlay finds your screen, villager counters, and game clock.")}</p></div>
 <label class="toggle"><input type="checkbox" bind:checked={settings.setup.enabled} /> {$t("Setup automático", "Automatic setup")}</label></div>
 <div class="status" role="status"><span class:enabled={settings.setup.enabled}></span><strong>{settings.setup.enabled ? status?.message || $t("Esperando AoE4", "Waiting for AoE4") : $t("Desactivado", "Disabled")}</strong></div>
 <dl>
  <div><dt>{$t("Pantalla y perfil", "Screen and profile")}</dt><dd>{status?.profile || $t("Se detectan al volver al juego", "Detected when you return to the game")}</dd></div>
  <div><dt>{$t("Aldeanos", "Villagers")}</dt><dd>{status?.counters || $t("Comida + madera + oro + piedra + inactivos", "Food + wood + gold + stone + idle")}</dd></div>
  <div><dt>{$t("Reloj", "Clock")}</dt><dd>{status?.clock || $t("Esperando reloj de partida visible", "Waiting for the in-game clock")}</dd></div>
  <div><dt>{$t("Civilización y build", "Civilization and build")}</dt><dd>{status?.civilization || $t("Completá tu nombre o elegí un build", "Enter your player name or choose a build")}</dd></div>
 </dl>
 <div class="actions"><button disabled={!settings.setup.enabled} onclick={()=>void send('setup-retry')}>{$t("Volver a detectar", "Detect again")}</button><button disabled={!settings.setup.enabled} onclick={()=>void send('setup-clock-resume')}>{$t("Volver al reloj del juego", "Use game clock")}</button></div>
 <p class="note">{$t("Cada paso tiene su condición: total, mínimo en recursos o traslado. Construcciones y subidas de edad quedan manuales. Podés revisar el criterio debajo de cada paso del build.", "Steps can advance on a villager total, a resource minimum, or a transfer. Buildings and age-ups require manual confirmation. Review the rule below each step.")}</p>
</section>

<section class="setup-card">
 <h3>{$t("Tu jugador y tu build", "Player and build")}</h3><p>{$t("Completalo una vez. Se busca tu nombre en la preparación o carga de la partida para identificar tu civilización.", "Enter your name once so the overlay can identify your civilization from the lobby or loading screen.")}</p>
 <div class="fields"><label>{$t("Nombre exacto en AoE4", "Exact AoE4 player name")}<input maxlength="80" placeholder={$t("Tu nombre de jugador", "Your player name")} bind:value={settings.setup.playerName} /></label>
 <label>{$t("Modo", "Mode")}<select bind:value={settings.setup.mode}>{#each [...new Set([settings.setup.mode,...settings.modes])] as mode}<option value={mode}>{label(mode, $locale)}</option>{/each}</select></label></div>
 <label>{$t("Build para usar ahora", "Current build")}<select value={settings.activeBuildId??''} onchange={e=>onUse(e.currentTarget.value)}><option value="" disabled>{$t("Elegí un build", "Choose a build")}</option>{#each builds as build}<option value={build.id}>{label(build.civ, $locale)} · {build.name} · {label(build.mode, $locale)}</option>{/each}</select></label>
 <p class="note">{$t("Tu elección se recuerda como predeterminada para esa civilización y modo. Un cambio manual tiene prioridad durante la partida. Si la identidad no es clara, se mantiene el build actual.", "Your choice becomes the default for that civilization and mode. Manual changes take priority during the match. The overlay keeps the current build if it cannot identify your civilization.")}</p>
</section>

<details class="setup-card"><summary>{$t("Corregir la detección", "Fix detection")}</summary>
 <p>{$t("Si el HUD cambió o un contador no se reconoce, marcá solo los números. La corrección se guarda en el perfil de esta pantalla.", "If the HUD changes or a counter goes unread, select just the digits. The correction is saved to this screen’s profile.")}</p>
 <div class="actions"><button disabled={!isTauri || !status?.geometry} onclick={()=>void select('workers')}>{$t("Marcar los cuatro recursos", "Select the four resource counters")}</button><button disabled={!isTauri || !status?.geometry} onclick={()=>void select('idle')}>{$t("Marcar inactivos", "Select the idle counter")}</button><button onclick={()=>void send('overlay-action','editPosition')}>{$t("Mover overlay", "Move overlay")}</button></div>
 {#if selectionError}<p class="error">{selectionError}</p>{/if}
 <p class="note">{$t(`${settings.setup.profiles.length} perfiles guardados · Van incluidos en el respaldo completo. Para otra distribución del HUD, también podés desactivar el setup y usar los selectores de «Avance automático».`, `${settings.setup.profiles.length} saved profiles, included in your full backup. For a different HUD layout, you can disable setup and use the region selectors under Automatic advancement.`)}</p>
</details>
<style>
 .setup-card{padding:22px 24px;border:1px solid var(--line);border-radius:12px;background:var(--card);margin-bottom:18px}h3{margin:0 0 8px;font-size:17px}p{color:var(--soft);line-height:1.5;margin:8px 0 16px}.intro{display:flex;justify-content:space-between;gap:20px;align-items:start}.toggle{display:flex;flex-direction:row;align-items:center;white-space:nowrap;padding-top:4px;color:var(--accent)}input[type=checkbox]{accent-color:var(--accent);width:18px;height:18px;margin-right:6px}.status{display:flex;gap:10px;align-items:center;padding:14px 0;border-bottom:1px solid var(--line);line-height:1.5}.status span{width:8px;height:8px;border-radius:50%;background:var(--dim);flex-shrink:0}.status span.enabled{background:var(--accent)}dl{margin:8px 0 20px}dl div{display:grid;grid-template-columns:160px 1fr;gap:16px;padding:10px 0}dt{color:var(--dim)}dd{margin:0;overflow-wrap:anywhere}.actions{display:flex;flex-wrap:wrap;gap:8px}button,input,select{font:inherit;color:inherit}button{padding:9px 12px;border:1px solid var(--line-strong);border-radius:6px;background:var(--bg);cursor:pointer}button:disabled{opacity:.45;cursor:default}.fields{display:grid;grid-template-columns:2fr 1fr;gap:16px;margin:20px 0 16px}label{display:flex;flex-direction:column;gap:8px;color:var(--soft)}input:not([type=checkbox]),select{min-width:0;width:100%;padding:10px;border:1px solid var(--line-strong);border-radius:6px;background:var(--bg)}.note{font-size:12px;color:var(--dim);margin:16px 0 0}summary{cursor:pointer;font-weight:600}.error{color:var(--late)}@media(max-width:1050px){.intro{flex-direction:column}.fields{grid-template-columns:1fr}dl div{grid-template-columns:130px 1fr}}
</style>
