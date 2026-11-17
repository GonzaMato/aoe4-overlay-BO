import type { SetupStatus } from './setup';
import type { OnboardingState } from './onboarding';
export interface NativeDiagnostic { available:boolean; languages:string[]; gameActive:boolean; }
export interface DiagnosticInput {
  version:string; native:NativeDiagnostic|null;
  monitors:{size:{width:number;height:number};scaleFactor:number}[];
  status:SetupStatus|null;onboarding:OnboardingState;failedHotkeys:string[];condition:string;
}
export function diagnosticText(input:DiagnosticInput):string {
  const g=input.status?.geometry,s=input.status?.sample;
  // Explicit allowlist: never serialize settings, arbitrary OCR text, paths or player identity.
  return JSON.stringify({app:'AoE4 Overlay',version:input.version,createdAt:new Date().toISOString(),
    ocr:input.native?{available:input.native.available,languages:input.native.languages.filter(v=>/^[a-zA-Z-]{2,20}$/.test(v))}:null,
    gameInForeground:input.native?.gameActive??null,
    monitors:input.monitors.map(m=>({width:m.size.width,height:m.size.height,scalePercent:Math.round(m.scaleFactor*100)})),
    game:g?{width:g.width,height:g.height,scalePercent:Math.round(g.dpi/96*100)}:null,
    onboarding:input.onboarding,
    counters:s?{at:s.at,stable:s.stable,food:s.workers.food,wood:s.workers.wood,gold:s.workers.gold,stone:s.workers.stone,idle:s.idle,total:s.total}:null,
    condition:['manual','auto','total','resources','transfer','none'].includes(input.condition)?input.condition:'none',
    failedHotkeyCount:input.failedHotkeys.length},null,2);
}
