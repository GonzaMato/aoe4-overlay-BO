import { derived, get, writable } from 'svelte/store';
import type { HotkeyAction, Resource } from './types';

export type Language = 'en' | 'es';
export const locale = writable<Language>('en');
export const normalizeLanguage = (value: unknown): Language => value === 'es' ? 'es' : 'en';
export const t = derived(locale, language => (es: string, en: string): string => language === 'es' ? es : en);
/** For event handlers and non-reactive services. Components use $t instead. */
export const tr = (es: string, en: string): string => get(t)(es, en);
export const currentLanguage = (): Language => get(locale);
const resources: Record<Resource, [string,string]> = { food:['Comida','Food'],wood:['Madera','Wood'],gold:['Oro','Gold'],stone:['Piedra','Stone'] };
export const resourceLabel = (r: Resource, language: Language = currentLanguage()): string => resources[r][language === 'es' ? 0 : 1];
const hotkeys: Record<HotkeyAction, [string,string]> = {
 next:['Paso siguiente','Next step'],prev:['Paso anterior','Previous step'],
 start:['Iniciar / reanudar reloj (conserva el paso)','Start / resume timer (keep current step)'],
 editPosition:['Editar posición del overlay','Move overlay'],resetPractice:['Nueva práctica (paso 1 y reloj en 0:00)','New practice (step 1 and timer at 0:00)'],
 resetClock:['Reiniciar reloj (conserva el paso)','Reset timer (keep current step)'],pauseClock:['Pausar / reanudar reloj','Pause / resume timer'],
 clockPlus:['Reloj +5 segundos','Timer +5 seconds'],clockMinus:['Reloj −5 segundos','Timer −5 seconds'],finishPractice:['Terminar práctica','Finish practice'],
 toggleVisible:['Mostrar / ocultar overlay','Show / hide overlay'],toggleCompact:['Modo compacto','Compact mode'],cycleBuild:['Cambiar de build (misma civilización)','Switch build (same civilization)']
};
export const hotkeyLabel = (action: HotkeyAction, language: Language = currentLanguage()): string => hotkeys[action][language === 'es' ? 0 : 1];
export const labelPairs: [string,string][] = [
 ['Ingleses','English'],['Franceses','French'],['Sacro Imperio Romano Germánico','Holy Roman Empire'],['Rus','Rus'],['Mongoles','Mongols'],['Chinos','Chinese'],
 ['Sultanato de Delhi','Delhi Sultanate'],['Dinastía Abasí','Abbasid Dynasty'],['Otomanos','Ottomans'],['Malienses','Malians'],['Bizantinos','Byzantines'],['Japoneses','Japanese'],
 ['Orden del Dragón','Order of the Dragon'],['Legado de Zhu Xi',"Zhu Xi's Legacy"],['Juana de Arco',"Jeanne d'Arc"],['Ayubíes','Ayyubids'],['Caballeros Templarios','Knights Templar'],
 ['Casa de Lancaster','House of Lancaster'],['Horda de Oro','Golden Horde'],['Dinastía Macedónica','Macedonian Dynasty'],['Daimio Sengoku','Sengoku Daimyo'],['Dinastía Tughlaq','Tughlaq Dynasty'],
 ['Dinastía Jin','Jin Dynasty'],['Vikingos','Vikings'],['Escoceses','Scots'],['Equipos','Teams'],['Tierra','Land'],['Agua','Water'],['Híbrido','Hybrid']
];
/** Display only: never rewrite persisted filters, default keys or user text. */
export function label(value: string, language: Language = currentLanguage()): string {
 const pair=labelPairs.find(pair=>pair.includes(value));return pair?pair[language==='es'?0:1]:value;
}
export function uniqueLabels(values:string[], preferred?:string):string[] {
 const result=new Map<string,string>();
 for(const value of values){const key=label(value,'en');if(!result.has(key)||value===preferred)result.set(key,value);}
 return [...result.values()];
}
