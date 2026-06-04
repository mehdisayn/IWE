# Extension System (v2 — design)

IWE's v2 differentiator is an extension system for **writing workflows** (publishing, exporters, templates, linters, AI helpers) — not coding tooling. This document records the strategy so v1 decisions don't paint us into a corner.

## Strategy: reuse, don't reinvent

Building a marketplace, packaging format, and review pipeline from scratch is a multi-year effort. Instead, **adopt the VS Code extension model and the Open VSX registry**:

- **Open VSX** (open-vsx.org) is the vendor-neutral, openly licensed registry that VS Code-compatible editors (VSCodium, Gitpod, Theia, Cursor) already use. It avoids the Microsoft Marketplace's terms-of-use restriction that forbids non-Microsoft products.
- Extensions are standard `.vsix` packages with a `package.json` manifest and `contributes` points.
- We expose a **curated subset** of the VS Code extension API surface relevant to writing — not the whole thing.

## What we adopt vs. constrain

| Adopt                                                                   | Constrain / defer                                              |
| ----------------------------------------------------------------------- | -------------------------------------------------------------- |
| `.vsix` package format + manifest                                       | No debug adapter, no language-server protocol (not a code IDE) |
| Open VSX as the registry/backend                                        | Tasks, terminal, notebooks APIs: defer                         |
| Activation events, `contributes` (commands, menus, keybindings, themes) | Curated permission prompts per capability                      |
| Extension host running extension JS off the UI thread                   | No arbitrary native code; FS/network via brokered APIs         |

## Architecture sketch

```
UI (webview)  ──▶  Extension Host (separate JS context / worker)
                      │  curated `iwe.*` API (commands, editor, fs-broker, ui)
                      ▼
                  Rust broker  ──▶  capability-checked FS / git / network
```

- The host runs extension code in an isolated context so a bad extension can't crash the editor.
- All privileged actions (file write, network, shell) go through the same Rust trust boundary as the core app, with per-extension capability prompts (see [SECURITY.md](./SECURITY.md)).

## Editor consideration

The current editor is a textarea + highlight overlay. If we want richer extension support (decorations, multi-cursor, language features), migrating the editor to **CodeMirror 6** (lighter, web-native) or **Monaco** (the VS Code editor; heavier, best API parity) becomes relevant. Decision deferred to the v2 milestone; CodeMirror 6 is the current lean.

## v1 implications (do now)

- Keep IPC commands small and capability-scoped so the future broker can wrap them.
- Keep theming in CSS variables (already done) so theme extensions are trivial.
- Don't hard-code command lists in the UI in a way that blocks dynamic (extension-contributed) commands later — the command palette already takes a `Command[]`.

This milestone is **post-1.0** and intentionally out of the launch scope.
