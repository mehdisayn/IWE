# Architecture

## Process model

IWE is a Tauri 2 application: a single Rust process hosts a native webview that renders the React UI. There is no separate Node/server runtime in production.

```
┌─────────────────────────────────────────────────────────────┐
│ Tauri (Rust) process                                          │
│                                                               │
│   ┌──────────────────────────┐    invoke()    ┌────────────┐ │
│   │  Webview (system WebKit/   │ ◀───────────▶ │  Command   │ │
│   │  WebView2)                 │   IPC bridge  │  handlers  │ │
│   │                            │               │  (Rust)    │ │
│   │  React 18 + Vite bundle    │               │            │ │
│   │  src/  →  dist/            │               │ fs_cmds    │ │
│   └──────────────────────────┘                │ git_cmds   │ │
│                                                │ term_cmds  │ │
│                                                └─────┬──────┘ │
└──────────────────────────────────────────────────────┼───────┘
                                                         │
                          ┌──────────────────────────────┼───────────┐
                          ▼               ▼                ▼
                     local files     system `git`    login shell ($SHELL)
```

- **Dev**: `tauri dev` runs Vite on `http://localhost:1420` and points the webview at it (hot reload).
- **Prod**: `tauri build` bundles `dist/` into the app binary; `frontendDist` = `../dist`.

## Layers

### 1. Backend (`src-tauri/src/`)

| Module         | Responsibility                                                                                     |
| -------------- | -------------------------------------------------------------------------------------------------- |
| `main.rs`      | Binary entry; calls `iwe_lib::run()`.                                                              |
| `lib.rs`       | Builds the Tauri app, registers the `dialog` plugin and all 17 commands.                           |
| `fs_cmds.rs`   | Folder picker, recursive tree, read/write/create/rename/delete. Path-escape guard via `resolve()`. |
| `git_cmds.rs`  | Shells out to `git`; parses `status --porcelain` + `--numstat`; stage/commit/push/log.             |
| `term_cmds.rs` | `run_command` (`$SHELL -lc` in cwd) and `change_dir` resolution.                                   |

Every command takes the workspace `root` (absolute path) and operates relative to it. Filesystem commands reject paths that canonicalize outside `root`.

### 2. IPC bridge (`src/lib/tauri.ts`)

A single typed wrapper around `@tauri-apps/api`'s `invoke`. Exposes `fsApi`, `gitApi`, `termApi`, and `IS_TAURI` (feature-detects the native shell). Lazy-imports the Tauri core module so the bundle also loads in a plain browser. This file is the **only** place that talks to Rust — see [IPC_API.md](./IPC_API.md).

### 3. UI (`src/`)

- `App.tsx` — the orchestrator: holds all state, keyboard shortcuts, layout, and the real-vs-absent-folder branching. ~800 lines; the natural first target for decomposition.
- `components/` — presentational + small stateful components (Sidebar, GitPanel, Terminal, Dashboard, editor/_, overlays/_).
- `styles/iwe.css` — theme variables (`[data-theme]`) and all component styles.
- `lib/markdown.ts` — markdown render + highlight overlay + word count.

## State model (frontend)

State lives in `App.tsx` (React `useState`), keyed off one pivot value:

- `root: string | null` — absolute path of the open folder. **Null ⇒ no workspace** (onboarding / empty states). Non-null ⇒ all reads/writes hit disk.
- `tree` — `TreeNode[]` mirrored from `list_dir`.
- `files` / `saved` — `Record<path, content>`; `files` is the live buffer, `saved` is the last-persisted snapshot. `dirty = files[p] !== saved[p]`.
- `git: GitState` — branch, ahead, changes; refreshed from `git_status` after every mutating action.
- `tabs`, `active`, `mode`, `caret`, plus UI toggles and overlay state.

There is no global store (Redux/Zustand) yet; if `App.tsx` keeps growing, extract a context or store (tracked in the roadmap).

## Data flow examples

**Open a folder**: Onboarding → `pickFolder()` → `fsApi.pickFolder()` (native dialog) → `openWorkspace(abs)` → `list_dir` + `git_status` → set `root`, `tree`, `git`.

**Save a file**: ⌘S → `saveActive()` → `fsApi.writeFile(root, path, content)` → update `saved` → `git_status` refresh → (if "commit on save") `git_stage` + `git_commit`.

**Run a command**: Terminal input → `termApi.run(cwd, cmd)` → `$SHELL -lc` in cwd → stdout/stderr streamed back as lines (ANSI stripped). `cd` is intercepted and resolved via `change_dir`.

## Key conventions

- Relative paths everywhere in the UI and IPC; `root` is the only absolute path.
- The backend is the security boundary; never trust a path from the webview without `resolve()`.
- Mock fallback was intentionally removed — the app shows only real on-disk content.
