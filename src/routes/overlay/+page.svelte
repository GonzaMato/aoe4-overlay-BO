<script lang="ts">
 import { onMount } from 'svelte';
 import { takeOverlayActivation, onOverlayActivation } from '$lib/bridge';
 import Compact from '$lib/components/Compact.svelte';
 import Panel from '$lib/components/Panel.svelte';
 import BuildCompleted from '$lib/components/BuildCompleted.svelte';
 import { CompletionFeedback } from '$lib/completion';
 import { bindHotkeys, isTauri, keepAlive, loadData, makeClickThrough, on, onDataChanged, placeOverlay, send, unbindHotkeys, gameActive, onGameFocus, onRegionSelecting, setEditing, dragOverlay, overlayPosition, onNativeEdit, readWorkers } from '$lib/bridge';
 import { clampIndex, indexForPop } from '$lib/steps';
 import { PracticeClock, newPractice, recordArrival } from '$lib/practice';
 import { parseVillagerReading, VillagerTotalGate } from '$lib/ocr';
 import { AdvanceGate, advanceLabel, type Reading } from '$lib/advance';
 import { taskRule, taskCount, moveTask, isLastTask, reconcileCursor } from '$lib/subtasks';
 import type { AppData, HotkeyAction, Practice } from '$lib/types';
 import { gameGeometry, inspectGame, overlayBounds } from '$lib/bridge';
 import { SetupController } from '$lib/setup-controller';
 import { automaticAllowed } from '$lib/onboarding';
 import { profileKey, clockCandidate, localCivilization, chooseBuild, validProfile, type GameGeometry, type SetupStatus, type SetupProfile } from '$lib/setup';

 let data = $state<AppData | null>(null);
 let stepIndex = $state(0);
 let subtaskIndex = $state(0);
 let visible = $state(true);
 let active = $state(!isTauri);
 let editing = $state(false);
 let suspended = $state(false);
 let selecting = $state(false);
 let preview = $state(false);
 const completion=new CompletionFeedback();
 let celebration=$state<{name:string;elapsed:number|null}|null>(null);
 let root = $state<HTMLDivElement>();
 let elapsed = $state<number | null>(null);
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
 let setupStatus = $state<SetupStatus>({message:'Esperando AoE4',profile:'Sin perfil',counters:'Pendientes',civilization:'Elegí tu build o indicá tu nombre de jugador',clock:'Esperando reloj visible',manualClock:false,geometry:null});
 let setupBusy=false, calibrationKey='', calibrationSamples=0, pendingCiv:string|null=null;
 let sessionLocked=false;
 let forceDetection=false;
 const pendingPositions=new Map<string,{x:number;y:number}>();
 const settings = $derived(data?.settings ?? null);
 const currentProfile=$derived(game ? settings?.setup.profiles.find(p=>p.key===profileKey(game!))??null : null);
 const build = $derived(data ? (data.builds.find(b => b.id === data!.settings.activeBuildId) ?? null) : null);
 const index = $derived(clampIndex(build, stepIndex));
 const taskIndex = $derived(Math.min(subtaskIndex,taskCount(build?.steps[index])-1));
 const cursor = $derived({step:index,task:taskIndex});
 const atEnd = $derived(isLastTask(build,cursor));
 const hotkeyKey = $derived(settings ? JSON.stringify(settings.hotkeys) : '');

 function report() {
   if(completion.tick()){celebration=null;visible=false;preview=false;}
   elapsed = practice ? Math.floor(clock.elapsed()) : null;
   void send('practice-status', { elapsed, running: clock.running, step: index + 1, buildName: build?.name ?? '', recording: !!practice, editing, automatic:settings?.setup.enabled, manualClock:setup.clock.manual });
   setupStatus.manualClock=setup.clock.manual;
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
   setupStatus.message='Build completado';report();
 }
 function applyData(incoming: AppData) {
   const oldBuild=data?.builds.find(b=>b.id===data?.settings.activeBuildId),newBuild=incoming.builds.find(b=>b.id===incoming.settings.activeBuildId);
   if(JSON.stringify(oldBuild?.steps)!==JSON.stringify(newBuild?.steps)){
     const nextCursor=reconcileCursor(oldBuild,newBuild,cursor);
     suspendSetup();clearAdvance();stepIndex=nextCursor.step;subtaskIndex=nextCursor.task;
   }
   if (data && JSON.stringify([data.settings.onboarding,data.settings.setup.enabled,data.settings.setup.playerName,data.settings.setup.mode,data.settings.ocr])!==JSON.stringify([incoming.settings.onboarding,incoming.settings.setup.enabled,incoming.settings.setup.playerName,incoming.settings.setup.mode,incoming.settings.ocr])) {suspendSetup();setupStatus.sample=null;}
   if (incoming.settings.activeBuildId !== lastActiveId) {
     dismissCelebration(true);visible=true;
     setup.suspend();sessionLocked=false;
     finish(); lastActiveId = incoming.settings.activeBuildId; stepIndex = 0; subtaskIndex=0;
     clock = new PracticeClock(); elapsed = null;
   }
   const positionChanged = JSON.stringify(data?.settings.position) !== JSON.stringify(incoming.settings.position);
   const resetPosition=positionChanged && incoming.settings.position===null && incoming.settings.setup.enabled && game;
   data = incoming;
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
 const actions: Record<HotkeyAction, () => void> = {
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
     const sameCiv = data.builds.filter(b => b.civ === build.civ);
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
   setup.suspend();invalidateOcr();calibrationSamples=0;calibrationKey='';
   if(settings?.setup.enabled && !setup.clock.manual)clock.pause();
 }
 function saveProfile(profile:SetupProfile) {
   if(!data || !validProfile(profile))return;
   const old=data.settings.setup.profiles.find(p=>p.key===profile.key);
   if(JSON.stringify(old)===JSON.stringify(profile))return;
   data.settings.setup.profiles=[...data.settings.setup.profiles.filter(p=>p.key!==profile.key),profile].slice(-24);
   void send('setup-profile',profile);
 }
 function consumeRows(rows:string[], canAdvance:boolean) {
   canAdvance = canAdvance && !!settings && automaticAllowed(settings.onboarding);
   prepareAdvance();
   setupStatus.condition=advance?.rule.kind??'none';
   const reading=parseVillagerReading(rows),result=advance?.read(canAdvance?reading:null);
   const condition=advance?advanceLabel(advance.rule):'Elegí un build';
   const status=settings?.onboarding==='detecting'?'Compará los cinco contadores y confirmá en Inicio (Alt+Tab)':advance?.rule.kind==='manual'?condition:!canAdvance?`${condition} · esperando reloj`:result?.message??condition;
   const counters=reading ? `Aldeanos: ${reading.total} · C ${reading.workers.food} / M ${reading.workers.wood} / O ${reading.workers.gold} / P ${reading.workers.stone} + ${reading.idle} inactivos` : `Lectura incompleta · C ${rows[0]||'—'} / M ${rows[1]||'—'} / O ${rows[2]||'—'} / P ${rows[3]||'—'} + ${rows[4]||'—'} inactivos`;
   ocrMessage=`${counters}\n${status}`;
   if(canAdvance && result?.complete && build) {
     if(!atEnd) {
       actions.next();
       ocrMessage=`${counters}\n${advance?advanceLabel(advance.rule):''} · nueva instrucción`;
     } else ocrMessage=`${counters}\nObjetivo cumplido · AvPág para terminar la práctica`;
   }
   void send('ocr-status',ocrMessage);
   return reading;
 }
 async function autoSetup() {
   if(!settings?.setup.enabled || !active || editing || selecting || setupBusy || !data)return;
   setupBusy=true;
   const initial=setup.token();let requestToken=initial;
   try {
     const geometry=await gameGeometry();
     if(initial!==setup.token() || !settings?.setup.enabled || !active || editing || selecting)return;
     if(!geometry) {suspendSetup();setupStatus.sample=null;setupStatus.message='No encuentro AoE4 en primer plano';return;}
     if(setup.geometry(geometry)) {invalidateOcr();setupStatus.sample=null;calibrationKey='';calibrationSamples=0;game=geometry;}
     setupStatus.geometry=geometry;setupStatus.profile=`${geometry.width} × ${geometry.height} · ${geometry.dpi/96*100}% · ${geometry.monitor}`;
     const token=setup.token(), hint=data.settings.setup.profiles.find(p=>p.key===profileKey(geometry))??null;
     requestToken=token;
     const result=await inspectGame(geometry,forceDetection?null:hint,await overlayBounds());
     if(!setup.current(token,result.geometry) || !active || editing || selecting || !settings?.setup.enabled)return;
     if(setup.observeLobby(result.lines))pendingCiv=null;
     if(!result.hud) {
       setupStatus.sample=null;
       if(!setup.clock.manual)clock.pause();invalidateOcr();setup.clock.suspend();calibrationSamples=0;
       const civ=localCivilization(result.lines,settings.setup.playerName,settings.civs);
       const confirmed=setup.confirmCiv(civ);
       if(confirmed)pendingCiv=confirmed;
       setupStatus.civilization=!settings.setup.playerName?'Indicá tu nombre de jugador para identificar tu civilización':civ?`${civ} · confirmando jugador`:'No pude identificar tu civilización; mantené o elegí un build';
       if(confirmed && !sessionLocked)selectAutoBuild(confirmed);
       setupStatus.message='No pude ubicar los contadores. Entrá a una partida o corregí las regiones.';
       setupStatus.counters='HUD no reconocido';setupStatus.clock='Esperando reloj de partida';return;
     }
     const candidate=clockCandidate(result.lines,geometry);
     const time=setup.clock.read(candidate?.seconds??null);
     if(time?.newMatch) {
       dismissCelebration(true);visible=true;
       finish();stepIndex=0;subtaskIndex=0;clock=new PracticeClock();setup.newMatch();sessionLocked=false;
       void send('setup-new-match');
       if(pendingCiv && selectAutoBuild(pendingCiv))return;
     }
     if(time && build?.steps.length && automaticAllowed(settings.onboarding)) {
       if(!practice)practice=newPractice(build);
       clock.sync(time.seconds);arrive();sessionLocked=true;
     } else if(!setup.clock.manual)clock.pause();
     setupStatus.clock=setup.clock.manual?'Control manual':time?'Sincronizado con el juego':candidate?'Confirmando reloj':'No pude leer el reloj; podés iniciarlo manualmente';
     const reading=consumeRows(result.rows,clock.running && !!practice && (setup.clock.manual || time!==null));
     setupStatus.counters=reading?`${reading.total} aldeanos · incluye ${reading.idle} inactivos`:'Lectura incompleta: corregí las regiones';
     const regionsKey=JSON.stringify([result.workers,result.idle]);
     calibrationSamples=reading?(calibrationKey===regionsKey?calibrationSamples+1:1):0;calibrationKey=regionsKey;
     setupStatus.sample=reading?{...reading,at:Date.now(),stable:calibrationSamples>=3}:null;
     if(calibrationSamples>=3 && result.workers && result.idle) {
       const manual=!!hint?.manual && JSON.stringify(hint.workers)===JSON.stringify(result.workers) && JSON.stringify(hint.idle)===JSON.stringify(result.idle);
       saveProfile({key:profileKey(geometry),width:geometry.width,height:geometry.height,workers:result.workers,idle:result.idle,clock:hint?.clock??(time?candidate?.rect??null:null),position:pendingPositions.get(profileKey(geometry))??hint?.position??null,manual:!forceDetection&&manual});
       forceDetection=false;
     }
     setupStatus.message=reading && clock.running?'Listo':reading?'Contadores encontrados · falta iniciar o leer el reloj':'Revisá los contadores';
   } catch(e) {
     if(requestToken!==setup.token())return;
     setupStatus.sample=null;
     calibrationSamples=0;calibrationKey='';
     if(settings?.setup.enabled && active && !editing && !selecting) {setupStatus.message=String(e);setupStatus.counters='Lectura pendiente';}
     if(!setup.clock.manual)clock.pause();setup.clock.suspend();invalidateOcr();
   } finally {setupBusy=false;report();}
 }
 function selectAutoBuild(civ:string) {
   if(!data || setup.buildManual)return;
   const selected=chooseBuild(data,civ,data.settings.setup.mode);
   setupStatus.civilization=selected?`${civ} · ${selected.name}`:`${civ} · elegí un build para ${data.settings.setup.mode}`;
   if(selected && selected.id!==data.settings.activeBuildId) {
     // Manager owns persistence. No further readings are applied until the new build arrives.
     setup.suspend();void send('setup-build',{id:selected.id,previous:data.settings.activeBuildId});return true;
   }
 }
 async function scan() {
   if(settings?.setup.enabled)return;
   if (!settings?.ocr.enabled || settings.ocr.source !== 'workers' || !settings.ocr.idleRegion || !active || editing || selecting || !clock.running || !build || ocrBusy) return;
   ocrBusy = true;
   const generation = gate.generation, buildId = build.id, previousIndex = index;
   try {
     const rows = await readWorkers(settings.ocr);
     if (!gate.isCurrent(generation) || !active || editing || selecting || !clock.running || build?.id !== buildId || index !== previousIndex) return;
     consumeRows(rows,true);
   } catch (e) { invalidateOcr(); ocrMessage = String(e); }
   finally { ocrBusy = false; void send('ocr-status', ocrMessage); }
 }
 onMount(() => {
   let alive = true, polling = false;
   const updateFocus = (value: boolean) => { if(value!==active) {suspendSetup();if(!value)setupStatus.message='Esperando AoE4';} active = value; if (value) preview = false; };
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
     onOverlayActivation(() => void activate().catch(e => error = String(e))),
     onRegionSelecting(value => { selecting = value; suspendSetup();setupStatus.sample=null; }),
     on('hotkeys-suspend', value => suspended = Boolean(value)),
     on('hotkey-status-request', () => void send('hotkey-status', failedHotkeys)),
     on('overlay-action', value => manualAction(value as HotkeyAction)),
     on('setup-manual-build',()=>setup.manualBuild()),
     on('setup-retry',()=>{suspendSetup();setupStatus.sample=null;forceDetection=true;setupStatus.message='Volvé a AoE4 para detectar el HUD';report();}),
     on('setup-clock-resume',()=>{dismissCelebration(true);visible=true;setup.resumeClock(clock);invalidateOcr();setupStatus.clock='Esperando reloj visible';report();}),
     on('setup-manual-profile',value=>{suspendSetup();setupStatus.sample=null;forceDetection=false;const p=value as SetupProfile;if(validProfile(p))saveProfile(p);}),
     on('setup-status-request',report),
     onNativeEdit(() => void edit(true)),
     on('practice-status-request', report),
     on('restore-session', () => { dismissCelebration(true);suspendSetup();setup.reset();clearAdvance();game=null;pendingCiv=null;pendingPositions.clear();forceDetection=false;sessionLocked=false;practice = null; clock = new PracticeClock(); stepIndex = 0; subtaskIndex=0; elapsed = null; invalidateOcr(); report(); }),
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
   if (suspended || selecting || !active) { void unbindHotkeys(); return; }
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
{#if data && settings && !selecting && ((visible && active) || editing || preview)}
 <div class="stage" class:browser={!isTauri}>
  <div bind:this={root} class="root" style="zoom: {settings.scale}; opacity: {settings.opacity}">
   {#if celebration}
    <BuildCompleted name={celebration.name} elapsed={celebration.elapsed} accent={settings.accent} />
   {:else}
   {#if preview && !editing}
    <div class="previewbar"><span>Vista previa · Volvé a AoE4 para jugar</span><button type="button" onclick={() => preview = false}>Ocultar</button></div>
   {/if}
   {#if editing}
    <div class="editbar">
     <button type="button" onpointerdown={() => void dragOverlay().catch(e => error = String(e))}>⠿ Arrastrá a cualquier monitor</button>
     <button type="button" onclick={() => void edit(false)}>Listo</button>
    </div>
   {/if}
   {#if error}<div class="notice">{error}</div>{/if}
   {#if settings.setup.enabled}<div class="ocr-status">Setup · {setupStatus.message}</div>{/if}
   {#if settings.ocr.enabled || settings.setup.enabled}<div class="ocr-status">OCR · {ocrMessage || 'Esperando partida y reloj'}</div>{/if}
   {#if !build}<div class="notice">No hay builds cargados. Creá uno en la ventana de gestión.</div>
   {:else if settings.compact}<Compact {build} stepIndex={index} subtaskIndex={taskIndex} accent={settings.accent} {elapsed} showClock={settings.showClock} />
   {:else}<Panel {build} stepIndex={index} subtaskIndex={taskIndex} accent={settings.accent} {elapsed} showClock={settings.showClock} hotkeys={settings.hotkeys} />{/if}
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
