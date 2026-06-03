# IWE — Integrated Writing Environment
## Project Brief for Claude Code

---

## What Is IWE?

IWE (Integrated Writing Environment) is a desktop application for **Mac and Linux** that does for writing and knowledge management what VS Code does for coding.

It is NOT just a note-taking app. It is a full **writing IDE** — with a built-in terminal, AI CLI integration, GitHub sync, and an extension system. Think Obsidian meets VS Code, but purpose-built for writers, thinkers, and knowledge workers.

---

## The Problem It Solves

- Note-taking apps (Obsidian, Notion) are great for writing but lack dev-grade tooling
- Developer IDEs (VS Code) are powerful but not designed for writing workflows
- There is no single tool that lets you write, manage knowledge, run AI tools, and publish to GitHub — all in one place
- People want to own their files (plain text/markdown), back them up on GitHub, and manage public vs private knowledge separately

---

## Core Features (v1)

### 1. Markdown Editor
- Clean, distraction-free writing experience
- Live markdown preview
- File tree on the left sidebar (like VS Code explorer)
- Note linking (like Obsidian `[[wikilinks]]`)

### 2. Built-in Terminal
- Toggleable terminal panel (like VS Code's integrated terminal)
- Run any CLI tool from inside the app
- Specifically useful for running AI CLIs (Claude, Codex, etc.)

### 3. GitHub Sync
- Connect multiple GitHub repos (public, private, AI memory, etc.)
- Commit and push from inside the app — no need to open a separate terminal
- Choose which file/folder goes to which repo
- Simple UI panel similar to VS Code's Source Control tab

### 4. Multi-Repo Support
Users can connect and manage multiple repos:
- Public knowledge base repo
- Private notes repo
- AI memory repo (Claude, Codex, etc.)
- Any custom repo they want

### 5. Extension System (v2)
- Plugin/extension marketplace — like VS Code extensions
- Community can build on top of IWE
- Not for coding extensions — for writing workflows (publishing, AI tools, templates, etc.)

---

## Tech Stack

- **Framework**: Tauri (Rust backend, web frontend) — lightweight, fast, Mac + Linux native
- **Frontend**: React + TypeScript
- **Editor**: CodeMirror or Monaco Editor (markdown mode)
- **Terminal**: xterm.js (embedded terminal)
- **GitHub Integration**: GitHub REST API + libgit2 (via Tauri/Rust)
- **Styling**: Tailwind CSS

---

## Design Philosophy

- Dark theme by default (like VS Code)
- Three-panel layout: File Tree | Editor | (optional) Preview/Terminal
- Clean, minimal, no clutter
- Power user friendly — keyboard shortcuts for everything
- Feels like a professional tool, not a consumer app

---

## What IWE Is NOT

- Not a coding IDE (no debugger, no language servers, no code execution beyond terminal)
- Not a cloud app (everything is local, GitHub is just the sync layer)
- Not trying to replace Obsidian entirely — it's the next step for power users who want more control

---

## Project Structure (Proposed)

```
IWE/
├── src-tauri/          # Rust backend (Tauri)
│   ├── src/
│   │   └── main.rs
│   └── Cargo.toml
├── src/                # React frontend
│   ├── components/
│   │   ├── Editor/
│   │   ├── FileTree/
│   │   ├── Terminal/
│   │   └── GitPanel/
│   ├── App.tsx
│   └── main.tsx
├── public/
├── CLAUDE.md           # This file
├── DESIGN.md           # UI/UX design spec
├── package.json
└── README.md
```

---

## How To Work On This Project

- Always read `DESIGN.md` for UI decisions
- Build features incrementally — get one thing working before moving to the next
- Keep the editor as the core — everything else is a panel around it
- Prioritize Mac and Linux compatibility at all times
- Ask for clarification before making major architectural decisions

---

## Current Status

🟡 Planning phase — no code written yet. Start from scratch.

### First Milestone
Get a basic working shell:
- [ ] Tauri app boots on Mac and Linux
- [ ] File tree loads a local folder
- [ ] Markdown editor opens and saves files
- [ ] Basic dark theme applied