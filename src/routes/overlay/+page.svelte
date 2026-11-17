<script lang="ts">
	import { onMount } from 'svelte';

	import Compact from '$lib/components/Compact.svelte';
	import Panel from '$lib/components/Panel.svelte';
	import {
		bindHotkeys,
		isTauri,
		loadData,
		makeClickThrough,
		on,
		onDataChanged,
		placeOverlay,
		saveData,
		send,
		unbindHotkeys
	} from '$lib/bridge';
	import { clampIndex, indexForPop } from '$lib/steps';
	import type { AppData, HotkeyAction } from '$lib/types';

	let data = $state<AppData | null>(null);
	let stepIndex = $state(0);
	let visible = $state(true);
	let startedAt = $state<number | null>(null);
	let now = $state(Date.now());
	let suspended = $state(false);
	let root = $state<HTMLDivElement>();
	let failedHotkeys: string[] = [];
	let lastActiveId: string | null = null;

	const settings = $derived(data?.settings ?? null);
	const build = $derived(
		data ? (data.builds.find((b) => b.id === data!.settings.activeBuildId) ?? data.builds[0] ?? null) : null
	);
	const index = $derived(clampIndex(build, stepIndex));
	const elapsed = $derived(startedAt === null ? null : Math.max(0, Math.floor((now - startedAt) / 1000)));
	const hotkeyKey = $derived(settings ? JSON.stringify(settings.hotkeys) : '');

	function applyData(incoming: AppData) {
		data = incoming;
		const activeId = incoming.settings.activeBuildId;
		if (activeId !== lastActiveId) {
			// Se eligió otro build desde la ventana de gestión: arranca de cero.
			lastActiveId = activeId;
			stepIndex = 0;
			startedAt = null;
		}
	}

	async function persist() {
		if (data) await saveData($state.snapshot(data) as AppData);
	}

	const actions: Record<HotkeyAction, () => void> = {
		next() {
			if (build) stepIndex = clampIndex(build, index + 1);
		},
		prev() {
			if (build) stepIndex = clampIndex(build, index - 1);
		},
		start() {
			stepIndex = 0;
			startedAt = Date.now();
			now = Date.now();
			visible = true;
		},
		toggleVisible() {
			visible = !visible;
		},
		toggleCompact() {
			if (!data) return;
			data.settings.compact = !data.settings.compact;
			void persist();
		},
		cycleBuild() {
			if (!data || !build) return;
			const sameCiv = data.builds.filter((b) => b.civ === build.civ);
			const pool = sameCiv.length > 1 ? sameCiv : data.builds;
			if (pool.length < 2) return;
			const target = pool[(pool.findIndex((b) => b.id === build.id) + 1) % pool.length];
			// Mantiene el punto de la partida: busca el paso que corresponde a la población actual.
			const pop = build.steps[index]?.pop ?? null;
			lastActiveId = target.id;
			data.settings.activeBuildId = target.id;
			stepIndex = indexForPop(target, pop);
			void persist();
		}
	};

	onMount(() => {
		void makeClickThrough();
		void loadData().then(applyData);

		const stops = [
			onDataChanged(applyData),
			on('hotkeys-suspend', (value) => (suspended = Boolean(value))),
			on('hotkey-status-request', () => void send('hotkey-status', failedHotkeys)),
			// Desde el editor: saltar a un paso para ver cómo queda.
			on('goto-step', (value) => {
				stepIndex = clampIndex(build, Number(value) || 0);
				visible = true;
			})
		];
		const tick = setInterval(() => {
			if (startedAt !== null) now = Date.now();
		}, 250);

		return () => {
			stops.forEach((stop) => stop());
			clearInterval(tick);
			void unbindHotkeys();
		};
	});

	// Teclas globales: se vuelven a registrar solo cuando cambia la configuración.
	// Mientras se captura una tecla nueva en Ajustes quedan suspendidas.
	$effect(() => {
		if (!hotkeyKey) return;
		if (suspended) {
			void unbindHotkeys();
			return;
		}
		const map = JSON.parse(hotkeyKey) as Record<string, string>;
		void bindHotkeys(map, (action) => actions[action as HotkeyAction]?.()).then((failed) => {
			failedHotkeys = failed;
			void send('hotkey-status', failed);
		});
	});

	// La ventana se ajusta al contenido y se pega a la esquina configurada.
	$effect(() => {
		if (!root || !settings) return;
		const { corner, offsetX, offsetY } = settings;
		const place = () => {
			const rect = root!.getBoundingClientRect();
			if (rect.width > 0 && rect.height > 0) {
				void placeOverlay(rect.width, rect.height, corner, offsetX, offsetY);
			}
		};
		place();
		const observer = new ResizeObserver(place);
		observer.observe(root);
		return () => observer.disconnect();
	});
</script>

<svelte:head>
	<title>AoE4 Overlay</title>
</svelte:head>

<!-- Oculto = no se dibuja nada: la ventana sigue ahí, transparente y sin recibir clics,
     así mostrar/ocultar nunca le saca el foco al juego. -->
{#if data && settings && visible}
	<div class="stage" class:browser={!isTauri}>
		<div bind:this={root} class="root" style="zoom: {settings.scale}; opacity: {settings.opacity}">
			{#if !build}
				<div class="notice">No hay builds cargados. Creá uno en la ventana de gestión.</div>
			{:else if settings.compact}
				<Compact {build} stepIndex={index} accent={settings.accent} {elapsed} showClock={settings.showClock} />
			{:else}
				<Panel
					{build}
					stepIndex={index}
					accent={settings.accent}
					{elapsed}
					showClock={settings.showClock}
					hotkeys={settings.hotkeys}
				/>
			{/if}
		</div>
	</div>
{/if}

<style>
	:global(html),
	:global(body) {
		overflow: hidden;
	}
	.stage {
		display: flex;
		align-items: flex-start;
	}
	/* Solo al probar en un navegador: fondo para que el panel se vea como sobre el juego. */
	.stage.browser {
		min-height: 100vh;
		padding: 32px;
		background: #2a3226;
	}
	.root {
		display: inline-block;
		line-height: 0;
	}
	.root > :global(*) {
		line-height: normal;
	}
	.notice {
		width: 320px;
		padding: 16px 18px;
		background: var(--bg);
		border: 1px solid var(--line);
		border-radius: 10px;
		font-size: 14px;
		line-height: 20px;
		color: var(--soft);
	}
</style>
