# User guide

Everything AoE4 Overlay can do, in detail. New here? Start with the [quick start](quick-start.md).

## During a match

- Run AoE4 in **borderless windowed mode**. Exclusive fullscreen covers the overlay.
- Clicks pass through the overlay. Use hotkeys to control it.
- Choose a build with the picker (**Ctrl + Alt + O**, also in **Home**) or let the app pick it from your civilization on the loading screen. Filtering the **Builds** list never changes the overlay. **Use in overlay** activates a build; the first build you use for a civilization and mode becomes its default, and later choices never replace a default you set.
- **Exit app** saves your changes and closes both windows. The window's X hides the management window in the tray. The tray icon lets you reopen the app, move the overlay, or exit.
- **Settings → Match → Start AoE4 Overlay with Windows** launches the app in the system tray when you sign in. The overlay appears when AoE4 is in the foreground and hides when you leave or close the game.
- Relaunching the app restores the current overlay, step, and clock. Outside the game it opens the management window and a preview you can hide. Returning to AoE4 restores automatic visibility.
- **Settings** has four tabs: **Match** for game detection and startup, **Overlay** for position and appearance, **Shortcuts** for hotkeys, and **Data** for backups and build options. Changes apply automatically.
- Leaving AoE4 hides the overlay and releases its hotkeys. Edit mode lets you position the overlay outside the game.

## Default hotkeys

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
| Open the build picker | Ctrl + Alt + O |
| Switch build within the same civilization | Unassigned on new installs (set it in **Settings**) |

AoE4 reserves the hotkeys only while it is in the foreground. **Settings** lets you customize them and reports registration failures. The manual clock keeps running when you switch apps, so pause it if you pause the match. The synchronized clock waits for a new game reading.

## Builds

- Each step includes a reference population, an optional target time, an action, a note, and the target villager distribution. The overlay highlights changes from the previous step.
- Clone a build to edit a copy. Copy or import JSON to back up or share individual builds.
- You can paste JSON from **AoE4 Guides → Overlay Tool**. Import converts times, resources, and notes, represents icons as text, and leaves unknown population (`-1`) blank. Review the mode and population after importing.
- With the build active, select a step number in the editor to show that step in the overlay.
- A fresh install includes 50 attributed openings for 1v1 land maps, two per civilization. After OCR calibration, villager goals advance automatically. **Home** adds missing starter builds in the selected language. For manual import, use `static/builds/starter-pack.en.json` for English or `static/builds/starter-pack.json` for Spanish. [Starter pack sources and review limits](build-pack-sources.md)

## Subtasks for mixed instructions

Use the editor's subtask tool to draft separate tasks from the action and note. Review their order, edit the text and advancement criteria, then apply the subtasks. Existing builds change only when you apply edits. For example, split `Build a house + send 3 villagers to wood` into a manual `Build a house` task and a `Send 3 villagers to wood` task with a minimum based on the step's final wood allocation.

The overlay shows the current subtask and its position in the step. Page Down confirms a manual subtask and Page Up goes back. OCR advances after three qualifying readings. Building and age-up suggestions remain manual. Review ambiguous notes and conditions before applying the draft. Resource distribution and target time apply to the full step. Each subtask has its own criterion, and practice history records when you first reach the step.

Confirm the last subtask of the final step to celebrate and hide the overlay. Return to a single step to restore the original instruction and criterion. Clones, JSON exports, and full backups include subtasks.

## First launch and diagnostics

**Home** asks for a build and, optionally, your AoE4 name, then how to advance. **With hotkeys** is the recommended path: Page Down and Page Up move through steps, and when a Windows OCR language is installed the app still reads the loading screen to pick your build and syncs the clock with the match. **Automatic from villagers** (beta) adds HUD detection and confirmation of the five villager counts. While you calibrate, OCR leaves advancement and practice initiation manual. Return to the game for three valid readings, then press Alt + Tab and confirm within one minute. Retry or adjust the regions if the counts differ. Hotkey users can turn on automatic advance later from **Home** or **Settings → Match**. Existing installations keep their configuration and can open the wizard from **Home**.

In **Help**, you can prepare, review, and copy diagnostics. The report includes the version, resolutions, scaling, OCR languages, and last reading. It excludes player names, history, paths, and screenshots. Sharing is manual. Checking for updates in **Help** queries GitHub's public API on demand. Installation is manual.

## Position, backup, and practice

Use the move control in **Settings** to activate a drag bar and place the overlay on any monitor. Confirm to save its position and restore click-through. You can also select a monitor or specify a corner and margins. If you disconnect the current monitor, the overlay moves to an available screen.

**Settings → Data** exports builds, preferences, and history to JSON. Import validates and previews the backup before replacing your current data. Restoring a backup replaces the library. The app fills in new settings when it reads data saved by a previous version.

**Practice** lets you start the clock at the current step, pause, adjust it in five-second increments, and finish. History stores the first arrival at each step. Clock corrections also apply to the record. The summary compares arrival and target time and preserves the step text and target time if you later edit the build. Page Down at the last step also ends the practice. Selecting another build ends the current session. Switching with the hotkey carries over the population reference and clock to the new session. An unexpected shutdown keeps saved arrivals as an unfinished practice.

Resetting only the clock saves the previous session and starts another at 0:00 from the same step. You can assign this action a hotkey in **Settings**. It is unassigned by default.

## Automatic setup on Windows

**Settings → Match** has two switches. **Read the game screen** detects your civilization, picks its build, and syncs the clock. **Advance from villager counters** (beta) also advances resource steps and asks you to confirm the counters once in **Home**. Data saved by earlier versions keeps its previous behavior.

- The app detects the AoE4 window area and places the overlay inside it. Calibration and custom positions are stored by monitor, resolution, and DPI.
- It finds the four resource icons and locates the villager column and upper idle-villager counter. It requires five valid numbers and consecutive confirmations. It reads villager counts only.
- It looks for the clock in the top center of the HUD, checks that it advances, and synchronizes practice without changing the current step or recorded arrivals. A lost reading freezes synchronized time. Alt + Tab and isolated zero readings leave the clock state intact.
- For build selection, the app needs your AoE4 player name to find your row on the loading screen, where every player and civilization appears. Enter it in **Home** or **Settings → Match**, tap it in the list of names seen on the last loading screen, or leave it blank: after you choose a build during a match, the app looks for the only player with that civilization and asks whether that name is yours. Matching ignores clan tags such as `[TAG]` and tolerates one misread character in names of five or more characters, but never a longer or shorter name. Loading-screen names stay in memory and are never saved or included in diagnostics. Automatic selection uses the default build for the civilization and mode, or its only build if there is no default. If the match is ambiguous, it keeps the current build.
- Manual start, pause, time correction, and finish take priority. Switching back to the game clock waits for a valid reading. Confirming a new match requires repeated setup or loading readings and a progressing game clock near the start.
- Correct detection to open region selectors. Rerun detection to try again without the saved correction. The app replaces a profile only after validating the readings. Full backups include the profiles.

The HUD detector was tested on the included screenshot fixtures and on test images scaled to 80%, 100%, 125%, and 150%. HUD layouts and skins can require manual calibration. Automatic civilization selection depends on your loading-screen layout. Choose a build manually if the app cannot identify your row. AoE4 launch and game settings remain under your control.

## Experimental manual OCR on Windows

OCR is off by default. It reads the four resource villager counters and the idle-villager counter. For example, `10 + 9 + 0 + 0 + 2 = 21`. It advances on total villagers, minimums for selected resources, or transfers between resources. Military units and builders absent from the counters do not contribute. The build's population field is a reference.

With AoE4 in borderless windowed mode, open **Settings → Match**, turn off **Read the game screen**, and expand **Counter calibration**. Choose the monitor and mark the number column alone, with one number centered in each band in food, wood, gold, and stone order. Include gray zeros and leave out icons, stockpiled resources, and idle villagers. Then select the idle-villager counter separately, marking the number next to the villager with a “Z” and leaving space for three digits. Save both regions and enable **Advance automatically on villager counts**. Esc cancels without changing the region. OCR stays off until both regions are set.

Return to the game. Starting the clock is optional: villager goals advance as soon as the counters are read, and the clock only records practice timing. The status shows the five readings, the total, and the goal. Advancement requires three consecutive readings that satisfy the criterion, with all five counters valid. A missing count invalidates the reading. Building, age-up, and ambiguous instructions remain manual. OCR supports up to 200 assigned and idle villagers combined. It suspends when you leave the game or edit the position. Windows needs an installed OCR language. Accuracy depends on resolution, HUD scaling, and selected regions. The app reads the visible HUD and leaves game inputs to the player.

## Step advancement criteria

Below each row in the editor, the step advancement control shows the suggested condition and lets you choose manual, total, resource minimums, or transfer. The app checks the visible instruction before showing the next one. Saved and imported builds receive suggestions while retaining their instruction text. Explicit choices carry over when you copy, clone, or back up a build.

- **Total** sums assigned villagers across all four resources and idle villagers. Only the combined villager count matters.
- **Resource minimums** require at least the specified count in each selected resource. For example, `Reach 10 on food` accepts 10 or more food villagers. Other resource counts can exceed their goals. Idle villagers cannot fill a resource minimum.
- **Transfer** compares counts against a stable initial distribution. For `Move 2 from gold to wood`, gold must decrease by at least two and wood must increase by at least two. Lost readings and Alt + Tab preserve the baseline. Changing the step, practice, or criterion resets it. Press Page Down if you already made the transfer before the app obtained a baseline.
- **Manual** covers building, aging up, researching upgrades, and instructions whose goals cannot be reliably inferred. Review suggestions for imported builds, especially when a step combines several instructions.

The overlay explains the pending condition or prompts for Page Down. Confirm the last step manually, including when OCR detects its goal. Counter changes measure net movements. Villager deaths or simultaneous reassignments can produce the same result.

## Completing the build

Page Down on the final step, or the finish-practice command at that step, shows a completion message and confetti for about two seconds before hiding the overlay. The app stays in the tray and keeps practice history. The celebration occurs only when you finish at the last step. Press Ctrl + Alt + H, start a new practice, or switch builds to bring back the overlay. The silent animation respects the Windows reduced-motion preference.
