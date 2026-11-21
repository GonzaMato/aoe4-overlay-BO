# Development

AoE4 Overlay is built with Tauri 2 (Rust) and SvelteKit (Svelte 5 and TypeScript).

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

`iniciar.bat` opens the installed app; `iniciar.bat rebuild` and `iniciar.bat dev` use the project.

Run `npm run installer` to build the installer. It appears in `src-tauri/target/release/bundle/nsis/`. The app keeps the same identity across versions.

### Preview the interface without Rust

Run `npm run dev` and open `http://localhost:1420` for the management window and `http://localhost:1420/overlay` for the overlay in separate tabs. This preview stores data in the browser and only handles keys while the overlay tab has focus. Use it for design work.

## Verification

Run `npm test` (Node 24 or later), `npm run check`, `npm run build`, and `cargo test --manifest-path src-tauri/Cargo.toml`.

For manual Windows checks, switch between AoE4 and another app and test Page Down and Page Up, reopen the app from the tray, drag the overlay and restart, move it between monitors with different DPI, back up and restore a test library, start the clock from a middle step, and calibrate OCR against the live HUD. The [compatibility matrix](compatibility.md) records the tests performed for 0.3.0 and the cases still pending.

### Publish a release

Run `npm run installer` and `npm run release:package` to put `AoE4-Overlay-<version>-setup.exe` and its `SHA256SUMS.txt` in `release/<version>/`. That is all a release ships: the installer already bundles `LICENSE` and `THIRD-PARTY-NOTICES.txt`, and the **Source code** archives GitHub attaches to every tag are the corresponding source required by the GPLv3. Release notes come from `docs/releases/<version>.md`.

`.github/workflows/release.yml` verifies and builds on Windows. A tag such as `v0.3.8` creates a draft release with the files. Review the attachments before publishing on GitHub. A manual workflow run produces artifacts only.

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
