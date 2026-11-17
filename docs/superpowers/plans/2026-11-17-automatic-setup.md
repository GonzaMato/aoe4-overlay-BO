# Automatic Setup Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Prepare the overlay from the visible AoE4 window, with reusable calibration, cautious local-player selection, and a synchronized game clock.

**Architecture:** Rust owns game-window geometry, screen capture, visual HUD anchors and OCR. Pure TypeScript owns profiles, temporal validation and manual overrides; the overlay coordinates readings and the manager persists data. Existing manual controls remain functional.

**Tech Stack:** Tauri 2, Rust/windows 0.62, Svelte 5, TypeScript, local Windows OCR.

**Spec:** ../specs/2026-11-17-automatic-setup-design.md

## Global Constraints

- Sum four assigned-worker counts plus inactive villagers, never population.
- No game-memory inspection, game input, external services or changes to game settings.
- Ambiguity must preserve build/session/calibration and be visible to the user.
- Manual clock/build actions take priority until explicit reset or confirmed new match.
- Preserve saved builds/settings/history; test with isolated app data.

## Review Focus

- Moving/resizing AoE4 or changing DPI invalidates in-flight reads and rebases relative rectangles.
- Lobby/replay text must not select the opponent's civilization.
- Missing/paused/backward clocks must not invent practice progress or reset arrivals.
- Manual changes made during a slow native read must win when the result returns.
- Restore, disable and selector cancellation must not revive obsolete auto setup state.

### Task 1: Profile and temporal policy

Files: src/lib/setup.ts, src/lib/types.ts, src/lib/defaults.ts, src/lib/imports.ts, tests/setup.test.mjs.
Interfaces: GameGeometry; SetupProfile with relative workers/idle/clock rectangles; setup defaults; profile key/rebase helpers; clock validation; local-player civilization selection from positioned OCR lines.
- [x] Write tests for negative monitor origins, resolution/DPI profile separation, invalid backups, local-player ambiguity, clock rollback/staleness and manual override.
- [x] Run tests and observe missing-behavior failure.
- [x] Implement bounded profile normalization, strict candidates, and a temporal session controller.
- [x] Run npm test and npm run check.

### Task 2: Native geometry and HUD detection

Files: src-tauri/src/desktop.rs, src-tauri/src/setup.rs, src-tauri/src/worker_ocr.rs, src-tauri/src/lib.rs, tests/fixtures/.
Interfaces: game_geometry() -> optional GameGeometry; inspect_game(profile hint, local name) -> geometry plus candidate resource rectangles/rows and positioned OCR lines. All rectangles relative to client area; return only results for the original foreground geometry.
- [x] Add native regression fixtures from supplied screenshots and tests for scaled anchors, invalid panels, and clock text extraction.
- [x] Implement game client/monitor geometry and shared bounded capture utilities.
- [x] Find resource/worker anchors, verify row geometry, run current numeric OCR; reuse cached profile only after validation.
- [x] OCR clock candidates and loading/lobby text with bounding boxes; avoid overlay self-reading.
- [x] Run native tests with Windows OCR enabled.

### Task 3: Setup coordination and manual precedence

Files: src/lib/setup-controller.ts, src/lib/bridge.ts, src/routes/overlay/+page.svelte, src/lib/practice.ts, src/routes/+page.svelte.
Interfaces: setup status/events, profile update, auto-build selection and clock sync; manager remains single data writer.
- [x] Add tests for stale read rejection, manual overrides, clock synchronization without arrival rewrites, and reset only after confirmed match transition.
- [x] Integrate setup polling, validated per-geometry profiles, five-counter gate, game-area placement and automatic clock start.
- [x] Make manual region/position/build corrections persist to the correct current profile.
- [x] Run full Node suite and Svelte check.

### Task 4: Controls and end-to-end verification

Files: src/lib/components/SetupView.svelte, SettingsView.svelte, PracticeView.svelte, README.md.
- [x] Add one setup toggle, status, local player name/mode, fallback build choice, retry and return-to-game-clock controls.
- [x] Verify migration, backup, manual modes, disabled setup and unreadable HUD behavior.
- [x] Build isolated debug app, inspect UI and test against visible AoE4 when available without interrupting the original app.
- [x] Obtain independent code review, address important findings, run relevant suites and compile production release.

## Execution ledger

- Ruling: continue in the user's established checkout and leave changes reviewable rather than moving the working application to another path; this preserves the existing local run/build workflow. No unrelated edits or commits.
- Baseline: prior features are committed; only the approved design is untracked at task start.
- Local-player name requested asynchronously; leave configurable when not supplied. Missing identity must not silently select a build.
- Task 1: complete — 28 Node tests currently pass; includes strict profile backup validation, temporal and identity policy. Initial missing module failures were observed.
- Task 2: complete — 9 Rust tests with installed Windows OCR pass, including real five-counter and clock crops. Scaled HUD fixtures cover 0.8, 1, 1.25 and 1.5. The clock needed a tight second OCR pass; the idle blue background is excluded by chroma. No digits are invented for missing readings.
- Task 3: integrated — setup generation checks, relative profiles, manual precedence and manager-only persistence. UI smoke exposed a resume-clock issue; regression test failed then passed after freezing manual time when waiting for game time.
- Task 4: in progress — isolated native UI inspected; setup toggle waits for AoE4; manual practice works; test instance exited through Salir. Game was closed, user offered to open it for live verification.
- Ruling: native automatic profiles require a recognizable resource panel even with a manual hint. A different HUD layout uses the existing fully manual mode; this avoids treating a saved column from another screen as valid. Cost: unusual HUDs may need manual setup until a fixture is available.
- Ruling: exact name and configured mode identify the intended player; do not guess identity from the observed player in a replay. Cost: some loading layouts may need manual build choice, pending a real fixture.
- Final review: independent reviewer found three important issues. Fixed with failing-then-passing regression tests: opponent-card/partial-name attribution, stationary-clock advancement, and Next-at-final-step reopening a finished session. Node suite: 31/31.
- Live test found unreadable 4 and idle 1 with Windows OCR at enlarged scale. Added a real fixture and native-size/spaced fallback; all 10 Rust tests now pass with installed OCR. Coarse HUD search tolerates one-pixel sampling offsets but retains strict refined matching; restricted horizontal search to the left HUD margin to reduce CPU time.

- Final live verification: isolated debug instance recognized 2560×1440 / 96 DPI, summed 0 food + 6 wood + 2 gold + 0 stone + 5 idle = 13, and advanced the example automatically from step 1 through step 4. It held there for target 16. Clock progressed from 23:25 through 24:29; switching to the manager hid the overlay, and returning preserved step 4 and resynchronized time. Exited the test instance with Salir, leaving AoE4 running.
- Live integration fix: repeated clock samples were saving an unchanged practice arrival and invalidating OCR confirmation. `recordArrival` now reports whether it added a record; unchanged arrivals no longer trigger persistence. Regression failed before the fix and passes.
- Clock fixture at 15:21 exposed thresholding that erased the colon (15.21). Read the original tight image before thresholded fallback; cached clock regions avoid unnecessary scene OCR. Native regression now passes alongside earlier 01:02 and 05:16 fixtures.
- Verification: 32 Node tests, 11 native tests including installed Windows OCR, Svelte check (0 errors/warnings), frontend production build. Civilisation selection and new-match detection are covered by policy tests but not live loading-screen footage. Multiple monitor/DPI behavior is covered by coordinate/scale tests, not a live monitor change.
- Production release compiled successfully (optimized, offline, custom protocol). Updated executable: src-tauri/target/release/aoe4-overlay.exe. Temporary screenshots and diagnostics removed; isolated test instance exited.
