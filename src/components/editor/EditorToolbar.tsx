import { Fragment } from "react";
import { Icon } from "../Icon";
import type { EditorMode } from "../../types";

interface EditorToolbarProps {
  path: string;
  mode: EditorMode;
  setMode: (m: EditorMode) => void;
}

export function EditorToolbar({ path, mode, setMode }: EditorToolbarProps) {
  const parts = path ? path.split("/") : [];
  return (
    <div className="etoolbar">
      <div className="crumbs">
        {parts.map((p, i) => (
          <Fragment key={i}>
            {i > 0 && (
              <span className="sep">
                <Icon name="chevron" size={11} />
              </span>
            )}
            {i === parts.length - 1 ? <b>{p}</b> : <span>{p}</span>}
          </Fragment>
        ))}
      </div>
      <div className="segmented">
        <button className={"seg" + (mode === "edit" ? " on" : "")} onClick={() => setMode("edit")}>
          <Icon name="edit" size={14} /> Edit
        </button>
        <button className={"seg" + (mode === "preview" ? " on" : "")} onClick={() => setMode("preview")}>
          <Icon name="eye" size={14} /> Preview
        </button>
        <button className={"seg" + (mode === "split" ? " on" : "")} onClick={() => setMode("split")}>
          <Icon name="columns" size={14} /> Split
        </button>
      </div>
    </div>
  );
}
