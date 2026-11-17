import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SetupController } from '../src/lib/setup-controller.ts';
import { PracticeClock, newPractice, recordArrival } from '../src/lib/practice.ts';
import { defaultData } from '../src/lib/defaults.ts';
const g={x:0,y:0,width:1920,height:1080,monitor:'DISPLAY1',dpi:96};
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
