import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultData, normalize } from '../src/lib/defaults.ts';
import { canConfirm, automaticAllowed } from '../src/lib/onboarding.ts';
import { mergePack, parsePack } from '../src/lib/build-pack.ts';
import { diagnosticText } from '../src/lib/diagnostics.ts';
import { releaseResult } from '../src/lib/releases.ts';
import { readFileSync } from 'node:fs';

test('bundled pack covers 25 civilizations without personal settings or history',()=>{
  const raw=readFileSync(new URL('../static/builds/starter-pack.json',import.meta.url),'utf8');
  const p=parsePack(raw);
  assert.equal(p.builds.length,25);
  assert.equal(new Set(p.builds.map(b=>b.civ)).size,25);
  assert.equal(defaultData().builds.length,25);
  assert.doesNotMatch(raw,/"(?:settings|practices|playerName|profiles|idleRegion)"/);
  assert.equal(mergePack(defaultData().builds,p).length,25);
  const legacy=defaultData();legacy.builds=[build];legacy.settings.activeBuildId=build.id;
  assert.equal(normalize(legacy).builds.length,1);
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
