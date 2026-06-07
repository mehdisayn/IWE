# Issue: GitHub Sync is Failing / Hanging

## User Flow
1. The user opens a local folder that is a Git repository.
2. The user makes changes, saves files, and stages/commits them via the "Source Control" panel.
3. The user clicks "Push" (or uses the "Sync" action in the dashboard) to sync changes to GitHub.
4. The frontend calls `gitApi.push(root)`, which invokes the Tauri backend command `git_push`.
5. The backend executes `git push` via `std::process::Command::new("git").args(["push"])`.

## Why it is not working
- **Authentication blocking:** If pushing to GitHub requires interactive authentication (e.g., prompting for an SSH passphrase, username/password, or a Personal Access Token), `git push` expects a terminal (PTY) to ask the user. Since `std::process::Command` runs in the background without a PTY or standard input attached, the command will either hang indefinitely waiting for input, or immediately fail with a "could not read Username / Password" error.
- **No upstream branch:** If the user created a new local branch, simply running `git push` will fail because there is no upstream tracking branch set. Git normally requires `git push -u origin <branch>` the first time.
- **No ssh-agent environment:** Since the Tauri app may not inherit the full terminal environment (like `SSH_AUTH_SOCK`) when launched via desktop shortcuts, SSH-based pushes might fail even if the terminal would succeed.

## Proposed Solutions
1. **Handle Authentication:** Integrate a Git credential manager or allow users to input a GitHub token in the App Settings, then pass it via the repository URL (e.g., `https://<token>@github.com/...`). Alternatively, surface the Git error in the UI so the user knows they need to authenticate in a real terminal first.
2. **Upstream Branch Handling:** Detect if the push fails due to no upstream, and automatically try `git push -u origin <branch_name>` if an `origin` remote exists.
3. **Use libgit2 (optional):** Switch from shelling out to `git` to using `git2-rs` with explicit callback support for SSH keys and credentials.
