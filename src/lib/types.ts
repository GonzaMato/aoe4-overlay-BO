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

export type AdvanceRule =
	| { kind: 'auto' }
	| { kind: 'manual' }
	| { kind: 'total'; count: number }
	| { kind: 'resources'; minimum: Partial<Villagers> }
	| { kind: 'transfer'; from: Resource; to: Resource; count: number };

export interface Subtask {
	id: string;
	action: string;
	note: string;
	advance: AdvanceRule;
}

export interface Step {
	id: string;
	/** Población de referencia (incluye militares); no es un objetivo del OCR. */
	pop: number | null;
	/** Tiempo objetivo en segundos de partida. */
	time: number | null;
	action: string;
	note: string;
	villagers: Villagers;
	/** Ausente/auto: sugerir por instrucción y reparto. Se evalúa el paso actual. */
	advance?: AdvanceRule;
	/** Secuencia explícita; el criterio del padre solo se usa sin subtareas. */
	subtasks?: Subtask[];
}

export interface Build {
	provenance?: { packId: string; author: string; source: string; reviewedAt: string };
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
	'cycleBuild',
	'editPosition',
	'resetPractice',
	'resetClock',
	'pauseClock',
	'clockPlus',
	'clockMinus',
	'finishPractice'
] as const;
export type HotkeyAction = (typeof HOTKEY_ACTIONS)[number];

export const HOTKEY_LABEL: Record<HotkeyAction, string> = {
	next: 'Paso siguiente',
	prev: 'Paso anterior',
	start: 'Iniciar / reanudar reloj (conserva el paso)',
	editPosition: 'Editar posición del overlay',
	resetPractice: 'Nueva práctica (paso 1 y reloj en 0:00)',
	resetClock: 'Reiniciar reloj (conserva el paso)',
	pauseClock: 'Pausar / reanudar reloj',
	clockPlus: 'Reloj +5 segundos',
	clockMinus: 'Reloj −5 segundos',
	finishPractice: 'Terminar práctica',
	toggleVisible: 'Mostrar / ocultar overlay',
	toggleCompact: 'Modo compacto',
	cycleBuild: 'Cambiar de build (misma civilización)'
};

export type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface Settings {
	language: import('./i18n').Language;
	onboarding: import('./onboarding').OnboardingState;
	setup: import('./setup').SetupSettings;
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
	position: { x: number; y: number } | null;
	ocr: { enabled: boolean; source: 'workers' | null; x: number; y: number; width: number; height: number; idleRegion: { x: number; y: number; width: number; height: number } | null };
}

export interface Arrival { stepId: string; index: number; action: string; target: number | null; elapsed: number; }
export interface Practice { id: string; buildId: string; buildName: string; startedAt: number; finishedAt: number | null; arrivals: Arrival[]; }

export interface AppData {
	version: 1;
	builds: Build[];
	settings: Settings;
	practices: Practice[];
}
