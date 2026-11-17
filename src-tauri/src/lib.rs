use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIcon, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager, WindowEvent,
};
mod desktop;
mod region_selector;
mod setup;
mod worker_ocr;
use std::sync::atomic::{AtomicBool, Ordering};
use tauri_plugin_global_shortcut::GlobalShortcutExt;

#[derive(Default)]
struct ActivationRequest(AtomicBool);

#[derive(serde::Deserialize)]
#[serde(rename_all = "lowercase")]
enum Language {
    En,
    Es,
}

const ENGLISH_TRAY: [&str; 4] = [
    "Open AoE4 Overlay",
    "Move overlay",
    "Exit",
    "AoE4 Overlay — double-click to open",
];
const SPANISH_TRAY: [&str; 4] = [
    "Abrir AoE4 Overlay",
    "Mover overlay",
    "Salir",
    "AoE4 Overlay — doble clic para abrir",
];

struct NativeUi {
    tray: TrayIcon,
    open: MenuItem<tauri::Wry>,
    edit: MenuItem<tauri::Wry>,
    quit: MenuItem<tauri::Wry>,
    spanish: AtomicBool,
}

#[tauri::command]
fn set_language(
    window: tauri::Window,
    state: tauri::State<NativeUi>,
    language: Language,
) -> Result<(), String> {
    if window.label() != "main" {
        return Err("Change the language from Settings.".into());
    }
    let spanish = matches!(language, Language::Es);
    let [open, edit, quit, tooltip] = if spanish { SPANISH_TRAY } else { ENGLISH_TRAY };
    state.open.set_text(open).map_err(|e| e.to_string())?;
    state.edit.set_text(edit).map_err(|e| e.to_string())?;
    state.quit.set_text(quit).map_err(|e| e.to_string())?;
    state
        .tray
        .set_tooltip(Some(tooltip))
        .map_err(|e| e.to_string())?;
    state.spanish.store(spanish, Ordering::Relaxed);
    Ok(())
}

#[tauri::command]
fn take_overlay_activation(window: tauri::Window, state: tauri::State<ActivationRequest>) -> bool {
    window.label() == "overlay" && state.0.swap(false, Ordering::SeqCst)
}

fn activate_existing(app: &tauri::AppHandle) {
    if let Some(selector) = app.get_webview_window("region-selector") {
        let _ = selector.set_focus();
        return;
    }
    app.state::<ActivationRequest>()
        .0
        .store(true, Ordering::SeqCst);
    if let Some(overlay) = app.get_webview_window("overlay") {
        let _ = overlay.show();
        let _ = overlay.unminimize();
    }
    if !desktop::game_active() {
        open_main(app);
    }
    let _ = app.emit("reopen-overlay", ());
}

#[tauri::command]
fn quit_app(app: tauri::AppHandle, window: tauri::Window) {
    if window.label() == "main" {
        app.exit(0);
    }
}

fn open_main(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(ActivationRequest::default())
        // Must precede every other plugin: duplicate launches exit before setup.
        .plugin(tauri_plugin_single_instance::init(|app, _, _| {
            activate_existing(app)
        }))
        // Teclas globales: se registran desde el frontend (ventana del overlay).
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        // Guardado de builds y ajustes en un JSON dentro de la carpeta de datos de la app.
        .plugin(tauri_plugin_store::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            desktop::is_game_active,
            desktop::ocr_diagnostic,
            desktop::open_releases,
            desktop::read_workers,
            setup::game_geometry,
            setup::inspect_game,
            region_selector::open_region_selector,
            region_selector::region_selector_geometry,
            region_selector::finish_region_selection,
            set_language,
            take_overlay_activation,
            quit_app
        ])
        .setup(|app| {
            let [open_text, edit_text, quit_text, tooltip] = ENGLISH_TRAY;
            let open = MenuItem::with_id(app, "open", open_text, true, None::<&str>)?;
            let edit = MenuItem::with_id(app, "edit", edit_text, true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", quit_text, true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&open, &edit, &quit])?;
            let tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().expect("app icon").clone())
                .tooltip(tooltip)
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "open" => open_main(app),
                    "edit" => {
                        let _ = app.emit("edit-overlay", ());
                    }
                    "quit" => {
                        let _ = app.emit("quit-request", ());
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if matches!(
                        event,
                        TrayIconEvent::DoubleClick {
                            button: MouseButton::Left,
                            ..
                        } | TrayIconEvent::Click {
                            button: MouseButton::Left,
                            button_state: MouseButtonState::Up,
                            ..
                        }
                    ) {
                        open_main(tray.app_handle());
                    }
                })
                .build(app)?;
            app.manage(NativeUi {
                tray,
                open,
                edit,
                quit,
                spanish: AtomicBool::default(),
            });
            // Native monitoring keeps shortcuts from remaining reserved if a hidden
            // WebView throttles its JavaScript timers while the player alt-tabs.
            let handle = app.handle().clone();
            std::thread::spawn(move || {
                let mut previous = None;
                loop {
                    let active = desktop::game_active();
                    if previous != Some(active) {
                        if !active {
                            let _ = handle.global_shortcut().unregister_all();
                        }
                        let _ = handle.emit("game-focus", active);
                        previous = Some(active);
                    }
                    std::thread::sleep(std::time::Duration::from_millis(80));
                }
            });
            Ok(())
        })
        .on_window_event(|window, event| {
            if window.label() == "region-selector" && matches!(event, WindowEvent::Destroyed) {
                region_selector::closed(window.app_handle());
            }
            if window.label() == "main" {
                if let WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
