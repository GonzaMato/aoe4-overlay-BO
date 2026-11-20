use std::sync::atomic::{AtomicIsize, Ordering};
use tauri::{Emitter, Manager, PhysicalPosition, PhysicalSize, WebviewUrl, WebviewWindow, WebviewWindowBuilder};

pub const LABEL: &str = "build-picker";
#[derive(Default)]
pub struct PickerState(AtomicIsize);

#[tauri::command]
pub async fn open_build_picker(app: tauri::AppHandle, window: WebviewWindow) -> Result<(), String> {
    if !matches!(window.label(), "main" | "overlay") { return Err("Open the picker from the overlay or Home.".into()); }
    if app.get_webview_window("region-selector").is_some() { return Err("Finish selecting the OCR region first.".into()); }
    if let Some(picker) = app.get_webview_window(LABEL) { return picker.set_focus().map_err(|e|e.to_string()); }
    #[cfg(windows)]
    {
        use windows::Win32::UI::WindowsAndMessaging::GetForegroundWindow;
        app.state::<PickerState>().0.store(unsafe { GetForegroundWindow().0 as isize }, Ordering::SeqCst);
    }
    let monitor = window.current_monitor().map_err(|e|e.to_string())?
        .or(window.primary_monitor().map_err(|e|e.to_string())?).ok_or("No monitor available.")?;
    let scale=monitor.scale_factor();
    let width=(560.0*scale).round().min(monitor.size().width as f64) as u32;
    let height=(650.0*scale).round().min(monitor.size().height as f64) as u32;
    let picker=WebviewWindowBuilder::new(&app,LABEL,WebviewUrl::App("build-picker".into()))
        .title("AoE4 Overlay — Build picker").decorations(false).resizable(false)
        .always_on_top(true).skip_taskbar(true).visible(false).focused(false)
        .build().map_err(|e|e.to_string())?;
    let result=(|| -> tauri::Result<()> {
        picker.set_size(PhysicalSize::new(width,height))?;
        picker.set_position(PhysicalPosition::new(monitor.position().x+((monitor.size().width-width)/2) as i32,monitor.position().y+((monitor.size().height-height)/2) as i32))?;
        app.emit("build-picker-open",true)?;
        picker.show()?;
        picker.set_focus()?;
        Ok(())
    })();
    if let Err(error)=result {let _=picker.destroy();let _=app.emit("build-picker-open",false);return Err(error.to_string());}
    Ok(())
}

#[tauri::command]
pub fn close_build_picker(app:tauri::AppHandle,window:WebviewWindow)->Result<(),String>{
    if window.label()!=LABEL{return Err("Wrong window.".into());}
    // Only return focus if the picker still owns it. Alt+Tab must never pull
    // the player away from the application they intentionally switched to.
    #[cfg(windows)]
    {
        use windows::Win32::{Foundation::HWND,UI::WindowsAndMessaging::{GetForegroundWindow,IsWindow,SetForegroundWindow}};
        if let Ok(hwnd)=window.hwnd(){
            unsafe {
                if GetForegroundWindow().0 as isize==hwnd.0 as isize {
                    let previous=HWND(app.state::<PickerState>().0.swap(0,Ordering::SeqCst) as *mut _);
                    if !previous.is_invalid() && IsWindow(Some(previous)).as_bool(){let _=SetForegroundWindow(previous);}
                }
            }
        }
    }
    window.destroy().map_err(|e|e.to_string())
}

pub fn closed(app:&tauri::AppHandle){
    app.state::<PickerState>().0.store(0,Ordering::SeqCst);
    let _=app.emit("build-picker-open",false);
}
