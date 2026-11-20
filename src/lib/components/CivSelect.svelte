<script lang="ts">
 import { tick } from 'svelte';
 import CivFlag from './CivFlag.svelte';
 interface Option {value:string;text:string;civ?:string;}
 let {value=$bindable(''),options,label,placeholder='',onchange=()=>{}}:{value?:string;options:Option[];label:string;placeholder?:string;onchange?:(value:string)=>void}=$props();
 const id=$props.id();
 let root:HTMLDivElement,trigger:HTMLButtonElement;
 let open=$state(false), highlighted=$state(0),top=$state(0),left=$state(0),width=$state(0),maxHeight=$state(300);
 let search='',lastTyped=0;
 const selected=$derived(options.find(o=>o.value===value));
 async function reveal(){
  const r=trigger.getBoundingClientRect(),below=window.innerHeight-r.bottom-12,above=r.top-12;
  maxHeight=Math.max(80,Math.min(320,Math.max(below,above)));
  top=below>=Math.min(200,above)?r.bottom+5:Math.max(8,r.top-maxHeight-5);
  left=r.left;width=r.width;highlighted=Math.max(0,options.findIndex(o=>o.value===value));open=true;await scrollToOption();
 }
 async function scrollToOption(){await tick();document.getElementById(`${id}-${highlighted}`)?.scrollIntoView({block:'nearest'});}
 function choose(option:Option){value=option.value;open=false;onchange(option.value);trigger.focus();}
 async function keydown(event:KeyboardEvent){
  if(event.key==='Tab'){open=false;return;}
  if(event.key==='Escape'){open=false;event.preventDefault();return;}
  if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){
   event.preventDefault();if(!open){await reveal();return;}
   highlighted=event.key==='Home'?0:event.key==='End'?options.length-1:Math.max(0,Math.min(options.length-1,highlighted+(event.key==='ArrowDown'?1:-1)));void scrollToOption();
  }else if(event.key==='Enter'||event.key===' '){event.preventDefault();if(open&&options[highlighted])choose(options[highlighted]);else await reveal();}
  else if(event.key.length===1&&!event.ctrlKey&&!event.metaKey&&!event.altKey){
   event.preventDefault();if(!open)await reveal();const now=Date.now();search=now-lastTyped>700?event.key:search+event.key;lastTyped=now;
   const found=options.findIndex(o=>o.text.toLocaleLowerCase().startsWith(search.toLocaleLowerCase()));if(found>=0){highlighted=found;void scrollToOption();}
  }
 }
</script>

<svelte:window onpointerdown={e=>{if(open&&!root.contains(e.target as Node))open=false;}} onresize={()=>open=false} onscroll={()=>open=false}/>
<div class="civ-select" bind:this={root}>
 <button bind:this={trigger} class="trigger" type="button" role="combobox" aria-label={label} aria-expanded={open} aria-controls={`${id}-list`} aria-haspopup="listbox"
  aria-activedescendant={open&&options.length?`${id}-${highlighted}`:undefined} onclick={()=>open?open=false:void reveal()} onkeydown={keydown}>
  {#if selected?.civ}<CivFlag civ={selected.civ}/>{/if}<span>{selected?.text??placeholder}</span><span class="chevron" aria-hidden="true">⌄</span>
 </button>
 {#if open}
 <div id={`${id}-list`} class="options" role="listbox" aria-label={label} style:top="{top}px" style:left="{left}px" style:width="{width}px" style:max-height="{maxHeight}px">
  {#each options as option,i (option.value)}
   <button id={`${id}-${i}`} type="button" role="option" aria-selected={option.value===value} tabindex="-1" class:highlighted={i===highlighted} onclick={()=>choose(option)}>
    {#if option.civ}<CivFlag civ={option.civ}/>{/if}<span>{option.text}</span>{#if option.value===value}<span class="check" aria-hidden="true">✓</span>{/if}
   </button>
  {/each}
 </div>
 {/if}
</div>

<style>
 .civ-select{width:100%;min-width:0;}
 button{display:flex;align-items:center;gap:10px;text-align:left;cursor:pointer;font:inherit;color:var(--text);}
 .trigger{width:100%;min-height:36px;padding:8px 10px;border:1px solid var(--line-strong);border-radius:6px;background:var(--bg);}
 .trigger>span:first-of-type{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
 .chevron,.check{margin-left:auto;color:var(--accent);flex:none;}
 .options{position:fixed;z-index:1000;overflow-y:auto;overscroll-behavior:contain;padding:5px;border:1px solid var(--line-strong);border-radius:8px;background:var(--card);box-shadow:0 12px 32px #0008;box-sizing:border-box;}
 .options button{width:100%;padding:9px 8px;border:0;border-radius:4px;background:transparent;line-height:1.35;}
 .options button span{min-width:0;overflow-wrap:anywhere;}
 .options button:hover,.options button.highlighted{background:var(--bg);}
 .options button[aria-selected=true]{color:var(--accent);}
 button:focus-visible{outline:2px solid var(--accent);outline-offset:2px;}
</style>
