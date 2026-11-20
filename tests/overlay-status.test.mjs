import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyOverlaySample, observeOverlaySample, overlayReadingView, advancementStatus, READING_TTL } from '../src/lib/overlay-status.ts';
const context={enabled:true,confirmed:true,live:true,hasReading:true,finalTask:false};

test('detection banner clears on a complete reading and returns after lost or stale readings',()=>{
 const empty=emptyOverlaySample();assert.equal(overlayReadingView(empty,true,100).showDetection,true);
 const valid=observeOverlaySample(empty,['8','0','2','0','1'],100);
 const view=overlayReadingView(valid,true,100);assert.equal(view.showDetection,false);
 assert.equal(view.reading.total,11);assert.equal(view.reading.workers.wood,0);assert.equal(view.reading.idle,1);
 assert.equal(overlayReadingView(valid,true,100+READING_TTL+1).reading,null);
 assert.equal(overlayReadingView(valid,true,100+READING_TTL+1).showDetection,true);
 const missed=observeOverlaySample(valid,['8','','2','0','1'],200);
 assert.equal(overlayReadingView(missed,true,200).reading,null);
 assert.equal(overlayReadingView(missed,true,200).showDetection,false);
 assert.equal(overlayReadingView(missed,true,100+READING_TTL+1).showDetection,true);
 assert.deepEqual(overlayReadingView(valid,false,200),{reading:null,showDetection:false});
 assert.equal(overlayReadingView(emptyOverlaySample(),true,300).reading,null);
});

test('task cue distinguishes manual, automatic, blocked automation and manual completion',()=>{
 const manual=advancementStatus({kind:'manual'},context,'N','en');assert.equal(manual.label,'Manual');assert.match(manual.detail,/N when/);
 const rule={kind:'resources',minimum:{food:10}};
 assert.equal(advancementStatus(rule,context,'PgDn','en').label,'Automatic');
 assert.match(advancementStatus(rule,context,'PgDn','en').detail,/Food ≥ 10/);
 for(const key of ['enabled','confirmed','live','hasReading'])assert.equal(advancementStatus(rule,{...context,[key]:false},'PgDn','en').kind,'paused');
 // The timer is not part of the context: a confirmed, live reading advances without it.
 assert.equal('running' in context,false);
 assert.equal(advancementStatus(rule,context,'PgDn','en').kind,'auto');
 assert.equal(advancementStatus(rule,{...context,finalTask:true},'N','en').kind,'manual');
 assert.match(advancementStatus(rule,{...context,finalTask:true},'N','en').detail,/finish/);
 assert.equal(advancementStatus(rule,context,'AvPág','es').label,'Automático');
});
