# Step-aware advancement implementation plan

Approved scope: the user requested implementing the discussed hybrid policy. Evaluate completion of the CURRENT instruction, then reveal the next one. Total-worker steps include idle; resource steps require only selected minima; transfers require observed source decrease and destination increase from a stable entry baseline. Building/age-up and ambiguous instructions remain manual. Never infer that OCR proves a construction or an individual villager's identity.

Implementation choices: optional structured `advance` on Step; missing means suggested rule derived conservatively from action/note and allocation. An editor disclosure exposes suggestion/override. Three valid observations confirm conditions, and a stable transfer baseline survives focus loss but not step/session/rule changes. End of build remains explicitly finished by the user. Existing saved/imported builds stay compatible. Keep this established checkout and all previous changes.

Alternatives: total-only cannot distinguish redistributions; exact whole-allocation matching rejects extra villagers. Chosen hybrid checks only the relevant condition. Before/after counts remain evidence of a net change, not proof of individual movement.

- [x] Task 1: tests for rule inference, current-step minima, transfers, gaps, reset, malformed data, cloning and backups; implement `src/lib/advance.ts` and optional persisted types.
- [x] Task 2: shared gate in both OCR paths, clear status explaining manual/waiting/confirmation; editor disclosure with override; update guidance.
- [x] Task 3: Node/Svelte/build validation, independent review per executing-plans skill, targeted fixes, isolated UI smoke and production executable.

Review focus: mixed construction instructions, unrelated resource excess, transfer baseline at transition, edits/restores during in-flight OCR, final-step behavior and manual clock precedence.

Ledger: design approved in conversation; no repeated approval required. Native inline implementation, final independent review. Previous automatic-setup work is retained without unrelated changes.

Task 1 complete: missing-module RED, implementation GREEN. 8 new behavior tests; removed superseded next-step-total helper/test. Malformed explicit rules normalize to manual; backups reject them; nested minima clone independently.
Task 2 complete: shared current-step evaluation in both OCR paths; stable transfer seed on Next, preserve baseline on focus/clock loss, reset on session/step/rule changes; explicit manual last-step finish. Build-step edits invalidate pending native reads. Editor disclosure and guidance updated.
Final review: independent reviewer found no blocking issues. Prior native OCR/setup and real-game recognition were excluded from this change review because unchanged; earlier fixture/live evidence remains relevant. Packaging and editor smoke verified separately. Conservative text inference is not comprehensive language understanding; unknown instructions default manual and explicit criteria remain editable.
UI smoke: isolated debug instance showed suggested food minimum and manual building/age instructions; selected Transfer and Resources, saw expected fields and condition updates, restored Auto, exited with Salir. Production user's data/instance left running. No game inputs sent for this feature test.
Additional regression: mixed “Subir a Castillos y mandar 4 aldeanos a oro” initially inferred resources; test failed, plural age wording fixed, all 39 Node tests passed. Svelte check: 0 errors/warnings. Frontend build passed.
Release: previous running binary renamed within target/release to aoe4-overlay-before-step-rules.exe so the updated canonical executable can compile without stopping the user's current practice. User must exit/reopen to load it.
Production release passed (optimized, offline, 1m55s). No review findings remain. Updated canonical executable verified; temporary build log removed.
