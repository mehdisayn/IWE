# Roadmap to 1.0

Five milestones from working alpha to a signed, public 1.0. Each maps to tracked tasks (see the project task list). Out of scope by product decision: app-level accounts/login, embedded AI (AI runs in the terminal), and the v2 extension system.

Legend: 🚫 launch blocker · ⭐ high impact · 🔧 robustness · ✨ polish

---

## M1 — Project foundation & repo hygiene

_Goal: a repo a professional team would recognize._

- 🚫 Add `LICENSE` (choose: MIT/Apache-2.0) + `license` fields in manifests.
- 🚫 CI workflow (`ci.yml`): build, typecheck, `cargo test`, `cargo clippy -Dwarnings`, macOS + Ubuntu matrix.
- ✨ `CHANGELOG.md`, issue/PR templates, `CODEOWNERS`.
- 🔧 Pre-commit / lint config (ESLint + Prettier for TS; rustfmt + clippy for Rust).

## M2 — Persistence & session UX

_Goal: the app remembers you._

- ⭐ Persist settings (theme, fonts, toggles) to disk via `tauri-plugin-store` or an app-config file.
- ⭐ Reopen last workspace on launch + a "Recent folders" list on onboarding.
- ✨ Persist window size/position.
- ✨ Persist open tabs / active file per workspace.

## M3 — Robustness & data integrity

_Goal: it won't surprise or lose work._

- 🔧 Graceful binary/non-UTF8 file handling (detect, show a friendly "binary file" view instead of erroring).
- 🔧 Filesystem watching (`notify` crate): reflect external changes, warn on overwrite conflicts.
- 🔧 Incremental tree updates instead of full `reloadTree`; depth/size guard for huge folders.
- 🔧 React error boundary + opt-in crash/log capture.
- 🔧 Frontend test setup (Vitest + Testing Library) covering core flows; expand Rust tests.

## M4 — Terminal & Git completeness

_Goal: the terminal and Git stories are real._

- ⭐ PTY terminal (`portable-pty` + xterm.js): interactive programs and AI CLIs work. Replaces one-shot exec.
- ⭐ GitHub push sign-in (OAuth Device Flow → system credential helper, push-only). No app account.
- 🔧 Git: diff view, discard changes, pull/fetch, branch switch, conflict surfacing.
- ✨ (Optional) multi-repo / per-folder mapping if validated with users.

## M5 — Packaging, signing & release

_Goal: anyone can download and run it._

- 🚫 Real app icons replacing the stock Tauri logo.
- 🚫 macOS code signing + notarization in the build.
- 🚫 Linux bundles (.deb/.rpm/.AppImage) built on old glibc; document WebKitGTK runtime dep.
- 🚫 `release.yml` (tauri-action): per-OS signed bundles attached to GitHub Releases.
- ⭐ Auto-updater (`tauri-plugin-updater`) + signed update manifest.
- 🔧 Strict CSP; security pass.
- ✨ App menu, About dialog, first-run polish, accessibility pass.

---

## Suggested order

1. **M1** (unblocks everything; cheap).
2. **M2 + M3** in parallel (independent; biggest day-to-day UX wins).
3. **M4** (the two ⭐ features; PTY is the riskiest single item).
4. **M5** last (needs M1 CI + final assets; produces the shippable artifact).

A credible **public 1.0** = M1 + M2 + M3 + M5, with M4's GitHub sign-in. PTY can ship in 1.0 or fast-follow 1.1. The v2 extension system ([EXTENSIONS.md](./EXTENSIONS.md)) is post-1.0.
