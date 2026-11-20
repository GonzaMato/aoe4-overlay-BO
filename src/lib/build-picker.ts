import { civilizationKey } from './civilizations';
import { label, type Language } from './i18n';
import type { Build } from './types';

export function pickerCivKey(civ: string): string {
 return civilizationKey(civ) ?? `custom:${civ.trim().toLocaleLowerCase()}`;
}
export function pickerCivilizations(builds: Build[], language: Language) {
 const groups = new Map<string, {key:string;civ:string;count:number}>();
 for (const build of builds) {
  const key=pickerCivKey(build.civ), group=groups.get(key);
  if(group)group.count++;else groups.set(key,{key,civ:build.civ,count:1});
 }
 return [...groups.values()].sort((a,b)=>label(a.civ,language).localeCompare(label(b.civ,language),language));
}
export function pickerBuilds(builds: Build[], key: string, language: Language): Build[] {
 return builds.filter(b=>pickerCivKey(b.civ)===key).sort((a,b)=>a.name.localeCompare(b.name,language));
}
