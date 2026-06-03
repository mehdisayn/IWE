import { useMemo, useState } from "react";
import { Icon } from "./Icon";
import type { FlatFile } from "../types";

interface StatCardProps {
  label: string;
  value: string;
  sub: string;
  subClass?: string;
}

function StatCard({ label, value, sub, subClass }: StatCardProps) {
  return (
    <div className="db-stat">
      <div className="db-stat-label">{label}</div>
      <div className="db-stat-value">
        {value}
        <span className={"db-stat-sub " + (subClass || "")}>{sub}</span>
      </div>
    </div>
  );
}

interface DashboardProps {
  folderName: string;
  totalWords: number;
  files: FlatFile[];
  recentPaths: string[];
  branch: string;
  changeCount: number;
  onOpenFile: (path: string) => void;
  onNewDoc: () => void;
  onImport: () => void;
  onManageSync: () => void;
  onSync: () => void;
  onSearchAll: () => void;
}

const TYPE_COLORS = ["var(--accent)", "var(--green)", "var(--yellow)", "var(--red)", "var(--text-3)"];

function ext(path: string): string {
  const dot = path.lastIndexOf(".");
  const slash = path.lastIndexOf("/");
  return dot > slash && dot !== -1 ? path.slice(dot + 1).toLowerCase() : "(none)";
}

export function Dashboard({
  folderName,
  totalWords,
  files,
  recentPaths,
  branch,
  changeCount,
  onOpenFile,
  onNewDoc,
  onImport,
  onManageSync,
  onSync,
  onSearchAll,
}: DashboardProps) {
  const [q, setQ] = useState("");

  const fileCount = files.length;
  const folderCount = useMemo(() => {
    const dirs = new Set<string>();
    files.forEach((f) => {
      const parts = f.path.split("/").slice(0, -1);
      let acc = "";
      parts.forEach((p) => {
        acc = acc ? acc + "/" + p : p;
        dirs.add(acc);
      });
    });
    return dirs.size;
  }, [files]);
  const pages = Math.max(1, Math.round(totalWords / 250));

  // Real file-type breakdown by extension.
  const breakdown = useMemo(() => {
    if (files.length === 0) return [];
    const counts: Record<string, number> = {};
    files.forEach((f) => {
      const e = ext(f.path);
      counts[e] = (counts[e] || 0) + 1;
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const top = sorted.slice(0, 4);
    const rest = sorted.slice(4).reduce((n, [, c]) => n + c, 0);
    const rows = top.map(([e, c], i) => ({
      label: "." + e,
      files: c,
      pct: Math.round((c / files.length) * 100),
      color: TYPE_COLORS[i],
    }));
    if (rest > 0)
      rows.push({
        label: "other",
        files: rest,
        pct: Math.round((rest / files.length) * 100),
        color: TYPE_COLORS[4],
      });
    return rows;
  }, [files]);

  const filtered = useMemo(() => {
    if (!q.trim()) return [];
    const ql = q.toLowerCase();
    return files.filter((f) => f.path.toLowerCase().includes(ql)).slice(0, 12);
  }, [q, files]);

  const recent = useMemo(() => {
    const byPath = new Map(files.map((f) => [f.path, f]));
    return recentPaths.map((p) => byPath.get(p)).filter((f): f is FlatFile => !!f);
  }, [recentPaths, files]);

  const list = q.trim() ? filtered : recent;

  return (
    <div className="db-root">
      <div className="db-header">
        <div className="db-title">{folderName || "Workspace"}</div>
        <div className="db-search">
          <Icon name="search" size={15} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search files…"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (list[0]) onOpenFile(list[0].path);
                else onSearchAll();
              }
            }}
          />
        </div>
        <div className="db-header-acts">
          <button className="db-hbtn" title="Sync workspace" onClick={onSync}>
            <Icon name="cloud-sync" size={18} />
          </button>
        </div>
      </div>

      <div className="db-scroll">
        <div className="db-stats">
          <StatCard label="FILES" value={String(fileCount)} sub={folderCount + " folders"} />
          <StatCard label="WORDS" value={totalWords >= 1000 ? (totalWords / 1000).toFixed(1) + "k" : String(totalWords)} sub={"~" + pages + " pages"} />
          <StatCard
            label="GIT"
            value={branch || "—"}
            sub={branch ? changeCount + " changes" : "no repo"}
            subClass={changeCount > 0 ? "up" : ""}
          />
          <StatCard label="OPEN" value={String(recent.length)} sub="tabs" />
        </div>

        <div className="db-grid">
          <div className="db-col">
            <div className="db-card">
              <div className="db-card-head">
                <span>{q.trim() ? "Search Results" : "Recent Documents"}</span>
                {!q.trim() && (
                  <button className="db-link" onClick={onSearchAll}>
                    view all
                  </button>
                )}
              </div>
              <div className="db-docs">
                {list.length === 0 && (
                  <div className="git-empty" style={{ padding: "18px 4px" }}>
                    {q.trim()
                      ? "No matching files."
                      : fileCount === 0
                      ? "This folder is empty. Create a note to get started."
                      : "Open a file and it will show up here."}
                  </div>
                )}
                {list.map((d) => (
                  <button className="db-doc" key={d.path} onClick={() => onOpenFile(d.path)}>
                    <span className="db-doc-icon">
                      <Icon name="md" size={18} />
                    </span>
                    <span className="db-doc-main">
                      <span className="db-doc-name">{d.label}</span>
                      <span className="db-doc-path">
                        <Icon name="folder" size={12} /> {d.dir || folderName || "/"}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="db-col db-col-side">
            <div className="db-card">
              <div className="db-card-head">
                <span>Quick Actions</span>
              </div>
              <div className="db-actions">
                <button className="db-action" onClick={onNewDoc}>
                  <Icon name="file-plus" size={16} /> New Document
                </button>
                <button className="db-action" onClick={onImport}>
                  <Icon name="folder" size={16} /> Open Folder…
                </button>
                <button className="db-action" onClick={onManageSync}>
                  <Icon name="git" size={16} /> Source Control
                </button>
              </div>
            </div>

            {breakdown.length > 0 && (
              <div className="db-card">
                <div className="db-card-head">
                  <span>File Types</span>
                </div>
                <div className="db-breakdown">
                  {breakdown.map((b) => (
                    <div className="db-bd-row" key={b.label}>
                      <div className="db-bd-top">
                        <span className="db-bd-label">{b.label}</span>
                        <span className="db-bd-meta">
                          {b.pct}% <span className="db-bd-files">({b.files})</span>
                        </span>
                      </div>
                      <div className="db-bd-track">
                        <div className="db-bd-fill" style={{ width: b.pct + "%", background: b.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
