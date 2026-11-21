<script lang="ts">
	import Logo from '$lib/components/Logo.svelte';
	import CivFlag from '$lib/components/CivFlag.svelte';
	import CivSelect from '$lib/components/CivSelect.svelte';
	import { t, locale, label, uniqueLabels } from '$lib/i18n';
	import { onMount } from 'svelte';

	import BuildEditor from '$lib/components/BuildEditor.svelte';
	import WelcomeView from '$lib/components/WelcomeView.svelte';
	import HelpView from '$lib/components/HelpView.svelte';
	import { mergePack, type BuildPack } from '$lib/build-pack';
	import SettingsView from '$lib/components/SettingsView.svelte';
	import BackupView from '$lib/components/BackupView.svelte';
	import PracticeView, { type PracticeStatus } from '$lib/components/PracticeView.svelte';
	import { downloadBackup, importBuilds } from '$lib/imports';
	import { syncLanguage, isTauri, keepAlive, loadData, takeInstallerLanguage, on, onDataChanged, onQuitRequested, onRegionSelected, quitApp, saveData, send } from '$lib/bridge';
	import { cloneBuild, newBuild, replaceWithStarterBuilds } from '$lib/defaults';
	import type { AppData, Build, Practice } from '$lib/types';
	import { preferredBuildId, rememberDefault, setDefaultBuild } from '$lib/util';
	import { profileKey, relativeRect, validProfile, suggestPlayerName, type RosterEntry, type SetupStatus } from '$lib/setup';

	let data = $state<AppData | null>(null);
	let tab = $state<'builds' | 'settings' | 'practice' | 'welcome' | 'help'>('builds');
	let practiceStatus = $state<PracticeStatus | null>(null);
	let setupStatus = $state<SetupStatus | null>(null);
	let manualBuild=false;
	// Players on the last loading screen. Memory only: never saved or included in diagnostics.
	let roster = $state<RosterEntry[]>([]);
	let lastPickCiv = '';
	let nameSuggestion = $state<string | null>(null);
	const rejectedNames = new Set<string>();
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
		return uniqueLabels([...data.settings.civs, ...new Set(extra)]);
	});
	const civsInUse = $derived(data ? [...new Set(data.builds.map((b) => label(b.civ,'en')).filter(Boolean))].sort() : []);
	const filtered = $derived(
		data
			? data.builds.filter(
					(b) =>
						(!filterCiv || label(b.civ,'en') === label(filterCiv,'en')) &&
						(!filterMode || label(b.mode,'en') === label(filterMode,'en')) &&
						(!filterMap || !b.map || label(b.map,'en') === label(filterMap,'en'))
				)
			: []
	);
	const selectedIndex = $derived(data ? data.builds.findIndex((b) => b.id === selectedId) : -1);

	const isDefault = (b: Build) => !!data && preferredBuildId(data.settings,b.civ,b.mode) === b.id;

	function notify(message: string) {
		toast = message;
		if (toastTimer) clearTimeout(toastTimer);
		toastTimer = setTimeout(() => (toast = ''), 2500);
	}

	/** A manual choice: activates the build, and learns the player's name when it can. */
	function use(id: string) {
		manualBuild=true;void send('setup-manual-build');
		if (!data) return;
		data.settings.activeBuildId = id;
		const build=data.builds.find(b=>b.id===id);
		if(!build) return;
		if(rememberDefault(data.settings,build)) notify($t(`Predeterminado para ${label(build.civ)} · ${label(build.mode)}`, `Default for ${label(build.civ)} · ${label(build.mode)}`));
		lastPickCiv=build.civ;learnName();
	}

	function learnName() {
		const name = data && !data.settings.setup.playerName && lastPickCiv ? suggestPlayerName(roster,lastPickCiv) : null;
		nameSuggestion = name && !rejectedNames.has(name.toLocaleLowerCase()) ? name : null;
	}
	function acceptName() {
		if(!data || !nameSuggestion) return;
		data.settings.setup.playerName=nameSuggestion;nameSuggestion=null;
		notify($t("Listo: tu build se elige solo en la pantalla de carga", "Done: your build is chosen on the loading screen"));
	}
	function rejectName() {
		if(nameSuggestion) rejectedNames.add(nameSuggestion.toLocaleLowerCase());
		nameSuggestion=null;
	}

	function toggleDefault(b: Build) {
		if (!data || !b.civ || !b.mode) return;
		setDefaultBuild(data.settings,b,!isDefault(b));
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
			notify($t("Build copiado al portapapeles", "Build copied to clipboard"));
		} catch {
			notify($t("No se pudo copiar al portapapeles", "Could not copy to clipboard"));
		}
	}

	function runImport() {
		if (!data) return;
		try {
			const builds = importBuilds(importText);
			const additions=builds.filter(b=>!data!.builds.some(old=>old.id===b.id));
			data.builds.push(...additions);
			selectedId = builds[0].id;
			filterCiv = ''; filterMode = ''; filterMap = '';
			importing = false;
			importText = '';
			importError = '';
			notify(additions.length ? $t(`${additions.length} builds importados`, `${additions.length} builds imported`) : $t("Ese paquete ya está en tu biblioteca; se conservaron tus cambios", "That pack is already in your library; your edits were preserved"));
		} catch (e) {
			importError = e instanceof Error ? e.message : $t("JSON inválido.", "Invalid JSON.");
		}
	}
	function addPack(pack:BuildPack) {
		if(!data || restoring || quitting)return;
		const before=data.builds.length;
		data.builds=mergePack($state.snapshot(data.builds),pack);
		if(!data.settings.activeBuildId&&data.builds.length){use(data.builds[0].id);selectedId=data.builds[0].id;}
		notify(data.builds.length===before?$t("El paquete ya está añadido; se conservaron tus cambios", "The pack is already installed; your edits were preserved"):$t(`${data.builds.length-before} builds añadidos`, `${data.builds.length-before} builds added`));
	}

	async function restore(incoming: AppData, message = $t("Respaldo restaurado", "Backup restored")) {
		if (restoring || quitting) return false;
		restoring = true;
		manualBuild=false;setupStatus=null;
		if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
		try {
			await send('restore-session');
			await saveData(incoming);
			lastSaved = JSON.stringify(incoming); data = incoming;
			selectedId = incoming.settings.activeBuildId; filterCiv = ''; filterMode = ''; filterMap = '';
			notify(message);
			return true;
		} catch (e) {
			notify($t(`No se pudieron guardar los cambios: ${String(e)}`, `Could not save changes: ${String(e)}`));
			return false;
		}
		finally { restoring = false; }
	}

	async function resetStarterPack() {
		if (!data) return;
		const incoming = replaceWithStarterBuilds($state.snapshot(data));
		if (await restore(incoming, $t("Biblioteca reemplazada por el paquete inicial", "Library replaced with the starter pack"))) {
			tab = 'builds';
		}
	}

	async function exitApp() {
		if (!data || restoring || quitting) return;
		quitting = true;
		if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
		try { await saveData($state.snapshot(data) as AppData); await quitApp(); }
		catch (e) { quitting = false; notify($t(`No se pudo guardar antes de salir: ${String(e)}`, `Could not save before exiting: ${String(e)}`)); }
	}

	onMount(() => {
		void Promise.all([loadData(), takeInstallerLanguage()]).then(([loaded, chosen]) => {
			lastSaved = JSON.stringify(loaded);
			// Applied after `lastSaved`, so the change is saved and reaches the other windows.
			if (chosen) loaded.settings.language = chosen;
			data = loaded;
			if(['pending','detecting'].includes(loaded.settings.onboarding))tab='welcome';
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
				const g=setupStatus?.geometry, o=data.settings.ocr;
				if(data.settings.setup.enabled && g) {
					const old=data.settings.setup.profiles.find(p=>p.key===profileKey(g));
					const workers=target==='workers'?relativeRect(region,g):old?.workers??(o.source==='workers'?relativeRect(o,g):null);
					const idle=target==='idle'?relativeRect(region,g):old?.idle??(o.idleRegion?relativeRect(o.idleRegion,g):null);
					const profile={key:profileKey(g),width:g.width,height:g.height,workers,idle,clock:old?.clock??null,position:old?.position??null,manual:true};
					if(validProfile(profile)) {data.settings.setup.profiles=[...data.settings.setup.profiles.filter(p=>p.key!==profile.key),profile].slice(-24);void send('setup-manual-profile',profile);}
				}
				notify($t("Región OCR guardada", "OCR region saved"));
			}),
			on('setup-status',value=>setupStatus=value as SetupStatus),
			on('setup-new-match',()=>manualBuild=false),
			on('setup-roster',value=>{
				const entries=(value as {entries?:unknown})?.entries;
				if(!Array.isArray(entries))return;
				roster=entries.filter((e):e is RosterEntry=>!!e && typeof e.name==='string' && typeof e.civ==='string').slice(0,8);
				learnName();
			}),
			on('picker-build-confirmed',value=>{
				if(!data || restoring || typeof value!=='string' || !data.builds.some(b=>b.id===value))return;
				use(value);
			}),
			on('setup-build',value=>{
				const request=value as {id:string;previous:string|null};
				if(data && !restoring && data.settings.setup.enabled && !manualBuild && data.settings.activeBuildId===request.previous && data.builds.some(b=>b.id===request.id))data.settings.activeBuildId=request.id;
			}),
			on('setup-profile',value=>{
				if(!data || restoring || !data.settings.setup.enabled || !validProfile(value))return;
				data.settings.setup.profiles=[...data.settings.setup.profiles.filter(p=>p.key!==value.key),value].slice(-24);
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
			on('practice-finished', value => { finishedId = String(value); tab = 'practice'; notify($t("Práctica guardada: revisá los atrasos", "Practice saved: review your timing")); }),
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

	$effect(() => { if(data) { locale.set(data.settings.language); void syncLanguage(data.settings.language); } });
	// Guardado automático con una pequeña espera para no escribir en cada tecla.
	$effect(() => {
		if (!data || restoring) return;
		const snapshot = JSON.stringify(data);
		if (snapshot === lastSaved) return;
		if (saveTimer) clearTimeout(saveTimer);
		saveTimer = setTimeout(() => {
			saveTimer = null;
			void saveData(JSON.parse(snapshot) as AppData).then(() => lastSaved = snapshot).catch(e => notify($t(`Error al guardar: ${String(e)}`, `Could not save: ${String(e)}`)));
		}, 250);
	});
</script>

<svelte:head>
	<title>AoE4 Overlay — Builds</title>
</svelte:head>

<div class="app" style="--accent: {data?.settings.accent ?? '#F2B33D'}">
	<header class="bar">
		<h1><Logo size={22} />AoE4 Overlay</h1>
		<nav aria-label={$t("Secciones", "Sections")}>
			<button type="button" aria-current={tab === 'welcome' ? 'page' : undefined} onclick={() => tab='welcome'}>{$t("Inicio", "Home")}</button>
			<button type="button" aria-current={tab === 'builds' ? 'page' : undefined} onclick={() => (tab = 'builds')}>Builds</button>
			<button type="button" aria-current={tab === 'practice' ? 'page' : undefined} onclick={() => tab = 'practice'}>{$t("Práctica", "Practice")}</button>
			<button type="button" aria-current={tab === 'settings' ? 'page' : undefined} onclick={() => (tab = 'settings')}>
				{$t("Ajustes", "Settings")}{failedHotkeys.length ? $t(" · revisar teclas", " · check hotkeys") : ''}
			</button>
			<button type="button" aria-current={tab === 'help' ? 'page' : undefined} onclick={() => tab='help'}>{$t("Ayuda", "Help")}</button>
		</nav>
		{#if isTauri}
			<button type="button" class="exit" disabled={!data || restoring || quitting} onclick={() => void exitApp()}>{quitting ? $t("Guardando y cerrando…", "Saving and exiting…") : $t("Salir de la app", "Exit app")}</button>
		{/if}
		{#if !isTauri}
			<span class="dev">{$t("Vista de navegador: los datos se guardan en este navegador. Abrí", "Browser preview: data is saved in this browser. Open")} <a href="/overlay" target="_blank" rel="noreferrer">/overlay</a> {$t("en otra pestaña para ver el panel.", "in another tab to see the overlay.")}</span>
		{/if}
	</header>

	{#if nameSuggestion && data}
		<div class="suggestion" role="status">
			<span>{$t(`¿Tu nombre en AoE4 es «${nameSuggestion}»? Con eso elijo tu build solo en la pantalla de carga.`, `Is your AoE4 name “${nameSuggestion}”? Then your build is chosen on the loading screen.`)}</span>
			<button type="button" class="primary" onclick={acceptName}>{$t("Sí, soy yo", "Yes, that’s me")}</button>
			<button type="button" onclick={rejectName}>{$t("No", "No")}</button>
		</div>
	{/if}

	{#if !data}
		<p class="loading">{$t("Cargando…", "Loading…")}</p>
	{:else if tab === 'welcome'}
		<main class="scroll pad full"><WelcomeView bind:settings={data.settings} builds={data.builds} status={setupStatus} {roster} onPack={addPack}
			replacing={restoring || quitting} onReplace={resetStarterPack} onBackup={()=>{if(data)downloadBackup(data);}} onDone={()=>tab='builds'} /></main>
	{:else if tab === 'help'}
		<main class="scroll pad full"><HelpView settings={data.settings} status={setupStatus} {failedHotkeys} onSetup={()=>tab='welcome'} /></main>
	{:else if tab === 'settings'}
		<main class="scroll pad full">
			<SettingsView bind:settings={data.settings} {failedHotkeys} {setupStatus} {roster} builds={data.builds} onCalibrate={()=>tab='welcome'} activeBuild={data.builds.find(b => b.id === data!.settings.activeBuildId) ?? null}>
				{#snippet backup()}{#if data}<BackupView {data} onRestore={incoming => void restore(incoming)} />{/if}{/snippet}
			</SettingsView>
		</main>
	{:else if tab === 'practice'}
		<main class="scroll pad full"><PracticeView practices={data.practices} status={practiceStatus} selectedId={finishedId} /></main>
	{:else}
		<div class="columns">
			<aside>
				<div class="filters">
					<div class="field">
						<span class="label">{$t("Civilización", "Civilization")}</span>
						<CivSelect bind:value={filterCiv} label={$t('Civilización','Civilization')}
						 options={[{value:'',text:$t('Todas','All')},...civsInUse.map(civ=>({value:civ,text:label(civ,$locale),civ}))]}/>
					</div>
					<div class="pair">
						<label class="field">
							<span class="label">{$t("Modo", "Mode")}</span>
							<select bind:value={filterMode}>
								<option value="">{$t("Todos", "All")}</option>
								{#each data.settings.modes as mode (mode)}
									<option value={mode}>{label(mode,$locale)}</option>
								{/each}
							</select>
						</label>
						<label class="field">
							<span class="label">{$t("Mapa", "Map")}</span>
							<select bind:value={filterMap}>
								<option value="">{$t("Todos", "All")}</option>
								{#each data.settings.maps as map (map)}
									<option value={map}>{label(map,$locale)}</option>
								{/each}
							</select>
						</label>
					</div>
				</div>

				<ul class="builds">
					{#each filtered as b (b.id)}
						<li class:selected={b.id === selectedId}>
							<button type="button" class="pick" onclick={() => (selectedId = b.id)}>
								<span class="build-heading"><CivFlag civ={b.civ} size={32}/><span class="name">{b.name}</span></span>
								<span class="sub">{[b.civ || $t("Sin civilización", "No civilization"), b.mode, b.map].filter(Boolean).map(v=>label(v,$locale)).join(' · ')}</span>
								<span class="tags">
									{#if b.id === data.settings.activeBuildId}<span class="tag on">{$t("En uso", "Active")}</span>{/if}
									{#if isDefault(b)}<span class="tag">{$t("Predeterminado", "Default")}</span>{/if}
								</span>
							</button>
						</li>
					{:else}
						<li class="none">{$t("No hay builds con ese filtro.", "No builds match this filter.")}</li>
					{/each}
				</ul>

				<div class="foot">
					<button type="button" class="primary" onclick={addBuild}>{$t("Nuevo build", "New build")}</button>
					<button type="button" onclick={() => (importing = true)}>{$t("Importar", "Import")}</button>
				</div>
			</aside>

			<main class="scroll pad">
				{#if importing}
					<section class="import">
						<h2>{$t("Importar build", "Import build")}</h2>
						<label class="field">
							<span class="label">{$t("JSON propio o exportado de aoe4guides (Overlay Tool)", "App JSON or aoe4guides export (Overlay Tool)")}</span>
							<textarea rows="12" bind:value={importText} placeholder={$t("Pegá el JSON de «Copiar JSON» o de «Overlay Tool» en aoe4guides", "Paste JSON from Copy JSON or aoe4guides Overlay Tool")}></textarea>
							<p class="tip">{$t("También acepta paquetes de builds. La población puede quedar vacía: el OCR usa los aldeanos por recurso. Los iconos se convierten a texto.", "Build packs are also supported. Population may be blank: OCR uses resource villager counts. Icons are converted to text.")}</p>
						</label>
						{#if importError}<p class="error">{importError}</p>{/if}
						<div class="foot">
							<button type="button" class="primary" onclick={runImport}>{$t("Importar", "Import")}</button>
							<button type="button" onclick={() => ((importing = false), (importError = ''))}>{$t("Cancelar", "Cancel")}</button>
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
					<p class="loading">{$t("Elegí un build de la lista o creá uno nuevo.", "Choose a build from the list or create a new one.")}</p>
				{/if}
			</main>
		</div>
	{/if}

	{#if toast}
		<div class="toast" role="status">{toast}</div>
	{/if}
</div>

<style>
	.suggestion { display: flex; align-items: center; gap: 10px; padding: 10px 20px; border-bottom: 1px solid var(--accent); background: var(--card); }
	.suggestion span { flex: 1; }
	.suggestion button { height: 30px; padding: 0 12px; border: 1px solid var(--line-strong); border-radius: 6px; background: var(--bg); cursor: pointer; }
	.suggestion .primary { border-color: var(--accent); background: var(--accent); color: var(--bg); font-weight: 600; }
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
		display: flex;
		align-items: center;
		gap: 8px;
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
	.build-heading { display:flex;align-items:flex-start;gap:9px; }
	.build-heading :global(.civ-flag) { margin-top:3px; }
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
