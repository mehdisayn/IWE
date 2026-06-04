// Real Git integration by shelling out to the system `git` binary in the
// workspace root. Keeps the dependency surface small (no libgit2 build) and
// mirrors what the user would run in the integrated terminal.

use serde::Serialize;
use std::collections::HashMap;
use std::process::Command;

#[derive(Debug, Serialize, Clone)]
pub struct GitChange {
    pub path: String,
    pub status: String, // "M" | "A" | "D"
    pub staged: bool,
    pub conflicted: bool,
    pub add: u32,
    pub del: u32,
}

#[derive(Debug, Serialize, Clone)]
pub struct GitStatus {
    pub is_repo: bool,
    pub branch: String,
    pub ahead: u32,
    pub behind: u32,
    pub changes: Vec<GitChange>,
}

#[derive(Debug, Serialize, Clone)]
pub struct BranchInfo {
    pub name: String,
    pub current: bool,
}

#[derive(Debug, Serialize, Clone)]
pub struct GitCommandResult {
    pub ok: bool,
    pub stdout: String,
    pub stderr: String,
}

fn git(root: &str, args: &[&str]) -> Result<GitCommandResult, String> {
    let out = Command::new("git")
        .args(args)
        .current_dir(root)
        .output()
        .map_err(|e| format!("failed to run git: {}", e))?;
    Ok(GitCommandResult {
        ok: out.status.success(),
        stdout: String::from_utf8_lossy(&out.stdout).into_owned(),
        stderr: String::from_utf8_lossy(&out.stderr).into_owned(),
    })
}

/// Map a single porcelain status char to our coarse M/A/D.
fn map_code(c: char) -> &'static str {
    match c {
        'A' => "A",
        'D' => "D",
        '?' => "A", // untracked => shows as added
        _ => "M",   // M, R, C, U, etc.
    }
}

/// Collect per-path line counts from a `git diff --numstat` invocation.
fn numstat(root: &str, cached: bool) -> HashMap<String, (u32, u32)> {
    let mut map = HashMap::new();
    let mut args = vec!["diff", "--numstat"];
    if cached {
        args.push("--cached");
    }
    if let Ok(res) = git(root, &args) {
        for line in res.stdout.lines() {
            let mut parts = line.split('\t');
            let add = parts
                .next()
                .and_then(|s| s.parse::<u32>().ok())
                .unwrap_or(0);
            let del = parts
                .next()
                .and_then(|s| s.parse::<u32>().ok())
                .unwrap_or(0);
            if let Some(path) = parts.next() {
                map.insert(path.to_string(), (add, del));
            }
        }
    }
    map
}

#[tauri::command]
pub fn git_status(root: String) -> Result<GitStatus, String> {
    // Is this even a git repo?
    let inside = git(&root, &["rev-parse", "--is-inside-work-tree"])?;
    if !inside.ok {
        return Ok(GitStatus {
            is_repo: false,
            branch: String::new(),
            ahead: 0,
            behind: 0,
            changes: vec![],
        });
    }

    let branch = git(&root, &["rev-parse", "--abbrev-ref", "HEAD"])?
        .stdout
        .trim()
        .to_string();

    // Commits ahead of / behind upstream (0 if no upstream configured).
    let ahead = git(&root, &["rev-list", "--count", "@{u}..HEAD"])
        .ok()
        .filter(|r| r.ok)
        .and_then(|r| r.stdout.trim().parse::<u32>().ok())
        .unwrap_or(0);
    let behind = git(&root, &["rev-list", "--count", "HEAD..@{u}"])
        .ok()
        .filter(|r| r.ok)
        .and_then(|r| r.stdout.trim().parse::<u32>().ok())
        .unwrap_or(0);

    let unstaged = numstat(&root, false);
    let staged_stats = numstat(&root, true);

    let porcelain = git(&root, &["status", "--porcelain=v1"])?;
    let mut changes = Vec::new();
    for line in porcelain.stdout.lines() {
        if line.len() < 3 {
            continue;
        }
        let bytes: Vec<char> = line.chars().collect();
        let index = bytes[0];
        let worktree = bytes[1];
        let path = line[3..].trim().to_string();
        // `R old -> new` rename form: keep the new name.
        let path = path
            .split(" -> ")
            .last()
            .unwrap_or(&path)
            .trim_matches('"')
            .to_string();

        // Merge conflicts: either side shows 'U', or both sides are identical
        // add/delete markers (AA / DD). These aren't simply staged/unstaged.
        let conflicted = index == 'U'
            || worktree == 'U'
            || (index == worktree && (index == 'A' || index == 'D'));

        let is_staged = !conflicted && index != ' ' && index != '?';
        let code = if is_staged { index } else { worktree };
        let (add, del) = if is_staged {
            staged_stats.get(&path).copied().unwrap_or((0, 0))
        } else {
            unstaged.get(&path).copied().unwrap_or((0, 0))
        };
        changes.push(GitChange {
            path,
            status: map_code(code).to_string(),
            staged: is_staged,
            conflicted,
            add,
            del,
        });
    }

    Ok(GitStatus {
        is_repo: true,
        branch,
        ahead,
        behind,
        changes,
    })
}

#[tauri::command]
pub fn git_stage(root: String, path: String) -> Result<(), String> {
    let res = git(&root, &["add", "--", &path])?;
    if res.ok {
        Ok(())
    } else {
        Err(res.stderr)
    }
}

#[tauri::command]
pub fn git_stage_all(root: String) -> Result<(), String> {
    let res = git(&root, &["add", "-A"])?;
    if res.ok {
        Ok(())
    } else {
        Err(res.stderr)
    }
}

#[tauri::command]
pub fn git_unstage(root: String, path: String) -> Result<(), String> {
    // `restore --staged` on modern git; fall back to `reset` for old versions.
    let res = git(&root, &["restore", "--staged", "--", &path])?;
    if res.ok {
        return Ok(());
    }
    let res = git(&root, &["reset", "HEAD", "--", &path])?;
    if res.ok {
        Ok(())
    } else {
        Err(res.stderr)
    }
}

#[tauri::command]
pub fn git_commit(root: String, message: String) -> Result<String, String> {
    if message.trim().is_empty() {
        return Err("Empty commit message".into());
    }
    let res = git(&root, &["commit", "-m", &message])?;
    if res.ok {
        Ok(res.stdout)
    } else {
        Err(if res.stderr.is_empty() {
            res.stdout
        } else {
            res.stderr
        })
    }
}

#[tauri::command]
pub fn git_push(root: String) -> Result<String, String> {
    let res = git(&root, &["push"])?;
    if res.ok {
        // git prints push progress to stderr even on success.
        Ok(format!("{}{}", res.stdout, res.stderr))
    } else {
        Err(res.stderr)
    }
}

#[tauri::command]
pub fn git_log(root: String) -> Result<String, String> {
    let res = git(&root, &["log", "--oneline", "-n", "30"])?;
    if res.ok {
        Ok(res.stdout)
    } else {
        Err(res.stderr)
    }
}

/// Is `path` tracked by git in this repo?
fn is_tracked(root: &str, path: &str) -> bool {
    git(root, &["ls-files", "--error-unmatch", "--", path])
        .map(|r| r.ok)
        .unwrap_or(false)
}

/// Unified diff for a single path. `staged` shows the index-vs-HEAD diff;
/// otherwise the worktree diff. Untracked files are shown as all-additions.
#[tauri::command]
pub fn git_diff(root: String, path: String, staged: bool) -> Result<String, String> {
    if !staged && !is_tracked(&root, &path) {
        // `--no-index` exits non-zero when files differ but still prints the diff.
        let res = git(&root, &["diff", "--no-index", "--", "/dev/null", &path])?;
        return Ok(res.stdout);
    }
    let mut args = vec!["diff"];
    if staged {
        args.push("--cached");
    }
    args.push("--");
    args.push(&path);
    let res = git(&root, &args)?;
    if res.ok {
        Ok(res.stdout)
    } else {
        Err(res.stderr)
    }
}

/// Discard local changes to a path: unstage + restore tracked files, or delete
/// untracked ones. Destructive — the UI must confirm first.
#[tauri::command]
pub fn git_discard(root: String, path: String) -> Result<(), String> {
    if is_tracked(&root, &path) {
        // Modern git: restore staged + worktree in one shot.
        let res = git(&root, &["restore", "--staged", "--worktree", "--", &path])?;
        if res.ok {
            return Ok(());
        }
        // Fallback for older git.
        let _ = git(&root, &["reset", "HEAD", "--", &path]);
        let res = git(&root, &["checkout", "--", &path])?;
        if res.ok {
            Ok(())
        } else {
            Err(res.stderr)
        }
    } else {
        let res = git(&root, &["clean", "-fd", "--", &path])?;
        if res.ok {
            Ok(())
        } else {
            Err(res.stderr)
        }
    }
}

/// Fetch all remotes (prune deleted branches). Returns combined output.
#[tauri::command]
pub fn git_fetch(root: String) -> Result<String, String> {
    let res = git(&root, &["fetch", "--all", "--prune"])?;
    if res.ok {
        Ok(format!("{}{}", res.stdout, res.stderr))
    } else {
        Err(res.stderr)
    }
}

/// Fast-forward pull. Fails loudly (rather than creating a merge) when the
/// branches have diverged, so conflicts surface instead of silent merges.
#[tauri::command]
pub fn git_pull(root: String) -> Result<String, String> {
    let res = git(&root, &["pull", "--ff-only"])?;
    if res.ok {
        Ok(format!("{}{}", res.stdout, res.stderr))
    } else {
        Err(if res.stderr.is_empty() {
            res.stdout
        } else {
            res.stderr
        })
    }
}

/// Local branches, with the current one flagged.
#[tauri::command]
pub fn git_branches(root: String) -> Result<Vec<BranchInfo>, String> {
    let current = git(&root, &["rev-parse", "--abbrev-ref", "HEAD"])?
        .stdout
        .trim()
        .to_string();
    let res = git(
        &root,
        &["for-each-ref", "--format=%(refname:short)", "refs/heads"],
    )?;
    if !res.ok {
        return Err(res.stderr);
    }
    Ok(res
        .stdout
        .lines()
        .map(|l| l.trim())
        .filter(|l| !l.is_empty())
        .map(|name| BranchInfo {
            name: name.to_string(),
            current: name == current,
        })
        .collect())
}

/// Switch to an existing local branch. Git itself refuses if the worktree has
/// conflicting changes, and that error is surfaced to the user.
#[tauri::command]
pub fn git_checkout(root: String, branch: String) -> Result<(), String> {
    let res = git(&root, &["checkout", &branch])?;
    if res.ok {
        Ok(())
    } else {
        Err(res.stderr)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn setup_repo() -> String {
        let n = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let dir =
            std::env::temp_dir().join(format!("iwe_git_{:?}_{}", std::thread::current().id(), n));
        fs::create_dir_all(&dir).unwrap();
        let root = dir.canonicalize().unwrap().to_string_lossy().into_owned();
        // init + identity so commits succeed in CI-less environments
        git(&root, &["init", "-q"]).unwrap();
        git(&root, &["config", "user.email", "test@iwe.app"]).unwrap();
        git(&root, &["config", "user.name", "IWE Test"]).unwrap();
        git(&root, &["checkout", "-q", "-b", "main"]).ok();
        root
    }

    #[test]
    fn non_repo_reports_not_a_repo() {
        let n = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let dir =
            std::env::temp_dir().join(format!("iwe_nogit_{:?}_{}", std::thread::current().id(), n));
        fs::create_dir_all(&dir).unwrap();
        let root = dir.canonicalize().unwrap().to_string_lossy().into_owned();
        let st = git_status(root.clone()).unwrap();
        assert!(!st.is_repo);
        fs::remove_dir_all(root).ok();
    }

    #[test]
    fn full_status_stage_commit_flow() {
        let root = setup_repo();

        // First commit so HEAD exists.
        fs::write(format!("{}/a.md", root), "alpha\n").unwrap();
        git_stage_all(root.clone()).unwrap();
        git_commit(root.clone(), "init".into()).unwrap();

        let st = git_status(root.clone()).unwrap();
        assert!(st.is_repo);
        assert_eq!(st.branch, "main");
        assert_eq!(st.changes.len(), 0, "clean tree after commit");

        // Modify a tracked file + add a new untracked one.
        fs::write(format!("{}/a.md", root), "alpha\nbeta\n").unwrap();
        fs::write(format!("{}/b.md", root), "new file\n").unwrap();

        let st = git_status(root.clone()).unwrap();
        let paths: Vec<&str> = st.changes.iter().map(|c| c.path.as_str()).collect();
        assert!(paths.contains(&"a.md"));
        assert!(paths.contains(&"b.md"));
        let a = st.changes.iter().find(|c| c.path == "a.md").unwrap();
        assert_eq!(a.status, "M");
        assert!(!a.staged);

        // Stage b.md and confirm it flips to staged.
        git_stage(root.clone(), "b.md".into()).unwrap();
        let st = git_status(root.clone()).unwrap();
        let b = st.changes.iter().find(|c| c.path == "b.md").unwrap();
        assert!(b.staged, "b.md should be staged");

        // Commit everything, tree goes clean.
        git_stage_all(root.clone()).unwrap();
        git_commit(root.clone(), "second".into()).unwrap();
        let st = git_status(root.clone()).unwrap();
        assert_eq!(st.changes.len(), 0);

        let log = git_log(root.clone()).unwrap();
        assert!(log.contains("init") && log.contains("second"));

        fs::remove_dir_all(root).ok();
    }

    #[test]
    fn diff_shows_changes_and_untracked() {
        let root = setup_repo();
        fs::write(format!("{}/a.md", root), "one\n").unwrap();
        git_stage_all(root.clone()).unwrap();
        git_commit(root.clone(), "init".into()).unwrap();

        // Modify tracked file → worktree diff mentions the new line.
        fs::write(format!("{}/a.md", root), "one\ntwo\n").unwrap();
        let d = git_diff(root.clone(), "a.md".into(), false).unwrap();
        assert!(d.contains("+two"), "diff should include the added line");

        // Untracked file → shown as all additions.
        fs::write(format!("{}/new.md", root), "fresh\n").unwrap();
        let d = git_diff(root.clone(), "new.md".into(), false).unwrap();
        assert!(d.contains("+fresh"), "untracked diff should show additions");

        fs::remove_dir_all(root).ok();
    }

    #[test]
    fn discard_reverts_tracked_and_removes_untracked() {
        let root = setup_repo();
        fs::write(format!("{}/a.md", root), "one\n").unwrap();
        git_stage_all(root.clone()).unwrap();
        git_commit(root.clone(), "init".into()).unwrap();

        fs::write(format!("{}/a.md", root), "DIRTY\n").unwrap();
        git_discard(root.clone(), "a.md".into()).unwrap();
        assert_eq!(
            fs::read_to_string(format!("{}/a.md", root)).unwrap(),
            "one\n"
        );

        fs::write(format!("{}/junk.md", root), "x\n").unwrap();
        git_discard(root.clone(), "junk.md".into()).unwrap();
        assert!(!std::path::Path::new(&format!("{}/junk.md", root)).exists());

        fs::remove_dir_all(root).ok();
    }

    #[test]
    fn branches_list_and_checkout() {
        let root = setup_repo();
        fs::write(format!("{}/a.md", root), "one\n").unwrap();
        git_stage_all(root.clone()).unwrap();
        git_commit(root.clone(), "init".into()).unwrap();

        git(&root, &["branch", "draft"]).unwrap();
        let branches = git_branches(root.clone()).unwrap();
        let names: Vec<&str> = branches.iter().map(|b| b.name.as_str()).collect();
        assert!(names.contains(&"main") && names.contains(&"draft"));
        assert!(branches.iter().find(|b| b.name == "main").unwrap().current);

        git_checkout(root.clone(), "draft".into()).unwrap();
        let st = git_status(root.clone()).unwrap();
        assert_eq!(st.branch, "draft");

        fs::remove_dir_all(root).ok();
    }
}
