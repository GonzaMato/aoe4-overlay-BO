use crate::desktop::CaptureRegion;
use std::sync::atomic::Ordering;
use tauri::{
    Emitter, Manager, PhysicalPosition, PhysicalSize, WebviewUrl, WebviewWindow,
    WebviewWindowBuilder,
};

const LABEL: &str = "region-selector";

#[derive(Clone, Copy, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Target {
    Workers,
    Idle,
}

#[derive(Clone, serde::Serialize)]
struct Selection {
    region: CaptureRegion,
    target: Target,
}

#[tauri::command]
pub async fn open_region_selector(
    app: tauri::AppHandle,
    window: WebviewWindow,
    monitor_index: usize,
    target: Target,
) -> Result<(), String> {
    if window.label() != "main" {
        return Err("Abrí el selector desde Ajustes.".into());
    }
    if let Some(selector) = app.get_webview_window(LABEL) {
        return selector.set_focus().map_err(|e| e.to_string());
    }
    let monitors = window.available_monitors().map_err(|e| e.to_string())?;
    let monitor = monitors
        .get(monitor_index)
        .ok_or("El monitor ya no está disponible.")?;
    let route = match target {
        Target::Workers => "select-region?target=workers",
        Target::Idle => "select-region?target=idle",
    };
    let title = if app
        .state::<crate::NativeUi>()
        .spanish
        .load(Ordering::Relaxed)
    {
        "Seleccionar región OCR"
    } else {
        "Select OCR region"
    };
    let selector = WebviewWindowBuilder::new(&app, LABEL, WebviewUrl::App(route.into()))
        .title(title)
        .transparent(true)
        .decorations(false)
        .shadow(false)
        .resizable(false)
        .always_on_top(true)
        .skip_taskbar(true)
        .visible(false)
        .focused(false)
        .build()
        .map_err(|e| e.to_string())?;
    let result = (|| -> tauri::Result<()> {
        selector.set_position(PhysicalPosition::new(
            monitor.position().x,
            monitor.position().y,
        ))?;
        selector.set_size(PhysicalSize::new(
            monitor.size().width,
            monitor.size().height,
        ))?;
        window.hide()?;
        selector.show()?;
        selector.set_focus()?;
        app.emit("region-selecting", true)?;
        Ok(())
    })();
    if let Err(error) = result {
        let _ = selector.destroy();
        crate::open_main(&app);
        return Err(error.to_string());
    }
    Ok(())
}

#[tauri::command]
pub fn region_selector_geometry(window: WebviewWindow) -> Result<CaptureRegion, String> {
    if window.label() != LABEL {
        return Err("Ventana incorrecta.".into());
    }
    let position = window.inner_position().map_err(|e| e.to_string())?;
    let size = window.inner_size().map_err(|e| e.to_string())?;
    Ok(CaptureRegion {
        x: position.x,
        y: position.y,
        width: size.width as i32,
        height: size.height as i32,
    })
}

fn valid_region(region: &CaptureRegion, bounds: &CaptureRegion, target: Target) -> bool {
    (10..=1000).contains(&region.width)
        && (match target {
            Target::Workers => 40,
            Target::Idle => 10,
        }..=500)
            .contains(&region.height)
        && region.x >= bounds.x
        && region.y >= bounds.y
        && i64::from(region.x) + i64::from(region.width)
            <= i64::from(bounds.x) + i64::from(bounds.width)
        && i64::from(region.y) + i64::from(region.height)
            <= i64::from(bounds.y) + i64::from(bounds.height)
}

#[tauri::command]
pub fn finish_region_selection(
    app: tauri::AppHandle,
    window: WebviewWindow,
    region: Option<CaptureRegion>,
    target: Target,
) -> Result<(), String> {
    if window.label() != LABEL {
        return Err("Ventana incorrecta.".into());
    }
    if let Some(region) = region {
        let bounds = region_selector_geometry(window.clone())?;
        if !valid_region(&region, &bounds, target) {
            return Err("Seleccioná los números de aldeanos dentro del monitor elegido.".into());
        }
        app.emit_to("main", "ocr-region-selected", Selection { region, target })
            .map_err(|e| e.to_string())?;
    }
    window.destroy().map_err(|e| e.to_string())
}

pub fn closed(app: &tauri::AppHandle) {
    let _ = app.emit("region-selecting", false);
    crate::open_main(app);
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn accepts_negative_monitor_origin_and_rejects_outside_or_empty_region() {
        let bounds = CaptureRegion {
            x: -1920,
            y: 0,
            width: 1920,
            height: 1080,
        };
        assert!(valid_region(
            &CaptureRegion {
                x: -1800,
                y: 100,
                width: 150,
                height: 40
            },
            &bounds,
            Target::Workers
        ));
        assert!(!valid_region(
            &CaptureRegion {
                x: -20,
                y: 100,
                width: 150,
                height: 40
            },
            &bounds,
            Target::Workers
        ));
        assert!(!valid_region(
            &CaptureRegion {
                x: -1800,
                y: 100,
                width: 0,
                height: 40
            },
            &bounds,
            Target::Workers
        ));
    }
}
