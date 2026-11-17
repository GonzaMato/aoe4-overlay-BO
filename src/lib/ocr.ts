import { RESOURCES, type Build, type Villagers } from './types';

/** All four rows must be present: an unreadable gray zero is not an implicit zero. */
export function parseWorkerRows(rows: string[]): Villagers | null {
  if (rows.length !== 4 || rows.some(row => !/^\d{1,3}$/.test(row.trim()))) return null;
  const counts = rows.map(row => Number(row.trim()));
  if (counts.reduce((a, b) => a + b, 0) > 200) return null;
  return Object.fromEntries(RESOURCES.map((resource, i) => [resource, counts[i]])) as Villagers;
}

export function villagerTotal(workers: Villagers): number {
  return RESOURCES.reduce((total, resource) => total + workers[resource], 0);
}

export function parseVillagerReading(rows: string[]): { workers: Villagers; idle: number; total: number } | null {
  if (rows.length !== 5 || !/^\d{1,3}$/.test(rows[4].trim())) return null;
  const workers = parseWorkerRows(rows.slice(0, 4));
  if (!workers) return null;
  const idle = Number(rows[4].trim()), total = villagerTotal(workers) + idle;
  return total <= 200 ? { workers, idle, total } : null;
}

export function nextWorkerTarget(build: Build, index: number): number | null {
  const current = build.steps[index], next = build.steps[index + 1];
  if (!current || !next) return null;
  const target = villagerTotal(next.villagers);
  // Redistribution, building actions and unknown allocations need manual control.
  return Number.isInteger(target) && target > villagerTotal(current.villagers) && target <= 200 ? target : null;
}

export class VillagerTotalGate {
  private last: number | null = null;
  private count = 0;
  private revision = 0;
  get generation() { return this.revision; }
  isCurrent(generation: number) { return generation === this.revision; }
  reset() { this.last = null; this.count = 0; this.revision++; }
  read(pop: number | null): number | null {
    this.count = pop !== null && pop === this.last ? this.count + 1 : 1;
    this.last = pop;
    return pop !== null && this.count >= 3 ? pop : null;
  }
}
