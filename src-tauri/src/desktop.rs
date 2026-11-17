#[cfg(windows)]
pub fn game_active() -> bool {
    use windows::{
        Win32::{
            Foundation::CloseHandle,
            System::Threading::{
                OpenProcess, PROCESS_NAME_WIN32, PROCESS_QUERY_LIMITED_INFORMATION,
                QueryFullProcessImageNameW,
            },
            UI::WindowsAndMessaging::{GetForegroundWindow, GetWindowThreadProcessId},
        },
        core::PWSTR,
    };
    unsafe {
        let hwnd = GetForegroundWindow();
        if hwnd.is_invalid() {
            return false;
        }
        let mut pid = 0;
        GetWindowThreadProcessId(hwnd, Some(&mut pid));
        let Ok(handle) = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid) else {
            return false;
        };
        let mut path = [0u16; 32768];
        let mut len = path.len() as u32;
        let result = QueryFullProcessImageNameW(
            handle,
            PROCESS_NAME_WIN32,
            PWSTR(path.as_mut_ptr()),
            &mut len,
        );
        let _ = CloseHandle(handle);
        result.is_ok() && is_game_executable(&String::from_utf16_lossy(&path[..len as usize]))
    }
}
#[cfg(not(windows))]
pub fn game_active() -> bool {
    false
}

fn is_game_executable(path: &str) -> bool {
    matches!(
        path.rsplit(['\\', '/'])
            .next()
            .unwrap_or("")
            .to_ascii_lowercase()
            .as_str(),
        "reliccardinal.exe" | "cardinal.exe"
    )
}
#[tauri::command]
pub fn is_game_active() -> bool {
    game_active()
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OcrDiagnostic {
    available: bool,
    languages: Vec<String>,
    game_active: bool,
}

#[tauri::command]
pub async fn ocr_diagnostic() -> Result<OcrDiagnostic, String> {
    tauri::async_runtime::spawn_blocking(ocr_diagnostic_inner).await.map_err(|e| e.to_string())?
}

#[cfg(windows)]
fn ocr_diagnostic_inner() -> Result<OcrDiagnostic, String> {
    use windows::{Media::Ocr::OcrEngine, Win32::System::WinRT::{RoInitialize, RoUninitialize, RO_INIT_MULTITHREADED}};
    unsafe { RoInitialize(RO_INIT_MULTITHREADED) }.map_err(|e| e.to_string())?;
    struct Apartment;
    impl Drop for Apartment { fn drop(&mut self) { unsafe { RoUninitialize(); } } }
    let _apartment = Apartment;
    let available = OcrEngine::TryCreateFromUserProfileLanguages().is_ok();
    let mut languages = Vec::new();
    if let Ok(list) = OcrEngine::AvailableRecognizerLanguages() {
        for language in list { if let Ok(tag) = language.LanguageTag() { languages.push(tag.to_string()); } }
    }
    Ok(OcrDiagnostic { available, languages, game_active: game_active() })
}
#[cfg(not(windows))]
fn ocr_diagnostic_inner() -> Result<OcrDiagnostic, String> {
    Ok(OcrDiagnostic { available: false, languages: vec![], game_active: false })
}

/// Fixed destination: the frontend cannot launch arbitrary URLs or programs.
#[tauri::command]
pub fn open_releases() -> Result<(), String> {
    #[cfg(windows)] {
        use std::os::windows::process::CommandExt;
        std::process::Command::new("explorer.exe")
            .arg("https://github.com/GonzaMato/aoe4-overlay-BO/releases")
            .creation_flags(0x08000000).spawn().map_err(|e| e.to_string())?;
        Ok(())
    }
    #[cfg(not(windows))] { Err("Disponible en Windows.".into()) }
}

#[derive(Clone, Debug, PartialEq, serde::Deserialize, serde::Serialize)]
pub struct CaptureRegion {
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
}

#[tauri::command]
pub async fn read_workers(
    region: CaptureRegion,
    idle_region: CaptureRegion,
) -> Result<Vec<String>, String> {
    if !(10..=1000).contains(&region.width) || !(40..=500).contains(&region.height) {
        return Err("Región inválida: ancho 10–1000 px, alto 40–500 px.".into());
    }
    if !(10..=1000).contains(&idle_region.width) || !(10..=500).contains(&idle_region.height) {
        return Err("Seleccioná el contador de aldeanos inactivos.".into());
    }
    if !game_active() {
        return Err("Poné AoE4 en primer plano para leer los aldeanos.".into());
    }
    tauri::async_runtime::spawn_blocking(move || {
        let mut rows = recognize(region, 4)?;
        rows.extend(recognize(idle_region, 1)?);
        Ok(rows)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[cfg(not(windows))]
fn recognize(_: CaptureRegion, _: usize) -> Result<Vec<String>, String> {
    Err("OCR disponible solo en Windows.".into())
}

#[cfg(windows)]
fn recognize(region: CaptureRegion, count: usize) -> Result<Vec<String>, String> {
    crate::worker_ocr::recognize_rows(&capture(&region)?, region.width, region.height, count)
}

#[cfg(windows)]
pub fn capture(region: &CaptureRegion) -> Result<Vec<u8>, String> {
    use windows::Win32::Graphics::Gdi::*;
    unsafe {
        let screen = GetDC(None);
        if screen.is_invalid() {
            return Err("No se pudo capturar la pantalla.".into());
        }
        let dc = CreateCompatibleDC(Some(screen));
        let bitmap = CreateCompatibleBitmap(screen, region.width, region.height);
        // Always release GDI resources, including errors from capture and conversion.
        let result = (|| -> Result<Vec<u8>, String> {
            if dc.is_invalid() || bitmap.is_invalid() {
                return Err("No se pudo crear la captura.".into());
            }
            let previous = SelectObject(dc, bitmap.into());
            let copied = BitBlt(
                dc,
                0,
                0,
                region.width,
                region.height,
                Some(screen),
                region.x,
                region.y,
                SRCCOPY,
            );
            SelectObject(dc, previous);
            copied.map_err(|e| e.to_string())?;
            let mut info = BITMAPINFO::default();
            info.bmiHeader.biSize = std::mem::size_of::<BITMAPINFOHEADER>() as u32;
            info.bmiHeader.biWidth = region.width;
            info.bmiHeader.biHeight = -region.height;
            info.bmiHeader.biPlanes = 1;
            info.bmiHeader.biBitCount = 32;
            let mut pixels = vec![0u8; (region.width * region.height * 4) as usize];
            if GetDIBits(
                dc,
                bitmap,
                0,
                region.height as u32,
                Some(pixels.as_mut_ptr().cast()),
                &mut info,
                DIB_RGB_COLORS,
            ) != region.height
            {
                return Err("Captura incompleta.".into());
            }
            for pixel in pixels.chunks_exact_mut(4) {
                pixel[3] = 255;
            }
            Ok(pixels)
        })();
        let _ = DeleteObject(bitmap.into());
        let _ = DeleteDC(dc);
        ReleaseDC(None, screen);
        result
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn matches_game_process_not_window_title() {
        assert!(is_game_executable(r"C:\Games\AoE4\RelicCardinal.exe"));
        assert!(is_game_executable("CARDINAL.EXE"));
        assert!(!is_game_executable("aoe4-overlay.exe"));
        assert!(!is_game_executable("RelicCardinal.exe.txt"));
    }
}
