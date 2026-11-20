import { parseVillagerReading } from './ocr';
import { advanceLabel, type Reading, type ResolvedRule } from './advance';
import type { Language } from './i18n';

export const READING_TTL = 4500;
export interface OverlaySample { reading: Reading | null; at: number; lastGoodAt: number | null }
export const emptyOverlaySample = (): OverlaySample => ({reading:null,at:0,lastGoodAt:null});
export function observeOverlaySample(previous: OverlaySample, rows: string[], now: number): OverlaySample {
 const reading=parseVillagerReading(rows);
 return {reading,at:now,lastGoodAt:reading?now:previous.lastGoodAt};
}
export function overlayReadingView(sample: OverlaySample, enabled: boolean, now: number) {
 const fresh=now>=sample.at && now-sample.at<=READING_TTL;
 return {
  reading: enabled && fresh ? sample.reading : null,
  // A single missed frame must not repeatedly move the whole overlay.
  showDetection: enabled && (sample.lastGoodAt===null || now<sample.lastGoodAt || now-sample.lastGoodAt>READING_TTL)
 };
}
/** `live`: AoE4 is in the foreground and the overlay is not being edited. The timer is not required. */
export interface AutomationContext { enabled:boolean; confirmed:boolean; live:boolean; hasReading:boolean; finalTask:boolean }
export function advancementStatus(rule:ResolvedRule, context:AutomationContext, nextKey:string, language:Language) {
 const pick=(es:string,en:string)=>language==='es'?es:en;
 if(rule.kind==='manual'||context.finalTask)return {
  kind:'manual',label:pick('Manual','Manual'),
  detail:context.finalTask?pick(`${nextKey} para terminar el build`,`${nextKey} to finish the build`):pick(`${nextKey} al completar la tarea`,`${nextKey} when the task is done`)
 };
 const reason=!context.enabled?pick('OCR desactivado','OCR off'):!context.confirmed?pick('Confirmá los contadores en Inicio','Confirm counters in Home'):!context.live?pick('Esperando AoE4','Waiting for AoE4'):!context.hasReading?pick('Esperando lectura','Waiting for reading'):'';
 return {kind:reason?'paused':'auto',label:reason?pick('Auto · en espera','Auto · waiting'):pick('Automático','Automatic'),detail:reason||advanceLabel(rule,language)};
}
