<script lang="ts">
 import { t, locale } from '$lib/i18n';
 import type { Practice, HotkeyAction } from '$lib/types';
 import { formatTime } from '$lib/util';
 import { send } from '$lib/bridge';
 export interface PracticeStatus { elapsed: number | null; running: boolean; step: number; buildName: string; recording: boolean; editing: boolean; automatic?:boolean; manualClock?:boolean; }
 let { practices, status, selectedId = null }: { practices: Practice[]; status: PracticeStatus | null; selectedId?: string | null } = $props();
 let chosen = $state<string | null>(null);
 const selected = $derived(practices.find(p => p.id === (chosen ?? selectedId)) ?? practices.at(-1));
 const action = (name: HotkeyAction) => void send('overlay-action', name);
</script>
<div class="practice">
 <h2>{$t("Práctica", "Practice")}</h2>
 <p class="current">{status?.buildName || $t("Esperando overlay", "Waiting for overlay")} · {$t(`Paso ${status?.step ?? '—'}`, `Step ${status?.step ?? '—'}`)} · <strong>{formatTime(status?.elapsed) || '0:00'}</strong> {status?.recording ? (status.running ? $t("En marcha", "Running") : $t("Pausado", "Paused")) : ''}</p>
 <div class="controls">
  <button onclick={() => action('start')}>{$t("Iniciar / reanudar reloj", "Start / resume clock")}</button>
  <button onclick={() => action('pauseClock')}>{$t("Pausar / reanudar", "Pause / resume")}</button>
  <button onclick={() => action('resetClock')}>{$t("Reiniciar solo el reloj", "Reset clock only")}</button>
  <button onclick={() => action('clockMinus')}>−5 s</button><button onclick={() => action('clockPlus')}>+5 s</button>
  <button onclick={() => action('resetPractice')}>{$t("Nueva práctica", "New practice")}</button>
  <button onclick={() => action('finishPractice')}>{$t("Terminar práctica", "Finish practice")}</button>
  {#if status?.automatic}<button onclick={()=>void send('setup-clock-resume')}>{$t("Volver al reloj del juego", "Use game clock")}</button>{/if}
 </div>
 {#if status?.automatic}<p>{status.manualClock ? $t("Reloj manual: la detección no cambia tus ajustes.", "Manual clock mode keeps your clock adjustments.") : $t("Reloj del juego: espera cuando no puede leerlo. La sincronización conserva las llegadas ya registradas.", "The game clock waits for a reading and keeps your recorded arrival times when it resyncs.")}</p>{/if}
 <p>{$t("Se registra la primera llegada a cada paso. Volver atrás no la reemplaza. Corregir el reloj también corrige los tiempos registrados. Al terminar, el resumen queda guardado acá.", "Practice records your first arrival at each step. Clock adjustments also update recorded times. Your summary appears here when practice ends.")}</p>
 <label>{$t("Historial", "History")} <select value={chosen ?? selected?.id ?? ''} onchange={e => chosen = e.currentTarget.value}>
  {#each [...practices].reverse() as p (p.id)}<option value={p.id}>{new Date(p.startedAt).toLocaleString($locale)} · {p.buildName}{p.finishedAt === null ? $t(" · Sin terminar", " · Unfinished") : ''}</option>{/each}
 </select></label>
 {#if selected}
  <h3>{selected.buildName}</h3>
  <p>{$t(`${selected.arrivals.filter(a => a.target !== null && a.elapsed > a.target).length} pasos con atraso · ${selected.arrivals.length} pasos registrados`, `${selected.arrivals.filter(a => a.target !== null && a.elapsed > a.target).length} steps late · ${selected.arrivals.length} steps recorded`)}</p>
  <table><thead><tr><th>{$t("Paso", "Step")}</th><th>{$t("Acción", "Action")}</th><th>{$t("Objetivo", "Target")}</th><th>{$t("Llegada", "Arrival")}</th><th>{$t("Diferencia", "Difference")}</th></tr></thead>
   <tbody>{#each selected.arrivals as a (a.stepId)}<tr><td>{a.index + 1}</td><td>{a.action}</td><td>{formatTime(a.target) || '—'}</td><td>{formatTime(a.elapsed)}</td><td class:late={a.target !== null && a.elapsed > a.target}>{a.target === null ? $t("Sin objetivo", "No target") : a.elapsed > a.target ? $t(`${formatTime(a.elapsed - a.target)} tarde`, `${formatTime(a.elapsed - a.target)} late`) : a.elapsed === a.target ? $t("A tiempo", "On time") : $t(`${formatTime(a.target - a.elapsed)} antes`, `${formatTime(a.target - a.elapsed)} early`)}</td></tr>{/each}</tbody>
  </table>
 {:else}<p>{$t("Todavía no hay registros. Iniciá el reloj y avanzá los pasos del build.", "No records yet. Start the clock and move through the build steps.")}</p>{/if}
</div>
<style>
 .practice { max-width: 1100px; } h2 { margin-top: 0; } p { color: var(--dim); } .current { color: var(--text); font-size: 18px; } .controls { display: flex; flex-wrap: wrap; gap: 8px; }
 button, select { padding: 8px 12px; background: var(--card); border: 1px solid var(--line-strong); border-radius: 6px; } button { cursor: pointer; } select { margin-left: 10px; max-width: 90%; }
 table { border-collapse: collapse; width: 100%; } td, th { padding: 12px; text-align: left; border-bottom: 1px solid var(--line); } th { color: var(--dim); } .late { color: var(--late); }
</style>
