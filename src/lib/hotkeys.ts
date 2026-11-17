// Las teclas se guardan como "Ctrl+Alt+KeyS": modificadores + el `code` de la tecla.
// El plugin de teclas globales de Tauri acepta esos mismos nombres.

const MODIFIER_CODES = new Set([
	'ControlLeft',
	'ControlRight',
	'AltLeft',
	'AltRight',
	'ShiftLeft',
	'ShiftRight',
	'MetaLeft',
	'MetaRight'
]);

export function eventToHotkey(e: KeyboardEvent): string | null {
	if (!e.code || MODIFIER_CODES.has(e.code)) return null;
	const parts: string[] = [];
	if (e.ctrlKey) parts.push('Ctrl');
	if (e.altKey) parts.push('Alt');
	if (e.shiftKey) parts.push('Shift');
	parts.push(e.code);
	return parts.join('+');
}

const PRETTY: Record<string, string> = {
	PageDown: 'AvPág',
	PageUp: 'RePág',
	ArrowUp: '↑',
	ArrowDown: '↓',
	ArrowLeft: '←',
	ArrowRight: '→',
	Space: 'Espacio',
	Backquote: '`',
	Insert: 'Ins',
	Delete: 'Supr',
	Home: 'Inicio',
	End: 'Fin'
};

export function prettyKey(token: string): string {
	if (PRETTY[token]) return PRETTY[token];
	if (/^Key[A-Z]$/.test(token)) return token.slice(3);
	if (/^Digit\d$/.test(token)) return token.slice(5);
	if (/^Numpad/.test(token)) return `Num ${token.slice(6)}`;
	return token;
}

export function prettyHotkey(combo: string): string {
	if (!combo) return 'Sin asignar';
	return combo.split('+').map(prettyKey).join(' + ');
}
