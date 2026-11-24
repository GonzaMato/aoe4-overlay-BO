<script lang="ts">
	import { overlayTheme, overlayThemeStyle } from '#lib/overlay-theme.ts';
 import CivFlag from './CivFlag.svelte';
	import { t, locale, label, resourceLabel } from '#lib/i18n.ts';
	import ResIcon from './ResIcon.svelte';
	import { prettyHotkey } from '#lib/hotkeys.ts';
	import { deltas } from '#lib/steps.ts';
	import { RESOURCES, type Build, type HotkeyAction } from '#lib/types.ts';
	import { formatTime } from '#lib/util.ts';
	import { activeTask, taskRule, isLastTask } from '#lib/subtasks.ts';
	import type { Reading } from '#lib/advance.ts';
	import type { AutomationContext } from '#lib/overlay-status.ts';
	import AdvanceStatus from './AdvanceStatus.svelte';

	interface Props {
		build: Build;
		stepIndex: number;
		subtaskIndex?: number;
		accent: string;
		civilizationColors?: boolean;
		reading?: Reading | null;
		trackingEnabled?: boolean;
		automation?: AutomationContext;
		/** Segundos de partida, o null si el reloj no está corriendo. */
		elapsed?: number | null;
		showClock?: boolean;
		hotkeys?: Record<HotkeyAction, string> | null;
	}
	let { build, stepIndex, subtaskIndex=0, accent, civilizationColors=false, reading=null, trackingEnabled=false, automation, elapsed = null, showClock = true, hotkeys = null }: Props = $props();

	const step = $derived(build.steps[stepIndex]);
	const task = $derived(step?activeTask(step,subtaskIndex):null);
	const nextTask = $derived(step?.subtasks?.[subtaskIndex+1]);
	const previous = $derived(stepIndex > 0 ? build.steps[stepIndex - 1] : null);
	const next = $derived(build.steps[stepIndex + 1] ?? null);
	const change = $derived(deltas(build, stepIndex));
	const clockOn = $derived(showClock && elapsed !== null);
	const late = $derived(clockOn && step?.time != null ? (elapsed as number) - step.time : null);

	const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);
	const context=$derived(automation??{enabled:trackingEnabled,confirmed:true,live:true,hasReading:!!reading,finalTask:isLastTask(build,{step:stepIndex,task:subtaskIndex})});
</script>

<div class="panel" class:civilization-theme={!!overlayTheme(build.civ, civilizationColors, accent).palette} style={overlayThemeStyle(build.civ, civilizationColors, accent)}>
	<header>
		<div class="title">
			<span class="label"><CivFlag civ={build.civ} size={22}/> {label(build.civ, $locale) || $t("Sin civilización", "No civilization")}{build.mode ? ` · ${label(build.mode, $locale)}` : ''}</span>
			<span class="name">{build.name}</span>
		</div>
		{#if step}
			<div class="counter">
				<span class="label">{$t("Paso", "Step")}</span>
				<span class="now">{stepIndex + 1}</span>
				<span class="total">/ {build.steps.length}</span>
			</div>
		{/if}
	</header>

	{#if !step}
		<p class="empty">{$t("Este build todavía no tiene pasos.", "This build has no steps yet.")}</p>
	{:else}
		<div class="progress" aria-hidden="true">
			{#each build.steps as s, i (s.id)}
				<span class:done={i < stepIndex} class:current={i === stepIndex}></span>
			{/each}
		</div>

		{#if previous}
			<div class="previous">
				<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
					<path d="M3 8.5 6.5 12 13 4.5" />
				</svg>
				<span>{previous.pop != null ? $t(`Pob ${previous.pop} · `, `Pop ${previous.pop} · `) : ''}{previous.action || $t("Paso anterior", "Previous step")}</span>
			</div>
		{/if}

		{#key step.id}
			<section class="card">
				<div class="head">
					<div class="pop">
						{#if step.pop != null}
							<span class="big">{step.pop}</span>
							<span class="label">{$t("pob", "pop")}</span>
						{:else}
							<span class="big">{stepIndex + 1}</span>
							<span class="label">{$t("paso", "step")}</span>
						{/if}
					</div>
					<div class="times">
						{#if step.time != null}
							<span class="label">{$t("Objetivo", "Target")}</span>
							<span class="target">{formatTime(step.time)}</span>
						{/if}
						{#if clockOn}
							<span class="clock" class:late={late !== null && late > 0}>
								{formatTime(elapsed)}
								{#if late !== null}
									· {late > 0 ? $t(`${formatTime(late)} atrasado`, `${formatTime(late)} late`) : $t(`faltan ${formatTime(-late)}`, `${formatTime(-late)} remaining`)}
								{/if}
							</span>
						{/if}
					</div>
				</div>

				{#if step.subtasks?.length}<div class="task-progress">{$t(`Tarea ${subtaskIndex+1} / ${step.subtasks.length}`, `Task ${subtaskIndex+1} / ${step.subtasks.length}`)}</div>{/if}
				<div class="action">{task?.action || $t("Sin acción cargada", "No action entered")}</div>
				{#if task?.note}
					<div class="note">{task.note}</div>
				{/if}
				<AdvanceStatus rule={taskRule(step,subtaskIndex,previous??undefined)} context={context} nextKey={hotkeys?.next??'PageDown'}/>

				<div class="villagers">
					{#each RESOURCES as r (r)}
						<div class="cell" class:changed={change[r] !== 0}>
							<div class="top">
								<ResIcon res={r} />
								{#if change[r] !== 0}
									<span class="chip">{signed(change[r])}</span>
								{/if}
							</div>
							<span class="count" class:zero={step.villagers[r] === 0}>{step.villagers[r]}</span>
							<span class="res">{resourceLabel(r, $locale)}</span>
							{#if trackingEnabled}<span class="detected">{$t('Leídos','Read')}: <b>{reading?.workers[r]??'—'}</b></span>{/if}
						</div>
					{/each}
				</div>
				{#if trackingEnabled}<div class="reading-total">{$t('Total leído','Total read')}: <b>{reading?.total??'—'}</b><span>{$t('Inactivos','Idle')}: <b>{reading?.idle??'—'}</b></span></div>{/if}
			</section>
		{/key}

		<div class="next">
			{#if nextTask}
				<span class="label">{$t(`Después · tarea ${subtaskIndex+2}`, `Next · task ${subtaskIndex+2}`)}</span><span class="text">{nextTask.action}</span>
			{:else if next}
				<span class="label">{$t('Siguiente', 'Next')}{next.pop != null ? $t(` · Pob ${next.pop}`, ` · Pop ${next.pop}`) : ''}</span>
				<span class="text">{next.action || $t("Sin acción cargada", "No action entered")}</span>
			{:else}
				<span class="label">{$t("Siguiente", "Next")}</span>
				<span class="text">{$t("Fin del build", "End of build")}</span>
			{/if}
		</div>

		{#if hotkeys}
			<footer>
				<span><kbd>{prettyHotkey(hotkeys.prev, $locale)}</kbd>{$t("anterior", "previous")}</span>
				<span><kbd>{prettyHotkey(hotkeys.next, $locale)}</kbd>{$t("siguiente", "next")}</span>
			</footer>
		{/if}
	{/if}
</div>

<style>
	.panel.civilization-theme { background: var(--civ-surface); border-color: var(--civ-border); }
	.task-progress{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--accent);margin-bottom:8px}
	.detected{font-size:10px;line-height:14px;color:var(--dim);margin-top:5px;padding-top:4px;border-top:1px solid var(--line);white-space:nowrap}.detected b{color:var(--soft);font-weight:500;font-variant-numeric:tabular-nums}.reading-total{display:flex;align-items:center;gap:5px;margin-top:9px;font-size:10px;color:var(--dim)}.reading-total>span{margin-left:auto}.reading-total b{font-weight:500;color:var(--soft);font-variant-numeric:tabular-nums}
	.panel.civilization-theme .card{border-left:3px solid var(--accent)}
	.panel {
		width: 380px;
		padding: 20px 20px 18px;
		display: flex;
		flex-direction: column;
		background: var(--bg);
		border: 1px solid var(--line);
		border-radius: 10px;
		color: var(--text);
		font-family: var(--font);
	}

	header {
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		gap: 12px;
	}
	.title {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}
	.title .label {
		line-height: 16px;
	}
	.name {
		font-size: 18px;
		line-height: 24px;
		font-weight: 600;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.counter {
		display: flex;
		align-items: baseline;
		gap: 6px;
		font-family: var(--font-num);
		white-space: nowrap;
	}
	.counter .now {
		font-size: 26px;
		line-height: 26px;
		font-weight: 600;
		color: var(--accent);
	}
	.counter .total {
		font-size: 16px;
		font-weight: 500;
		color: var(--dim);
	}

	.empty {
		margin: 16px 0 0;
		color: var(--soft);
	}

	.progress {
		display: flex;
		gap: 3px;
		margin-top: 12px;
		height: 6px;
	}
	.progress span {
		flex: 1;
		border-radius: 2px;
		background: #2f3540;
	}
	.progress .done {
		background: var(--accent);
		opacity: 0.45;
	}
	.progress .current {
		background: var(--accent);
	}

	.previous {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-top: 16px;
		font-size: 13px;
		line-height: 20px;
		color: var(--dim);
	}
	.previous span {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.previous svg {
		flex: none;
	}

	.card {
		display: flex;
		flex-direction: column;
		margin-top: 12px;
		padding: 16px;
		background: var(--card);
		border: 1px solid var(--line-strong);
		border-radius: 8px;
		animation: flash 0.7s ease-out;
	}
	@keyframes flash {
		from {
			border-color: var(--accent);
			box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 45%, transparent);
		}
		to {
			border-color: var(--line-strong);
			box-shadow: 0 0 0 0 transparent;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.card {
			animation: none;
		}
	}

	.head {
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		gap: 12px;
	}
	.pop {
		display: flex;
		align-items: baseline;
		gap: 8px;
	}
	.big {
		font-family: var(--font-num);
		font-size: 64px;
		line-height: 60px;
		font-weight: 600;
		color: var(--accent);
	}
	.pop .label {
		font-size: 13px;
	}
	.times {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		text-align: right;
	}
	.target {
		font-family: var(--font-num);
		font-size: 26px;
		line-height: 28px;
		font-weight: 500;
	}
	.clock {
		margin-top: 2px;
		font-size: 13px;
		line-height: 18px;
		color: var(--soft);
		font-variant-numeric: tabular-nums;
	}
	.clock.late {
		color: var(--late);
		font-weight: 600;
	}

	.action {
		margin-top: 10px;
		font-size: 20px;
		line-height: 28px;
		font-weight: 600;
	}
	.note {
		margin-top: 4px;
		font-size: 14px;
		line-height: 22px;
		color: var(--soft);
	}

	.villagers {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 8px;
		margin-top: 14px;
	}
	.cell {
		display: flex;
		flex-direction: column;
		padding: 8px;
		background: var(--bg);
		border: 1px solid var(--line);
		border-radius: 6px;
	}
	.cell.changed {
		border-color: var(--accent);
	}
	.top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: 16px;
	}
	.chip {
		padding: 0 6px;
		border-radius: 8px;
		background: var(--accent);
		font-size: 11px;
		line-height: 16px;
		font-weight: 600;
		color: var(--bg);
	}
	.count {
		margin-top: 6px;
		font-family: var(--font-num);
		font-size: 24px;
		line-height: 26px;
		font-weight: 600;
	}
	.count.zero {
		color: var(--dim);
	}
	.res {
		margin-top: 2px;
		font-size: 11px;
		line-height: 14px;
		color: var(--dim);
	}

	.next {
		display: flex;
		flex-direction: column;
		margin-top: 14px;
	}
	.next .text {
		margin-top: 4px;
		font-size: 14px;
		line-height: 20px;
		color: var(--soft);
	}

	footer {
		display: flex;
		align-items: center;
		gap: 14px;
		margin-top: 14px;
		font-size: 12px;
		line-height: 16px;
		color: var(--dim);
	}
	footer span {
		display: flex;
		align-items: center;
		gap: 6px;
	}
	kbd {
		padding: 0 5px;
		border: 1px solid #3a4250;
		border-radius: 3px;
		font-family: var(--font);
		font-size: 11px;
		line-height: 14px;
		color: var(--soft);
	}
</style>
