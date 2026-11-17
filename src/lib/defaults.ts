import starterPack from '../../static/builds/starter-pack.json' with { type: 'json' };
import type { AppData, Build, Settings, Step, Villagers } from './types';
import { HOTKEY_ACTIONS } from './types';
import { uid } from './util';
import { setupDefaults, normalizeSetup } from './setup';
import { validAdvance, copyAdvance } from './advance';
import { validSubtasks, copySubtasks } from './subtasks';

const v = (food: number, wood: number, gold: number, stone: number): Villagers => ({
	food,
	wood,
	gold,
	stone
});

const step = (
	pop: number | null,
	time: number | null,
	action: string,
	note: string,
	villagers: Villagers
): Step => ({ id: uid(), pop, time, action, note, villagers });

export function defaultSettings(): Settings {
	return {
		setup: setupDefaults(),
		onboarding: 'pending',
		hotkeys: {
			next: 'PageDown',
			prev: 'PageUp',
			start: 'Ctrl+Alt+KeyS',
			toggleVisible: 'Ctrl+Alt+KeyH',
			toggleCompact: 'Ctrl+Alt+KeyC',
			cycleBuild: 'Ctrl+Alt+KeyB',
			editPosition: 'Ctrl+Alt+KeyE', resetPractice: 'Ctrl+Alt+KeyR', resetClock: '',
			pauseClock: 'Ctrl+Alt+KeyP', clockPlus: 'Ctrl+Alt+ArrowRight',
			clockMinus: 'Ctrl+Alt+ArrowLeft', finishPractice: 'Ctrl+Alt+KeyF'
		},
		corner: 'top-right',
		offsetX: 40,
		offsetY: 96,
		scale: 1,
		opacity: 0.94,
		accent: '#F2B33D',
		compact: false,
		showClock: true,
		modes: ['1v1', 'Equipos'],
		maps: ['Tierra', 'Agua', 'Híbrido'],
		// Lista de sugerencias editable desde Ajustes: agregá las civilizaciones que falten.
		civs: [
			'Ingleses',
			'Franceses',
			'Sacro Imperio Romano Germánico',
			'Rus',
			'Mongoles',
			'Chinos',
			'Sultanato de Delhi',
			'Dinastía Abasí',
			'Otomanos',
			'Malienses',
			'Bizantinos',
			'Japoneses',
			'Orden del Dragón',
			'Legado de Zhu Xi',
			'Juana de Arco',
			'Ayubíes',
			'Caballeros Templarios',
			'Casa de Lancaster', 'Horda de Oro', 'Dinastía Macedónica', 'Daimio Sengoku',
			'Dinastía Tughlaq', 'Dinastía Jin', 'Vikingos', 'Escoceses'
		],
		defaults: {},
		activeBuildId: null,
		position: null,
		ocr: { enabled: false, source: null, x: 0, y: 0, width: 70, height: 212, idleRegion: null }
	};
}

export function defaultData(): AppData {
	const builds = starterPack.builds.map(b => normalizeBuild(b as unknown as Build));
	const settings = defaultSettings();
	settings.activeBuildId = builds[0].id;
	return { version: 1, builds, settings, practices: [] };
}

/** Completa lo que falte en datos guardados por versiones anteriores o editados a mano. */
export function normalize(raw: unknown): AppData {
	if (!raw || typeof raw !== 'object') return defaultData();
	const input = raw as Partial<AppData>;
	const base = defaultSettings();
	const settings: Settings = { ...base, ...(input.settings ?? {}) };
	settings.hotkeys = { ...base.hotkeys, ...(input.settings?.hotkeys ?? {}) };
	for (const action of HOTKEY_ACTIONS) {
		if (typeof settings.hotkeys[action] !== 'string') settings.hotkeys[action] = '';
	}
	settings.defaults = { ...(input.settings?.defaults ?? {}) };
	settings.setup = normalizeSetup(input.settings?.setup);
	settings.onboarding = ['pending','detecting','complete','skipped'].includes(input.settings?.onboarding ?? '') ? input.settings!.onboarding! : 'skipped';
	settings.ocr = { ...base.ocr, ...(input.settings?.ocr ?? {}) };
	if (!settings.ocr.idleRegion) settings.ocr.enabled = false;
	if (input.settings?.ocr?.source !== 'workers') {
		settings.ocr.source = null;
		settings.ocr.enabled = false;
	}

	const builds: Build[] = Array.isArray(input.builds) ? input.builds.map(normalizeBuild) : [];
	if (!builds.some((b) => b.id === settings.activeBuildId)) {
		settings.activeBuildId = builds[0]?.id ?? null;
	}
	return { version: 1, builds, settings, practices: Array.isArray(input.practices) ? input.practices : [] };
}

export function normalizeBuild(raw: Partial<Build>): Build {
	return {
		...(raw.provenance && ['packId','author','source','reviewedAt'].every(k=>typeof raw.provenance?.[k as keyof NonNullable<Build['provenance']>]==='string') ? {provenance:{packId:raw.provenance.packId,author:raw.provenance.author,source:raw.provenance.source,reviewedAt:raw.provenance.reviewedAt}} : {}),
		id: typeof raw.id === 'string' && raw.id ? raw.id : uid(),
		name: String(raw.name ?? 'Sin nombre'),
		civ: String(raw.civ ?? ''),
		mode: String(raw.mode ?? ''),
		map: String(raw.map ?? ''),
		steps: Array.isArray(raw.steps) ? raw.steps.map(normalizeStep) : []
	};
}

function num(value: unknown): number | null {
	return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function normalizeStep(raw: Partial<Step>): Step {
	const vill = (raw.villagers ?? {}) as Partial<Villagers>;
	return {
		...(raw.advance===undefined?{}:{advance:validAdvance(raw.advance)?copyAdvance(raw.advance):{kind:'manual' as const}}),
		...(raw.subtasks===undefined?{}:validSubtasks(raw.subtasks)?{subtasks:copySubtasks(raw.subtasks)}:{advance:{kind:'manual' as const}}),
		id: typeof raw.id === 'string' && raw.id ? raw.id : uid(),
		pop: num(raw.pop),
		time: num(raw.time),
		action: String(raw.action ?? ''),
		note: String(raw.note ?? ''),
		villagers: v(num(vill.food) ?? 0, num(vill.wood) ?? 0, num(vill.gold) ?? 0, num(vill.stone) ?? 0)
	};
}

export function newBuild(civ = '', mode = '', map = ''): Build {
	return {
		id: uid(),
		name: 'Build nuevo',
		civ,
		mode,
		map,
		steps: [step(7, null, '', '', v(6, 0, 0, 0))]
	};
}

/** Paso nuevo: arranca con el reparto del paso anterior para cargar solo lo que cambia. */
export function newStep(previous?: Step): Step {
	return step(
		previous?.pop != null ? previous.pop + 1 : null,
		null,
		'',
		'',
		previous ? { ...previous.villagers } : v(0, 0, 0, 0)
	);
}

export function cloneBuild(source: Build): Build {
	return {
		...source,
		id: uid(),
		name: `${source.name} (copia)`,
		steps: source.steps.map((s) => ({ ...s, id: uid(), villagers: { ...s.villagers }, ...(s.advance?{advance:copyAdvance(s.advance)}:{}), ...(s.subtasks?{subtasks:copySubtasks(s.subtasks,true)}:{}) }))
	};
}
