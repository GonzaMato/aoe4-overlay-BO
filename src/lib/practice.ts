import type { Build, Practice } from './types';
import { uid } from './util';

export class PracticeClock {
  private seconds = 0;
  private since: number | null = null;
  private external = false;
  get running() { return this.external || this.since !== null; }
  elapsed(now = Date.now()) { return Math.max(0, this.seconds + (this.since === null ? 0 : (now - this.since) / 1000)); }
  start(now = Date.now()) { this.external=false; if (this.since === null) this.since = now; }
  pause(now = Date.now()) { this.seconds = this.elapsed(now); this.since = null; this.external=false; }
  sync(seconds:number) { this.seconds=Math.max(0,seconds);this.since=null;this.external=true; }
  adjust(delta: number, now = Date.now()) { const running=this.running; this.seconds = Math.max(0, this.elapsed(now) + delta); this.external=false; if (running) this.since = now; }
  reset(now = Date.now()) { this.external=false; this.seconds = 0; this.since = now; }
}
export function newPractice(build: Build, now = Date.now()): Practice {
  return { id: uid(), buildId: build.id, buildName: build.name, startedAt: now, finishedAt: null, arrivals: [] };
}
export function recordArrival(practice: Practice, build: Build, index: number, elapsed: number) {
  const step = build.steps[index];
  if (!step || practice.arrivals.some(a => a.stepId === step.id)) return false;
  practice.arrivals.push({ stepId: step.id, index, action: step.action, target: step.time, elapsed: Math.floor(elapsed) });
  return true;
}
