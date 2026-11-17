<script lang="ts">
	import ResIcon from './ResIcon.svelte';
	import StepAdvanceEditor from './StepAdvanceEditor.svelte';
	import SubtaskEditor from './SubtaskEditor.svelte';
	import { newStep } from '$lib/defaults';
	import { RESOURCES, RES_LABEL, type Build, type Settings } from '$lib/types';
	import { formatTime, parseTime } from '$lib/util';

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
		build.mode && !settings.modes.includes(build.mode) ? [...settings.modes, build.mode] : settings.modes
	);
	const mapOptions = $derived(
		build.map && !settings.maps.includes(build.map) ? [...settings.maps, build.map] : settings.maps
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
		<div class="provenance"><strong>Autor: {build.provenance.author}</strong><span>Revisión de instrucciones: {build.provenance.reviewedAt} · No implica validación del parche actual.</span><span>Fuente: {build.provenance.source}</span></div>
	{/if}
	<div class="meta">
		<label class="field wide">
			<span class="label">Nombre</span>
			<input bind:value={build.name} />
		</label>
		<label class="field">
			<span class="label">Civilización</span>
			<input bind:value={build.civ} list="civ-options" placeholder="Escribí o elegí" />
			<datalist id="civ-options">
				{#each civOptions as civ (civ)}
					<option value={civ}></option>
				{/each}
			</datalist>
		</label>
		<label class="field">
			<span class="label">Modo</span>
			<select bind:value={build.mode}>
				<option value="">Sin definir</option>
				{#each modeOptions as mode (mode)}
					<option value={mode}>{mode}</option>
				{/each}
			</select>
		</label>
		<label class="field">
			<span class="label">Mapa</span>
			<select bind:value={build.map}>
				<option value="">Cualquiera</option>
				{#each mapOptions as map (map)}
					<option value={map}>{map}</option>
				{/each}
			</select>
		</label>
	</div>

	<div class="actions">
		<button type="button" class="primary" disabled={isActive} onclick={onUse}>
			{isActive ? 'En uso en el overlay' : 'Usar en el overlay'}
		</button>
		<button type="button" aria-pressed={isDefault} disabled={!build.civ || !build.mode} onclick={onToggleDefault}>
			{isDefault ? 'Predeterminado' : 'Marcar predeterminado'}
			{#if build.civ && build.mode}<span class="hint">{build.civ} · {build.mode}</span>{/if}
		</button>
		<span class="spacer"></span>
		<button type="button" onclick={onClone}>Clonar</button>
		<button type="button" onclick={onCopy}>Copiar JSON</button>
		{#if confirmingDelete}
			<button type="button" class="danger" onclick={onDelete}>Confirmar borrado</button>
			<button type="button" onclick={() => (confirmingDelete = false)}>Cancelar</button>
		{:else}
			<button type="button" onclick={() => (confirmingDelete = true)}>Eliminar</button>
		{/if}
	</div>

	<div class="steps" role="table" aria-label="Pasos del build">
		<div class="row header" role="row">
			<span role="columnheader">#</span>
			<span role="columnheader">Pob</span>
			<span role="columnheader">Tiempo</span>
			<span role="columnheader">Acción</span>
			<span role="columnheader">Nota</span>
			{#each RESOURCES as r (r)}
				<span role="columnheader" class="res" title={RES_LABEL[r]}><ResIcon res={r} labelled /></span>
			{/each}
			<span role="columnheader" title="Total de aldeanos">Total</span>
			<span role="columnheader"></span>
		</div>

		{#each build.steps as step, i (step.id)}
			<div class="row" role="row">
				<button
					type="button"
					class="num"
					title={isActive ? 'Mostrar este paso en el overlay' : 'Usá el build en el overlay para previsualizar'}
					disabled={!isActive}
					onclick={() => onShowStep(i)}
				>
					{i + 1}
				</button>
				<input
					type="number"
					min="0"
					aria-label="Población del paso {i + 1}"
					value={step.pop ?? ''}
					onchange={(e) => (step.pop = setInt(e.currentTarget.value))}
				/>
				<input
					aria-label="Tiempo objetivo del paso {i + 1}"
					placeholder="m:ss"
					value={formatTime(step.time)}
					onchange={(e) => {
						step.time = parseTime(e.currentTarget.value);
						e.currentTarget.value = formatTime(step.time);
					}}
				/>
				<input aria-label="Acción del paso {i + 1}" placeholder="Qué hacer" bind:value={step.action} />
				<input aria-label="Nota del paso {i + 1}" placeholder="Detalle opcional" bind:value={step.note} />
				{#each RESOURCES as r (r)}
					<input
						type="number"
						min="0"
						class="vill"
						aria-label="{RES_LABEL[r]} en el paso {i + 1}"
						value={step.villagers[r]}
						onchange={(e) => (step.villagers[r] = Math.max(0, setInt(e.currentTarget.value) ?? 0))}
					/>
				{/each}
				<span class="total">{total(i)}</span>
				<span class="tools">
					<button type="button" aria-label="Subir paso {i + 1}" disabled={i === 0} onclick={() => move(i, -1)}>
						<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 7.5 6 4l3.5 3.5" /></svg>
					</button>
					<button type="button" aria-label="Bajar paso {i + 1}" disabled={i === build.steps.length - 1} onclick={() => move(i, 1)}>
						<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 4.5 6 8l3.5-3.5" /></svg>
					</button>
					<button type="button" aria-label="Eliminar paso {i + 1}" onclick={() => build.steps.splice(i, 1)}>
						<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M3 3l6 6M9 3l-6 6" /></svg>
					</button>
				</span>
				{#if !step.subtasks?.length}<StepAdvanceEditor bind:step={build.steps[i]} previous={build.steps[i-1]} index={i} />{/if}
				<SubtaskEditor bind:step={build.steps[i]} previous={build.steps[i-1]} index={i} />
			</div>
		{/each}
	</div>

	<div class="below">
		<button type="button" onclick={addStep}>Agregar paso</button>
		<span class="help">
			Los aldeanos son el reparto al que hay que llegar en ese paso; el overlay resalta solo lo que cambia.
			El paso nuevo copia el reparto del anterior.
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
