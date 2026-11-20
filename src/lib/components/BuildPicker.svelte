<script lang="ts">
 import { tick, onMount } from 'svelte';
 import { t, locale, label } from '$lib/i18n';
 import { pickerCivilizations, pickerBuilds } from '$lib/build-picker';
 import type { Build } from '$lib/types';
 import CivFlag from './CivFlag.svelte';
 let { builds, activeId, onChoose, onClose, busy=false }: {builds:Build[];activeId:string|null;onChoose:(id:string)=>void;onClose:()=>void;busy?:boolean}=$props();
 let selected=$state<string|null>(null), previous=$state('');
 let list=$state<HTMLDivElement>();
 const civilizations=$derived(pickerCivilizations(builds,$locale));
 const civilization=$derived(civilizations.find(c=>c.key===selected));
 const options=$derived(selected===null?[]:pickerBuilds(builds,selected,$locale));
 async function focusOption(index=0){await tick();list?.querySelectorAll<HTMLButtonElement>('.option')[index]?.focus();}
 async function chooseCiv(key:string){selected=key;previous=key;await focusOption();}
 async function back(){selected=null;await focusOption(Math.max(0,civilizations.findIndex(c=>c.key===previous)));}
 function keydown(event:KeyboardEvent){
  if(busy)return;
  if(event.key==='Escape'){event.preventDefault();if(selected!==null)void back();else onClose();return;}
  if(event.key==='Backspace'&&selected!==null){event.preventDefault();void back();return;}
  const buttons=[...(list?.querySelectorAll<HTMLButtonElement>('.option')??[])];
  const index=buttons.indexOf(event.target as HTMLButtonElement);
  if(index<0)return;
  const delta=event.key==='ArrowDown'?(selected===null?2:1):event.key==='ArrowUp'?(selected===null?-2:-1):event.key==='ArrowRight'?1:event.key==='ArrowLeft'?-1:0;
  if(delta||event.key==='Home'||event.key==='End'){
   event.preventDefault();buttons[event.key==='Home'?0:event.key==='End'?buttons.length-1:Math.max(0,Math.min(buttons.length-1,index+delta))]?.focus();
  }
 }
 onMount(()=>{void focusOption();});
</script>

<svelte:window onkeydown={keydown}/>
<div class="picker">
 <header>
  <div><span class="eyebrow">{$t('Elegir build','Choose a build')}</span><h1>{selected===null?$t('Elegí tu civilización','Choose your civilization'):label(civilization?.civ??'',$locale)||$t('Sin civilización','No civilization')}</h1></div>
  <button class="close" onclick={onClose} disabled={busy} aria-label={$t('Cerrar selector','Close selector')}>×</button>
 </header>
 <div class="navigation">
  {#if selected!==null}<button class="back" onclick={()=>void back()} disabled={busy}>← {$t('Atrás · Civilizaciones','Back · Civilizations')}</button>
  {:else}<span>{$t('1. Civilización','1. Civilization')} <span class="muted">› {$t('2. Build order','2. Build order')}</span></span>{/if}
 </div>
 <div class="choices" class:civilizations={selected===null} bind:this={list}>
  {#if selected===null}
   {#each civilizations as civ (civ.key)}
    <button class="option civilization" onclick={()=>void chooseCiv(civ.key)} disabled={busy}>
     <CivFlag civ={civ.civ} size={42}/><span><strong>{label(civ.civ,$locale)||$t('Sin civilización','No civilization')}</strong><small>{civ.count} {civ.count===1?'build':'builds'}</small></span><span class="arrow" aria-hidden="true">›</span>
    </button>
   {:else}<p class="empty">{$t('No hay builds cargados. Agregalos desde la biblioteca.','No builds loaded. Add some from the library.')}</p>{/each}
  {:else}
   {#each options as build (build.id)}
    <button class="option build" class:active={activeId===build.id} onclick={()=>onChoose(build.id)} disabled={busy}>
     <span><strong>{build.name}</strong><small>{[label(build.mode,$locale),label(build.map,$locale),$t(`${build.steps.length} pasos`,`${build.steps.length} steps`)].filter(Boolean).join(' · ')}</small></span>
     {#if activeId===build.id}<span class="badge">{$t('Actual','Current')}</span>{:else}<span class="arrow" aria-hidden="true">›</span>{/if}
    </button>
   {:else}<p class="empty">{$t('Ya no hay builds de esta civilización. Volvé atrás para elegir otra.','No builds remain for this civilization. Go back to choose another.')}</p>{/each}
  {/if}
 </div>
 <footer>{$t('Flechas: navegar · Enter: elegir','Arrows: navigate · Enter: choose')}<span>{selected===null?$t('Esc: cerrar','Esc: close'):$t('Esc: volver atrás','Esc: go back')}</span></footer>
</div>

<style>
 .picker{display:flex;flex-direction:column;height:100%;min-height:0;background:var(--bg);color:var(--text);border:1px solid var(--line-strong);border-radius:12px;padding:22px;overflow:hidden}
 header{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}h1{font:600 28px/1.1 var(--font-num);margin:5px 0 0}.eyebrow{font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:var(--accent)}
 button{font:inherit;color:inherit;cursor:pointer}button:disabled{opacity:.5;cursor:default}button:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
 .close{border:1px solid var(--line);border-radius:6px;background:var(--card);width:32px;height:32px;flex:none;font-size:23px;line-height:1}.navigation{min-height:52px;display:flex;align-items:center;font-size:12px;color:var(--soft)}.muted{color:var(--dim);margin-left:8px}.back{border:0;background:transparent;color:var(--accent);padding:8px 0}
 .choices{overflow-y:auto;min-height:0;flex:1;display:flex;flex-direction:column;gap:8px;padding:4px}.choices.civilizations{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));align-content:start}
 .option{display:flex;align-items:center;gap:12px;flex:none;width:100%;padding:13px 12px;text-align:left;background:var(--card);border:1px solid var(--line);border-radius:7px;min-height:72px}.option:hover{border-color:var(--accent);background:#252c36}.option.active{border-color:var(--accent)}.option>span:not(.arrow):not(.badge){min-width:0;flex:1}.option strong{font-size:14px;font-weight:600;display:block;overflow-wrap:anywhere}.option small{display:block;color:var(--dim);font-size:11px;margin-top:4px}.arrow{color:var(--dim);margin-left:auto}.badge{font-size:11px;color:var(--accent);flex:none}.empty{color:var(--dim);grid-column:1/-1}
 footer{border-top:1px solid var(--line);padding-top:14px;margin-top:16px;color:var(--dim);font-size:11px;display:flex;justify-content:space-between;gap:12px}
</style>
