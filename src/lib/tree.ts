// Pure helpers for working with the workspace file tree. Kept out of App.tsx
// so they can be unit-tested and reused by the incremental filesystem-update
// path (see App's fs:changed handler).

import type { TreeNode } from "../types";

/** Collect the paths of every expanded (open) folder in the tree. */
export function collectOpenPaths(tree: TreeNode[]): Set<string> {
  const open = new Set<string>();
  const walk = (nodes: TreeNode[]) =>
    nodes.forEach((n) => {
      if (n.type === "folder") {
        if (n.open) open.add(n.path);
        walk(n.children);
      }
    });
  walk(tree);
  return open;
}

/** Re-apply expanded state to a freshly-listed tree (backend always returns open=false). */
export function applyOpen(nodes: TreeNode[], open: Set<string>): TreeNode[] {
  return nodes.map((n) =>
    n.type === "folder"
      ? { ...n, open: open.has(n.path), children: applyOpen(n.children, open) }
      : n
  );
}

/** The parent directory of a workspace-relative path ("" for a top-level entry). */
export function parentDir(path: string): string {
  const i = path.lastIndexOf("/");
  return i === -1 ? "" : path.slice(0, i);
}

/**
 * Replace the children of the folder at `sub` with `newChildren`. Returns the
 * updated tree, or `null` if no folder with that path exists (so the caller can
 * fall back to a full reload). Expanded state is preserved by the caller via
 * applyOpen.
 */
export function spliceSubtree(
  tree: TreeNode[],
  sub: string,
  newChildren: TreeNode[]
): TreeNode[] | null {
  let found = false;
  const walk = (nodes: TreeNode[]): TreeNode[] =>
    nodes.map((n) => {
      if (n.type !== "folder") return n;
      if (n.path === sub) {
        found = true;
        return { ...n, children: newChildren };
      }
      return { ...n, children: walk(n.children) };
    });
  const next = walk(tree);
  return found ? next : null;
}
