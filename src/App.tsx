import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Icon } from "./components/Icon";
import { Sidebar } from "./components/Sidebar";
import { ActivityRail, type RailToggle } from "./components/ActivityRail";
import { GitPanel } from "./components/GitPanel";
import { Tabs } from "./components/editor/Tabs";
import { CodeEditor } from "./components/editor/CodeEditor";
import { Preview } from "./components/editor/Preview";
import { StatusBar } from "./components/editor/StatusBar";
import { EditorToolbar } from "./components/editor/EditorToolbar";
import { Terminal } from "./components/Terminal";
import { Palette, type Command, type PaletteMode } from "./components/overlays/Palette";
import { ContextMenu, type ContextAction } from "./components/overlays/ContextMenu";
import { Settings } from "./components/overlays/Settings";
import { Onboarding } from "./components/overlays/Onboarding";
import { PromptModal, type PromptConfig } from "./components/overlays/PromptModal";
import { Dashboard } from "./components/Dashboard";
import { wordCount } from "./lib/markdown";
import { IS_TAURI, fsApi, gitApi } from "./lib/tauri";
import type {
  Caret,
  EditorMode,
  FlatFile,
  GitState,
  TreeNode,
  TweakState,
} from "./types";

function flatten(nodes: TreeNode[], acc: FlatFile[]): FlatFile[] {
  nodes.forEach((n) => {
    if (n.type === "folder") flatten(n.children, acc);
    else
      acc.push({
        path: n.path,
        label: n.name.replace(/\.md$/, ""),
        dir: n.path.includes("/") ? n.path.slice(0, n.path.lastIndexOf("/")) : "",
      });
  });
  return acc;
}

const TWEAK_DEFAULTS: TweakState = {
  theme: "slate",
  accent: "",
  editorFont: "mono",
  fontSize: 15,
  uiScale: "comfortable",
  lineNumbers: false,
  wordWrap: true,
  autosave: true,
  commitOnSave: false,
};

type CssVarStyle = CSSProperties & Record<`--${string}`, string | number>;

export default function App() {
  const [t, setTweakState] = useState<TweakState>(TWEAK_DEFAULTS);
  const setTweak = useCallback(
    <K extends keyof TweakState>(key: K, value: TweakState[K]) => {
      setTweakState((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const [onboarded, setOnboarded] = useState(false);
  // Absolute path of the opened folder. Null until the user opens one — the
  // app shows real on-disk content only, never sample data.
  const [root, setRoot] = useState<string | null>(null);
  const [folderName, setFolderName] = useState("");
  const [tree, setTree] = useState<TreeNode[]>([]);
  const fileNames = useMemo(() => flatten(tree, []), [tree]);

  const [files, setFiles] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<Record<string, string>>({});
  const [tabs, setTabs] = useState<string[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [mode, setMode] = useState<EditorMode>("split");
  const [caret, setCaret] = useState<Caret>({ line: 1, col: 1 });

  const [showSidebar, setShowSidebar] = useState(true);
  const [showGit, setShowGit] = useState(false);
  const [showTerm, setShowTerm] = useState(true);
  const [termMax, setTermMax] = useState(false);

  const [git, setGit] = useState<GitState>({
    repo: "",
    branch: "",
    ahead: 0,
    changes: [],
    repos: [],
  });
  const [commitMsg, setCommitMsg] = useState("");

  const [palette, setPalette] = useState<PaletteMode | null>(null);
  const [ctx, setCtx] = useState<{ x: number; y: number; node: TreeNode | null } | null>(null);
  const [prompt, setPrompt] = useState<PromptConfig | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const taRef = useRef<HTMLTextAreaElement>(null);
  const toastTimer = useRef<number | null>(null);

  const flash = useCallback((m: string) => {
    setToast(m);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 1900);
  }, []);

  // Pull live git state from disk. No-op in the browser mock.
  const refreshGit = useCallback(
    (r: string | null = root) => {
      if (!r) return;
      gitApi
        .status(r)
        .then((st) => {
          if (!st.is_repo) {
            setGit((g) => ({ ...g, changes: [], ahead: 0 }));
            return;
          }
          setGit((g) => ({ ...g, branch: st.branch, ahead: st.ahead, changes: st.changes }));
        })
        .catch(() => {});
    },
    [root]
  );

  // Re-read the folder tree from disk, preserving which folders are expanded.
  const reloadTree = useCallback(
    (r: string | null = root) => {
      if (!r) return;
      const openPaths = new Set<string>();
      const collect = (nodes: TreeNode[]) =>
        nodes.forEach((n) => {
          if (n.type === "folder") {
            if (n.open) openPaths.add(n.path);
            collect(n.children);
          }
        });
      collect(tree);
      const applyOpen = (nodes: TreeNode[]): TreeNode[] =>
        nodes.map((n) =>
          n.type === "folder"
            ? { ...n, open: openPaths.has(n.path), children: applyOpen(n.children) }
            : n
        );
      fsApi
        .listDir(r)
        .then((t) => setTree(applyOpen(t)))
        .catch((e) => flash("Reload failed: " + e));
    },
    [root, tree, flash]
  );

  // Open a real folder as the workspace (native only).
  const openWorkspace = useCallback(
    async (abs: string) => {
      try {
        const t = await fsApi.listDir(abs);
        setRoot(abs);
        setFolderName(abs.split("/").filter(Boolean).pop() || abs);
        setTree(t);
        setFiles({});
        setSaved({});
        setTabs([]);
        setActive(null);
        refreshGit(abs);
        flash("Opened " + (abs.split("/").pop() || abs));
      } catch (e) {
        flash("Open failed: " + e);
      }
    },
    [refreshGit, flash]
  );

  const pickFolder = useCallback(async () => {
    try {
      const abs = await fsApi.pickFolder();
      if (abs) await openWorkspace(abs);
      return abs;
    } catch (e) {
      flash("Picker failed: " + e);
      return null;
    }
  }, [openWorkspace, flash]);

  useEffect(() => {
    const el = document.querySelector<HTMLDivElement>(".app");
    if (!el) return;
    el.setAttribute("data-theme", t.theme);
    el.style.setProperty("--fs", t.fontSize + "px");
    el.style.setProperty(
      "--font-editor",
      t.editorFont === "semimono"
        ? '"IBM Plex Mono", ui-monospace, monospace'
        : '"JetBrains Mono", ui-monospace, monospace'
    );
    if (t.uiScale === "compact") {
      el.style.setProperty("--row", "22px");
      el.style.setProperty("--ui-fs", "12px");
    } else {
      el.style.setProperty("--row", "25px");
      el.style.setProperty("--ui-fs", "13px");
    }
    if (t.accent) el.style.setProperty("--accent", t.accent);
    else el.style.removeProperty("--accent");
  }, [t.theme, t.fontSize, t.editorFont, t.uiScale, t.accent, onboarded]);

  const openFile = useCallback(
    (path: string) => {
      if (!root) return;
      // Lazy-load from disk the first time a file is opened.
      if (files[path] == null) {
        fsApi
          .readFile(root, path)
          .then((content) => {
            setFiles((f) => ({ ...f, [path]: content }));
            setSaved((s) => ({ ...s, [path]: content }));
          })
          .catch((e) => flash("Open failed: " + e));
      }
      setActive(path);
      setTabs((tb) => (tb.includes(path) ? tb : [path, ...tb]));
    },
    [root, files, flash]
  );

  const toggleFolder = (path: string) => {
    const walk = (nodes: TreeNode[]): TreeNode[] =>
      nodes.map((n) =>
        n.path === path && n.type === "folder"
          ? { ...n, open: !n.open }
          : n.type === "folder"
          ? { ...n, children: walk(n.children) }
          : n
      );
    setTree((tr) => walk(tr));
  };

  const dirty = useMemo(() => {
    const s = new Set<string>();
    Object.keys(files).forEach((p) => {
      if (files[p] !== saved[p]) s.add(p);
    });
    return s;
  }, [files, saved]);

  const editActive = (val: string) => {
    if (!active || active === "__settings__" || active === "__dashboard__") return;
    setFiles((f) => ({ ...f, [active]: val }));
  };

  const saveActive = useCallback(() => {
    if (!root || !active || active === "__settings__" || active === "__dashboard__") return;
    if (files[active] === saved[active]) {
      flash("Already saved");
      return;
    }
    const content = files[active];
    const path = active;
    setSaved((s) => ({ ...s, [path]: content }));
    const label = path.split("/").pop();
    fsApi
      .writeFile(root, path, content)
      .then(() => {
        flash("Saved · " + label);
        if (t.commitOnSave && git.branch) {
          gitApi
            .stage(root, path)
            .then(() => gitApi.commit(root, "Update " + label))
            .then(() => refreshGit())
            .catch(() => refreshGit());
        } else {
          refreshGit();
        }
      })
      .catch((e) => flash("Save failed: " + e));
  }, [active, files, saved, flash, root, refreshGit, t.commitOnSave, git.branch]);

  useEffect(() => {
    if (!t.autosave || !root) return;
    const id = window.setTimeout(() => {
      if (active && active !== "__settings__" && active !== "__dashboard__" && files[active] !== saved[active]) {
        const content = files[active];
        setSaved((s) => ({ ...s, [active]: content }));
        fsApi
          .writeFile(root, active, content)
          .then(() => refreshGit())
          .catch(() => {});
      }
    }, 1200);
    return () => window.clearTimeout(id);
  }, [files, active, t.autosave, saved, root, refreshGit]);

  const closeTab = (path: string) => {
    setTabs((tb) => {
      const i = tb.indexOf(path);
      const next = tb.filter((x) => x !== path);
      if (path === active) setActive(next[Math.max(0, i - 1)] || next[0] || null);
      return next;
    });
  };

  const openWikilink = (target: string) => {
    const base = target.split("#")[0].trim().toLowerCase();
    const hit =
      fileNames.find((f) => f.label.toLowerCase() === base) ||
      fileNames.find((f) => f.label.toLowerCase().includes(base));
    if (hit) {
      openFile(hit.path);
      flash("→ " + hit.label);
    } else {
      flash('No note named "' + target.split("#")[0] + '"');
    }
  };

  const stage = (p: string) => {
    if (!root) return;
    gitApi.stage(root, p).then(() => refreshGit()).catch((e) => flash("Stage failed: " + e));
  };
  const unstage = (p: string) => {
    if (!root) return;
    gitApi.unstage(root, p).then(() => refreshGit()).catch((e) => flash("Unstage failed: " + e));
  };
  const stageAll = () => {
    if (!root) return;
    gitApi.stageAll(root).then(() => refreshGit()).catch((e) => flash("Stage failed: " + e));
  };
  const commit = () => {
    if (!root) return;
    const staged = git.changes.filter((c) => c.staged);
    if (!staged.length || !commitMsg.trim()) return;
    gitApi
      .commit(root, commitMsg)
      .then(() => {
        refreshGit();
        flash(`Committed on ${git.branch}`);
        setCommitMsg("");
      })
      .catch((e) => flash("Commit failed: " + e));
  };
  const push = () => {
    if (!root) return;
    if (!git.branch) {
      flash("Not a git repository");
      return;
    }
    flash("Pushing to origin/" + git.branch + "…");
    gitApi
      .push(root)
      .then(() => {
        refreshGit();
        flash("Pushed to origin/" + git.branch);
      })
      .catch((e) => flash("Push failed: " + e));
  };

  const addNode = (name: string, isFolder: boolean, parentPath: string) => {
    if (!root) return;
    const path =
      (parentPath ? parentPath + "/" : "") + name + (isFolder || name.endsWith(".md") ? "" : ".md");
    const op = isFolder
      ? fsApi.createFolder(root, path)
      : fsApi.createFile(root, path, "# " + name.replace(/\.md$/, "") + "\n\n");
    op
      .then(() => {
        reloadTree();
        refreshGit();
        if (!isFolder) openFile(path);
        flash((isFolder ? "Folder" : "Note") + " created · " + name);
      })
      .catch((e) => flash("Create failed: " + e));
  };

  const ctxAction = (action: ContextAction, node: TreeNode | null) => {
    setCtx(null);
    const parent = node
      ? node.type === "folder"
        ? node.path
        : node.path.includes("/")
        ? node.path.slice(0, node.path.lastIndexOf("/"))
        : ""
      : "";
    if (action === "newfile")
      setPrompt({
        title: "New note name",
        value: "Untitled",
        onConfirm: (v) => v && addNode(v, false, parent),
      });
    else if (action === "newfolder")
      setPrompt({
        title: "New folder name",
        value: "New Folder",
        onConfirm: (v) => v && addNode(v, true, parent),
      });
    else if (action === "rename" && node)
      setPrompt({
        title: "Rename",
        value: node.name,
        onConfirm: (v) => renameNode(node, v),
      });
    else if (action === "delete" && node)
      setPrompt({
        title: 'Delete "' + node.name + '"? Type yes',
        value: "",
        confirm: true,
        onConfirm: (v) => {
          if (v.toLowerCase() === "yes") deleteNode(node);
        },
      });
    else if (action === "reveal" && node) {
      navigator.clipboard?.writeText(node.path);
      flash("Path copied");
    }
  };

  const renameNode = (node: TreeNode, newName: string) => {
    if (!root || !newName || newName === node.name) return;
    const parent = node.path.includes("/") ? node.path.slice(0, node.path.lastIndexOf("/")) : "";
    const to = (parent ? parent + "/" : "") + newName;
    // Remap the renamed path and, for a folder, any open child paths under it.
    const remap = (p: string) =>
      p === node.path
        ? to
        : node.type === "folder" && p.startsWith(node.path + "/")
        ? to + p.slice(node.path.length)
        : p;
    fsApi
      .rename(root, node.path, to)
      .then(() => {
        reloadTree();
        refreshGit();
        setTabs((tb) => tb.map(remap));
        setActive((a) => (a ? remap(a) : a));
        flash("Renamed → " + newName);
      })
      .catch((e) => flash("Rename failed: " + e));
  };
  const deleteNode = (node: TreeNode) => {
    if (!root) return;
    const isUnder = (p: string) =>
      p === node.path || (node.type === "folder" && p.startsWith(node.path + "/"));
    fsApi
      .delete(root, node.path)
      .then(() => {
        reloadTree();
        refreshGit();
        setTabs((tb) => tb.filter((p) => !isUnder(p)));
        setActive((a) => (a && isUnder(a) ? null : a));
        flash("Deleted · " + node.name);
      })
      .catch((e) => flash("Delete failed: " + e));
  };

  const commands: Command[] = useMemo(
    () => [
      { id: "view.dashboard", label: "View: Open Dashboard", icon: "grid" },
      { id: "toggle.sidebar", label: "View: Toggle Sidebar", icon: "files", shortcut: "⌘B" },
      { id: "toggle.terminal", label: "View: Toggle Terminal", icon: "terminal", shortcut: "⌘`" },
      { id: "toggle.git", label: "View: Toggle Source Control", icon: "git", shortcut: "⌘⇧G" },
      { id: "mode.edit", label: "Editor: Edit mode", icon: "edit" },
      { id: "mode.preview", label: "Editor: Preview mode", icon: "eye", shortcut: "⌘⇧V" },
      { id: "mode.split", label: "Editor: Split mode", icon: "columns" },
      { id: "file.new", label: "File: New Note", icon: "file-plus", shortcut: "⌘N" },
      { id: "file.save", label: "File: Save", icon: "check", shortcut: "⌘S" },
      { id: "git.stageAll", label: "Git: Stage All Changes", icon: "plus" },
      { id: "git.push", label: "Git: Push", icon: "upload" },
      { id: "settings.open", label: "Preferences: Open Settings", icon: "settings", shortcut: "⌘," },
      { id: "theme.slate", label: "Theme: Soft Slate", icon: "eye" },
      { id: "theme.terminal", label: "Theme: True Terminal", icon: "terminal" },
      { id: "theme.warm", label: "Theme: Warm Ink", icon: "book" },
    ],
    []
  );

  const openSettings = () => {
    setTabs((tb) => (tb.includes("__settings__") ? tb : [...tb, "__settings__"]));
    setActive("__settings__");
  };
  const openDashboard = () => {
    setTabs((tb) => (tb.includes("__dashboard__") ? tb : ["__dashboard__", ...tb]));
    setActive("__dashboard__");
  };
  const doSync = () => {
    if (!root) {
      flash("Open a folder first");
      return;
    }
    if (!git.branch) {
      flash("Not a git repository");
      return;
    }
    flash("Pushing to origin/" + git.branch + "…");
    gitApi
      .push(root)
      .then(() => {
        refreshGit();
        flash("Workspace synced ✓");
      })
      .catch((e) => flash("Sync failed: " + e));
  };

  const runCmd = (id: string) => {
    if (id === "view.dashboard") openDashboard();
    else if (id === "toggle.sidebar") setShowSidebar((v) => !v);
    else if (id === "toggle.terminal") setShowTerm((v) => !v);
    else if (id === "toggle.git") setShowGit((v) => !v);
    else if (id === "mode.edit") setMode("edit");
    else if (id === "mode.preview") setMode("preview");
    else if (id === "mode.split") setMode("split");
    else if (id === "file.new") ctxAction("newfile", null);
    else if (id === "file.save") saveActive();
    else if (id === "git.stageAll") {
      stageAll();
      setShowGit(true);
    } else if (id === "git.push") push();
    else if (id === "settings.open") openSettings();
    else if (id.startsWith("theme.")) setTweak("theme", id.split(".")[1] as TweakState["theme"]);
  };

  const totalWords = useMemo(
    () => Object.keys(files).reduce((n, p) => n + wordCount(files[p]), 0),
    [files]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) {
        if (e.key === "Escape") {
          setPalette(null);
          setCtx(null);
          setPrompt(null);
        }
        return;
      }
      const k = e.key.toLowerCase();
      if (k === "b") {
        e.preventDefault();
        setShowSidebar((v) => !v);
      } else if (e.key === "`") {
        e.preventDefault();
        setShowTerm((v) => !v);
      } else if (e.shiftKey && k === "g") {
        e.preventDefault();
        setShowGit((v) => !v);
      } else if (e.shiftKey && k === "p") {
        e.preventDefault();
        setPalette("command");
      } else if (k === "p") {
        e.preventDefault();
        setPalette("file");
      } else if (e.shiftKey && k === "v") {
        e.preventDefault();
        setMode((m) => (m === "edit" ? "preview" : m === "preview" ? "split" : "edit"));
      } else if (k === "n") {
        e.preventDefault();
        ctxAction("newfile", null);
      } else if (k === "s") {
        e.preventDefault();
        saveActive();
      } else if (k === ",") {
        e.preventDefault();
        openSettings();
      } else if (k === "o") {
        e.preventDefault();
        if (IS_TAURI) pickFolder();
        else flash("Open Folder — native only (running in browser mock)");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveActive]);

  if (!onboarded)
    return (
      <Onboarding
        onOpenFolder={
          IS_TAURI
            ? () => {
                pickFolder().then((abs) => {
                  if (abs) setOnboarded(true);
                });
              }
            : undefined
        }
      />
    );

  const activeVal =
    active && active !== "__settings__" && active !== "__dashboard__" ? files[active] ?? "" : "";
  const isSynced =
    active && active !== "__settings__" && active !== "__dashboard__"
      ? !dirty.has(active) && !git.changes.some((c) => c.path === active)
      : true;
  const gitCount = git.changes.length;

  const appStyle: CssVarStyle = { "--term-h": termMax ? "58vh" : "240px" };

  return (
    <div className="app" style={appStyle}>
      <div className="titlebar" data-tauri-drag-region>
        {/* Spacer reserves room for the native macOS window controls (Overlay titlebar). */}
        <div className="tb-spacer" data-tauri-drag-region />
        <div className="title" data-tauri-drag-region>
          <b>IWE</b>
          {(() => {
            const context =
              active === "__settings__"
                ? "Settings"
                : active === "__dashboard__"
                ? "Dashboard"
                : active
                ? active.split("/").pop()!.replace(/\.md$/, "")
                : "";
            return (
              <>
                {context && (
                  <>
                    <span className="dot">·</span>
                    <span>{context}</span>
                  </>
                )}
                {folderName && (
                  <>
                    <span className="dot">—</span>
                    <span>{folderName}</span>
                  </>
                )}
              </>
            );
          })()}
        </div>
        <div className="right">
          <button
            className={"tb-btn" + (showSidebar ? " on" : "")}
            title="Sidebar (⌘B)"
            onClick={() => setShowSidebar((v) => !v)}
          >
            <Icon name="files" size={16} />
          </button>
          <button
            className={"tb-btn" + (showGit ? " on" : "")}
            title="Source Control (⌘⇧G)"
            onClick={() => setShowGit((v) => !v)}
          >
            <Icon name="git" size={16} />
          </button>
          <button
            className={"tb-btn" + (showTerm ? " on" : "")}
            title="Terminal (⌘`)"
            onClick={() => setShowTerm((v) => !v)}
          >
            <Icon name="terminal" size={16} />
          </button>
        </div>
      </div>

      <div className="body">
        <ActivityRail
          active={{
            dashboard: active === "__dashboard__",
            explorer: showSidebar,
            git: showGit,
            terminal: showTerm,
            settings: active === "__settings__",
          }}
          gitCount={gitCount}
          onToggle={(id: RailToggle) => {
            if (id === "dashboard") openDashboard();
            else if (id === "sync") {
              openDashboard();
              doSync();
            } else if (id === "explorer") setShowSidebar((v) => !v);
            else if (id === "git") setShowGit((v) => !v);
            else if (id === "terminal") setShowTerm((v) => !v);
            else if (id === "settings") openSettings();
          }}
        />

        {showSidebar && (
          <Sidebar
            folderName={folderName}
            branch={git.branch}
            tree={tree}
            activePath={active}
            onOpenFile={openFile}
            onToggleFolder={toggleFolder}
            onContext={(e, node) => {
              e.preventDefault();
              setCtx({ x: e.clientX, y: e.clientY, node });
            }}
            onNewFile={(folder) => ctxAction(folder ? "newfolder" : "newfile", null)}
            onRefresh={() => {
              if (root) {
                reloadTree();
                refreshGit();
              }
              flash("Refreshed");
            }}
          />
        )}

        <div className="center">
          <Tabs tabs={tabs} active={active} dirty={dirty} onSelect={setActive} onClose={closeTab} />
          {active === "__settings__" ? (
            <div style={{ flex: 1, position: "relative", minHeight: 0 }}>
              <Settings s={t} set={setTweak} theme={t.theme} setTheme={(v) => setTweak("theme", v)} folderName={folderName} />
            </div>
          ) : active === "__dashboard__" ? (
            <div style={{ flex: 1, position: "relative", minHeight: 0 }}>
              <Dashboard
                folderName={folderName}
                totalWords={totalWords}
                files={fileNames}
                recentPaths={tabs.filter((p) => p !== "__settings__" && p !== "__dashboard__")}
                branch={git.branch}
                changeCount={git.changes.length}
                onOpenFile={openFile}
                onNewDoc={() => ctxAction("newfile", null)}
                onImport={() => (IS_TAURI ? pickFolder() : flash("Open Folder — native only"))}
                onManageSync={() => {
                  setShowGit(true);
                  flash("Source Control opened");
                }}
                onSync={doSync}
                onSearchAll={() => {
                  setShowSidebar(true);
                  flash("Showing all documents");
                }}
              />
            </div>
          ) : active ? (
            <>
              <EditorToolbar path={active} mode={mode} setMode={setMode} />
              <div className="edit-wrap">
                {(mode === "edit" || mode === "split") && (
                  <CodeEditor
                    value={activeVal}
                    onChange={editActive}
                    lineNumbers={t.lineNumbers}
                    wordWrap={t.wordWrap}
                    fileNames={fileNames}
                    onCaret={setCaret}
                    taRef={taRef}
                  />
                )}
                {(mode === "preview" || mode === "split") && (
                  <Preview value={activeVal} onWikilink={openWikilink} single={mode === "preview"} />
                )}
              </div>
              <StatusBar
                path={active}
                value={activeVal}
                caret={caret}
                synced={isSynced}
                isRepo={!!git.branch}
                onToggleTerminal={() => setShowTerm((v) => !v)}
              />
            </>
          ) : (
            <div style={{ flex: 1, display: "grid", placeItems: "center", color: "var(--text-3)" }}>
              No file open · ⌘P to find a note
            </div>
          )}
        </div>

        {showGit && (
          <GitPanel
            git={git}
            msg={commitMsg}
            setMsg={setCommitMsg}
            onStage={stage}
            onUnstage={unstage}
            onStageAll={stageAll}
            onCommit={commit}
            onPush={push}
            onOpenFile={openFile}
            folderName={folderName}
            onRefresh={() => {
              reloadTree();
              refreshGit();
              flash("Refreshed");
            }}
          />
        )}
      </div>

      {showTerm && (
        <Terminal cwd={root} onClose={() => setShowTerm(false)} onToggleMax={() => setTermMax((v) => !v)} />
      )}

      {palette && (
        <Palette
          mode={palette}
          commands={commands}
          files={fileNames}
          onRun={runCmd}
          onOpenFile={openFile}
          onClose={() => setPalette(null)}
        />
      )}
      {ctx && (
        <ContextMenu x={ctx.x} y={ctx.y} node={ctx.node} onAction={ctxAction} onClose={() => setCtx(null)} />
      )}
      {prompt && <PromptModal {...prompt} onClose={() => setPrompt(null)} />}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
