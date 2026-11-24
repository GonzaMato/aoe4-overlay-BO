<script lang="ts">
 import { t } from '#lib/i18n.ts';
 import type { Step, Subtask } from '#lib/types.ts';
 import { copySubtasks, MAX_SUBTASKS, suggestSubtasks, validSubtasks } from '#lib/subtasks.ts';
 import { uid } from '#lib/util.ts';
 import StepAdvanceEditor from './StepAdvanceEditor.svelte';
 let {step=$bindable(),previous,index}:{step:Step;previous?:Step;index:number}=$props();
 let draft=$state<Subtask[]|null>(null);
 let source=$state('');
 const changed=$derived(draft!==null && source!==JSON.stringify(step));
 function edit(suggest=false){source=JSON.stringify(step);draft=suggest?suggestSubtasks(step,previous):copySubtasks(step.subtasks!);}
 function move(i:number,by:number){if(!draft)return;const [task]=draft.splice(i,1);draft.splice(i+by,0,task);}
 function apply(){if(draft && !changed && validSubtasks(draft)){step.subtasks=copySubtasks(draft);draft=null;}}
</script>

<div class="subtasks">
 {#if draft}
  <div class="heading"><strong>{$t(`Subtareas del paso ${index+1}`, `Subtasks for step ${index+1}`)}</strong><span>{$t("Borrador · todavía no aplicado", "Draft · changes pending")}</span></div>
  <p>{$t("Revisá el orden y los objetivos. AvPág confirma las tareas manuales; el OCR comprueba las de aldeanos. El reparto del paso es la referencia final.", "Review the order and targets. Page Down confirms manual tasks, and OCR checks villager tasks. The step allocation is the final target.")}</p>
  <ol>
   {#each draft as task,i (task.id)}
    <li>
     <div class="task-row"><span class="number">{i+1}</span><input aria-label={$t(`Acción de subtarea ${i+1} del paso ${index+1}`, `Action for subtask ${i+1} of step ${index+1}`)} bind:value={task.action} placeholder={$t("Qué hacer", "What to do")} />
      <button type="button" aria-label={$t(`Subir subtarea ${i+1}`, `Move subtask ${i+1} up`)} disabled={i===0} onclick={()=>move(i,-1)}>↑</button>
      <button type="button" aria-label={$t(`Bajar subtarea ${i+1}`, `Move subtask ${i+1} down`)} disabled={i===draft!.length-1} onclick={()=>move(i,1)}>↓</button>
      <button type="button" aria-label={$t(`Eliminar subtarea ${i+1}`, `Delete subtask ${i+1}`)} disabled={draft!.length===1} onclick={()=>draft!.splice(i,1)}>×</button>
     </div>
     <input class="note" aria-label={$t(`Nota de subtarea ${i+1} del paso ${index+1}`, `Note for subtask ${i+1} of step ${index+1}`)} bind:value={task.note} placeholder={$t("Detalle opcional", "Optional detail")} />
     <StepAdvanceEditor bind:step={draft[i]} allocation={step.villagers} {previous} index={i} label={$t(`Avance de tarea ${i+1}`, `Task ${i+1} advancement`)} />
    </li>
   {/each}
  </ol>
  {#if changed}<p class="warning">{$t("El paso cambió mientras editabas. Cancelá y abrí de nuevo las subtareas para usar los datos actuales.", "The step changed while you were editing. Cancel and reopen subtasks to use the current data.")}</p>{/if}
  <div class="buttons">
   <button type="button" disabled={draft.length>=MAX_SUBTASKS} onclick={()=>draft!.push({id:uid(),action:$t("Nueva tarea", "New task"),note:'',advance:{kind:'manual'}})}>{$t("Agregar tarea", "Add task")}</button>
   <span class="spacer"></span><button type="button" onclick={()=>draft=null}>{$t("Cancelar", "Cancel")}</button>
   <button class="primary" type="button" disabled={changed || !validSubtasks(draft)} onclick={apply}>{$t("Aplicar subtareas", "Apply subtasks")}</button>
  </div>
 {:else if step.subtasks?.length}
  <div class="buttons"><strong>{$t(`${step.subtasks.length} tareas en secuencia`, `${step.subtasks.length} tasks in sequence`)}</strong><button type="button" onclick={()=>edit()}>{$t("Editar subtareas", "Edit subtasks")}</button><button type="button" onclick={()=>{delete step.subtasks;}}>{$t("Volver a paso único", "Return to a single step")}</button></div>
 {:else}
  <button class="split" type="button" onclick={()=>edit(true)}>{$t("Separar en subtareas…", "Split into subtasks…")}</button>
 {/if}
</div>

<style>
 .subtasks{grid-column:1/-1;margin:0 0 8px 36px;font-size:12px;color:var(--soft)}.heading,.buttons,.task-row{display:flex;align-items:center;gap:8px}.heading span{color:var(--dim)}.heading{justify-content:space-between}p{color:var(--dim);line-height:1.5;max-width:800px}ol{list-style:none;margin:12px 0;padding:0;display:grid;gap:8px}li{padding:12px;background:var(--card);border:1px solid var(--line);border-radius:8px}.number{font-family:var(--font-num);font-size:20px;width:20px;color:var(--accent)}input{background:var(--bg);color:var(--text);border:1px solid var(--line-strong);border-radius:5px;padding:6px 8px;min-width:0;font:inherit}.task-row input{flex:1}.note{margin:8px 0 0 28px;width:calc(100% - 28px)}button{border:1px solid var(--line-strong);border-radius:5px;background:var(--card);color:var(--soft);padding:6px 10px;cursor:pointer;font:inherit}button:hover:not(:disabled){border-color:var(--accent)}button:disabled{opacity:.5;cursor:default}.split{border-color:transparent;padding:3px 0;color:var(--dim)}.primary{background:var(--accent);color:var(--bg);border-color:var(--accent)}.spacer{flex:1}.warning{color:var(--late)}button:focus-visible,input:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
</style>
