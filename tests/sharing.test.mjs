import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultData, hasMissingStarterBuilds, normalize, replaceWithStarterBuilds } from '../src/lib/defaults.ts';
import { canConfirm, automaticAllowed } from '../src/lib/onboarding.ts';
import { AdvanceGate } from '../src/lib/advance.ts';
import { isLastTask, moveTask, taskRule } from '../src/lib/subtasks.ts';
import { mergePack, parsePack } from '../src/lib/build-pack.ts';
import { exportBackup, importBackup } from '../src/lib/imports.ts';
import { setDefaultBuild } from '../src/lib/util.ts';
import { diagnosticText } from '../src/lib/diagnostics.ts';
import { releaseResult } from '../src/lib/releases.ts';
import { readFileSync } from 'node:fs';

test('bundled pack has two new attributed builds per civilization and preserves saved builds',()=>{
  const raw=readFileSync(new URL('../static/builds/starter-pack.json',import.meta.url),'utf8');
  const p=parsePack(raw);
  assert.equal(p.builds.length,50);
  const groups=Map.groupBy(p.builds,b=>b.civ);
  assert.equal(groups.size,25);
  for(const builds of groups.values())assert.equal(builds.length,2);
  assert.equal(new Set(p.builds.map(b=>b.provenance.source)).size,50);
  for(const b of p.builds){
    assert.match(b.provenance.source,/^https:\/\/aoe4guides\.com\/builds\/[\w-]+$/);
    assert.notEqual(b.provenance.packId,'starter-2026-11');
  }
  assert.equal(defaultData().builds.length,50);
  assert.doesNotMatch(raw,/"(?:settings|practices|playerName|profiles|idleRegion)"/);
  assert.equal(mergePack(defaultData('es').builds,p).length,50);
  assert.equal(hasMissingStarterBuilds(p.builds,'es'),false);
  assert.equal(hasMissingStarterBuilds(p.builds.slice(1),'es'),true);
  assert.equal(hasMissingStarterBuilds(p.builds,'en'),true);
  const legacy=defaultData();legacy.builds=[build];legacy.settings.activeBuildId=build.id;
  assert.equal(normalize(legacy).builds.length,1);
  assert.equal(hasMissingStarterBuilds(legacy.builds,'es'),true);
  assert.deepEqual(mergePack(legacy.builds,p)[0],build);
});

test('every bundled build advances several villager goals through the real OCR gate',()=>{
  for(const build of defaultData().builds){
    let cursor={step:0,task:0};
    let automatic=0;
    while(!isLastTask(build,cursor)){
      const step=build.steps[cursor.step];
      const rule=taskRule(step,cursor.task,build.steps[cursor.step-1]);
      if(rule.kind==='resources'){
        const workers={food:0,wood:0,gold:0,stone:0,...rule.minimum};
        const reading={workers,idle:0,total:Object.values(workers).reduce((a,b)=>a+b,0)};
        const gate=new AdvanceGate(rule);
        const resource=Object.keys(rule.minimum)[0];
        const below={...reading,workers:{...workers,[resource]:workers[resource]-1},total:reading.total-1};
        for(let i=0;i<3;i++)assert.equal(gate.read(below).complete,false);
        assert.equal(gate.read(reading).complete,false);
        assert.equal(gate.read(reading).complete,false);
        assert.equal(gate.read(reading).complete,true);
        automatic++;
      }
      cursor=moveTask(build,cursor,1);
    }
    assert.ok(automatic>=3,`${build.civ} / ${build.name} has ${automatic} automatic goals`);
  }
});

test('reset installs the selected-language starter pack and preserves settings and practice history',()=>{
  const current=defaultData('en');
  current.settings.language='es';
  current.settings.setup.playerName='Player';
  current.settings.setup.enabled=true;
  current.settings.setup.autoAdvance=true;
  current.settings.hotkeys.next='KeyN';
  current.practices.push({id:'past-practice',buildId:build.id,buildName:build.name,startedAt:1,finishedAt:2,arrivals:[]});
  current.builds.push(build);
  setDefaultBuild(current.settings,build);
  current.settings.activeBuildId=build.id;
  const original=structuredClone(current);
  const starter=defaultData('es');

  const result=replaceWithStarterBuilds(current);
  assert.deepEqual(result.builds,starter.builds);
  assert.deepEqual(result.settings,{
    ...original.settings,
    activeBuildId:starter.settings.activeBuildId,
    defaults:starter.settings.defaults
  });
  assert.deepEqual(result.practices,original.practices);
  assert.deepEqual(current,original);
  assert.deepEqual(importBackup(exportBackup(result)),result);
});

test('reset restores starter instructions while retaining starter selections still in the pack',()=>{
  const data=defaultData('es');
  const second=data.builds[1];
  setDefaultBuild(data.settings,second);
  data.settings.activeBuildId=second.id;
  second.name='Mi edición';

  const result=replaceWithStarterBuilds(data);
  assert.equal(result.settings.activeBuildId,second.id);
  assert.equal(result.settings.defaults['Ingleses|1v1'],second.id);
  assert.equal(result.builds[1].name,defaultData('es').builds[1].name);
  assert.deepEqual(replaceWithStarterBuilds(result),result);
});

test('fresh onboarding, legacy opt-out, and detecting reload stay distinct', () => {
  assert.equal(defaultData().settings.onboarding, 'pending');
  const legacy=defaultData(); delete legacy.settings.onboarding;
  legacy.settings.setup.enabled=true;
  assert.equal(normalize(legacy).settings.onboarding, 'skipped');
  assert.equal(normalize(legacy).settings.setup.enabled, true);
  legacy.settings.onboarding='detecting';
  assert.equal(normalize(legacy).settings.onboarding, 'detecting');
  assert.equal(automaticAllowed('detecting'), false);
  assert.equal(automaticAllowed('complete'), true);
});
test('confirmation rejects incomplete, unstable, stale and future evidence', () => {
  const s={at:1000,stable:true,workers:{food:10,wood:4,gold:2,stone:0},idle:1,total:17};
  assert.equal(canConfirm(s,2000),true);
  assert.equal(canConfirm({...s,stable:false},2000),false);
  assert.equal(canConfirm({...s,total:18},2000),false);
  assert.equal(canConfirm(s,62000),false);
  assert.equal(canConfirm(s,999),false);
  assert.equal(canConfirm(s,2000,1500),false);
  assert.equal(canConfirm(null,2000),false);
});
const build={id:'public-english',name:'Opening',civ:'Ingleses',mode:'1v1',map:'Tierra',steps:[{id:'s1',pop:null,time:null,action:'Casa',note:'',villagers:{food:6,wood:0,gold:0,stone:0},advance:{kind:'manual'}}],provenance:{packId:'starter',author:'Author',source:'https://aoe4guides.com/builds/example',reviewedAt:'2026-11-17'}};
const pack={format:'aoe4-overlay-build-pack',version:1,id:'starter',name:'Pack',reviewedAt:'2026-11-17',builds:[build]};
test('pack import is idempotent and never overwrites local edits or carries settings',()=>{
  const parsed=parsePack(JSON.stringify(pack));
  const first=mergePack([],parsed);first[0].name='My edit';
  const second=mergePack(first,parsed);
  assert.equal(second.length,1);assert.equal(second[0].name,'My edit');
  assert.equal(normalize({builds:second}).builds[0].provenance.source,build.provenance.source);
  assert.throws(()=>parsePack(JSON.stringify({...pack,version:2})));
  assert.throws(()=>parsePack(JSON.stringify({...pack,builds:[build,build]})));
});
test('diagnostic only includes allowlisted fields, no arbitrary text or personal data',()=>{
  const text=diagnosticText({version:'0.3.0',native:{available:true,languages:['es-ES'],gameActive:false},monitors:[{size:{width:2560,height:1440},scaleFactor:1.25,name:'PRIVATE'}],status:{message:'C:\\Users\\PRIVATE',civilization:'SECRET',geometry:{width:2560,height:1440,dpi:120,monitor:'PRIVATE'},sample:null},onboarding:'detecting',failedHotkeys:[],condition:'manual'});
  assert.match(text,/2560/);assert.match(text,/125/);assert.match(text,/manual/);
  assert.doesNotMatch(text,/PRIVATE|SECRET|Users/);
});
test('updates compare numeric versions and reject prerelease or unrelated links',()=>{
  const r={tag_name:'v0.10.0',html_url:'https://github.com/GonzaMato/aoe4-overlay-BO/releases/tag/v0.10.0',draft:false,prerelease:false};
  assert.equal(releaseResult('0.3.0',r).kind,'new');
  assert.equal(releaseResult('1.0.0',r).kind,'current');
  assert.throws(()=>releaseResult('0.3.0',{...r,html_url:'https://evil.example'}));
  assert.throws(()=>releaseResult('0.3.0',{...r,tag_name:'garbage'}));
  assert.throws(()=>releaseResult('0.3.0',{...r,prerelease:true}));
});
