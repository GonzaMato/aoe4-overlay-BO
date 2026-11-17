import test from 'node:test';
import assert from 'node:assert/strict';
import { activeTask, moveTask, isLastTask, suggestSubtasks, taskRule, reconcileCursor } from '../src/lib/subtasks.ts';
import { defaultData, normalize, cloneBuild } from '../src/lib/defaults.ts';
import { exportBackup, importBackup, importBuilds } from '../src/lib/imports.ts';
import { AdvanceGate } from '../src/lib/advance.ts';
const mixed=()=>({id:'mixed',action:'Casa + 3 aldeanos a madera',note:'',pop:12,time:80,villagers:{food:6,wood:3,gold:2,stone:0}});
test('suggestions preserve clauses and keep buildings manual, resource targets automatic',()=>{
 const s=mixed();s.subtasks=suggestSubtasks(s);
 assert.deepEqual(s.subtasks.map(t=>t.action),['Casa','3 aldeanos a madera']);
 assert.deepEqual(taskRule(s,0),{kind:'manual'});
 assert.deepEqual(taskRule(s,1),{kind:'resources',minimum:{wood:3}});
 assert.equal(activeTask(s,1).action,'3 aldeanos a madera');
 assert.equal(s.action,'Casa + 3 aldeanos a madera');
 const age={...mixed(),action:'3 nuevos a comida; Subir a Edad Feudal',note:'Esperar 400 de comida.'};
 assert.equal(suggestSubtasks(age)[1].advance.kind,'manual');
 assert.equal(suggestSubtasks(age)[2].advance.kind,'manual');
});
test('navigation visits every subtask, reverses across parents, and only finishes at the actual end',()=>{
 const first=mixed();first.subtasks=suggestSubtasks(first);
 const last={...mixed(),id:'last',subtasks:suggestSubtasks(mixed())};
 const b={steps:[first,last]};
 let c={step:0,task:0};
 for(const expected of [{step:0,task:1},{step:1,task:0},{step:1,task:1}]){assert.equal(isLastTask(b,c),false);c=moveTask(b,c,1);assert.deepEqual(c,expected);}
 assert.equal(isLastTask(b,c),true);assert.deepEqual(moveTask(b,c,1),c);
 assert.deepEqual(moveTask(b,{step:1,task:0},-1),{step:0,task:1});
 assert.deepEqual(moveTask(b,{step:0,task:0},-1),{step:0,task:0});
 assert.equal(isLastTask({steps:[]},{step:0,task:0}),false);
});
test('manual prerequisite cannot be skipped by OCR, then resources require three readings',()=>{
 const s=mixed();s.subtasks=suggestSubtasks(s);
 const r={workers:{food:6,wood:3,gold:2,stone:0},idle:0,total:11};
 const manual=new AdvanceGate(taskRule(s,0));for(let i=0;i<5;i++)assert.equal(manual.read(r).complete,false);
 const automatic=new AdvanceGate(taskRule(s,1),manual.stableReading);
 assert.equal(automatic.read(r).complete,false);assert.equal(automatic.read(r).complete,false);assert.equal(automatic.read(r).complete,true);
});
test('legacy steps remain unchanged; subtasks persist through backup and clone with fresh IDs',()=>{
 const data=defaultData();assert.deepEqual(normalize(data),data);
 const s=data.builds[0].steps[0];s.subtasks=suggestSubtasks(mixed());
 assert.deepEqual(importBackup(exportBackup(data)),data);
 const copy=cloneBuild(data.builds[0]);assert.notEqual(copy.steps[0].subtasks[0].id,s.subtasks[0].id);
 copy.steps[0].subtasks[1].advance.minimum.wood=80;assert.equal(s.subtasks[1].advance.minimum.wood,3);
 const imported=importBuilds(JSON.stringify(data.builds[0]))[0];assert.notEqual(imported.steps[0].subtasks[0].id,s.subtasks[0].id);
});
test('invalid or duplicate subtasks fail closed and backups reject them',()=>{
 for(const invalid of [null,{},[],[{id:'x',action:'Casa',note:'',advance:{kind:'total',count:0}}],Array.from({length:2},()=>({id:'same',action:'Casa',note:'',advance:{kind:'manual'}}))]) {
  const d=defaultData();d.builds[0].steps[0].subtasks=invalid;
  assert.throws(()=>importBackup(exportBackup(d)),/subtarea/i);
  assert.throws(()=>importBuilds(JSON.stringify(d.builds[0])),/subtarea/i);
  const step=normalize(d).builds[0].steps[0];assert.equal(step.subtasks,undefined);assert.deepEqual(step.advance,{kind:'manual'});
 }
});
test('repeated resource clauses do not use the final allocation as an intermediate target',()=>{
 const s={...mixed(),action:'2 a madera; Construir casa; 2 a madera'};
 assert.deepEqual(suggestSubtasks(s).map(t=>t.advance.kind),['manual','manual','manual']);
});
test('editing another step or moving the active step preserves the active subtask by ID',()=>{
 const s=mixed();s.subtasks=suggestSubtasks(s);const b={steps:[s,{...mixed(),id:'later'}]};
 const edited=structuredClone(b);edited.steps[1].note='Otro detalle';
 assert.deepEqual(reconcileCursor(b,edited,{step:0,task:1}),{step:0,task:1});
 edited.steps.reverse();assert.deepEqual(reconcileCursor(b,edited,{step:0,task:1}),{step:1,task:1});
 edited.steps[1].subtasks.reverse();assert.deepEqual(reconcileCursor(b,edited,{step:0,task:1}),{step:1,task:0});
 edited.steps[1].subtasks=[];assert.deepEqual(reconcileCursor(b,edited,{step:0,task:1}),{step:1,task:0});
});
