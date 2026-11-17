# Beta 0.3.0 compatibility matrix

A compiled build or a scaled screenshot alone leaves real-world compatibility unverified.

| Environment | Evidence | Status |
| --- | --- | --- |
| In-game counters for food, wood, gold, stone, and idle villagers | Automated tests with Windows OCR fixtures | Verified in screenshots |
| Game clock at the start and later in a match | Windows OCR fixtures | Verified in screenshots |
| Detector at 80%, 100%, 125%, and 150% | Synthetically scaled images | Verified with test images |
| Clean Windows install without Node or Rust | Requires a beta VM or PC | Pending |
| Steam, 1920×1080, 100% | Requires a live match | Pending |
| Steam, 2560×1440, 100% and 125% | Requires a live match with this version | Pending |
| Xbox/Game Pass, 1920×1080 | Requires an installation and live match | Pending |
| Steam/Xbox, 3840×2160, 150% and 200% | Requires a real display and match | Pending |
| Two monitors with mixed DPI and a negative origin | Coordinate test completed, live test pending | Partial |
| Upgrade from 0.2.0 to 0.3.0 on the developer's Windows PC | Installer ran, preserved three builds and history, and produced a 28-build library | Verified |
| Diagnostics and GitHub update check in the installed app | en-US OCR available, 2560×1440 and 1920×1080 monitors at 100%, GitHub returned no releases | Verified |
| Single-instance launch after updating | Reopening keeps one management window and one overlay | Verified |
| 25 starter builds | Openings adapted from sources with conservative advancement criteria | Full playthroughs pending |

## 0.3.1 verification

On the same Windows installation, the 0.3.0 → 0.3.1 update succeeded. Both UI languages and live setup-status translation were checked in the installed app; English was left selected. All 28 existing builds, previous settings and practice history were preserved, and the 25 English builds were added separately. Browser preview also retained Spanish after reload. Automated checks passed: 59 JavaScript tests, 11 native tests including Windows OCR fixtures, and Svelte checks with no errors or warnings. The NSIS language dialog and other hardware/store combinations have not been manually tested.

## Beta test procedure

1. Record the app version, Windows version, store (Steam or Xbox), resolution, display scaling, and monitor count.
2. Install for a user with no existing builds. Check Home and OCR availability.
3. Choose a build and enter a practice match. Compare all five counts, including zeros and idle villagers.
4. Confirm the counts. Check one villager task and one manual building task, then pause and resume the clock.
5. Press Alt + Tab. Confirm that the overlay hides and Page Down and Page Up work in other apps.
6. Move the overlay to the second monitor. Change resolution and DPI, then recalibrate if needed.
7. Export a backup, choose **Exit app**, reinstall, and check that your data is preserved.
8. Finish the build and check that the celebration appears and the overlay hides. Open the app twice and verify that it runs as one instance.
9. Review and attach diagnostics. Screenshots are optional. Leave out personal data you do not need to share.

Record the date, observed result, and steps to reproduce. Update pending entries only after testing the stated combination. Run matches or change the user's monitor configuration only when needed for the test.
