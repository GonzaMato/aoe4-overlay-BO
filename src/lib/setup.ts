import type { AppData, Build } from './types';
import type { Rectangle } from './region';
import { preferredBuildId } from './util';
import { label } from './i18n';

export interface GameGeometry extends Rectangle { monitor: string; dpi: number; }
export interface SetupProfile {
  key: string; width: number; height: number;
  workers: Rectangle; idle: Rectangle; clock: Rectangle | null;
  position: { x: number; y: number } | null;
  manual?: boolean;
}
/**
 * `enabled`: read the game screen (civilization on the loading screen, game clock, counters).
 * `autoAdvance`: let villager counters advance steps. Requires `enabled` and confirmed counters.
 */
export interface SetupSettings { enabled: boolean; autoAdvance: boolean; playerName: string; mode: string; profiles: SetupProfile[]; }
/** A player seen on a loading screen. Kept in memory only, never persisted or shared. */
export interface RosterEntry { name: string; civ: string; }
export interface OcrLine extends Rectangle { text: string; playerText?: string; }
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
export const setupDefaults = (): SetupSettings => ({ enabled:false, autoAdvance:false, playerName:'', mode:'1v1', profiles:[] });
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
  // Before 0.4 one switch did both jobs, so older data keeps advancing exactly as it did.
  const enabled=v.enabled===true, autoAdvance=typeof v.autoAdvance==='boolean'?v.autoAdvance&&enabled:enabled;
  return {enabled,autoAdvance,playerName:typeof v.playerName==='string'?v.playerName.slice(0,80):'',mode:typeof v.mode==='string'?v.mode.slice(0,80):'1v1',profiles:Array.isArray(v.profiles)?v.profiles.filter(validProfile).slice(-24):[]};
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
function matchLoadingScreen(lines: OcrLine[]): boolean {
  if (observerScreen(lines)) return false;
  const labels = lines.map(line => clean(line.text));
  if (labels.some(text => /^(?:loading|cargando)(?: \d+)?$/.test(text))) return true;
  // Between the progress indicator and the Play button, the loading screen still
  // shows the match briefing. The civilization menu has neither of these headings.
  const conditions = labels.some(text => /^(?:win conditions|condiciones de victoria|condiciones para ganar)$/.test(text));
  return conditions && labels.some(text => /\b(?:gameplay tip|consejo de juego)\b|^(?:team|equipo) \d+$/.test(text));
}

export function lobbyScreen(lines: OcrLine[]): boolean {
  return matchLoadingScreen(lines) || (!observerScreen(lines) && lines.some(line =>
    /\b(?:buscar partida|searching for match|match found|partida encontrada)\b/.test(clean(line.text))));
}
const identity=(s:string)=>s.normalize('NFC').trim().toLocaleLowerCase();
const civNames=(c:string)=>[clean(c),clean(label(c,'es')),clean(label(c,'en')),...(aliases[clean(label(c,'es'))]??[])];
const sameRow=(a:OcrLine,b:OcrLine)=>Math.abs((a.y+a.height/2)-(b.y+b.height/2))<=Math.max(a.height,b.height)*.65;
const gap=(a:OcrLine,b:OcrLine)=>Math.max(0,b.x-a.x-a.width,a.x-b.x-b.width);
const TAG=/^[[(<{][^\])>}]{1,12}[\])>}]$/;
/** `[CLAN]`, `(TAG)` and similar short tags shown next to a player name. */
export const isClanTag=(text:string)=>TAG.test(text.trim());
export const stripClanTag=(text:string)=>text.trim().replace(/^[[(<{][^\])>}]{1,12}[\])>}]\s*/,'').replace(/\s*[[(<{][^\])>}]{1,12}[\])>}]$/,'').trim();
// Windows OCR often swaps these glyphs in player names; it rarely adds or drops one.
const ocrFold=(s:string)=>identity(s).replace(/[il1|]/g,'l').replace(/[o0]/g,'o');
/**
 * Tolerates clan tags, letter case and a single OCR glyph swap in names of five or more
 * characters. A longer or shorter name never matches: `MyName2` is not `MyName`.
 */
export function playerNameMatches(text:string, playerName:string):boolean {
  const a=ocrFold(stripClanTag(text)), b=ocrFold(stripClanTag(playerName));
  if(!b || a.length!==b.length) return false;
  if(a===b) return true;
  if(b.length<5) return false;
  let differences=0;
  for(let i=0;i<a.length;i++) if(a[i]!==b[i] && ++differences>1) return false;
  return true;
}
const civOf=(text:string,civs:string[]):string|null=>{
  const matches=civs.filter(c=>civNames(c).some(a=>clean(text)===a));
  return new Set(matches.map(c=>label(c,'en'))).size===1?matches[0]:null;
};

function rosterLines(lines: OcrLine[], civs: string[]) {
  const labels = new Map<OcrLine, string>();
  const names: OcrLine[] = [];
  for (const line of lines) {
    const text = line.text.trim();
    const civ = civOf(text, civs);
    if (civ) labels.set(line, civ);
    else {
      const name = line.playerText ?? text;
      if (name.length > 0 && name.length <= 40 && !/^\d+$/.test(name) && !isClanTag(name)) names.push(line);
    }
  }
  return { labels, names };
}

function stackedDistance(civ: OcrLine, name: OcrLine): number {
  const height = Math.max(civ.height, name.height);
  const vertical = name.y - (civ.y + civ.height);
  const horizontal = gap(civ, name);
  // The flag indents the civilization label, so short names can end just to its left.
  if (vertical < 0 || vertical > height * 2.5 || horizontal > height * 1.5) return Infinity;
  return Math.hypot(vertical, horizontal);
}

function closestLine(lines: OcrLine[], distance: (line: OcrLine) => number): OcrLine | undefined {
  const [first, second] = lines.map(line => ({ line, distance: distance(line) }))
    .filter(match => Number.isFinite(match.distance))
    .sort((a, b) => a.distance - b.distance);
  if (first && (!second || second.distance - first.distance > first.line.height * 0.2)) return first.line;
}

function stackedPlayers(labels: OcrLine[], candidates: OcrLine[]): Map<OcrLine, OcrLine> {
  const names = candidates.filter(line => !/^(?:(?:team|equipo) \d+|loading|cargando)$/.test(clean(line.text)));
  const pairs = new Map<OcrLine, OcrLine>();
  for (const label of labels) {
    const name = closestLine(names, candidate => stackedDistance(label, candidate));
    if (name && closestLine(labels, candidate => stackedDistance(candidate, name)) === label) pairs.set(label, name);
  }
  return pairs;
}

/**
 * Pair each civilization with the player below it on a card or beside it in a row.
 * Ambiguous pairs are left out.
 */
export function lobbyRoster(lines:OcrLine[], civs:string[]):RosterEntry[] {
  if(observerScreen(lines)) return [];
  const { labels, names } = rosterLines(lines, civs);
  const civLines = [...labels.keys()];
  const stacked = stackedPlayers(civLines, names);
  const nearest=<T extends OcrLine>(from:OcrLine,pool:T[])=>pool.filter(o=>o!==from && sameRow(o,from) && gap(o,from)<=from.height*16).sort((a,b)=>gap(a,from)-gap(b,from))[0];
  const entries:RosterEntry[]=[];
  for(const [civLine, civ] of labels){
    const name=stacked.get(civLine) ?? nearest(civLine,names);
    // Mutual nearest: the name must also point back to this label, not a rival's card.
    if(!name || (!stacked.has(civLine) && nearest(name,civLines)!==civLine)) continue;
    const text=stripClanTag(name.playerText ?? name.text);
    if(text) entries.push({name:text,civ});
  }
  const byName=new Map<string,RosterEntry[]>();
  for(const e of entries) byName.set(identity(e.name),[...(byName.get(identity(e.name))??[]),e]);
  return [...byName.values()].filter(list=>new Set(list.map(e=>label(e.civ,'en'))).size===1).map(list=>list[0]);
}
/**
 * After a manual build choice: the player is the only one on the last loading screen
 * who plays that civilization. Mirror matches and single-player screens give no answer.
 */
export function suggestPlayerName(roster:RosterEntry[], civ:string):string|null {
  if(roster.length<2 || !civ) return null;
  const matches=roster.filter(e=>label(e.civ,'en')===label(civ,'en'));
  return matches.length===1?matches[0].name:null;
}
export function localCivilization(lines: OcrLine[], playerName: string, civs: string[]): string | null {
  if (!clean(playerName) || observerScreen(lines)) return null;
  const named=lines.filter(l=>playerNameMatches(l.playerText ?? l.text,playerName));
  if (named.length!==1) return null;
  const row=named[0];
  const { labels, names: candidates } = rosterLines(lines, civs);
  for (const [civLine, name] of stackedPlayers([...labels.keys()], candidates)) {
    if (name === row) return labels.get(civLine) ?? null;
  }
  const aligned=lines.filter(l=>sameRow(l,row));
  const names=civNames;
  const civLabel=(text:string)=>civs.some(c=>names(c).some(a=>clean(text)===a));
  // Separate player cards can share a baseline. Any extra name makes that row
  // ambiguous; never stitch distant text or a partial username into an identity.
  if(aligned.some(l=>l!==row && !civLabel(l.text) && !/^\d+$/.test(l.text.trim()) && !isClanTag(l.text)))return null;
  const text=aligned.filter(l=>l===row || Math.max(0,l.x-row.x-row.width,row.x-l.x-l.width)<=row.height*16).map(l=>l.text).join(' ');
  const matches=civs.filter(c=>names(c).some(a=>phrase(text,a)));
  const identities=new Set(matches.map(c=>label(c,'en')));
  return identities.size===1?matches[0]:null;
}

export function readMatchLoading(lines: OcrLine[], playerName: string, civs: string[]) {
  if (!matchLoadingScreen(lines)) return null;
  return { roster: lobbyRoster(lines, civs), civ: localCivilization(lines, playerName, civs) };
}

export function chooseBuild(data: AppData, civ: string, mode: string): Build | null {
  const options=data.builds.filter(b=>clean(label(b.civ,'en'))===clean(label(civ,'en')) && label(b.mode,'en')===label(mode,'en'));
  const preferred=options.filter(b=>preferredBuildId(data.settings,civ,mode)===b.id);
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
