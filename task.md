# IWE — Task Tracker

Path from working MVP to a signed public **1.0**. Mirrors the tracked task list (#12–#31) and [docs/ROADMAP.md](./docs/ROADMAP.md).

**Legend:** 🚫 launch blocker · ⭐ high impact · 🔧 robustness · ✨ polish
**Scope (firm):** no app login · GitHub sign-in is push-only · AI runs in the terminal (no embedded provider).

---

## ✅ Done (MVP)

- [x] Tauri backend wired & booting (fs/git/terminal commands registered)
- [x] Real filesystem: open folder, tree, open/save, create/rename/delete
- [x] Real Git: status / stage / unstage / commit / push / log
- [x] Terminal runs real commands in the workspace cwd
- [x] All demo/sample data removed — real-folder-only
- [x] Duplicate traffic lights fixed; draggable titlebar; dead settings removed
- [x] 8 backend integration tests passing; clean build & boot
- [x] `docs/` folder (analysis, architecture, IPC, release, security, extensions, roadmap, contributing)

---

## M1 — Foundation & repo hygiene ✅

- [x] 🚫 **#12** Add `LICENSE` (MIT) + `license` fields in package.json & Cargo.toml
- [x] 🚫 **#13** CI workflow `ci.yml`: build · typecheck · lint · `cargo fmt`/`clippy -Dwarnings`/`test` (macOS + Ubuntu)
- [x] ⭐ **#14** ESLint + Prettier + rustfmt, `CHANGELOG.md`, issue/PR templates, `CODEOWNERS`

## M2 — Persistence & session UX

- [ ] ⭐ **#15** Persist app settings (theme/fonts/toggles) to disk
- [ ] ⭐ **#16** Reopen last workspace on launch + "Recent folders" on onboarding
- [ ] ✨ **#17** Persist window size/position and open tabs per workspace

## M3 — Robustness & data integrity

- [ ] ⭐ **#18** Graceful binary/non-UTF8 file handling (no crash on open)
- [ ] ⭐ **#19** Filesystem watching (`notify`) + external-change / overwrite-conflict handling
- [ ] 🔧 **#20** Incremental tree updates + large-folder depth/size guard
- [ ] 🔧 **#21** Frontend tests (Vitest + Testing Library) + React error boundary

## M4 — Terminal & Git completeness

- [ ] ⭐ **#22** PTY terminal (`portable-pty` + xterm.js) — interactive programs & AI CLIs _(riskiest item)_
- [ ] ⭐ **#23** GitHub push sign-in (OAuth device flow → system git credential helper, push-only)
- [ ] 🔧 **#24** Git diff view, discard, pull/fetch, branch switch, conflict surfacing

## M5 — Packaging, signing & release

- [ ] 🚫 **#25** Replace placeholder Tauri icons with real brand assets
- [ ] 🚫 **#26** macOS code signing + notarization in build _(needs #25)_
- [ ] 🚫 **#27** Linux bundles `.deb`/`.rpm`/`.AppImage` (old glibc) + WebKitGTK runtime doc _(needs #25)_
- [ ] 🚫 **#28** `release.yml` (tauri-action) signed GitHub Releases _(needs #13, #26, #27)_
- [ ] ⭐ **#29** Auto-updater (`tauri-plugin-updater`) + signed manifest _(needs #28)_
- [ ] 🔧 **#30** Strict CSP + security pass
- [ ] ✨ **#31** App menu, About dialog, first-run + accessibility polish

---

## Suggested order

1. **M1** — cheap, unblocks the release pipeline.
2. **M2 + M3** in parallel — biggest day-to-day UX wins.
3. **M4** — the two ⭐ features; PTY first (highest risk).
4. **M5** — needs M1 CI + final assets; produces the shippable artifact.

**Credible public 1.0** = M1 + M2 + M3 + M5 with M4's GitHub sign-in. PTY (#22) can ship in 1.0 or fast-follow 1.1. The v2 extension system ([docs/EXTENSIONS.md](./docs/EXTENSIONS.md)) is post-1.0.
