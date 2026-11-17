<script lang="ts">
	import { onMount } from 'svelte';

	import BuildEditor from '$lib/components/BuildEditor.svelte';
	import SettingsView from '$lib/components/SettingsView.svelte';
	import BackupView from '$lib/components/BackupView.svelte';
	import PracticeView, { type PracticeStatus } from '$lib/components/PracticeView.svelte';
	import { importBuilds } from '$lib/imports';
	import { isTauri, keepAlive, loadData, on, onDataChanged, onQuitRequested, onRegionSelected, quitApp, saveData, send } from '$lib/bridge';
	import { cloneBuild, newBuild } from '$lib/defaults';
	import type { AppData, Build, Practice } from '$lib/types';
	import { defaultKey } from '$lib/util';

	let data = $state<AppData | null>(null);
	let tab = $state<'builds' | 'settings' | 'practice'>('builds');
	let practiceStatus = $state<PracticeStatus | null>(null);
	let finishedId = $state<string | null>(null);
	let selectedId = $state<string | null>(null);
	let filterCiv = $state('');
	let filterMode = $state('');
	let filterMap = $state('');
	let failedHotkeys = $state<string[]>([]);
	let importing = $state(false);
	let importText = $state('');
	let importError = $state('');
	let toast = $state('');
	let restoring = $state(false);
	let quitting = $state(false);

	let lastSaved = '';
	let saveTimer: ReturnType<typeof setTimeout> | null = null;
	let toastTimer: ReturnType<typeof setTimeout> | null = null;

	const civOptions = $derived.by(() => {
		if (!data) return [];
		const extra = data.builds.map((b) => b.civ).filter((c) => c && !data!.settings.civs.includes(c));
		return [...data.settings.civs, ...new Set(extra)];
	});
	const civsInUse = $derived(data ? [...new Set(data.builds.map((b) => b.civ).filter(Boolean))].sort() : []);
	const filtered = $derived(
		data
			? data.builds.filter(
					(b) =>
						(!filterCiv || b.civ === filterCiv) &&
						(!filterMode || b.mode === filterMode) &&
						(!filterMap || !b.map || b.map === filterMap)
				)
			: []
	);
	const selectedIndex = $derived(data ? data.builds.findIndex((b) => b.id === selectedId) : -1);

	const isDefault = (b: Build) => !!data && data.settings.defaults[defaultKey(b.civ, b.mode)] === b.id;

	function notify(message: string) {
		toast = message;
		if (toastTimer) clearTimeout(toastTimer);
		toastTimer = setTimeout(() => (toast = ''), 2500);
	}

	function use(id: string) {
		if (data) data.settings.activeBuildId = id;
	}

	function toggleDefault(b: Build) {
		if (!data || !b.civ || !b.mode) return;
		const key = defaultKey(b.civ, b.mode);
		if (data.settings.defaults[key] === b.id) delete data.settings.defaults[key];
		else data.settings.defaults[key] = b.id;
	}

	/** Al elegir civilización y modo se carga solo el predeterminado de esa combinación. */
	function onMatchChange() {
		if (!data || !filterCiv || !filterMode) return;
		const candidates = data.builds.filter((b) => b.civ === filterCiv && b.mode === filterMode);
		const preferred =
			candidates.find((b) => b.id === data!.settings.defaults[defaultKey(filterCiv, filterMode)]) ??
			(candidates.length === 1 ? candidates[0] : null);
		if (preferred) {
			use(preferred.id);
			selectedId = preferred.id;
			notify(`En el overlay: ${preferred.name}`);
		}
	}

	function addBuild() {
		if (!data) return;
		const build = newBuild(filterCiv, filterMode || data.settings.modes[0] || '', filterMap);
		data.builds.push(build);
		selectedId = build.id;
	}

	function clone(b: Build) {
		if (!data) return;
		const copy = cloneBuild($state.snapshot(b) as Build);
		data.builds.push(copy);
		selectedId = copy.id;
	}

	function remove(b: Build) {
		if (!data) return;
		data.builds = data.builds.filter((x) => x.id !== b.id);
		for (const [key, id] of Object.entries(data.settings.defaults)) {
			if (id === b.id) delete data.settings.defaults[key];
		}
		if (data.settings.activeBuildId === b.id) data.settings.activeBuildId = data.builds[0]?.id ?? null;
		selectedId = data.builds[0]?.id ?? null;
	}

	async function copyJson(b: Build) {
		try {
			await navigator.clipboard.writeText(JSON.stringify($state.snapshot(b), null, 2));
			notify('Build copiado al portapapeles');
		} catch {
			notify('No se pudo copiar al portapapeles');
		}
	}

	function runImport() {
		if (!data) return;
		try {
			const builds = importBuilds(importText);
			data.builds.push(...builds);
			selectedId = builds[0].id;
			filterCiv = ''; filterMode = ''; filterMap = '';
			importing = false;
			importText = '';
			importError = '';
			notify(builds.length === 1 ? 'Build importado' : `${builds.length} builds importados`);
		} catch (e) {
			importError = e instanceof Error ? e.message : 'JSON inválido.';
		}
	}

	async function restore(incoming: AppData) {
		restoring = true;
		if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
		try {
			await send('restore-session');
			await saveData(incoming);
			lastSaved = JSON.stringify(incoming); data = incoming;
			selectedId = incoming.settings.activeBuildId; filterCiv = ''; filterMode = ''; filterMap = '';
			notify('Respaldo restaurado');
		} catch (e) { notify(`No se pudo restaurar: ${String(e)}`); }
		finally { restoring = false; }
	}

	async function exitApp() {
		if (!data || restoring || quitting) return;
		quitting = true;
		if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
		try { await saveData($state.snapshot(data) as AppData); await quitApp(); }
		catch (e) { quitting = false; notify(`No se pudo guardar antes de salir: ${String(e)}`); }
	}

	onMount(() => {
		void loadData().then((loaded) => {
			lastSaved = JSON.stringify(loaded);
			data = loaded;
			selectedId = loaded.settings.activeBuildId ?? loaded.builds[0]?.id ?? null;
		});

		const stops = [
			keepAlive(),
			onQuitRequested(() => void exitApp()),
			onRegionSelected(({ region, target }) => {
				if (!data) return;
				data.settings.ocr = target === 'idle'
					? { ...data.settings.ocr, idleRegion: region }
					: { ...data.settings.ocr, ...region, source: 'workers' };
				notify('Región OCR guardada');
			}),
			on('overlay-settings', value => {
				if (!data || restoring) return;
				const patch = value as Partial<Pick<AppData['settings'], 'compact' | 'activeBuildId' | 'position'>>;
				if (typeof patch.compact === 'boolean') data.settings.compact = patch.compact;
				if (patch.activeBuildId !== undefined && data.builds.some(b => b.id === patch.activeBuildId)) data.settings.activeBuildId = patch.activeBuildId;
				if ('position' in patch) data.settings.position = patch.position ?? null;
			}),
			on('practice-update', value => {
				if (!data || restoring) return;
				const practice = value as Practice;
				const at = data.practices.findIndex(p => p.id === practice.id);
				if (at < 0) data.practices.push(practice); else data.practices[at] = practice;
			}),
			on('practice-status', value => practiceStatus = value as PracticeStatus),
			on('practice-finished', value => { finishedId = String(value); tab = 'practice'; notify('Práctica guardada: revisá los atrasos'); }),
			// Sync another manager tab in browser preview; native writes have one owner.
			onDataChanged((incoming) => {
				if (!data || !saveTimer) {
					lastSaved = JSON.stringify(incoming);
					data = incoming;
					if (!incoming.builds.some((b) => b.id === selectedId)) {
						selectedId = incoming.settings.activeBuildId;
					}
				} else {
					// Hay cambios sin guardar acá: solo se toma lo que el overlay puede cambiar.
					data.settings.compact = incoming.settings.compact;
					data.settings.activeBuildId = incoming.settings.activeBuildId;
				}
			}),
			on('hotkey-status', (failed) => (failedHotkeys = Array.isArray(failed) ? (failed as string[]) : []))
		];
		void send('hotkey-status-request');
		void send('practice-status-request');

		return () => stops.forEach((stop) => stop());
	});

	// Guardado automático con una pequeña espera para no escribir en cada tecla.
	$effect(() => {
		if (!data || restoring) return;
		const snapshot = JSON.stringify(data);
		if (snapshot === lastSaved) return;
		if (saveTimer) clearTimeout(saveTimer);
		saveTimer = setTimeout(() => {
			saveTimer = null;
			void saveData(JSON.parse(snapshot) as AppData).then(() => lastSaved = snapshot).catch(e => notify(`Error al guardar: ${String(e)}`));
		}, 250);
	});
</script>

<svelte:head>
	<title>AoE4 Overlay — Builds</title>
</svelte:head>

<div class="app" style="--accent: {data?.settings.accent ?? '#F2B33D'}">
	<header class="bar">
		<h1>AoE4 Overlay</h1>
		<nav aria-label="Secciones">
			<button type="button" aria-current={tab === 'builds' ? 'page' : undefined} onclick={() => (tab = 'builds')}>Builds</button>
			<button type="button" aria-current={tab === 'practice' ? 'page' : undefined} onclick={() => tab = 'practice'}>Práctica</button>
			<button type="button" aria-current={tab === 'settings' ? 'page' : undefined} onclick={() => (tab = 'settings')}>
				Ajustes{failedHotkeys.length ? ' · revisar teclas' : ''}
			</button>
		</nav>
		{#if isTauri}
			<button type="button" class="exit" disabled={!data || restoring || quitting} onclick={() => void exitApp()}>{quitting ? 'Guardando y cerrando…' : 'Salir de la app'}</button>
		{/if}
		{#if !isTauri}
			<span class="dev">Vista de navegador: los datos se guardan en este navegador. Abrí <a href="/overlay" target="_blank" rel="noreferrer">/overlay</a> en otra pestaña para ver el panel.</span>
		{/if}
	</header>

	{#if !data}
		<p class="loading">Cargando…</p>
	{:else if tab === 'settings'}
		<main class="scroll pad full">
			<SettingsView bind:settings={data.settings} {failedHotkeys} activeBuild={data.builds.find(b => b.id === data!.settings.activeBuildId) ?? null}>
				{#snippet backup()}{#if data}<BackupView {data} onRestore={incoming => void restore(incoming)} />{/if}{/snippet}
			</SettingsView>
		</main>
	{:else if tab === 'practice'}
		<main class="scroll pad full"><PracticeView practices={data.practices} status={practiceStatus} selectedId={finishedId} /></main>
	{:else}
		<div class="columns">
			<aside>
				<div class="filters">
					<label class="field">
						<span class="label">Civilización</span>
						<select bind:value={filterCiv} onchange={onMatchChange}>
							<option value="">Todas</option>
							{#each civsInUse as civ (civ)}
								<option value={civ}>{civ}</option>
							{/each}
						</select>
					</label>
					<div class="pair">
						<label class="field">
							<span class="label">Modo</span>
							<select bind:value={filterMode} onchange={onMatchChange}>
								<option value="">Todos</option>
								{#each data.settings.modes as mode (mode)}
									<option value={mode}>{mode}</option>
								{/each}
							</select>
						</label>
						<label class="field">
							<span class="label">Mapa</span>
							<select bind:value={filterMap}>
								<option value="">Todos</option>
								{#each data.settings.maps as map (map)}
									<option value={map}>{map}</option>
								{/each}
							</select>
						</label>
					</div>
					<p class="tip">Al elegir civilización y modo se carga el predeterminado en el overlay.</p>
				</div>

				<ul class="builds">
					{#each filtered as b (b.id)}
						<li class:selected={b.id === selectedId}>
							<button type="button" class="pick" onclick={() => (selectedId = b.id)}>
								<span class="name">{b.name}</span>
								<span class="sub">{[b.civ || 'Sin civilización', b.mode, b.map].filter(Boolean).join(' · ')}</span>
								<span class="tags">
									{#if b.id === data.settings.activeBuildId}<span class="tag on">En uso</span>{/if}
									{#if isDefault(b)}<span class="tag">Predeterminado</span>{/if}
								</span>
							</button>
						</li>
					{:else}
						<li class="none">No hay builds con ese filtro.</li>
					{/each}
				</ul>

				<div class="foot">
					<button type="button" class="primary" onclick={addBuild}>Nuevo build</button>
					<button type="button" onclick={() => (importing = true)}>Importar</button>
				</div>
			</aside>

			<main class="scroll pad">
				{#if importing}
					<section class="import">
						<h2>Importar build</h2>
						<label class="field">
							<span class="label">JSON propio o exportado de aoe4guides (Overlay Tool)</span>
							<textarea rows="12" bind:value={importText} placeholder="Pegá el JSON de «Copiar JSON» o de «Overlay Tool» en aoe4guides"></textarea>
							<p class="tip">Si aoe4guides no exporta población total, queda vacía. Completala para usar avance por OCR. Los iconos se convierten a texto.</p>
						</label>
						{#if importError}<p class="error">{importError}</p>{/if}
						<div class="foot">
							<button type="button" class="primary" onclick={runImport}>Importar</button>
							<button type="button" onclick={() => ((importing = false), (importError = ''))}>Cancelar</button>
						</div>
					</section>
				{:else if selectedIndex >= 0}
					{@const b = data.builds[selectedIndex]}
					{#key b.id}
						<BuildEditor
							bind:build={data.builds[selectedIndex]}
							settings={data.settings}
							{civOptions}
							isActive={b.id === data.settings.activeBuildId}
							isDefault={isDefault(b)}
							onUse={() => use(b.id)}
							onToggleDefault={() => toggleDefault(b)}
							onClone={() => clone(b)}
							onCopy={() => void copyJson(b)}
							onDelete={() => remove(b)}
							onShowStep={(i) => void send('goto-step', i)}
						/>
					{/key}
				{:else}
					<p class="loading">Elegí un build de la lista o creá uno nuevo.</p>
				{/if}
			</main>
		</div>
	{/if}

	{#if toast}
		<div class="toast" role="status">{toast}</div>
	{/if}
</div>

<style>
	.exit { margin-left: auto; padding: 6px 12px; border: 1px solid var(--line-strong); border-radius: 6px; background: var(--card); cursor: pointer; }
	.exit:hover { border-color: var(--accent); }
	.exit:disabled { opacity: .5; cursor: default; }
	.app {
		display: flex;
		flex-direction: column;
		height: 100vh;
		background: #0e1014;
	}
	.bar {
		display: flex;
		align-items: center;
		gap: 20px;
		height: 52px;
		padding: 0 20px;
		border-bottom: 1px solid var(--line);
		background: var(--bg);
	}
	h1 {
		margin: 0;
		font-size: 16px;
		font-weight: 600;
	}
	nav {
		display: flex;
		gap: 4px;
	}
	nav button {
		height: 32px;
		padding: 0 12px;
		border: 0;
		border-radius: 6px;
		background: transparent;
		color: var(--soft);
		cursor: pointer;
	}
	nav button:hover {
		background: var(--card);
	}
	nav button[aria-current='page'] {
		background: var(--card);
		color: var(--accent);
		font-weight: 600;
	}
	.dev {
		margin-left: auto;
		font-size: 12px;
		color: var(--dim);
	}
	.dev a {
		color: var(--accent);
	}

	.columns {
		flex: 1;
		display: grid;
		grid-template-columns: 290px minmax(0, 1fr);
		min-height: 0;
	}
	aside {
		display: flex;
		flex-direction: column;
		min-height: 0;
		border-right: 1px solid var(--line);
		background: var(--bg);
	}
	.filters {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 16px;
		border-bottom: 1px solid var(--line);
	}
	.pair {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px;
	}
	.field {
		display: flex;
		flex-direction: column;
		gap: 6px;
		min-width: 0;
	}
	select,
	textarea {
		width: 100%;
		padding: 0 8px;
		border: 1px solid var(--line-strong);
		border-radius: 6px;
		background: var(--bg);
	}
	select {
		height: 32px;
	}
	textarea {
		padding: 10px;
		font-family: ui-monospace, Consolas, monospace;
		font-size: 12px;
		resize: vertical;
	}
	.tip {
		margin: 0;
		font-size: 12px;
		color: var(--dim);
	}

	.builds {
		flex: 1;
		overflow-y: auto;
		margin: 0;
		padding: 8px;
		list-style: none;
	}
	.builds li + li {
		margin-top: 4px;
	}
	.pick {
		display: flex;
		flex-direction: column;
		gap: 2px;
		width: 100%;
		padding: 10px 12px;
		border: 1px solid transparent;
		border-radius: 8px;
		background: transparent;
		text-align: left;
		cursor: pointer;
	}
	.pick:hover {
		background: var(--card);
	}
	.selected .pick {
		border-color: var(--line-strong);
		background: var(--card);
	}
	.name {
		font-weight: 600;
	}
	.sub {
		font-size: 12px;
		color: var(--dim);
	}
	.tags {
		display: flex;
		gap: 6px;
	}
	.tags:empty {
		display: none;
	}
	.tag {
		margin-top: 4px;
		padding: 0 7px;
		border: 1px solid var(--line-strong);
		border-radius: 9px;
		font-size: 11px;
		line-height: 16px;
		color: var(--soft);
	}
	.tag.on {
		border-color: var(--accent);
		color: var(--accent);
	}
	.none {
		padding: 12px;
		font-size: 13px;
		color: var(--dim);
	}
	.foot {
		display: flex;
		gap: 8px;
	}
	aside .foot {
		padding: 12px 16px;
		border-top: 1px solid var(--line);
	}
	.foot button {
		height: 32px;
		padding: 0 12px;
		border: 1px solid var(--line-strong);
		border-radius: 6px;
		background: var(--card);
		cursor: pointer;
	}
	.foot button:hover {
		border-color: var(--dim);
	}
	.foot .primary {
		border-color: var(--accent);
		background: var(--accent);
		color: var(--bg);
		font-weight: 600;
	}

	.scroll {
		min-height: 0;
		overflow-y: auto;
	}
	.pad {
		padding: 20px 24px 32px;
	}
	.full {
		flex: 1;
	}
	.loading {
		padding: 24px;
		color: var(--dim);
	}
	.import {
		display: flex;
		flex-direction: column;
		gap: 12px;
		max-width: 720px;
	}
	.import h2 {
		margin: 0;
		font-size: 16px;
	}
	.error {
		margin: 0;
		color: var(--late);
	}
	.toast {
		position: fixed;
		right: 20px;
		bottom: 20px;
		padding: 10px 14px;
		border: 1px solid var(--line-strong);
		border-radius: 8px;
		background: var(--card);
	}
	:global(.app :focus-visible) {
		outline: 2px solid var(--accent);
		outline-offset: 1px;
	}
</style>
