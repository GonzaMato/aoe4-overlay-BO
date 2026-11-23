<script lang="ts">
 import { t } from '$lib/i18n';
 let { target }: { target?: 'workers' | 'idle' } = $props();
</script>

<figure>
 <div class="hud">
  <img src="/calibration-hud.png" width="260" height="310" alt={$t("Panel del juego con la población arriba a la izquierda y los aldeanos a la derecha.", "Game panel with population at the top left and villager counts on the right.")} />
  {#if target !== 'idle'}
   <div class="box workers" aria-hidden="true"><b>1</b></div>
  {/if}
  {#if target !== 'workers'}
   <div class="box idle" aria-hidden="true"><b>2</b></div>
  {/if}
 </div>
 <figcaption>
  {#if target !== 'idle'}
   <p><strong><b class="workers" aria-hidden="true">1</b>{$t("Aldeanos por recurso", "Villagers by resource")}</strong>
    {$t("Dibujá un solo rectángulo alrededor de 4, 6, 2 y 0. Centrá un número en cada cuarto de la selección, incluido el cero gris de piedra.", "Draw one rectangle around 4, 6, 2 and 0. Center one number in each quarter of the selection, including the gray zero for stone.")}</p>
  {/if}
  {#if target !== 'workers'}
   <p><strong><b class="idle" aria-hidden="true">2</b>{$t("Aldeanos inactivos", "Idle villagers")}</strong>
    {$t("En el botón azul, marcá el 1 a la derecha del aldeano con Z. Dejá ancho para tres cifras.", "On the blue button, select the 1 to the right of the villager with a Z. Leave room for three digits.")}</p>
  {/if}
  {#if !target}
   <p class="total">{$t("Lectura esperada", "Expected reading")}<br/><strong>4 + 6 + 2 + 0 + 1 = 13</strong></p>
  {/if}
 </figcaption>
</figure>

<style>
 figure { display: flex; flex-wrap: wrap; gap: 14px 20px; align-items: center; margin: 14px 0; }
 .hud { position: relative; width: min(100%, 220px); flex: none; }
 img { display: block; width: 100%; height: auto; border-radius: 4px; }
 /* The two OCR crops in this 260 × 310 HUD capture, in source pixels. */
 .box { position: absolute; left: calc(190 / 260 * 100%); width: calc(48 / 260 * 100%); border: 2px solid var(--marker); }
 .workers { --marker: #ffc457; }
 .idle { --marker: #73dbea; }
 .box.workers { top: calc(93 / 310 * 100%); height: calc(208 / 310 * 100%); }
 .box.idle { top: calc(23 / 310 * 100%); height: calc(40 / 310 * 100%); }
 b { display: inline-grid; place-items: center; width: 18px; height: 18px; border-radius: 50%; background: var(--marker); color: #171a1f; font: 600 13px/1 var(--font); }
 .box b { position: absolute; top: 50%; right: calc(100% + 4px); transform: translateY(-50%); }
 figcaption { flex: 1 1 170px; color: var(--soft); line-height: 1.45; }
 p { margin: 0 0 12px; }
 p:last-child { margin: 0; }
 strong { display: flex; align-items: center; gap: 7px; margin-bottom: 3px; color: var(--text); }
 .total { color: var(--dim); }
 .total strong { font-variant-numeric: tabular-nums; }
</style>
