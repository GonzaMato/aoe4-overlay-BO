import type { Build, Villagers } from './types';
import { RESOURCES } from './types';

/** Cambio de aldeanos respecto del paso anterior (el primer paso no tiene cambios). */
export function deltas(build: Build, index: number): Villagers {
	const current = build.steps[index]?.villagers;
	const previous = index > 0 ? build.steps[index - 1]?.villagers : undefined;
	const out: Villagers = { food: 0, wood: 0, gold: 0, stone: 0 };
	if (!current || !previous) return out;
	for (const r of RESOURCES) out[r] = current[r] - previous[r];
	return out;
}

/** Último paso cuya población ya se alcanzó: sirve para cambiar de build sin perder el punto. */
export function indexForPop(build: Build, pop: number | null): number {
	if (pop == null) return 0;
	let found = 0;
	build.steps.forEach((s, i) => {
		if (s.pop != null && s.pop <= pop) found = i;
	});
	return found;
}

export const clampIndex = (build: Build | null, index: number): number =>
	build ? Math.max(0, Math.min(index, build.steps.length - 1)) : 0;
