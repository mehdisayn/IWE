// App-level persistence: a single JSON file in the OS app-config directory.
// Holds UI settings, the last/recent workspaces, and per-workspace tab state.
// The frontend owns the schema; the backend only reads/writes the blob.

use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

fn config_file(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("config.json"))
}

/// Return the saved config JSON, or an empty string if none exists yet.
#[tauri::command]
pub fn read_config(app: AppHandle) -> Result<String, String> {
    let path = config_file(&app)?;
    match fs::read_to_string(&path) {
        Ok(s) => Ok(s),
        Err(_) => Ok(String::new()),
    }
}

/// Persist the config JSON atomically (write temp, then rename).
#[tauri::command]
pub fn write_config(app: AppHandle, content: String) -> Result<(), String> {
    let path = config_file(&app)?;
    let tmp = path.with_extension("json.tmp");
    fs::write(&tmp, content).map_err(|e| e.to_string())?;
    fs::rename(&tmp, &path).map_err(|e| e.to_string())?;
    Ok(())
}
