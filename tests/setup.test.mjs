import { test } from 'node:test';
import assert from 'node:assert/strict';
import { profileKey, relativeRect, absoluteRect, validProfile, parseGameTime, localCivilization, chooseBuild, ClockTracker } from '../src/lib/setup.ts';
import { defaultData, normalize } from '../src/lib/defaults.ts';
import { exportBackup, importBackup } from '../src/lib/imports.ts';

const geometry = { x:-1920, y:100, width:1920, height:1080, monitor:'DISPLAY2', dpi:144 };
test('profiles follow game client coordinates and separate resolution and DPI', () => {
  const rect={x:-1730,y:1000,width:50,height:160};
  assert.deepEqual(relativeRect(rect,geometry), {x:190,y:900,width:50,height:160});
  assert.deepEqual(absoluteRect({x:190,y:900,width:50,height:160},{...geometry,x:0,y:0}), {x:190,y:900,width:50,height:160});
  assert.equal(profileKey(geometry),profileKey({...geometry,x:0,y:0}));
  assert.notEqual(profileKey(geometry),profileKey({...geometry,dpi:96}));
  assert.notEqual(profileKey(geometry),profileKey({...geometry,width:2560}));
});
test('profiles reject clipped and incomplete regions before capture', () => {
  const p={key:profileKey(geometry),width:1920,height:1080,workers:{x:190,y:900,width:50,height:160},idle:{x:190,y:840,width:50,height:40},clock:null,position:null};
  assert.equal(validProfile(p),true);
  assert.equal(validProfile({...p,idle:null}),false);
  assert.equal(validProfile({...p,workers:{...p.workers,y:1000}}),false);
});
test('legacy data leaves setup opt-in and backup preserves profiles', () => {
  const data=defaultData();
  assert.equal(data.settings.setup.enabled,false);
  data.settings.setup.playerName='MyName';
  assert.equal(importBackup(exportBackup(data)).settings.setup.playerName,'MyName');
  const old=structuredClone(data); delete old.settings.setup;
  assert.equal(normalize(old).settings.setup.enabled,false);
  data.settings.setup.profiles=[{key:'broken'}];
  assert.throws(()=>importBackup(exportBackup(data)),/setup/);
});
const line=(text,x,y,width=180,height=24)=>({text,x,y,width,height});
test('civilization belongs to the named player row, never a rival or ambiguous observer screen', () => {
  const civs=['Ingleses','Franceses'];
  const rows=[line('Rival',100,100),line('French',400,100),line('MyName',100,200),line('English',400,200)];
  assert.equal(localCivilization(rows,'MyName',civs),'Ingleses');
  assert.equal(localCivilization(rows,'',civs),null);
  assert.equal(localCivilization([...rows,line('English',600,100)],'Rival',civs),null);
  assert.equal(localCivilization([...rows,line('Replay',0,0)],'MyName',civs),null);
  assert.equal(localCivilization([line('MyName2',100,200),line('English',400,200)],'MyName',civs),null);
});
test('auto build selection respects civilization and explicit mode/default', () => {
  const d=defaultData('es');
  assert.equal(chooseBuild(d,'Ingleses','1v1')?.id,'starter-2026-11-eng');
  d.builds.push({...d.builds[0],id:'other'});
  assert.equal(chooseBuild(d,'Ingleses','1v1'),null);
  d.settings.defaults['Ingleses|1v1']='other';
  assert.equal(chooseBuild(d,'Ingleses','1v1')?.id,'other');
  assert.equal(chooseBuild(d,'Ingleses','Equipos'),null);
});
test('civilization never crosses a rival card or accepts a longer player name',()=>{
 const civs=['Ingleses','Franceses'];
 assert.equal(localCivilization([line('MyName',100,100),line('Rival',1000,100),line('French',1200,100)],'MyName',civs),null);
 assert.equal(localCivilization([line('MyName Other',100,100),line('French',400,100)],'MyName',civs),null);
 assert.equal(localCivilization([line('MyName',100,100),line('Rival',300,100),line('French',500,100)],'MyName',civs),null);
 assert.equal(localCivilization([line('MyName',100,100),line('French',1200,100)],'MyName',civs),null);
});
test('stationary game time freezes automatic advancement until time progresses again',()=>{
 const c=new ClockTracker();c.read(120,0);c.read(121,1000);c.read(122,2000);
 assert.equal(c.read(122,3500),null);
 assert.equal(c.read(122,5000),null);
 assert.deepEqual(c.read(123,6500),{seconds:123,newMatch:false});
});
test('clock requires plausible progression, rejects rollback and stale samples', () => {
  assert.equal(parseGameTime('01:23'),83);
  assert.equal(parseGameTime('1:02:03'),3723);
  assert.equal(parseGameTime('1:99'),null);
  const c=new ClockTracker();
  assert.equal(c.read(120,0),null);
  assert.equal(c.read(121,1000),null);
  assert.deepEqual(c.read(122,2000),{seconds:122,newMatch:false});
  assert.equal(c.read(122,3000),null);
  assert.equal(c.read(0,4000),null);
  assert.equal(c.read(1,5000),null);
  assert.equal(c.read(2,6000),null);
  c.suspend();
  assert.equal(c.read(180,60000),null);
});
test('manual clock override survives focus and readings until resume or a confirmed lobby transition', () => {
  const c=new ClockTracker(); c.read(120,0); c.read(121,1000); c.read(122,2000);
  c.override(); c.suspend();
  assert.equal(c.read(130,10000),null);
  assert.equal(c.manual,true);
  c.resume(); c.read(131,11000); c.read(132,12000);
  assert.deepEqual(c.read(133,13000),{seconds:133,newMatch:false});
  c.override(); c.lobby();
  assert.equal(c.read(0,20000),null); assert.equal(c.read(1,21000),null);
  assert.deepEqual(c.read(2,22000),{seconds:2,newMatch:true});
  assert.equal(c.manual,false);
});
