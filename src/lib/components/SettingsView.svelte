<script lang="ts">
	import { overlayTheme, overlayThemeStyle } from '$lib/overlay-theme';
	import CivFlag from './CivFlag.svelte';
	import { t, locale, hotkeyLabel, label } from '$lib/i18n';
	import { onMount } from 'svelte';
	import type { Snippet } from 'svelte';
	import { isTauri, monitorOptions, on, openRegionSelector, send, setStartupEnabled, startupEnabled } from '$lib/bridge';
	import HotkeyInput from './HotkeyInput.svelte';
	import ListEditor from './ListEditor.svelte';
	import SetupView from './SetupView.svelte';
	import type { RosterEntry, SetupStatus } from '$lib/setup';
	import { HOTKEY_ACTIONS, type Build, type Corner, type Settings } from '$lib/types';

	interface Props {
		settings: Settings;
		/** Acciones cuya tecla no se pudo registrar en el sistema. */
		failedHotkeys: string[];
		backup: Snippet;
		activeBuild: Build | null;
		setupStatus: SetupStatus | null;
		builds: Build[];
		onCalibrate: () => void;
		roster?: RosterEntry[];
	}
	let { settings = $bindable(), failedHotkeys, backup, activeBuild, setupStatus, builds, onCalibrate, roster = [] }: Props = $props();
	const sections = $derived([
		{ id: 'match', title: $t("Partida", "Match") },
		{ id: 'overlay', title: 'Overlay' },
		{ id: 'keys', title: $t("Atajos", "Shortcuts") },
		{ id: 'data', title: $t("Datos", "Data") }
	] as const);
	let section = $state<(typeof sections)[number]['id']>('match');
	const shortcutGroups = $derived([
		{ title: $t("Pasos y builds", "Steps and builds"), actions: ['next', 'prev', 'chooseBuild', 'cycleBuild'] },
		{ title: $t("Reloj y práctica", "Clock and practice"), actions: ['start', 'pauseClock', 'clockPlus', 'clockMinus', 'resetClock', 'resetPractice', 'finishPractice'] },
		{ title: 'Overlay', actions: ['toggleVisible', 'toggleCompact', 'editPosition'] }
	] as const);
	let monitors = $state<Awaited<ReturnType<typeof monitorOptions>>>([]);
	let ocrStatus = $state('');
	let editing = $state(false);
	let ocrMonitor = $state(0);
	let selectionError = $state('');
	let launchWithWindows = $state<boolean | null>(null);
	let savingStartup = $state(false);
	let startupError = $state('');
	async function toggleStartup(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const enabled = input.checked;
		savingStartup = true;
		startupError = '';
		try {
			await setStartupEnabled(enabled);
			launchWithWindows = enabled;
		} catch (error) {
			input.checked = launchWithWindows === true;
			startupError = String(error);
		} finally {
			savingStartup = false;
		}
	}
	async function selectRegion(target: 'workers' | 'idle' = 'workers') {
		selectionError = '';
		try { await openRegionSelector(Number(ocrMonitor), target); }
		catch(e) { selectionError = String(e); }
	}
	onMount(() => {
		void monitorOptions().then(value => monitors = value);
		void startupEnabled().then(value => launchWithWindows = value).catch(error => startupError = String(error));
		const stops = [on('ocr-status', value => ocrStatus = String(value)), on('practice-status', value => editing = Boolean((value as { editing: boolean }).editing))];
		void send('practice-status-request'); return () => stops.forEach(stop => stop());
	});

	const CORNERS: { value: Corner; label: string }[] = $derived([
		{ value: 'top-left', label: $t("Arriba izquierda", "Top left") },
		{ value: 'top-right', label: $t("Arriba derecha", "Top right") },
		{ value: 'bottom-left', label: $t("Abajo izquierda", "Bottom left") },
		{ value: 'bottom-right', label: $t("Abajo derecha", "Bottom right") }
	]);
	const ACCENTS = ['#F2B33D', '#5CC8F0', '#7BD88F', '#F08A5C'];
	const theme = $derived(overlayTheme(activeBuild?.civ ?? '', settings.civilizationColors, settings.accent));

	const duplicated = $derived(
		HOTKEY_ACTIONS.filter(
			(a) => settings.hotkeys[a] && HOTKEY_ACTIONS.some((b) => b !== a && settings.hotkeys[b] === settings.hotkeys[a])
		)
	);
</script>

<div class="settings">
	<header class="settings-heading">
		<h2>{$t("Ajustes", "Settings")}</h2>
		<label class="language">
			<span>{$t('Idioma', 'Language')}</span>
			<select bind:value={settings.language}>
				<option value="en" lang="en">English</option>
				<option value="es" lang="es">Español</option>
			</select>
		</label>
	</header>
	<nav aria-label={$t("Categorías de ajustes", "Settings categories")}>
		{#each sections as item}
			<button type="button" aria-current={section === item.id ? 'page' : undefined} onclick={() => section = item.id}>
				{item.title}
				{#if item.id === 'keys' && (duplicated.length || failedHotkeys.length)}
					<span class="nav-warning" role="img" aria-label={$t("Revisar atajos", "Review shortcuts")}>!</span>
				{/if}
			</button>
		{/each}
	</nav>
	<div class="settings-content">
	{#if section === 'match'}
		<SetupView bind:settings status={setupStatus} {builds} {roster} {onCalibrate} {manualCalibration}/>
		{#if launchWithWindows !== null || startupError}
		<section>
			<label class="toggle-row">
				<span>
					<strong>{$t('Iniciar AoE4 Overlay con Windows', 'Start AoE4 Overlay with Windows')}</strong>
					<small>{$t('La app queda en la bandeja. El overlay aparece al entrar a AoE4 y se oculta al salir del juego.', 'The app waits in the system tray. The overlay appears when you enter AoE4 and hides when you leave the game.')}</small>
				</span>
				<input type="checkbox" role="switch" checked={launchWithWindows === true} disabled={launchWithWindows === null || savingStartup} onchange={toggleStartup} />
			</label>
			{#if startupError}<p class="warn" role="alert">{startupError}</p>{/if}
		</section>
		{/if}
	{:else if section === 'keys'}
	<section>
		<h3>{$t("Atajos dentro del juego", "In-game shortcuts")}</h3>
		<p class="help">
			{$t("Hacé clic en una combinación y presioná las teclas que quieras usar. Esc cancela. Solo están activos con AoE4 en primer plano.", "Click a shortcut and press the keys you want to use. Press Esc to cancel. Shortcuts work while AoE4 is in the foreground.")}
		</p>
		{#each shortcutGroups as group}
		<h4>{group.title}</h4>
		<div class="keys">
			{#each group.actions as action (action)}
				<label for="hk-{action}">{hotkeyLabel(action, $locale)}</label>
				<div class="key">
					<HotkeyInput id="hk-{action}" bind:value={settings.hotkeys[action]} />
					<button type="button" class="ghost" aria-label={$t(`Quitar atajo: ${hotkeyLabel(action, $locale)}`, `Remove shortcut for ${hotkeyLabel(action, $locale)}`)} disabled={!settings.hotkeys[action]} onclick={() => (settings.hotkeys[action] = '')}>
						{$t('Quitar', 'Remove')}
					</button>
					{#if duplicated.includes(action)}
						<span class="warn">{$t("Repetida en otra acción", "Assigned to another action")}</span>
					{:else if failedHotkeys.includes(action)}
						<span class="warn">{$t("No se pudo registrar: puede estar en uso por otro programa", "Couldn’t register shortcut. Another program may be using it.")}</span>
					{/if}
				</div>
			{/each}
		</div>
		{/each}
	</section>
	{:else if section === 'overlay'}
	<div class="preview-strip">
		<div class="preview-caption"><span class="label">{$t("Vista previa", "Preview")}</span><strong>{$t("Así se ve tu build", "Your build preview")}</strong><small>{$t(`Primer paso · ${Math.round(settings.scale * 100)}% de tamaño`, `First step · ${Math.round(settings.scale * 100)}% scale`)}</small></div>
		<div class="mini-overlay" class:compact={settings.compact} class:civilization-theme={!!theme.palette} style="{overlayThemeStyle(activeBuild?.civ ?? '', settings.civilizationColors, settings.accent)} opacity: {settings.opacity}">
			<div class="mini-title"><strong>{activeBuild?.name || $t("Tu próximo build", "Your next build")}</strong>{#if settings.showClock}<span>0:00</span>{/if}</div>
			<div class="mini-step"><b>{activeBuild?.steps[0]?.pop ?? '—'} <small>{$t("POB", "POP")}</small></b><span>{activeBuild?.steps[0]?.action || $t("Elegí un build para empezar a practicar", "Choose a build to start practicing")}</span></div>
			{#if !settings.compact}<div class="mini-footer">{label(activeBuild?.civ ?? '', $locale) || 'Age of Empires IV'}<span>{$t('Paso', 'Step')} 1 / {activeBuild?.steps.length || '—'}</span></div>{/if}
		</div>
	</div>
	<section>
		<h3>{$t("Ubicación en pantalla", "Screen position")}</h3>
		<p class="help">{$t("Mové el overlay con el mouse. Arrastrá su barra a cualquier monitor y tocá «Listo».", "Drag the overlay bar to any monitor, then select Done.")}</p>
		<div class="actions"><button type="button" class="primary" onclick={() => void send('overlay-action', 'editPosition')}>{editing ? $t("Guardar posición y terminar edición", "Save position and finish editing") : $t("Mover overlay con el mouse", "Drag overlay to move it")}</button><span class="help inline">{settings.position ? $t("Posición personalizada", "Custom position") : $t("Ubicación por esquina", "Corner position")}</span></div>
		{#if monitors.length}
			<label class="field"><span class="label">{$t("Mover a monitor", "Move to monitor")}</span>
				<select aria-label={$t("Mover a monitor", "Move to monitor")} onchange={e => { const m = monitors[Number(e.currentTarget.value)]; if (m) settings.position = { x: m.position.x + 40, y: m.position.y + 80 }; }}>
					<option value="">{$t("Elegir monitor…", "Choose a monitor…")}</option>
					{#each monitors as monitor, i}<option value={i}>{monitor.name || `Monitor ${i + 1}`} · {monitor.size.width} × {monitor.size.height}</option>{/each}
				</select>
			</label>
		{/if}
		<details><summary>{$t("Ubicación precisa por esquina y márgenes", "Position by corner and margins")}</summary>
		{#if settings.position}<p class="help">{$t("Estás usando una posición personalizada. Restablecé la ubicación para aplicar estos valores.", "Switch from your custom position to apply these values.")}</p><button type="button" class="ghost" onclick={() => settings.position = null}>{$t("Usar esquina y márgenes", "Use corner and margins")}</button>{/if}
		<div class="grid">
			<fieldset disabled={!!settings.position}>
				<legend class="label">{$t("Esquina", "Corner")}</legend>
				<div class="corners">
					{#each CORNERS as corner (corner.value)}
						<label class="radio">
							<input type="radio" name="corner" value={corner.value} bind:group={settings.corner} />
							{corner.label}
						</label>
					{/each}
				</div>
			</fieldset>
			<fieldset class="pair" disabled={!!settings.position}>
				<label class="field">
					<span class="label">{$t("Margen horizontal (px)", "Horizontal margin (px)")}</span>
					<input type="number" min="0" bind:value={settings.offsetX} />
				</label>
				<label class="field">
					<span class="label">{$t("Margen vertical (px)", "Vertical margin (px)")}</span>
					<input type="number" min="0" bind:value={settings.offsetY} />
				</label>
			</fieldset>
		</div>
		</details>
	</section>
	<section>
		<h3>{$t("Tamaño y apariencia", "Size and appearance")}</h3>
		<label class="radio theme-toggle"><input type="checkbox" bind:checked={settings.civilizationColors} />{$t('Usar colores de la civilización', 'Use civilization colors')}</label>
		<p class="help">{$t('Usa los colores de la bandera del build activo y cambia al elegir otra civilización. Conserva el fondo oscuro y los colores de los recursos.', 'Uses the active build’s flag colors and changes when you choose another civilization. Keeps the dark background and resource colors.')}</p>
		{#if settings.civilizationColors}
			<div class="theme-palette">
				{#if activeBuild}<CivFlag civ={activeBuild.civ} size={28}/>{/if}
				<span>{theme.palette ? label(activeBuild?.civ ?? '', $locale) : $t('Sin tema disponible: se usa tu color personalizado.', 'No theme available: using your custom color.')}</span>
				{#if theme.palette}<span class="palette-colors" aria-hidden="true"><i style="background:{theme.palette.primary}"></i><i style="background:{theme.palette.secondary}"></i></span>{/if}
			</div>
		{/if}
		<div class="grid">
			<label class="field">
				<span class="label">{$t(`Tamaño · ${Math.round(settings.scale * 100)}%`, `Size · ${Math.round(settings.scale * 100)}%`)}</span>
				<input type="range" min="0.7" max="1.8" step="0.05" bind:value={settings.scale} />
			</label>
			<label class="field">
				<span class="label">{$t(`Opacidad · ${Math.round(settings.opacity * 100)}%`, `Opacity · ${Math.round(settings.opacity * 100)}%`)}</span>
				<input type="range" min="0.4" max="1" step="0.02" bind:value={settings.opacity} />
			</label>
		</div>
		<hr />
		<div class="grid">
			<fieldset disabled={settings.civilizationColors && !!theme.palette}>
				<legend class="label">{$t("Color de acento", "Accent color")}</legend>
				<div class="accents">
					{#each ACCENTS as color (color)}
						<button
							type="button"
							class="swatch"
							style="background: {color}"
							aria-label={$t(`Acento ${color}`, `Accent ${color}`)}
							aria-pressed={settings.accent.toLowerCase() === color.toLowerCase()}
							onclick={() => (settings.accent = color)}
						></button>
					{/each}
					<input type="color" aria-label={$t("Otro color de acento", "Custom accent color")} bind:value={settings.accent} />
				</div>
			</fieldset>
			<div class="checks">
				<label class="radio"><input type="checkbox" bind:checked={settings.compact} />{$t(" Modo compacto (una sola línea)", " Compact mode (single line)")}</label>
				<label class="radio"><input type="checkbox" bind:checked={settings.showClock} />{$t(" Mostrar reloj contra el objetivo", " Show clock against target time")}</label>
			</div>
		</div>
	</section>
	{:else if section === 'data'}
		{@render backup()}
		<details class="data-options">
		<summary>{$t("Opciones de los builds", "Build options")}</summary>
		<p class="help">{$t("Estas opciones aparecen al editar y filtrar tus builds.", "These options appear in the build editor and filters.")}</p>
		<div class="lists">
			<div>
				<span class="label">{$t("Modos", "Modes")}</span>
				<ListEditor bind:items={settings.modes} label={$t("Modo nuevo", "New mode")} placeholder={$t("Por ejemplo: FFA", "For example, FFA")} />
			</div>
			<div>
				<span class="label">{$t("Tipos de mapa", "Map types")}</span>
				<ListEditor bind:items={settings.maps} label={$t("Tipo de mapa nuevo", "New map type")} />
			</div>
			<div>
				<span class="label">{$t("Civilizaciones sugeridas", "Suggested civilizations")}</span>
				<ListEditor bind:items={settings.civs} label={$t("Civilización nueva", "New civilization")} />
			</div>
		</div>
		</details>
	{/if}
	</div>
</div>

{#snippet manualCalibration()}
	<div class="manual-calibration">
		<label class="toggle-row">
			<span>
				<strong>{$t("Avance automático por aldeanos", "Advance automatically on villager counts")}</strong>
				{#if settings.ocr.source !== 'workers' || !settings.ocr.idleRegion}<small>{$t("Marcá ambas regiones para habilitarlo.", "Select both regions to enable it.")}</small>{/if}
			</span>
			<input type="checkbox" role="switch" disabled={!isTauri || settings.ocr.source !== 'workers' || !settings.ocr.idleRegion} bind:checked={settings.ocr.enabled} />
		</label>
		<p class="help">{$t('Marcá solo la columna de', 'Select only the column of')} <strong>{$t('cuatro números junto a los íconos de aldeanos', 'four numbers next to the villager icons')}</strong>{$t(', en orden: comida, madera, oro y piedra. Incluí los ceros grises. Dejá afuera los íconos, los recursos acumulados, los inactivos y el contador de población.', ', in order: food, wood, gold, and stone. Include gray zeros. Exclude icons, resource totals, idle villagers, and the population counter.')}</p>
		{#if monitors.length > 1}
			<label class="field"><span class="label">{$t("Monitor del juego", "Game monitor")}</span><select bind:value={ocrMonitor}>{#each monitors as monitor, i}<option value={i}>{monitor.name || `Monitor ${i+1}`} · {monitor.size.width} × {monitor.size.height}</option>{/each}</select></label>
		{/if}
		<div class="actions"><button type="button" class="primary" disabled={!isTauri || !monitors.length} onclick={() => void selectRegion()}>{$t("Seleccionar los cuatro contadores", "Select the four resource counters")}</button><span class="region-size">{settings.ocr.source === 'workers' ? `${settings.ocr.width} × ${settings.ocr.height} px` : $t("Pendiente de calibrar", "Calibration needed")}</span></div>
		<p class="help">{$t("Con AoE4 en ventana sin bordes, dibujá la columna dejando un número centrado en cada franja. Guardá el rectángulo o cancelá con Esc.", "With AoE4 in borderless windowed mode, draw a region with one number centered in each row. Save the region or press Esc to cancel.")}</p>
		<div class="actions"><button type="button" disabled={!isTauri || !monitors.length} onclick={() => void selectRegion('idle')}>{$t("Seleccionar aldeanos inactivos", "Select idle villager counter")}</button><span class="region-size">{settings.ocr.idleRegion ? `${settings.ocr.idleRegion.width} × ${settings.ocr.idleRegion.height} px` : $t("Pendiente de calibrar", "Calibration needed")}</span></div>
		<p class="help">{$t("Marcá aparte el número junto al aldeano con “Z”, arriba de los recursos. Dejá espacio para tres cifras y excluí el ícono y la población.", "Select the number next to the villager with a “Z” above the resources. Leave room for three digits and exclude the icon and population counter.")}</p>
		{#if selectionError}<p class="warn" role="alert">{selectionError}</p>{/if}
		<div class="reading" role="status"><span class="label">{$t("Estado de lectura", "Reading status")}</span><p>{isTauri ? ocrStatus || $t("Volvé a AoE4 para ver la lectura.", "Return to AoE4 to see readings.") : $t("OCR disponible en la app de Windows.", "OCR is available in the Windows app.")}</p></div>
		<p class="help footnote">{$t("Necesita AoE4 en primer plano y tres lecturas que confirmen la condición (hasta 200 aldeanos). Los inactivos cuentan para el total, pero no para cumplir un recurso. Un traslado exige ver bajar el origen y subir el destino. Construir o subir de edad se confirma con AvPág. Si falta una lectura, espera.", "Advance after three readings confirm the rule with AoE4 in the foreground. The clock is optional. Idle villagers count only toward the total, up to 200 villagers. Transfers require the source to decrease and the destination to increase. Press Page Down to confirm buildings or age-ups. Missing readings pause advancement.")}</p>
	</div>
{/snippet}

<style>
	.theme-toggle { font-weight: 600; }
	.theme-palette { display: flex; align-items: center; gap: 10px; margin: 12px 0 20px; color: var(--soft); }
	.palette-colors { display: inline-flex; overflow: hidden; border: 1px solid var(--line-strong); border-radius: 4px; }
	.palette-colors i { width: 22px; height: 20px; }
	fieldset:disabled { opacity: .45; }
	fieldset:disabled .swatch { cursor: default; }
	.mini-overlay.civilization-theme { background: var(--civ-surface); border: 1px solid var(--civ-border); }
	.settings {
		max-width: 900px;
		margin: 0 auto;
	}
	.settings-heading { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
	.settings-heading h2 { font-family: var(--font-num); font-size: 34px; line-height: 1.1; font-weight: 600; margin: 0; }
	.language { display: flex; align-items: center; gap: 10px; color: var(--soft); }
	.language select { width: auto; height: 34px; }
	nav { display: flex; flex-wrap: wrap; gap: 4px; border-bottom: 1px solid var(--line-strong); margin-bottom: 18px; }
	nav button { display: inline-flex; gap: 7px; align-items: center; padding: 10px 16px; border: 0; border-bottom: 2px solid transparent; border-radius: 6px 6px 0 0; background: transparent; color: var(--soft); font-weight: 600; cursor: pointer; }
	nav button:hover { background: var(--card); color: var(--text); }
	nav button[aria-current='page'] { border-bottom-color: var(--accent); background: var(--card); color: var(--accent); }
	.nav-warning { color: var(--late); font-size: 12px; }
	.settings-content { display: grid; gap: 14px; }
	section { border: 1px solid var(--line); border-radius: 10px; padding: 22px; background: var(--card); }
	h3 { margin: 0 0 12px; font-size: 17px; font-weight: 600; }
	h4 { font-size: 12px; color: var(--accent); margin: 24px 0 12px; }
	.actions { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin: 16px 0; }
	.help.inline { margin: 0; }
	details { border-top: 1px solid var(--line-strong); margin-top: 20px; padding-top: 14px; }
	summary { color: var(--dim); cursor: pointer; font-size: 13px; }
	details[open] summary { margin-bottom: 16px; }
	details .grid { margin-top: 12px; }
	.data-options { margin: 0; padding: 18px 22px; border: 1px solid var(--line); border-radius: 10px; background: var(--card); }
	.data-options summary { font-size: 14px; font-weight: 600; color: var(--text); }
	fieldset:disabled { opacity: .45; }
	select { width: 100%; min-width: 0; height: 38px; border: 1px solid var(--line-strong); border-radius: 6px; padding: 0 10px; background: var(--bg); }
	hr { border: 0; border-top: 1px solid var(--line-strong); margin: 22px 0; }
	.primary { min-height: 38px; padding: 8px 14px; background: var(--accent); border: 1px solid transparent; border-radius: 6px; color: #16191e; font-weight: 600; cursor: pointer; }
	.primary:disabled { opacity: .45; cursor: default; }
	.toggle-row { display: flex; align-items: center; justify-content: space-between; gap: 24px; cursor: pointer; }
	.toggle-row span { display: grid; gap: 4px; }
	.toggle-row small { color: var(--dim); }
	.manual-calibration > .toggle-row { margin: 14px 0; }
	.reading { padding: 14px 16px; background: var(--bg); border-left: 2px solid var(--accent); margin-top: 18px; }
	.reading p { margin: 6px 0 0; color: var(--soft); }
	.help.footnote { margin: 14px 0 0; }
	.region-size { font-family: var(--font-num); font-size: 18px; color: var(--soft); }
	.preview-strip { display: flex; align-items: center; justify-content: space-between; gap: 24px; padding: 22px; border-radius: 10px; background: #202a2b; border: 1px solid #344043; min-height: 154px; }
	.preview-caption { display: grid; gap: 5px; }
	.preview-caption strong { font-family: var(--font-num); font-size: 22px; font-weight: 500; }
	.preview-caption small { color: var(--dim); }
	.mini-overlay { width: 330px; max-width: 60%; flex-shrink: 0; background: var(--bg); border: 1px solid var(--line-strong); border-top: 2px solid var(--preview-accent); border-radius: 6px; padding: 12px 14px; box-shadow: 0 6px 20px #0003; }
	.mini-title { display: flex; justify-content: space-between; gap: 12px; font-size: 13px; }
	.mini-title strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.mini-title > span { color: var(--preview-accent); font-family: var(--font-num); }
	.mini-step { display: flex; align-items: center; gap: 12px; margin: 10px 0; }
	.mini-step b { color: var(--preview-accent); font-family: var(--font-num); font-size: 26px; line-height: 1; }
	.mini-step small { display: block; font-size: 10px; font-family: var(--font); margin-top: 4px; }
	.mini-step > span { font-size: 13px; }
	.mini-footer { display: flex; justify-content: space-between; gap: 8px; border-top: 1px solid var(--line); padding-top: 8px; font-size: 11px; color: var(--dim); }
	.mini-overlay.compact .mini-step { margin: 8px 0 0; }
	.help {
		margin: 0 0 14px;
		font-size: 13px;
		color: var(--dim);
	}
	.keys {
		display: grid;
		grid-template-columns: minmax(180px, 1fr) minmax(260px, 1fr);
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
	.lists > div + div { border-top: 1px solid var(--line-strong); padding-top: 20px; }
	@media (max-width: 1050px) {
		section, .preview-strip { padding: 18px; }
		.grid { gap: 16px; }
	}
	@media (max-width: 760px) {
		nav button { padding: 8px 10px; }
		.grid, .keys { grid-template-columns: 1fr; }
		.preview-strip { flex-direction: column; align-items: stretch; }
		.mini-overlay { max-width: 100%; width: 100%; }
	}
	:global(.settings :focus-visible) {
		outline: 2px solid var(--accent);
		outline-offset: 1px;
	}
</style>
