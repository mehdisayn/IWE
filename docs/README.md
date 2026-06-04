# IWE Documentation

Engineering and product documentation for **IWE — Integrated Writing Environment**, a Tauri + React desktop app: a markdown workspace with a built-in terminal and Git, for writers.

> Status: **Working MVP / pre-release alpha.** Runs from source on macOS. Not yet packaged, signed, or distributed. See [SYSTEM_ANALYSIS.md](./SYSTEM_ANALYSIS.md) for the honest current-state assessment and [ROADMAP.md](./ROADMAP.md) for the path to a public 1.0.

## Index

| Doc                                        | What it covers                                                           |
| ------------------------------------------ | ------------------------------------------------------------------------ |
| [SYSTEM_ANALYSIS.md](./SYSTEM_ANALYSIS.md) | Professional audit: metrics, what works, gaps, risks, readiness verdict. |
| [ARCHITECTURE.md](./ARCHITECTURE.md)       | How the app is built — processes, layers, state model, data flow.        |
| [IPC_API.md](./IPC_API.md)                 | Reference for the 17 Rust ⇄ JS commands (the backend contract).          |
| [DEVELOPMENT.md](./DEVELOPMENT.md)         | Prerequisites, install, run, test, project conventions.                  |
| [RELEASE.md](./RELEASE.md)                 | Packaging, code signing, notarization, Linux builds, auto-update.        |
| [SECURITY.md](./SECURITY.md)               | Capability model, filesystem guards, threat model, GitHub credentials.   |
| [EXTENSIONS.md](./EXTENSIONS.md)           | v2 plugin system design and Open VSX / VS Code marketplace strategy.     |
| [ROADMAP.md](./ROADMAP.md)                 | Milestones M1–M5 from alpha to 1.0, mapped to the tracked task list.     |
| [CONTRIBUTING.md](./CONTRIBUTING.md)       | Branching, commits, code style, PR + review flow.                        |

## Product principles

1. **Your files, your disk.** Plain markdown on the local filesystem. GitHub is a sync layer, never the source of truth.
2. **No account to use the app.** IWE has no login. The only sign-in is **GitHub, and only to authorize `git push`.**
3. **AI lives in the terminal.** IWE does not embed an AI provider. Users run AI CLIs (Claude Code, etc.) in the integrated terminal.
4. **Editor is the core.** Everything else — tree, terminal, Git, dashboard — is a panel around the writing surface.
5. **Mac and Linux first.** No web/cloud runtime.
