<script lang="ts">
 import { locale } from '$lib/i18n';
 import { advancementStatus, type AutomationContext } from '$lib/overlay-status';
 import type { ResolvedRule } from '$lib/advance';
 import { prettyHotkey } from '$lib/hotkeys';
 let {rule,context,nextKey='PageDown',compact=false}:{rule:ResolvedRule;context:AutomationContext;nextKey?:string;compact?:boolean}=$props();
 const status=$derived(advancementStatus(rule,context,prettyHotkey(nextKey,$locale),$locale));
</script>
<div class="advance-status" class:compact title={status.detail}>
 <span class="badge" class:automatic={status.kind==='auto'} class:paused={status.kind==='paused'}><span aria-hidden="true">{status.kind==='manual'?'›':status.kind==='paused'?'Ⅱ':'»'}</span> {status.label}</span>
 {#if !compact}<span class="detail">{status.detail}</span>{/if}
</div>
<style>
 .advance-status{display:flex;align-items:center;flex-wrap:wrap;gap:6px 9px;margin-top:12px;font-size:11px;line-height:16px}.badge{display:inline-flex;align-items:center;gap:4px;flex:none;border:1px solid var(--line-strong);border-radius:4px;padding:2px 7px;color:var(--soft);background:var(--bg);font-weight:600}.badge>span{font-size:14px}.automatic{border-color:var(--accent);color:var(--accent);background:color-mix(in srgb,var(--accent) 9%,var(--bg))}.paused{border-style:dashed}.detail{color:var(--soft)}.compact{margin:0;display:inline-flex}.compact .badge{font-size:10px;line-height:14px;padding:0 5px}
</style>
