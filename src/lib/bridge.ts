// Todo lo que toca a Tauri pasa por acá. Fuera de Tauri (abriendo `npm run dev` en un
// navegador) usa localStorage y BroadcastChannel, así la interfaz se puede probar sin compilar.

import { emit, listen } from '@tauri-apps/api/event';
import { invoke as nativeInvoke } from '@tauri-apps/api/core';
import { errorText } from './errors';
import type { Language } from './i18n';
async function invoke<T>(command:string,args?:Record<string,unknown>):Promise<T> {
	try { return await nativeInvoke<T>(command,args); } catch(error) { throw new Error(errorText(error)); }
}
export const syncLanguage = (language:Language) => isTauri ? invoke<void>('set_language',{language}).catch(console.error) : Promise.resolve();
export const startupEnabled = () => isTauri ? invoke<boolean | null>('startup_enabled') : Promise.resolve(null);
export const setStartupEnabled = (enabled: boolean) => invoke<void>('set_startup_enabled', { enabled });
import {
	getCurrentWindow,
	currentMonitor,
	primaryMonitor,
	availableMonitors,
	PhysicalPosition,
	PhysicalSize
} from '@tauri-apps/api/window';
import { register, unregisterAll } from '@tauri-apps/plugin-global-shortcut';
import { load, type Store } from '@tauri-apps/plugin-store';

import { defaultData, normalize, systemLanguage } from './defaults';
import { eventToHotkey } from './hotkeys';
import type { AppData, Corner, Settings } from './types';
import { uid } from './util';
import type { Rectangle } from './region';
import type { GameGeometry, GameInspection, SetupProfile } from './setup';

export const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

/** Keep the tray's hidden WebView eligible to receive events instead of being frozen. */
export function keepAlive(): () => void {
	let release: (() => void) | undefined;
	let stopped = false;
	if (isTauri && navigator.locks) {
		void navigator.locks.request(`aoe4-live-${SELF}`, () => new Promise<void>(resolve => {
			if (stopped) resolve(); else release = resolve;
		})).catch(console.error);
	}
	return () => { stopped = true; release?.(); };
}

const STORE_FILE = 'aoe4-overlay.json';
const LOCAL_KEY = 'aoe4-overlay-data';
const SELF = uid();

// ---------- Datos ----------

let storePromise: Promise<Store> | null = null;
const store = (): Promise<Store> => (storePromise ??= load(STORE_FILE, { autoSave: false }));

export async function loadData(): Promise<AppData> {
	try {
		const saved = isTauri
			? await (await store()).get<AppData>('data')
			: (raw => raw ? JSON.parse(raw) : undefined)(localStorage.getItem(LOCAL_KEY));
		// A first launch opens in the Windows language; saved data keeps the player's choice.
		return saved ? normalize(saved) : defaultData(systemLanguage());
	} catch (err) {
		console.error('No se pudieron leer los datos guardados', err);
		return defaultData(systemLanguage());
	}
}

/** Guarda y avisa a la otra ventana. Pasar un objeto plano (usar `$state.snapshot`). */
async function writeData(data: AppData): Promise<void> {
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

let saveQueue: Promise<void> = Promise.resolve();
export function saveData(data: AppData): Promise<void> {
	const snapshot = structuredClone(data);
	const next = saveQueue.catch(() => {}).then(() => writeData(snapshot));
	saveQueue = next; return next;
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

export const gameActive = () => isTauri ? invoke<boolean>('is_game_active') : Promise.resolve(true);
export const nativeDiagnostic = () => isTauri ? invoke<import('./diagnostics').NativeDiagnostic>('ocr_diagnostic') : Promise.resolve(null);
export const openReleases = () => isTauri ? invoke<void>('open_releases') : Promise.resolve(window.open('https://github.com/GonzaMato/aoe4-overlay-BO/releases','_blank','noopener,noreferrer'));
export const gameGeometry = () => isTauri ? invoke<GameGeometry | null>('game_geometry') : Promise.resolve(null);
export const inspectGame = (expected:GameGeometry, hint:SetupProfile|null, exclude:Rectangle|null) => invoke<GameInspection>('inspect_game',{expected,hint,exclude});
export async function overlayBounds():Promise<Rectangle|null> {
 if(!isTauri)return null;
 const win=getCurrentWindow(),p=await win.outerPosition(),s=await win.outerSize();
 return {x:p.x,y:p.y,width:s.width,height:s.height};
}
export function onGameFocus(handler: (active: boolean) => void): () => void {
	if (!isTauri) return () => {};
	const stop = listen<boolean>('game-focus', e => handler(e.payload)); return () => void stop.then(fn => fn());
}
export function onQuitRequested(handler: () => void): () => void {
	if (!isTauri) return () => {};
	const stop = listen('quit-request', handler); return () => void stop.then(fn => fn());
}
export const quitApp = () => invoke('quit_app');
export const takeOverlayActivation = () => isTauri ? invoke<boolean>('take_overlay_activation') : Promise.resolve(false);
export function onOverlayActivation(handler: () => void): () => void {
	if (!isTauri) return () => {};
	const stop = listen('reopen-overlay', handler); return () => void stop.then(fn => fn());
}
export const openRegionSelector = (monitorIndex: number, target: 'workers' | 'idle' = 'workers') => invoke('open_region_selector', { monitorIndex, target });
export const openBuildPicker = () => isTauri ? invoke<void>('open_build_picker') : Promise.resolve(window.open('/build-picker', '_blank'));
export const closeBuildPicker = () => invoke<void>('close_build_picker');
export const regionSelectorGeometry = () => invoke<Rectangle>('region_selector_geometry');
export const finishRegionSelection = (region: Rectangle | null, target: 'workers' | 'idle' = 'workers') => invoke('finish_region_selection', { region, target });
export function onRegionSelected(handler: (selection: { region: Rectangle; target: 'workers' | 'idle' }) => void): () => void {
	if (!isTauri) return () => {};
	const stop = listen<{ region: Rectangle; target: 'workers' | 'idle' }>('ocr-region-selected', e => handler(e.payload));
	return () => void stop.then(fn => fn());
}
export function onRegionSelecting(handler: (selecting: boolean) => void): () => void {
	if (!isTauri) return () => {};
	const stop = listen<boolean>('region-selecting', e => handler(e.payload));
	return () => void stop.then(fn => fn());
}
export const readWorkers = (region: Settings['ocr']) => isTauri ? invoke<string[]>('read_workers', { region, idleRegion: region.idleRegion }) : Promise.reject(new Error(errorText('OCR disponible en la app de Windows.')));
export async function setEditing(editing: boolean) {
	if (isTauri) await getCurrentWindow().setIgnoreCursorEvents(!editing);
}
export async function dragOverlay() { if (isTauri) await getCurrentWindow().startDragging(); }
export async function overlayPosition() {
	if (!isTauri) return null;
	const p = await getCurrentWindow().outerPosition(); return { x: p.x, y: p.y };
}
export async function monitorOptions() {
	return isTauri ? availableMonitors() : [];
}
export function onNativeEdit(handler: () => void): () => void {
	if (!isTauri) return () => {};
	const stop = listen('edit-overlay', handler); return () => void stop.then(fn => fn());
}

/** Ajusta la ventana al tamaño del contenido y la pega a la esquina elegida del monitor. */
export async function placeOverlay(
	cssWidth: number,
	cssHeight: number,
	corner: Corner,
	offsetX: number,
	offsetY: number,
	position: Settings['position'] = null,
	game: GameGeometry | null = null
): Promise<void> {
	if (!isTauri) return;
	const monitors = await availableMonitors();
	const anchor=game??position;
	const monitor = (anchor && monitors.find(m => anchor.x >= m.position.x && anchor.x < m.position.x + m.size.width && anchor.y >= m.position.y && anchor.y < m.position.y + m.size.height)) || (await currentMonitor()) || (await primaryMonitor());
	if (!monitor) return;
	const factor = monitor.scaleFactor;
	const width = Math.ceil(cssWidth * factor);
	const height = Math.ceil(cssHeight * factor);
	const dx = Math.round((Number(offsetX) || 0) * factor);
	const dy = Math.round((Number(offsetY) || 0) * factor);
	const area=game??{...monitor.position,...monitor.size};
	const x = corner.endsWith('left')
		? area.x + dx
		: area.x + area.width - width - dx;
	const y = corner.startsWith('top')
		? area.y + dy
		: area.y + area.height - height - dy;
	const win = getCurrentWindow();
	await win.setSize(new PhysicalSize(width, height));
	await win.setPosition(new PhysicalPosition(
		Math.max(area.x, Math.min(position?.x ?? x, area.x + area.width - width)),
		Math.max(area.y, Math.min(position?.y ?? y, area.y + area.height - height))
	));
}

// ---------- Teclas globales ----------

let browserListener: ((e: KeyboardEvent) => void) | null = null;
let hotkeyQueue: Promise<unknown> = Promise.resolve();

/**
 * Registra las teclas (acción → combinación). Devuelve las acciones que no se pudieron
 * registrar, por ejemplo porque otro programa ya usa esa combinación.
 */
async function bindHotkeysNow(
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
					if (event.state === 'Pressed') void gameActive().then(active => { if (active) onAction(action); });
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

async function unbindHotkeysNow(): Promise<void> {
	if (isTauri) await unregisterAll().catch(() => {});
	else if (browserListener) {
		window.removeEventListener('keydown', browserListener);
		browserListener = null;
	}
}

export function bindHotkeys(map: Record<string, string>, onAction: (action: string) => void): Promise<string[]> {
	const next = hotkeyQueue.catch(() => {}).then(() => bindHotkeysNow(map, onAction));
	hotkeyQueue = next; return next;
}
export function unbindHotkeys(): Promise<void> {
	const next = hotkeyQueue.catch(() => {}).then(unbindHotkeysNow);
	hotkeyQueue = next; return next;
}
