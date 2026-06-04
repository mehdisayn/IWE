# Changelog

All notable changes to IWE are documented here. Format based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); this project uses
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Tauri backend with real filesystem, Git, and terminal commands (17 IPC commands).
- Real workspace: open a folder, file tree, open/edit/save, create/rename/delete.
- Git integration via system `git`: status, stage/unstage, commit, push, log.
- Integrated terminal running real commands in the workspace directory.
- Dashboard computed from real workspace data; three themes; command palette.
- `docs/` engineering + product documentation set.
- Project foundation: MIT `LICENSE`, ESLint + Prettier, rustfmt config, CI workflow,
  issue/PR templates, `CODEOWNERS`.
- Backend integration tests (filesystem, Git, terminal).
- Persistence: UI settings, last/recent workspaces, and per-workspace open tabs are
  saved to an app-config file and restored on launch; recent folders shown on onboarding.
- Window size/position restored across launches (`tauri-plugin-window-state`).
- Robustness (M3):
  - Binary and non-UTF8 files no longer error on open — they show a "binary file"
    placeholder; files over 5 MB show a "too large" notice instead of loading.
  - Live filesystem watching (`notify`): external edits, creations, and deletions
    are reflected automatically; editing a file that changed on disk warns before
    overwriting unsaved work.
  - Incremental tree updates (only the changed subfolder is re-listed) and a
    depth/entry guard so very large or deep folders can't freeze the UI.
  - Frontend test suite (Vitest + Testing Library) and a top-level React error
    boundary with a recoverable crash screen.

### Changed

- Removed all sample/demo data; the app now shows only real on-disk content.
- Fixed duplicate window controls (use native macOS traffic lights); draggable titlebar.
- Wired "Commit on save"; removed non-functional settings controls.

[Unreleased]: https://github.com/mehdisayn/IWE/commits/main
