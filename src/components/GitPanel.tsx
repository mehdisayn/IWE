import { useState } from "react";
import { Icon } from "./Icon";
import type { GitChange, GitState } from "../types";

interface GitPanelProps {
  git: GitState;
  msg: string;
  setMsg: (v: string) => void;
  onStage: (path: string) => void;
  onUnstage: (path: string) => void;
  onStageAll: () => void;
  onCommit: () => void;
  onPush: () => void;
  onPull: () => void;
  onFetch: () => void;
  onDiff: (path: string, staged: boolean) => void;
  onDiscard: (c: GitChange) => void;
  onSwitchBranch: (name: string) => void;
  onOpenFile: (path: string) => void;
  folderName: string;
  onRefresh: () => void;
}

function splitName(p: string): { dir: string; name: string } {
  const i = p.lastIndexOf("/");
  return i === -1 ? { dir: "", name: p } : { dir: p.slice(0, i + 1), name: p.slice(i + 1) };
}

interface FileRowProps {
  c: GitChange;
  isStaged: boolean;
  onOpenFile: (p: string) => void;
  onStage: (p: string) => void;
  onUnstage: (p: string) => void;
  onDiff: (path: string, staged: boolean) => void;
  onDiscard: (c: GitChange) => void;
}

function FileRow({ c, isStaged, onOpenFile, onStage, onUnstage, onDiff, onDiscard }: FileRowProps) {
  const { dir, name } = splitName(c.path);
  return (
    <div
      className={"git-file" + (c.conflicted ? " conflicted" : "")}
      onClick={() => onDiff(c.path, isStaged)}
    >
      <span className={"gs " + (c.conflicted ? "U" : c.status)}>
        {c.conflicted ? "!" : c.status}
      </span>
      <span className="name">
        {name.replace(/\.md$/, "")} {dir && <span className="dir">{dir.replace(/\/$/, "")}</span>}
      </span>
      {(c.add > 0 || c.del > 0) && (
        <span className="stat-num">
          {c.add > 0 && <span className="a">+{c.add}</span>}{" "}
          {c.del > 0 && <span className="d">−{c.del}</span>}
        </span>
      )}
      <button
        className="stage-toggle"
        title="Open file"
        aria-label="Open file"
        onClick={(e) => {
          e.stopPropagation();
          onOpenFile(c.path);
        }}
      >
        <Icon name="file" size={13} />
      </button>
      {!c.conflicted && (
        <button
          className="stage-toggle"
          title="Discard changes"
          aria-label="Discard changes"
          onClick={(e) => {
            e.stopPropagation();
            onDiscard(c);
          }}
        >
          <Icon name="trash" size={13} />
        </button>
      )}
      <button
        className="stage-toggle"
        title={isStaged ? "Unstage" : "Stage"}
        aria-label={isStaged ? "Unstage" : "Stage"}
        onClick={(e) => {
          e.stopPropagation();
          if (isStaged) onUnstage(c.path);
          else onStage(c.path);
        }}
      >
        <Icon name={isStaged ? "x" : "plus"} size={14} />
      </button>
    </div>
  );
}

export function GitPanel({
  git,
  msg,
  setMsg,
  onStage,
  onUnstage,
  onStageAll,
  onCommit,
  onPush,
  onPull,
  onFetch,
  onDiff,
  onDiscard,
  onSwitchBranch,
  onOpenFile,
  folderName,
  onRefresh,
}: GitPanelProps) {
  const [branchMenu, setBranchMenu] = useState(false);
  const conflicted = git.changes.filter((c) => c.conflicted);
  const staged = git.changes.filter((c) => c.staged && !c.conflicted);
  const unstaged = git.changes.filter((c) => !c.staged && !c.conflicted);
  const isRepo = !!git.branch;
  const rowProps = { onOpenFile, onStage, onUnstage, onDiff, onDiscard };
  return (
    <div className="panel gitpanel">
      <div className="panel-head">
        <span>Source Control</span>
        <span className="acts">
          <button className="icon-btn" title="Fetch" aria-label="Fetch" onClick={onFetch}>
            <Icon name="download" size={14} />
          </button>
          <button className="icon-btn" title="Refresh" aria-label="Refresh" onClick={onRefresh}>
            <Icon name="refresh" size={14} />
          </button>
          <button
            className="icon-btn"
            title="Stage All Changes"
            aria-label="Stage all changes"
            onClick={onStageAll}
          >
            <Icon name="plus" size={15} />
          </button>
        </span>
      </div>
      {!isRepo ? (
        <div className="git-empty" style={{ padding: "20px 14px" }}>
          <strong>{folderName || "This folder"}</strong> is not a Git repository.
          <br />
          Run <code>git init</code> in the terminal to start tracking changes.
        </div>
      ) : (
        <>
          <div className="git-repo">
            <span className="gh" style={{ display: "flex" }}>
              <Icon name="branch" size={16} />
            </span>
            <span className="nm">{folderName}</span>
            <span className="branch-wrap">
              <button
                className="branch as-btn"
                title="Switch branch"
                aria-haspopup="listbox"
                aria-expanded={branchMenu}
                onClick={() => setBranchMenu((v) => !v)}
              >
                <Icon name="branch" size={12} /> {git.branch}
                {git.ahead > 0 && <span className="ahead">↑{git.ahead}</span>}
                {git.behind > 0 && <span className="behind">↓{git.behind}</span>}
              </button>
              {branchMenu && (
                <div className="branch-menu" role="listbox">
                  {git.branches.length === 0 && <div className="branch-opt muted">No branches</div>}
                  {git.branches.map((b) => (
                    <button
                      key={b.name}
                      role="option"
                      aria-selected={b.current}
                      className={"branch-opt" + (b.current ? " current" : "")}
                      onClick={() => {
                        setBranchMenu(false);
                        onSwitchBranch(b.name);
                      }}
                    >
                      <Icon name={b.current ? "check" : "branch"} size={12} /> {b.name}
                    </button>
                  ))}
                </div>
              )}
            </span>
          </div>
          <div className="commit-box">
            <textarea
              className="commit-msg"
              rows={2}
              placeholder={'Message (⌘Enter to commit on "' + git.branch + '")'}
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
            />
            <div className="commit-actions">
              <button
                className="btn primary"
                disabled={staged.length === 0 || !msg.trim()}
                onClick={onCommit}
              >
                <Icon name="check" size={15} /> Commit {staged.length ? `(${staged.length})` : ""}
              </button>
              {git.behind > 0 && (
                <button className="btn ghost" title={`Pull ${git.behind}`} onClick={onPull}>
                  <Icon name="download" size={15} />
                </button>
              )}
              <button className="btn ghost" title="Push" onClick={onPush}>
                <Icon name="upload" size={15} />
              </button>
            </div>
          </div>
          <div className="git-list">
            {git.changes.length === 0 && (
              <div className="git-empty">
                No changes.
                <br />
                Working tree clean.
              </div>
            )}
            {conflicted.length > 0 && (
              <>
                <div className="git-group-label warn">
                  Merge Conflicts <span className="ct">{conflicted.length}</span>
                </div>
                {conflicted.map((c) => (
                  <FileRow key={c.path} c={c} isStaged={false} {...rowProps} />
                ))}
              </>
            )}
            {staged.length > 0 && (
              <>
                <div className="git-group-label">
                  Staged Changes <span className="ct">{staged.length}</span>
                </div>
                {staged.map((c) => (
                  <FileRow key={c.path} c={c} isStaged {...rowProps} />
                ))}
              </>
            )}
            {unstaged.length > 0 && (
              <>
                <div className="git-group-label">
                  Changes <span className="ct">{unstaged.length}</span>
                </div>
                {unstaged.map((c) => (
                  <FileRow key={c.path} c={c} isStaged={false} {...rowProps} />
                ))}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
