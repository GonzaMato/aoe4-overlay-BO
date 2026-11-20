import { test } from 'node:test';
import assert from 'node:assert/strict';
import { playerNameMatches, stripClanTag, lobbyRoster, lobbyScreen, readMatchLoading, suggestPlayerName, localCivilization, chooseBuild, normalizeSetup } from '../src/lib/setup.ts';
import { defaultData, normalize, systemLanguage } from '../src/lib/defaults.ts';
import { exportBackup, importBackup } from '../src/lib/imports.ts';
import { rememberDefault, preferredBuildId, setDefaultBuild } from '../src/lib/util.ts';

const line=(text,x,y,width=180,height=24)=>({text,x,y,width,height});
const civs=['Ingleses','Franceses','Orden del Dragón'];

test('player names tolerate clan tags and one OCR glyph swap, never a different length',()=>{
 assert.equal(playerNameMatches('[ABC] GonzaMato','GonzaMato'),true);
 assert.equal(playerNameMatches('GonzaMato (EU)','GonzaMato'),true);
 assert.equal(playerNameMatches('G0nzaMato','GonzaMato'),true);
 assert.equal(playerNameMatches('GonzaMat0','GonzaMato'),true);
 assert.equal(playerNameMatches('Ga1lardo','Gallardo'),true);
 assert.equal(playerNameMatches('GonzoMuto','GonzaMato'),false);
 assert.equal(playerNameMatches('GonzaMato2','GonzaMato'),false);
 assert.equal(playerNameMatches('Bob','Rob'),false);
 assert.equal(playerNameMatches('anything',''),false);
 assert.equal(stripClanTag('[TAG] Name'),'Name');
});

test('civilization detection accepts a tagged or slightly misread name',()=>{
 const rows=[line('Rival',100,100),line('French',400,100),line('[CLAN] MyName',100,200),line('English',400,200)];
 assert.equal(localCivilization(rows,'MyName',civs),'Ingleses');
 const separateTag=[line('[CLAN]',40,200,50),line('MyName',100,200),line('English',400,200)];
 assert.equal(localCivilization(separateTag,'MyName',civs),'Ingleses');
 assert.equal(localCivilization([line('MyNam3',100,200),line('English',400,200)],'MyName',civs),'Ingleses');
 assert.equal(localCivilization([line('MyNam33',100,200),line('English',400,200)],'MyName',civs),null);
});

test('loading screen roster pairs each civilization with its nearest player only',()=>{
 const screen=[line('GonzaMato',100,200),line('Order of the Dragon',320,200),line('Rival',1300,200),line('English',1520,200),line('Loading',900,900)];
 assert.deepEqual(lobbyRoster(screen,civs),[{name:'GonzaMato',civ:'Orden del Dragón'},{name:'Rival',civ:'Ingleses'}]);
 assert.deepEqual(lobbyRoster([...screen,line('Replay',0,0)],civs),[]);
 // A name between two cards on the same row belongs to the closer label only.
 const crowded=[line('A',100,100),line('French',300,100),line('B',520,100),line('English',700,100)];
 assert.deepEqual(lobbyRoster(crowded,civs).map(e=>e.name).sort(),['A','B']);
});

test('a manual build choice suggests the only player with that civilization',()=>{
 const roster=[{name:'GonzaMato',civ:'Orden del Dragón'},{name:'Rival',civ:'English'}];
 assert.equal(suggestPlayerName(roster,'Order of the Dragon'),'GonzaMato');
 assert.equal(suggestPlayerName(roster,'Ingleses'),'Rival');
 assert.equal(suggestPlayerName([...roster,{name:'Mirror',civ:'Order of the Dragon'}],'Order of the Dragon'),null);
 assert.equal(suggestPlayerName([roster[0]],'Order of the Dragon'),null);
 assert.equal(suggestPlayerName(roster,'French'),null);
 assert.equal(suggestPlayerName(roster,''),null);
});

test('loading cards with the civilization above the name support suggestions and automatic builds', () => {
 const screen = [
  line('Team 1',820,634,90,28), line('Team 2',1768,634,90,28),
  line('ENGLISH',903,706,139,28), line('ABBASID DYNASTY',1849,706,301,28),
  line('[CLAN] TestPlayer123',820,775,236,28), line('A.I. Intermediate',1768,775,249,28),
  line('Loading...',105,1001,115,25)
 ];
 const data = defaultData('en');
 const roster = lobbyRoster(screen,data.settings.civs);
 assert.deepEqual(roster,[{name:'TestPlayer123',civ:'Ingleses'},{name:'A.I. Intermediate',civ:'Dinastía Abasí'}]);
 assert.equal(suggestPlayerName(roster,'Ingleses'),'TestPlayer123');
 const civ = localCivilization(screen,'TestP1ayer123',data.settings.civs);
 assert.equal(civ,'Ingleses');
 assert.equal(chooseBuild(data,civ,'1v1')?.id,preferredBuildId(data.settings,'English','1v1'));
 assert.equal(localCivilization(screen,'TestPlayer1234',data.settings.civs),null);
 assert.deepEqual(lobbyRoster([...screen,line('Replay',0,0)],data.settings.civs),[]);
});

test('stacked loading cards never borrow a rival name or assign an ambiguous name', () => {
 const wrongCard = [line('English',100,100),line('Rival',100,162),line('MyName',900,162)];
 assert.equal(localCivilization(wrongCard,'MyName',civs),null);
 const ambiguous = [line('English',100,100),line('French',200,100),line('MyName',150,162)];
 assert.deepEqual(lobbyRoster(ambiguous,civs),[]);
 assert.equal(localCivilization(ambiguous,'MyName',civs),null);
});

test('loading cards use the badge-free OCR name and preserve genuine trailing digits', () => {
 const screen = [
  line('English',680,533,100,14), line('French',1389,533,101,14),
  {...line("TestPlayer123 6'",617,582,172,24), playerText:'TestPlayer123'},
  line('Other Player 6',1327,582,168,21)
 ];
 const roster = lobbyRoster(screen,civs);
 assert.equal(suggestPlayerName(roster,'Ingleses'),'TestPlayer123');
 assert.equal(localCivilization(screen,'TestPlayer123',civs),'Ingleses');
 assert.equal(suggestPlayerName(roster,'Franceses'),'Other Player 6');
 assert.equal(localCivilization(screen,'Other Player',civs),null);
});

test('the loading screen is recognized between progress and Play with a partial roster', () => {
 const screen = [
  line('Skirmish',108,100,271,56), line('Win Conditions',109,284,231,28),
  line('Map',105,577,66,35), line('(i) GAMEPLAY TIP',106,1114,244,34),
  line('Team 1',821,637,79,19), line('Team 2',1768,637,83,19),
  line("HOLY ROMAN 'EMPIRE",905,710,339,19), line("KNIGHTs T FMI'LAR",1852,710,300,19),
  {...line("TestPlayer4794 6'",822,776,230,32), playerText:'TestPlayer4794'},
  line('A.I. Intermediate',1768,776,250,28)
 ];
 const data = defaultData('en');
 const result = readMatchLoading(screen,'TestPlayer4796',data.settings.civs);
 assert.equal(lobbyScreen(screen),true);
 assert.deepEqual(result.roster,[{name:'TestPlayer4794',civ:'Sacro Imperio Romano Germánico'}]);
 assert.equal(suggestPlayerName(result.roster,result.civ),null);
 assert.equal(chooseBuild(data,result.civ,'1v1')?.name,'Fast Castle into Burgrave Palace');
});

test('the civilization selection menu cannot update the roster', () => {
 const menu = [
  line('Solo Battle vs A.I.',100,100), line('English',750,220), line('House of Lancaster',750,280),
  line('Holy Roman Empire',1100,550), line('936 – 1517 CE',1100,600), line('Start Game',2000,1230)
 ];
 assert.equal(readMatchLoading(menu,'TestPlayer4794',defaultData('en').settings.civs),null);
});

test('screen reading and villager advancement are separate switches',()=>{
 assert.deepEqual([defaultData().settings.setup.enabled,defaultData().settings.setup.autoAdvance],[false,false]);
 // Data saved before the split keeps advancing exactly as before.
 assert.equal(normalizeSetup({enabled:true,playerName:'',mode:'1v1',profiles:[]}).autoAdvance,true);
 assert.equal(normalizeSetup({enabled:false,playerName:'',mode:'1v1',profiles:[]}).autoAdvance,false);
 assert.equal(normalizeSetup({enabled:true,autoAdvance:false,playerName:'',mode:'1v1',profiles:[]}).autoAdvance,false);
 assert.equal(normalizeSetup({enabled:false,autoAdvance:true,playerName:'',mode:'1v1',profiles:[]}).autoAdvance,false);
 const data=defaultData();data.settings.setup.enabled=true;data.settings.setup.autoAdvance=false;
 assert.equal(importBackup(exportBackup(data)).settings.setup.autoAdvance,false);
 data.settings.setup.autoAdvance='yes';
 assert.throws(()=>importBackup(exportBackup(data)),/setup/);
});

test('using a build sets a default only when that civilization and mode have none',()=>{
 const data=defaultData('es');
 const [first]=data.builds,second={...first,id:'second'};data.builds.push(second);
 setDefaultBuild(data.settings,first,false);
 assert.equal(rememberDefault(data.settings,first),true);
 assert.equal(preferredBuildId(data.settings,first.civ,first.mode),first.id);
 data.settings.activeBuildId=second.id;
 assert.equal(rememberDefault(data.settings,second),false);
 assert.equal(preferredBuildId(data.settings,first.civ,first.mode),first.id);
 setDefaultBuild(data.settings,second);
 assert.equal(preferredBuildId(data.settings,first.civ,first.mode),second.id);
 assert.equal(rememberDefault(data.settings,{...first,mode:''}),false);
});

test('first launch follows the Windows language and new installs leave build cycling unassigned',()=>{
 assert.equal(systemLanguage(['es-AR','en-US']),'es');
 assert.equal(systemLanguage(['fr-FR','es-ES']),'es');
 assert.equal(systemLanguage(['en-GB','es-ES']),'en');
 assert.equal(systemLanguage(['de-DE']),'en');
 assert.equal(systemLanguage([]),'en');
 assert.equal(defaultData().settings.hotkeys.cycleBuild,'');
 const old=defaultData();old.settings.hotkeys.cycleBuild='Ctrl+Alt+KeyB';
 assert.equal(normalize(old).settings.hotkeys.cycleBuild,'Ctrl+Alt+KeyB');
});
