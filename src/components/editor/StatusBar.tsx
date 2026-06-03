import { useMemo } from "react";
import { Icon } from "../Icon";
import { wordCount } from "../../lib/markdown";
import type { Caret } from "../../types";

interface StatusBarProps {
  path: string | null;
  value: string;
  caret: Caret;
  synced: boolean;
  isRepo: boolean;
  onToggleTerminal: () => void;
}

export function StatusBar({ path, value, caret, synced, isRepo, onToggleTerminal }: StatusBarProps) {
  const words = useMemo(() => wordCount(value), [value]);
  const name = path ? path.split("/").pop() : "";
  return (
    <div className="statusbar">
      <span className="si">
        <Icon name="md" size={13} /> {name}
      </span>
      <span className="grow" />
      {isRepo ? (
        <span className={"si sync " + (synced ? "synced" : "dirty")}>
          <span className="dot" /> {synced ? "Synced" : "Uncommitted changes"}
        </span>
      ) : (
        <span className="si">
          <span className="dot" /> Local
        </span>
      )}
      <span className="si">{words.toLocaleString()} words</span>
      <span className="si">
        Ln {caret.line}, Col {caret.col}
      </span>
      <span className="si">Markdown</span>
      <span className="si">UTF-8</span>
      <span className="si btn" onClick={onToggleTerminal} title="Toggle Terminal (⌘`)">
        <Icon name="terminal" size={13} />
      </span>
    </div>
  );
}
