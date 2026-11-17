import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveAdvance, AdvanceGate, validAdvance } from '../src/lib/advance.ts';
import { defaultData, normalize, cloneBuild } from '../src/lib/defaults.ts';
import { importBackup, exportBackup, importBuilds } from '../src/lib/imports.ts';
const v=(food=0,wood=0,gold=0,stone=0)=>({food,wood,gold,stone});
const step=(action,villagers,note='',advance)=>({id:action,action,note,villagers,pop:13,time:null,...(advance?{advance}:{})});
const reading=(food,wood,gold,stone=0,idle=0)=>({workers:v(food,wood,gold,stone),idle,total:food+wood+gold+stone+idle});
const repeat=(gate,r,n=3)=>{let result;for(let i=0;i<n;i++)result=gate.read(r);return result;};
test('suggests current resource targets and keeps mixed building and age steps manual',()=>{
 const previous=step('2 nuevos a oro',v(6,0,2));
 assert.deepEqual(resolveAdvance(step('4 nuevas a ovejas',v(10,0,2),'Llegar a 10 en comida.'),previous),{kind:'resources',minimum:{food:10}});
 for(const action of ['Casa + 3 aldeanos a madera','Subir a Edad Feudal','Segundo campamento maderero','Build a house','Age up to Castle','Construir establo'])assert.equal(resolveAdvance(step(action,v(10,4,2)),previous).kind,'manual',action);
 assert.equal(resolveAdvance(step('6 aldeanos a ovejas',v(6),'Uno construye una casa y vuelve.')).kind,'manual');
 assert.equal(resolveAdvance(step('Subir a Castillos y mandar 4 aldeanos a oro',v(10,4,6))).kind,'manual');
 assert.equal(resolveAdvance(step('Explorar el mapa',v(10,4,2)),previous).kind,'manual');
 assert.deepEqual(resolveAdvance(step('Crear aldeanos',v(10,4,2))),{kind:'total',count:16});
});
test('infers a transfer from explicit source and destination, never from destination excess',()=>{
 const rule=resolveAdvance(step('2 de oro a madera',v(10,2,0)),step('4 nuevas a ovejas',v(10,0,2)));
 assert.deepEqual(rule,{kind:'transfer',from:'gold',to:'wood',count:2});
 const gate=new AdvanceGate(rule);
 assert.equal(repeat(gate,reading(10,4,2)).complete,false);
 assert.equal(repeat(gate,reading(10,6,2)).complete,false);
 assert.equal(repeat(gate,reading(10,6,0)).complete,true);
});
test('resource minima allow extras elsewhere but idle does not satisfy food',()=>{
 const gate=new AdvanceGate({kind:'resources',minimum:{food:10}});
 assert.equal(repeat(gate,reading(9,20,10,0,5)).complete,false);
 assert.equal(repeat(gate,reading(11,20,10,0,5),2).complete,false);
 assert.equal(gate.read(reading(12,22,10,0,5)).complete,true);
});
test('total includes idle; missing readings break confirmation; manual never completes',()=>{
 const gate=new AdvanceGate({kind:'total',count:12});
 repeat(gate,reading(6,2,2,0,2),2); gate.read(null);
 assert.equal(repeat(gate,reading(6,2,2,0,2),2).complete,false);
 assert.equal(gate.read(reading(6,2,2,0,2)).complete,true);
 assert.equal(repeat(new AdvanceGate({kind:'manual'}),reading(100,20,20)).complete,false);
});
test('transfer baseline is stable, survives suspension, and needs both net changes',()=>{
 const gate=new AdvanceGate({kind:'transfer',from:'gold',to:'wood',count:2});
 gate.read(reading(10,4,99));
 repeat(gate,reading(10,4,4));
 gate.suspend();
 assert.equal(repeat(gate,reading(10,4,2)).complete,false);
 assert.equal(repeat(gate,reading(10,6,4)).complete,false);
 assert.equal(repeat(gate,reading(10,6,2)).complete,true);
 const fresh=new AdvanceGate({kind:'transfer',from:'gold',to:'wood',count:2});
 assert.equal(repeat(fresh,reading(10,6,2),6).complete,false);
});
test('transition seed carries the last stable counts into the next transfer',()=>{
 const gate=new AdvanceGate({kind:'resources',minimum:{food:10}});
 repeat(gate,reading(10,4,2));
 const transfer=new AdvanceGate({kind:'transfer',from:'gold',to:'wood',count:2},gate.stableReading);
 assert.equal(repeat(transfer,reading(10,6,0)).complete,true);
});
test('advance rules survive load, clone, import and backup without shared mutable targets',()=>{
 const data=defaultData();data.builds[0].steps[0].advance={kind:'resources',minimum:{food:10}};
 assert.deepEqual(normalize(data).builds[0].steps[0].advance,data.builds[0].steps[0].advance);
 const copy=cloneBuild(data.builds[0]);copy.steps[0].advance.minimum.food=99;
 assert.equal(data.builds[0].steps[0].advance.minimum.food,10);
 assert.deepEqual(importBackup(exportBackup(data)),data);
 assert.deepEqual(importBuilds(JSON.stringify(data.builds[0]))[0].steps[0].advance,data.builds[0].steps[0].advance);
});
test('malformed rules reject backups and normalize to manual, never to automatic inference',()=>{
 for(const rule of [{kind:'total',count:0},{kind:'resources',minimum:{}},{kind:'resources',minimum:{food:NaN}},{kind:'transfer',from:'gold',to:'gold',count:2},{kind:'transfer',from:'gold',to:'wood',count:-1},{kind:'resources',minimum:{military:3}}])assert.equal(validAdvance(rule),false);
 const data=defaultData(); data.builds[0].steps[0].advance={kind:'transfer',from:'gold',to:'gold',count:2};
 assert.throws(()=>importBackup(exportBackup(data)),/advance|avance/i);
 assert.deepEqual(normalize(data).builds[0].steps[0].advance,{kind:'manual'});
});
