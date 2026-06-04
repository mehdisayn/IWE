import { useEffect } from "react";
import { Icon } from "../Icon";

export interface DiffData {
  path: string;
  staged: boolean;
  text: string;
}

interface DiffModalProps {
  diff: DiffData;
  onClose: () => void;
}

// Classify a unified-diff line for colouring.
function lineClass(line: string): string {
  if (line.startsWith("+++") || line.startsWith("---")) return "diff-meta";
  if (line.startsWith("@@")) return "diff-hunk";
  if (line.startsWith("diff ") || line.startsWith("index ")) return "diff-meta";
  if (line.startsWith("+")) return "diff-add";
  if (line.startsWith("-")) return "diff-del";
  return "diff-ctx";
}

export function DiffModal({ diff, onClose }: DiffModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const name = diff.path.split("/").pop() || diff.path;
  const lines = diff.text.length ? diff.text.replace(/\n$/, "").split("\n") : [];

  return (
    <div className="scrim" onMouseDown={onClose}>
      <div
        className="diff-modal fade-in"
        role="dialog"
        aria-label={"Diff of " + name}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="diff-head">
          <span className="diff-title">
            <Icon name="git" size={14} /> {name}
            <span className="diff-sub">{diff.staged ? "staged" : "working tree"}</span>
          </span>
          <button className="icon-btn" title="Close (Esc)" aria-label="Close" onClick={onClose}>
            <Icon name="x" size={14} />
          </button>
        </div>
        <div className="diff-body">
          {lines.length === 0 ? (
            <div className="diff-empty">No textual changes (binary or identical content).</div>
          ) : (
            <pre className="diff-pre">
              {lines.map((l, i) => (
                <div key={i} className={"diff-line " + lineClass(l)}>
                  {l || " "}
                </div>
              ))}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
