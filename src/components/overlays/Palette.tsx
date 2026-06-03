import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "../Icon";
import type { FlatFile } from "../../types";

export type PaletteMode = "command" | "file";

export interface Command {
  id: string;
  label: string;
  icon?: string;
  shortcut?: string;
}

interface PaletteProps {
  mode: PaletteMode;
  commands: Command[];
  files: FlatFile[];
  onRun: (id: string) => void;
  onOpenFile: (path: string) => void;
  onClose: () => void;
}

type Item = Command | FlatFile;
const isFlatFile = (it: Item): it is FlatFile => (it as FlatFile).path !== undefined;

export function Palette({ mode, commands, files, onRun, onOpenFile, onClose }: PaletteProps) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const inRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    inRef.current?.focus();
  }, []);
  useEffect(() => setSel(0), [q, mode]);

  const isFile = mode === "file";
  const items: Item[] = useMemo(() => {
    if (isFile) {
      const ql = q.toLowerCase();
      return files.filter((f) => f.path.toLowerCase().includes(ql)).slice(0, 50);
    }
    const ql = q.replace(/^>/, "").trim().toLowerCase();
    return commands.filter((c) => c.label.toLowerCase().includes(ql)).slice(0, 50);
  }, [q, isFile, files, commands]);

  const choose = (it: Item) => {
    if (isFlatFile(it)) onOpenFile(it.path);
    else onRun(it.id);
    onClose();
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSel((s) => Math.min(items.length - 1, s + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSel((s) => Math.max(0, s - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (items[sel]) choose(items[sel]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div className="scrim" onMouseDown={onClose}>
      <div className="palette fade-in" onMouseDown={(e) => e.stopPropagation()}>
        <div className="palette-input-row">
          <span className="pi">
            <Icon name={isFile ? "search" : "command"} size={17} />
          </span>
          <input
            ref={inRef}
            className="palette-input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKey}
            placeholder={isFile ? "Go to file…" : "Type a command…"}
          />
        </div>
        <div className="palette-list">
          {items.length === 0 && <div className="palette-cat">No matches</div>}
          {items.map((it, i) => (
            <div
              key={isFlatFile(it) ? it.path : it.id}
              className={"palette-item" + (i === sel ? " sel" : "")}
              onMouseEnter={() => setSel(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(it);
              }}
            >
              <span className="pic">
                <Icon name={isFlatFile(it) ? "md" : it.icon || "arrowright"} size={15} />
              </span>
              <span>{isFlatFile(it) ? it.label : it.label}</span>
              {isFlatFile(it) ? (
                <span className="path">{it.dir || "/"}</span>
              ) : (
                it.shortcut && <span className="sub">{it.shortcut}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
