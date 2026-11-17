<script lang="ts">
	import { t, locale, hotkeyLabel, label } from '$lib/i18n';
	import { onMount } from 'svelte';
	import type { Snippet } from 'svelte';
	import { isTauri, monitorOptions, on, openRegionSelector, send } from '$lib/bridge';
	import HotkeyInput from './HotkeyInput.svelte';
	import ListEditor from './ListEditor.svelte';
	import SetupView from './SetupView.svelte';
	import type { SetupStatus } from '$lib/setup';
	import { HOTKEY_ACTIONS, type Build, type Corner, type Settings } from '$lib/types';

	interface Props {
		settings: Settings;
		/** Acciones cuya tecla no se pudo registrar en el sistema. */
		failedHotkeys: string[];
		backup: Snippet;
		activeBuild: Build | null;
		setupStatus: SetupStatus | null;
		builds: Build[];
		onUse: (id:string)=>void;
	}
	let { settings = $bindable(), failedHotkeys, backup, activeBuild, setupStatus, builds, onUse }: Props = $props();
	const sections = $derived([
		{ id: 'setup', title: $t("Setup automático", "Automatic setup"), detail: $t("Preparar la partida", "Prepare your match") },
		{ id: 'overlay', title: 'Overlay', detail: $t("Posición y apariencia", "Position and appearance") },
		{ id: 'keys', title: $t("Atajos", "Shortcuts"), detail: $t("Teclado y práctica", "Keyboard and practice") },
		{ id: 'ocr', title: $t("Avance automático", "Automatic advancement"), detail: $t("Aldeanos por recurso", "Villagers by resource") },
		{ id: 'lists', title: $t("Listas", "Lists"), detail: $t("Opciones de tus builds", "Build options") },
		{ id: 'backup', title: $t("Respaldo", "Backup"), detail: $t("Exportar e importar", "Export and import") }
	]);
	let section = $state('setup');
	const currentSection = $derived(sections.find(s => s.id === section)!);
	const shortcutGroups = $derived([
		{ title: $t("Pasos y builds", "Steps and builds"), actions: ['next', 'prev', 'cycleBuild'] },
		{ title: $t("Reloj y práctica", "Clock and practice"), actions: ['start', 'pauseClock', 'clockPlus', 'clockMinus', 'resetClock', 'resetPractice', 'finishPractice'] },
		{ title: 'Overlay', actions: ['toggleVisible', 'toggleCompact', 'editPosition'] }
	] as const);
	let monitors = $state<Awaited<ReturnType<typeof monitorOptions>>>([]);
	let ocrStatus = $state('');
	let editing = $state(false);
	let ocrMonitor = $state(0);
	let selectionError = $state('');
	async function selectRegion(target: 'workers' | 'idle' = 'workers') {
		selectionError = '';
		try { await openRegionSelector(Number(ocrMonitor), target); }
		catch(e) { selectionError = String(e); }
	}
	onMount(() => {
		void monitorOptions().then(value => monitors = value);
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

	const duplicated = $derived(
		HOTKEY_ACTIONS.filter(
			(a) => settings.hotkeys[a] && HOTKEY_ACTIONS.some((b) => b !== a && settings.hotkeys[b] === settings.hotkeys[a])
		)
	);
</script>

<div class="settings">
	<aside class="settings-nav">
		<div class="nav-heading">{$t("Ajustes", "Settings")}</div>
		<label class="field" style="margin: 0 12px 16px">
			<span class="label">{$t('Idioma', 'Language')}</span>
			<select bind:value={settings.language}>
				<option value="en" lang="en">English</option>
				<option value="es" lang="es">Español</option>
			</select>
		</label>
		<nav aria-label={$t("Categorías de ajustes", "Settings categories")}>
			{#each sections as item}
				<button type="button" aria-current={section === item.id ? 'page' : undefined} onclick={() => section = item.id}>
					<span>{item.title}</span><small>{item.detail}</small>
					{#if item.id === 'keys' && (duplicated.length || failedHotkeys.length)}<span class="nav-warning">{$t("Revisar atajos", "Review shortcuts")}</span>{/if}
				</button>
			{/each}
		</nav>
		<p class="nav-note">{$t("Los cambios se aplican automáticamente.", "Changes apply automatically.")}</p>
	</aside>
	<div class="settings-content">
		<header class="page-heading"><div><span class="label">{$t("Configuración", "Settings")}</span><h2>{currentSection.title}</h2><p>{currentSection.detail}</p></div><span class="state-badge">{section === 'ocr' ? (settings.ocr.enabled ? $t("OCR activado", "OCR on") : $t("OCR desactivado", "OCR off")) : 'AoE4 Overlay'}</span></header>
	{#if section === 'setup'}
	<SetupView bind:settings status={setupStatus} {builds} {onUse}/>
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
		<div class="mini-overlay" class:compact={settings.compact} style="--preview-accent: {settings.accent}; opacity: {settings.opacity}">
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
			<fieldset>
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
	{:else if section === 'ocr'}
	<section>
		<div class="section-title"><h3>{$t("Avanzar por total de aldeanos", "Advance on villager counts")}</h3><span class="state-badge experimental">Experimental</span></div>
		<label class="toggle-row"><span><strong>{$t("Leer aldeanos e inactivos", "Read villager and idle counters")}</strong><small>{$t("Comprueba la condición del paso actual: total, mínimos por recurso o traslado. Revisá «Avance del paso» en el editor.", "Checks the current step’s rule for villager totals, resource minimums, or transfers. Review the rule in the build editor.")}</small></span><input type="checkbox" role="switch" disabled={!isTauri || settings.ocr.source !== 'workers' || !settings.ocr.idleRegion} bind:checked={settings.ocr.enabled} /></label>
		{#if settings.ocr.source !== 'workers' || !settings.ocr.idleRegion}<p class="help footnote">{$t("Primero seleccioná las dos regiones: los cuatro recursos y el número de inactivos. La región del contador de población ya no se utiliza.", "Select both regions first. Use the four resource counters and idle counter.")}</p>{/if}
	</section>
	<section>
		<h3>{$t("Área de lectura", "Reading area")}</h3>
		<p class="help">{$t('Marcá solo la columna de', 'Select only the column of')} <strong>{$t('cuatro números junto a los íconos de aldeanos', 'four numbers next to the villager icons')}</strong>{$t(', en orden: comida, madera, oro y piedra. Incluí los ceros grises. Dejá afuera los íconos, los recursos acumulados, los inactivos y el contador de población.', ', in order: food, wood, gold, and stone. Include gray zeros. Exclude icons, resource totals, idle villagers, and the population counter.')}</p>
		{#if monitors.length > 1}
			<label class="field"><span class="label">{$t("Monitor del juego", "Game monitor")}</span><select bind:value={ocrMonitor}>{#each monitors as monitor, i}<option value={i}>{monitor.name || `Monitor ${i+1}`} · {monitor.size.width} × {monitor.size.height}</option>{/each}</select></label>
		{/if}
		<div class="actions"><button type="button" class="primary" disabled={!isTauri || !monitors.length} onclick={() => void selectRegion()}>{$t("Seleccionar los cuatro contadores", "Select the four resource counters")}</button><span class="region-size">{settings.ocr.source === 'workers' ? `${settings.ocr.width} × ${settings.ocr.height} px` : $t("Pendiente de calibrar", "Calibration needed")}</span></div>
		<p class="help">{$t("Con AoE4 en ventana sin bordes, dibujá la columna dejando un número centrado en cada franja. Guardá el rectángulo o cancelá con Esc.", "With AoE4 in borderless windowed mode, draw a region with one number centered in each row. Save the region or press Esc to cancel.")}</p>
		<div class="actions"><button type="button" disabled={!isTauri || !monitors.length} onclick={() => void selectRegion('idle')}>{$t("Seleccionar aldeanos inactivos", "Select idle villager counter")}</button><span class="region-size">{settings.ocr.idleRegion ? `${settings.ocr.idleRegion.width} × ${settings.ocr.idleRegion.height} px` : $t("Pendiente de calibrar", "Calibration needed")}</span></div>
		<p class="help">{$t("Marcá aparte el número junto al aldeano con “Z”, arriba de los recursos. Dejá espacio para tres cifras y excluí el ícono y la población.", "Select the number next to the villager with a “Z” above the resources. Leave room for three digits and exclude the icon and population counter.")}</p>
		{#if selectionError}<p class="warn" role="alert">{selectionError}</p>{/if}
		<div class="reading" role="status"><span class="label">{$t("Estado de lectura", "Reading status")}</span><p>{isTauri ? ocrStatus || $t("Iniciá el reloj en AoE4 para ver la lectura.", "Start the AoE4 clock to see readings.") : $t("OCR disponible en la app de Windows.", "OCR is available in the Windows app.")}</p></div>
		<p class="help footnote">{$t("Necesita el reloj en marcha, AoE4 en primer plano y tres lecturas que confirmen la condición (hasta 200 aldeanos). Los inactivos cuentan para el total, pero no para cumplir un recurso. Un traslado exige ver bajar el origen y subir el destino. Construir o subir de edad se confirma con AvPág. Si falta una lectura, espera.", "Advance after three readings confirm the rule with the clock running and AoE4 in the foreground. Idle villagers count only toward the total, up to 200 villagers. Transfers require the source to decrease and the destination to increase. Press Page Down to confirm buildings or age-ups. Missing readings pause advancement.")}</p>
	</section>
	{:else if section === 'lists'}
	<section>
		<h3>{$t("Organizá tus builds", "Organize your builds")}</h3>
		<p class="help">{$t("Opciones que aparecen al cargar y filtrar builds. Sacar una opción no modifica los builds que ya la usan.", "These options appear when you edit and filter builds. Removing an option preserves existing builds that use it.")}</p>
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
	</section>
	{:else if section === 'backup'}
		{@render backup()}
	{/if}
	</div>
</div>

<style>
	.settings {
		display: grid;
		grid-template-columns: 200px minmax(0, 1fr);
		align-items: start;
		gap: 32px;
		max-width: 1240px;
		margin: 0 auto;
	}
	.settings-nav { position: sticky; top: 0; }
	.nav-heading { font-family: var(--font-num); font-size: 28px; font-weight: 600; margin: 0 12px 20px; }
	nav { display: grid; gap: 5px; }
	nav button { display: grid; gap: 3px; text-align: left; border: 1px solid transparent; border-left: 3px solid transparent; border-radius: 0 7px 7px 0; background: transparent; padding: 12px; cursor: pointer; }
	nav button > span:first-child { font-weight: 600; }
	nav small, .nav-note { color: var(--dim); font-size: 12px; }
	nav button:hover { background: var(--card); }
	nav button[aria-current='page'] { border-left-color: var(--accent); background: var(--card); color: var(--accent); }
	.nav-note { margin: 22px 12px; line-height: 1.6; }
	.nav-warning { color: var(--late); font-size: 11px; }
	.settings-content { min-width: 0; display: grid; gap: 18px; }
	.page-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding-bottom: 16px; border-bottom: 1px solid var(--line); }
	.page-heading h2 { font-family: var(--font-num); font-size: 30px; line-height: 1.15; font-weight: 600; margin: 4px 0; }
	.page-heading p { margin: 0; color: var(--dim); }
	.state-badge { border: 1px solid var(--line-strong); color: var(--dim); border-radius: 4px; padding: 4px 8px; font-size: 11px; white-space: nowrap; }
	.experimental { color: var(--accent); }
	section { border: 1px solid var(--line); border-radius: 10px; padding: 22px; background: var(--card); }
	h3 { margin: 0 0 12px; font-size: 17px; font-weight: 600; }
	h4 { font-size: 12px; color: var(--accent); margin: 24px 0 12px; }
	.section-title, .actions { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
	.section-title { justify-content: space-between; margin-bottom: 12px; }
	.section-title h3 { margin: 0; }
	.actions { margin: 16px 0; }
	.help.inline { margin: 0; }
	details { border-top: 1px solid var(--line-strong); margin-top: 20px; padding-top: 14px; }
	summary { color: var(--dim); cursor: pointer; font-size: 13px; }
	details[open] summary { margin-bottom: 16px; }
	details .grid { margin-top: 12px; }
	fieldset:disabled { opacity: .45; }
	select { width: 100%; min-width: 0; height: 38px; border: 1px solid var(--line-strong); border-radius: 6px; padding: 0 10px; background: var(--bg); }
	hr { border: 0; border-top: 1px solid var(--line-strong); margin: 22px 0; }
	.primary { min-height: 38px; padding: 8px 14px; background: var(--accent); border: 1px solid transparent; border-radius: 6px; color: #16191e; font-weight: 600; cursor: pointer; }
	.primary:disabled { opacity: .45; cursor: default; }
	.toggle-row { display: flex; align-items: center; justify-content: space-between; gap: 24px; cursor: pointer; }
	.toggle-row span { display: grid; gap: 4px; }
	.toggle-row small { color: var(--dim); }
	.toggle-row input { appearance: none; width: 40px; height: 24px; flex-shrink: 0; border: 1px solid var(--dim); border-radius: 20px; background: var(--bg); cursor: pointer; position: relative; }
	.toggle-row input::before { content: ''; display: block; width: 16px; height: 16px; border-radius: 50%; background: var(--dim); position: absolute; top: 3px; left: 3px; }
	.toggle-row input:checked { border-color: var(--accent); background: var(--accent); }
	.toggle-row input:checked::before { left: 19px; background: var(--bg); }
	.toggle-row input:disabled { opacity: .5; cursor: default; }
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
		.settings { grid-template-columns: 168px minmax(0, 1fr); gap: 22px; }
		section, .preview-strip { padding: 18px; }
		.grid { gap: 16px; }
	}
	@media (max-width: 760px) {
		.settings { grid-template-columns: 1fr; }
		.settings-nav { position: static; }
		.nav-heading, .nav-note { display: none; }
		nav { display: flex; flex-wrap: wrap; }
		nav button { padding: 8px 10px; }
		nav small { display: none; }
		.grid, .keys { grid-template-columns: 1fr; }
		.preview-strip { flex-direction: column; align-items: stretch; }
		.mini-overlay { max-width: 100%; width: 100%; }
		.state-badge { white-space: normal; }
	}
	:global(.settings :focus-visible) {
		outline: 2px solid var(--accent);
		outline-offset: 1px;
	}
</style>
