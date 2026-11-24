<script lang="ts">
 import { t, locale, resourceLabel } from '#lib/i18n.ts';
 import { RESOURCES, type Step, type Resource, type Villagers } from '#lib/types.ts';
 import { resolveAdvance, advanceLabel } from '#lib/advance.ts';
 import { villagerTotal } from '#lib/ocr.ts';
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
 <summary><span>{label??$t(`Avance del paso ${index+1}`, `Step ${index+1} advancement`)}</span><strong>{mode==='auto'?$t("Sugerido · ", "Suggested · "):''}{advanceLabel(effective, $locale)}</strong></summary>
 <div class="controls">
  <label>{$t("Al completar este paso", "When this step is complete")}<select aria-label={$t(`Criterio de avance del paso ${index+1}`, `Advancement rule for step ${index+1}`)} value={mode} onchange={e=>changeMode(e.currentTarget.value)}>
   <option value="auto">{$t("Sugerir según la instrucción", "Suggest from instructions")}</option><option value="manual">{$t("Manual (AvPág)", "Manual (Page Down)")}</option><option value="total">{$t("Total de aldeanos", "Total villagers")}</option><option value="resources">{$t("Mínimos por recurso", "Resource minimums")}</option><option value="transfer">{$t("Traslado entre recursos", "Resource transfer")}</option>
  </select></label>
  {#if step.advance?.kind==='total'}
   <label>{$t("Total mínimo", "Minimum total")}<input aria-label={$t(`Total mínimo del paso ${index+1}`, `Minimum total for step ${index+1}`)} type="number" min="1" max="200" value={step.advance.count} onchange={e=>{step.advance={kind:'total',count:bounded(e.currentTarget.value)};}} /></label>
  {:else if step.advance?.kind==='resources'}
   <div class="resources">{#each RESOURCES as r}
    {@const selected=step.advance.minimum[r]!==undefined}
    <label class="resource"><span><input type="checkbox" aria-label={$t(`Comprobar ${resourceLabel(r, $locale)} en paso ${index+1}`, `Check ${resourceLabel(r, $locale)} in step ${index+1}`)} checked={selected} disabled={selected && Object.keys(step.advance.minimum).length===1 || !selected && Object.values(step.advance.minimum).reduce((a,b)=>a+b,0)>=200} onchange={e=>setMinimum(r,e.currentTarget.checked?Math.min(200,Math.max(1,fullStep.villagers[r])):null)} />{resourceLabel(r, $locale)}</span>
    {#if selected}<input aria-label={$t(`Mínimo de ${resourceLabel(r, $locale)} del paso ${index+1}`, `${resourceLabel(r, $locale)} minimum for step ${index+1}`)} type="number" min="1" max="200" value={step.advance.minimum[r]} onchange={e=>setMinimum(r,bounded(e.currentTarget.value))} />{/if}</label>
   {/each}</div>
  {:else if step.advance?.kind==='transfer'}
   <label>{$t("Desde", "From")}<select aria-label={$t(`Origen del traslado del paso ${index+1}`, `Transfer source for step ${index+1}`)} value={step.advance.from} onchange={e=>setResource('from',e.currentTarget.value as Resource)}>{#each RESOURCES as r}<option value={r}>{resourceLabel(r, $locale)}</option>{/each}</select></label>
   <label>{$t("Hacia", "To")}<select aria-label={$t(`Destino del traslado del paso ${index+1}`, `Transfer destination for step ${index+1}`)} value={step.advance.to} onchange={e=>setResource('to',e.currentTarget.value as Resource)}>{#each RESOURCES as r}<option value={r}>{resourceLabel(r, $locale)}</option>{/each}</select></label>
   <label>{$t("Cantidad", "Count")}<input aria-label={$t(`Cantidad a trasladar del paso ${index+1}`, `Transfer count for step ${index+1}`)} type="number" min="1" max="200" value={step.advance.count} onchange={e=>{if(step.advance?.kind==='transfer')step.advance={...step.advance,count:bounded(e.currentTarget.value)};}} /></label>
  {/if}
 </div>
 <p>{effective.kind==='transfer'?$t("Espera que el origen baje y el destino suba respecto del reparto al entrar al paso. Si ya hiciste el traslado antes de la lectura inicial, usá AvPág.", "The source must decrease and the destination must increase from the initial reading. If you transferred villagers before that reading, press Page Down."):effective.kind==='resources'?$t("Solo exige los mínimos indicados. Permite aldeanos extra en cualquier recurso; los inactivos no cumplen un mínimo de recurso.", "Villagers on each selected resource must meet its minimum. Extra villagers are allowed. Idle villagers count only toward the total."):effective.kind==='total'?$t("Suma los cuatro recursos y los inactivos. No usa población ni exige un reparto.", "Adds villagers from all four resources and idle villagers."):$t("Las construcciones, subidas de edad e instrucciones ambiguas necesitan confirmación manual.", "Buildings, age-ups, and ambiguous instructions require manual confirmation.")} {$t("El OCR confirma tres lecturas antes de avanzar.", "OCR confirms three readings before advancing.")}</p>
</details>

<style>
 .advance-editor{grid-column:1/-1;margin:0 0 5px 36px;padding:6px 10px;border-left:2px solid var(--line);font-size:12px;color:var(--soft)}summary{cursor:pointer;line-height:1.6}summary span{color:var(--dim);margin-right:12px}strong{font-weight:500}.controls{display:flex;gap:12px;flex-wrap:wrap;margin:12px 0}label{display:flex;flex-direction:column;gap:6px}select,input[type=number]{border:1px solid var(--line-strong);border-radius:5px;background:var(--bg);color:var(--text);font:inherit;height:32px;padding:0 8px}input[type=number]{width:84px}.resources{display:flex;gap:12px;flex-wrap:wrap}.resource span{display:flex;align-items:center;gap:5px}input[type=checkbox]{accent-color:var(--accent)}p{max-width:800px;color:var(--dim);line-height:1.5;margin:8px 0}input:focus-visible,select:focus-visible,summary:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
</style>
