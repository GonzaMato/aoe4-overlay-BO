import { test } from 'node:test';
import assert from 'node:assert/strict';
import { importBuilds, exportBackup, importBackup } from '../src/lib/imports.ts';
import { defaultData, normalize } from '../src/lib/defaults.ts';
import { PracticeClock, recordArrival, newPractice } from '../src/lib/practice.ts';
import { VillagerTotalGate } from '../src/lib/ocr.ts';

test('aoe4guides export preserves resources, time, notes and unknown population', () => {
  const [b] = importBuilds(JSON.stringify({ name:'FC', civilization:'English', build_order:[{population_count:-1, villager_count:10, time:'2:30', resources:{food:6,gold:3,builder:1}, notes:['Build @buildings/house.webp@','Then gold']}]}));
  assert.equal(b.civ,'Ingleses'); assert.equal(b.steps[0].pop,null);
  assert.equal(b.steps[0].time,150); assert.equal(b.steps[0].villagers.gold,3);
  assert.match(b.steps[0].action,/house/); assert.match(b.steps[0].note,/Then gold/); assert.match(b.steps[0].note,/1/);
});
test('imports reject malformed batches atomically and regenerate all IDs', () => {
  assert.throws(()=>importBuilds('[{"steps":[]},null]'));
  assert.throws(()=>importBuilds('{"steps":[null]}'));
  const original=defaultData().builds[0]; const [copy]=importBuilds(JSON.stringify(original));
  assert.notEqual(copy.id,original.id); assert.notEqual(copy.steps[0].id,original.steps[0].id);
});
test('old saved data keeps custom hotkeys and receives opt-in OCR and empty history', () => {
  const old=defaultData(); delete old.practices; delete old.settings.ocr; delete old.settings.position;
  old.settings.hotkeys={next:'KeyN',prev:''};
  const migrated=normalize(old);
  assert.equal(migrated.settings.hotkeys.next,'KeyN'); assert.equal(migrated.settings.hotkeys.prev,'');
  assert.equal(migrated.settings.ocr.enabled,false); assert.deepEqual(migrated.practices,[]);
  assert.equal(migrated.settings.position,null);
});
test('backup roundtrip preserves IDs, settings and practice history', () => {
  const data=defaultData(); assert.deepEqual(importBackup(exportBackup(data)),data);
  assert.throws(()=>importBackup('{"builds":[]}'));
  const bad=JSON.parse(exportBackup(data)); bad.data.settings.scale='bad'; assert.throws(()=>importBackup(JSON.stringify(bad)));
});
test('backup rejects duplicate keys, invalid resources and malformed history before replacement', () => {
  const data=defaultData();
  data.builds[0].steps[1].id=data.builds[0].steps[0].id;
  assert.throws(()=>importBackup(exportBackup(data)));
  const bad=defaultData(); bad.builds[0].steps[0].villagers.food='x';
  assert.throws(()=>importBackup(exportBackup(bad)));
  const history=defaultData(); history.practices=[{ id:'p', buildId:'b', buildName:'b', startedAt:1000, finishedAt:null, arrivals:[{index:0,elapsed:10,target:0}] }];
  assert.throws(()=>importBackup(exportBackup(history)));
});
test('clock pause/resume and negative correction clamp correctly', () => {
  const c=new PracticeClock(); c.start(1000); assert.equal(c.elapsed(11000),10);
  c.pause(11000); assert.equal(c.elapsed(21000),10); c.adjust(-5,21000); assert.equal(c.elapsed(21000),5);
  c.start(21000); assert.equal(c.elapsed(26000),10); c.adjust(-50,26000); assert.equal(c.elapsed(26000),0);
});
test('practice preserves first arrival and snapshots targets', () => {
  const b=defaultData().builds[0]; const p=newPractice(b,1000);
  b.steps[1].time=60;
  recordArrival(p,b,1,70); recordArrival(p,b,1,95); b.steps[1].time=999;
  assert.equal(p.arrivals[0].elapsed,70); assert.equal(p.arrivals[0].target,60);
});
test('new practice invalidates in-flight OCR and previously accumulated stability', () => {
  const gate = new VillagerTotalGate(); gate.read(37); gate.read(37);
  const pendingRequest = gate.generation;
  gate.reset();
  assert.equal(gate.isCurrent(pendingRequest), false);
  assert.equal(gate.read(37), null);
});
