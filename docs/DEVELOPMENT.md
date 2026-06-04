# Development

## Prerequisites

| Tool                | Version used      | Install                      |
| ------------------- | ----------------- | ---------------------------- |
| Node.js             | 22.x              | nodejs.org / nvm             |
| Rust                | 1.96 (min 1.77.2) | `rustup`                     |
| Xcode CLT (macOS)   | —                 | `xcode-select --install`     |
| System deps (Linux) | —                 | WebKitGTK, see Tauri prereqs |

Tauri's own prerequisites: https://tauri.app/start/prerequisites/

## Setup

```bash
git clone https://github.com/mehdisayn/IWE.git
cd IWE
npm install
```

## Run

```bash
npm run tauri:dev     # desktop app (real filesystem, git, terminal) — use this
npm run dev           # browser only; shows the "desktop app required" screen (no FS)
```

The first `tauri:dev` compiles the Rust crate (~1 min cold; seconds thereafter).

## Build

```bash
npm run build         # tsc -b + vite build  → dist/
npm run tauri:build   # full native bundle    → src-tauri/target/release/bundle/
```

## Test & quality gates

```bash
npm run typecheck                 # tsc -b (no emit issues)
cd src-tauri && cargo test        # 8 backend integration tests
cd src-tauri && cargo clippy      # lint (recommended; not yet enforced)
```

Run all three before opening a PR. CI will enforce them once added (roadmap M1).

## Project layout

```
IWE/
├── docs/                 # this documentation
├── index.html            # Vite entry
├── src/                  # React frontend  (see ARCHITECTURE.md)
│   ├── App.tsx           # state + layout orchestrator
│   ├── components/        # UI components
│   ├── lib/tauri.ts      # the ONLY bridge to Rust (see IPC_API.md)
│   ├── lib/markdown.ts   # render + highlight
│   └── styles/iwe.css    # themes + component styles
├── src-tauri/            # Rust backend
│   ├── src/{fs,git,term}_cmds.rs
│   ├── capabilities/     # permission grants
│   ├── tauri.conf.json   # window, bundle, identifier
│   └── Cargo.toml
└── plan/idea.md          # original product brief
```

## Conventions

- **TypeScript strict**; no `any` in new code. Components are function components with explicit prop interfaces.
- **Paths**: relative in the UI; `root` is the single absolute path.
- **All OS access through `src/lib/tauri.ts`** — never call `invoke` directly from a component.
- **Rust**: every command returns `Result<T, String>`; validate paths with `resolve()`; add a `#[cfg(test)]` test.
- **Commit messages**: imperative mood, scoped (e.g. `git: parse rename entries in porcelain`).
