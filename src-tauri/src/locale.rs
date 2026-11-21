//! Interface language and the installer. On first launch the app uses the language
//! picked in the installer, then the Windows display language. The WebView's
//! `navigator.languages` does not always follow Windows, so the frontend asks here.
//!
//! The installer preselects its saved choice, and the app keeps that choice equal
//! to its own language. When the player picks a different one while installing,
//! the installer leaves it as a pending language that the app applies once over
//! its saved setting (see `windows/installer-hooks.nsh`).

/// Returns "es" or "en", or `None` when neither source names a supported language.
#[tauri::command]
pub fn initial_language() -> Option<&'static str> {
    #[cfg(windows)]
    return windows_language::detect();
    #[cfg(not(windows))]
    None
}

/// The language picked in the installer when it differs from the app's, once.
#[tauri::command]
pub fn take_installer_language(window: tauri::Window) -> Option<&'static str> {
    if window.label() != "main" {
        return None;
    }
    #[cfg(windows)]
    return windows_language::take_pending();
    #[cfg(not(windows))]
    None
}

/// Saves the app's language as the installer's choice, so the next installer
/// preselects it. Does nothing when the app was not installed.
pub fn remember(spanish: bool) {
    #[cfg(windows)]
    windows_language::save_choice(if spanish { SPANISH_LCID } else { ENGLISH_LCID });
    #[cfg(not(windows))]
    let _ = spanish;
}

/// The language IDs of NSIS's English and Spanish (traditional sort) language files.
const ENGLISH_LCID: u32 = 1033;
const SPANISH_LCID: u32 = 1034;

/// Maps a Windows LCID or LANGID to a supported language by its primary language.
fn language_for(lcid: u32) -> Option<&'static str> {
    match lcid & 0x3ff {
        0x0a => Some("es"),
        0x09 => Some("en"),
        _ => None,
    }
}

/// Parses the decimal LCID that NSIS stores, e.g. "1034".
fn parse_lcid(text: &str) -> Option<u32> {
    text.trim().parse().ok()
}

#[cfg(windows)]
mod windows_language {
    use super::{language_for, parse_lcid};
    use windows::{
        core::{w, PCWSTR},
        Win32::{
            Foundation::ERROR_SUCCESS,
            Globalization::GetUserDefaultUILanguage,
            System::Registry::{
                RegCloseKey, RegDeleteKeyValueW, RegGetValueW, RegOpenKeyExW, RegSetValueExW,
                HKEY, HKEY_CURRENT_USER, KEY_SET_VALUE, REG_SZ, RRF_RT_REG_SZ,
            },
        },
    };

    /// The NSIS installer keeps its install location and language choice here.
    const PRODUCT_KEY: PCWSTR = w!("Software\\AoE4 Overlay\\AoE4 Overlay");
    const CHOICE: PCWSTR = w!("Installer Language");
    const PENDING: PCWSTR = w!("Pending Language");

    pub fn detect() -> Option<&'static str> {
        read_lcid(CHOICE)
            .and_then(language_for)
            .or_else(|| language_for(u32::from(unsafe { GetUserDefaultUILanguage() })))
    }

    pub fn take_pending() -> Option<&'static str> {
        let lcid = read_lcid(PENDING);
        unsafe {
            let _ = RegDeleteKeyValueW(HKEY_CURRENT_USER, PRODUCT_KEY, PENDING);
        }
        lcid.and_then(language_for)
    }

    pub fn save_choice(lcid: u32) {
        if read_lcid(CHOICE) == Some(lcid) {
            return;
        }
        // Open rather than create: a copy that was never installed leaves no trace.
        let mut key = HKEY::default();
        if unsafe { RegOpenKeyExW(HKEY_CURRENT_USER, PRODUCT_KEY, None, KEY_SET_VALUE, &mut key) }
            != ERROR_SUCCESS
        {
            return;
        }
        let text: Vec<u16> = lcid.to_string().encode_utf16().chain([0]).collect();
        let bytes: Vec<u8> = text.iter().flat_map(|unit| unit.to_le_bytes()).collect();
        unsafe {
            let _ = RegSetValueExW(key, CHOICE, None, REG_SZ, Some(&bytes));
            let _ = RegCloseKey(key);
        }
    }

    fn read_lcid(name: PCWSTR) -> Option<u32> {
        let mut buffer = [0u16; 16];
        let mut bytes = (buffer.len() * size_of::<u16>()) as u32;
        let status = unsafe {
            RegGetValueW(
                HKEY_CURRENT_USER,
                PRODUCT_KEY,
                name,
                RRF_RT_REG_SZ,
                None,
                Some(buffer.as_mut_ptr().cast()),
                Some(&mut bytes),
            )
        };
        if status != ERROR_SUCCESS {
            return None;
        }
        let chars = (bytes as usize / size_of::<u16>()).min(buffer.len());
        let text = String::from_utf16_lossy(&buffer[..chars]);
        parse_lcid(text.trim_end_matches('\0'))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn maps_spanish_and_english_variants_by_primary_language() {
        assert_eq!(language_for(SPANISH_LCID), Some("es")); // installer's Spanish
        assert_eq!(language_for(3082), Some("es")); // es-ES, modern sort
        assert_eq!(language_for(0x2c0a), Some("es")); // es-AR
        assert_eq!(language_for(0x080a), Some("es")); // es-MX
        assert_eq!(language_for(ENGLISH_LCID), Some("en")); // en-US
        assert_eq!(language_for(0x0809), Some("en")); // en-GB
        assert_eq!(language_for(1036), None); // fr-FR falls back to the next source
    }

    #[cfg(windows)]
    #[test]
    fn queries_windows_without_failing() {
        let language = windows_language::detect();
        println!("initial language on this machine: {language:?}");
        assert!(matches!(language, None | Some("es") | Some("en")));
    }

    #[test]
    fn reads_the_installer_value_and_ignores_garbage() {
        assert_eq!(parse_lcid("1034"), Some(1034));
        assert_eq!(parse_lcid(" 1033 "), Some(1033));
        assert_eq!(parse_lcid(""), None);
        assert_eq!(parse_lcid("Spanish"), None);
    }
}
