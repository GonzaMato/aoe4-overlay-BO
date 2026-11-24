<script lang="ts">
 import CivFlag from './CivFlag.svelte';
 import { t, locale, label, resourceLabel, uniqueLabels } from '#lib/i18n.ts';
	import ResIcon from './ResIcon.svelte';
	import StepAdvanceEditor from './StepAdvanceEditor.svelte';
	import SubtaskEditor from './SubtaskEditor.svelte';
	import { newStep } from '#lib/defaults.ts';
	import { RESOURCES, type Build, type Settings } from '#lib/types.ts';
	import { formatTime, parseTime } from '#lib/util.ts';

	interface Props {
		build: Build;
		settings: Settings;
		civOptions: string[];
		isActive: boolean;
		isDefault: boolean;
		onUse: () => void;
		onToggleDefault: () => void;
		onClone: () => void;
		onCopy: () => void;
		onDelete: () => void;
		onShowStep: (index: number) => void;
	}
	let {
		build = $bindable(),
		settings,
		civOptions,
		isActive,
		isDefault,
		onUse,
		onToggleDefault,
		onClone,
		onCopy,
		onDelete,
		onShowStep
	}: Props = $props();

	let confirmingDelete = $state(false);

	// Opciones del build aunque ya no estén en las listas de Ajustes.
	const modeOptions = $derived(
		uniqueLabels([...settings.modes, ...build.mode?[build.mode]:[]],build.mode)
	);
	const mapOptions = $derived(
		uniqueLabels([...settings.maps, ...build.map?[build.map]:[]],build.map)
	);

	const total = (i: number) => RESOURCES.reduce((sum, r) => sum + build.steps[i].villagers[r], 0);

	function addStep() {
		build.steps.push(newStep(build.steps[build.steps.length - 1]));
	}

	function move(i: number, by: number) {
		const j = i + by;
		if (j < 0 || j >= build.steps.length) return;
		const [step] = build.steps.splice(i, 1);
		build.steps.splice(j, 0, step);
	}

	function setInt(value: string): number | null {
		const n = parseInt(value, 10);
		return Number.isFinite(n) ? n : null;
	}
</script>

<div class="editor">
	{#if build.provenance}
		<div class="provenance"><strong>{$t(`Autor: ${build.provenance.author}`, `Author: ${build.provenance.author}`)}</strong><span>{$t(`Revisión de instrucciones: ${build.provenance.reviewedAt} · No implica validación del parche actual.`, `Instructions reviewed ${build.provenance.reviewedAt}. Compatibility with the current patch may vary.`)}</span><span>{$t(`Fuente: ${build.provenance.source}`, `Source: ${build.provenance.source}`)}</span></div>
	{/if}
	<div class="meta">
		<label class="field wide">
			<span class="label">{$t("Nombre", "Name")}</span>
			<input bind:value={build.name} />
		</label>
		<label class="field">
			<span class="label"><CivFlag civ={build.civ} size={22}/> {$t("Civilización", "Civilization")}</span>
			<input bind:value={build.civ} list="civ-options" placeholder={$t("Escribí o elegí", "Type or choose")} />
			<datalist id="civ-options">
				{#each civOptions as civ (civ)}
					<option value={civ}>{label(civ, $locale)}</option>
				{/each}
			</datalist>
		</label>
		<label class="field">
			<span class="label">{$t("Modo", "Mode")}</span>
			<select bind:value={build.mode}>
				<option value="">{$t("Sin definir", "Unspecified")}</option>
				{#each modeOptions as mode (mode)}
					<option value={mode}>{label(mode, $locale)}</option>
				{/each}
			</select>
		</label>
		<label class="field">
			<span class="label">{$t("Mapa", "Map")}</span>
			<select bind:value={build.map}>
				<option value="">{$t("Cualquiera", "Any")}</option>
				{#each mapOptions as map (map)}
					<option value={map}>{label(map, $locale)}</option>
				{/each}
			</select>
		</label>
	</div>

	<div class="actions">
		<button type="button" class="primary" disabled={isActive} onclick={onUse}>
			{isActive ? $t("En uso en el overlay", "Active in overlay") : $t("Usar en el overlay", "Use in overlay")}
		</button>
		<button type="button" aria-pressed={isDefault} disabled={!build.civ || !build.mode} onclick={onToggleDefault}>
			{isDefault ? $t("Predeterminado", "Default build") : $t("Marcar predeterminado", "Set as default")}
			{#if build.civ && build.mode}<span class="hint">{label(build.civ, $locale)} · {label(build.mode, $locale)}</span>{/if}
		</button>
		<span class="spacer"></span>
		<button type="button" onclick={onClone}>{$t("Clonar", "Clone")}</button>
		<button type="button" onclick={onCopy}>{$t("Copiar JSON", "Copy JSON")}</button>
		{#if confirmingDelete}
			<button type="button" class="danger" onclick={onDelete}>{$t("Confirmar borrado", "Confirm deletion")}</button>
			<button type="button" onclick={() => (confirmingDelete = false)}>{$t("Cancelar", "Cancel")}</button>
		{:else}
			<button type="button" onclick={() => (confirmingDelete = true)}>{$t("Eliminar", "Delete")}</button>
		{/if}
	</div>

	<div class="steps" role="table" aria-label={$t("Pasos del build", "Build steps")}>
		<div class="row header" role="row">
			<span role="columnheader">#</span>
			<span role="columnheader">{$t("Pob", "Pop")}</span>
			<span role="columnheader">{$t("Tiempo", "Time")}</span>
			<span role="columnheader">{$t("Acción", "Action")}</span>
			<span role="columnheader">{$t("Nota", "Note")}</span>
			{#each RESOURCES as r (r)}
				<span role="columnheader" class="res" title={resourceLabel(r, $locale)}><ResIcon res={r} labelled /></span>
			{/each}
			<span role="columnheader" title={$t("Total de aldeanos", "Total villagers")}>Total</span>
			<span role="columnheader"></span>
		</div>

		{#each build.steps as step, i (step.id)}
			<div class="row" role="row">
				<button
					type="button"
					class="num"
					title={isActive ? $t("Mostrar este paso en el overlay", "Show this step in the overlay") : $t("Usá el build en el overlay para previsualizar", "Activate this build to preview the step")}
					disabled={!isActive}
					onclick={() => onShowStep(i)}
				>
					{i + 1}
				</button>
				<input
					type="number"
					min="0"
					aria-label={$t(`Población del paso ${i + 1}`, `Population for step ${i + 1}`)}
					value={step.pop ?? ''}
					onchange={(e) => (step.pop = setInt(e.currentTarget.value))}
				/>
				<input
					aria-label={$t(`Tiempo objetivo del paso ${i + 1}`, `Target time for step ${i + 1}`)}
					placeholder="m:ss"
					value={formatTime(step.time)}
					onchange={(e) => {
						step.time = parseTime(e.currentTarget.value);
						e.currentTarget.value = formatTime(step.time);
					}}
				/>
				<input aria-label={$t(`Acción del paso ${i + 1}`, `Action for step ${i + 1}`)} placeholder={$t("Qué hacer", "What to do")} bind:value={step.action} />
				<input aria-label={$t(`Nota del paso ${i + 1}`, `Note for step ${i + 1}`)} placeholder={$t("Detalle opcional", "Optional detail")} bind:value={step.note} />
				{#each RESOURCES as r (r)}
					<input
						type="number"
						min="0"
						class="vill"
						aria-label={$t(`${resourceLabel(r, $locale)} en el paso ${i + 1}`, `${resourceLabel(r, $locale)} for step ${i + 1}`)}
						value={step.villagers[r]}
						onchange={(e) => (step.villagers[r] = Math.max(0, setInt(e.currentTarget.value) ?? 0))}
					/>
				{/each}
				<span class="total">{total(i)}</span>
				<span class="tools">
					<button type="button" aria-label={$t(`Subir paso ${i + 1}`, `Move step ${i + 1} up`)} disabled={i === 0} onclick={() => move(i, -1)}>
						<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 7.5 6 4l3.5 3.5" /></svg>
					</button>
					<button type="button" aria-label={$t(`Bajar paso ${i + 1}`, `Move step ${i + 1} down`)} disabled={i === build.steps.length - 1} onclick={() => move(i, 1)}>
						<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 4.5 6 8l3.5-3.5" /></svg>
					</button>
					<button type="button" aria-label={$t(`Eliminar paso ${i + 1}`, `Delete step ${i + 1}`)} onclick={() => build.steps.splice(i, 1)}>
						<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M3 3l6 6M9 3l-6 6" /></svg>
					</button>
				</span>
				{#if !step.subtasks?.length}<StepAdvanceEditor bind:step={build.steps[i]} previous={build.steps[i-1]} index={i} />{/if}
				<SubtaskEditor bind:step={build.steps[i]} previous={build.steps[i-1]} index={i} />
			</div>
		{/each}
	</div>

	<div class="below">
		<button type="button" onclick={addStep}>{$t("Agregar paso", "Add step")}</button>
		<span class="help">
			{$t('Los aldeanos son el reparto al que hay que llegar en ese paso. El overlay resalta solo lo que cambia. El paso nuevo copia el reparto del anterior.', 'Each row shows the target villager allocation. The overlay highlights changes, and new steps copy the previous allocation.')}
		</span>
	</div>
</div>

<style>
	.provenance { display:flex;flex-direction:column;gap:4px;padding:12px 16px;border-left:3px solid var(--accent);background:var(--card);color:var(--dim);font-size:12px;overflow-wrap:anywhere; }
	.provenance strong { color:var(--soft); }
	.editor {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
	.meta {
		display: grid;
		grid-template-columns: 2fr 1.4fr 1fr 1fr;
		gap: 12px;
	}
	.field {
		display: flex;
		flex-direction: column;
		gap: 6px;
		min-width: 0;
	}
	input,
	select {
		width: 100%;
		height: 32px;
		padding: 0 8px;
		border: 1px solid var(--line-strong);
		border-radius: 6px;
		background: var(--bg);
	}
	input:focus-visible,
	select:focus-visible,
	button:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 1px;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px;
	}
	.spacer {
		flex: 1;
	}
	button {
		height: 32px;
		padding: 0 12px;
		border: 1px solid var(--line-strong);
		border-radius: 6px;
		background: var(--card);
		cursor: pointer;
		white-space: nowrap;
	}
	button:hover:not(:disabled) {
		border-color: var(--dim);
	}
	button:disabled {
		cursor: default;
		color: var(--dim);
	}
	button.primary:not(:disabled) {
		border-color: var(--accent);
		background: var(--accent);
		color: var(--bg);
		font-weight: 600;
	}
	button[aria-pressed='true'] {
		border-color: var(--accent);
		color: var(--accent);
	}
	button.danger {
		border-color: var(--late);
		color: var(--late);
	}
	.hint {
		margin-left: 6px;
		font-size: 12px;
		color: var(--dim);
	}

	.steps {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.row {
		display: grid;
		grid-template-columns: 30px 60px 68px minmax(150px, 1.2fr) minmax(110px, 1fr) repeat(4, 52px) 40px 92px;
		gap: 6px;
		align-items: center;
	}
	.row.header {
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--dim);
	}
	.row.header .res {
		display: grid;
		place-items: center;
	}
	.num {
		height: 32px;
		padding: 0;
		font-family: var(--font-num);
		font-size: 15px;
		font-weight: 600;
	}
	.vill {
		padding: 0 4px 0 8px;
	}
	.total {
		text-align: center;
		font-family: var(--font-num);
		font-size: 15px;
		color: var(--dim);
	}
	.tools {
		display: flex;
		gap: 4px;
	}
	.tools button {
		display: grid;
		place-items: center;
		width: 28px;
		height: 28px;
		padding: 0;
	}

	.below {
		display: flex;
		align-items: center;
		gap: 14px;
	}
	.help {
		font-size: 12px;
		color: var(--dim);
	}
</style>
