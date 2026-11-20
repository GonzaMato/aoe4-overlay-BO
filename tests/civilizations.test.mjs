import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { civilizationFlag } from '../src/lib/civilizations.ts';

test('all bundled civilizations share a local flag across English and Spanish',()=>{
 const es=JSON.parse(readFileSync('static/builds/starter-pack.json','utf8')).builds;
 const en=JSON.parse(readFileSync('static/builds/starter-pack.en.json','utf8')).builds;
 const sources=new Set();
 es.forEach((b,i)=>{
  const path=civilizationFlag(b.civ);assert.equal(path,civilizationFlag(en[i].civ));
  assert.notEqual(path,'/civilizations/unknown.png');assert.ok(existsSync('static'+path));sources.add(path);
 });
 assert.equal(sources.size,25);
 assert.equal(civilizationFlag('  INGLESES  '),civilizationFlag('English'));
 assert.equal(civilizationFlag('Zhu Xi’s Legacy'),civilizationFlag("Zhu Xi's Legacy"));
 assert.equal(civilizationFlag('Custom civ'),'/civilizations/unknown.png');
 assert.equal(civilizationFlag('../../private'),'/civilizations/unknown.png');
});
