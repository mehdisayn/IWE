# Release & Distribution

How to turn the source into a signed, installable app on macOS and Linux. The
pipeline is implemented: [`release.yml`](../.github/workflows/release.yml) builds,
signs, and publishes on a `v*` tag. The only thing left to a maintainer is to
provide the credentials below (Secrets) — see [§6](#6-required-repo-secrets).

## 0. Pre-release checklist

- [x] Real app icons in `src-tauri/icons/` — regenerate with `npm run tauri icon src-tauri/app-icon.svg`.
- [x] `LICENSE` at repo root and `license` field in `Cargo.toml` + `package.json`.
- [ ] Version bumped in `package.json`, `tauri.conf.json`, `Cargo.toml`, **and** `APP_VERSION` in `src/App.tsx` (keep in sync).
- [ ] `CHANGELOG.md` entry.
- [ ] `npm run typecheck && npm run test && npm run build`, `cargo test`, `cargo clippy -- -D warnings` all green.
- [ ] Updater public key in `tauri.conf.json` matches the private key in CI secrets ([§3](#3-auto-update-tauri-plugin-updater)).

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

The plugin is wired and the config (`tauri.conf.json` → `plugins.updater`) points
at the GitHub "latest.json" endpoint. **`release.yml` enables updater artifacts**
(`--config {"bundle":{"createUpdaterArtifacts":true}}`) and `includeUpdaterJson`
publishes the manifest — so a normal local `tauri build` stays fast/unsigned.

One-time maintainer setup:

```bash
npm run tauri signer generate -- -w ~/.tauri/iwe.key   # prompts for a password
```

1. Copy the printed **public key** into `tauri.conf.json` → `plugins.updater.pubkey`
   (replacing the committed placeholder).
2. Add the **private key** + its password as the CI secrets `TAURI_SIGNING_PRIVATE_KEY`
   and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`. Never commit the private key.

In-app: Help → **Check for Updates** (also in the command palette) checks, installs,
and relaunches.

## 4. CI/CD (GitHub Actions)

Two workflows under `.github/workflows/`:

- **`ci.yml`** (on PR/push): lint, format check, typecheck, `npm run test`, `npm run build`; Rust `fmt`/`clippy -D warnings`/`test` on macOS + Ubuntu.
- **`release.yml`** (on tag `v*` or manual dispatch): `tauri-apps/tauri-action` builds macOS (aarch64 + x86_64) and Linux (`.deb`/`.rpm`/`.AppImage`) bundles, signs/notarizes when secrets are present, and attaches them to a **draft** GitHub Release with the updater manifest.

## 5. Cutting a release

```bash
# bump versions first (see checklist §0), commit, then:
git tag v0.1.0
git push origin v0.1.0     # triggers release.yml → draft Release with assets
```

Review the draft Release, then publish it. `latest.json` resolves to the latest
published release, so the updater only sees published (not draft) builds.

## 6. Required repo secrets

Until these are set, builds still succeed but are **unsigned** (macOS Gatekeeper
will warn, and the updater won't have signed artifacts).

| Secret                                          | Purpose                                                  |
| ----------------------------------------------- | -------------------------------------------------------- |
| `TAURI_SIGNING_PRIVATE_KEY`                     | Updater artifact signing (from `tauri signer generate`). |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`            | Password for the above.                                  |
| `APPLE_CERTIFICATE`                             | Base64 of the _Developer ID Application_ `.p12`.         |
| `APPLE_CERTIFICATE_PASSWORD`                    | Password for the `.p12`.                                 |
| `APPLE_SIGNING_IDENTITY`                        | e.g. `Developer ID Application: Name (TEAMID)`.          |
| `APPLE_ID` / `APPLE_PASSWORD` / `APPLE_TEAM_ID` | Notarization (app-specific password).                    |

GitHub push sign-in (separate from releases) needs a GitHub OAuth App; set its
client id as `IWE_GITHUB_CLIENT_ID` (build env or runtime) — see [SECURITY.md](./SECURITY.md).

## 7. Versioning

Semantic versioning. `0.x` while pre-1.0. Tag releases `vMAJOR.MINOR.PATCH`; the tag triggers `release.yml`.
