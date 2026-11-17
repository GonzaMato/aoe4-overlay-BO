# OCR from assigned villagers

User clarified the source: read the four resource-worker counters, sum them, and compare the sum with the next step's worker allocation total, regardless of how the workers are distributed. Do not use the population fraction or resource stockpile amounts.

Select only the four numeric counters in a vertical column with four row guides. Capture once and recognize each row separately, increasing contrast/size for dim zeroes. Reject partial or ambiguous readings. Require three stable totals, focus on AoE4 and running practice clock. Steps with equal/decreasing totals need manual advancement since the sum cannot distinguish them. Existing population calibration must be explicitly replaced.

Validate parsing, targets, stable readings, calibration migration; run native OCR on the user's numeric screenshot crop including gray zeroes; verify selector and app UI, build the release executable. Preserve user builds/settings and avoid stopping a live practice just to replace the executable.

User subsequently requested including inactive villagers. Added a separately selected numeric region for the upper inactive counter because it is not evenly spaced with the resource rows. Five valid readings are required; the sum includes idle workers and still compares against the next build step's four-resource sum. Missing idle calibration disables OCR until completed. Backup validation and persistence include the additional rectangle.

Validation completed: 17 Node tests, Svelte check with zero errors/warnings, six Rust tests including three real Windows OCR fixtures (10/9/0/0, 2/11/3/0, and blue inactive counter 10). Added threshold/spacing fallbacks after the live HUD exposed thin-digit recognition failures. Reviewed the integration without outstanding findings. Native UI smoke test selected and saved the separate inactive rectangle and observed 2 + 8 + 3 + 0 + 13 = 26 in the overlay, with automatic advancement through the sample build. Closed the isolated smoke app and preserved the user's original running session. Production release executable compiled successfully.
