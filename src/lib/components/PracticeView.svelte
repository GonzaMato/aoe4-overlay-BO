<script lang="ts">
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
 <h2>Práctica</h2>
 <p class="current">{status?.buildName || 'Esperando overlay'} · Paso {status?.step ?? '—'} · <strong>{formatTime(status?.elapsed) || '0:00'}</strong> {status?.recording ? (status.running ? 'En marcha' : 'Pausado') : ''}</p>
 <div class="controls">
  <button onclick={() => action('start')}>Iniciar / reanudar reloj</button>
  <button onclick={() => action('pauseClock')}>Pausar / reanudar</button>
  <button onclick={() => action('resetClock')}>Reiniciar solo el reloj</button>
  <button onclick={() => action('clockMinus')}>−5 s</button><button onclick={() => action('clockPlus')}>+5 s</button>
  <button onclick={() => action('resetPractice')}>Nueva práctica</button>
  <button onclick={() => action('finishPractice')}>Terminar práctica</button>
  {#if status?.automatic}<button onclick={()=>void send('setup-clock-resume')}>Volver al reloj del juego</button>{/if}
 </div>
 {#if status?.automatic}<p>{status.manualClock ? 'Reloj manual: la detección no cambia tus ajustes.' : 'Reloj del juego: espera cuando no puede leerlo. La sincronización conserva las llegadas ya registradas.'}</p>{/if}
 <p>Se registra la primera llegada a cada paso. Volver atrás no la reemplaza. Corregir el reloj también corrige los tiempos registrados. Al terminar, el resumen queda guardado acá.</p>
 <label>Historial <select value={chosen ?? selected?.id ?? ''} onchange={e => chosen = e.currentTarget.value}>
  {#each [...practices].reverse() as p (p.id)}<option value={p.id}>{new Date(p.startedAt).toLocaleString()} · {p.buildName}{p.finishedAt === null ? ' · Sin terminar' : ''}</option>{/each}
 </select></label>
 {#if selected}
  <h3>{selected.buildName}</h3>
  <p>{selected.arrivals.filter(a => a.target !== null && a.elapsed > a.target).length} pasos con atraso · {selected.arrivals.length} pasos registrados</p>
  <table><thead><tr><th>Paso</th><th>Acción</th><th>Objetivo</th><th>Llegada</th><th>Diferencia</th></tr></thead>
   <tbody>{#each selected.arrivals as a (a.stepId)}<tr><td>{a.index + 1}</td><td>{a.action}</td><td>{formatTime(a.target) || '—'}</td><td>{formatTime(a.elapsed)}</td><td class:late={a.target !== null && a.elapsed > a.target}>{a.target === null ? 'Sin objetivo' : a.elapsed > a.target ? `${formatTime(a.elapsed - a.target)} tarde` : a.elapsed === a.target ? 'A tiempo' : `${formatTime(a.target - a.elapsed)} antes`}</td></tr>{/each}</tbody>
  </table>
 {:else}<p>Todavía no hay registros. Iniciá el reloj y avanzá los pasos del build.</p>{/if}
</div>
<style>
 .practice { max-width: 1100px; } h2 { margin-top: 0; } p { color: var(--dim); } .current { color: var(--text); font-size: 18px; } .controls { display: flex; flex-wrap: wrap; gap: 8px; }
 button, select { padding: 8px 12px; background: var(--card); border: 1px solid var(--line-strong); border-radius: 6px; } button { cursor: pointer; } select { margin-left: 10px; max-width: 90%; }
 table { border-collapse: collapse; width: 100%; } td, th { padding: 12px; text-align: left; border-bottom: 1px solid var(--line); } th { color: var(--dim); } .late { color: var(--late); }
</style>
