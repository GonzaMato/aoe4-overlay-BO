# Single instance and settings usability

Use Tauri's official single-instance plugin, registered first. A subsequent launch requests the existing overlay without resetting the build, clock or practice. Outside the game restore the manager and show a dismissible preview; when the game receives focus return to normal automatic visibility. Queue the request natively so launching twice during startup does not lose it. If OCR selection is open, focus that selection instead.

Reorganize Settings with a local sidebar (Overlay, Atajos, OCR, Listas, Respaldo). Keep the existing Barlow type, dark slate palette and gold accent. Use compact section headings, consistent fields, a live miniature overlay preview and grouped shortcut rows. Hide manual pixel margins under advanced positioning. Preserve all existing bindings and backup confirmation.

- [x] Implement native single-instance activation and startup-safe request consumption.
- [x] Add overlay preview activation without changing gameplay state or focus gating.
- [x] Rework Settings navigation and controls; move backup into its own section.
- [x] Run Node/Rust checks, Svelte check, production build and isolated native smoke tests (relaunch, state preservation, settings navigation, exit).

Validation: 12 Node tests, 2 Rust tests, Svelte check (0 errors/warnings), frontend and release builds passed. Native smoke used the separate `com.gonzalo.aoe4-overlay-smoke` data directory. Both duplicate launches exited immediately and retained original PID 33748. After hiding the manager with X, relaunch restored the same windows with step 3 and the clock still running (0:10 before hide, 0:28 after reopen). Overlay preview was visible; its Hide control dismissed it. Visually checked Overlay, Atajos, Avance automático and Respaldo sections. Exit closed both windows. Scoped code review found no actionable defects. Actual game focus transition and mixed-DPI behavior were not exercised in this test.
