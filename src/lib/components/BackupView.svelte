<script lang="ts">
 import { t } from '#lib/i18n.ts';
 import type { AppData } from '#lib/types.ts';
 import { downloadBackup, importBackup } from '#lib/imports.ts';
 let { data, onRestore }: { data: AppData; onRestore: (data: AppData) => void } = $props();
 let pending = $state<AppData | null>(null);
 let error = $state('');
 async function read(event: Event) {
   pending = null; error = '';
   const input = event.currentTarget as HTMLInputElement;
   const file = input.files?.[0]; if (!file) return;
   try { pending = importBackup(await file.text()); } catch(e) { error = e instanceof Error ? e.message : String(e); }
   input.value = '';
 }
</script>
<section>
 <h2>{$t("Respaldo completo", "Full backup")}</h2>
 <p>{$t("Guardá una copia de tus builds, ajustes y registros de práctica. Podés recuperarla en esta PC o llevarla a otra.", "Save a copy of your builds, settings, and practice history to restore on this PC or another one.")}</p>
 <div class="counts"><span><strong>{data.builds.length}</strong> builds</span><span><strong>{data.practices.length}</strong> {$t('prácticas', 'practice sessions')}</span><span>{$t("Todos tus ajustes", "All your settings")}</span></div>
 <h3>{$t("Guardar una copia", "Save a copy")}</h3>
 <button type="button" onclick={() => downloadBackup(data)}>{$t("Exportar respaldo", "Export backup")}</button>
 <h3>{$t("Recuperar un respaldo", "Restore a backup")}</h3>
 <p>{$t("Elegí un archivo JSON. Podés revisarlo antes de reemplazar tus datos.", "Choose a JSON file to review before replacing your data.")}</p>
 <label>{$t("Archivo de respaldo ", "Backup file ")}<input type="file" accept=".json,application/json" onchange={read} /></label>
 {#if error}<p role="alert">{error}</p>{/if}
 {#if pending}
  <div class="confirm">
   <p>{$t(`Archivo validado: ${pending.builds.length} builds y ${pending.practices.length} prácticas. Restaurar reemplaza los datos actuales y termina la práctica en curso. Exportá antes si querés conservarlos.`, `Backup verified with ${pending.builds.length} builds and ${pending.practices.length} practice sessions. Restoring replaces your current data and ends the current practice. Export first to keep a copy.`)}</p>
   <button type="button" onclick={() => { if (pending) onRestore($state.snapshot(pending) as AppData); pending = null; }}>{$t("Reemplazar con este respaldo", "Replace with this backup")}</button>
   <button type="button" onclick={() => pending = null}>{$t("Cancelar", "Cancel")}</button>
  </div>
 {/if}
</section>
<style>
 section { padding: 22px; border: 1px solid var(--line); border-radius: 10px; background: var(--card); }
 h2 { font-size: 17px; margin: 0; } h3 { font-size: 14px; margin: 24px 0 10px; } p { color: var(--dim); } button { padding: 9px 14px; margin: 0 12px 0 0; background: var(--bg); border: 1px solid var(--line-strong); border-radius: 6px; cursor: pointer; }
 .counts { display: flex; gap: 24px; padding: 16px 0; border-block: 1px solid var(--line-strong); color: var(--soft); flex-wrap: wrap; } .counts strong { font-family: var(--font-num); font-size: 24px; color: var(--accent); margin-right: 4px; }
 label { display: grid; gap: 8px; color: var(--soft); font-size: 13px; } input { max-width: 100%; padding: 10px; background: var(--bg); border: 1px dashed var(--line-strong); border-radius: 6px; } .confirm { padding: 14px; border: 1px solid var(--accent); margin-top: 18px; border-radius: 6px; }
</style>
