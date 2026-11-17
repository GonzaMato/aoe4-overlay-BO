<script lang="ts">
 import type { AppData } from '$lib/types';
 import { exportBackup, importBackup } from '$lib/imports';
 let { data, onRestore }: { data: AppData; onRestore: (data: AppData) => void } = $props();
 let pending = $state<AppData | null>(null);
 let error = $state('');
 function download() {
   const url = URL.createObjectURL(new Blob([exportBackup(data)], { type: 'application/json' }));
   const a = document.createElement('a'); a.href = url; a.download = `aoe4-respaldo-${new Date().toISOString().slice(0,10)}.json`; a.click();
   setTimeout(() => URL.revokeObjectURL(url), 10000);
 }
 async function read(event: Event) {
   pending = null; error = '';
   const input = event.currentTarget as HTMLInputElement;
   const file = input.files?.[0]; if (!file) return;
   try { pending = importBackup(await file.text()); } catch(e) { error = e instanceof Error ? e.message : String(e); }
   input.value = '';
 }
</script>
<section>
 <h2>Respaldo completo</h2>
 <p>Guardá una copia de tus builds, ajustes y registros de práctica. Podés recuperarla en esta PC o llevarla a otra.</p>
 <div class="counts"><span><strong>{data.builds.length}</strong> builds</span><span><strong>{data.practices.length}</strong> prácticas</span><span>Todos tus ajustes</span></div>
 <h3>Guardar una copia</h3>
 <button type="button" onclick={download}>Exportar respaldo</button>
 <h3>Recuperar un respaldo</h3>
 <p>Elegí un archivo JSON. Podés revisarlo antes de reemplazar tus datos.</p>
 <label>Archivo de respaldo <input type="file" accept=".json,application/json" onchange={read} /></label>
 {#if error}<p role="alert">{error}</p>{/if}
 {#if pending}
  <div class="confirm">
   <p>Archivo validado: {pending.builds.length} builds y {pending.practices.length} prácticas. Restaurar reemplaza los datos actuales y termina la práctica en curso. Exportá antes si querés conservarlos.</p>
   <button type="button" onclick={() => { if (pending) onRestore($state.snapshot(pending) as AppData); pending = null; }}>Reemplazar con este respaldo</button>
   <button type="button" onclick={() => pending = null}>Cancelar</button>
  </div>
 {/if}
</section>
<style>
 section { padding: 22px; border: 1px solid var(--line); border-radius: 10px; background: var(--card); }
 h2 { font-size: 17px; margin: 0; } h3 { font-size: 14px; margin: 24px 0 10px; } p { color: var(--dim); } button { padding: 9px 14px; margin: 0 12px 0 0; background: var(--bg); border: 1px solid var(--line-strong); border-radius: 6px; cursor: pointer; }
 .counts { display: flex; gap: 24px; padding: 16px 0; border-block: 1px solid var(--line-strong); color: var(--soft); flex-wrap: wrap; } .counts strong { font-family: var(--font-num); font-size: 24px; color: var(--accent); margin-right: 4px; }
 label { display: grid; gap: 8px; color: var(--soft); font-size: 13px; } input { max-width: 100%; padding: 10px; background: var(--bg); border: 1px dashed var(--line-strong); border-radius: 6px; } .confirm { padding: 14px; border: 1px solid var(--accent); margin-top: 18px; border-radius: 6px; }
</style>
