# Quick start

1. Download `AoE4 Overlay_<version>_x64-setup.exe` from [GitHub Releases](https://github.com/GonzaMato/aoe4-overlay-BO/releases).
2. Install and open **AoE4 Overlay**. In **Home**, choose a build for your civilization. The app defaults to English. You can switch to Spanish in **Settings**.
3. Continue with detection and open a practice match in borderless windowed mode.
4. Keep the HUD visible for a few seconds. The overlay shows food, wood, gold, stone, and idle villagers. Press **Alt + Tab**, compare all five counts, and confirm that they match.
5. Return to the game. If the clock cannot sync with the game clock, press **Ctrl + Alt + S**. Press **Page Down** to confirm a manual task and **Page Up** to go back. Villager goals use OCR.

Buildings, age-ups, military units, and other actions outside the villager counts require manual confirmation. Confirming the last task briefly celebrates completion and hides the overlay.

**Ctrl + Alt + H** toggles the overlay. Choose **Exit app** to close it completely. The window's X hides the management window. Opening the shortcut again brings back the existing instance.

## Troubleshooting

- **Game detection fails.** Return to AoE4 with a match running, the HUD visible, and borderless windowed mode enabled.
- **OCR language missing.** Check your Windows language packs and restart the app.
- **Counts differ.** Indicate that the numbers do not match and adjust the regions with your mouse.
- **The step stays open.** It may need manual confirmation, a valid reading, or a running clock.
- **Sharing diagnostics.** Prepare and copy diagnostics from **Help**, review the text, and share it in a [GitHub issue](https://github.com/GonzaMato/aoe4-overlay-BO/issues). Screenshots are optional.

## Builds and updates

The editable starter pack includes one opening per civilization, with source attribution and reviewed instructions. Strategy can vary by patch. In existing installations, add missing starter builds in the selected language from **Home** without replacing your builds. For manual import, use `starter-pack.en.json` for English or `starter-pack.json` for Spanish. Both files contain build data only.

Check for updates in **Help** to query GitHub. Download the new installer, export a backup from **Settings → Backup**, and exit the app before updating. Downloads and installation are manual.

AoE4 Overlay is unaffiliated with World's Edge. The beta is intended for practice, and competitive use lacks official confirmation. Windows may show a warning because the installer is unsigned.
