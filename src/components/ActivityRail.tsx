import { Icon } from "./Icon";

export interface RailActive {
  dashboard: boolean;
  explorer: boolean;
  git: boolean;
  terminal: boolean;
  settings: boolean;
}

export type RailToggle = "dashboard" | "explorer" | "git" | "sync" | "terminal" | "settings";

interface ActivityRailProps {
  active: RailActive;
  gitCount: number;
  onToggle: (id: RailToggle) => void;
}

export function ActivityRail({ active, gitCount, onToggle }: ActivityRailProps) {
  const items = [
    { id: "dashboard" as const, icon: "grid", title: "Dashboard" },
    { id: "explorer" as const, icon: "files", title: "Explorer  (⌘B)" },
    { id: "git" as const, icon: "git", title: "Source Control  (⌘⇧G)", badge: gitCount },
  ];
  return (
    <nav className="rail" aria-label="Primary">
      {items.map((it) => (
        <button
          key={it.id}
          className={"rail-btn" + (active[it.id] ? " on" : "")}
          title={it.title}
          aria-label={it.title.replace(/\s*\(.*\)\s*/, "")}
          aria-pressed={active[it.id]}
          onClick={() => onToggle(it.id)}
        >
          <Icon name={it.icon} size={22} stroke={1.6} />
          {"badge" in it && it.badge ? <span className="badge">{it.badge}</span> : null}
        </button>
      ))}
      <div className="spacer" />
      <button
        className="rail-btn"
        title="Sync workspace"
        aria-label="Sync workspace"
        onClick={() => onToggle("sync")}
      >
        <Icon name="cloud-sync" size={22} stroke={1.6} />
      </button>
      <button
        className={"rail-btn" + (active.terminal ? " on" : "")}
        title="Terminal  (⌘`)"
        aria-label="Toggle terminal"
        aria-pressed={active.terminal}
        onClick={() => onToggle("terminal")}
      >
        <Icon name="terminal" size={22} stroke={1.6} />
      </button>
      <button
        className={"rail-btn" + (active.settings ? " on" : "")}
        title="Settings  (⌘,)"
        aria-label="Open settings"
        aria-pressed={active.settings}
        onClick={() => onToggle("settings")}
      >
        <Icon name="settings" size={21} stroke={1.6} />
      </button>
    </nav>
  );
}
