<script lang="ts">
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
 <div class="intro"><div><h3>Entrá al juego. El overlay se prepara.</h3><p>Ubica la pantalla, encuentra los aldeanos y toma el tiempo del reloj visible.</p></div>
 <label class="toggle"><input type="checkbox" bind:checked={settings.setup.enabled} /> Setup automático</label></div>
 <div class="status" role="status"><span class:enabled={settings.setup.enabled}></span><strong>{settings.setup.enabled ? status?.message || 'Esperando AoE4' : 'Desactivado'}</strong></div>
 <dl>
  <div><dt>Pantalla y perfil</dt><dd>{status?.profile || 'Se detectan al volver al juego'}</dd></div>
  <div><dt>Aldeanos</dt><dd>{status?.counters || 'Comida + madera + oro + piedra + inactivos'}</dd></div>
  <div><dt>Reloj</dt><dd>{status?.clock || 'Esperando reloj de partida visible'}</dd></div>
  <div><dt>Civilización y build</dt><dd>{status?.civilization || 'Completá tu nombre o elegí un build'}</dd></div>
 </dl>
 <div class="actions"><button disabled={!settings.setup.enabled} onclick={()=>void send('setup-retry')}>Volver a detectar</button><button disabled={!settings.setup.enabled} onclick={()=>void send('setup-clock-resume')}>Volver al reloj del juego</button></div>
 <p class="note">Cada paso tiene su condición: total, mínimo en recursos o traslado. Construcciones y subidas de edad quedan manuales. Podés revisar el criterio debajo de cada paso del build.</p>
</section>

<section class="setup-card">
 <h3>Tu jugador y tu build</h3><p>Completalo una vez. Se busca tu nombre en la preparación o carga de la partida para identificar tu civilización.</p>
 <div class="fields"><label>Nombre exacto en AoE4<input maxlength="80" placeholder="Tu nombre de jugador" bind:value={settings.setup.playerName} /></label>
 <label>Modo<select bind:value={settings.setup.mode}>{#each [...new Set([settings.setup.mode,...settings.modes])] as mode}<option value={mode}>{mode}</option>{/each}</select></label></div>
 <label>Build para usar ahora<select value={settings.activeBuildId??''} onchange={e=>onUse(e.currentTarget.value)}><option value="" disabled>Elegí un build</option>{#each builds as build}<option value={build.id}>{build.civ} · {build.name} · {build.mode}</option>{/each}</select></label>
 <p class="note">Tu elección se recuerda como predeterminada para esa civilización y modo. Un cambio manual tiene prioridad durante la partida. Si la identidad no es clara, se mantiene el build actual.</p>
</section>

<details class="setup-card"><summary>Corregir la detección</summary>
 <p>Si el HUD cambió o un contador no se reconoce, marcá solo los números. La corrección se guarda en el perfil de esta pantalla.</p>
 <div class="actions"><button disabled={!isTauri || !status?.geometry} onclick={()=>void select('workers')}>Marcar los cuatro recursos</button><button disabled={!isTauri || !status?.geometry} onclick={()=>void select('idle')}>Marcar inactivos</button><button onclick={()=>void send('overlay-action','editPosition')}>Mover overlay</button></div>
 {#if selectionError}<p class="error">{selectionError}</p>{/if}
 <p class="note">{settings.setup.profiles.length} perfiles guardados · Van incluidos en el respaldo completo. Para otra distribución del HUD, también podés desactivar el setup y usar los selectores de «Avance automático».</p>
</details>
<style>
 .setup-card{padding:22px 24px;border:1px solid var(--line);border-radius:12px;background:var(--card);margin-bottom:18px}h3{margin:0 0 8px;font-size:17px}p{color:var(--soft);line-height:1.5;margin:8px 0 16px}.intro{display:flex;justify-content:space-between;gap:20px;align-items:start}.toggle{display:flex;flex-direction:row;align-items:center;white-space:nowrap;padding-top:4px;color:var(--accent)}input[type=checkbox]{accent-color:var(--accent);width:18px;height:18px;margin-right:6px}.status{display:flex;gap:10px;align-items:center;padding:14px 0;border-bottom:1px solid var(--line);line-height:1.5}.status span{width:8px;height:8px;border-radius:50%;background:var(--dim);flex-shrink:0}.status span.enabled{background:var(--accent)}dl{margin:8px 0 20px}dl div{display:grid;grid-template-columns:160px 1fr;gap:16px;padding:10px 0}dt{color:var(--dim)}dd{margin:0;overflow-wrap:anywhere}.actions{display:flex;flex-wrap:wrap;gap:8px}button,input,select{font:inherit;color:inherit}button{padding:9px 12px;border:1px solid var(--line-strong);border-radius:6px;background:var(--bg);cursor:pointer}button:disabled{opacity:.45;cursor:default}.fields{display:grid;grid-template-columns:2fr 1fr;gap:16px;margin:20px 0 16px}label{display:flex;flex-direction:column;gap:8px;color:var(--soft)}input:not([type=checkbox]),select{min-width:0;width:100%;padding:10px;border:1px solid var(--line-strong);border-radius:6px;background:var(--bg)}.note{font-size:12px;color:var(--dim);margin:16px 0 0}summary{cursor:pointer;font-weight:600}.error{color:var(--late)}@media(max-width:1050px){.intro{flex-direction:column}.fields{grid-template-columns:1fr}dl div{grid-template-columns:130px 1fr}}
</style>
