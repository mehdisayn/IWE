# Security Model

## Principles

- **No application account.** IWE stores no user credentials of its own and has no login. The only sign-in is GitHub, and only to authorize `git push`.
- **The Rust backend is the trust boundary.** The webview is treated as untrusted input; every path it sends is validated before touching disk.
- **Least privilege via Tauri capabilities.** The webview can only call the commands explicitly registered and the permissions granted in `capabilities/`.

## Filesystem confinement

All file commands operate relative to the user-opened workspace `root`. `fs_cmds::resolve(root, rel)`:

1. Joins `root` + `rel`.
2. Canonicalizes both `root` and the target's parent (resolving symlinks).
3. Rejects the call if the canonical target is **not** within the canonical root.

This blocks `../../etc/hosts`-style traversal (covered by a passing test). New file commands **must** route through `resolve()`.

## Capabilities

`src-tauri/capabilities/default.json` currently grants:

- `core:default`
- `dialog:default` (folder picker)

Add the minimum permission when introducing a plugin (updater, fs-watch, shell). Do not grant broad `fs`/`shell` scopes; the app's own commands already mediate disk and shell access.

## Terminal / command execution

`run_command` executes arbitrary shell commands in the workspace cwd via `$SHELL -lc`. This is **intentional** — it's an integrated terminal — and runs with the user's own privileges, exactly as if they typed it in Terminal.app. It is not a sandbox escape because the user already has shell access. The PTY upgrade (roadmap) keeps the same trust model.

## GitHub credentials (push)

- Today: `git push` uses whatever the system git credential helper already has (HTTPS token, SSH key, Keychain). IWE adds nothing.
- Planned "Sign in to GitHub" (push-only): **OAuth Device Flow**. IWE never sees a password. The resulting token is handed to the **system git credential helper** (e.g. `osxkeychain`) — IWE does not store it itself. Scope limited to `repo`. This is the _only_ sanctioned credential flow.

## Content Security Policy

`tauri.conf.json` → `app.security.csp` is a strict, allow-list policy:

- `default-src 'self'` — nothing loads cross-origin by default.
- `script-src 'self'` — no inline or remote scripts; rules out injected `<script>`
  and `eval`. (The markdown renderer only ever emits anchors/spans via `innerHTML`,
  never executable content.)
- `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com` — inline styles
  (React `style` props, themed CSS vars) plus the Google Fonts stylesheet.
- `font-src 'self' https://fonts.gstatic.com` — the bundled UI/mono fonts.
- `connect-src 'self' ipc: http://ipc.localhost` — only the Tauri IPC bridge.
- `object-src 'none'`, `frame-src 'none'`, `base-uri 'self'`, `form-action 'self'`.

A separate `devCsp` additionally allows `'unsafe-eval'` and the Vite HMR websocket
(`ws://localhost:1420`) so `tauri dev` works; production never gets those.

> Future hardening: self-host the IBM Plex / JetBrains Mono fonts to drop the two
> `fonts.g*` origins and make the policy fully `'self'` (also enables offline use).

## Reporting

Security issues: open a private advisory on the GitHub repo (`Security` tab) rather than a public issue.
