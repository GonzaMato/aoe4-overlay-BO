<script lang="ts">
 import { civilizationFlag } from '$lib/civilizations';
 import { locale, label } from '$lib/i18n';
 let { civ, size=28, decorative=true }: {civ:string;size?:number;decorative?:boolean}=$props();
</script>

<img class="civ-flag" src={civilizationFlag(civ)} alt={decorative?'':label(civ,$locale)} title={label(civ,$locale)||undefined}
 width={size} height={Math.round(size*2/3)} draggable="false" />

<style>
 .civ-flag { display:inline-block; flex:none; object-fit:cover; border-radius:3px; box-shadow:0 0 0 1px #ffffff24; vertical-align:middle; }
</style>
