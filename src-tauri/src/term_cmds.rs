// A pragmatic integrated terminal: each entered command runs once via the
// user's shell in the workspace cwd and returns combined output. This covers
// the "run any CLI tool" use case (git, ls, AI CLIs in one-shot mode). It is
// not a PTY, so fully interactive programs (vim, top) are out of scope for v1.

use serde::Serialize;
use std::path::PathBuf;
use std::process::Command;

#[derive(Debug, Serialize, Clone)]
pub struct CommandOutput {
    pub stdout: String,
    pub stderr: String,
    pub code: i32,
}

/// Run a shell command string in `cwd`. Uses `$SHELL -lc` so user aliases /
/// PATH from the login shell are available (falls back to /bin/sh).
#[tauri::command]
pub fn run_command(cwd: String, command: String) -> Result<CommandOutput, String> {
    let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/sh".to_string());
    let out = Command::new(&shell)
        .arg("-lc")
        .arg(&command)
        .current_dir(&cwd)
        .output()
        .map_err(|e| format!("failed to spawn shell: {}", e))?;
    Ok(CommandOutput {
        stdout: String::from_utf8_lossy(&out.stdout).into_owned(),
        stderr: String::from_utf8_lossy(&out.stderr).into_owned(),
        code: out.status.code().unwrap_or(-1),
    })
}

/// Resolve a `cd` target against the current cwd and return the new absolute
/// directory, or an error if it doesn't exist. Handles `~`, `..`, absolute and
/// relative paths.
#[tauri::command]
pub fn change_dir(cwd: String, target: String) -> Result<String, String> {
    let target = target.trim();
    let next: PathBuf = if target.is_empty() || target == "~" {
        dirs_home().ok_or("no home directory")?
    } else if let Some(rest) = target.strip_prefix("~/") {
        dirs_home().ok_or("no home directory")?.join(rest)
    } else {
        let p = PathBuf::from(target);
        if p.is_absolute() {
            p
        } else {
            PathBuf::from(&cwd).join(p)
        }
    };
    let canonical = next
        .canonicalize()
        .map_err(|_| format!("cd: no such directory: {}", target))?;
    if !canonical.is_dir() {
        return Err(format!("cd: not a directory: {}", target));
    }
    Ok(canonical.to_string_lossy().into_owned())
}

fn dirs_home() -> Option<PathBuf> {
    std::env::var_os("HOME").map(PathBuf::from)
}
