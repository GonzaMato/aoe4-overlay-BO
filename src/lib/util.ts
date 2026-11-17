export const uid = (): string =>
	Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

/** Segundos → "m:ss". */
export function formatTime(s: number | null | undefined): string {
	if (s == null) return '';
	const abs = Math.max(0, Math.floor(s));
	return `${Math.floor(abs / 60)}:${String(abs % 60).padStart(2, '0')}`;
}

/** "m:ss" (o segundos sueltos) → segundos. Vacío o inválido → null. */
export function parseTime(text: string): number | null {
	const v = text.trim();
	if (!v) return null;
	const m = v.match(/^(\d+)[:.]([0-5]?\d)$/);
	if (m) return Number(m[1]) * 60 + Number(m[2]);
	if (/^\d+$/.test(v)) return Number(v);
	return null;
}

export const defaultKey = (civ: string, mode: string): string => `${civ}|${mode}`;
