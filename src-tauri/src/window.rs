//! Crea la ventana principal con argumentos de WebView2 que reducen memoria.
//!
//! Medido en el build release (2026-11-15, reposo): base 183 MB privados,
//! `LEAN_ARGS` ~179 MB, `LEAN_ARGS` + `--disable-gpu` ~103 MB. Sin GPU el zoom
//! con pizarras grandes pierde fluidez, por eso es opcional ("ahorro de memoria").

use std::fs;
use tauri::{App, Manager, WebviewWindowBuilder};

/// Los tres primeros `disable-features` son los que Tauri pone por defecto.
const LEAN_ARGS: &str = "--disable-features=msWebOOUI,msPdfOOUI,msSmartScreenProtection,Translate,\
OptimizationHints,MediaRouter,AutofillServerCommunication,SpareRendererForSitePerProcess,\
CalculateNativeWinOcclusion --disable-background-networking --disable-component-update \
--disable-sync --disable-default-apps --disable-extensions --renderer-process-limit=1 \
--disable-gpu-shader-disk-cache";

const LOW_MEMORY_FILE: &str = "low-memory";

/// true si el usuario activó el ahorro de memoria (se aplica al reiniciar).
pub fn low_memory_enabled(app: &tauri::AppHandle) -> bool {
    app.path()
        .app_data_dir()
        .map(|dir| dir.join(LOW_MEMORY_FILE).exists())
        .unwrap_or(false)
}

pub fn create_main_window(app: &App) -> tauri::Result<()> {
    let config = app
        .config()
        .app
        .windows
        .iter()
        .find(|w| w.label == "main")
        .cloned()
        .expect("falta la ventana main en tauri.conf.json");
    let mut args = LEAN_ARGS.to_string();
    if low_memory_enabled(app.handle()) {
        args.push_str(" --disable-gpu");
    }
    WebviewWindowBuilder::from_config(app.handle(), &config)?
        .additional_browser_args(&args)
        .build()?;
    Ok(())
}

#[tauri::command]
pub fn get_low_memory(app: tauri::AppHandle) -> bool {
    low_memory_enabled(&app)
}

#[tauri::command]
pub fn set_low_memory(app: tauri::AppHandle, enabled: bool) -> Result<(), String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let flag = dir.join(LOW_MEMORY_FILE);
    if enabled {
        fs::write(flag, b"1").map_err(|e| e.to_string())
    } else if flag.exists() {
        fs::remove_file(flag).map_err(|e| e.to_string())
    } else {
        Ok(())
    }
}
