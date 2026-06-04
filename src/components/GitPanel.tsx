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
}

function FileRow({ c, isStaged, onOpenFile, onStage, onUnstage }: FileRowProps) {
  const { dir, name } = splitName(c.path);
  return (
    <div className="git-file" onClick={() => c.status !== "D" && onOpenFile(c.path)}>
      <span className={"gs " + c.status}>{c.status}</span>
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
        title={isStaged ? "Unstage" : "Stage"}
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
  onOpenFile,
  folderName,
  onRefresh,
}: GitPanelProps) {
  const staged = git.changes.filter((c) => c.staged);
  const unstaged = git.changes.filter((c) => !c.staged);
  const isRepo = !!git.branch;
  return (
    <div className="panel gitpanel">
      <div className="panel-head">
        <span>Source Control</span>
        <span className="acts">
          <button className="icon-btn" title="Refresh" onClick={onRefresh}>
            <Icon name="refresh" size={14} />
          </button>
          <button className="icon-btn" title="Stage All Changes" onClick={onStageAll}>
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
            <span className="branch">
              <Icon name="branch" size={12} /> {git.branch}{" "}
              {git.ahead > 0 && <span className="ahead">↑{git.ahead}</span>}
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
            {staged.length > 0 && (
              <>
                <div className="git-group-label">
                  Staged Changes <span className="ct">{staged.length}</span>
                </div>
                {staged.map((c) => (
                  <FileRow
                    key={c.path}
                    c={c}
                    isStaged
                    onOpenFile={onOpenFile}
                    onStage={onStage}
                    onUnstage={onUnstage}
                  />
                ))}
              </>
            )}
            {unstaged.length > 0 && (
              <>
                <div className="git-group-label">
                  Changes <span className="ct">{unstaged.length}</span>
                </div>
                {unstaged.map((c) => (
                  <FileRow
                    key={c.path}
                    c={c}
                    isStaged={false}
                    onOpenFile={onOpenFile}
                    onStage={onStage}
                    onUnstage={onUnstage}
                  />
                ))}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
