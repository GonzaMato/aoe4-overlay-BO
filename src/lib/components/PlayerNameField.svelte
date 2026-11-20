<script lang="ts">
 import CivFlag from './CivFlag.svelte';
 import { t, locale, label } from '$lib/i18n';
 import type { Settings } from '$lib/types';
 import type { RosterEntry } from '$lib/setup';
 let {settings=$bindable(),roster=[],optional=false}:{settings:Settings;roster?:RosterEntry[];optional?:boolean}=$props();
 const id=$props.id();
</script>

<div class="player-name">
 <label for={id}>{optional?$t("Tu nombre en AoE4 (opcional)", "Your AoE4 name (optional)"):$t("Tu nombre en AoE4", "Your AoE4 name")}</label>
 <input {id} maxlength="80" autocomplete="off" spellcheck="false" placeholder={$t("Como aparece en la pantalla de carga", "As shown on the loading screen")} bind:value={settings.setup.playerName} />
 {#if roster.length}
  <div class="seen">
   <span>{$t("Vistos en la última pantalla de carga:", "Seen on the last loading screen:")}</span>
   {#each roster as entry (entry.name)}
    <button type="button" class:chosen={settings.setup.playerName===entry.name} onclick={()=>settings.setup.playerName=entry.name}>
     <CivFlag civ={entry.civ} size={18}/>{entry.name}<small>{label(entry.civ,$locale)}</small>
    </button>
   {/each}
  </div>
 {/if}
 <small class="help">{$t("Con tu nombre, la app reconoce tu civilización en la pantalla de carga y elige su build sola. Si lo dejás vacío, lo aprende la primera vez que elijas un build durante una partida.", "With your name, the app recognizes your civilization on the loading screen and picks its build for you. Leave it blank and it learns your name the first time you choose a build during a match.")}</small>
</div>

<style>
 .player-name{display:grid;gap:8px}
 label{color:var(--soft)}
 input{width:100%;min-width:0;padding:8px 10px;border:1px solid var(--line-strong);border-radius:6px;background:var(--bg);font:inherit;color:inherit}
 .seen{display:flex;flex-wrap:wrap;align-items:center;gap:6px;font-size:12px;color:var(--dim)}
 .seen button{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border:1px solid var(--line-strong);border-radius:14px;background:var(--bg);font:inherit;color:var(--text);cursor:pointer}
 .seen button:hover,.seen button.chosen{border-color:var(--accent)}
 .seen small{color:var(--dim)}
 .help{color:var(--dim);font-size:12px;line-height:1.5}
</style>
