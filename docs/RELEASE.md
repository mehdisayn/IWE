# Release & Distribution

How to turn the source into a signed, installable app on macOS and Linux. None of this is configured yet — this is the spec the release tasks implement.

## 0. Pre-release checklist

- [ ] Real app icons in `src-tauri/icons/` (replace stock Tauri logo) — `npm run tauri icon path/to/icon.png` regenerates every size.
- [ ] `LICENSE` at repo root and `license` field in `Cargo.toml` + `package.json`.
- [ ] Version bumped in `package.json`, `tauri.conf.json`, and `Cargo.toml` (keep in sync).
- [ ] `CHANGELOG.md` entry.
- [ ] `cargo test`, `npm run build`, `cargo clippy` all green.

## 1. macOS — sign & notarize

Distributing unsigned bundles is the #1 launch blocker: Gatekeeper refuses them.

**Requirements**: Apple Developer Program membership ($99/yr), a _Developer ID Application_ certificate.

`tauri.conf.json` → `bundle.macOS`:

```json
"macOS": {
  "signingIdentity": "Developer ID Application: Your Name (TEAMID)",
  "entitlements": "src-tauri/entitlements.plist",
  "minimumSystemVersion": "11.0"
}
```

Notarization (env vars consumed by `tauri build`):

```bash
export APPLE_ID="you@example.com"
export APPLE_PASSWORD="app-specific-password"   # appleid.apple.com → App-Specific Passwords
export APPLE_TEAM_ID="TEAMID"
npm run tauri:build      # signs, notarizes, and staples the .app/.dmg
```

Verify: `spctl -a -vvv "IWE.app"` should report `accepted / Notarized Developer ID`.

## 2. Linux

`bundle.targets` already = `all`; on Linux that yields `.deb`, `.rpm`, and `.AppImage`.

- Build on the **oldest** glibc you intend to support (build in an Ubuntu 22.04 container for broad compatibility).
- AppImage is the most portable single-file artifact.
- Linux deps at runtime: WebKitGTK 4.1. Document this in install notes.
- (Optional) Flatpak/Snap as a follow-up.

## 3. Auto-update (`tauri-plugin-updater`)

1. Add the `updater` plugin and a signing keypair (`tauri signer generate`). Keep the **private key secret** (CI secret); ship the public key in `tauri.conf.json`.
2. Host a `latest.json` manifest + signed artifacts (GitHub Releases works).
3. App checks on launch and prompts to install. Gate behind a setting.

## 4. CI/CD (GitHub Actions)

Two workflows under `.github/workflows/`:

- **`ci.yml`** (on PR/push): `npm ci`, `npm run build`, `npm run typecheck`, `cargo test`, `cargo clippy -- -D warnings`. Matrix: macOS + Ubuntu.
- **`release.yml`** (on tag `v*`): use `tauri-apps/tauri-action` to build per-OS bundles, sign/notarize (secrets), and attach to a GitHub Release with the updater manifest.

Required repo secrets: `APPLE_ID`, `APPLE_PASSWORD`, `APPLE_TEAM_ID`, `APPLE_CERTIFICATE` (base64 .p12), `APPLE_CERTIFICATE_PASSWORD`, `TAURI_SIGNING_PRIVATE_KEY`, `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`.

## 5. Versioning

Semantic versioning. `0.x` while pre-1.0. Tag releases `vMAJOR.MINOR.PATCH`; the tag triggers `release.yml`.
