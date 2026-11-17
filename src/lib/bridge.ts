// Todo lo que toca a Tauri pasa por acá. Fuera de Tauri (abriendo `npm run dev` en un
// navegador) usa localStorage y BroadcastChannel, así la interfaz se puede probar sin compilar.

import { emit, listen } from '@tauri-apps/api/event';
import {
	getCurrentWindow,
	currentMonitor,
	primaryMonitor,
	PhysicalPosition,
	PhysicalSize
} from '@tauri-apps/api/window';
import { register, unregisterAll } from '@tauri-apps/plugin-global-shortcut';
import { load, type Store } from '@tauri-apps/plugin-store';

import { defaultData, normalize } from './defaults';
import { eventToHotkey } from './hotkeys';
import type { AppData, Corner } from './types';
import { uid } from './util';

export const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

const STORE_FILE = 'aoe4-overlay.json';
const LOCAL_KEY = 'aoe4-overlay-data';
const SELF = uid();

// ---------- Datos ----------

let storePromise: Promise<Store> | null = null;
const store = (): Promise<Store> => (storePromise ??= load(STORE_FILE, { autoSave: false }));

export async function loadData(): Promise<AppData> {
	try {
		if (isTauri) return normalize(await (await store()).get<AppData>('data'));
		const raw = localStorage.getItem(LOCAL_KEY);
		return normalize(raw ? JSON.parse(raw) : undefined);
	} catch (err) {
		console.error('No se pudieron leer los datos guardados', err);
		return defaultData();
	}
}

/** Guarda y avisa a la otra ventana. Pasar un objeto plano (usar `$state.snapshot`). */
export async function saveData(data: AppData): Promise<void> {
	if (isTauri) {
		const s = await store();
		await s.set('data', data);
		await s.save();
	} else {
		localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
	}
	// Los datos viajan en el mensaje: la otra ventana no depende de releer el almacenamiento.
	await send('data-changed', data);
}

/** Avisa cuando la otra ventana guardó cambios. */
export function onDataChanged(handler: (data: AppData) => void): () => void {
	return on('data-changed', (payload) => handler(normalize(payload)));
}

// ---------- Mensajes entre ventanas ----------

interface Envelope {
	from: string;
	name: string;
	payload: unknown;
}

const channel =
	!isTauri && typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('aoe4-overlay') : null;

export async function send(name: string, payload: unknown = null): Promise<void> {
	const envelope: Envelope = { from: SELF, name, payload };
	if (isTauri) await emit('aoe4-bus', envelope);
	else channel?.postMessage(envelope);
}

/** Escucha mensajes de la otra ventana (nunca los propios). Devuelve la función para dejar de escuchar. */
export function on(name: string, handler: (payload: unknown) => void): () => void {
	const accept = (envelope: Envelope) => {
		if (envelope && envelope.name === name && envelope.from !== SELF) handler(envelope.payload);
	};
	if (isTauri) {
		const unlisten = listen<Envelope>('aoe4-bus', (event) => accept(event.payload));
		return () => void unlisten.then((stop) => stop());
	}
	const onMessage = (event: MessageEvent<Envelope>) => accept(event.data);
	channel?.addEventListener('message', onMessage);
	return () => channel?.removeEventListener('message', onMessage);
}

// ---------- Ventana del overlay ----------

/** Los clics atraviesan el overlay y llegan al juego. */
export async function makeClickThrough(): Promise<void> {
	if (!isTauri) return;
	await getCurrentWindow().setIgnoreCursorEvents(true);
}

/** Ajusta la ventana al tamaño del contenido y la pega a la esquina elegida del monitor. */
export async function placeOverlay(
	cssWidth: number,
	cssHeight: number,
	corner: Corner,
	offsetX: number,
	offsetY: number
): Promise<void> {
	if (!isTauri) return;
	const monitor = (await currentMonitor()) ?? (await primaryMonitor());
	if (!monitor) return;
	const factor = monitor.scaleFactor;
	const width = Math.ceil(cssWidth * factor);
	const height = Math.ceil(cssHeight * factor);
	const dx = Math.round((Number(offsetX) || 0) * factor);
	const dy = Math.round((Number(offsetY) || 0) * factor);
	const x = corner.endsWith('left')
		? monitor.position.x + dx
		: monitor.position.x + monitor.size.width - width - dx;
	const y = corner.startsWith('top')
		? monitor.position.y + dy
		: monitor.position.y + monitor.size.height - height - dy;
	const win = getCurrentWindow();
	await win.setSize(new PhysicalSize(width, height));
	await win.setPosition(new PhysicalPosition(x, y));
}

// ---------- Teclas globales ----------

let browserListener: ((e: KeyboardEvent) => void) | null = null;

/**
 * Registra las teclas (acción → combinación). Devuelve las acciones que no se pudieron
 * registrar, por ejemplo porque otro programa ya usa esa combinación.
 */
export async function bindHotkeys(
	map: Record<string, string>,
	onAction: (action: string) => void
): Promise<string[]> {
	const failed: string[] = [];
	const entries = Object.entries(map).filter(([, combo]) => combo);

	if (isTauri) {
		await unregisterAll().catch(() => {});
		for (const [action, combo] of entries) {
			try {
				await register(combo, (event) => {
					if (event.state === 'Pressed') onAction(action);
				});
			} catch (err) {
				console.warn(`No se pudo registrar ${combo}`, err);
				failed.push(action);
			}
		}
		return failed;
	}

	if (browserListener) window.removeEventListener('keydown', browserListener);
	browserListener = (e) => {
		const combo = eventToHotkey(e);
		const match = combo && entries.find(([, c]) => c === combo);
		if (match) {
			e.preventDefault();
			onAction(match[0]);
		}
	};
	window.addEventListener('keydown', browserListener);
	return failed;
}

export async function unbindHotkeys(): Promise<void> {
	if (isTauri) await unregisterAll().catch(() => {});
	else if (browserListener) {
		window.removeEventListener('keydown', browserListener);
		browserListener = null;
	}
}
