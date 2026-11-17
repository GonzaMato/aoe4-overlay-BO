# Completion feedback

Requested behavior: a small celebration on build completion, followed by hiding the overlay so play can continue. Implementation choice: retain explicit last-step confirmation (Next at final step or Finish while on final step), 2.2-second compact card, 16 CSS confetti pieces, no sound or click interception, reduced-motion support. App and saved practice remain available.

Completion is separate from internal practice finalization: changing build, resetting clock, detecting a new match or stopping early do not celebrate. Repeated completion inputs do not replay. Explicit show/edit cancels the pending hide; a new practice/build resets the completion latch. Ordinary focus changes do not reopen a completed overlay.

Verification: feedback controller tested against a stub (2 failing assertions), then implemented; all 42 Node tests pass and Svelte check has 0 errors/warnings. Isolated native smoke: selected final step, clicked Finish, observed small check/confetti card, then confirmed the overlay document was empty. Exited the test app. User's saved builds were not changed.

Build: frontend and isolated debug compile passed. Production release passed (optimized/offline, 1m40s); canonical executable updated.
