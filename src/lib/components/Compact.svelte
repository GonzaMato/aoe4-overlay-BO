<script lang="ts">
	import { t } from '$lib/i18n';
	import ResIcon from './ResIcon.svelte';
	import { deltas } from '$lib/steps';
	import { RESOURCES, type Build } from '$lib/types';
	import { formatTime } from '$lib/util';
	import { activeTask } from '$lib/subtasks';

	interface Props {
		build: Build;
		stepIndex: number;
		subtaskIndex?: number;
		accent: string;
		elapsed?: number | null;
		showClock?: boolean;
	}
	let { build, stepIndex, subtaskIndex=0, accent, elapsed = null, showClock = true }: Props = $props();

	const step = $derived(build.steps[stepIndex]);
	const task = $derived(step?activeTask(step,subtaskIndex):null);
	const change = $derived(deltas(build, stepIndex));
	const changed = $derived(RESOURCES.filter((r) => change[r] !== 0));
	const clockOn = $derived(showClock && elapsed !== null);
	const late = $derived(clockOn && step?.time != null ? (elapsed as number) - step.time : null);

	const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);
</script>

<div class="bar" style="--accent: {accent}">
	{#if !step}
		<span class="text">{$t("Este build todavía no tiene pasos.", "This build has no steps yet.")}</span>
	{:else}
		{#key step.id}
			<div class="pop">
				<span class="big">{step.pop ?? stepIndex + 1}</span>
				<span class="label">{step.pop != null ? $t("pob", "pop") : $t("paso", "step")}</span>
			</div>
		{/key}
		<span class="sep" aria-hidden="true"></span>
		<div class="main">
			<span class="action">{task?.action || $t("Sin acción cargada", "No action entered")}</span>
			<span class="meta">
				{$t(`Paso ${stepIndex + 1} / ${build.steps.length}`, `Step ${stepIndex + 1} / ${build.steps.length}`)}{step.subtasks?.length?$t(` · Tarea ${subtaskIndex+1}/${step.subtasks.length}`, ` · Task ${subtaskIndex+1}/${step.subtasks.length}`):''}{step.time != null
					? $t(` · objetivo ${formatTime(step.time)}`, ` · target ${formatTime(step.time)}`)
					: ''}
			</span>
		</div>
		{#if changed.length}
			<span class="sep" aria-hidden="true"></span>
			<div class="deltas">
				{#each changed as r (r)}
					<span class="delta"><ResIcon res={r} labelled /><span class="chip">{signed(change[r])}</span></span>
				{/each}
			</div>
		{/if}
		{#if clockOn}
			<span class="sep" aria-hidden="true"></span>
			<div class="clock" class:late={late !== null && late > 0}>
				<span class="time">{formatTime(elapsed)}</span>
				{#if late !== null}
					<span class="status">{late > 0 ? `+${formatTime(late)}` : `-${formatTime(-late)}`}</span>
				{/if}
			</div>
		{/if}
	{/if}
</div>

<style>
	.bar {
		display: inline-flex;
		align-items: center;
		gap: 16px;
		max-width: 680px;
		height: 64px;
		padding: 0 18px;
		background: var(--bg);
		border: 1px solid var(--line);
		border-radius: 10px;
		color: var(--text);
		font-family: var(--font);
		white-space: nowrap;
	}
	.sep {
		flex: none;
		width: 1px;
		height: 36px;
		background: var(--line);
	}
	.pop {
		display: flex;
		align-items: baseline;
		gap: 6px;
		animation: pulse 0.7s ease-out;
	}
	@keyframes pulse {
		from {
			transform: scale(1.25);
		}
		to {
			transform: scale(1);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.pop {
			animation: none;
		}
	}
	.big {
		font-family: var(--font-num);
		font-size: 40px;
		line-height: 40px;
		font-weight: 600;
		color: var(--accent);
	}
	.main {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}
	.action {
		font-size: 17px;
		line-height: 22px;
		font-weight: 600;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.meta {
		font-size: 12px;
		line-height: 16px;
		color: var(--dim);
	}
	.text {
		color: var(--soft);
	}
	.deltas {
		display: flex;
		align-items: center;
		gap: 10px;
	}
	.delta {
		display: flex;
		align-items: center;
		gap: 5px;
	}
	.chip {
		padding: 0 6px;
		border-radius: 8px;
		background: var(--accent);
		font-size: 12px;
		line-height: 18px;
		font-weight: 600;
		color: var(--bg);
	}
	.clock {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		font-family: var(--font-num);
		font-variant-numeric: tabular-nums;
	}
	.clock .time {
		font-size: 20px;
		line-height: 22px;
		font-weight: 500;
	}
	.clock .status {
		font-size: 13px;
		line-height: 16px;
		color: var(--dim);
	}
	.clock.late .status {
		color: var(--late);
		font-weight: 600;
	}
</style>
