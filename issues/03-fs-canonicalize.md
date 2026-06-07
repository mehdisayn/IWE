# Issue: Creating Files in Non-Existent Subfolders Fails

## User Flow
1. The user clicks "New File" or "New Folder" and types a path with a slash (e.g., `nested/my-note`).
2. The frontend calls `fsApi.createFile(root, "nested/my-note.md", "# my-note\n\n")`.
3. The Tauri backend receives the command and calls `resolve` in `src-tauri/src/fs_cmds.rs` to compute the absolute path and ensure it doesn't escape the workspace.

## Why it is not working
- **`canonicalize()` on Non-Existent Paths:** Inside `resolve`, the code attempts to canonicalize the parent path (`abs.parent().unwrap().canonicalize()`) to verify it's within the root directory. However, `std::fs::canonicalize` on Windows and Linux returns an `io::Error` (Not Found) if the directory does not actually exist on disk yet.
- **Order of Operations:** The backend does contain logic to automatically create parent directories using `fs::create_dir_all(parent)`. Unfortunately, this is called *after* `resolve`. Since `resolve` fails, the command aborts before creating the directories.
- **Result:** The user sees a "Create failed" toast, and the file/folder is not created.

## Proposed Solutions
1. **Remove `canonicalize` for security checks:** Instead of `canonicalize`, use `std::path::Path::clean` or a similar path-normalization strategy (e.g. `path-clean` crate) that works purely on the string path without querying the filesystem. Then check if the normalized path starts with the root.
2. **Canonicalize existing ancestors only:** Traverse up the path until an existing directory is found, canonicalize that, and verify it resides within the root workspace.
