<script lang="ts">
 import { t } from '$lib/i18n';
 import { formatTime } from '$lib/util';
 let {name,elapsed,accent}:{name:string;elapsed:number|null;accent:string}=$props();
 const pieces=Array.from({length:16},(_,i)=>({x:8+(i*37)%84,delay:(i%5)*55,rotation:90+i*41,color:i%3===0?'#e8ebef':i%3===1?accent:'#80b9a2'}));
</script>

<section class="completion" role="status" aria-live="polite" style="--celebration-accent:{accent}">
 <div class="confetti" aria-hidden="true">{#each pieces as p,i}<i style="left:{p.x}%;--delay:{p.delay}ms;--turn:{p.rotation}deg;--drift:{i%2?22:-22}px;background:{p.color}"></i>{/each}</div>
 <div class="check" aria-hidden="true"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 4 4L19 6" /></svg></div>
 <div class="copy"><strong>{$t("¡Build completado!", "Build complete!")}</strong><p>{name}</p><small>{elapsed===null?$t("A seguir la partida", "Keep playing"):$t(`${formatTime(elapsed)} · A seguir la partida`, `${formatTime(elapsed)} · Keep playing`)}</small></div>
</section>

<style>
 .completion{position:relative;display:flex;align-items:center;gap:14px;width:320px;box-sizing:border-box;padding:22px 20px;overflow:hidden;border:1px solid color-mix(in srgb,var(--celebration-accent) 55%,#303742);border-radius:12px;background:rgba(17,21,27,.96);color:#e8ebef;pointer-events:none;animation:farewell 2200ms ease both}
 .check{display:grid;place-items:center;flex:none;width:40px;height:40px;border-radius:50%;background:color-mix(in srgb,var(--celebration-accent) 15%,transparent);color:var(--celebration-accent)}.copy{position:relative;min-width:0}strong{font-size:18px;font-weight:600}p{font-size:12px;color:#abb4bf;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin:5px 0 8px}small{font-size:11px;color:#82918d}.confetti{position:absolute;inset:0;overflow:hidden}.confetti i{position:absolute;top:-10px;width:4px;height:7px;border-radius:1px;opacity:0;animation:sprinkle 1500ms var(--delay) ease-out both}
 @keyframes sprinkle{0%{opacity:0;transform:translateY(0) rotate(0)}15%{opacity:.8}100%{opacity:0;transform:translate(var(--drift),120px) rotate(var(--turn))}}
 @keyframes farewell{0%{opacity:0;transform:translateY(4px)}12%,82%{opacity:1;transform:none}100%{opacity:0;transform:none}}
 @media(prefers-reduced-motion:reduce){.completion{animation:none}.confetti{display:none}}
</style>
