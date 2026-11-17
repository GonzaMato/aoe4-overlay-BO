<script lang="ts">
 import { RESOURCES, RES_LABEL, type Step, type Resource, type Villagers } from '$lib/types';
 import { resolveAdvance, advanceLabel } from '$lib/advance';
 import { villagerTotal } from '$lib/ocr';
 let {step=$bindable(),previous,index,allocation,label}:{step:Pick<Step,'action'|'note'|'advance'> & Partial<Step>;previous?:Step;index:number;allocation?:Villagers;label?:string}=$props();
 const fullStep=$derived({...step,id:step.id??'draft',pop:step.pop??null,time:step.time??null,villagers:step.villagers??allocation??{food:0,wood:0,gold:0,stone:0}} as Step);
 const effective=$derived(resolveAdvance(fullStep,previous));
 const mode=$derived(step.advance?.kind??'auto');
 const bounded=(value:string)=>Math.min(200,Math.max(1,Math.round(Number(value)||1)));
 function changeMode(kind:string) {
   const suggested=resolveAdvance({...fullStep,advance:undefined},previous);
   if(kind==='auto' || kind==='manual')step.advance={kind};
   else if(kind==='total')step.advance={kind,count:Math.min(200,Math.max(1,villagerTotal(fullStep.villagers)))};
   else if(kind==='resources')step.advance=suggested.kind==='resources'?suggested:{kind,minimum:{food:Math.min(200,Math.max(1,fullStep.villagers.food))}};
   else if(kind==='transfer')step.advance=suggested.kind==='transfer'?suggested:{kind,from:'gold',to:'wood',count:2};
 }
 function setMinimum(r:Resource,n:number|null) {
   if(step.advance?.kind!=='resources')return;
   const minimum={...step.advance.minimum};
   if(n===null)delete minimum[r];else minimum[r]=Math.min(n,200-Object.entries(minimum).filter(([k])=>k!==r).reduce((s,[,v])=>s+v,0));
   step.advance={kind:'resources',minimum};
 }
 function setResource(field:'from'|'to',r:Resource) {
   if(step.advance?.kind!=='transfer')return;
   const rule={...step.advance},other=field==='from'?'to':'from';
   if(rule[other]===r)rule[other]=rule[field];
   rule[field]=r;step.advance=rule;
 }
</script>

<details class="advance-editor">
 <summary><span>{label??`Avance del paso ${index+1}`}</span><strong>{mode==='auto'?'Sugerido · ':''}{advanceLabel(effective)}</strong></summary>
 <div class="controls">
  <label>Al completar este paso<select aria-label="Criterio de avance del paso {index+1}" value={mode} onchange={e=>changeMode(e.currentTarget.value)}>
   <option value="auto">Sugerir según la instrucción</option><option value="manual">Manual (AvPág)</option><option value="total">Total de aldeanos</option><option value="resources">Mínimos por recurso</option><option value="transfer">Traslado entre recursos</option>
  </select></label>
  {#if step.advance?.kind==='total'}
   <label>Total mínimo<input aria-label="Total mínimo del paso {index+1}" type="number" min="1" max="200" value={step.advance.count} onchange={e=>{step.advance={kind:'total',count:bounded(e.currentTarget.value)};}} /></label>
  {:else if step.advance?.kind==='resources'}
   <div class="resources">{#each RESOURCES as r}
    {@const selected=step.advance.minimum[r]!==undefined}
    <label class="resource"><span><input type="checkbox" aria-label="Comprobar {RES_LABEL[r]} en paso {index+1}" checked={selected} disabled={selected && Object.keys(step.advance.minimum).length===1 || !selected && Object.values(step.advance.minimum).reduce((a,b)=>a+b,0)>=200} onchange={e=>setMinimum(r,e.currentTarget.checked?Math.min(200,Math.max(1,fullStep.villagers[r])):null)} />{RES_LABEL[r]}</span>
    {#if selected}<input aria-label="Mínimo de {RES_LABEL[r]} del paso {index+1}" type="number" min="1" max="200" value={step.advance.minimum[r]} onchange={e=>setMinimum(r,bounded(e.currentTarget.value))} />{/if}</label>
   {/each}</div>
  {:else if step.advance?.kind==='transfer'}
   <label>Desde<select aria-label="Origen del traslado del paso {index+1}" value={step.advance.from} onchange={e=>setResource('from',e.currentTarget.value as Resource)}>{#each RESOURCES as r}<option value={r}>{RES_LABEL[r]}</option>{/each}</select></label>
   <label>Hacia<select aria-label="Destino del traslado del paso {index+1}" value={step.advance.to} onchange={e=>setResource('to',e.currentTarget.value as Resource)}>{#each RESOURCES as r}<option value={r}>{RES_LABEL[r]}</option>{/each}</select></label>
   <label>Cantidad<input aria-label="Cantidad a trasladar del paso {index+1}" type="number" min="1" max="200" value={step.advance.count} onchange={e=>{if(step.advance?.kind==='transfer')step.advance={...step.advance,count:bounded(e.currentTarget.value)};}} /></label>
  {/if}
 </div>
 <p>{effective.kind==='transfer'?'Espera que el origen baje y el destino suba respecto del reparto al entrar al paso. Si ya hiciste el traslado antes de la lectura inicial, usá AvPág.':effective.kind==='resources'?'Solo exige los mínimos indicados. Permite aldeanos extra en cualquier recurso; los inactivos no cumplen un mínimo de recurso.':effective.kind==='total'?'Suma los cuatro recursos y los inactivos. No usa población ni exige un reparto.':'Las construcciones, subidas de edad e instrucciones ambiguas necesitan confirmación manual.'} El OCR confirma tres lecturas antes de avanzar.</p>
</details>

<style>
 .advance-editor{grid-column:1/-1;margin:0 0 5px 36px;padding:6px 10px;border-left:2px solid var(--line);font-size:12px;color:var(--soft)}summary{cursor:pointer;line-height:1.6}summary span{color:var(--dim);margin-right:12px}strong{font-weight:500}.controls{display:flex;gap:12px;flex-wrap:wrap;margin:12px 0}label{display:flex;flex-direction:column;gap:6px}select,input[type=number]{border:1px solid var(--line-strong);border-radius:5px;background:var(--bg);color:var(--text);font:inherit;height:32px;padding:0 8px}input[type=number]{width:84px}.resources{display:flex;gap:12px;flex-wrap:wrap}.resource span{display:flex;align-items:center;gap:5px}input[type=checkbox]{accent-color:var(--accent)}p{max-width:800px;color:var(--dim);line-height:1.5;margin:8px 0}input:focus-visible,select:focus-visible,summary:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
</style>
