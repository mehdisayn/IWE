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

### Changed

- Removed all sample/demo data; the app now shows only real on-disk content.
- Fixed duplicate window controls (use native macOS traffic lights); draggable titlebar.
- Wired "Commit on save"; removed non-functional settings controls.

[Unreleased]: https://github.com/mehdisayn/IWE/commits/main
