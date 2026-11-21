//! First-launch interface language: the language picked in the installer,
//! then the Windows display language. The WebView's `navigator.languages`
//! does not always follow Windows, so the frontend asks here first.

/// Returns "es" or "en", or `None` when neither source names a supported language.
#[tauri::command]
pub fn initial_language() -> Option<&'static str> {
    #[cfg(windows)]
    return windows_language::detect();
    #[cfg(not(windows))]
    None
}

/// Maps a Windows LCID or LANGID to a supported language by its primary language.
fn language_for(lcid: u32) -> Option<&'static str> {
    match lcid & 0x3ff {
        0x0a => Some("es"),
        0x09 => Some("en"),
        _ => None,
    }
}

/// Parses the decimal LCID that NSIS stores, e.g. "3082".
fn parse_lcid(text: &str) -> Option<u32> {
    text.trim().parse().ok()
}

#[cfg(windows)]
mod windows_language {
    use super::{language_for, parse_lcid};
    use windows::{
        core::w,
        Win32::{
            Foundation::ERROR_SUCCESS,
            Globalization::GetUserDefaultUILanguage,
            System::Registry::{RegGetValueW, HKEY_CURRENT_USER, RRF_RT_REG_SZ},
        },
    };

    pub fn detect() -> Option<&'static str> {
        installer_choice()
            .and_then(language_for)
            .or_else(|| language_for(u32::from(unsafe { GetUserDefaultUILanguage() })))
    }

    /// The NSIS language selector saves its choice under the publisher and product key.
    fn installer_choice() -> Option<u32> {
        let mut buffer = [0u16; 16];
        let mut bytes = (buffer.len() * size_of::<u16>()) as u32;
        let status = unsafe {
            RegGetValueW(
                HKEY_CURRENT_USER,
                w!("Software\\AoE4 Overlay\\AoE4 Overlay"),
                w!("Installer Language"),
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
        assert_eq!(language_for(3082), Some("es")); // es-ES, installer's Spanish
        assert_eq!(language_for(0x2c0a), Some("es")); // es-AR
        assert_eq!(language_for(0x080a), Some("es")); // es-MX
        assert_eq!(language_for(1033), Some("en")); // en-US
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
        assert_eq!(parse_lcid("3082"), Some(3082));
        assert_eq!(parse_lcid(" 1033 "), Some(1033));
        assert_eq!(parse_lcid(""), None);
        assert_eq!(parse_lcid("Spanish"), None);
    }
}
