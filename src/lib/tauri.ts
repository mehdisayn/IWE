// Thin typed bridge over Tauri's invoke. Detects whether we're running in Tauri
// (vs a plain browser via `npm run dev`) so the UI can degrade gracefully when
// there's no native shell (no filesystem/git access).

import type { TreeNode } from "../types";

interface TauriWindow {
  __TAURI_INTERNALS__?: unknown;
}

export const IS_TAURI: boolean =
  typeof window !== "undefined" && !!(window as unknown as TauriWindow).__TAURI_INTERNALS__;

type InvokeFn = <T = unknown>(cmd: string, args?: Record<string, unknown>) => Promise<T>;

let _invoke: InvokeFn | null = null;

async function invoke<T = unknown>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (!IS_TAURI) throw new Error(`Tauri not available — cannot invoke "${cmd}"`);
  if (!_invoke) {
    const mod = await import("@tauri-apps/api/core");
    _invoke = mod.invoke as InvokeFn;
  }
  return _invoke<T>(cmd, args);
}

export const fsApi = {
  pickFolder: () => invoke<string | null>("pick_folder"),
  listDir: (root: string) => invoke<TreeNode[]>("list_dir", { root }),
  readFile: (root: string, path: string) => invoke<string>("read_file", { root, path }),
  writeFile: (root: string, path: string, content: string) =>
    invoke<void>("write_file", { root, path, content }),
  createFile: (root: string, path: string, content = "") =>
    invoke<void>("create_file", { root, path, content }),
  createFolder: (root: string, path: string) =>
    invoke<void>("create_folder", { root, path }),
  rename: (root: string, from: string, to: string) =>
    invoke<void>("rename", { root, from, to }),
  delete: (root: string, path: string) => invoke<void>("delete", { root, path }),
};

export interface RawGitChange {
  path: string;
  status: "M" | "A" | "D";
  staged: boolean;
  add: number;
  del: number;
}

export interface RawGitStatus {
  is_repo: boolean;
  branch: string;
  ahead: number;
  changes: RawGitChange[];
}

export const gitApi = {
  status: (root: string) => invoke<RawGitStatus>("git_status", { root }),
  stage: (root: string, path: string) => invoke<void>("git_stage", { root, path }),
  stageAll: (root: string) => invoke<void>("git_stage_all", { root }),
  unstage: (root: string, path: string) => invoke<void>("git_unstage", { root, path }),
  commit: (root: string, message: string) => invoke<string>("git_commit", { root, message }),
  push: (root: string) => invoke<string>("git_push", { root }),
  log: (root: string) => invoke<string>("git_log", { root }),
};

export interface CommandOutput {
  stdout: string;
  stderr: string;
  code: number;
}

export const termApi = {
  run: (cwd: string, command: string) => invoke<CommandOutput>("run_command", { cwd, command }),
  changeDir: (cwd: string, target: string) => invoke<string>("change_dir", { cwd, target }),
};
