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
  onPickRepo: (e: React.MouseEvent) => void;
  onAddRepo: () => void;
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
          {c.add > 0 && <span className="a">+{c.add}</span>} {c.del > 0 && <span className="d">−{c.del}</span>}
        </span>
      )}
      <button
        className="stage-toggle"
        title={isStaged ? "Unstage" : "Stage"}
        onClick={(e) => {
          e.stopPropagation();
          isStaged ? onUnstage(c.path) : onStage(c.path);
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
  onPickRepo,
  onAddRepo,
}: GitPanelProps) {
  const staged = git.changes.filter((c) => c.staged);
  const unstaged = git.changes.filter((c) => !c.staged);
  return (
    <div className="panel gitpanel">
      <div className="panel-head">
        <span>Source Control</span>
        <span className="acts">
          <button className="icon-btn" title="Refresh">
            <Icon name="refresh" size={14} />
          </button>
          <button className="icon-btn" title="Stage All Changes" onClick={onStageAll}>
            <Icon name="plus" size={15} />
          </button>
        </span>
      </div>
      <div className="git-repo">
        <button className="gh" onClick={onPickRepo} title="Switch repository" style={{ display: "flex" }}>
          <Icon name="github" size={17} fill />
        </button>
        <span className="nm">{git.repo}</span>
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
          <button className="btn primary" disabled={staged.length === 0 || !msg.trim()} onClick={onCommit}>
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
              <FileRow key={c.path} c={c} isStaged onOpenFile={onOpenFile} onStage={onStage} onUnstage={onUnstage} />
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
        <button className="add-repo" onClick={onAddRepo}>
          <Icon name="plus" size={14} /> Add Repository
        </button>
      </div>
    </div>
  );
}
