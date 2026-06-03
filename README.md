# IWE — Integrated Writing Environment

A markdown workspace with a built-in terminal and Git, for people who write.

This repo currently contains the **frontend implementation** of the design — the full v1 app shell ported from the Claude Design prototype into typed React + Vite. All data is mocked (sample manuscript vault "The Salt Road"). Real OS integrations (filesystem, libgit2, PTY terminal) will be added when the Tauri shell is wired up.

## Stack

- **Vite + React 18 + TypeScript** — frontend
- **Tauri (planned)** — desktop shell. Not yet scaffolded; requires installing Rust via `rustup` first. The web frontend in `src/` will become the Tauri webview as-is.
- **Tailwind (planned)** — not added. The design uses a thorough theme-variable CSS system (`src/styles/iwe.css`, three themes via `[data-theme]`); Tailwind utilities can be layered in later when building net-new UI.

## Run

```bash
npm install
npm run dev      # http://localhost:1420
npm run build
```

## Layout

```
src/
├── App.tsx                       # orchestrator: state, shortcuts, layout
├── main.tsx                      # React entrypoint
├── types.ts                      # shared types (Vault, GitState, TweakState, etc.)
├── styles/iwe.css                # full theme system + component styles
├── data/vault.ts                 # mock manuscript vault
├── lib/markdown.ts               # markdown render + syntax-highlight overlay
└── components/
    ├── Icon.tsx                  # stroke icon set
    ├── ActivityRail.tsx          # left-most icon rail
    ├── Sidebar.tsx               # file tree + repo selector
    ├── GitPanel.tsx              # source control panel
    ├── Terminal.tsx              # mock zsh terminal with tabs
    ├── Dashboard.tsx             # workspace dashboard
    ├── editor/
    │   ├── Tabs.tsx
    │   ├── EditorToolbar.tsx     # breadcrumbs + edit/preview/split segmented
    │   ├── CodeEditor.tsx        # textarea + highlight overlay + wikilink autocomplete
    │   ├── Preview.tsx           # rendered markdown
    │   └── StatusBar.tsx         # word count, caret, sync status
    └── overlays/
        ├── Palette.tsx           # command palette (⌘⇧P) + quick switcher (⌘P)
        ├── ContextMenu.tsx       # file tree right-click
        ├── RepoMenu.tsx          # repo dropdown
        ├── Settings.tsx          # settings tab
        ├── Onboarding.tsx        # first-launch screen
        └── PromptModal.tsx       # small input modal for rename/new/delete
```

## Keyboard shortcuts

| Action | Shortcut |
| --- | --- |
| Toggle sidebar | `⌘B` |
| Toggle terminal | `` ⌘` `` |
| Toggle source control | `⌘⇧G` |
| Command palette | `⌘⇧P` |
| Quick file switcher | `⌘P` |
| Switch edit/preview/split | `⌘⇧V` |
| New note | `⌘N` |
| Save | `⌘S` |
| Settings | `⌘,` |

## Themes

Three themes ship in the CSS, switchable from Settings or the command palette:

- **Soft Slate** — VS Code-style dark grey (default)
- **True Terminal** — green-on-black, monospace UI
- **Warm Ink** — warm brown/cream, more reading-oriented

## Next steps

1. **Tauri shell** — `npm create tauri-app` to add `src-tauri/`; wire `cmd_open_folder`, `cmd_read_file`, `cmd_write_file`.
2. **Real markdown editor** — swap `CodeEditor.tsx` for CodeMirror 6 with markdown grammar.
3. **Real terminal** — replace the mock command runner with `xterm.js` + a PTY bridge from Rust.
4. **Real git** — replace mock `GitState` with `libgit2` (via `git2` crate) or `gh` shell-outs.
5. **Multi-repo sync** — per-folder repo mapping as described in `plan/idea.md`.

## Design source

The prototype this implementation matches lives at `/tmp/iwe-design/` (unpacked from the Claude Design handoff bundle). See `plan/idea.md` for the product brief.
