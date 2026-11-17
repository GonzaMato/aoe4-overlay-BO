import { RESOURCES, RES_LABEL, type AdvanceRule, type Resource, type Step, type Villagers } from './types';
import { villagerTotal, type parseVillagerReading } from './ocr';
import { currentLanguage, resourceLabel, tr, type Language } from './i18n';

export type Reading = NonNullable<ReturnType<typeof parseVillagerReading>>;
export type ResolvedRule = Exclude<AdvanceRule, {kind:'auto'}>;
const count = (n:unknown): n is number => Number.isInteger(n) && Number(n)>0 && Number(n)<=200;
const resource = (r:unknown): r is Resource => RESOURCES.includes(r as Resource);
export function validAdvance(value:unknown): value is AdvanceRule {
  if(!value || typeof value!=='object' || Array.isArray(value))return false;
  const r=value as AdvanceRule;
  if(r.kind==='auto' || r.kind==='manual')return true;
  if(r.kind==='total')return count(r.count);
  if(r.kind==='transfer')return resource(r.from) && resource(r.to) && r.from!==r.to && count(r.count);
  if(r.kind==='resources')return !!r.minimum && typeof r.minimum==='object' && !Array.isArray(r.minimum) && Object.entries(r.minimum).length>0 && Object.entries(r.minimum).every(([k,v])=>resource(k)&&count(v)) && Object.values(r.minimum).reduce((a,b)=>a+b,0)<=200;
  return false;
}
export const copyAdvance = (r:AdvanceRule):AdvanceRule => r.kind==='resources'?{...r,minimum:{...r.minimum}}:{...r};
const clean = (s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const names:Record<Resource,string>={food:'comida|alimento|ovejas?|ovejeros?|ciervos?|jabal[iy]|bayas?|food|sheep|deer|berries',wood:'madera|wood',gold:'oro|gold',stone:'piedra|stone'};
const resourcesIn = (text:string)=>RESOURCES.filter(r=>new RegExp(`\\b(?:${names[r]})\\b`).test(text));
// A counter cannot confirm a building, upgrade or age transition. Mixed instructions
// remain manual too, even when they also mention a resource target.
const manualTask = /\b(constru\w*|construct\w*|build|building|casa|casas|house|houses|campamento|lumber\s+camp|mining\s+camp|mill|molino|landmark|monumento|cuartel\w*|barracks|establo\w*|stable|archery|arqueria|torre|tower|outpost|muralla|wall|muelle|dock|centro\s+urbano|town\s+cent(er|re)|herreria|blacksmith|mercado|market|monasterio|monastery|universidad|university|fortaleza|keep|castillos?|castle|feudal|imperial|edad|age\s*up|age\s+[234ivx]+|investiga\w*|mejora\w*|research|upgrade)\b/;
export function resolveAdvance(step:Step, previous?:Step):ResolvedRule {
  if(step.advance!==undefined && !validAdvance(step.advance))return {kind:'manual'};
  if(step.advance && step.advance.kind!=='auto')return copyAdvance(step.advance) as ResolvedRule;
  const action=clean(step.action), text=clean(`${step.action} ${step.note}`);
  if(manualTask.test(text))return {kind:'manual'};
  const transfer=/(\d+)\s*(?:aldeanos?\s*|vills?\s*|villagers?\s*)?(?:de|from)\s+(.+?)\s+(?:a|al|to)\s+(.+)/.exec(action);
  if(transfer) {
    const from=resourcesIn(transfer[2]),to=resourcesIn(transfer[3]);
    if(from.length===1 && to.length===1 && from[0]!==to[0] && count(Number(transfer[1])))return {kind:'transfer',from:from[0],to:to[0],count:Number(transfer[1])};
    return {kind:'manual'};
  }
  const mentioned=resourcesIn(text);
  const gathering=/\b(aldean\w*|villagers?|vills?|nuev[oa]s?|mas|more|llegar|reach|asign\w*|mand\w*|envi\w*|send|gather|recolect\w*)\b/.test(text) || /^\s*\d+\s+(?:a|al|to|on)\s+/.test(action);
  if(mentioned.length && gathering) {
    // A negative allocation delta denotes redistribution; without an explicit
    // source/count we cannot establish the intended observed movement safely.
    if(previous && RESOURCES.some(r=>step.villagers[r]<previous.villagers[r]))return {kind:'manual'};
    const minimum=Object.fromEntries(mentioned.map(r=>[r,step.villagers[r]]));
    const rule:AdvanceRule={kind:'resources',minimum};
    return validAdvance(rule)?rule:{kind:'manual'};
  }
  if(!mentioned.length && /\b(crea\w*|produ\w*|train|reach|llegar|total)\b/.test(action) && /\b(aldean\w*|villagers?|vills?)\b/.test(action)) {
    const total=villagerTotal(step.villagers);
    if(count(total))return {kind:'total',count:total};
  }
  return {kind:'manual'};
}
export function advanceLabel(rule:ResolvedRule, language:Language = currentLanguage()):string {
  const pick=(es:string,en:string)=>language==='es'?es:en;
  switch(rule.kind) {
    case 'manual':return pick('Manual · AvPág cuando completes la instrucción','Manual · PgDn when you complete the instruction');
    case 'total':return pick(`Total ≥ ${rule.count} aldeanos (incluye inactivos)`,`Total ≥ ${rule.count} villagers (including idle)`);
    case 'resources':return Object.entries(rule.minimum).map(([r,n])=>`${resourceLabel(r as Resource,language)} ≥ ${n}`).join(' · ');
    case 'transfer':return `${pick('Mover','Move')} ${rule.count}: ${resourceLabel(rule.from,language)} → ${resourceLabel(rule.to,language)}`;
  }
}

/** Stable observations of the current instruction, not the next step's total. */
export class AdvanceGate {
  private baseline:Villagers|null;
  private last:string|null=null;
  private same=0;
  private confirmations=0;
  stableReading:Reading|null=null;
  readonly rule:ResolvedRule;
  constructor(rule:ResolvedRule, seed:Reading|null=null) {this.rule=rule;this.baseline=seed?{...seed.workers}:null;}
  suspend(){this.last=null;this.same=0;this.confirmations=0;this.stableReading=null;}
  read(reading:Reading|null):{complete:boolean;message:string} {
    const label=advanceLabel(this.rule);
    if(!reading){this.suspend();return {complete:false,message:`${label} · ${tr('esperando lectura válida','waiting for a valid reading')}`};}
    const key=JSON.stringify(RESOURCES.map(r=>reading.workers[r]));
    this.same=key===this.last?this.same+1:1;this.last=key;
    this.stableReading=this.same>=3?{...reading,workers:{...reading.workers}}:null;
    if(this.rule.kind==='manual')return {complete:false,message:label};
    let matched=false;
    switch(this.rule.kind) {
      case 'total': matched=reading.total>=this.rule.count;break;
      case 'resources': matched=Object.entries(this.rule.minimum).every(([r,n])=>reading.workers[r as Resource]>=n);break;
      case 'transfer': {
        if(!this.baseline) {
          if(this.stableReading)this.baseline={...reading.workers};
          return {complete:false,message:`${label} · ${this.baseline?tr('esperando el traslado','waiting for the transfer'):tr('leyendo reparto inicial','reading initial assignments')}`};
        }
        const {from,to,count}=this.rule;
        if(this.baseline[from]<count)return {complete:false,message:`${label} · ${tr('sin origen suficiente; usá AvPág si ya lo hiciste','not enough at source; press PgDn if already done')}`};
        matched=reading.workers[from]<=this.baseline[from]-count && reading.workers[to]>=this.baseline[to]+count;
        break;
      }
    }
    this.confirmations=matched?this.confirmations+1:0;
    return {complete:this.confirmations>=3,message:`${label} · ${matched?`${tr('confirmando','confirming')} ${Math.min(3,this.confirmations)}/3`:tr('pendiente','pending')}`};
  }
}
