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
  /** Set by the backend when the listing under this folder was capped (depth/size guard). */
  truncated?: boolean;
}

export type TreeNode = FileNode | FolderNode;

export interface GitChange {
  path: string;
  status: GitStatus;
  staged: boolean;
  conflicted: boolean;
  add: number;
  del: number;
}

export interface BranchInfo {
  name: string;
  current: boolean;
}

export interface GitState {
  repo: string;
  branch: string;
  ahead: number;
  behind: number;
  changes: GitChange[];
  branches: BranchInfo[];
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
