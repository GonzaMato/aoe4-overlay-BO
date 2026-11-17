# AoE4 Overlay

A build order overlay for Age of Empires IV. It shows one step at a time over the game, supports global hotkeys, and organizes your builds by civilization, mode, and map.

Built with Tauri 2 (Rust) and SvelteKit (Svelte 5 and TypeScript).

## Install on Windows

Download `AoE4 Overlay_0.3.1_x64-setup.exe` from [GitHub Releases](https://github.com/GonzaMato/aoe4-overlay-BO/releases) and follow the [quick-start guide](docs/quick-start.md).

The installer runs for your Windows user account. Open **AoE4 Overlay** from Start or the desktop. Node, Rust, and Visual Studio are only needed for development. If the app is already running, the shortcut brings back the existing instance. The interface defaults to English. Select Spanish in **Settings** to switch languages.

Updates install over the existing app and preserve builds, settings, and practice history in `%APPDATA%\com.gonzalo.aoe4-overlay\aoe4-overlay.json`. Choose **Exit app** before updating. Updates and launch are manual. `iniciar.bat` opens the installed app first. `iniciar.bat rebuild` and `dev` still use the project.

## Development prerequisites for Windows

1. **Node.js** 24 or later.
2. **Rust** via `rustup` with the MSVC toolchain.
3. **Microsoft C++ Build Tools** with the **Desktop development with C++** workload.
4. **WebView2**, which is included with up-to-date installations of Windows 10 and 11.

See the [official Tauri prerequisites](https://v2.tauri.app/start/prerequisites/).

## Run from source

```sh
npm install
npm run tauri dev
```

The first Rust build takes several minutes. The app opens a management window for builds and settings and a separate overlay window.

Run `npm run installer` to build the installer. It appears in `src-tauri/target/release/bundle/nsis/`. The app keeps the same identity across versions.

### Preview the interface without Rust

Run `npm run dev` and open `http://localhost:1420` for the management window and `http://localhost:1420/overlay` for the overlay in separate tabs. This preview stores data in the browser and only handles keys while the overlay tab has focus. Use it for design work.

## Use the overlay

### During a match

- Run AoE4 in **borderless windowed mode**. Exclusive fullscreen covers the overlay.
- Clicks pass through the overlay. Use hotkeys to control it.
- Choose a civilization and mode in the management window. The overlay loads the default build for that combination when one exists.
- **Exit app** saves your changes and closes both windows. The window's X hides the management window in the tray. The tray icon lets you reopen the app, move the overlay, or exit.
- Relaunching the app restores the current overlay, step, and clock. Outside the game it opens the management window and a preview you can hide. Returning to AoE4 restores automatic visibility.
- **Settings** groups automatic setup, the overlay, hotkeys, automatic advancement, lists, and backup. Changes apply automatically. Set exact pixel offsets with the corner and margin controls.
- Leaving AoE4 hides the overlay and releases its hotkeys. Edit mode lets you position the overlay outside the game.

### Default hotkeys

| Action | Hotkey |
| --- | --- |
| Next step | Page Down |
| Previous step | Page Up |
| Start or resume the clock at the current step | Ctrl + Alt + S |
| Start a new practice at step 1 and 0:00 | Ctrl + Alt + R |
| Pause or resume the clock | Ctrl + Alt + P |
| Adjust the clock by +5 or −5 seconds | Ctrl + Alt + → / ← |
| Finish practice | Ctrl + Alt + F |
| Toggle edit mode | Ctrl + Alt + E |
| Show or hide the overlay | Ctrl + Alt + H |
| Toggle compact mode | Ctrl + Alt + C |
| Switch build within the same civilization | Ctrl + Alt + B |

AoE4 reserves the hotkeys only while it is in the foreground. **Settings** lets you customize them and reports registration failures. The manual clock keeps running when you switch apps, so pause it if you pause the match. The synchronized clock waits for a new game reading.

### Builds

- Each step includes a reference population, an optional target time, an action, a note, and the target villager distribution. The overlay highlights changes from the previous step.
- Clone a build to edit a copy. Copy or import JSON to back up or share individual builds.
- You can paste JSON from **AoE4 Guides → Overlay Tool**. Import converts times, resources, and notes, represents icons as text, and leaves unknown population (`-1`) blank. Review the mode and population after importing.
- With the build active, select a step number in the editor to show that step in the overlay.
- A fresh install includes 25 attributed English openings, one for each civilization. **Home** adds missing starter builds in the selected language. For manual import, use `starter-pack.en.json` for English or `starter-pack.json` for Spanish. Both files are available in the release downloads and under `static/builds/`. They contain builds only. [Starter pack sources and review limits](docs/build-pack-sources.md)

### Subtasks for mixed instructions

Use the editor's subtask tool to draft separate tasks from the action and note. Review their order, edit the text and advancement criteria, then apply the subtasks. Existing builds change only when you apply edits. For example, split `Build a house + send 3 villagers to wood` into a manual `Build a house` task and a `Send 3 villagers to wood` task with a minimum based on the step's final wood allocation.

The overlay shows the current subtask and its position in the step. Page Down confirms a manual subtask and Page Up goes back. OCR advances after three qualifying readings. Building and age-up suggestions remain manual. Review ambiguous notes and conditions before applying the draft. Resource distribution and target time apply to the full step. Each subtask has its own criterion, and practice history records when you first reach the step.

Confirm the last subtask of the final step to celebrate and hide the overlay. Return to a single step to restore the original instruction and criterion. Clones, JSON exports, and full backups include subtasks.

### First launch and diagnostics

**Home** guides you through build selection, HUD detection, and confirmation of the five villager counts. While you calibrate, OCR leaves advancement and practice initiation manual. Return to the game for three valid readings, then press Alt + Tab and confirm within one minute. Retry or adjust the regions if the counts differ. You can use the app with manual advancement. Existing installations keep their configuration and can open the wizard from **Home**.

In **Help**, you can prepare, review, and copy diagnostics. The report includes the version, resolutions, scaling, OCR languages, and last reading. It excludes player names, history, paths, and screenshots. Sharing is manual. Checking for updates in **Help** queries GitHub's public API on demand. Installation is manual.

### Position, backup, and practice

Use the move control in **Settings** to activate a drag bar and place the overlay on any monitor. Confirm to save its position and restore click-through. You can also select a monitor or specify a corner and margins. If you disconnect the current monitor, the overlay moves to an available screen.

**Settings → Backup** exports builds, preferences, and history to JSON. Import validates and previews the backup before replacing your current data. Restoring a backup replaces the library. The app fills in new settings when it reads data saved by a previous version.

**Practice** lets you start the clock at the current step, pause, adjust it in five-second increments, and finish. History stores the first arrival at each step. Clock corrections also apply to the record. The summary compares arrival and target time and preserves the step text and target time if you later edit the build. Page Down at the last step also ends the practice. Selecting another build ends the current session. Switching with the hotkey carries over the population reference and clock to the new session. An unexpected shutdown keeps saved arrivals as an unfinished practice.

Resetting only the clock saves the previous session and starts another at 0:00 from the same step. You can assign this action a hotkey in **Settings**. It is unassigned by default.

### Automatic setup on Windows

Enable automatic setup in **Settings** and return to AoE4. Upgrades leave it off by default to preserve your previous configuration.

- The app detects the AoE4 window area and places the overlay inside it. Calibration and custom positions are stored by monitor, resolution, and DPI.
- It finds the four resource icons and locates the villager column and upper idle-villager counter. It requires five valid numbers and consecutive confirmations. It reads villager counts only.
- It looks for the clock in the top center of the HUD, checks that it advances, and synchronizes practice without changing the current step or recorded arrivals. A lost reading freezes synchronized time. Alt + Tab and isolated zero readings leave the clock state intact.
- For build selection, enter your exact AoE4 player name and choose the mode once. Automatic selection requires a civilization tied to your row in the setup or loading screen. The app uses its default build, or its only build if there is no default. If the match is ambiguous, it keeps the current build. Quick selection remembers the default.
- Manual start, pause, time correction, and finish take priority. Switching back to the game clock waits for a valid reading. Confirming a new match requires repeated setup or loading readings and a progressing game clock near the start.
- Correct detection to open region selectors. Rerun detection to try again without the saved correction. The app replaces a profile only after validating the readings. Full backups include the profiles.

The HUD detector was tested on the included screenshot fixtures and on test images scaled to 80%, 100%, 125%, and 150%. HUD layouts and skins can require manual calibration. Automatic civilization selection depends on your loading-screen layout. Choose a build manually if the app cannot identify your row. AoE4 launch and game settings remain under your control.

### Experimental manual OCR on Windows

OCR is off by default. It reads the four resource villager counters and the idle-villager counter. For example, `10 + 9 + 0 + 0 + 2 = 21`. It advances on total villagers, minimums for selected resources, or transfers between resources. Military units and builders absent from the counters do not contribute. The build's population field is a reference.

With AoE4 in borderless windowed mode, open automatic advancement in **Settings** and select the four resource counters. Choose the monitor and mark the number column alone, with one number centered in each band in food, wood, gold, and stone order. Include gray zeros and leave out icons, stockpiled resources, and idle villagers. Then select the idle-villager counter separately, marking the number next to the villager with a “Z” and leaving space for three digits. Save both regions and enable villager and idle counts. Esc cancels without changing the region. OCR stays off until both regions are set.

Start the clock and return to the game. The status shows the five readings, the total, and the goal. Advancement requires three consecutive readings that satisfy the criterion, with all five counters valid. A missing count invalidates the reading. Building, age-up, and ambiguous instructions remain manual. OCR supports up to 200 assigned and idle villagers combined. It suspends when you leave the game, pause the clock, or edit the position. Windows needs an installed OCR language. Accuracy depends on resolution, HUD scaling, and selected regions. The app reads the visible HUD and leaves game inputs to the player.

### Step advancement criteria

Below each row in the editor, the step advancement control shows the suggested condition and lets you choose manual, total, resource minimums, or transfer. The app checks the visible instruction before showing the next one. Saved and imported builds receive suggestions while retaining their instruction text. Explicit choices carry over when you copy, clone, or back up a build.

- **Total** sums assigned villagers across all four resources and idle villagers. Only the combined villager count matters.
- **Resource minimums** require at least the specified count in each selected resource. For example, `Reach 10 on food` accepts 10 or more food villagers. Other resource counts can exceed their goals. Idle villagers cannot fill a resource minimum.
- **Transfer** compares counts against a stable initial distribution. For `Move 2 from gold to wood`, gold must decrease by at least two and wood must increase by at least two. Lost readings and Alt + Tab preserve the baseline. Changing the step, practice, or criterion resets it. Press Page Down if you already made the transfer before the app obtained a baseline.
- **Manual** covers building, aging up, researching upgrades, and instructions whose goals cannot be reliably inferred. Review suggestions for imported builds, especially when a step combines several instructions.

The overlay explains the pending condition or prompts for Page Down. Confirm the last step manually, including when OCR detects its goal. Counter changes measure net movements. Villager deaths or simultaneous reassignments can produce the same result.

### Completing the build

Page Down on the final step, or the finish-practice command at that step, shows a completion message and confetti for about two seconds before hiding the overlay. The app stays in the tray and keeps practice history. The celebration occurs only when you finish at the last step. Press Ctrl + Alt + H, start a new practice, or switch builds to bring back the overlay. The silent animation respects the Windows reduced-motion preference.

## Verification

Run `npm test` (Node 24 or later), `npm run check`, `npm run build`, and `cargo test --manifest-path src-tauri/Cargo.toml`.

For manual Windows checks, switch between AoE4 and another app and test Page Down and Page Up, reopen the app from the tray, drag the overlay and restart, move it between monitors with different DPI, back up and restore a test library, start the clock from a middle step, and calibrate OCR against the live HUD. The [compatibility matrix](docs/compatibility.md) records the tests performed for 0.3.0 and the cases still pending.

### Publish a release

Run `npm run installer` and `npm run release:package` to generate the installer, corresponding source, GPLv3, starter pack, guide, release notes, and SHA-256 hashes in `release/0.3.1/`. The source archive uses an explicit list of directories and excludes AppData and secrets.

`.github/workflows/release.yml` verifies and builds on Windows. A tag such as `v0.3.1` creates a draft release with the files. Review the attachments before publishing on GitHub. A manual workflow run produces artifacts only.

## Project structure

```text
src/
  lib/
    types.ts        Build, step, and settings data model
    defaults.ts     Initial settings and builds, saved data normalization
    bridge.ts       Tauri persistence, window messages, window controls, and hotkeys
    hotkeys.ts      Hotkey formatting and capture
    steps.ts        Changes between steps
    components/     Overlay panel and compact view, management editor and settings
  routes/
    +page.svelte          Management window
    overlay/+page.svelte  Overlay window
src-tauri/
  tauri.conf.json         Two windows, including the transparent and unfocused overlay
  capabilities/          Frontend permissions
  src/lib.rs              Plugins and app shutdown
```

## License

Copyright (C) 2026 Gonzalo.

AoE4 Overlay is distributed under the **GNU General Public License, version 3 only** (`GPL-3.0-only`). The [LICENSE](LICENSE) file contains the full terms. You may use, modify, and redistribute the program under those terms. The program comes without warranty as stated in the GPLv3.

When distributing the installer, provide the corresponding source for that version, including the files and scripts needed to build it, as required by the GPLv3. You can publish the installer and its matching source archive together in each release. Distributed derivatives must comply with the GPLv3. Private modifications do not require publication.

Third-party dependencies and assets retain their own licenses and notices. This license grants no rights to Age of Empires trademarks or assets.
