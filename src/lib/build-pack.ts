import { errorText } from './errors';
import { normalizeBuild } from './defaults';
import { validSubtasks } from './subtasks';
import { validAdvance } from './advance';
import type { Build } from './types';
export interface BuildPack { format:'aoe4-overlay-build-pack';version:1;id:string;name:string;reviewedAt:string;builds:Build[]; }
export function parsePack(text:string):BuildPack {
  const p=JSON.parse(text);
  if(p?.format!=='aoe4-overlay-build-pack'||p.version!==1||typeof p.id!=='string'||!p.id||typeof p.name!=='string'||typeof p.reviewedAt!=='string'||!Array.isArray(p.builds)||!p.builds.length||p.builds.length>100)throw new Error(errorText('Paquete de builds inválido o versión no compatible.'));
  const ids=new Set<string>();
  for(const b of p.builds){
    if(!b||typeof b.id!=='string'||!b.id||ids.has(b.id)||!['name','civ','mode','map'].every(k=>typeof b[k]==='string')||!Array.isArray(b.steps)||!b.steps.length)throw new Error(errorText('Build inválido o duplicado en el paquete.'));
    ids.add(b.id);
    if(b.provenance?.packId!==p.id||!['author','source','reviewedAt'].every(k=>typeof b.provenance?.[k]==='string'&&b.provenance[k].length>0))throw new Error(errorText('Falta la atribución de un build.'));
    const steps=new Set<string>();
    for(const s of b.steps){
      if(!s||typeof s.id!=='string'||!s.id||steps.has(s.id)||typeof s.action!=='string'||typeof s.note!=='string'||!['food','wood','gold','stone'].every(k=>Number.isInteger(s.villagers?.[k])&&s.villagers[k]>=0&&s.villagers[k]<=200)||(s.time!==null&&(!Number.isFinite(s.time)||s.time<0))||(s.pop!==null&&(!Number.isFinite(s.pop)||s.pop<0))||(s.advance!==undefined&&!validAdvance(s.advance))||(s.subtasks!==undefined&&!validSubtasks(s.subtasks)))throw new Error(errorText('Paso inválido en el paquete.'));
      steps.add(s.id);
    }
  }
  return {format:p.format,version:1,id:p.id,name:p.name,reviewedAt:p.reviewedAt,builds:p.builds.map(normalizeBuild)};
}
/** Stable public IDs prevent repeated installs from replacing local edits. */
export function mergePack(existing:Build[],pack:BuildPack):Build[]{
  const ids=new Set(existing.map(b=>b.id));
  return [...existing,...pack.builds.filter(b=>!ids.has(b.id)).map(b=>structuredClone(b))];
}
