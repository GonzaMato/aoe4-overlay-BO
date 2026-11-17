import type { AppData, Build, Settings, Step, Villagers } from './types';
import { HOTKEY_ACTIONS } from './types';
import { uid } from './util';

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
		hotkeys: {
			next: 'PageDown',
			prev: 'PageUp',
			start: 'Ctrl+Alt+KeyS',
			toggleVisible: 'Ctrl+Alt+KeyH',
			toggleCompact: 'Ctrl+Alt+KeyC',
			cycleBuild: 'Ctrl+Alt+KeyB'
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
			'Casa de Lancaster'
		],
		defaults: {},
		activeBuildId: null
	};
}

/** Builds de ejemplo para que la app no arranque vacía. Los números son ilustrativos, no un build real. */
function sampleBuilds(): Build[] {
	const builds: Build[] = [
		{
			id: 'ejemplo-fast-castle',
			name: 'Ejemplo · Fast Castle',
			civ: 'Ingleses',
			mode: '1v1',
			map: '',
			steps: [
				step(7, null, '6 aldeanos a ovejas', 'El scout sale a buscar más ovejas.', v(6, 0, 0, 0)),
				step(10, 60, '3 aldeanos a oro', 'Campamento minero pegado al oro.', v(6, 0, 3, 0)),
				step(11, 80, '1 aldeano más a comida', '', v(7, 0, 3, 0)),
				step(
					14,
					150,
					'Casa + campamento maderero',
					'Los próximos 3 aldeanos van a madera.',
					v(7, 3, 3, 0)
				),
				step(
					17,
					210,
					'Subir a Edad Feudal',
					'2 aldeanos de comida construyen el landmark.',
					v(8, 4, 4, 0)
				),
				step(20, 300, 'Segundo campamento maderero', '', v(8, 6, 5, 0))
			]
		},
		{
			id: 'ejemplo-rush-feudal',
			name: 'Ejemplo · Rush feudal',
			civ: 'Franceses',
			mode: '1v1',
			map: '',
			steps: [
				step(7, null, '6 aldeanos a ovejas', '', v(6, 0, 0, 0)),
				step(9, 40, '2 aldeanos a oro', '', v(6, 0, 2, 0)),
				step(12, 100, 'Casa + 3 aldeanos a madera', '', v(6, 3, 2, 0)),
				step(14, 150, 'Subir a Edad Feudal', 'Establo apenas termina el landmark.', v(7, 3, 3, 0))
			]
		}
	];
	// Ids fijos: las dos ventanas generan los mismos datos iniciales en el primer arranque.
	for (const build of builds) {
		build.steps.forEach((s, i) => (s.id = `${build.id}-${i + 1}`));
	}
	return builds;
}

export function defaultData(): AppData {
	const builds = sampleBuilds();
	const settings = defaultSettings();
	settings.activeBuildId = builds[0].id;
	return { version: 1, builds, settings };
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

	const builds: Build[] = Array.isArray(input.builds) ? input.builds.map(normalizeBuild) : [];
	if (!builds.some((b) => b.id === settings.activeBuildId)) {
		settings.activeBuildId = builds[0]?.id ?? null;
	}
	return { version: 1, builds, settings };
}

export function normalizeBuild(raw: Partial<Build>): Build {
	return {
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
		steps: source.steps.map((s) => ({ ...s, id: uid(), villagers: { ...s.villagers } }))
	};
}
