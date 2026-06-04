use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum TreeNode {
    File {
        name: String,
        path: String,
    },
    Folder {
        name: String,
        path: String,
        open: bool,
        children: Vec<TreeNode>,
    },
}

/// Open a native folder picker. Returns the chosen absolute path, or None if cancelled.
#[tauri::command]
pub async fn pick_folder(app: AppHandle) -> Result<Option<String>, String> {
    let (tx, rx) = std::sync::mpsc::channel();
    app.dialog().file().pick_folder(move |path| {
        let _ = tx.send(path);
    });
    let result = tokio::task::spawn_blocking(move || rx.recv())
        .await
        .map_err(|e| e.to_string())?
        .map_err(|e| e.to_string())?;
    Ok(result
        .and_then(|p| p.into_path().ok())
        .map(|p| p.to_string_lossy().into_owned()))
}

/// Recursively list a folder as a tree of TreeNode entries.
/// `root` is the absolute path; returned paths are RELATIVE to root.
/// Hidden files (starting with `.`) and `node_modules`/`target` are skipped.
#[tauri::command]
pub fn list_dir(root: String) -> Result<Vec<TreeNode>, String> {
    let root_path = PathBuf::from(&root);
    if !root_path.is_dir() {
        return Err(format!("Not a directory: {}", root));
    }
    walk(&root_path, &root_path).map_err(|e| e.to_string())
}

fn walk(dir: &Path, root: &Path) -> std::io::Result<Vec<TreeNode>> {
    let mut entries: Vec<_> = fs::read_dir(dir)?.collect::<Result<_, _>>()?;
    entries.sort_by_key(|e| {
        // folders first, then files; within each group, alphabetical (case-insensitive)
        let name = e.file_name().to_string_lossy().to_lowercase();
        let is_dir = e.file_type().map(|t| t.is_dir()).unwrap_or(false);
        (!is_dir, name)
    });

    let mut nodes = Vec::with_capacity(entries.len());
    for entry in entries {
        let name = entry.file_name().to_string_lossy().into_owned();
        if name.starts_with('.') || name == "node_modules" || name == "target" {
            continue;
        }
        let abs_path = entry.path();
        let rel_path = abs_path
            .strip_prefix(root)
            .unwrap_or(&abs_path)
            .to_string_lossy()
            .replace('\\', "/");
        let ft = entry.file_type()?;
        if ft.is_dir() {
            let children = walk(&abs_path, root)?;
            nodes.push(TreeNode::Folder {
                name,
                path: rel_path,
                open: false,
                children,
            });
        } else if ft.is_file() {
            nodes.push(TreeNode::File {
                name,
                path: rel_path,
            });
        }
    }
    Ok(nodes)
}

fn resolve(root: &str, rel: &str) -> Result<PathBuf, String> {
    let abs = PathBuf::from(root).join(rel);
    // Guard against escaping the root via `..` segments.
    let canonical_root = PathBuf::from(root)
        .canonicalize()
        .map_err(|e| e.to_string())?;
    let canonical_target = abs
        .parent()
        .ok_or_else(|| "no parent".to_string())?
        .canonicalize()
        .map_err(|e| e.to_string())?;
    if !canonical_target.starts_with(&canonical_root) {
        return Err("Path escapes workspace root".to_string());
    }
    Ok(abs)
}

#[tauri::command]
pub fn read_file(root: String, path: String) -> Result<String, String> {
    let abs = resolve(&root, &path)?;
    fs::read_to_string(&abs).map_err(|e| format!("{}: {}", abs.display(), e))
}

#[tauri::command]
pub fn write_file(root: String, path: String, content: String) -> Result<(), String> {
    let abs = resolve(&root, &path)?;
    if let Some(parent) = abs.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(&abs, content).map_err(|e| format!("{}: {}", abs.display(), e))
}

#[tauri::command]
pub fn create_file(root: String, path: String, content: String) -> Result<(), String> {
    let abs = resolve(&root, &path)?;
    if abs.exists() {
        return Err(format!("Already exists: {}", path));
    }
    if let Some(parent) = abs.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(&abs, content).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_folder(root: String, path: String) -> Result<(), String> {
    let abs = resolve(&root, &path)?;
    fs::create_dir_all(&abs).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn rename(root: String, from: String, to: String) -> Result<(), String> {
    let from_abs = resolve(&root, &from)?;
    let to_abs = resolve(&root, &to)?;
    fs::rename(&from_abs, &to_abs).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete(root: String, path: String) -> Result<(), String> {
    let abs = resolve(&root, &path)?;
    if abs.is_dir() {
        fs::remove_dir_all(&abs).map_err(|e| e.to_string())
    } else {
        fs::remove_file(&abs).map_err(|e| e.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn tmp_root() -> String {
        let n = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        // Include the thread id so parallel tests never share a temp dir.
        let dir =
            std::env::temp_dir().join(format!("iwe_fs_{:?}_{}", std::thread::current().id(), n));
        fs::create_dir_all(&dir).unwrap();
        // Canonicalize so it matches resolve()'s canonical checks on macOS
        // (/var -> /private/var symlink).
        dir.canonicalize().unwrap().to_string_lossy().into_owned()
    }

    fn names(nodes: &[TreeNode]) -> Vec<String> {
        nodes
            .iter()
            .map(|n| match n {
                TreeNode::File { name, .. } => name.clone(),
                TreeNode::Folder { name, .. } => name.clone() + "/",
            })
            .collect()
    }

    #[test]
    fn lists_tree_folders_first_and_skips_hidden() {
        let root = tmp_root();
        create_folder(root.clone(), "Manuscript".into()).unwrap();
        create_file(root.clone(), "README.md".into(), "# hi\n".into()).unwrap();
        create_file(root.clone(), "Manuscript/ch1.md".into(), "one".into()).unwrap();
        create_file(root.clone(), ".secret".into(), "x".into()).unwrap();
        create_folder(root.clone(), "node_modules".into()).unwrap();

        let tree = list_dir(root.clone()).unwrap();
        let top = names(&tree);
        // Folder first, then file; hidden + node_modules skipped.
        assert_eq!(
            top,
            vec!["Manuscript/".to_string(), "README.md".to_string()]
        );

        if let TreeNode::Folder { children, .. } = &tree[0] {
            assert_eq!(names(children), vec!["ch1.md".to_string()]);
        } else {
            panic!("expected folder first");
        }
        fs::remove_dir_all(root).ok();
    }

    #[test]
    fn write_read_rename_delete_roundtrip() {
        let root = tmp_root();
        create_file(root.clone(), "a.md".into(), "hello".into()).unwrap();
        assert_eq!(read_file(root.clone(), "a.md".into()).unwrap(), "hello");

        write_file(root.clone(), "a.md".into(), "world".into()).unwrap();
        assert_eq!(read_file(root.clone(), "a.md".into()).unwrap(), "world");

        rename(root.clone(), "a.md".into(), "b.md".into()).unwrap();
        assert!(read_file(root.clone(), "a.md".into()).is_err());
        assert_eq!(read_file(root.clone(), "b.md".into()).unwrap(), "world");

        delete(root.clone(), "b.md".into()).unwrap();
        assert!(read_file(root.clone(), "b.md".into()).is_err());
        fs::remove_dir_all(root).ok();
    }

    #[test]
    fn resolve_blocks_path_escape() {
        let root = tmp_root();
        let escaped = read_file(root.clone(), "../../etc/hosts".into());
        assert!(escaped.is_err(), "path traversal should be rejected");
        fs::remove_dir_all(root).ok();
    }
}
