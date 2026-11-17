import type { Villagers } from './types';
export type OnboardingState = 'pending' | 'detecting' | 'complete' | 'skipped';
export interface CounterSample { at:number; stable:boolean; workers:Villagers; idle:number; total:number; }
export const automaticAllowed = (state:OnboardingState) => state !== 'detecting' && state !== 'pending';
export function canConfirm(sample:CounterSample|null|undefined, now=Date.now(), since=0):boolean {
  if(!sample || !sample.stable || !Number.isFinite(sample.at) || sample.at<since || now<sample.at || now-sample.at>60000)return false;
  const values=['food','wood','gold','stone'].map(k=>sample.workers?.[k as keyof Villagers]);values.push(sample.idle);
  return values.every(v=>Number.isInteger(v)&&v>=0&&v<=200) && sample.total===values.reduce((a,b)=>a+b,0) && sample.total<=200;
}
