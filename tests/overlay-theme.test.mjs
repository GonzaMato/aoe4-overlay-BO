import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { overlayTheme, themeSurfaces } from '../src/lib/overlay-theme.ts';
import { defaultData, normalize } from '../src/lib/defaults.ts';
import { exportBackup, importBackup } from '../src/lib/imports.ts';

function luminance(hex) {
 const rgb=hex.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
 return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;
}

test('all 25 flag themes resolve in both languages and have readable accents',()=>{
 const es=JSON.parse(readFileSync('static/builds/starter-pack.json','utf8')).builds;
 const en=JSON.parse(readFileSync('static/builds/starter-pack.en.json','utf8')).builds;
 assert.equal(new Set(en.map(b=>b.civ)).size,25);
 en.forEach((b,i)=>{
  const theme=overlayTheme(b.civ,true,'#123456');
  assert.ok(theme.palette,b.civ);
  assert.deepEqual(theme,overlayTheme(es[i].civ,true,'#123456'));
  assert.ok((luminance(theme.accent)+.05)/(luminance('#1b2028')+.05)>=4.5,`${b.civ} text contrast`);
  for(const background of Object.values(themeSurfaces(theme.palette))){
   for(const foreground of [theme.accent,'#F4F1ED','#D9DCE3','#B7C0CD'])assert.ok((luminance(foreground)+.05)/(luminance(background)+.05)>=4.5,`${b.civ}: ${foreground} on ${background}`);
  }
 });
});

test('custom accents survive opting in and out, switching civs, and unknown civs',()=>{
 const custom='#5CC8F0';
 assert.deepEqual(overlayTheme('English',false,custom),{accent:custom,palette:null});
 assert.notDeepEqual(overlayTheme('English',true,custom),overlayTheme('French',true,custom));
 for(const civ of ['', 'My custom civilization'])assert.deepEqual(overlayTheme(civ,true,custom),{accent:custom,palette:null});
 assert.equal(overlayTheme('English',false,custom).accent,custom);
});

test('legacy settings keep their appearance and backups preserve the opt-in theme',()=>{
 const old=defaultData();old.settings.accent='#5CC8F0';delete old.settings.civilizationColors;
 const migrated=normalize(old);
 assert.equal(migrated.settings.civilizationColors,false);
 assert.equal(migrated.settings.accent,'#5CC8F0');
 migrated.settings.civilizationColors=true;
 assert.deepEqual(importBackup(exportBackup(migrated)),migrated);
 const bad=structuredClone(migrated);bad.settings.civilizationColors='false';
 assert.equal(normalize(bad).settings.civilizationColors,false);
 assert.throws(()=>importBackup(exportBackup(bad)));
});
