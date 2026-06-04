use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;

/// Files larger than this are not loaded into the editor; the UI shows a
/// "too large" placeholder instead of trying to render megabytes of text.
const MAX_TEXT_BYTES: u64 = 5 * 1024 * 1024;
/// Stop recursing once a tree gets this deep, so a pathological/symlinked
/// folder can't hang the walk or blow the stack.
const MAX_DEPTH: usize = 16;
/// Cap how many entries we read from a single directory; huge folders
/// (e.g. a vendored cache) would otherwise freeze the UI.
const MAX_ENTRIES_PER_DIR: usize = 5_000;

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
        /// True when the listing was cut short by the depth/entry guard, so
        /// the UI can hint that not everything under here is shown.
        #[serde(default, skip_serializing_if = "std::ops::Not::not")]
        truncated: bool,
    },
}

/// Result of reading a file. `binary`/`too_large` let the frontend show a
/// friendly placeholder instead of garbage (or erroring) for non-text content.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileContents {
    pub binary: bool,
    pub too_large: bool,
    pub size: u64,
    pub content: String,
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
    walk(&root_path, &root_path, 0)
        .map(|(nodes, _)| nodes)
        .map_err(|e| e.to_string())
}

/// List a single subfolder (`sub`, relative to `root`) as a fresh subtree.
/// Used for incremental tree updates so we don't re-walk the whole workspace
/// when only one directory changes on disk.
#[tauri::command]
pub fn list_subtree(root: String, sub: String) -> Result<Vec<TreeNode>, String> {
    let dir = resolve(&root, &sub)?;
    if !dir.is_dir() {
        return Err(format!("Not a directory: {}", sub));
    }
    // Start the depth counter at the subfolder's own depth so the guard still
    // limits how far we descend below it.
    let depth = sub.split('/').filter(|s| !s.is_empty()).count();
    walk(&dir, &PathBuf::from(&root), depth)
        .map(|(nodes, _)| nodes)
        .map_err(|e| e.to_string())
}

/// Recursively list `dir`. Returns the child nodes and whether this directory's
/// own listing was cut short by the depth or per-directory entry cap.
fn walk(dir: &Path, root: &Path, depth: usize) -> std::io::Result<(Vec<TreeNode>, bool)> {
    if depth >= MAX_DEPTH {
        // Don't descend further; report this level as truncated.
        return Ok((Vec::new(), true));
    }
    let mut entries: Vec<_> = fs::read_dir(dir)?.collect::<Result<_, _>>()?;
    let over_cap = entries.len() > MAX_ENTRIES_PER_DIR;
    entries.sort_by_key(|e| {
        // folders first, then files; within each group, alphabetical (case-insensitive)
        let name = e.file_name().to_string_lossy().to_lowercase();
        let is_dir = e.file_type().map(|t| t.is_dir()).unwrap_or(false);
        (!is_dir, name)
    });
    entries.truncate(MAX_ENTRIES_PER_DIR);

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
            let (children, child_truncated) = walk(&abs_path, root, depth + 1)?;
            nodes.push(TreeNode::Folder {
                name,
                path: rel_path,
                open: false,
                children,
                truncated: child_truncated,
            });
        } else if ft.is_file() {
            nodes.push(TreeNode::File {
                name,
                path: rel_path,
            });
        }
    }
    Ok((nodes, over_cap))
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

/// Heuristic binary sniff: a NUL byte in the first 8 KiB means "not text".
/// Matches how editors and `git` classify binary content.
fn looks_binary(bytes: &[u8]) -> bool {
    let sample = &bytes[..bytes.len().min(8_000)];
    sample.contains(&0)
}

#[tauri::command]
pub fn read_file(root: String, path: String) -> Result<FileContents, String> {
    let abs = resolve(&root, &path)?;
    let meta = fs::metadata(&abs).map_err(|e| format!("{}: {}", abs.display(), e))?;
    let size = meta.len();
    if size > MAX_TEXT_BYTES {
        return Ok(FileContents {
            binary: false,
            too_large: true,
            size,
            content: String::new(),
        });
    }
    let bytes = fs::read(&abs).map_err(|e| format!("{}: {}", abs.display(), e))?;
    if looks_binary(&bytes) {
        return Ok(FileContents {
            binary: true,
            too_large: false,
            size,
            content: String::new(),
        });
    }
    // Non-UTF8 (but no NUL) is still treated as binary rather than lossily decoded.
    match String::from_utf8(bytes) {
        Ok(content) => Ok(FileContents {
            binary: false,
            too_large: false,
            size,
            content,
        }),
        Err(_) => Ok(FileContents {
            binary: true,
            too_large: false,
            size,
            content: String::new(),
        }),
    }
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

    fn text(root: &str, path: &str) -> String {
        read_file(root.to_string(), path.to_string())
            .unwrap()
            .content
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
        assert_eq!(text(&root, "a.md"), "hello");

        write_file(root.clone(), "a.md".into(), "world".into()).unwrap();
        assert_eq!(text(&root, "a.md"), "world");

        rename(root.clone(), "a.md".into(), "b.md".into()).unwrap();
        assert!(read_file(root.clone(), "a.md".into()).is_err());
        assert_eq!(text(&root, "b.md"), "world");

        delete(root.clone(), "b.md".into()).unwrap();
        assert!(read_file(root.clone(), "b.md".into()).is_err());
        fs::remove_dir_all(root).ok();
    }

    #[test]
    fn binary_file_is_flagged_not_decoded() {
        let root = tmp_root();
        // A NUL byte makes this "binary"; reading must not error.
        let abs = format!("{}/logo.png", root);
        fs::write(&abs, [0x89u8, 0x50, 0x4E, 0x47, 0x00, 0x01, 0x02]).unwrap();
        let fc = read_file(root.clone(), "logo.png".into()).unwrap();
        assert!(fc.binary, "NUL-containing file should be binary");
        assert!(!fc.too_large);
        assert_eq!(fc.content, "");
        fs::remove_dir_all(root).ok();
    }

    #[test]
    fn large_file_is_flagged_too_large() {
        let root = tmp_root();
        let big = "a".repeat((MAX_TEXT_BYTES as usize) + 16);
        create_file(root.clone(), "big.txt".into(), big).unwrap();
        let fc = read_file(root.clone(), "big.txt".into()).unwrap();
        assert!(fc.too_large, "file over the cap should be too_large");
        assert!(!fc.binary);
        assert_eq!(fc.content, "");
        assert!(fc.size > MAX_TEXT_BYTES);
        fs::remove_dir_all(root).ok();
    }

    #[test]
    fn list_subtree_lists_only_that_folder() {
        let root = tmp_root();
        create_file(root.clone(), "top.md".into(), "x".into()).unwrap();
        create_folder(root.clone(), "Notes".into()).unwrap();
        create_file(root.clone(), "Notes/inner.md".into(), "y".into()).unwrap();

        let sub = list_subtree(root.clone(), "Notes".into()).unwrap();
        assert_eq!(names(&sub), vec!["inner.md".to_string()]);
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
