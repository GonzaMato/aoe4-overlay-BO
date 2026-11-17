# Exit button and mouse OCR calibration

Implement the user's requested visible Exit button using the existing save-before-exit path. Replace OCR coordinate inputs with monitor choice and a transparent native selection window. Hide the manager while selecting; draw in any direction, preview, confirm or Escape/cancel. Cancellation preserves the old region. Convert CSS coordinates to physical pixels using actual native window bounds; support negative monitor origins and different DPI. Validate region dimensions in frontend and backend. Restore manager on selector close, suspend OCR while selecting. Keep previous builds/settings intact.

Check geometry tests, Svelte, Rust, production builds and native smoke selection/cancellation/exit using isolated app data.

Validation: 12 Node tests and 2 Rust tests passed; Svelte check reported no errors or warnings. Native smoke test saved a mouse-drawn 200 × 50 region at (500, 800), confirmed Escape preserved it, and closed both app windows using the visible Exit button. The isolated saved data contains the selected region. Real-game OCR recognition and mixed-DPI native selection still need in-game/hardware validation.
