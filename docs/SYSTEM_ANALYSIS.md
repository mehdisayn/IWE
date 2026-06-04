# System Analysis

A professional audit of IWE as of the current commit. Written to be honest, not promotional.

## 1. Snapshot

| Metric          | Value                                                    |
| --------------- | -------------------------------------------------------- |
| Frontend        | React 18.3 + TypeScript 5.6 + Vite 5.4                   |
| Backend         | Tauri 2.11 (Rust, edition 2021)                          |
| Frontend source | ~2,940 lines (TS/TSX), 583 lines CSS                     |
| Rust source     | ~670 lines across 4 modules                              |
| IPC commands    | 17 (filesystem 8, git 7, terminal 2)                     |
| Backend tests   | 8 (passing)                                              |
| Frontend tests  | 0                                                        |
| Tauri plugins   | `dialog`, `log`                                          |
| Styling         | CSS custom-property theme system (3 themes); no Tailwind |
| Repo            | `github.com/mehdisayn/IWE`, single branch `main`         |

## 2. Architecture in one paragraph

A React single-page UI runs in the Tauri webview. All OS access goes through a thin typed bridge (`src/lib/tauri.ts`) that invokes Rust commands. The Rust side exposes filesystem, Git (by shelling out to the system `git`), and terminal (one-shot shell exec) commands, all scoped to the user-opened workspace folder (`root`). When not running under Tauri (plain browser), the app degrades to an "open the desktop app" message — there is **no mock/sample data anywhere**. See [ARCHITECTURE.md](./ARCHITECTURE.md).

## 3. What works today (verified)

- **Filesystem**: native folder picker, recursive tree (folders-first, hidden/`node_modules`/`target` skipped), lazy file read, write/save, autosave, create/rename/delete (files and folders), with open-tab remapping on folder rename/delete. Path-traversal guard rejects `..` escapes.
- **Git**: detect repo, branch, ahead count; status with staged/unstaged + per-file add/del; stage, unstage, stage-all, commit, push, log. Honest "not a Git repository" state when absent.
- **Terminal**: real command execution in the workspace cwd via the login shell; `cd` resolution; `clear`; command history.
- **Editor**: markdown edit / preview / split, syntax-highlight overlay, `[[wikilink]]` autocomplete and navigation, tabs, command palette (⌘⇧P) and quick-switcher (⌘P), 3 themes, keyboard shortcuts.
- **Dashboard**: real stats computed from the open workspace (file/folder counts, word count, file-type breakdown, recently-opened tabs).
- **Quality gates**: `tsc -b` + `vite build` clean; `cargo test` 8/8 green; clean boot, no panic.

## 4. Gaps and risks

### Launch blockers (must fix to distribute)

- **B1 — No code signing / notarization.** A distributed macOS bundle is blocked by Gatekeeper. No `signingIdentity`/notarization in the build. Equivalent: no Linux package signing.
- **B2 — Default placeholder icons.** `src-tauri/icons/` still holds the stock Tauri logo. Needs real brand assets before any release.
- **B3 — No CI / no release pipeline.** Builds are manual and local; Linux is unverified.
- **B4 — No LICENSE.** Distribution/legal status undefined.

### High priority (core UX / data integrity)

- **H1 — Settings do not persist.** Theme, font, autosave, etc. reset on every launch (in-memory only).
- **H2 — No "reopen last folder."** App always starts at the picker; no recent-workspaces list.
- **H3 — `read_file` is UTF-8 only.** Opening a binary/image file errors instead of being handled gracefully.
- **H4 — No external-change detection / file watching.** Edits made outside the app aren't reflected; a save can silently overwrite on-disk changes.
- **H5 — Terminal is one-shot exec, not a PTY.** No interactive programs (`vim`, `top`) and interactive AI CLIs that need a TTY won't work — directly relevant since "AI is handled in the terminal."

### Medium priority

- **M1 — GitHub push UX.** Push relies on pre-existing git credentials; there's no in-app way to authorize GitHub (the one sanctioned sign-in).
- **M2 — Whole-tree reload on every fs change** (`reloadTree`); fine now, slow on very large folders. Tree read is synchronous/recursive with no depth cap.
- **M3 — No multi-repo / per-folder repo mapping** (a stated v1 idea); currently one folder = one repo.
- **M4 — No auto-updater.**
- **M5 — No frontend tests, no error boundary, no crash reporting.**

### Low priority / polish

- Workspace search is filename-only (no full-text). No undo across files. No window-state persistence. No app menu / about. Accessibility pass not done.

## 5. Scope decisions (per product direction)

- **No application account/login.** IWE is local-first; do **not** build app-level auth.
- **GitHub sign-in is push-only.** The single allowed sign-in authorizes `git push` (device-flow token stored via the system git credential helper). Nothing else gates on it.
- **AI is out-of-process.** No embedded AI provider; users run AI CLIs in the terminal. This makes the **PTY upgrade (H5)** the key enabler for the AI story.
- **Extensions (v2)** should reuse an existing ecosystem rather than invent one — target the **Open VSX / VS Code extension model**. See [EXTENSIONS.md](./EXTENSIONS.md).

## 6. Readiness verdict

| Audience                                   | Ready?                                 |
| ------------------------------------------ | -------------------------------------- |
| You, from source                           | ✅ Yes — real and stable.              |
| Technical early adopters (run from source) | 🟡 Mostly — fix H1/H2/H3 first.        |
| Public signed download (1.0)               | 🚫 Not yet — clear B1–B4, then H-tier. |

The path is well-defined and mostly mechanical (packaging + persistence + a few robustness fixes). The risky/novel work is small: the PTY terminal and the extension host. See [ROADMAP.md](./ROADMAP.md).
