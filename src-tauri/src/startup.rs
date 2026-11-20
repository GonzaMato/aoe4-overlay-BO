pub const BACKGROUND_ARG: &str = "--background";

#[tauri::command]
pub fn startup_enabled(window: tauri::Window) -> Result<Option<bool>, String> {
    if window.label() != "main" {
        return Err("Open startup options from Settings.".into());
    }
    #[cfg(windows)]
    return windows_startup::enabled().map(Some);
    #[cfg(not(windows))]
    Ok(None)
}

#[tauri::command]
pub fn set_startup_enabled(window: tauri::Window, enabled: bool) -> Result<(), String> {
    if window.label() != "main" {
        return Err("Change startup options from Settings.".into());
    }
    #[cfg(windows)]
    return windows_startup::set_enabled(enabled);
    #[cfg(not(windows))]
    {
        let _ = enabled;
        Err("Disponible en Windows.".into())
    }
}

#[cfg(windows)]
mod windows_startup {
    use super::BACKGROUND_ARG;
    use std::{ffi::OsStr, os::windows::ffi::OsStrExt};
    use windows::{
        Win32::{
            Foundation::{ERROR_FILE_NOT_FOUND, ERROR_PATH_NOT_FOUND, ERROR_SUCCESS},
            System::Registry::{
                HKEY_CURRENT_USER, REG_SZ, RRF_RT_REG_SZ, RegDeleteKeyValueW, RegGetValueW,
                RegSetKeyValueW,
            },
        },
        core::w,
    };

    const RUN_KEY: windows::core::PCWSTR = w!("Software\\Microsoft\\Windows\\CurrentVersion\\Run");
    const ENTRY: windows::core::PCWSTR = w!("AoE4 Overlay");

    pub fn enabled() -> Result<bool, String> {
        let mut bytes = 0;
        let result = unsafe {
            RegGetValueW(
                HKEY_CURRENT_USER,
                RUN_KEY,
                ENTRY,
                RRF_RT_REG_SZ,
                None,
                None,
                Some(&mut bytes),
            )
        };
        match result {
            ERROR_SUCCESS => Ok(true),
            ERROR_FILE_NOT_FOUND | ERROR_PATH_NOT_FOUND => Ok(false),
            error => Err(error.to_hresult().message()),
        }
    }

    pub fn set_enabled(enabled: bool) -> Result<(), String> {
        if !enabled {
            let result = unsafe { RegDeleteKeyValueW(HKEY_CURRENT_USER, RUN_KEY, ENTRY) };
            return match result {
                ERROR_SUCCESS | ERROR_FILE_NOT_FOUND | ERROR_PATH_NOT_FOUND => Ok(()),
                error => Err(error.to_hresult().message()),
            };
        }

        let executable = std::env::current_exe().map_err(|e| e.to_string())?;
        let command = run_command(executable.as_os_str())?;
        let result = unsafe {
            RegSetKeyValueW(
                HKEY_CURRENT_USER,
                RUN_KEY,
                ENTRY,
                REG_SZ.0,
                Some(command.as_ptr().cast()),
                (command.len() * size_of::<u16>()) as u32,
            )
        };
        result.ok().map_err(|error| error.to_string())
    }

    fn run_command(executable: &OsStr) -> Result<Vec<u16>, String> {
        let mut command = vec![b'"' as u16];
        command.extend(executable.encode_wide());
        command.extend(format!("\" {BACKGROUND_ARG}").encode_utf16());
        if command.len() > 260 {
            return Err("The executable path is too long for Windows startup.".into());
        }
        command.push(0);
        Ok(command)
    }

    #[cfg(test)]
    mod tests {
        use super::*;

        #[test]
        fn startup_command_quotes_paths_with_spaces_and_preserves_unicode() {
            let command =
                run_command(OsStr::new(r"C:\Juegos\Dragón Dorado\aoe4-overlay.exe")).unwrap();
            assert_eq!(
                String::from_utf16(&command[..command.len() - 1]).unwrap(),
                r#""C:\Juegos\Dragón Dorado\aoe4-overlay.exe" --background"#
            );
            assert_eq!(command.last(), Some(&0));
            assert!(run_command(OsStr::new(&"a".repeat(260))).is_err());
        }
    }
}
