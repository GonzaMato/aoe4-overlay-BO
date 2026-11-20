import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const root=process.cwd(), lock=JSON.parse(fs.readFileSync('package-lock.json','utf8'));
const records=[];
const upstreamLicenses={
 '@polka/url':'polka', '@rolldown/binding-win32-x64-msvc':'rolldown',
 '@tauri-apps/cli-win32-x64-msvc':'tauri', 'tauri-plugin':'tauri',
 'alloc-stdlib':'alloc-stdlib', sirv:'sirv',
 'webview2-com':'webview2', 'webview2-com-macros':'webview2', 'webview2-com-sys':'webview2'
};
function add(name,version,license,folder,source,extra){
 const entries=fs.readdirSync(folder,{withFileTypes:true}).filter(e=>e.isFile()&&/^(licen[cs]e|copying|notice|ofl)([._-]|$)/i.test(e.name)).map(e=>path.join(folder,e.name));
 if(extra&&fs.existsSync(extra)&&!entries.includes(extra))entries.push(extra);
 const upstream=upstreamLicenses[name];
 if(!entries.length&&upstream)entries.push(path.join(root,'scripts','licenses',`${upstream}.txt`));
 records.push({name,version,license,source,text:entries.sort().map(f=>`${path.basename(f)}\n${fs.readFileSync(f,'utf8')}`).join('\n\n')});
}
for(const [location,meta] of Object.entries(lock.packages)){
 if(!location)continue;
 const folder=path.join(root,location),manifest=path.join(folder,'package.json');
 if(!fs.existsSync(manifest))continue;
 const p=JSON.parse(fs.readFileSync(manifest,'utf8'));
 add(p.name,p.version,typeof p.license==='string'?p.license:meta.license,folder,`https://www.npmjs.com/package/${p.name}/v/${p.version}`);
}
const cargo=process.env.CARGO||'cargo';
const metadata=JSON.parse(execFileSync(cargo,['metadata','--locked','--offline','--format-version','1','--manifest-path','src-tauri/Cargo.toml','--filter-platform','x86_64-pc-windows-msvc'],{encoding:'utf8',maxBuffer:20_000_000}));
const used=new Set(metadata.resolve.nodes.map(n=>n.id));
for(const p of metadata.packages){
 if(!p.source||!used.has(p.id))continue;
 const folder=path.dirname(p.manifest_path);
 add(p.name,p.version,p.license,folder,`https://crates.io/crates/${p.name}/${p.version}`,p.license_file?path.resolve(folder,p.license_file):null);
}
const header='AoE4 Overlay — avisos de terceros\n\nEl código propio usa GPL-3.0-only. Las dependencias conservan sus licencias.\nEsta lista incluye herramientas de compilación, además de dependencias de ejecución.\nLas fuentes de cada dependencia están en las URL indicadas y fijadas por los lockfiles.\nLos builds de juego tienen su atribución separada en docs/build-pack-sources.md.\n';
const flagsNotice=fs.readFileSync('static/civilizations/NOTICE.md','utf8');
fs.writeFileSync('THIRD-PARTY-NOTICES.txt',header+'\n'+flagsNotice+'\n'+records.sort((a,b)=>a.name.localeCompare(b.name)).map(r=>`============================================================\n${r.name} ${r.version}\nLicencia: ${r.license??'Ver fuente'}\nFuente: ${r.source}\n\n${r.text||'El paquete no incluye un archivo de licencia separado; consultar la fuente indicada.'}\n`).join('\n'));
console.log(`${records.length} dependencias; ${records.filter(r=>!r.text).length} sin archivo separado.`);
