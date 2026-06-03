export type GitStatus = "M" | "A" | "D";

export interface FileNode {
  type: "file";
  name: string;
  path: string;
  git?: GitStatus;
}

export interface FolderNode {
  type: "folder";
  name: string;
  path: string;
  open: boolean;
  children: TreeNode[];
}

export type TreeNode = FileNode | FolderNode;

export interface GitChange {
  path: string;
  status: GitStatus;
  staged: boolean;
  add: number;
  del: number;
}

export interface GitState {
  repo: string;
  branch: string;
  ahead: number;
  changes: GitChange[];
  repos: string[];
}

export interface FlatFile {
  path: string;
  label: string;
  dir: string;
}

export interface Caret {
  line: number;
  col: number;
}

export type EditorMode = "edit" | "preview" | "split";

export type SpecialTab = "__settings__" | "__dashboard__";
export type TabId = string;

export interface TweakState {
  theme: "slate" | "terminal" | "warm";
  accent: string;
  editorFont: "mono" | "semimono";
  fontSize: number;
  uiScale: "compact" | "comfortable";
  lineNumbers: boolean;
  wordWrap: boolean;
  autosave: boolean;
  commitOnSave: boolean;
}
