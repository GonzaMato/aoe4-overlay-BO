import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SetupController } from '../src/lib/setup-controller.ts';
import { PracticeClock, newPractice, recordArrival } from '../src/lib/practice.ts';
import { defaultData } from '../src/lib/defaults.ts';
import { CounterCalibration, canConfirm } from '../src/lib/onboarding.ts';
const g={x:0,y:0,width:1920,height:1080,monitor:'DISPLAY1',dpi:96};
test('calibration requires three consecutive matching distributions and idle counts', () => {
 const calibration = new CounterCalibration();
 const samples = [[8,0,0], [80,0,0], [8,0,0], [7,1,0], [7,1,1], [7,1,1], [7,1,1]];
 const confirmations = samples.map(([food,wood,idle], i) => {
   const now = 1000 + i * 1500;
   const sample = calibration.observe({workers:{food,wood,gold:0,stone:0},idle,total:food+wood+idle},'regions',now);
   return canConfirm(sample,now);
 });
 assert.deepEqual(confirmations,[false,false,false,false,false,false,true]);
});
test('a brief OCR loss while switching windows preserves the last confirmable sample',()=>{
 const calibration=new CounterCalibration();
 const reading={workers:{food:5,wood:0,gold:0,stone:0},idle:0,total:5};
 calibration.observe(reading,'regions',1000);
 calibration.observe(reading,'regions',2500);
 assert.equal(canConfirm(calibration.sample,2500),false);
 calibration.observe(reading,'regions',4000);
 calibration.interrupt();
 assert.deepEqual(calibration.sample,{...reading,at:4000,stable:true});
 assert.equal(canConfirm(calibration.sample,5000),true);
 assert.equal(canConfirm(calibration.sample,65000),false);

 calibration.observe(reading,'changed regions',5500);
 assert.equal(canConfirm(calibration.sample,5500),false);
 calibration.interrupt();
 assert.equal(calibration.sample,null);
 calibration.observe(reading,'regions',7000);
 calibration.observe(reading,'regions',8500);
 calibration.observe(reading,'regions',10000);
 calibration.reset();
 assert.equal(calibration.sample,null);
});
test('manual changes, focus loss and geometry changes invalidate outstanding automatic reads',()=>{
 const s=new SetupController();s.geometry(g);const token=s.token();assert.equal(s.current(token,g),true);
 s.manualBuild();assert.equal(s.current(token,g),false);assert.equal(s.buildManual,true);
 s.suspend();assert.equal(s.buildManual,true);
 const next=s.token();s.geometry({...g,x:-1920});assert.equal(s.current(next,g),false);
});
test('only repeated explicit lobby evidence permits a new match; losing the HUD is not a reset',()=>{
 const s=new SetupController();s.manualBuild();s.manualClock();
 const line={text:'Loading',x:20,y:20,width:100,height:20};
 s.observeLobby([]);assert.equal(s.buildManual,true);
 s.observeLobby([line]);s.clock.read(0,0);s.clock.read(1,1000);assert.equal(s.clock.read(2,2000),null);
 s.observeLobby([line]);s.observeLobby([line]);
 s.clock.read(0,5000);s.clock.read(1,6000);const accepted=s.clock.read(2,7000);
 assert.equal(accepted.newMatch,true);s.newMatch();assert.equal(s.buildManual,false);
});

test('confirmed loading unlocks the previous build before the HUD, once per match', () => {
 const setup = new SetupController();
 const loading = [{text:'Loading...',x:20,y:20,width:100,height:20}];
 setup.manualBuild();
 setup.observeLobby(loading);
 assert.equal(setup.openLoadingBuildSelection(),false);
 assert.equal(setup.buildManual,true);
 setup.observeLobby(loading);
 assert.equal(setup.openLoadingBuildSelection(),true);
 assert.equal(setup.buildManual,false);

 setup.manualBuild();
 setup.observeLobby(loading);
 setup.observeLobby(loading);
 assert.equal(setup.openLoadingBuildSelection(),false);
 setup.observeHud();
 assert.equal(setup.newMatch(),false);
 assert.equal(setup.buildManual,true);

 setup.observeLobby(loading);
 setup.observeLobby(loading);
 assert.equal(setup.openLoadingBuildSelection(),true);
 assert.equal(setup.buildManual,false);
});
test('game synchronization freezes elapsed time and preserves recorded arrivals',()=>{
 const c=new PracticeClock(),build=defaultData().builds[0],p=newPractice(build);
 c.sync(83);recordArrival(p,build,0,c.elapsed());c.sync(90);
 assert.equal(c.elapsed(Date.now()+60000),90);assert.equal(c.running,true);assert.equal(p.arrivals[0].elapsed,83);
 c.pause();assert.equal(c.running,false);c.start(1000);assert.equal(c.elapsed(2000),91);
});
test('returning to game time freezes a manual clock while no frame is available',()=>{
 const s=new SetupController(),c=new PracticeClock();c.start(1000);s.manualClock();
 s.resumeClock(c);const elapsed=c.elapsed();assert.equal(c.running,false);assert.equal(c.elapsed(Date.now()+60000),elapsed);
});
test('Next at the last step locks automatic restart just like Finish',()=>{
 const s=new SetupController();s.clock.read(120,0);s.clock.read(121,1000);s.clock.read(122,2000);
 s.action('next',true);
 assert.equal(s.clock.read(123,3000),null);assert.equal(s.clock.read(124,4000),null);assert.equal(s.clock.read(125,5000),null);
 assert.equal(s.clock.manual,true);
 s.resumeClock(new PracticeClock());s.clock.read(126,6000);s.clock.read(127,7000);assert.equal(s.clock.read(128,8000).seconds,128);
 const ordinary=new SetupController();ordinary.action('next',false);assert.equal(ordinary.clock.manual,false);
});
test('clock refresh does not persist an unchanged arrival or invalidate OCR confirmation',()=>{
 const b=defaultData().builds[0],p=newPractice(b);
 assert.equal(recordArrival(p,b,0,100),true);
 assert.equal(recordArrival(p,b,0,103),false);
 assert.equal(p.arrivals[0].elapsed,100);
});
