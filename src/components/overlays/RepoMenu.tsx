import { useEffect, useRef } from "react";
import { Icon } from "../Icon";

interface RepoMenuProps {
  x: number;
  y: number;
  repos: string[];
  current: string;
  onPick: (r: string) => void;
  onAdd: () => void;
  onClose: () => void;
}

export function RepoMenu({ x, y, repos, current, onPick, onAdd, onClose }: RepoMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener("mousedown", h);
    return () => window.removeEventListener("mousedown", h);
  }, [onClose]);
  return (
    <div
      className="ctx fade-in"
      ref={ref}
      style={{ left: Math.min(x, window.innerWidth - 240), top: y, minWidth: 220 }}
    >
      <div className="palette-cat" style={{ padding: "4px 10px 6px" }}>
        Repositories
      </div>
      {repos.map((r) => (
        <div
          key={r}
          className="ctx-item"
          onClick={() => {
            onPick(r);
            onClose();
          }}
        >
          <span className="ci">
            <Icon name="github" size={15} fill />
          </span>
          {r.split(" ")[0]}
          {r === current && <span className="sc" style={{ color: "var(--green)" }}>●</span>}
          {r.includes("private") && <span className="sc">private</span>}
        </div>
      ))}
      <div className="ctx-sep" />
      <div
        className="ctx-item"
        onClick={() => {
          onAdd();
          onClose();
        }}
      >
        <span className="ci">
          <Icon name="plus" size={15} />
        </span>{" "}
        Add Repository…
      </div>
    </div>
  );
}
