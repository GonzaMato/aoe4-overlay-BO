import type { AppData, Build } from './types';
import type { Rectangle } from './region';
import { defaultKey } from './util';

export interface GameGeometry extends Rectangle { monitor: string; dpi: number; }
export interface SetupProfile {
  key: string; width: number; height: number;
  workers: Rectangle; idle: Rectangle; clock: Rectangle | null;
  position: { x: number; y: number } | null;
  manual?: boolean;
}
export interface SetupSettings { enabled: boolean; playerName: string; mode: string; profiles: SetupProfile[]; }
export interface OcrLine extends Rectangle { text: string; }
export interface GameInspection {
  geometry: GameGeometry; workers: Rectangle | null; idle: Rectangle | null;
  rows: string[]; lines: OcrLine[]; hud: boolean;
}
export interface SetupStatus {

  sample?: import('./onboarding').CounterSample | null;
  condition?: string;
  message: string; profile: string; counters: string; civilization: string;
  clock: string; manualClock: boolean; geometry: GameGeometry | null;
}
export const setupDefaults = (): SetupSettings => ({ enabled:false, playerName:'', mode:'1v1', profiles:[] });
export const profileKey = (g: GameGeometry) => `${g.monitor}|${g.width}x${g.height}|${g.dpi}`;
export const geometryKey = (g: GameGeometry) => `${profileKey(g)}|${g.x},${g.y}`;
export const relativeRect = (r: Rectangle, g: Rectangle): Rectangle => ({x:r.x-g.x,y:r.y-g.y,width:r.width,height:r.height});
export const absoluteRect = (r: Rectangle, g: Rectangle): Rectangle => ({x:r.x+g.x,y:r.y+g.y,width:r.width,height:r.height});
export function inside(r: unknown, width: number, height: number, minHeight = 10): r is Rectangle {
  if (!r || typeof r !== 'object') return false;
  const v=r as Rectangle;
  return [v.x,v.y,v.width,v.height].every(Number.isInteger) && v.x>=0 && v.y>=0 && v.width>=10 && v.height>=minHeight && v.width<=1000 && v.height<=500 && v.x+v.width<=width && v.y+v.height<=height;
}
export function validProfile(value: unknown): value is SetupProfile {
  if (!value || typeof value!=='object') return false;
  const p=value as SetupProfile;
  return typeof p.key==='string' && p.key.length<=300 && Number.isInteger(p.width) && p.width>=320 && p.width<=16384 && Number.isInteger(p.height) && p.height>=200 && p.height<=16384
    && inside(p.workers,p.width,p.height,40) && inside(p.idle,p.width,p.height)
    && (p.clock===null || inside(p.clock,p.width,p.height))
    && (p.manual===undefined || typeof p.manual==='boolean')
    && (p.position===null || (!!p.position && Number.isFinite(p.position.x) && Number.isFinite(p.position.y) && p.position.x>=0 && p.position.y>=0 && p.position.x<p.width && p.position.y<p.height));
}
export function normalizeSetup(raw: unknown): SetupSettings {
  const v=(raw && typeof raw==='object' ? raw : {}) as Partial<SetupSettings>;
  return {enabled:v.enabled===true,playerName:typeof v.playerName==='string'?v.playerName.slice(0,80):'',mode:typeof v.mode==='string'?v.mode.slice(0,80):'1v1',profiles:Array.isArray(v.profiles)?v.profiles.filter(validProfile).slice(-24):[]};
}
export function parseGameTime(text: string): number | null {
  const match=/^(?:(\d{1,2}):)?(\d{1,3}):(\d{2})$/.exec(text.trim());
  if (!match || Number(match[3])>=60 || (match[1] && Number(match[2])>=60)) return null;
  const seconds=Number(match[1]||0)*3600+Number(match[2])*60+Number(match[3]);
  return seconds<=12*3600?seconds:null;
}
export function clockCandidate(lines: OcrLine[], g: GameGeometry): {rect:Rectangle;seconds:number} | null {
  const candidates=lines.filter(l=>l.y>=0 && l.y+l.height<=g.height*.24 && l.x>=g.width*.40 && l.x+l.width<=g.width*.60).map(l=>({rect:{x:Math.max(0,l.x-8),y:Math.max(0,l.y-5),width:l.width+16,height:l.height+10},seconds:parseGameTime(l.text)})).filter(c=>c.seconds!==null);
  return candidates.length===1 ? candidates[0] as {rect:Rectangle;seconds:number} : null;
}
const clean=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const aliases:Record<string,string[]>={
  'horda de oro':['golden horde'],'dinastia macedonica':['macedonian dynasty'],'daimio sengoku':['sengoku daimyo'],'dinastia tughlaq':['tughlaq dynasty'],'dinastia jin':['jin dynasty'],vikingos:['vikings'],escoceses:['scots'],
  ingleses:['english'],franceses:['french'],'sacro imperio romano germanico':['holy roman empire'],rus:['rus'],mongoles:['mongols'],chinos:['chinese'],'sultanato de delhi':['delhi sultanate'],'dinastia abasi':['abbasid dynasty'],otomanos:['ottomans'],malienses:['malians'],bizantinos:['byzantines'],japoneses:['japanese'],'orden del dragon':['order of the dragon'],'legado de zhu xi':['zhu xi s legacy'],'juana de arco':['jeanne d arc'],ayubies:['ayyubids'],'caballeros templarios':['knights templar'],'casa de lancaster':['house of lancaster']
};
const phrase=(text:string,needle:string)=>` ${clean(text)} `.includes(` ${clean(needle)} `);
export function observerScreen(lines:OcrLine[]):boolean {return lines.some(l=>/\b(replay|repeticion|spectat(?:or|ing)|espectador|observando)\b/.test(clean(l.text)));}
export function lobbyScreen(lines:OcrLine[]):boolean {return !observerScreen(lines) && lines.some(l=>/\b(loading|cargando|buscar partida|searching for match|match found|partida encontrada)\b/.test(clean(l.text)));}
export function localCivilization(lines: OcrLine[], playerName: string, civs: string[]): string | null {
  if (!clean(playerName) || observerScreen(lines)) return null;
  const identity=(s:string)=>s.normalize('NFC').trim().toLocaleLowerCase();
  const named=lines.filter(l=>identity(l.text)===identity(playerName));
  if (named.length!==1) return null;
  const row=named[0];
  const aligned=lines.filter(l=>Math.abs((l.y+l.height/2)-(row.y+row.height/2))<=Math.max(row.height,l.height)*.65);
  const civLabel=(text:string)=>civs.some(c=>[clean(c),...(aliases[clean(c)]??[])].some(a=>clean(text)===a));
  // Separate player cards can share a baseline. Any extra name makes that row
  // ambiguous; never stitch distant text or a partial username into an identity.
  if(aligned.some(l=>l!==row && !civLabel(l.text) && !/^\d+$/.test(l.text.trim())))return null;
  const text=aligned.filter(l=>l===row || Math.max(0,l.x-row.x-row.width,row.x-l.x-l.width)<=row.height*16).map(l=>l.text).join(' ');
  const matches=civs.filter(c=>[clean(c),...(aliases[clean(c)]??[])].some(a=>phrase(text,a)));
  return matches.length===1?matches[0]:null;
}
export function chooseBuild(data: AppData, civ: string, mode: string): Build | null {
  const options=data.builds.filter(b=>clean(b.civ)===clean(civ) && b.mode===mode);
  const preferred=options.filter(b=>data.settings.defaults[defaultKey(b.civ,mode)]===b.id);
  return preferred.length===1?preferred[0]:options.length===1?options[0]:null;
}

/** A clock reading is evidence, never a command to reset a practice. */
export class ClockTracker {
  manual=false;
  private previous:{seconds:number;now:number}|null=null;
  private accepted:number|null=null;
  private samples=0;
  private advanced=false;
  private betweenMatches=false;
  override(){this.manual=true;this.suspend();}
  resume(){this.manual=false;this.suspend();}
  suspend(){this.previous=null;this.samples=0;this.advanced=false;}
  lobby(){this.betweenMatches=true;this.suspend();}
  read(seconds:number|null,now=Date.now()):{seconds:number;newMatch:boolean}|null {
    if (seconds===null || !Number.isInteger(seconds) || seconds<0 || seconds>43200) {this.suspend();return null;}
    const newMatch=this.betweenMatches && seconds<=30;
    if ((this.manual && !newMatch) || (this.accepted!==null && seconds<this.accepted && !newMatch)) {this.suspend();return null;}
    const last=this.previous;
    if (!last || now-last.now>5000 || now<=last.now || seconds<last.seconds || seconds-last.seconds>(now-last.now)/1000+3) {
      this.samples=1;this.advanced=false;
    } else {this.samples++;this.advanced ||= seconds>last.seconds;}
    this.previous={seconds,now};
    if (this.samples<3 || !this.advanced || seconds===last?.seconds) return null;
    this.accepted=seconds;
    if (newMatch) this.manual=false;
    this.betweenMatches=false;
    return {seconds,newMatch};
  }
}
