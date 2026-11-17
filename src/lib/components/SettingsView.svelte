<script lang="ts">
	import HotkeyInput from './HotkeyInput.svelte';
	import ListEditor from './ListEditor.svelte';
	import { HOTKEY_ACTIONS, HOTKEY_LABEL, type Corner, type Settings } from '$lib/types';

	interface Props {
		settings: Settings;
		/** Acciones cuya tecla no se pudo registrar en el sistema. */
		failedHotkeys: string[];
	}
	let { settings = $bindable(), failedHotkeys }: Props = $props();

	const CORNERS: { value: Corner; label: string }[] = [
		{ value: 'top-left', label: 'Arriba izquierda' },
		{ value: 'top-right', label: 'Arriba derecha' },
		{ value: 'bottom-left', label: 'Abajo izquierda' },
		{ value: 'bottom-right', label: 'Abajo derecha' }
	];
	const ACCENTS = ['#F2B33D', '#5CC8F0', '#7BD88F', '#F08A5C'];

	const duplicated = $derived(
		HOTKEY_ACTIONS.filter(
			(a) => settings.hotkeys[a] && HOTKEY_ACTIONS.some((b) => b !== a && settings.hotkeys[b] === settings.hotkeys[a])
		)
	);
</script>

<div class="settings">
	<section>
		<h2>Teclas globales</h2>
		<p class="help">
			Funcionan con el juego en primer plano. Mientras la app esté abierta, Windows reserva estas
			combinaciones para el overlay, así que elegí teclas que no uses en el juego.
		</p>
		<div class="keys">
			{#each HOTKEY_ACTIONS as action (action)}
				<label for="hk-{action}">{HOTKEY_LABEL[action]}</label>
				<div class="key">
					<HotkeyInput id="hk-{action}" bind:value={settings.hotkeys[action]} />
					<button type="button" class="ghost" disabled={!settings.hotkeys[action]} onclick={() => (settings.hotkeys[action] = '')}>
						Quitar
					</button>
					{#if duplicated.includes(action)}
						<span class="warn">Repetida en otra acción</span>
					{:else if failedHotkeys.includes(action)}
						<span class="warn">No se pudo registrar: puede estar en uso por otro programa</span>
					{/if}
				</div>
			{/each}
		</div>
	</section>

	<section>
		<h2>Posición y tamaño</h2>
		<div class="grid">
			<fieldset>
				<legend class="label">Esquina</legend>
				<div class="corners">
					{#each CORNERS as corner (corner.value)}
						<label class="radio">
							<input type="radio" name="corner" value={corner.value} bind:group={settings.corner} />
							{corner.label}
						</label>
					{/each}
				</div>
			</fieldset>
			<div class="pair">
				<label class="field">
					<span class="label">Margen horizontal (px)</span>
					<input type="number" min="0" bind:value={settings.offsetX} />
				</label>
				<label class="field">
					<span class="label">Margen vertical (px)</span>
					<input type="number" min="0" bind:value={settings.offsetY} />
				</label>
			</div>
			<label class="field">
				<span class="label">Tamaño · {Math.round(settings.scale * 100)}%</span>
				<input type="range" min="0.7" max="1.8" step="0.05" bind:value={settings.scale} />
			</label>
			<label class="field">
				<span class="label">Opacidad · {Math.round(settings.opacity * 100)}%</span>
				<input type="range" min="0.4" max="1" step="0.02" bind:value={settings.opacity} />
			</label>
		</div>
	</section>

	<section>
		<h2>Apariencia</h2>
		<div class="grid">
			<fieldset>
				<legend class="label">Color de acento</legend>
				<div class="accents">
					{#each ACCENTS as color (color)}
						<button
							type="button"
							class="swatch"
							style="background: {color}"
							aria-label="Acento {color}"
							aria-pressed={settings.accent.toLowerCase() === color.toLowerCase()}
							onclick={() => (settings.accent = color)}
						></button>
					{/each}
					<input type="color" aria-label="Otro color de acento" bind:value={settings.accent} />
				</div>
			</fieldset>
			<div class="checks">
				<label class="radio"><input type="checkbox" bind:checked={settings.compact} /> Modo compacto (una sola línea)</label>
				<label class="radio"><input type="checkbox" bind:checked={settings.showClock} /> Mostrar reloj contra el objetivo</label>
			</div>
		</div>
	</section>

	<section>
		<h2>Listas</h2>
		<p class="help">Opciones que aparecen al cargar y filtrar builds. Sacar una opción no modifica los builds que ya la usan.</p>
		<div class="lists">
			<div>
				<span class="label">Modos</span>
				<ListEditor bind:items={settings.modes} label="Modo nuevo" placeholder="Por ejemplo: FFA" />
			</div>
			<div>
				<span class="label">Tipos de mapa</span>
				<ListEditor bind:items={settings.maps} label="Tipo de mapa nuevo" />
			</div>
			<div>
				<span class="label">Civilizaciones sugeridas</span>
				<ListEditor bind:items={settings.civs} label="Civilización nueva" />
			</div>
		</div>
	</section>
</div>

<style>
	.settings {
		display: flex;
		flex-direction: column;
		gap: 28px;
		max-width: 860px;
	}
	h2 {
		margin: 0 0 6px;
		font-size: 16px;
		font-weight: 600;
	}
	.help {
		margin: 0 0 14px;
		font-size: 13px;
		color: var(--dim);
	}
	.keys {
		display: grid;
		grid-template-columns: minmax(220px, 300px) 1fr;
		gap: 10px 16px;
		align-items: center;
	}
	.key {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
	}
	.warn {
		font-size: 12px;
		color: var(--late);
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 18px 24px;
	}
	.pair {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px;
	}
	.field {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	fieldset {
		margin: 0;
		padding: 0;
		border: 0;
	}
	legend {
		padding: 0;
		margin-bottom: 8px;
	}
	.corners,
	.checks {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8px;
	}
	.checks {
		grid-template-columns: 1fr;
		align-content: start;
	}
	.radio {
		display: flex;
		align-items: center;
		gap: 8px;
		min-height: 28px;
		cursor: pointer;
	}
	input[type='number'] {
		height: 32px;
		padding: 0 8px;
		border: 1px solid var(--line-strong);
		border-radius: 6px;
		background: var(--bg);
	}
	input[type='range'],
	input[type='radio'],
	input[type='checkbox'] {
		accent-color: var(--accent);
	}
	.accents {
		display: flex;
		align-items: center;
		gap: 10px;
	}
	.swatch {
		width: 32px;
		height: 32px;
		border: 2px solid transparent;
		border-radius: 50%;
		cursor: pointer;
	}
	.swatch[aria-pressed='true'] {
		border-color: var(--text);
	}
	input[type='color'] {
		width: 40px;
		height: 32px;
		padding: 2px;
		border: 1px solid var(--line-strong);
		border-radius: 6px;
		background: var(--bg);
	}
	.ghost {
		height: 32px;
		padding: 0 10px;
		border: 1px solid var(--line-strong);
		border-radius: 6px;
		background: transparent;
		cursor: pointer;
	}
	.ghost:disabled {
		color: var(--dim);
		cursor: default;
	}
	.lists {
		display: flex;
		flex-direction: column;
		gap: 18px;
	}
	.lists .label {
		display: block;
		margin-bottom: 8px;
	}
	:global(.settings :focus-visible) {
		outline: 2px solid var(--accent);
		outline-offset: 1px;
	}
</style>
