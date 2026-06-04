import type { CSSProperties } from "react";
import { Icon } from "./Icon";
import type { TreeNode } from "../types";

interface TreeNodeProps {
  node: TreeNode;
  depth: number;
  activePath: string | null;
  onOpenFile: (path: string) => void;
  onToggleFolder: (path: string) => void;
  onContext: (e: React.MouseEvent, node: TreeNode) => void;
}

function TreeNodeRow({
  node,
  depth,
  activePath,
  onOpenFile,
  onToggleFolder,
  onContext,
}: TreeNodeProps) {
  const pad: CSSProperties = { paddingLeft: 6 + depth * 14 + "px" };
  if (node.type === "folder") {
    return (
      <>
        <div
          className="tree-row folder"
          style={pad}
          onClick={() => onToggleFolder(node.path)}
          onContextMenu={(e) => onContext(e, node)}
        >
          <span className={"chev" + (node.open ? " open" : "")}>
            <Icon name="chevron" size={12} />
          </span>
          <span className="ficon">
            <Icon name={node.open ? "folder-open" : "folder"} size={15} />
          </span>
          <span className="tw-name">{node.name}</span>
        </div>
        {node.open &&
          node.children.map((c) => (
            <TreeNodeRow
              key={c.path}
              node={c}
              depth={depth + 1}
              activePath={activePath}
              onOpenFile={onOpenFile}
              onToggleFolder={onToggleFolder}
              onContext={onContext}
            />
          ))}
      </>
    );
  }
  return (
    <div
      className={"tree-row file" + (node.path === activePath ? " active" : "")}
      style={pad}
      onClick={() => onOpenFile(node.path)}
      onContextMenu={(e) => onContext(e, node)}
    >
      <span className="chev" style={{ visibility: "hidden" }}>
        <Icon name="chevron" size={12} />
      </span>
      <span className="ficon">
        <Icon name="md" size={15} />
      </span>
      <span className="tw-name">{node.name.replace(/\.md$/, "")}</span>
      {node.git && <span className={"tw-git " + node.git}>{node.git}</span>}
    </div>
  );
}

interface SidebarProps {
  folderName: string;
  branch: string;
  tree: TreeNode[];
  activePath: string | null;
  onOpenFile: (path: string) => void;
  onToggleFolder: (path: string) => void;
  onContext: (e: React.MouseEvent, node: TreeNode | null) => void;
  onNewFile: (folder?: boolean) => void;
  onRefresh: () => void;
}

export function Sidebar({
  folderName,
  branch,
  tree,
  activePath,
  onOpenFile,
  onToggleFolder,
  onContext,
  onNewFile,
  onRefresh,
}: SidebarProps) {
  return (
    <div className="panel sidebar">
      <div className="panel-head">
        <span>{folderName}</span>
        <span className="acts">
          <button className="icon-btn" title="New File  (⌘N)" onClick={() => onNewFile(false)}>
            <Icon name="file-plus" size={15} />
          </button>
          <button className="icon-btn" title="New Folder" onClick={() => onNewFile(true)}>
            <Icon name="folder-plus" size={15} />
          </button>
          <button className="icon-btn" title="Refresh" onClick={onRefresh}>
            <Icon name="refresh" size={14} />
          </button>
        </span>
      </div>
      <div className="tree">
        {tree.map((n) => (
          <TreeNodeRow
            key={n.path}
            node={n}
            depth={0}
            activePath={activePath}
            onOpenFile={onOpenFile}
            onToggleFolder={onToggleFolder}
            onContext={onContext}
          />
        ))}
      </div>
      {branch && (
        <div className="repo-bar">
          <div className="repo-sel" style={{ cursor: "default" }} title="Current branch">
            <span className="gh">
              <Icon name="branch" size={16} />
            </span>
            <span className="nm">{folderName}</span>
            <span className="br">
              <Icon name="branch" size={12} /> {branch}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
