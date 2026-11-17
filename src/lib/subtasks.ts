import type { Build, Step, Subtask } from './types';
import { copyAdvance, resolveAdvance, validAdvance } from './advance';
import { uid } from './util';
import { tr } from './i18n';

export const MAX_SUBTASKS = 16;
export type Cursor = { step: number; task: number };
export function validSubtasks(value: unknown): value is Subtask[] {
 if (!Array.isArray(value) || !value.length || value.length > MAX_SUBTASKS) return false;
 const ids = new Set<string>();
 return value.every(t => {
  if (!t || typeof t.id !== 'string' || !t.id || ids.has(t.id) || typeof t.action !== 'string' || !t.action.trim() || typeof t.note !== 'string' || !validAdvance(t.advance)) return false;
  ids.add(t.id); return true;
 });
}
export function copySubtasks(tasks: Subtask[], freshIds = false): Subtask[] {
 return tasks.map(t => ({ id: freshIds ? uid() : t.id, action: t.action, note: t.note, advance: copyAdvance(t.advance) }));
}
export function taskCount(step?: Step): number { return step?.subtasks?.length || 1; }
export function activeTask(step: Step, task = 0): Step | Subtask {
 return step.subtasks?.[Math.max(0, Math.min(taskCount(step) - 1, task))] ?? step;
}
export function taskRule(step: Step, task = 0, previous?: Step) {
 const current = activeTask(step, task);
 return resolveAdvance({ ...step, ...current }, previous);
}
export function isLastTask(build: Pick<Build, 'steps'> | null, cursor: Cursor): boolean {
 return !!build?.steps.length && cursor.step === build.steps.length - 1 && cursor.task >= taskCount(build.steps[cursor.step]) - 1;
}
export function moveTask(build: Pick<Build, 'steps'>, cursor: Cursor, direction: 1 | -1): Cursor {
 const step = Math.max(0, Math.min(build.steps.length - 1, cursor.step));
 const task = Math.max(0, Math.min(taskCount(build.steps[step]) - 1, cursor.task));
 if (direction === 1) {
  if (task + 1 < taskCount(build.steps[step])) return { step, task: task + 1 };
  if (step + 1 < build.steps.length) return { step: step + 1, task: 0 };
 } else {
  if (task > 0) return { step, task: task - 1 };
  if (step > 0) return { step: step - 1, task: taskCount(build.steps[step - 1]) - 1 };
 }
 return { step, task };
}

export function reconcileCursor(before: Pick<Build,'steps'> | undefined, after: Pick<Build,'steps'> | undefined, cursor: Cursor): Cursor {
 const old = before?.steps[cursor.step];
 const found = after?.steps.findIndex(s=>s.id===old?.id) ?? -1;
 const step = found >= 0 ? found : Math.max(0,Math.min(cursor.step,(after?.steps.length??1)-1));
 const current = after?.steps[step];
 if (found < 0 || !current) return {step,task:0};
 const taskId = old?.subtasks?.[cursor.task]?.id;
 const task = taskId ? current.subtasks?.findIndex(t=>t.id===taskId) ?? -1 : -1;
 return {step,task:Math.max(0,task)};
}

/** Draft only: preserve explicit clause order and text. Never apply without review. */
export function suggestSubtasks(step: Step, previous?: Step): Subtask[] {
 const clauses = [step.action, step.note].flatMap(text => text.split(/\s*[;+\n]\s*|\.\s+(?=[A-ZÁÉÍÓÚÑ])/u)).map(s => s.trim()).filter(Boolean);
 // Keep overflow together instead of discarding instructions.
 const bounded = clauses.length > MAX_SUBTASKS ? [...clauses.slice(0, MAX_SUBTASKS - 1), clauses.slice(MAX_SUBTASKS - 1).join('; ')] : clauses;
 const tasks:Subtask[] = (bounded.length ? bounded : [tr('Nueva tarea','New task')]).map(action => ({
  id: uid(), action, note: '', advance: resolveAdvance({ ...step, action, note: '', advance: undefined }, previous)
 }));
 // A final allocation cannot define two intermediate goals on the same resource.
 const targets=tasks.map(t=>t.advance.kind==='resources'?Object.keys(t.advance.minimum):t.advance.kind==='transfer'?[t.advance.from,t.advance.to]:[]);
 return tasks.map((t,i)=>t.advance.kind==='resources' && targets[i].some(r=>targets.some((other,j)=>j!==i&&other.includes(r)))?{...t,advance:{kind:'manual'}}:t);
}
