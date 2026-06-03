// Real Git integration by shelling out to the system `git` binary in the
// workspace root. Keeps the dependency surface small (no libgit2 build) and
// mirrors what the user would run in the integrated terminal.

use serde::Serialize;
use std::collections::HashMap;
use std::process::Command;

#[derive(Debug, Serialize, Clone)]
pub struct GitChange {
    pub path: String,
    pub status: String, // "M" | "A" | "D"
    pub staged: bool,
    pub add: u32,
    pub del: u32,
}

#[derive(Debug, Serialize, Clone)]
pub struct GitStatus {
    pub is_repo: bool,
    pub branch: String,
    pub ahead: u32,
    pub changes: Vec<GitChange>,
}

#[derive(Debug, Serialize, Clone)]
pub struct GitCommandResult {
    pub ok: bool,
    pub stdout: String,
    pub stderr: String,
}

fn git(root: &str, args: &[&str]) -> Result<GitCommandResult, String> {
    let out = Command::new("git")
        .args(args)
        .current_dir(root)
        .output()
        .map_err(|e| format!("failed to run git: {}", e))?;
    Ok(GitCommandResult {
        ok: out.status.success(),
        stdout: String::from_utf8_lossy(&out.stdout).into_owned(),
        stderr: String::from_utf8_lossy(&out.stderr).into_owned(),
    })
}

/// Map a single porcelain status char to our coarse M/A/D.
fn map_code(c: char) -> &'static str {
    match c {
        'A' => "A",
        'D' => "D",
        '?' => "A", // untracked => shows as added
        _ => "M",   // M, R, C, U, etc.
    }
}

/// Collect per-path line counts from a `git diff --numstat` invocation.
fn numstat(root: &str, cached: bool) -> HashMap<String, (u32, u32)> {
    let mut map = HashMap::new();
    let mut args = vec!["diff", "--numstat"];
    if cached {
        args.push("--cached");
    }
    if let Ok(res) = git(root, &args) {
        for line in res.stdout.lines() {
            let mut parts = line.split('\t');
            let add = parts.next().and_then(|s| s.parse::<u32>().ok()).unwrap_or(0);
            let del = parts.next().and_then(|s| s.parse::<u32>().ok()).unwrap_or(0);
            if let Some(path) = parts.next() {
                map.insert(path.to_string(), (add, del));
            }
        }
    }
    map
}

#[tauri::command]
pub fn git_status(root: String) -> Result<GitStatus, String> {
    // Is this even a git repo?
    let inside = git(&root, &["rev-parse", "--is-inside-work-tree"])?;
    if !inside.ok {
        return Ok(GitStatus {
            is_repo: false,
            branch: String::new(),
            ahead: 0,
            changes: vec![],
        });
    }

    let branch = git(&root, &["rev-parse", "--abbrev-ref", "HEAD"])?
        .stdout
        .trim()
        .to_string();

    // Commits ahead of upstream (0 if no upstream configured).
    let ahead = git(&root, &["rev-list", "--count", "@{u}..HEAD"])
        .ok()
        .filter(|r| r.ok)
        .and_then(|r| r.stdout.trim().parse::<u32>().ok())
        .unwrap_or(0);

    let unstaged = numstat(&root, false);
    let staged_stats = numstat(&root, true);

    let porcelain = git(&root, &["status", "--porcelain=v1"])?;
    let mut changes = Vec::new();
    for line in porcelain.stdout.lines() {
        if line.len() < 3 {
            continue;
        }
        let bytes: Vec<char> = line.chars().collect();
        let index = bytes[0];
        let worktree = bytes[1];
        let path = line[3..].trim().to_string();
        // `R old -> new` rename form: keep the new name.
        let path = path
            .split(" -> ")
            .last()
            .unwrap_or(&path)
            .trim_matches('"')
            .to_string();

        let is_staged = index != ' ' && index != '?';
        let code = if is_staged { index } else { worktree };
        let (add, del) = if is_staged {
            staged_stats.get(&path).copied().unwrap_or((0, 0))
        } else {
            unstaged.get(&path).copied().unwrap_or((0, 0))
        };
        changes.push(GitChange {
            path,
            status: map_code(code).to_string(),
            staged: is_staged,
            add,
            del,
        });
    }

    Ok(GitStatus {
        is_repo: true,
        branch,
        ahead,
        changes,
    })
}

#[tauri::command]
pub fn git_stage(root: String, path: String) -> Result<(), String> {
    let res = git(&root, &["add", "--", &path])?;
    if res.ok {
        Ok(())
    } else {
        Err(res.stderr)
    }
}

#[tauri::command]
pub fn git_stage_all(root: String) -> Result<(), String> {
    let res = git(&root, &["add", "-A"])?;
    if res.ok {
        Ok(())
    } else {
        Err(res.stderr)
    }
}

#[tauri::command]
pub fn git_unstage(root: String, path: String) -> Result<(), String> {
    // `restore --staged` on modern git; fall back to `reset` for old versions.
    let res = git(&root, &["restore", "--staged", "--", &path])?;
    if res.ok {
        return Ok(());
    }
    let res = git(&root, &["reset", "HEAD", "--", &path])?;
    if res.ok {
        Ok(())
    } else {
        Err(res.stderr)
    }
}

#[tauri::command]
pub fn git_commit(root: String, message: String) -> Result<String, String> {
    if message.trim().is_empty() {
        return Err("Empty commit message".into());
    }
    let res = git(&root, &["commit", "-m", &message])?;
    if res.ok {
        Ok(res.stdout)
    } else {
        Err(if res.stderr.is_empty() {
            res.stdout
        } else {
            res.stderr
        })
    }
}

#[tauri::command]
pub fn git_push(root: String) -> Result<String, String> {
    let res = git(&root, &["push"])?;
    if res.ok {
        // git prints push progress to stderr even on success.
        Ok(format!("{}{}", res.stdout, res.stderr))
    } else {
        Err(res.stderr)
    }
}

#[tauri::command]
pub fn git_log(root: String) -> Result<String, String> {
    let res = git(&root, &["log", "--oneline", "-n", "30"])?;
    if res.ok {
        Ok(res.stdout)
    } else {
        Err(res.stderr)
    }
}
