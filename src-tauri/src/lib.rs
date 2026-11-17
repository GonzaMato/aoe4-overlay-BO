use tauri::{Manager, WindowEvent};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Teclas globales: se registran desde el frontend (ventana del overlay).
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        // Guardado de builds y ajustes en un JSON dentro de la carpeta de datos de la app.
        .plugin(tauri_plugin_store::Builder::default().build())
        .on_window_event(|window, event| {
            // El overlay no tiene botón de cierre: cerrar la ventana de gestión cierra toda la app.
            if window.label() == "main" {
                if let WindowEvent::CloseRequested { .. } = event {
                    window.app_handle().exit(0);
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
