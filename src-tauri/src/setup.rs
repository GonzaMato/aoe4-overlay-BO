use crate::desktop::CaptureRegion as Rect;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct GameGeometry {
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
    pub monitor: String,
    pub dpi: u32,
}
#[derive(Serialize)]
pub struct OcrLine {
    pub text: String,
    #[serde(rename = "playerText", skip_serializing_if = "Option::is_none")]
    player_text: Option<String>,
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
}
#[derive(Deserialize)]
pub struct Hint {
    pub workers: Rect,
    pub idle: Rect,
    #[serde(default)]
    pub clock: Option<Rect>,
    #[serde(default)]
    pub manual: bool,
}
#[derive(Serialize)]
pub struct Inspection {
    geometry: GameGeometry,
    workers: Option<Rect>,
    idle: Option<Rect>,
    rows: Vec<String>,
    lines: Vec<OcrLine>,
    hud: bool,
}

#[tauri::command]
pub fn game_geometry() -> Option<GameGeometry> {
    #[cfg(windows)]
    unsafe {
        use windows::Win32::{
            Foundation::{POINT, RECT},
            Graphics::Gdi::*,
            UI::{HiDpi::GetDpiForWindow, WindowsAndMessaging::*},
        };
        if !crate::desktop::game_active() {
            return None;
        }
        let hwnd = GetForegroundWindow();
        let mut rect = RECT::default();
        GetClientRect(hwnd, &mut rect).ok()?;
        let mut origin = POINT::default();
        ClientToScreen(hwnd, &mut origin).ok().ok()?;
        let (width, height) = (rect.right - rect.left, rect.bottom - rect.top);
        if width < 320
            || height < 200
            || width > 8192
            || height > 8192
            || i64::from(width) * i64::from(height) > 33_554_432
        {
            return None;
        }
        let mut monitor = MONITORINFOEXW::default();
        monitor.monitorInfo.cbSize = std::mem::size_of::<MONITORINFOEXW>() as u32;
        GetMonitorInfoW(
            MonitorFromWindow(hwnd, MONITOR_DEFAULTTONEAREST),
            &mut monitor.monitorInfo,
        )
        .ok()
        .ok()?;
        let name = String::from_utf16_lossy(
            &monitor.szDevice[..monitor.szDevice.iter().position(|c| *c == 0).unwrap_or(32)],
        );
        Some(GameGeometry {
            x: origin.x,
            y: origin.y,
            width,
            height,
            monitor: name,
            dpi: GetDpiForWindow(hwnd),
        })
    }
    #[cfg(not(windows))]
    {
        None
    }
}

fn inside(r: &Rect, w: i32, h: i32) -> bool {
    r.x >= 0
        && r.y >= 0
        && r.width >= 10
        && r.height >= 10
        && r.width <= 1000
        && r.height <= 500
        && i64::from(r.x) + i64::from(r.width) <= i64::from(w)
        && i64::from(r.y) + i64::from(r.height) <= i64::from(h)
}
pub fn crop(pixels: &[u8], w: i32, h: i32, r: &Rect) -> Result<Vec<u8>, String> {
    if r.x < 0
        || r.y < 0
        || r.width <= 0
        || r.height <= 0
        || i64::from(r.x) + i64::from(r.width) > i64::from(w)
        || i64::from(r.y) + i64::from(r.height) > i64::from(h)
        || pixels.len() != w as usize * h as usize * 4
    {
        return Err("Región fuera de la ventana del juego.".into());
    }
    let mut out = Vec::with_capacity(r.width as usize * r.height as usize * 4);
    for y in r.y..r.y + r.height {
        let start = ((y * w + r.x) * 4) as usize;
        out.extend_from_slice(&pixels[start..start + r.width as usize * 4]);
    }
    Ok(out)
}

/// Four differently colored resource anchors at a consistent pitch; never a column of numbers.
fn detect_hud(pixels: &[u8], w: i32, h: i32) -> Option<(Rect, Rect)> {
    let atlas = include_bytes!("../assets/resource-icons.bgra");
    let mut samples = Vec::new();
    for row in 0..4 {
        for y in (2..30).step_by(3) {
            for x in (2..30).step_by(3) {
                let i = ((row * 32 + y) * 32 + x) * 4;
                let (b, g, r) = (atlas[i], atlas[i + 1], atlas[i + 2]);
                if r.max(g).max(b) > 150 && (row == 3 || r.max(g).max(b) - r.min(g).min(b) > 55) {
                    samples.push((x as f32, (row * 52 + y) as f32, [b, g, r], row));
                }
            }
        }
    }
    let score = |x: i32, y: i32, s: f32, food_only: bool| -> f32 {
        let mut error = 0_f32;
        let mut count = 0;
        for &(dx, dy, color, row) in &samples {
            if food_only && row != 0 {
                continue;
            }
            let px = x + (dx * s).round() as i32;
            let py = y + (dy * s).round() as i32;
            if px < 0 || py < 0 || px >= w || py >= h {
                return f32::MAX;
            }
            let i = ((py * w + px) * 4) as usize;
            error += (0..3)
                .map(|c| (i32::from(pixels[i + c]) - i32::from(color[c])).unsigned_abs() as f32)
                .sum::<f32>()
                / 3.0;
            count += 1;
        }
        error / count.max(1) as f32
    };
    let mut best: Option<(f32, i32, i32, f32)> = None;
    let mut candidates = Vec::new();
    for n in 13..=40 {
        let scale = n as f32 / 20.0;
        let end_y = h - (188.0 * scale).ceil() as i32;
        // HUD stays at the left/bottom; the size, row spacing and position are searched.
        for y in ((h / 3).max(0)..=end_y).step_by(2) {
            for x in (0..(w / 4).clamp(48, 128)).step_by(2) {
                if score(x, y, scale, true) > 45.0 {
                    continue;
                }
                let value = score(x, y, scale, false);
                if value < 45.0 {
                    candidates.push((value, x, y, scale));
                    if best.is_none_or(|b| value < b.0) {
                        best = Some((value, x, y, scale));
                    }
                }
            }
        }
    }
    let (mut value, mut x, mut y, mut scale) = best?;
    // Subpixel-scale and single-pixel translation refinement for crisp small glyphs.
    let seed = (x, y, scale);
    for ds in -2..=2 {
        for dy in -2..=2 {
            for dx in -2..=2 {
                let s = seed.2 + ds as f32 * 0.01;
                let v = score(seed.0 + dx, seed.1 + dy, s, false);
                if v < value {
                    value = v;
                    x = seed.0 + dx;
                    y = seed.1 + dy;
                    scale = s;
                }
            }
        }
    }
    if value >= 30.0 {
        return None;
    }
    if candidates
        .iter()
        .any(|c| c.0 < value + 4.0 && ((c.1 - x).abs() > 20 || (c.2 - y).abs() > 20))
    {
        return None;
    }
    let rect = |dx: f32, dy: f32, width: f32, height: f32| Rect {
        x: x + (dx * scale).round() as i32,
        y: y + (dy * scale).round() as i32,
        width: (width * scale).round() as i32,
        height: (height * scale).round() as i32,
    };
    let workers = rect(174.0, -11.0, 48.0, 208.0);
    let idle = rect(174.0, -81.0, 48.0, 40.0);
    (inside(&workers, w, h) && inside(&idle, w, h)).then_some((workers, idle))
}

#[tauri::command]
pub async fn inspect_game(
    expected: GameGeometry,
    hint: Option<Hint>,
    exclude: Option<Rect>,
) -> Result<Inspection, String> {
    #[cfg(windows)]
    {
        tauri::async_runtime::spawn_blocking(move || {
            if game_geometry().as_ref() != Some(&expected) {
                return Err("La ventana del juego cambió.".into());
            }
            let g = &expected;
            let mut pixels = crate::desktop::capture(&Rect {
                x: g.x,
                y: g.y,
                width: g.width,
                height: g.height,
            })?;
            if let Some(r) = exclude {
                // The topmost overlay is part of the screen capture; erase it before any OCR.
                for y in (r.y - g.y).max(0)
                    ..(i64::from(r.y) + i64::from(r.height) - i64::from(g.y))
                        .clamp(0, i64::from(g.height)) as i32
                {
                    for x in (r.x - g.x).max(0)
                        ..(i64::from(r.x) + i64::from(r.width) - i64::from(g.x))
                            .clamp(0, i64::from(g.width)) as i32
                    {
                        let i = ((y * g.width + x) * 4) as usize;
                        pixels[i..i + 3].fill(0);
                    }
                }
            }
            let detected = detect_hud(&pixels, g.width, g.height);
            let hud = detected.is_some();
            let clock_hint = hint.as_ref().and_then(|h| h.clock.clone()).filter(|r| {
                inside(r, g.width, g.height)
                    && r.x >= g.width * 40 / 100
                    && r.x + r.width <= g.width * 60 / 100
                    && r.y + r.height <= g.height * 24 / 100
            });
            let regions = detected.map(|auto| {
                hint.filter(|h| {
                    h.manual
                        && inside(&h.workers, g.width, g.height)
                        && h.workers.height >= 40
                        && inside(&h.idle, g.width, g.height)
                        && (h.workers.x - auto.0.x).abs() < 30
                        && (h.workers.y - auto.0.y).abs() < 30
                        && (h.workers.height - auto.0.height).abs() < 30
                        && (h.idle.x - auto.1.x).abs() < 30
                        && (h.idle.y - auto.1.y).abs() < 30
                })
                .map(|h| (h.workers, h.idle))
                .unwrap_or(auto)
            });
            let mut rows = Vec::new();
            if let Some((workers, idle)) = &regions {
                rows = crate::worker_ocr::recognize_rows(
                    &crop(&pixels, g.width, g.height, workers)?,
                    workers.width,
                    workers.height,
                    4,
                )?;
                rows.extend(crate::worker_ocr::recognize_rows(
                    &crop(&pixels, g.width, g.height, idle)?,
                    idle.width,
                    idle.height,
                    1,
                )?);
            }
            let text_rect = if hud {
                Rect {
                    x: g.width * 40 / 100,
                    y: 0,
                    width: g.width * 20 / 100,
                    height: g.height * 24 / 100,
                }
            } else {
                Rect {
                    x: 0,
                    y: 0,
                    width: g.width,
                    height: g.height,
                }
            };
            let text_pixels = crop(&pixels, g.width, g.height, &text_rect)?;
            let cached_lines = if hud {
                clock_hint
                    .and_then(|r| {
                        recognize_clock(
                            &crop(&pixels, g.width, g.height, &r).ok()?,
                            r.width,
                            r.height,
                            r.x,
                            r.y,
                        )
                        .ok()
                    })
                    .unwrap_or_default()
            } else {
                Vec::new()
            };
            let lines = if cached_lines.iter().any(|l| l.text.contains(':')) {
                cached_lines
            } else if hud {
                recognize_clock(
                    &text_pixels,
                    text_rect.width,
                    text_rect.height,
                    text_rect.x,
                    text_rect.y,
                )?
            } else {
                recognize_text(
                    &text_pixels,
                    text_rect.width,
                    text_rect.height,
                    text_rect.x,
                    text_rect.y,
                )?
            };
            if game_geometry().as_ref() != Some(&expected) {
                return Err("La ventana del juego cambió durante la lectura.".into());
            }
            Ok(Inspection {
                geometry: expected,
                workers: regions.as_ref().map(|r| r.0.clone()),
                idle: regions.map(|r| r.1),
                rows,
                lines,
                hud,
            })
        })
        .await
        .map_err(|e| e.to_string())?
    }
    #[cfg(not(windows))]
    {
        let _ = (expected, hint, exclude);
        Err("Disponible en Windows.".into())
    }
}

#[cfg(windows)]
fn clock_text(text: &str) -> bool {
    let parts: Vec<_> = text.split(':').collect();
    (parts.len() == 2 || parts.len() == 3)
        && parts
            .iter()
            .all(|p| !p.is_empty() && p.chars().all(|c| c.is_ascii_digit()))
        && parts
            .last()
            .is_some_and(|p| p.len() == 2 && p.parse::<u32>().is_ok_and(|n| n < 60))
}

#[cfg(windows)]
fn recognize_clock(
    pixels: &[u8],
    w: i32,
    h: i32,
    ox: i32,
    oy: i32,
) -> Result<Vec<OcrLine>, String> {
    // Small cached crops retain the antialiased colon better without thresholding.
    if w <= 200 && h <= 100 {
        let raw = recognize_text(pixels, w, h, ox, oy)?;
        if raw.iter().any(|l| clock_text(&l.text)) {
            return Ok(raw);
        }
    }
    let mut prepared = pixels.to_vec();
    for p in prepared.chunks_exact_mut(4) {
        let color = &p[..3];
        let ink = *color.iter().min().unwrap() > 150
            && color.iter().max().unwrap() - color.iter().min().unwrap() < 55;
        p[..3].fill(if ink { 0 } else { 255 });
    }
    let lines = recognize_text(&prepared, w, h, ox, oy)?;
    let mut refined = Vec::new();
    for line in &lines {
        if line.height < 8
            || line.height > 60
            || !line
                .text
                .chars()
                .all(|c| c.is_ascii_digit() || ":•·.".contains(c) || c.is_whitespace())
        {
            continue;
        }
        let x = (line.x - ox - 8).max(0);
        let y = (line.y - oy - 8).max(0);
        let rect = Rect {
            x,
            y,
            width: (line.width.max(line.height * 7) + 16).min(w - x),
            height: (line.height + 16).min(h - y),
        };
        // Landscape around the clock can make Windows OCR discard the seconds.
        // Re-read the candidate as a text strip, preserving its physical bounds.
        let raw = recognize_text(
            &crop(pixels, w, h, &rect)?,
            rect.width,
            rect.height,
            ox + x,
            oy + y,
        )?;
        if raw.iter().any(|l| clock_text(&l.text)) {
            refined.extend(raw);
            continue;
        }
        refined.extend(recognize_text(
            &crop(&prepared, w, h, &rect)?,
            rect.width,
            rect.height,
            ox + x,
            oy + y,
        )?);
    }
    for line in &mut refined {
        // The two dots of the HUD colon are sometimes classified as a bullet
        // followed by a period. Do not turn arbitrary decimal points into times.
        line.text = line
            .text
            .replace("•.", ":")
            .replace("·.", ":")
            .replace(' ', "");
    }
    refined.dedup_by(|a, b| a.text == b.text && (a.x - b.x).abs() < 5 && (a.y - b.y).abs() < 5);
    Ok(refined)
}

#[cfg(windows)]
fn ocr_ink_colors(pixels: &[u8], stride: usize, bounds: &Rect) -> (usize, usize) {
    let mut colored = 0;
    let mut neutral = 0;
    for y in bounds.y.max(0) as usize
        ..((bounds.y + bounds.height).max(0) as usize).min(pixels.len() / (stride * 4))
    {
        for x in bounds.x.max(0) as usize..((bounds.x + bounds.width).max(0) as usize).min(stride) {
            let offset = (y * stride + x) * 4;
            let [blue, green, red] = [pixels[offset], pixels[offset + 1], pixels[offset + 2]];
            let brightest = blue.max(green).max(red);
            let darkest = blue.min(green).min(red);
            if brightest < 135 {
                continue;
            }
            if brightest - darkest > 50 {
                colored += 1;
            } else if brightest - darkest < 32 {
                neutral += 1;
            }
        }
    }
    (colored, neutral)
}

#[cfg(windows)]
fn without_player_badge(words: &[(String, Rect)], pixels: &[u8], stride: usize) -> Option<String> {
    let ((badge, icon), prefix) = words.split_last()?;
    let (_, name) = prefix.last()?;
    if badge.chars().count() > 2 || icon.x - (name.x + name.width) < name.height / 3 {
        return None;
    }
    // The game draws the name in the player's color and the platform icon in white.
    // Windows OCR can read the icon as a separate letter or digit on the same line.
    let (name_color, name_neutral) = ocr_ink_colors(pixels, stride, name);
    let (icon_color, icon_neutral) = ocr_ink_colors(pixels, stride, icon);
    if name_color < 4
        || name_color <= name_neutral
        || icon_neutral < 4
        || icon_neutral <= icon_color
    {
        return None;
    }
    Some(
        prefix
            .iter()
            .map(|(text, _)| text.as_str())
            .collect::<Vec<_>>()
            .join(" "),
    )
}

#[cfg(windows)]
fn recognize_text(pixels: &[u8], w: i32, h: i32, ox: i32, oy: i32) -> Result<Vec<OcrLine>, String> {
    use windows::{
        Graphics::Imaging::{BitmapPixelFormat, SoftwareBitmap},
        Media::Ocr::OcrEngine,
        Storage::Streams::DataWriter,
        Win32::System::WinRT::{RO_INIT_MULTITHREADED, RoInitialize, RoUninitialize},
    };
    unsafe { RoInitialize(RO_INIT_MULTITHREADED) }.map_err(|e| e.to_string())?;
    struct Apartment;
    impl Drop for Apartment {
        fn drop(&mut self) {
            unsafe { RoUninitialize() }
        }
    }
    let _apt = Apartment;
    let engine = OcrEngine::TryCreateFromUserProfileLanguages().map_err(|e| e.to_string())?;
    let ratio = (1920.0 / w.max(h) as f32).min(2.0);
    let (nw, nh) = (
        (w as f32 * ratio).round() as i32,
        (h as f32 * ratio).round() as i32,
    );
    let mut scaled = vec![255; (nw * nh * 4) as usize];
    for y in 0..nh {
        for x in 0..nw {
            let src = (((y as f32 / ratio) as i32 * w + (x as f32 / ratio) as i32) * 4) as usize;
            let dst = ((y * nw + x) * 4) as usize;
            scaled[dst..dst + 4].copy_from_slice(&pixels[src..src + 4]);
        }
    }
    let writer = DataWriter::new().map_err(|e| e.to_string())?;
    writer.WriteBytes(&scaled).map_err(|e| e.to_string())?;
    let image = SoftwareBitmap::CreateCopyFromBuffer(
        &writer.DetachBuffer().map_err(|e| e.to_string())?,
        BitmapPixelFormat::Bgra8,
        nw,
        nh,
    )
    .map_err(|e| e.to_string())?;
    let result = engine
        .RecognizeAsync(&image)
        .map_err(|e| e.to_string())?
        .join()
        .map_err(|e| e.to_string())?;
    let mut lines = Vec::new();
    for line in result.Lines().map_err(|e| e.to_string())? {
        let (mut x, mut y, mut right, mut bottom) = (f32::MAX, f32::MAX, 0_f32, 0_f32);
        let text = line.Text().map_err(|e| e.to_string())?.to_string();
        let mut tokens = text.split_whitespace();
        let maybe_badge = tokens
            .next_back()
            .is_some_and(|word| word.chars().count() <= 2)
            && tokens.next().is_some();
        let mut words = Vec::new();
        for word in line.Words().map_err(|e| e.to_string())? {
            let b = word.BoundingRect().map_err(|e| e.to_string())?;
            if maybe_badge {
                words.push((
                    word.Text().map_err(|e| e.to_string())?.to_string(),
                    Rect {
                        x: b.X as i32,
                        y: b.Y as i32,
                        width: b.Width.ceil() as i32,
                        height: b.Height.ceil() as i32,
                    },
                ));
            }
            x = x.min(b.X);
            y = y.min(b.Y);
            right = right.max(b.X + b.Width);
            bottom = bottom.max(b.Y + b.Height);
        }
        if x.is_finite() && right > x {
            lines.push(OcrLine {
                text,
                player_text: without_player_badge(&words, &scaled, nw as usize),
                x: ox + (x / ratio).floor() as i32,
                y: oy + (y / ratio).floor() as i32,
                width: ((right - x) / ratio).ceil() as i32,
                height: ((bottom - y) / ratio).ceil() as i32,
            });
        }
    }
    Ok(lines)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[cfg(windows)]
    #[test]
    fn ignores_a_white_platform_badge_but_keeps_digits_in_the_player_color() {
        let name_bounds = Rect {
            x: 1,
            y: 0,
            width: 20,
            height: 10,
        };
        let badge_bounds = Rect {
            x: 26,
            y: 2,
            width: 8,
            height: 8,
        };
        let words = [
            ("TestPlayer".to_string(), name_bounds),
            ("6".to_string(), badge_bounds),
        ];
        let mut pixels = Vec::new();
        for _ in 0..10 {
            for x in 0..36 {
                pixels.extend(if x < 26 {
                    [200, 80, 150, 255]
                } else {
                    [240, 240, 240, 255]
                });
            }
        }
        assert_eq!(
            without_player_badge(&words, &pixels, 36).as_deref(),
            Some("TestPlayer")
        );
        for pixel in pixels.chunks_exact_mut(4) {
            pixel.copy_from_slice(&[200, 80, 150, 255]);
        }
        assert_eq!(without_player_badge(&words, &pixels, 36), None);
    }

    #[test]
    #[ignore = "Requires installed Windows OCR"]
    fn recognizes_late_game_clock() {
        let pixels = include_bytes!("../../tests/fixtures/clock-late-512x345.bgra");
        let lines = recognize_clock(pixels, 512, 345, 1024, 0).unwrap();

        assert!(lines.iter().any(|l| l.text == "15:21"));
    }
    #[test]
    #[ignore = "Requires installed Windows OCR"]
    fn recognizes_live_setup_counters_and_clock() {
        let panel = include_bytes!("../../tests/fixtures/hud-live-260x310.bgra");
        let (workers, idle) = detect_hud(panel, 260, 310).unwrap();
        let rows = crate::worker_ocr::recognize_rows(
            &crop(panel, 260, 310, &workers).unwrap(),
            workers.width,
            workers.height,
            4,
        )
        .unwrap();
        let idle_rows = crate::worker_ocr::recognize_rows(
            &crop(panel, 260, 310, &idle).unwrap(),
            idle.width,
            idle.height,
            1,
        )
        .unwrap();
        let lines = recognize_clock(
            include_bytes!("../../tests/fixtures/clock-live-512x345.bgra"),
            512,
            345,
            1024,
            0,
        )
        .unwrap();
        assert_eq!(rows, ["4", "6", "2", "0"]);
        assert_eq!(idle_rows, ["1"]);
        assert!(lines.iter().any(|l| l.text == "05:16"));
        let rect = Rect {
            x: 219,
            y: 138,
            width: 72,
            height: 30,
        };
        let cached = recognize_clock(
            &crop(
                include_bytes!("../../tests/fixtures/clock-live-512x345.bgra"),
                512,
                345,
                &rect,
            )
            .unwrap(),
            72,
            30,
            1243,
            138,
        )
        .unwrap();
        assert!(cached.iter().any(|l| l.text == "05:16"));
    }
    #[test]
    fn finds_resource_icons_at_different_origins_and_scales_not_population() {
        let panel = include_bytes!("../../tests/fixtures/hud-260x310.bgra");
        for scale in [0.8_f32, 1.0, 1.25, 1.5] {
            let (w, h) = (1280, 900);
            let mut image = vec![0_u8; w * h * 4];
            let (ox, oy) = (20, 900 - (310.0 * scale).round() as usize);
            for y in 0..(310.0 * scale).round() as usize {
                for x in 0..(260.0 * scale).round() as usize {
                    let src = (((y as f32 / scale).floor() as usize).min(309) * 260
                        + (x as f32 / scale).floor() as usize)
                        * 4;
                    let dst = ((y + oy) * w + x + ox) * 4;
                    image[dst..dst + 4].copy_from_slice(&panel[src..src + 4]);
                }
            }
            let found = detect_hud(&image, w as i32, h as i32).expect("real resource panel");
            assert!((found.0.x - (ox as f32 + 190.0 * scale).round() as i32).abs() <= 4);
            assert!((found.0.y - (oy as f32 + 93.0 * scale).round() as i32).abs() <= 4);
        }
        assert!(detect_hud(&vec![0; 1280 * 900 * 4], 1280, 900).is_none());
        let mut missing = panel.to_vec();
        missing[208 * 260 * 4..].fill(0);
        assert!(detect_hud(&missing, 260, 310).is_none());
    }
    #[test]
    #[ignore = "Requires installed Windows OCR"]
    fn reads_detected_five_counters_from_real_hud() {
        let panel = include_bytes!("../../tests/fixtures/hud-260x310.bgra");
        let (workers, idle) = detect_hud(panel, 260, 310).unwrap();
        assert_eq!(
            crate::worker_ocr::recognize_rows(
                &crop(panel, 260, 310, &workers).unwrap(),
                workers.width,
                workers.height,
                4
            )
            .unwrap(),
            ["5", "0", "0", "0"]
        );
        assert_eq!(
            crate::worker_ocr::recognize_rows(
                &crop(panel, 260, 310, &idle).unwrap(),
                idle.width,
                idle.height,
                1
            )
            .unwrap(),
            ["2"]
        );
    }
    #[test]
    #[ignore = "Requires installed Windows OCR"]
    fn recognizes_real_game_clock_with_physical_bounds() {
        let pixels = include_bytes!("../../tests/fixtures/clock-508x341.bgra");
        let lines = recognize_clock(pixels, 508, 341, 1014, 0).unwrap();
        let clock = lines
            .iter()
            .find(|l| l.text == "01:02")
            .expect("visible clock");
        assert!(clock.x > 1200 && clock.x < 1320 && clock.y > 130 && clock.y < 170);
    }
}
