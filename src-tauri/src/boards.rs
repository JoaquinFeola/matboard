//! Almacenamiento local de pizarras en la carpeta de datos de la app.
//!
//! Cada pizarra son dos archivos: `<id>.json` (contenido) y `<id>.meta.json`
//! (metadatos para listar sin leer el contenido).

use base64::{engine::general_purpose::STANDARD, Engine};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

type CmdResult<T> = Result<T, String>;

fn boards_dir(app: &AppHandle) -> CmdResult<PathBuf> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("boards");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

/// Solo letras, números, `-` y `_`: impide salir de la carpeta.
fn validate_id(id: &str) -> CmdResult<()> {
    let ok = !id.is_empty()
        && id.len() <= 64
        && id.chars().all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_');
    if ok {
        Ok(())
    } else {
        Err(format!("id de pizarra inválido: {id}"))
    }
}

/// Escribe a un temporal y renombra, para no dejar archivos a medias.
fn write_atomic(path: &Path, contents: &[u8]) -> CmdResult<()> {
    let tmp = path.with_extension("tmp");
    fs::write(&tmp, contents).map_err(|e| e.to_string())?;
    fs::rename(&tmp, path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_boards(app: AppHandle) -> CmdResult<Vec<String>> {
    let dir = boards_dir(&app)?;
    let mut metas = Vec::new();
    for entry in fs::read_dir(dir).map_err(|e| e.to_string())? {
        let path = entry.map_err(|e| e.to_string())?.path();
        let is_meta = path
            .file_name()
            .and_then(|n| n.to_str())
            .is_some_and(|n| n.ends_with(".meta.json"));
        if is_meta {
            if let Ok(text) = fs::read_to_string(&path) {
                metas.push(text);
            }
        }
    }
    Ok(metas)
}

#[tauri::command]
pub fn load_board(app: AppHandle, id: String) -> CmdResult<String> {
    validate_id(&id)?;
    fs::read_to_string(boards_dir(&app)?.join(format!("{id}.json"))).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_board(app: AppHandle, id: String, meta: String, data: String) -> CmdResult<()> {
    validate_id(&id)?;
    let dir = boards_dir(&app)?;
    write_atomic(&dir.join(format!("{id}.json")), data.as_bytes())?;
    write_atomic(&dir.join(format!("{id}.meta.json")), meta.as_bytes())
}

#[tauri::command]
pub fn delete_board(app: AppHandle, id: String) -> CmdResult<()> {
    validate_id(&id)?;
    let dir = boards_dir(&app)?;
    for name in [format!("{id}.json"), format!("{id}.meta.json")] {
        let path = dir.join(name);
        if path.exists() {
            fs::remove_file(path).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

/// Guarda un archivo exportado en la ruta que eligió el usuario en el diálogo.
/// `base64` contiene los bytes (PNG) o el texto (SVG) codificados.
#[tauri::command]
pub fn save_export(path: String, base64: String) -> CmdResult<()> {
    let allowed = Path::new(&path)
        .extension()
        .and_then(|e| e.to_str())
        .is_some_and(|e| matches!(e.to_ascii_lowercase().as_str(), "png" | "svg"));
    if !allowed {
        return Err("solo se pueden exportar archivos .png o .svg".into());
    }
    let bytes = STANDARD.decode(base64).map_err(|e| e.to_string())?;
    fs::write(path, bytes).map_err(|e| e.to_string())
}
