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
    <div className="rail">
      {items.map((it) => (
        <button
          key={it.id}
          className={"rail-btn" + (active[it.id] ? " on" : "")}
          title={it.title}
          onClick={() => onToggle(it.id)}
        >
          <Icon name={it.icon} size={22} stroke={1.6} />
          {"badge" in it && it.badge ? <span className="badge">{it.badge}</span> : null}
        </button>
      ))}
      <div className="spacer" />
      <button className="rail-btn" title="Sync workspace" onClick={() => onToggle("sync")}>
        <Icon name="cloud-sync" size={22} stroke={1.6} />
      </button>
      <button
        className={"rail-btn" + (active.terminal ? " on" : "")}
        title="Terminal  (⌘`)"
        onClick={() => onToggle("terminal")}
      >
        <Icon name="terminal" size={22} stroke={1.6} />
      </button>
      <button
        className={"rail-btn" + (active.settings ? " on" : "")}
        title="Settings  (⌘,)"
        onClick={() => onToggle("settings")}
      >
        <Icon name="settings" size={21} stroke={1.6} />
      </button>
    </div>
  );
}
