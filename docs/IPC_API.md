# IPC API Reference

The contract between the React UI and the Rust backend. All commands are invoked through `src/lib/tauri.ts` (`fsApi`, `gitApi`, `termApi`). Paths are **relative to the workspace `root`** unless noted; `root` is an absolute path. Errors are returned as `Result::Err(String)` and surface as a rejected promise.

## Filesystem — `fsApi` (`fs_cmds.rs`)

| Command         | Signature (JS)                     | Returns          | Notes                                                                                             |
| --------------- | ---------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------- |
| `pick_folder`   | `pickFolder()`                     | `string \| null` | Native folder dialog; absolute path or null if cancelled.                                         |
| `list_dir`      | `listDir(root)`                    | `TreeNode[]`     | Recursive. Folders first, then files, case-insensitive. Skips dotfiles, `node_modules`, `target`. |
| `read_file`     | `readFile(root, path)`             | `string`         | UTF-8 only (see roadmap H3). Guarded against path escape.                                         |
| `write_file`    | `writeFile(root, path, content)`   | `void`           | Creates parent dirs as needed.                                                                    |
| `create_file`   | `createFile(root, path, content?)` | `void`           | Errors if the file already exists.                                                                |
| `create_folder` | `createFolder(root, path)`         | `void`           | `mkdir -p` semantics.                                                                             |
| `rename`        | `rename(root, from, to)`           | `void`           | File or folder.                                                                                   |
| `delete`        | `delete(root, path)`               | `void`           | Recursive for folders.                                                                            |

`TreeNode` (serde-tagged on `type`):

```ts
type TreeNode =
  | { type: "file"; name: string; path: string }
  | { type: "folder"; name: string; path: string; open: boolean; children: TreeNode[] };
```

**Security**: `resolve(root, rel)` canonicalizes and rejects any target whose parent is outside `root`.

## Git — `gitApi` (`git_cmds.rs`)

Shells out to the system `git` in `root`.

| Command         | Signature (JS)          | Returns        | Notes                                                       |
| --------------- | ----------------------- | -------------- | ----------------------------------------------------------- |
| `git_status`    | `status(root)`          | `RawGitStatus` | `is_repo`, `branch`, `ahead`, `changes[]`.                  |
| `git_stage`     | `stage(root, path)`     | `void`         | `git add -- <path>`.                                        |
| `git_stage_all` | `stageAll(root)`        | `void`         | `git add -A`.                                               |
| `git_unstage`   | `unstage(root, path)`   | `void`         | `restore --staged`, falls back to `reset HEAD`.             |
| `git_commit`    | `commit(root, message)` | `string`       | Rejects empty message.                                      |
| `git_push`      | `push(root)`            | `string`       | Uses system credentials (see [SECURITY.md](./SECURITY.md)). |
| `git_log`       | `log(root)`             | `string`       | `--oneline -n 30`.                                          |

```ts
interface RawGitStatus {
  is_repo: boolean;
  branch: string;
  ahead: number;
  changes: { path: string; status: "M" | "A" | "D"; staged: boolean; add: number; del: number }[];
}
```

## Terminal — `termApi` (`term_cmds.rs`)

| Command       | Signature (JS)           | Returns         | Notes                                                       |
| ------------- | ------------------------ | --------------- | ----------------------------------------------------------- |
| `run_command` | `run(cwd, command)`      | `CommandOutput` | Runs `$SHELL -lc <command>` in `cwd`. One-shot (not a PTY). |
| `change_dir`  | `changeDir(cwd, target)` | `string`        | Resolves `~`, `..`, relative/absolute; errors if missing.   |

```ts
interface CommandOutput {
  stdout: string;
  stderr: string;
  code: number;
}
```

## Adding a command (checklist)

1. Write the `#[tauri::command] pub fn` in the right module; take `root`/`cwd` and return `Result<T, String>`.
2. Register it in `lib.rs` `generate_handler![...]`.
3. Add a typed wrapper to the matching api object in `src/lib/tauri.ts`.
4. Add/extend a `#[cfg(test)]` test in the module.
5. If it needs a new capability (e.g. a plugin permission), update `src-tauri/capabilities/default.json`.
