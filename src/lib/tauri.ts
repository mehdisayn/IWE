// Thin typed bridge over Tauri's invoke. Detects whether we're running in Tauri
// (vs a plain browser via `npm run dev`) so the UI can degrade gracefully when
// there's no native shell (no filesystem/git access).

import type { TreeNode, TweakState } from "../types";

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

// Result of reading a file. Binary / oversized files come back flagged with
// empty content so the UI can show a placeholder instead of garbage.
export interface FileContents {
  binary: boolean;
  tooLarge: boolean;
  size: number;
  content: string;
}

export const fsApi = {
  pickFolder: () => invoke<string | null>("pick_folder"),
  listDir: (root: string) => invoke<TreeNode[]>("list_dir", { root }),
  listSubtree: (root: string, sub: string) => invoke<TreeNode[]>("list_subtree", { root, sub }),
  readFile: (root: string, path: string) => invoke<FileContents>("read_file", { root, path }),
  writeFile: (root: string, path: string, content: string) =>
    invoke<void>("write_file", { root, path, content }),
  createFile: (root: string, path: string, content = "") =>
    invoke<void>("create_file", { root, path, content }),
  createFolder: (root: string, path: string) => invoke<void>("create_folder", { root, path }),
  rename: (root: string, from: string, to: string) => invoke<void>("rename", { root, from, to }),
  delete: (root: string, path: string) => invoke<void>("delete", { root, path }),
};

export interface RawGitChange {
  path: string;
  status: "M" | "A" | "D";
  staged: boolean;
  conflicted: boolean;
  add: number;
  del: number;
}

export interface RawGitStatus {
  is_repo: boolean;
  branch: string;
  ahead: number;
  behind: number;
  changes: RawGitChange[];
}

export interface RawBranchInfo {
  name: string;
  current: boolean;
}

export const gitApi = {
  status: (root: string) => invoke<RawGitStatus>("git_status", { root }),
  stage: (root: string, path: string) => invoke<void>("git_stage", { root, path }),
  stageAll: (root: string) => invoke<void>("git_stage_all", { root }),
  unstage: (root: string, path: string) => invoke<void>("git_unstage", { root, path }),
  commit: (root: string, message: string) => invoke<string>("git_commit", { root, message }),
  push: (root: string) => invoke<string>("git_push", { root }),
  log: (root: string) => invoke<string>("git_log", { root }),
  diff: (root: string, path: string, staged: boolean) =>
    invoke<string>("git_diff", { root, path, staged }),
  discard: (root: string, path: string) => invoke<void>("git_discard", { root, path }),
  fetch: (root: string) => invoke<string>("git_fetch", { root }),
  pull: (root: string) => invoke<string>("git_pull", { root }),
  branches: (root: string) => invoke<RawBranchInfo[]>("git_branches", { root }),
  checkout: (root: string, branch: string) => invoke<void>("git_checkout", { root, branch }),
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

// Filesystem watching: the backend emits `fs:changed` with the paths (relative
// to the workspace root) that changed on disk. `onChange` resolves to an
// unsubscribe function. All calls are no-ops outside Tauri.
export type Unlisten = () => void;

export const watchApi = {
  watch: (path: string): Promise<void> =>
    IS_TAURI ? invoke<void>("watch_workspace", { path }).catch(() => {}) : Promise.resolve(),
  unwatch: (): Promise<void> =>
    IS_TAURI ? invoke<void>("unwatch").catch(() => {}) : Promise.resolve(),
  onChange: async (cb: (paths: string[]) => void): Promise<Unlisten> => {
    if (!IS_TAURI) return () => {};
    const { listen } = await import("@tauri-apps/api/event");
    return listen<{ paths: string[] }>("fs:changed", (e) => cb(e.payload.paths));
  },
};

// Interactive PTY terminal. Output arrives on `pty:data` events keyed by the
// session `id`; `onExit` fires when the shell ends.
export const ptyApi = {
  spawn: (id: string, cwd: string, cols: number, rows: number) =>
    invoke<void>("pty_spawn", { id, cwd, cols, rows }),
  write: (id: string, data: string) => invoke<void>("pty_write", { id, data }),
  resize: (id: string, cols: number, rows: number) =>
    invoke<void>("pty_resize", { id, cols, rows }),
  kill: (id: string) => invoke<void>("pty_kill", { id }).catch(() => {}),
  onData: async (cb: (id: string, data: string) => void): Promise<Unlisten> => {
    if (!IS_TAURI) return () => {};
    const { listen } = await import("@tauri-apps/api/event");
    return listen<{ id: string; data: string }>("pty:data", (e) =>
      cb(e.payload.id, e.payload.data)
    );
  },
  onExit: async (cb: (id: string) => void): Promise<Unlisten> => {
    if (!IS_TAURI) return () => {};
    const { listen } = await import("@tauri-apps/api/event");
    return listen<{ id: string }>("pty:exit", (e) => cb(e.payload.id));
  },
};

// GitHub push sign-in (OAuth Device Flow). The token is stored by the system
// git credential helper in the backend; the frontend only drives the UX.
export interface DeviceStart {
  userCode: string;
  verificationUri: string;
  deviceCode: string;
  interval: number;
  expiresIn: number;
}
export type PollResult =
  | { status: "pending" }
  | { status: "slow_down" }
  | { status: "ok" }
  | { status: "error"; message: string };

export const authApi = {
  available: (): Promise<boolean> =>
    IS_TAURI ? invoke<boolean>("github_signin_available") : Promise.resolve(false),
  start: () => invoke<DeviceStart>("github_device_start"),
  poll: (deviceCode: string) => invoke<PollResult>("github_device_poll", { deviceCode }),
};

// Auto-updater: checks the configured endpoint, downloads + installs a newer
// signed build, then relaunches. No-op (returns false) outside Tauri or when no
// update is available.
export const updateApi = {
  checkAndInstall: async (onStatus: (s: string) => void): Promise<boolean> => {
    if (!IS_TAURI) return false;
    const { check } = await import("@tauri-apps/plugin-updater");
    const update = await check();
    if (!update) return false;
    onStatus(`Installing ${update.version}…`);
    await update.downloadAndInstall();
    const { relaunch } = await import("@tauri-apps/plugin-process");
    await relaunch();
    return true;
  },
};

// Misc native helpers and the native-menu event bridge.
export const miscApi = {
  openExternal: (url: string): Promise<void> => {
    if (IS_TAURI) return invoke<void>("open_external", { url });
    window.open(url, "_blank", "noopener");
    return Promise.resolve();
  },
  onMenu: async (cb: (id: string) => void): Promise<Unlisten> => {
    if (!IS_TAURI) return () => {};
    const { listen } = await import("@tauri-apps/api/event");
    return listen<string>("menu", (e) => cb(e.payload));
  },
};

// Per-workspace tab state restored on reopen.
export interface WorkspaceState {
  tabs: string[];
  active: string | null;
}

// The single persisted config blob (app-config dir / config.json).
export interface PersistedConfig {
  settings?: Partial<TweakState>;
  lastWorkspace?: string | null;
  recentWorkspaces?: string[];
  workspaces?: Record<string, WorkspaceState>;
}

export const configApi = {
  load: async (): Promise<PersistedConfig> => {
    if (!IS_TAURI) return {};
    try {
      const raw = await invoke<string>("read_config");
      return raw ? (JSON.parse(raw) as PersistedConfig) : {};
    } catch {
      return {};
    }
  },
  save: (cfg: PersistedConfig): Promise<void> => {
    if (!IS_TAURI) return Promise.resolve();
    return invoke<void>("write_config", { content: JSON.stringify(cfg, null, 2) }).catch(() => {});
  },
};
