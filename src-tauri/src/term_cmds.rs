use std::process::Command;

#[tauri::command]
pub fn open_external_terminal(cwd: String) -> Result<(), String> {
    #[cfg(target_os = "linux")]
    {
        let terms = [
            "x-terminal-emulator",
            "gnome-terminal",
            "konsole",
            "alacritty",
            "kitty",
            "xterm",
        ];
        for term in terms.iter() {
            if Command::new(term).current_dir(&cwd).spawn().is_ok() {
                return Ok(());
            }
        }
        return Err("Could not find a terminal emulator to open".to_string());
    }

    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg("-a")
            .arg("Terminal")
            .arg(&cwd)
            .spawn()
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    #[cfg(target_os = "windows")]
    {
        Command::new("cmd")
            .arg("/c")
            .arg("start")
            .arg("cmd")
            .current_dir(&cwd)
            .spawn()
            .map_err(|e| e.to_string())?;
        Ok(())
    }
}
