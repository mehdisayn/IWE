use portable_pty::{CommandBuilder, MasterPty, NativePtySystem, PtySize, PtySystem};
use serde::Serialize;
use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, State};

pub struct PtySession {
    pub writer: Arc<Mutex<Box<dyn Write + Send>>>,
    pub master: Box<dyn MasterPty + Send>,
}

pub struct PtyManager {
    sessions: Arc<Mutex<HashMap<u32, PtySession>>>,
    next_id: Arc<Mutex<u32>>,
}

impl PtyManager {
    pub fn new() -> Self {
        Self {
            sessions: Arc::new(Mutex::new(HashMap::new())),
            next_id: Arc::new(Mutex::new(1)),
        }
    }
}

#[derive(Serialize, Clone)]
struct PtyOutput {
    id: u32,
    data: Vec<u8>,
}

#[tauri::command]
pub fn spawn_pty(
    app: AppHandle,
    manager: State<'_, PtyManager>,
    cwd: String,
    cols: u16,
    rows: u16,
) -> Result<u32, String> {
    let pty_system = NativePtySystem::default();
    let pair = pty_system
        .openpty(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| e.to_string())?;

    let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/sh".to_string());
    let mut cmd = CommandBuilder::new(shell);
    cmd.cwd(&cwd);

    let mut child = pair.slave.spawn_command(cmd).map_err(|e| e.to_string())?;

    let mut id_guard = manager.next_id.lock().unwrap();
    let id = *id_guard;
    *id_guard += 1;

    let master = pair.master;
    let mut reader = master.try_clone_reader().map_err(|e| e.to_string())?;
    let writer = master.take_writer().map_err(|e| e.to_string())?;

    manager.sessions.lock().unwrap().insert(
        id,
        PtySession {
            writer: Arc::new(Mutex::new(writer)),
            master,
        },
    );

    // Spawn a thread to read output
    std::thread::spawn(move || {
        let mut buf = [0u8; 1024];
        loop {
            match reader.read(&mut buf) {
                Ok(0) => break, // EOF
                Ok(n) => {
                    let data = buf[..n].to_vec();
                    let _ = app.emit("pty-out", PtyOutput { id, data });
                }
                Err(_) => break,
            }
        }
        let _ = child.wait();
        let _ = app.emit("pty-exit", id);
    });

    Ok(id)
}

#[tauri::command]
pub fn write_pty(manager: State<'_, PtyManager>, id: u32, data: String) -> Result<(), String> {
    if let Some(session) = manager.sessions.lock().unwrap().get(&id) {
        let mut writer = session.writer.lock().unwrap();
        let _ = writer.write_all(data.as_bytes());
    }
    Ok(())
}

#[tauri::command]
pub fn resize_pty(manager: State<'_, PtyManager>, id: u32, cols: u16, rows: u16) -> Result<(), String> {
    if let Some(session) = manager.sessions.lock().unwrap().get(&id) {
        let _ = session.master.resize(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        });
    }
    Ok(())
}

#[tauri::command]
pub fn close_pty(manager: State<'_, PtyManager>, id: u32) -> Result<(), String> {
    if let Some(session) = manager.sessions.lock().unwrap().remove(&id) {
        drop(session.master);
    }
    Ok(())
}
