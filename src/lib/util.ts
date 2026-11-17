import { label } from './i18n';
import type { Build, Settings } from './types';
export const uid = (): string =>
	Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

/** Segundos → "m:ss". */
export function formatTime(s: number | null | undefined): string {
	if (s == null) return '';
	const abs = Math.max(0, Math.floor(s));
	return `${Math.floor(abs / 60)}:${String(abs % 60).padStart(2, '0')}`;
}

/** "m:ss" (o segundos sueltos) → segundos. Vacío o inválido → null. */
export function parseTime(text: string): number | null {
	const v = text.trim();
	if (!v) return null;
	const m = v.match(/^(\d+)[:.]([0-5]?\d)$/);
	if (m) return Number(m[1]) * 60 + Number(m[2]);
	if (/^\d+$/.test(v)) return Number(v);
	return null;
}

export const defaultKey = (civ: string, mode: string): string => `${civ}|${mode}`;
const sameDefault=(key:string,civ:string,mode:string)=>{
 const split=key.lastIndexOf('|');
 return split>=0 && label(key.slice(0,split),'en')===label(civ,'en') && label(key.slice(split+1),'en')===label(mode,'en');
};
export function preferredBuildId(settings:Settings,civ:string,mode:string):string|null {
 const ids=[...new Set(Object.entries(settings.defaults).filter(([key])=>sameDefault(key,civ,mode)).map(([,id])=>id))];
 return ids.length===1?ids[0]:settings.activeBuildId&&ids.includes(settings.activeBuildId)?settings.activeBuildId:null;
}
export function setDefaultBuild(settings:Settings,build:Build,enabled=true):void {
 for(const key of Object.keys(settings.defaults))if(sameDefault(key,build.civ,build.mode))delete settings.defaults[key];
 if(enabled)settings.defaults[defaultKey(build.civ,build.mode)]=build.id;
}
