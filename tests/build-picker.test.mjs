import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickerCivilizations, pickerBuilds, pickerCivKey } from '../src/lib/build-picker.ts';
import { defaultData, normalize } from '../src/lib/defaults.ts';

test('picker combines bilingual civilization names and lists every build without changing the library',()=>{
 const builds=[...defaultData('en').builds,...defaultData('es').builds];
 const snapshot=structuredClone(builds);
 const groups=pickerCivilizations(builds,'en');
 assert.equal(groups.length,25);
 for(const group of groups){
  assert.equal(group.count,4);
  assert.equal(pickerBuilds(builds,group.key,'en').length,4);
 }
 assert.deepEqual(builds,snapshot);
 assert.equal(pickerCivKey('  INGLESES '),pickerCivKey('English'));
});

test('picker preserves custom and unassigned civilizations and handles empty libraries',()=>{
 const template=defaultData().builds[0];
 const builds=[{...template,id:'a',civ:'My Civ'},{...template,id:'b',civ:''},{...template,id:'c',civ:'Another Civ'}];
 assert.equal(pickerCivilizations(builds,'es').length,3);
 assert.deepEqual(pickerBuilds(builds,pickerCivKey('My Civ'),'en').map(b=>b.id),['a']);
 assert.deepEqual(pickerCivilizations([],'en'),[]);
 assert.deepEqual(pickerBuilds(builds,'deleted','en'),[]);
});

test('picker shortcut migrates without changing existing assignments or disabling user choices',()=>{
 const data=defaultData();delete data.settings.hotkeys.chooseBuild;
 data.settings.hotkeys.cycleBuild='KeyB';
 const result=normalize(data);
 assert.equal(result.settings.hotkeys.chooseBuild,'Ctrl+Alt+KeyO');
 assert.equal(result.settings.hotkeys.cycleBuild,'KeyB');
 result.settings.hotkeys.chooseBuild='';assert.equal(normalize(result).settings.hotkeys.chooseBuild,'');
});
