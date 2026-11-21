# Quick start

1. Download `AoE4 Overlay_<version>_x64-setup.exe` from [GitHub Releases](https://github.com/GonzaMato/aoe4-overlay-BO/releases).
2. Install and open **AoE4 Overlay**. It opens in the language you chose in the installer, or your Windows language (Spanish or English). You can change it in **Settings**.
3. In **Home**, choose a build. Optionally enter your AoE4 name so the app picks your civilization's build on the loading screen. If you leave it blank, the app learns it the first time you choose a build during a match and asks you to confirm.
4. Choose **With hotkeys** (recommended). Open AoE4 in borderless windowed mode. Press **Page Down** for the next step and **Page Up** to go back. **Ctrl + Alt + O** opens the build picker in game.

That's it. Later, if you want villager steps to advance on their own, choose **Turn on automatic advance** in **Home**. Open a match, keep the HUD visible for a few seconds, press **Alt + Tab**, and confirm that all five counts match. Buildings, age-ups, military units, and other actions outside the villager counts still use Page Down. Confirming the last task briefly celebrates completion and hides the overlay.

**Ctrl + Alt + H** toggles the overlay. Choose **Exit app** to close it completely. The window's X hides the management window. Opening the shortcut again brings back the existing instance.

## Troubleshooting

- **Game detection fails.** Return to AoE4 with a match running, the HUD visible, and borderless windowed mode enabled.
- **OCR language missing.** Check your Windows language packs and restart the app.
- **Counts differ.** Indicate that the numbers do not match and adjust the regions with your mouse.
- **The step stays open.** It may need manual confirmation or a valid reading. Villager steps advance without starting the clock.
- **Sharing diagnostics.** Prepare and copy diagnostics from **Help**, review the text, and share it in a [GitHub issue](https://github.com/GonzaMato/aoe4-overlay-BO/issues). Screenshots are optional.

## Builds and updates

The editable starter pack includes two openings per civilization for 1v1 land maps. Calibrated OCR advances the villager goals automatically. Confirm buildings, age-ups, and other manual tasks with your next-step hotkey. On a fresh installation, the first starter opening for each civilization is the default. To add the pack to an existing library, use **Home** or import `starter-pack.en.json` for English or `starter-pack.json` for Spanish. [Starter pack sources](build-pack-sources.md)

To replace your library, open **Home → Keep only the starter pack**. Use **Export backup** to save a copy of your builds, then choose **Confirm replacement**. The app loads the pack in your selected language and keeps your settings and practice history.

Check for updates in **Help** to query GitHub. Download the new installer, export a backup from **Settings → Data**, and exit the app before updating. Downloads and installation are manual.

AoE4 Overlay is unaffiliated with World's Edge. The beta is intended for practice, and competitive use lacks official confirmation. Windows may show a warning because the installer is unsigned.
