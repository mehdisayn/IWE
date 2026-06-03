import { useMemo, useState } from "react";
import { Icon } from "./Icon";

function buildHeat(): number[][] {
  let seed = 20260603;
  const rnd = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  const weeks = 26;
  const cells: number[][] = [];
  for (let w = 0; w < weeks; w++) {
    const col: number[] = [];
    const base = 0.25 + (w / weeks) * 0.5;
    for (let d = 0; d < 7; d++) {
      const r = rnd();
      let lvl = 0;
      if (r < 0.34) lvl = 0;
      else if (r < base + 0.05) lvl = 1;
      else if (r < base + 0.25) lvl = 2;
      else if (r < base + 0.45) lvl = 3;
      else lvl = 4;
      if (rnd() > 0.965) lvl = 5;
      col.push(lvl);
    }
    cells.push(col);
  }
  return cells;
}

const HEAT_COLORS: Record<number, string> = {
  0: "color-mix(in srgb, var(--text) 7%, var(--surface))",
  1: "color-mix(in srgb, var(--accent) 24%, var(--surface))",
  2: "color-mix(in srgb, var(--accent) 48%, var(--surface))",
  3: "color-mix(in srgb, var(--accent) 74%, transparent)",
  4: "var(--accent)",
  5: "color-mix(in srgb, #fff 62%, var(--accent))",
};

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
  totalWords: number;
  onOpenFile: (path: string) => void;
  onNewDoc: () => void;
  onImport: () => void;
  onManageSync: () => void;
  onSync: () => void;
  onSearchAll: () => void;
}

export function Dashboard({
  totalWords,
  onOpenFile,
  onNewDoc,
  onImport,
  onManageSync,
  onSync,
  onSearchAll,
}: DashboardProps) {
  const heat = useMemo(buildHeat, []);
  const [q, setQ] = useState("");

  const pages = Math.round(totalWords / 250);
  const recent = [
    {
      name: "Chapter 03 — The Customs House.md",
      dir: "/Manuscript",
      icon: "md",
      when: "2 hrs ago",
      path: "Manuscript/Chapter 03 — The Customs House.md",
    },
    { name: "2026-06-03.md", dir: "/Notes/Daily", icon: "md", when: "Today", path: "Notes/Daily/2026-06-03.md" },
    { name: "Characters.md", dir: "/Research", icon: "md", when: "Yesterday", path: "Research/Characters.md" },
    { name: "Outline.md", dir: "/Manuscript", icon: "md", when: "2 days ago", path: "Manuscript/Outline.md" },
  ];
  const breakdown = [
    { label: "Manuscript & notes (.md)", pct: 78, files: "18 files", color: "var(--accent)" },
    { label: "Plain text (.txt)", pct: 10, files: "3 files", color: "var(--green)" },
    { label: "Assets (.png, .jpg)", pct: 8, files: "4 files", color: "var(--yellow)" },
    { label: "Data (.json, .yaml)", pct: 4, files: "2 files", color: "var(--red)" },
  ];
  const months = ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return (
    <div className="db-root">
      <div className="db-header">
        <div className="db-title">Workspace Dashboard</div>
        <div className="db-search">
          <Icon name="search" size={15} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search workspace…"
            onKeyDown={(e) => {
              if (e.key === "Enter") onSearchAll();
            }}
          />
        </div>
        <div className="db-header-acts">
          <button className="db-hbtn" title="Notifications">
            <Icon name="bell" size={17} />
            <span className="db-hdot" />
          </button>
          <button className="db-hbtn" title="Sync workspace" onClick={onSync}>
            <Icon name="cloud-sync" size={18} />
          </button>
        </div>
      </div>

      <div className="db-scroll">
        <div className="db-stats">
          <StatCard label="TOTAL FILES" value="23" sub="+3 this week" subClass="up" />
          <StatCard label="TOTAL WORDS" value={(totalWords / 1000).toFixed(1) + "k"} sub={"~" + pages + " pages"} />
          <StatCard label="RECENT EDITS" value="7" sub="today" />
          <StatCard label="STORAGE USED" value="1.8MB" sub="/ 100MB" />
        </div>

        <div className="db-grid">
          <div className="db-col">
            <div className="db-card">
              <div className="db-card-head">
                <span>Writing Activity (6 months)</span>
              </div>
              <div className="db-heat">
                <div className="db-heat-grid">
                  {heat.map((col, wi) => (
                    <div className="db-heat-col" key={wi}>
                      {col.map((lvl, di) => (
                        <div
                          className="db-cell"
                          key={di}
                          style={{ background: HEAT_COLORS[lvl] }}
                          title={lvl === 0 ? "No writing" : lvl * 320 + 80 + " words"}
                        />
                      ))}
                    </div>
                  ))}
                </div>
                <div className="db-heat-months">
                  {months.map((m) => (
                    <span key={m}>{m}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="db-card">
              <div className="db-card-head">
                <span>Recent Documents</span>
                <button className="db-link" onClick={onSearchAll}>
                  view all
                </button>
              </div>
              <div className="db-docs">
                {recent.map((d) => (
                  <button className="db-doc" key={d.name} onClick={() => onOpenFile(d.path)}>
                    <span className="db-doc-icon">
                      <Icon name={d.icon} size={18} />
                    </span>
                    <span className="db-doc-main">
                      <span className="db-doc-name">{d.name}</span>
                      <span className="db-doc-path">
                        <Icon name="folder" size={12} /> {d.dir}
                      </span>
                    </span>
                    <span className="db-doc-when">{d.when}</span>
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
                  <Icon name="folder" size={16} /> Import Folder
                </button>
                <button className="db-action" onClick={onManageSync}>
                  <Icon name="github" size={16} fill /> Manage GitHub Sync
                </button>
              </div>
            </div>

            <div className="db-card">
              <div className="db-card-head">
                <span>Workspace Breakdown</span>
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
          </div>
        </div>
      </div>
    </div>
  );
}
