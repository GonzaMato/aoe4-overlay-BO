import { test } from 'node:test';
import assert from 'node:assert/strict';
import { get } from 'svelte/store';
import { locale, t, label, resourceLabel, hotkeyLabel } from '../src/lib/i18n.ts';
import { defaultData, normalize } from '../src/lib/defaults.ts';
import { exportBackup, importBackup } from '../src/lib/imports.ts';
import { prettyHotkey } from '../src/lib/hotkeys.ts';
import { advanceLabel } from '../src/lib/advance.ts';
import { localCivilization, chooseBuild } from '../src/lib/setup.ts';
import { parsePack } from '../src/lib/build-pack.ts';
import { readFileSync } from 'node:fs';
import { preferredBuildId, setDefaultBuild } from '../src/lib/util.ts';

test('language defaults, normalization and backup preserve user content',()=>{
 const data=defaultData(); assert.equal(data.settings.language,'en');
 data.settings.language='es';data.builds[0].name='Mi apertura editada';
 assert.equal(normalize(data).settings.language,'es');
 const restored=importBackup(exportBackup(data));
 assert.equal(restored.settings.language,'es');assert.equal(restored.builds[0].name,'Mi apertura editada');
 delete data.settings.language;assert.equal(normalize(data).settings.language,'en');
 data.settings.language='unsupported';assert.equal(normalize(data).settings.language,'en');
});
test('localized editions share a single civilization default',()=>{
 const data=defaultData(), english=data.builds[0], spanish=defaultData('es').builds[0];data.builds.push(spanish);
 data.settings.defaults={};
 setDefaultBuild(data.settings,spanish);assert.equal(chooseBuild(data,'English','1v1')?.id,spanish.id);
 setDefaultBuild(data.settings,english);assert.equal(Object.keys(data.settings.defaults).length,1);
 assert.equal(preferredBuildId(data.settings,'Ingleses','1v1'),english.id);
 assert.equal(chooseBuild(data,'Ingleses','1v1')?.id,english.id);
 setDefaultBuild(data.settings,english,false);assert.equal(chooseBuild(data,'English','1v1'),null);
});
test('English and Spanish starter packs preserve rules and support either game language',()=>{
 const es=parsePack(readFileSync('static/builds/starter-pack.json','utf8'));
 const en=parsePack(readFileSync('static/builds/starter-pack.en.json','utf8'));
 assert.equal(en.builds.length,50);assert.equal(defaultData().builds[0].civ,'English');
 en.builds.forEach((b,i)=>{
  const original=es.builds[i];assert.equal(b.id,original.id+'-en');assert.equal(b.provenance.source,original.provenance.source);
  assert.equal(b.steps.length,original.steps.length);
  b.steps.forEach((s,j)=>{const prev=original.steps[j];assert.deepEqual([s.id,s.time,s.pop,s.villagers,s.advance],[prev.id,prev.time,prev.pop,prev.villagers,prev.advance]);assert.deepEqual(s.subtasks?.map(t=>[t.id,t.advance]),prev.subtasks?.map(t=>[t.id,t.advance]));});
 });
 const row=text=>({text,x:text==='Me'?100:400,y:200,width:120,height:20});
 assert.equal(localCivilization([row('Me'),row('English')],'Me',['Ingleses','English']),'Ingleses');
 assert.equal(localCivilization([row('Me'),row('Ingleses')],'Me',['English']),'English');
 assert.equal(chooseBuild(defaultData(),'Ingleses','1v1')?.civ,'English');
});
test('reactive translations and display labels do not alter custom content',()=>{
 locale.set('en');assert.equal(get(t)('Inicio','Home'),'Home');
 locale.set('es');assert.equal(get(t)('Inicio','Home'),'Inicio');locale.set('en');
 assert.equal(label('Ingleses','en'),'English');assert.equal(label('English','es'),'Ingleses');
 assert.equal(label('My custom map','es'),'My custom map');
 assert.equal(resourceLabel('food','en'),'Food');assert.equal(resourceLabel('wood','es'),'Madera');
 assert.equal(hotkeyLabel('next','en'),'Next step');
 assert.equal(prettyHotkey('PageDown','en'),'PgDn');assert.equal(prettyHotkey('PageDown','es'),'AvPág');
 assert.match(advanceLabel({kind:'manual'},'en'),/PgDn/);assert.match(advanceLabel({kind:'manual'},'es'),/AvPág/);
});
