export const RESOURCES = ['food', 'wood', 'gold', 'stone'] as const;
export type Resource = (typeof RESOURCES)[number];

export const RES_LABEL: Record<Resource, string> = {
	food: 'Comida',
	wood: 'Madera',
	gold: 'Oro',
	stone: 'Piedra'
};

/** Reparto de aldeanos al que hay que llegar en un paso. */
export type Villagers = Record<Resource, number>;

export interface Step {
	id: string;
	/** Población que dispara el paso (incluye al scout). */
	pop: number | null;
	/** Tiempo objetivo en segundos de partida. */
	time: number | null;
	action: string;
	note: string;
	villagers: Villagers;
}

export interface Build {
	id: string;
	name: string;
	civ: string;
	mode: string;
	/** Tipo de mapa; vacío = cualquiera. */
	map: string;
	steps: Step[];
}

export const HOTKEY_ACTIONS = [
	'next',
	'prev',
	'start',
	'toggleVisible',
	'toggleCompact',
	'cycleBuild'
] as const;
export type HotkeyAction = (typeof HOTKEY_ACTIONS)[number];

export const HOTKEY_LABEL: Record<HotkeyAction, string> = {
	next: 'Paso siguiente',
	prev: 'Paso anterior',
	start: 'Iniciar partida (paso 1 y reloj en 0:00)',
	toggleVisible: 'Mostrar / ocultar overlay',
	toggleCompact: 'Modo compacto',
	cycleBuild: 'Cambiar de build (misma civilización)'
};

export type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface Settings {
	hotkeys: Record<HotkeyAction, string>;
	corner: Corner;
	offsetX: number;
	offsetY: number;
	scale: number;
	opacity: number;
	accent: string;
	compact: boolean;
	showClock: boolean;
	modes: string[];
	maps: string[];
	civs: string[];
	/** Build predeterminado por `civ|modo`. */
	defaults: Record<string, string>;
	activeBuildId: string | null;
}

export interface AppData {
	version: 1;
	builds: Build[];
	settings: Settings;
}
