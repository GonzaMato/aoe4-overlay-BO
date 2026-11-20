import { ClockTracker, geometryKey, lobbyScreen, type GameGeometry, type OcrLine } from './setup';
import type { PracticeClock } from './practice';
import type { HotkeyAction } from './types';

/** One generation spans geometry, focus and user intent, not just a native request. */
export class SetupController {
  clock = new ClockTracker();
  buildManual = false;
  private revision = 0;
  private key = '';
  private lobbySamples = 0;
  private loadingPhase: 'none' | 'loading' | 'hud' = 'none';
  private civ = '';
  private civSamples = 0;
  token() { return this.revision; }
  current(token:number, g:GameGeometry) { return token===this.revision && geometryKey(g)===this.key; }
  geometry(g:GameGeometry) { const key=geometryKey(g); if(key!==this.key) { this.suspend();this.key=key;return true; } return false; }
  suspend() { this.revision++;this.clock.suspend();this.civ='';this.civSamples=0;this.lobbySamples=0; }
  manualBuild() {this.suspend();this.buildManual=true;}
  manualClock() {this.suspend();this.clock.override();}
  action(name:HotkeyAction,lastStep:boolean) {
    this.suspend();
    if(['start','pauseClock','clockPlus','clockMinus','resetPractice','resetClock','finishPractice'].includes(name) || (name==='next' && lastStep))this.manualClock();
    if(name==='cycleBuild')this.manualBuild();
  }
  resumeClock(practiceClock:PracticeClock) {this.suspend();this.clock.resume();practiceClock.pause();}
  reset() {this.suspend();this.clock=new ClockTracker();this.buildManual=false;this.loadingPhase='none';this.key='';}
  openLoadingBuildSelection() {
    if (this.lobbySamples < 2 || this.loadingPhase === 'loading') return false;
    this.loadingPhase = 'loading';
    this.buildManual = false;
    return true;
  }
  observeHud() {
    if (this.loadingPhase === 'loading') this.loadingPhase = 'hud';
  }
  newMatch() {
    // A manual choice made after this loading screen opened belongs to this match.
    const resetBuildChoice = this.loadingPhase === 'none';
    if (resetBuildChoice) this.buildManual = false;
    this.loadingPhase = 'none';
    this.civ = '';
    this.civSamples = 0;
    return resetBuildChoice;
  }
  observeLobby(lines:OcrLine[]) {
    this.lobbySamples=lobbyScreen(lines)?this.lobbySamples+1:0;
    if(this.lobbySamples===2) {this.clock.lobby();return true;}
    return false;
  }
  confirmCiv(civ:string|null) {
    if(!civ) {this.civ='';this.civSamples=0;return null;}
    this.civSamples=this.civ===civ?this.civSamples+1:1;this.civ=civ;
    return this.civSamples>=2?civ:null;
  }
}
