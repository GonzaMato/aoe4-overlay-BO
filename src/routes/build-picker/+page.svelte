<script lang="ts">
 import { onMount } from 'svelte';
 import { t, locale } from '#lib/i18n.ts';
 import { isTauri, loadData, onDataChanged, send, closeBuildPicker } from '#lib/bridge.ts';
 import BuildPicker from '#lib/components/BuildPicker.svelte';
 import type { AppData } from '#lib/types.ts';
 let data=$state<AppData|null>(null),busy=$state(false),error=$state(''),closed=$state(false);
 function apply(value:AppData){data=value;locale.set(value.settings.language);}
 async function close(){if(isTauri)await closeBuildPicker();else closed=true;}
 async function choose(id:string){
  if(busy||!data?.builds.some(b=>b.id===id))return;
  busy=true;error='';
  try{await send('picker-select-build',id);await close();}catch(e){error=String(e);busy=false;}
 }
 onMount(()=>{void loadData().then(apply).catch(e=>error=String(e));return onDataChanged(apply);});
</script>
<svelte:head><title>AoE4 Overlay — Build picker</title></svelte:head>
<main>
 {#if error}<p role="alert">{error}</p>{/if}
 {#if closed}<p>{$t('Selector cerrado.','Selector closed.')}</p><button onclick={()=>{busy=false;closed=false;}}>{$t('Volver a abrir','Open again')}</button>
 {:else if data}<BuildPicker builds={data.builds} activeId={data.settings.activeBuildId} onChoose={id=>void choose(id)} onClose={()=>void close()} {busy}/>{/if}
</main>
<style>:global(html),:global(body){height:100%;overflow:hidden}main{height:100vh;background:var(--bg)}p{padding:12px;color:var(--soft);margin:0}button{margin:12px;padding:10px;color:var(--text);background:var(--card);border:1px solid var(--line)}</style>
