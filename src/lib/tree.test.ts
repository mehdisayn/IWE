import { describe, it, expect } from "vitest";
import { collectOpenPaths, applyOpen, parentDir, spliceSubtree } from "./tree";
import type { TreeNode } from "../types";

const file = (name: string, path: string): TreeNode => ({ type: "file", name, path });
const folder = (name: string, path: string, open: boolean, children: TreeNode[]): TreeNode => ({
  type: "folder",
  name,
  path,
  open,
  children,
});

function sample(): TreeNode[] {
  return [
    folder("Notes", "Notes", true, [
      file("a.md", "Notes/a.md"),
      folder("Sub", "Notes/Sub", false, [file("b.md", "Notes/Sub/b.md")]),
    ]),
    file("top.md", "top.md"),
  ];
}

describe("parentDir", () => {
  it("returns empty string for top-level paths", () => {
    expect(parentDir("top.md")).toBe("");
  });
  it("returns the directory for nested paths", () => {
    expect(parentDir("Notes/Sub/b.md")).toBe("Notes/Sub");
  });
});

describe("collectOpenPaths", () => {
  it("gathers only expanded folders", () => {
    const open = collectOpenPaths(sample());
    expect(open.has("Notes")).toBe(true);
    expect(open.has("Notes/Sub")).toBe(false);
  });
});

describe("applyOpen", () => {
  it("restores expanded state by path", () => {
    const open = new Set(["Notes/Sub"]);
    const next = applyOpen(sample(), open);
    const notes = next[0] as Extract<TreeNode, { type: "folder" }>;
    expect(notes.open).toBe(false); // not in the set
    const sub = notes.children[1] as Extract<TreeNode, { type: "folder" }>;
    expect(sub.open).toBe(true);
  });
});

describe("spliceSubtree", () => {
  it("replaces the children of a matching folder", () => {
    const next = spliceSubtree(sample(), "Notes/Sub", [file("c.md", "Notes/Sub/c.md")]);
    expect(next).not.toBeNull();
    const notes = next![0] as Extract<TreeNode, { type: "folder" }>;
    const sub = notes.children[1] as Extract<TreeNode, { type: "folder" }>;
    expect(sub.children).toHaveLength(1);
    expect(sub.children[0].path).toBe("Notes/Sub/c.md");
  });

  it("returns null when the folder is absent", () => {
    expect(spliceSubtree(sample(), "Missing", [])).toBeNull();
  });
});
