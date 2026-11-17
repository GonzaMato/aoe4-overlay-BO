#[cfg(windows)]
pub fn recognize_rows(
    pixels: &[u8],
    width: i32,
    height: i32,
    count: usize,
) -> Result<Vec<String>, String> {
    let mut rows = recognize_config(pixels, width, height, count, 70, 3, 2)?;
    // Thin digits (especially 1 and 2) need different spacing/contrast from
    // round digits. Retry only missing rows, preserving their resource index.
    for (threshold, scale, spacing) in [
        (60, 2, 2),
        (60, 4, 10),
        (70, 5, 2),
        (70, 1, 10),
        (70, 1, 20),
    ] {
        if rows.iter().all(|row| !row.is_empty()) {
            break;
        }
        let alternative =
            recognize_config(pixels, width, height, count, threshold, scale, spacing)?;
        for (row, value) in rows.iter_mut().zip(alternative) {
            if row.is_empty() {
                *row = value;
            }
        }
    }
    Ok(rows)
}

#[cfg(windows)]
fn recognize_config(
    pixels: &[u8],
    width: i32,
    height: i32,
    count: usize,
    threshold: u32,
    scale: i32,
    spacing: i32,
) -> Result<Vec<String>, String> {
    use windows::{
        Graphics::Imaging::{BitmapPixelFormat, SoftwareBitmap},
        Media::Ocr::OcrEngine,
        Storage::Streams::DataWriter,
        Win32::System::WinRT::{RO_INIT_MULTITHREADED, RoInitialize, RoUninitialize},
    };
    if ![1, 4].contains(&count)
        || width < 10
        || height < 10 * count as i32
        || pixels.len() != (width as usize * height as usize * 4)
    {
        return Err("Marcá la columna completa de cuatro contadores de aldeanos.".into());
    }
    unsafe { RoInitialize(RO_INIT_MULTITHREADED) }.map_err(|e| e.to_string())?;
    struct Apartment;
    impl Drop for Apartment {
        fn drop(&mut self) {
            unsafe {
                RoUninitialize();
            }
        }
    }
    let _apartment = Apartment;
    let engine = OcrEngine::TryCreateFromUserProfileLanguages().map_err(|_| {
        "Windows necesita un idioma con reconocimiento óptico instalado.".to_string()
    })?;
    let mut rows = vec![String::new(); count];
    for row in 0..count as i32 {
        let top = row * height / count as i32;
        let bottom = (row + 1) * height / count as i32;
        let padding = 12;
        let is_ink = |x: i32, y: i32| {
            let source = ((y * width + x) * 4) as usize;
            let color = &pixels[source..source + 3];
            // Digits are white/gray; the blue idle button is not ink.
            color.iter().max().unwrap() - color.iter().min().unwrap() < 55
                && (u32::from(pixels[source]) * 11
                    + u32::from(pixels[source + 1]) * 59
                    + u32::from(pixels[source + 2]) * 30)
                    / 100
                    >= threshold
        };
        let mut left = width;
        let mut right = -1;
        for y in top..bottom {
            for x in 0..width {
                if is_ink(x, y) {
                    left = left.min(x);
                    right = right.max(x);
                }
            }
        }
        if right < left {
            continue;
        }
        let glyph_width = right - left + 1;
        let gap = spacing * scale;
        let out_width = glyph_width * scale * 3 + gap * 2 + padding * 2;
        let out_height = (bottom - top) * scale + padding * 2;
        let mut prepared = vec![255u8; (out_width * out_height * 4) as usize];
        // White-on-dark HUD text, including inactive gray zeroes, becomes large
        // black-on-white text. Keep each row separate: missing rows must not shift.
        for y in top..bottom {
            for x in left..=right {
                let ink = if is_ink(x, y) { 0 } else { 255 };
                for dy in 0..scale {
                    for dx in 0..scale {
                        for copy in 0..3 {
                            let target = (((padding + (y - top) * scale + dy) * out_width
                                + padding
                                + copy * (glyph_width * scale + gap)
                                + (x - left) * scale
                                + dx)
                                * 4) as usize;
                            prepared[target..target + 3].fill(ink);
                        }
                    }
                }
            }
        }
        let writer = DataWriter::new().map_err(|e| e.to_string())?;
        writer.WriteBytes(&prepared).map_err(|e| e.to_string())?;
        let buffer = writer.DetachBuffer().map_err(|e| e.to_string())?;
        let image = SoftwareBitmap::CreateCopyFromBuffer(
            &buffer,
            BitmapPixelFormat::Bgra8,
            out_width,
            out_height,
        )
        .map_err(|e| e.to_string())?;
        let result = engine
            .RecognizeAsync(&image)
            .map_err(|e| e.to_string())?
            .join()
            .map_err(|e| e.to_string())?;
        let text = result.Text().map_err(|e| e.to_string())?.to_string();
        // Windows can discard isolated single digits as noise. Three adjacent
        // copies form a recognizable word; accept only three identical groups.
        rows[row as usize] = decode_repeated_count(&text).unwrap_or_default();
    }
    Ok(rows)
}

fn decode_repeated_count(text: &str) -> Option<String> {
    // In this numeric-only crop, Windows calls the thin gray zeroes "o".
    // An absent glyph still stays absent; only recognized O/o is normalized.
    let digits: String = text
        .chars()
        .filter(|c| !c.is_whitespace())
        .map(|c| if c == 'O' || c == 'o' { '0' } else { c })
        .collect();
    if digits.is_empty()
        || digits.len() > 9
        || digits.len() % 3 != 0
        || !digits.bytes().all(|c| c.is_ascii_digit())
    {
        return None;
    }
    let size = digits.len() / 3;
    let parts: Vec<_> = digits.as_bytes().chunks_exact(size).collect();
    (parts[0] == parts[1] && parts[1] == parts[2]).then(|| digits[..size].to_string())
}

#[cfg(all(test, windows))]
mod tests {
    #[test]
    fn repeated_counts_require_agreement_and_never_invent_missing_zeroes() {
        assert_eq!(super::decode_repeated_count("10 10 10"), Some("10".into()));
        assert_eq!(super::decode_repeated_count("999"), Some("9".into()));
        assert_eq!(super::decode_repeated_count("oOo"), Some("0".into()));
        for invalid in ["", "99", "909", "10 10", "abc", "13/20", "111111111111"] {
            assert_eq!(super::decode_repeated_count(invalid), None);
        }
    }
    #[test]
    #[ignore = "Requires an installed Windows OCR language; run explicitly on Windows"]
    fn recognizes_real_worker_counters_including_dim_zeroes() {
        let pixels = include_bytes!("../../tests/fixtures/workers-50x212.bgra");
        let rows = super::recognize_rows(pixels, 50, 212, 4).unwrap();
        assert_eq!(rows, ["10", "9", "0", "0"]);
    }
    #[test]
    #[ignore = "Requires an installed Windows OCR language"]
    fn recognizes_live_worker_counters() {
        let pixels = include_bytes!("../../tests/fixtures/workers-live-47x210.bgra");
        assert_eq!(
            super::recognize_rows(pixels, 47, 210, 4).unwrap(),
            ["2", "11", "3", "0"]
        );
    }
    #[test]
    #[ignore = "Requires an installed Windows OCR language"]
    fn recognizes_inactive_counter_on_blue_button() {
        let pixels = include_bytes!("../../tests/fixtures/idle-47x40.bgra");
        assert_eq!(super::recognize_rows(pixels, 47, 40, 1).unwrap(), ["10"]);
    }
}
