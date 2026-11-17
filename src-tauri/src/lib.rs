use tauri::{
    Emitter, Manager, WindowEvent,
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
};
mod desktop;
mod region_selector;
mod worker_ocr;
use std::sync::atomic::{AtomicBool, Ordering};
use tauri_plugin_global_shortcut::GlobalShortcutExt;

#[derive(Default)]
struct ActivationRequest(AtomicBool);

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
            desktop::read_workers,
            region_selector::open_region_selector,
            region_selector::region_selector_geometry,
            region_selector::finish_region_selection,
            take_overlay_activation,
            quit_app
        ])
        .setup(|app| {
            let open = MenuItem::with_id(app, "open", "Abrir AoE4 Overlay", true, None::<&str>)?;
            let edit = MenuItem::with_id(app, "edit", "Mover overlay", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Salir", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&open, &edit, &quit])?;
            TrayIconBuilder::new()
                .icon(app.default_window_icon().expect("app icon").clone())
                .tooltip("AoE4 Overlay — doble clic para abrir")
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
