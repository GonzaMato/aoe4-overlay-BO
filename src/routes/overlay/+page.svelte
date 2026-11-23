<script lang="ts">
 import { overlayTheme } from '$lib/overlay-theme';
 import { emptyOverlaySample, observeOverlaySample, overlayReadingView, type OverlaySample } from '$lib/overlay-status';
 import { t, locale, label } from '$lib/i18n';
 import { onMount } from 'svelte';
 import { takeOverlayActivation, onOverlayActivation, openBuildPicker } from '$lib/bridge';
 import Compact from '$lib/components/Compact.svelte';
 import Panel from '$lib/components/Panel.svelte';
 import BuildCompleted from '$lib/components/BuildCompleted.svelte';
 import { CompletionFeedback } from '$lib/completion';
 import { bindHotkeys, isTauri, keepAlive, loadData, makeClickThrough, on, onDataChanged, placeOverlay, send, unbindHotkeys, gameActive, onGameFocus, onGameReopened, onRegionSelecting, setEditing, dragOverlay, overlayPosition, onNativeEdit, readWorkers } from '$lib/bridge';
 import { clampIndex, indexForPop } from '$lib/steps';
 import { PracticeClock, newPractice, recordArrival } from '$lib/practice';
 import { VillagerTotalGate } from '$lib/ocr';
 import { AdvanceGate, advanceLabel, type Reading } from '$lib/advance';
 import { taskRule, taskCount, moveTask, isLastTask, reconcileCursor } from '$lib/subtasks';
 import type { AppData, HotkeyAction, Practice } from '$lib/types';
 import { gameGeometry, inspectGame, overlayBounds } from '$lib/bridge';
 import { SetupController } from '$lib/setup-controller';
 import { automaticAllowed, CounterCalibration } from '$lib/onboarding';
 import { profileKey, clockCandidate, readMatchLoading, chooseBuild, validProfile, type GameGeometry, type SetupStatus, type SetupProfile } from '$lib/setup';

 let data = $state<AppData | null>(null);
 let stepIndex = $state(0);
 let subtaskIndex = $state(0);
 let visible = $state(true);
 let active = $state(!isTauri);
 let editing = $state(false);
 let suspended = $state(false);
 let selecting = $state(false);
 let pickerOpen = $state(false);
 let preview = $state(false);
 const completion=new CompletionFeedback();
 let celebration=$state<{name:string;elapsed:number|null}|null>(null);
 let root = $state<HTMLDivElement>();
 let elapsed = $state<number | null>(null);
 let liveSample = $state<OverlaySample>(emptyOverlaySample());
 let displayNow = $state(Date.now());
 let clockRunning = $state(false);
 let practice: Practice | null = null;
 let clock = new PracticeClock();
 let failedHotkeys: string[] = [];
 let lastActiveId: string | null = null;
 let ocrBusy = false;
 const gate = new VillagerTotalGate();
 let advance:AdvanceGate|null=null, advanceKey='';
 let ocrMessage = $state('');
 let error = $state('');
 let setup = new SetupController();
 let game = $state<GameGeometry | null>(null);
 let setupStatus = $state<SetupStatus>({message:$t("Esperando AoE4", "Waiting for AoE4"),profile:$t("Sin perfil", "No profile"),counters:$t("Pendientes", "Pending"),civilization:$t("Elegí tu build o indicá tu nombre de jugador", "Choose a build or enter your player name"),clock:$t("Esperando reloj visible", "Waiting for a visible game timer"),manualClock:false,geometry:null});
 const calibration = new CounterCalibration();
 let setupBusy=false, pendingCiv:string|null=null;
 let sessionLocked=false;
 let forceDetection=false;
 let lastRoster='';
 const pendingPositions=new Map<string,{x:number;y:number}>();
 const settings = $derived(data?.settings ?? null);
 const currentProfile=$derived(game ? settings?.setup.profiles.find(p=>p.key===profileKey(game!))??null : null);
 const build = $derived(data ? (data.builds.find(b => b.id === data!.settings.activeBuildId) ?? null) : null);
 const index = $derived(clampIndex(build, stepIndex));
 const taskIndex = $derived(Math.min(subtaskIndex,taskCount(build?.steps[index])-1));
 const cursor = $derived({step:index,task:taskIndex});
 const atEnd = $derived(isLastTask(build,cursor));
 // Screen reading alone (civilization, clock) shows no counters; only villager advancement does.
 const trackingEnabled=$derived(!!((settings?.setup.enabled&&settings.setup.autoAdvance)||settings?.ocr.enabled));
 const readingView=$derived(overlayReadingView(liveSample,trackingEnabled,displayNow));
 const automation=$derived({enabled:trackingEnabled,confirmed:!!settings&&automaticAllowed(settings.onboarding),live:active&&!editing&&!pickerOpen,hasReading:!!readingView.reading,finalTask:atEnd});
 const hotkeyKey = $derived(settings ? JSON.stringify(settings.hotkeys) : '');

 function report() {
   displayNow=Date.now();clockRunning=clock.running;
   if(completion.tick()){celebration=null;visible=false;preview=false;}
   elapsed = practice ? Math.floor(clock.elapsed()) : null;
   void send('practice-status', { elapsed, running: clock.running, step: index + 1, buildName: build?.name ?? '', recording: !!practice, editing, automatic:settings?.setup.enabled, manualClock:setup.clock.manual });
   setupStatus.manualClock=setup.clock.manual;
   setupStatus.sample=calibration.sample;
   void send('setup-status', $state.snapshot(setupStatus));
 }
 function savePractice() { if (practice) void send('practice-update', practice); }
 function invalidateOcr() { gate.reset();advance?.suspend(); }
 function clearAdvance() {advance=null;advanceKey='';}
 function prepareAdvance(seed:Reading|null=null) {
   if(!build?.steps[index]){clearAdvance();return;}
   const step=build.steps[index],previous=build.steps[index-1],rule=taskRule(step,taskIndex,previous);
   const key=JSON.stringify([build.id,practice?.id,index,taskIndex,step,previous?.villagers]);
   if(key!==advanceKey){advance=new AdvanceGate(rule,seed);advanceKey=key;}
 }
 function arrive() {
   if (practice && build && recordArrival(practice, build, index, clock.elapsed())) savePractice();
   report();
 }
 function finish() {
   invalidateOcr();
   clearAdvance();
   if (!practice) return;
   clock.pause(); practice.finishedAt = Date.now(); savePractice();
   void send('practice-finished', practice.id);
   practice = null; report();
 }
 function dismissCelebration(reset=false) {
   if(reset)completion.reset();else completion.reveal();
   celebration=null;
 }
 function completeBuild() {
   if(!build?.steps.length || !completion.begin())return;
   const result={name:build.name,elapsed:practice?Math.floor(clock.elapsed()):null};
   setup.manualClock();finish();
   celebration=result;visible=true;preview=!active;editing=false;
   setupStatus.message=$t("Build completado", "Build completed");report();
 }
 function applyData(incoming: AppData) {
   const languageChanged=!data||data.settings.language!==incoming.settings.language;
   const oldBuild=data?.builds.find(b=>b.id===data?.settings.activeBuildId),newBuild=incoming.builds.find(b=>b.id===incoming.settings.activeBuildId);
   if(JSON.stringify(oldBuild?.steps)!==JSON.stringify(newBuild?.steps)){
     const nextCursor=reconcileCursor(oldBuild,newBuild,cursor);
     suspendSetup();clearAdvance();stepIndex=nextCursor.step;subtaskIndex=nextCursor.task;
   }
   if (data && JSON.stringify([data.settings.onboarding,data.settings.setup.enabled,data.settings.setup.autoAdvance,data.settings.setup.playerName,data.settings.setup.mode,data.settings.ocr])!==JSON.stringify([incoming.settings.onboarding,incoming.settings.setup.enabled,incoming.settings.setup.autoAdvance,incoming.settings.setup.playerName,incoming.settings.setup.mode,incoming.settings.ocr])) {suspendSetup();calibration.reset();}
   if (incoming.settings.activeBuildId !== lastActiveId) {
     dismissCelebration(true);visible=true;
     setup.suspend();sessionLocked=false;
     finish(); lastActiveId = incoming.settings.activeBuildId; stepIndex = 0; subtaskIndex=0;
     clock = new PracticeClock(); elapsed = null;
   }
   const positionChanged = JSON.stringify(data?.settings.position) !== JSON.stringify(incoming.settings.position);
   const resetPosition=positionChanged && incoming.settings.position===null && incoming.settings.setup.enabled && game;
   data = incoming; locale.set(incoming.settings.language);
   if(languageChanged){
     ocrMessage='';
     setupStatus={...setupStatus,
       message:active?$t('Revisá los contadores','Check the counters'):$t('Esperando AoE4','Waiting for AoE4'),
       profile:setupStatus.geometry?setupStatus.profile:$t('Sin perfil','No profile'),
       counters:setupStatus.sample?$t(`${setupStatus.sample.total} aldeanos · incluye ${setupStatus.sample.idle} inactivos`,`${setupStatus.sample.total} villagers · including ${setupStatus.sample.idle} idle`):$t('Pendientes','Pending'),
       civilization:newBuild?label(newBuild.civ):$t('Elegí tu build o indicá tu nombre de jugador','Choose a build or enter your player name'),
       clock:setup.clock.manual?$t('Control manual','Manual control'):$t('Esperando reloj visible','Waiting for a visible game timer')};
     void send('ocr-status','');report();
   }
   if(resetPosition && game) {
     pendingPositions.delete(profileKey(game));
     const profile=data.settings.setup.profiles.find(p=>p.key===profileKey(game!));
     if(profile)saveProfile({...profile,position:null});
   }
   if (editing && root && positionChanged) {
     const rect = root.getBoundingClientRect(), s = incoming.settings;
     void placeOverlay(rect.width, rect.height, s.corner, s.offsetX, s.offsetY, s.position).catch(e => error = String(e));
   }
 }
 function persist(patch: Partial<AppData['settings']>) {
   void send('overlay-settings', patch);
 }
 async function edit(value = !editing) {
   dismissCelebration();
   suspendSetup();
   try {
     if (!value && data) {
       data.settings.position = await overlayPosition(); persist({ position: data.settings.position });
       if(settings?.setup.enabled && game && data.settings.position) {
         const position={x:data.settings.position.x-game.x,y:data.settings.position.y-game.y};
         if(position.x>=0 && position.y>=0 && position.x<game.width && position.y<game.height) {
           pendingPositions.set(profileKey(game),position);
           if(currentProfile)saveProfile({...currentProfile,position});
         }
       }
     }
     await setEditing(value || preview); editing = value; visible = true; report();
   } catch (e) { error = String(e); }
 }
 function start() {
   if (!build?.steps.length) return;
   dismissCelebration(true);
   if (!practice) { invalidateOcr(); practice = newPractice(build); clock = new PracticeClock(); }
   clock.start(); visible = true; arrive();
 }
 function adjust(delta: number) {
   if (!practice) return;
   const before = clock.elapsed(); clock.adjust(delta);
   const applied = clock.elapsed() - before;
   practice.arrivals.forEach(a => a.elapsed = Math.max(0, Math.round(a.elapsed + applied)));
   savePractice(); report();
 }
 function pickBuild(id:string) {
   const target=data?.builds.find(b=>b.id===id);
   if(!data || !target)return;
   setup.manualBuild();pendingCiv=null;
   // Mark a manual choice in the manager even when confirming the current build.
   void send('picker-build-confirmed',id);
   if(target.id===build?.id)return;
   const seconds=clock.elapsed(),wasRunning=clock.running,hadPractice=!!practice;
   finish();dismissCelebration(true);visible=true;
   lastActiveId=target.id;data.settings.activeBuildId=target.id;
   stepIndex=0;subtaskIndex=0;clearAdvance();
   clock=new PracticeClock();clock.adjust(seconds);
   if(hadPractice && target.steps.length){
     practice=newPractice(target);
     if(wasRunning)clock.start();
     recordArrival(practice,target,0,seconds);savePractice();
   }
   persist({activeBuildId:target.id});report();
 }
 const actions: Record<HotkeyAction, () => void> = {
   chooseBuild() { void openBuildPicker().catch(e=>error=String(e)); },
   next() { const seed=advance?.stableReading??null; invalidateOcr(); if (!build) return; if (atEnd) { completeBuild(); return; } const next=moveTask(build,cursor,1);stepIndex=next.step;subtaskIndex=next.task; prepareAdvance(seed); arrive(); },
   prev() { dismissCelebration(true);visible=true;invalidateOcr();clearAdvance(); if (build) {const previous=moveTask(build,cursor,-1);stepIndex=previous.step;subtaskIndex=previous.task;} report(); },
   start,
   pauseClock() { invalidateOcr(); if (!practice) start(); else { if (clock.running) clock.pause(); else clock.start(); report(); } },
   clockPlus() { adjust(5); }, clockMinus() { adjust(-5); },
   resetPractice() { finish(); stepIndex = 0; subtaskIndex=0; clock = new PracticeClock(); start(); },
   resetClock() { finish(); start(); },
   finishPractice() {if(atEnd)completeBuild();else finish();},
   editPosition() { void edit(); },
   toggleVisible() { dismissCelebration();visible = !visible;preview=false; },
   toggleCompact() { if (data) { data.settings.compact = !data.settings.compact; persist({ compact: data.settings.compact }); } },
   cycleBuild() {
     if (!data || !build) return;
     const sameCiv = data.builds.filter(b => label(b.civ,'en') === label(build.civ,'en'));
     const pool = sameCiv.length > 1 ? sameCiv : data.builds;
     if (pool.length < 2) return;
     dismissCelebration(true);visible=true;
     const target = pool[(pool.findIndex(b => b.id === build.id) + 1) % pool.length];
     const pop = build.steps[index]?.pop ?? null;
     const wasRunning = clock.running, seconds = clock.elapsed(); finish();
     lastActiveId = target.id; data.settings.activeBuildId = target.id;
     stepIndex = indexForPop(target, pop);subtaskIndex=0;
     clock = new PracticeClock(); clock.adjust(seconds);
     if (wasRunning) { practice = newPractice(target); clock.start(); recordArrival(practice, target, stepIndex, seconds); savePractice(); }
     persist({ activeBuildId: target.id }); report();
   }
 };
 function manualAction(name:HotkeyAction) {
   setup.action(name,atEnd);
   actions[name]?.();
 }
 function suspendSetup() {
   liveSample=emptyOverlaySample();
   setup.suspend();invalidateOcr();calibration.interrupt();
   if(settings?.setup.enabled && !setup.clock.manual)clock.pause();
 }
 function resetSession() {
   dismissCelebration(true);
   suspendSetup();
   setup.reset();
   calibration.reset();
   clearAdvance();
   game = null;
   pendingCiv = null;
   pendingPositions.clear();
   forceDetection = false;
   sessionLocked = false;
   practice = null;
   clock = new PracticeClock();
   stepIndex = 0;
   subtaskIndex = 0;
   report();
 }
 function saveProfile(profile:SetupProfile) {
   if(!data || !validProfile(profile))return;
   const old=data.settings.setup.profiles.find(p=>p.key===profile.key);
   if(JSON.stringify(old)===JSON.stringify(profile))return;
   data.settings.setup.profiles=[...data.settings.setup.profiles.filter(p=>p.key!==profile.key),profile].slice(-24);
   void send('setup-profile',profile);
 }
 function consumeRows(rows:string[], canAdvance:boolean) {
   const confirmed=!!settings && automaticAllowed(settings.onboarding);
   const switchedOff=!canAdvance;
   canAdvance = canAdvance && confirmed;
   prepareAdvance();
   setupStatus.condition=advance?.rule.kind??'none';
   displayNow=Date.now();liveSample=observeOverlaySample(liveSample,rows,displayNow);
   const reading=liveSample.reading,result=advance?.read(canAdvance?reading:null);
   const condition=advance?advanceLabel(advance.rule):$t("Elegí un build", "Choose a build");
   const status=settings?.onboarding==='detecting'?$t("Compará los cinco contadores y confirmá en Inicio (Alt+Tab)", "Compare the five counters and confirm in Home (Alt+Tab)"):advance?.rule.kind==='manual'?condition:switchedOff?$t("Avance con teclas", "Advance with hotkeys"):!canAdvance?$t("Confirmá los contadores en Inicio", "Confirm the counters in Home"):result?.message??condition;
   const counters=reading ? $t(`Aldeanos: ${reading.total} · C ${reading.workers.food} / M ${reading.workers.wood} / O ${reading.workers.gold} / P ${reading.workers.stone} + ${reading.idle} inactivos`, `Villagers: ${reading.total} · F ${reading.workers.food} / W ${reading.workers.wood} / G ${reading.workers.gold} / S ${reading.workers.stone} + ${reading.idle} idle`) : $t(`Lectura incompleta · C ${rows[0]||'—'} / M ${rows[1]||'—'} / O ${rows[2]||'—'} / P ${rows[3]||'—'} + ${rows[4]||'—'} inactivos`, `Incomplete reading · F ${rows[0]||'—'} / W ${rows[1]||'—'} / G ${rows[2]||'—'} / S ${rows[3]||'—'} + ${rows[4]||'—'} idle`);
   ocrMessage=`${counters}\n${status}`;
   if(canAdvance && result?.complete && build) {
     if(!atEnd) {
       actions.next();
       ocrMessage=$t(`${counters}\n${advance?advanceLabel(advance.rule):''} · nueva instrucción`, `${counters}\n${advance?advanceLabel(advance.rule):''} · next instruction`);
     } else ocrMessage=$t(`${counters}\nObjetivo cumplido · AvPág para terminar la práctica`, `${counters}\nTarget reached · PgDn to finish practice`);
   }
   void send('ocr-status',ocrMessage);
   return reading;
 }
 async function autoSetup() {
   if(!settings?.setup.enabled || !active || editing || selecting || pickerOpen || setupBusy || !data)return;
   setupBusy=true;
   const initial=setup.token();let requestToken=initial;
   try {
     const geometry=await gameGeometry();
     if(initial!==setup.token() || !settings?.setup.enabled || !active || editing || selecting)return;
     if(!geometry) {suspendSetup();setupStatus.message=$t("No encuentro AoE4 en primer plano", "AoE4 is not in the foreground");return;}
     if(setup.geometry(geometry)) {invalidateOcr();calibration.reset();game=geometry;}
     setupStatus.geometry=geometry;setupStatus.profile=`${geometry.width} × ${geometry.height} · ${geometry.dpi/96*100}% · ${geometry.monitor}`;
     const token=setup.token(), hint=data.settings.setup.profiles.find(p=>p.key===profileKey(geometry))??null;
     requestToken=token;
     const result=await inspectGame(geometry,forceDetection?null:hint,await overlayBounds());
     if(!setup.current(token,result.geometry) || !active || editing || selecting || !settings?.setup.enabled)return;
     if(setup.observeLobby(result.lines)){pendingCiv=null;calibration.reset();}
     if(!result.hud) {
       liveSample=observeOverlaySample(liveSample,[],Date.now());
       calibration.interrupt();
       if(!setup.clock.manual)clock.pause();invalidateOcr();setup.clock.suspend();
       const civList=[...new Set([...settings.civs,...data.builds.map(b=>b.civ)])];
       const loading=readMatchLoading(result.lines,settings.setup.playerName,civList);
       const newLoading=!!loading && setup.openLoadingBuildSelection();
       if(newLoading) {
         sessionLocked=false;
         await send('setup-new-match');
         if(!setup.current(token,result.geometry))return;
       }
       if(loading && (newLoading || loading.roster.length)) {
         const rosterKey=JSON.stringify(loading.roster);
         if(rosterKey!==lastRoster) {
           lastRoster=rosterKey;
           void send('setup-roster',{entries:loading.roster,at:Date.now()});
         }
       }
       const civ=loading?.civ??null;
       const confirmed=setup.confirmCiv(civ);
       if(confirmed)pendingCiv=confirmed;
       setupStatus.civilization=!settings.setup.playerName?$t("Elegí tu build con el selector y aprendo tu nombre para la próxima partida", "Choose your build in the picker and I'll learn your name for the next match"):civ?$t(`${civ} · confirmando jugador`, `${label(civ)} · confirming player`):$t("No pude identificar tu civilización; mantené o elegí un build", "Could not identify your civilization; keep or choose a build");
       if(confirmed && !sessionLocked)selectAutoBuild(confirmed);
       setupStatus.message=$t("No pude ubicar los contadores. Entrá a una partida o corregí las regiones.", "Could not find the counters. Enter a match or adjust the regions.");
       setupStatus.counters=$t("HUD no reconocido", "HUD not recognized");setupStatus.clock=$t("Esperando reloj de partida", "Waiting for the game timer");return;
     }
     setup.observeHud();
     const candidate=clockCandidate(result.lines,geometry);
     const time=setup.clock.read(candidate?.seconds??null);
     if(time?.newMatch) {
       dismissCelebration(true);visible=true;
       finish();stepIndex=0;subtaskIndex=0;clock=new PracticeClock();sessionLocked=false;
       if(setup.newMatch()) {
         await send('setup-new-match');
         if(!setup.current(token,result.geometry))return;
       }
       if(pendingCiv && selectAutoBuild(pendingCiv))return;
     }
     if(time && build?.steps.length && automaticAllowed(settings.onboarding)) {
       if(!practice)practice=newPractice(build);
       clock.sync(time.seconds);arrive();sessionLocked=true;
     } else if(!setup.clock.manual)clock.pause();
     setupStatus.clock=setup.clock.manual?$t("Control manual", "Manual control"):time?$t("Sincronizado con el juego", "Synced with game"):candidate?$t("Confirmando reloj", "Confirming timer"):$t("No pude leer el reloj; podés iniciarlo manualmente", "Could not read the timer; you can start it manually");
     // A recognized HUD is enough: villager goals advance with or without a running timer.
     const reading=consumeRows(result.rows,settings.setup.autoAdvance);
     setupStatus.counters=reading?$t(`${reading.total} aldeanos · incluye ${reading.idle} inactivos`, `${reading.total} villagers · including ${reading.idle} idle`):$t("Lectura incompleta: corregí las regiones", "Incomplete reading: adjust the regions");
     const sample=reading?calibration.observe(reading,JSON.stringify([result.workers,result.idle])):null;
     if(!sample)calibration.interrupt();
     if(sample?.stable && result.workers && result.idle) {
       const manual=!!hint?.manual && JSON.stringify(hint.workers)===JSON.stringify(result.workers) && JSON.stringify(hint.idle)===JSON.stringify(result.idle);
       saveProfile({key:profileKey(geometry),width:geometry.width,height:geometry.height,workers:result.workers,idle:result.idle,clock:hint?.clock??(time?candidate?.rect??null:null),position:pendingPositions.get(profileKey(geometry))??hint?.position??null,manual:!forceDetection&&manual});
       forceDetection=false;
     }
     setupStatus.message=reading && clock.running?$t("Listo", "Ready"):reading?$t("Contadores encontrados · falta iniciar o leer el reloj", "Counters found · start the timer or make it visible"):$t("Revisá los contadores", "Check the counters");
   } catch(e) {
     if(requestToken!==setup.token())return;
     liveSample=observeOverlaySample(liveSample,[],Date.now());
     calibration.interrupt();
     if(settings?.setup.enabled && active && !editing && !selecting) {setupStatus.message=String(e);setupStatus.counters=$t("Lectura pendiente", "Reading pending");}
     if(!setup.clock.manual)clock.pause();setup.clock.suspend();invalidateOcr();
   } finally {setupBusy=false;report();}
 }
 function selectAutoBuild(civ:string) {
   if(!data || setup.buildManual)return;
   const selected=chooseBuild(data,civ,data.settings.setup.mode);
   setupStatus.civilization=selected?`${civ} · ${selected.name}`:$t(`${civ} · elegí un build para ${data.settings.setup.mode}`, `${label(civ)} · choose a build for ${label(data.settings.setup.mode)}`);
   if(selected && selected.id!==data.settings.activeBuildId) {
     // Manager owns persistence. No further readings are applied until the new build arrives.
     setup.suspend();void send('setup-build',{id:selected.id,previous:data.settings.activeBuildId});return true;
   }
 }
 async function scan() {
   if(settings?.setup.enabled)return;
   if (!settings?.ocr.enabled || settings.ocr.source !== 'workers' || !settings.ocr.idleRegion || !active || editing || selecting || pickerOpen || !build || ocrBusy) return;
   ocrBusy = true;
   const generation = gate.generation, buildId = build.id, previousIndex = index;
   try {
     const rows = await readWorkers(settings.ocr);
     if (!gate.isCurrent(generation) || !active || editing || selecting || build?.id !== buildId || index !== previousIndex) return;
     consumeRows(rows,true);
   } catch (e) { liveSample=observeOverlaySample(liveSample,[],Date.now());invalidateOcr(); ocrMessage = String(e); }
   finally { ocrBusy = false; void send('ocr-status', ocrMessage); }
 }
 onMount(() => {
   let alive = true, polling = false;
   const updateFocus = (value: boolean) => { if(value!==active) {suspendSetup();if(!value)setupStatus.message=$t("Esperando AoE4", "Waiting for AoE4");} active = value; if (value) preview = false; };
   const activate = async () => {
     if (await takeOverlayActivation()) {
       const inGame = await gameActive();
       if (alive) { dismissCelebration();updateFocus(inGame); visible = true; preview = !inGame; }
     }
   };
   void makeClickThrough().catch(e => error = String(e));
   void loadData().then(applyData);
   const stops = [
     keepAlive(),
     onDataChanged(applyData),
     onGameFocus(updateFocus),
     onGameReopened(() => {
       finish();
       resetSession();
       visible = true;
       preview = false;
       void send('setup-new-match');
     }),
     on('build-picker-open',value=>{pickerOpen=Boolean(value);suspendSetup();}),
     on('picker-select-build',value=>{if(typeof value==='string')pickBuild(value);}),
     onOverlayActivation(() => void activate().catch(e => error = String(e))),
     onRegionSelecting(value => { selecting = value; suspendSetup();calibration.reset(); }),
     on('hotkeys-suspend', value => suspended = Boolean(value)),
     on('hotkey-status-request', () => void send('hotkey-status', failedHotkeys)),
     on('overlay-action', value => manualAction(value as HotkeyAction)),
     on('setup-manual-build',()=>setup.manualBuild()),
     on('setup-retry',()=>{suspendSetup();calibration.reset();forceDetection=true;setupStatus.message=$t("Volvé a AoE4 para detectar el HUD", "Return to AoE4 to detect the HUD");report();}),
     on('setup-clock-resume',()=>{dismissCelebration(true);visible=true;setup.resumeClock(clock);invalidateOcr();setupStatus.clock=$t("Esperando reloj visible", "Waiting for a visible game timer");report();}),
     on('setup-manual-profile',value=>{suspendSetup();calibration.reset();forceDetection=false;const p=value as SetupProfile;if(validProfile(p))saveProfile(p);}),
     on('setup-status-request',report),
     onNativeEdit(() => void edit(true)),
     on('practice-status-request', report),
     on('restore-session', resetSession),
     on('goto-step', value => { dismissCelebration(true);setup.suspend();invalidateOcr();clearAdvance(); stepIndex = clampIndex(build, Number(value) || 0); subtaskIndex=0; visible = true; report(); })
   ];
   const focus = async () => {
     if (polling) return; polling = true;
     try { const value = await gameActive(); if (alive) { updateFocus(value); await activate(); } }
     catch { if (alive) active = false; }
     finally { polling = false; }
   };
   void focus(); const focusTimer = setInterval(() => void focus(), 1000);
   const tick = setInterval(report, 500);
   const ocrTimer = setInterval(() => void scan(), 700);
   const setupTimer=setInterval(()=>void autoSetup(),1500);
   return () => { alive = false;suspendSetup(); stops.forEach(stop => stop()); clearInterval(tick); clearInterval(focusTimer); clearInterval(ocrTimer);clearInterval(setupTimer); void unbindHotkeys(); };
 });
 $effect(() => { void setEditing(editing || (preview && !celebration)).catch(e => error = String(e)); });
 $effect(() => {
   if (!hotkeyKey) return;
   if (suspended || selecting || pickerOpen || !active) { void unbindHotkeys(); return; }
   void bindHotkeys(JSON.parse(hotkeyKey), action => manualAction(action as HotkeyAction)).then(failed => { failedHotkeys = failed; void send('hotkey-status', failed); });
 });
 $effect(() => {
   JSON.stringify(settings?.ocr); active; editing;
   invalidateOcr();
 });
 $effect(() => {
   if (!root || !settings || editing) return;
   const { corner, offsetX, offsetY, position } = settings;
   const area=settings.setup.enabled?game:null;
   const saved=currentProfile?.position;
   const anchor=area?(saved?{x:area.x+saved.x,y:area.y+saved.y}:null):position;
   const place = () => { const rect = root!.getBoundingClientRect(); if (rect.width && rect.height) void placeOverlay(rect.width, rect.height, corner, offsetX, offsetY, anchor,area).catch(e => error = String(e)); };
   place(); const observer = new ResizeObserver(place); observer.observe(root);
   return () => observer.disconnect();
 });
 $effect(() => {
   if (editing && root && settings) {
     const rect = root.getBoundingClientRect(), s = settings;
     void overlayPosition().then(p => placeOverlay(rect.width, rect.height, s.corner, s.offsetX, s.offsetY, p)).catch(e => error = String(e));
   }
 });
</script>

<svelte:head><title>AoE4 Overlay</title></svelte:head>
{#if data && settings && !selecting && !pickerOpen && ((visible && active) || editing || preview)}
 <div class="stage" class:browser={!isTauri}>
  <div bind:this={root} class="root" style="zoom: {settings.scale}; opacity: {settings.opacity}">
   {#if celebration}
    <BuildCompleted name={celebration.name} elapsed={celebration.elapsed} accent={overlayTheme(build?.civ ?? '', settings.civilizationColors, settings.accent).accent} />
   {:else}
   {#if preview && !editing}
    <div class="previewbar"><span>{$t("Vista previa · Volvé a AoE4 para jugar", "Preview · Return to AoE4 to play")}</span><button type="button" onclick={() => preview = false}>{$t("Ocultar", "Hide")}</button></div>
   {/if}
   {#if editing}
    <div class="editbar">
     <button type="button" onpointerdown={() => void dragOverlay().catch(e => error = String(e))}>{$t("⠿ Arrastrá a cualquier monitor", "⠿ Drag to any monitor")}</button>
     <button type="button" onclick={() => void edit(false)}>{$t("Listo", "Done")}</button>
    </div>
   {/if}
   {#if error}<div class="notice">{error}</div>{/if}
   {#if readingView.showDetection}<div class="ocr-status">{!active?$t('Volvé a AoE4 para leer los contadores','Return to AoE4 to read counters'):liveSample.lastGoodAt!==null?$t('No puedo leer los contadores · revisá la región OCR','Counters unreadable · check the OCR region'):$t('Buscando contadores…','Finding counters…')}</div>{/if}
   {#if !build}<div class="notice">{$t("No hay builds cargados. Creá uno en la ventana de gestión.", "No builds loaded. Create one in the main window.")}</div>
   {:else if settings.compact}<Compact {build} stepIndex={index} subtaskIndex={taskIndex} accent={settings.accent} civilizationColors={settings.civilizationColors} reading={readingView.reading} {trackingEnabled} {automation} nextKey={settings.hotkeys.next} {elapsed} showClock={settings.showClock} />
   {:else}<Panel {build} stepIndex={index} subtaskIndex={taskIndex} accent={settings.accent} civilizationColors={settings.civilizationColors} reading={readingView.reading} {trackingEnabled} {automation} {elapsed} showClock={settings.showClock} hotkeys={settings.hotkeys} />{/if}
   {/if}
  </div>
 </div>
{/if}
<style>
 :global(html), :global(body) { overflow: hidden; }
 .stage { display: flex; align-items: flex-start; }
 .stage.browser { min-height: 100vh; padding: 32px; background: #2a3226; }
 .root { display: inline-block; line-height: 0; }
 .root > :global(*) { line-height: normal; }
 .notice { width: 320px; padding: 16px; background: var(--bg); border: 1px solid var(--line); border-radius: 10px; color: var(--soft); }
 .editbar { display: flex; gap: 6px; background: #1b2028; padding: 8px; border: 1px solid #f2b33d; }
 .previewbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 8px 10px; background: #1b2028; color: var(--soft); font-size: 12px; }
 .previewbar button { border: 1px solid var(--line-strong); border-radius: 4px; background: var(--bg); padding: 5px 8px; cursor: pointer; }
 .editbar button { background: #323946; border: 0; padding: 8px; cursor: move; }
 .ocr-status { background: #12151a; color: #9aa2ae; padding: 4px 10px; font-size: 12px; max-width: 380px; white-space:pre-line; }
</style>
