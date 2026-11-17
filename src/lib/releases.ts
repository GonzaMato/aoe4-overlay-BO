export const REPOSITORY='https://github.com/GonzaMato/aoe4-overlay-BO';
export const RELEASES_URL=REPOSITORY+'/releases';
const version=(s:string)=>{const m=/^v?(\d+)\.(\d+)\.(\d+)$/.exec(s);if(!m)throw new Error('Versión no compatible.');return m.slice(1).map(Number);};
export function releaseResult(current:string,raw:unknown):{kind:'new'|'current';version:string} {
  const r=raw as {tag_name?:string;html_url?:string;draft?:boolean;prerelease?:boolean};
  if(!r||r.draft!==false||r.prerelease!==false||typeof r.tag_name!=='string'||r.html_url!==RELEASES_URL+'/tag/'+r.tag_name)throw new Error('GitHub devolvió una versión no válida.');
  const a=version(current),b=version(r.tag_name);
  let newer=false;
  for(let i=0;i<3;i++){if(a[i]!==b[i]){newer=b[i]>a[i];break;}}
  return {kind:newer?'new':'current',version:r.tag_name};
}
export async function checkRelease(current:string):Promise<string>{
  const response=await fetch('https://api.github.com/repos/GonzaMato/aoe4-overlay-BO/releases/latest',{headers:{Accept:'application/vnd.github+json'},signal:AbortSignal.timeout(12000)});
  if(response.status===404)return 'Todavía no hay una versión pública disponible.';
  if(response.status===403||response.status===429)throw new Error('GitHub limitó las consultas. Probá más tarde o abrí Descargas.');
  if(!response.ok)throw new Error('No se pudo consultar GitHub. Probá más tarde.');
  const result=releaseResult(current,await response.json());
  return result.kind==='new'?`Hay una versión nueva: ${result.version}. Descargala desde Descargas.`:'Tenés la última versión estable publicada.';
}
