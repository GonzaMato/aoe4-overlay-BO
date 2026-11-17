# Worker OCR fixture

`workers-50x212.bgra` contains the numeric column cropped from the user's supplied AoE4 HUD image on 2026-11-17. Top-down BGRA8, 50 × 212 pixels, opaque alpha. Four rows: food 10, wood 9, gold 0, stone 0. The last two zeroes are dimmed by the game.

`workers-live-47x210.bgra` contains only the numeric column from the live UI smoke test: 47 × 210 BGRA8 pixels, food 2, wood 11, gold 3, stone 0. It reproduces the thin-digit recognition failure found during that test.

`idle-47x40.bgra` is the separately cropped inactive-villager count from the same captured HUD: 47 × 40 BGRA8 pixels, value 10 on its blue button.

Run the native recognition regressions on Windows with an OCR language installed:
`cargo test --manifest-path src-tauri/Cargo.toml worker_ocr -- --include-ignored`
