import { useEffect, useRef } from "react";
import { Icon } from "../Icon";
import type { TreeNode } from "../../types";

export type ContextAction = "newfile" | "newfolder" | "rename" | "reveal" | "delete";

interface ContextMenuProps {
  x: number;
  y: number;
  node: TreeNode | null;
  onAction: (action: ContextAction, node: TreeNode | null) => void;
  onClose: () => void;
}

export function ContextMenu({ x, y, node, onAction, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener("mousedown", h);
    window.addEventListener("contextmenu", h, true);
    return () => {
      window.removeEventListener("mousedown", h);
      window.removeEventListener("contextmenu", h, true);
    };
  }, [onClose]);
  const px = Math.min(x, window.innerWidth - 200);
  const py = Math.min(y, window.innerHeight - 220);
  return (
    <div className="ctx fade-in" ref={ref} style={{ left: px, top: py }}>
      <div className="ctx-item" onClick={() => onAction("newfile", node)}>
        <span className="ci">
          <Icon name="file-plus" size={15} />
        </span>{" "}
        New File
      </div>
      <div className="ctx-item" onClick={() => onAction("newfolder", node)}>
        <span className="ci">
          <Icon name="folder-plus" size={15} />
        </span>{" "}
        New Folder
      </div>
      <div className="ctx-sep" />
      <div className="ctx-item" onClick={() => onAction("rename", node)}>
        <span className="ci">
          <Icon name="rename" size={15} />
        </span>{" "}
        Rename <span className="sc">F2</span>
      </div>
      <div className="ctx-item" onClick={() => onAction("reveal", node)}>
        <span className="ci">
          <Icon name="link" size={15} />
        </span>{" "}
        Copy Path
      </div>
      <div className="ctx-sep" />
      <div className="ctx-item danger" onClick={() => onAction("delete", node)}>
        <span className="ci">
          <Icon name="trash" size={15} />
        </span>{" "}
        Delete
      </div>
    </div>
  );
}
