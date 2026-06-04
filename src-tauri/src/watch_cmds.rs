// Filesystem watching via the `notify` crate. We keep a single recursive
// watcher on the open workspace and emit an `fs:changed` event (with the
// affected paths, relative to the workspace root) whenever the disk changes.
// The frontend debounces these and reconciles its tree / open files.

use notify::{Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, State};

/// Holds the live watcher. Dropping it (replacing or clearing) stops watching.
#[derive(Default)]
pub struct WatchState(pub Mutex<Option<RecommendedWatcher>>);

#[derive(Clone, serde::Serialize)]
struct FsChangePayload {
    paths: Vec<String>,
}

/// Skip churn we never show in the tree (and that would spam events, e.g. the
/// `.git` directory rewriting refs on every commit).
fn is_ignored(rel: &str) -> bool {
    rel.split('/')
        .any(|seg| seg.starts_with('.') || seg == "node_modules" || seg == "target")
}

/// Start (or replace) the recursive watcher on `path`. Emits `fs:changed`.
#[tauri::command]
pub fn watch_workspace(
    app: AppHandle,
    state: State<WatchState>,
    path: String,
) -> Result<(), String> {
    let root = PathBuf::from(&path);
    if !root.is_dir() {
        return Err(format!("Not a directory: {}", path));
    }
    // Canonicalize once so event paths (reported under the watched path) strip
    // cleanly to workspace-relative paths.
    let canonical_root = root.canonicalize().map_err(|e| e.to_string())?;
    let root_for_cb = canonical_root.clone();
    let app_for_cb = app.clone();

    let mut watcher = notify::recommended_watcher(move |res: notify::Result<Event>| {
        let Ok(event) = res else { return };
        // Access/read events aren't interesting and are very noisy.
        if matches!(event.kind, EventKind::Access(_)) {
            return;
        }
        let mut paths: Vec<String> = event
            .paths
            .iter()
            .filter_map(|p| {
                p.strip_prefix(&root_for_cb)
                    .ok()
                    .map(|r| r.to_string_lossy().replace('\\', "/"))
            })
            .filter(|r| !r.is_empty() && !is_ignored(r))
            .collect();
        paths.sort();
        paths.dedup();
        if paths.is_empty() {
            return;
        }
        let _ = app_for_cb.emit("fs:changed", FsChangePayload { paths });
    })
    .map_err(|e| e.to_string())?;

    watcher
        .watch(&canonical_root, RecursiveMode::Recursive)
        .map_err(|e| e.to_string())?;

    *state.0.lock().map_err(|e| e.to_string())? = Some(watcher);
    Ok(())
}

/// Stop watching (e.g. when no workspace is open).
#[tauri::command]
pub fn unwatch(state: State<WatchState>) -> Result<(), String> {
    *state.0.lock().map_err(|e| e.to_string())? = None;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::is_ignored;

    #[test]
    fn ignores_dotdirs_and_vendored() {
        assert!(is_ignored(".git/HEAD"));
        assert!(is_ignored("node_modules/react/index.js"));
        assert!(is_ignored("target/debug/app"));
        assert!(is_ignored("notes/.DS_Store"));
        assert!(!is_ignored("notes/chapter.md"));
        assert!(!is_ignored("README.md"));
    }
}
