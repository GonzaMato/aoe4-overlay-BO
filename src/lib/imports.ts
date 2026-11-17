import { normalize, normalizeBuild } from './defaults';
import type { AppData, Build, Villagers } from './types';
import { parseTime, uid } from './util';

const civs: Record<string, string> = { English:'Ingleses', French:'Franceses', 'Holy Roman Empire':'Sacro Imperio Romano Germánico', Mongols:'Mongoles', Chinese:'Chinos', 'Delhi Sultanate':'Sultanato de Delhi', 'Abbasid Dynasty':'Dinastía Abasí', Ottomans:'Otomanos', Malians:'Malienses', Byzantines:'Bizantinos', Japanese:'Japoneses', 'Order of the Dragon':'Orden del Dragón', "Zhu Xi's Legacy":'Legado de Zhu Xi', "Jeanne d'Arc":'Juana de Arco', Ayyubids:'Ayubíes', 'Knights Templar':'Caballeros Templarios', 'House of Lancaster':'Casa de Lancaster' };
function object(value: unknown): Record<string, any> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Se esperaba un objeto JSON.');
  return value as Record<string, any>;
}
function plain(value: unknown): string {
  return String(value ?? '').replace(/@([^@]+)@/g, (_, p: string) => '[' + p.split('/').pop()!.replace(/\.(webp|png)$/i,'').replace(/[-_]/g,' ') + ']')
    .replace(/<br\s*\/?\s*>/gi,'\n').replace(/<[^>]*>/g,'').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').trim();
}
const nonnegative = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= 0;
export function importBuilds(text: string): Build[] {
  const parsed = JSON.parse(text); const list = Array.isArray(parsed) ? parsed : [parsed];
  if (!list.length) throw new Error('El archivo no contiene builds.');
  return list.map(raw => {
    const b = object(raw);
    let converted: Partial<Build>;
    if (Array.isArray(b.build_order)) {
      converted = { name: b.name, civ: civs[b.civilization] ?? String(b.civilization ?? ''), mode: '', map: typeof b.map === 'string' ? b.map : '', steps: b.build_order.map((rawStep: unknown) => {
        const s = object(rawStep), r = object(s.resources ?? {});
        const lines = (Array.isArray(s.notes) ? s.notes : [s.notes ?? '']).flatMap((line: unknown) => plain(line).split('\n')).filter(Boolean);
        const notes = lines.slice(1);
        if (nonnegative(r.builder) && r.builder > 0) notes.push(`Constructores: ${r.builder}`);
        return { id: uid(), pop: nonnegative(s.population_count) ? s.population_count : null, time: nonnegative(s.time) ? s.time : parseTime(String(s.time ?? '')), action: lines[0] ?? '', note: notes.join('\n'), villagers: Object.fromEntries(['food','wood','gold','stone'].map(key => [key, nonnegative(Number(r[key])) ? Number(r[key]) : 0])) as Villagers };
      }) };
    } else {
      if (!Array.isArray(b.steps)) throw new Error('Falta steps o build_order. Exportá desde aoe4guides con «Overlay Tool».');
      b.steps.forEach((s: unknown) => { const step = object(s); if (step.type || Array.isArray(step.steps)) throw new Error('Usá la exportación «Overlay Tool» de aoe4guides.'); });
      converted = b;
    }
    const result = normalizeBuild(converted);
    result.id = uid(); result.steps.forEach(s => s.id = uid()); return result;
  });
}
export function exportBackup(data: AppData): string {
  return JSON.stringify({ format: 'aoe4-overlay-backup', version: 1, data }, null, 2);
}
export function importBackup(text: string): AppData {
  const envelope = object(JSON.parse(text));
  if (envelope.format !== 'aoe4-overlay-backup' || envelope.version !== 1) throw new Error('Formato o versión de respaldo no compatible.');
  const data = object(envelope.data), settings = object(data.settings);
  if (data.version !== 1 || !Array.isArray(data.builds)) throw new Error('Respaldo incompleto.');
  const ids = new Set();
  for (const raw of data.builds) {
    const b = object(raw);
    if (typeof b.id !== 'string' || !b.id || ids.has(b.id) || !Array.isArray(b.steps) || ['name','civ','mode','map'].some(k => typeof b[k] !== 'string')) throw new Error('Build inválido o ID duplicado.');
    ids.add(b.id);
    const stepIds = new Set();
    for (const rawStep of b.steps) {
      const s = object(rawStep), villagers = object(s.villagers);
      if (typeof s.id !== 'string' || !s.id || stepIds.has(s.id) || typeof s.action !== 'string' || typeof s.note !== 'string' || (s.time !== null && !nonnegative(s.time)) || (s.pop !== null && !nonnegative(s.pop)) || ['food','wood','gold','stone'].some(k => !nonnegative(villagers[k]))) throw new Error('Paso inválido o ID duplicado.');
      stepIds.add(s.id);
    }
  }
  if (!nonnegative(settings.scale) || settings.scale < .7 || settings.scale > 1.8 || !nonnegative(settings.opacity) || settings.opacity < .4 || settings.opacity > 1) throw new Error('Tamaño u opacidad inválidos.');
  for (const k of ['modes','maps','civs']) if (!Array.isArray(settings[k]) || settings[k].some((v: unknown) => typeof v !== 'string')) throw new Error('Listas de ajustes inválidas.');
  if (!['top-left','top-right','bottom-left','bottom-right'].includes(settings.corner) || typeof settings.accent !== 'string') throw new Error('Apariencia inválida.');
  for (const v of Object.values(object(settings.hotkeys))) if (typeof v !== 'string') throw new Error('Teclas inválidas.');
  object(settings.defaults);
  if (!nonnegative(settings.offsetX) || !nonnegative(settings.offsetY) || typeof settings.compact !== 'boolean' || typeof settings.showClock !== 'boolean' || (settings.activeBuildId !== null && !ids.has(settings.activeBuildId)) || Object.values(settings.defaults).some(id => !ids.has(id))) throw new Error('Ajustes o referencias a builds inválidos.');
  if (settings.position != null) { const p=object(settings.position); if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) throw new Error('Posición inválida.'); }
  if (settings.ocr) { const o=object(settings.ocr); if (typeof o.enabled !== 'boolean' || !Number.isInteger(o.x) || !Number.isInteger(o.y) || !Number.isInteger(o.width) || !Number.isInteger(o.height) || o.width < 10 || o.width > 1000 || o.height < 10 || o.height > 500) throw new Error('Región OCR inválida.'); }
  if (settings.ocr?.source != null && settings.ocr.source !== 'workers') throw new Error('Fuente OCR no compatible.');
  if (settings.ocr?.source === 'workers' && settings.ocr.height < 40) throw new Error('La región OCR debe incluir los cuatro contadores de aldeanos.');
  if (settings.ocr?.idleRegion != null) {
    const r = object(settings.ocr.idleRegion);
    if (![r.x, r.y, r.width, r.height].every(Number.isInteger) || r.width < 10 || r.width > 1000 || r.height < 10 || r.height > 500) throw new Error('Región OCR de inactivos inválida.');
  }
  if (data.practices !== undefined) {
    if (!Array.isArray(data.practices)) throw new Error('Historial inválido.');
    const practiceIds = new Set();
    for (const raw of data.practices) {
      const p = object(raw);
      if (typeof p.id !== 'string' || !p.id || practiceIds.has(p.id) || typeof p.buildId !== 'string' || typeof p.buildName !== 'string' || !nonnegative(p.startedAt) || (p.finishedAt !== null && !nonnegative(p.finishedAt)) || !Array.isArray(p.arrivals)) throw new Error('Registro de práctica inválido.');
      practiceIds.add(p.id);
      const arrivalIds = new Set();
      for (const rawArrival of p.arrivals) {
        const a = object(rawArrival);
        if (typeof a.stepId !== 'string' || !a.stepId || arrivalIds.has(a.stepId) || typeof a.action !== 'string' || !nonnegative(a.elapsed) || !Number.isInteger(a.index) || a.index < 0 || (a.target !== null && !nonnegative(a.target))) throw new Error('Llegada de práctica inválida.');
        arrivalIds.add(a.stepId);
      }
    }
  }
  return normalize(data);
}
