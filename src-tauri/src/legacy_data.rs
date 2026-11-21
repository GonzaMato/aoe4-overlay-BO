//! One-time move of user data saved under the identifier used up to 0.3.6
//! (`com.gonzalo.aoe4-overlay`) to the current identifier's folders.
use std::{
    fs, io,
    path::{Path, PathBuf},
};
use tauri::{
    plugin::{Builder, TauriPlugin},
    Manager, Runtime,
};

const LEGACY_IDENTIFIER: &str = "com.gonzalo.aoe4-overlay";
const STORE_FILE: &str = "aoe4-overlay.json";

/// Runs before any window loads, so the store plugin always finds the moved file.
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("legacy-data")
        .setup(|app, _| {
            let path = app.path();
            if let Ok(current) = path.app_data_dir() {
                if let Err(error) = move_store(&sibling(&current), &current) {
                    eprintln!("Could not move data from {LEGACY_IDENTIFIER}: {error}");
                }
            }
            // Only the WebView cache lives here; the new folder rebuilds it.
            if let Ok(current) = path.app_local_data_dir() {
                let _ = fs::remove_dir_all(sibling(&current));
            }
            Ok(())
        })
        .build()
}

fn sibling(current: &Path) -> PathBuf {
    current.with_file_name(LEGACY_IDENTIFIER)
}

/// Moves the saved store into `current` unless it already has one.
/// Returns whether a file was moved.
fn move_store(legacy: &Path, current: &Path) -> io::Result<bool> {
    let source = legacy.join(STORE_FILE);
    let target = current.join(STORE_FILE);
    if target.exists() || !source.is_file() {
        return Ok(false);
    }
    fs::create_dir_all(current)?;
    if fs::rename(&source, &target).is_err() {
        // Different volume or locked file: copy under a temporary name so a
        // crash never leaves a truncated store behind.
        let partial = current.join(format!("{STORE_FILE}.moving"));
        fs::copy(&source, &partial)?;
        fs::rename(&partial, &target)?;
        let _ = fs::remove_file(&source);
    }
    let _ = fs::remove_dir(legacy); // Succeeds only when nothing else is left.
    Ok(true)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn sandbox(name: &str) -> PathBuf {
        let nanos = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos();
        let root = std::env::temp_dir().join(format!("aoe4-legacy-{name}-{nanos}"));
        fs::create_dir_all(&root).unwrap();
        root
    }

    #[test]
    fn moves_the_store_and_removes_the_empty_legacy_folder() {
        let root = sandbox("move");
        let (legacy, current) = (root.join(LEGACY_IDENTIFIER), root.join("app.aoe4overlay"));
        fs::create_dir_all(&legacy).unwrap();
        fs::write(legacy.join(STORE_FILE), "{\"builds\":[]}").unwrap();

        assert!(move_store(&legacy, &current).unwrap());
        assert_eq!(fs::read_to_string(current.join(STORE_FILE)).unwrap(), "{\"builds\":[]}");
        assert!(!legacy.exists());
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn never_overwrites_data_in_the_current_folder() {
        let root = sandbox("keep");
        let (legacy, current) = (root.join(LEGACY_IDENTIFIER), root.join("app.aoe4overlay"));
        fs::create_dir_all(&legacy).unwrap();
        fs::create_dir_all(&current).unwrap();
        fs::write(legacy.join(STORE_FILE), "old").unwrap();
        fs::write(current.join(STORE_FILE), "new").unwrap();

        assert!(!move_store(&legacy, &current).unwrap());
        assert_eq!(fs::read_to_string(current.join(STORE_FILE)).unwrap(), "new");
        assert_eq!(fs::read_to_string(legacy.join(STORE_FILE)).unwrap(), "old");
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn does_nothing_on_a_fresh_install() {
        let root = sandbox("fresh");
        let current = root.join("app.aoe4overlay");
        assert!(!move_store(&root.join(LEGACY_IDENTIFIER), &current).unwrap());
        assert!(!current.exists());
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn keeps_other_files_in_the_legacy_folder() {
        let root = sandbox("other");
        let (legacy, current) = (root.join(LEGACY_IDENTIFIER), root.join("app.aoe4overlay"));
        fs::create_dir_all(&legacy).unwrap();
        fs::write(legacy.join(STORE_FILE), "{}").unwrap();
        fs::write(legacy.join("notes.txt"), "keep").unwrap();

        assert!(move_store(&legacy, &current).unwrap());
        assert!(legacy.join("notes.txt").exists());
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn legacy_folder_sits_next_to_the_current_one() {
        let current = Path::new("C:/Users/player/AppData/Roaming/app.aoe4overlay");
        assert_eq!(sibling(current), Path::new("C:/Users/player/AppData/Roaming/com.gonzalo.aoe4-overlay"));
    }
}
