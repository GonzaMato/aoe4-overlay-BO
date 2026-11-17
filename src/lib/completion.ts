/** Finishing a build is explicit; repeated hotkeys must not replay the feedback. */
export class CompletionFeedback {
  private completed=false;
  private deadline:number|null=null;
  begin(now=Date.now()):boolean {
    if(this.completed)return false;
    this.completed=true;this.deadline=now+2200;return true;
  }
  tick(now=Date.now()):boolean {
    if(this.deadline===null || now<this.deadline)return false;
    this.deadline=null;return true;
  }
  /** An explicit show/edit action wins over the pending automatic hide. */
  reveal(){this.deadline=null;}
  reset(){this.completed=false;this.deadline=null;}
}
