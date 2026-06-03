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
import { RepoMenu } from "./components/overlays/RepoMenu";
import { Settings } from "./components/overlays/Settings";
import { Onboarding } from "./components/overlays/Onboarding";
import { PromptModal, type PromptConfig } from "./components/overlays/PromptModal";
import { Dashboard } from "./components/Dashboard";
import { VAULT } from "./data/vault";
import { wordCount } from "./lib/markdown";
import type {
  Caret,
  EditorMode,
  FlatFile,
  FolderNode,
  GitState,
  TreeNode,
  TweakState,
} from "./types";

function cloneTree(nodes: TreeNode[]): TreeNode[] {
  return nodes.map((n) =>
    n.type === "folder" ? { ...n, children: cloneTree(n.children) } : { ...n }
  );
}

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
  const [tree, setTree] = useState<TreeNode[]>(() => cloneTree(VAULT.tree));
  const fileNames = useMemo(() => flatten(VAULT.tree, []), []);

  const [files, setFiles] = useState<Record<string, string>>(() => ({ ...VAULT.files }));
  const [saved, setSaved] = useState<Record<string, string>>(() => ({ ...VAULT.files }));
  const [tabs, setTabs] = useState<string[]>([
    "Manuscript/Chapter 03 — The Customs House.md",
    "Manuscript/Chapter 01 — The Harbor.md",
    "README.md",
  ]);
  const [active, setActive] = useState<string | null>("Manuscript/Chapter 03 — The Customs House.md");
  const [mode, setMode] = useState<EditorMode>("split");
  const [caret, setCaret] = useState<Caret>({ line: 1, col: 1 });

  const [showSidebar, setShowSidebar] = useState(true);
  const [showGit, setShowGit] = useState(false);
  const [showTerm, setShowTerm] = useState(true);
  const [termMax, setTermMax] = useState(false);

  const [git, setGit] = useState<GitState>(() => JSON.parse(JSON.stringify(VAULT.git)));
  const [commitMsg, setCommitMsg] = useState("");

  const [palette, setPalette] = useState<PaletteMode | null>(null);
  const [ctx, setCtx] = useState<{ x: number; y: number; node: TreeNode | null } | null>(null);
  const [repoMenu, setRepoMenu] = useState<{ x: number; y: number } | null>(null);
  const [prompt, setPrompt] = useState<PromptConfig | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const taRef = useRef<HTMLTextAreaElement>(null);
  const toastTimer = useRef<number | null>(null);
  const syncTimer = useRef<number | null>(null);

  const flash = useCallback((m: string) => {
    setToast(m);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 1900);
  }, []);

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
      if (!VAULT.files[path] && files[path] == null) return;
      setActive(path);
      setTabs((tb) => (tb.includes(path) ? tb : [path, ...tb]));
    },
    [files]
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

  const markGitModified = (path: string) => {
    setGit((g) => {
      if (g.changes.some((c) => c.path === path)) return g;
      return { ...g, changes: [...g.changes, { path, status: "M", staged: false, add: 1, del: 0 }] };
    });
  };

  const saveActive = useCallback(() => {
    if (!active || active === "__settings__" || active === "__dashboard__") return;
    if (files[active] === saved[active]) {
      flash("Already saved");
      return;
    }
    setSaved((s) => ({ ...s, [active]: files[active] }));
    markGitModified(active);
    flash("Saved · " + active.split("/").pop());
  }, [active, files, saved, flash]);

  useEffect(() => {
    if (!t.autosave) return;
    const id = window.setTimeout(() => {
      if (active && active !== "__settings__" && active !== "__dashboard__" && files[active] !== saved[active]) {
        setSaved((s) => ({ ...s, [active]: files[active] }));
        markGitModified(active);
      }
    }, 1200);
    return () => window.clearTimeout(id);
  }, [files, active, t.autosave, saved]);

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

  const stage = (p: string) =>
    setGit((g) => ({ ...g, changes: g.changes.map((c) => (c.path === p ? { ...c, staged: true } : c)) }));
  const unstage = (p: string) =>
    setGit((g) => ({ ...g, changes: g.changes.map((c) => (c.path === p ? { ...c, staged: false } : c)) }));
  const stageAll = () =>
    setGit((g) => ({ ...g, changes: g.changes.map((c) => ({ ...c, staged: true })) }));
  const commit = () => {
    const staged = git.changes.filter((c) => c.staged);
    if (!staged.length || !commitMsg.trim()) return;
    setGit((g) => ({ ...g, changes: g.changes.filter((c) => !c.staged), ahead: g.ahead + 1 }));
    flash(`Committed ${staged.length} file${staged.length > 1 ? "s" : ""} on ${git.branch}`);
    setCommitMsg("");
  };
  const push = () => {
    if (git.ahead === 0) {
      flash("Nothing to push");
      return;
    }
    setGit((g) => ({ ...g, ahead: 0 }));
    flash("Pushed to origin/" + git.branch);
  };
  const pickRepo = (r: string) => {
    setGit((g) => ({ ...g, repo: r.split(" ")[0] }));
    flash("Switched to " + r.split(" ")[0]);
  };

  const addNode = (name: string, isFolder: boolean, parentPath: string) => {
    const path =
      (parentPath ? parentPath + "/" : "") + name + (isFolder || name.endsWith(".md") ? "" : ".md");
    const node: TreeNode = isFolder
      ? ({ type: "folder", name, path, open: true, children: [] } as FolderNode)
      : { type: "file", name: name.endsWith(".md") ? name : name + ".md", path, git: "A" };
    const insert = (nodes: TreeNode[]): TreeNode[] => {
      if (!parentPath) return [...nodes, node];
      return nodes.map((n) =>
        n.path === parentPath && n.type === "folder"
          ? { ...n, open: true, children: [...n.children, node] }
          : n.type === "folder"
          ? { ...n, children: insert(n.children) }
          : n
      );
    };
    setTree((tr) => insert(tr));
    if (!isFolder) {
      setFiles((f) => ({ ...f, [node.path]: "# " + name.replace(/\.md$/, "") + "\n\n" }));
      setSaved((s) => ({ ...s, [node.path]: "" }));
      setGit((g) => ({
        ...g,
        changes: [...g.changes, { path: node.path, status: "A", staged: false, add: 1, del: 0 }],
      }));
      openFile(node.path);
    }
    flash((isFolder ? "Folder" : "Note") + " created · " + name);
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
    if (!newName || newName === node.name) return;
    const walk = (nodes: TreeNode[]): TreeNode[] =>
      nodes.map((n) =>
        n.path === node.path
          ? ({ ...n, name: newName } as TreeNode)
          : n.type === "folder"
          ? { ...n, children: walk(n.children) }
          : n
      );
    setTree((tr) => walk(tr));
    flash("Renamed → " + newName);
  };
  const deleteNode = (node: TreeNode) => {
    const walk = (nodes: TreeNode[]): TreeNode[] =>
      nodes
        .filter((n) => n.path !== node.path)
        .map((n) => (n.type === "folder" ? { ...n, children: walk(n.children) } : n));
    setTree((tr) => walk(tr));
    closeTab(node.path);
    flash("Deleted · " + node.name);
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
    flash("Syncing with origin/" + git.branch + "…");
    if (syncTimer.current) window.clearTimeout(syncTimer.current);
    syncTimer.current = window.setTimeout(() => {
      setGit((g) => ({ ...g, ahead: 0 }));
      flash("Workspace synced ✓");
    }, 950);
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
          setRepoMenu(null);
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
        flash("Open Folder — already in the-salt-road");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveActive]);

  if (!onboarded) return <Onboarding onOpen={() => setOnboarded(true)} />;

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
      <div className="titlebar">
        <div className="traffic">
          <i className="r" />
          <i className="y" />
          <i className="g" />
        </div>
        <div className="title">
          <b>IWE</b>
          <span className="dot">·</span>
          <span>
            {active && active !== "__settings__" && active !== "__dashboard__"
              ? active.split("/").pop()!.replace(/\.md$/, "")
              : active === "__dashboard__"
              ? "Dashboard"
              : "Settings"}
          </span>
          <span className="dot">—</span>
          <span>{VAULT.folderName}</span>
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
            folderName={VAULT.folderName}
            branch={VAULT.branch}
            tree={tree}
            activePath={active}
            onOpenFile={openFile}
            onToggleFolder={toggleFolder}
            onContext={(e, node) => {
              e.preventDefault();
              setCtx({ x: e.clientX, y: e.clientY, node });
            }}
            repo={git.repo}
            onPickRepo={() => setRepoMenu({ x: 60, y: window.innerHeight - 150 })}
            onNewFile={(folder) => ctxAction(folder ? "newfolder" : "newfile", null)}
            onRefresh={() => flash("Refreshed")}
          />
        )}

        <div className="center">
          <Tabs tabs={tabs} active={active} dirty={dirty} onSelect={setActive} onClose={closeTab} />
          {active === "__settings__" ? (
            <div style={{ flex: 1, position: "relative", minHeight: 0 }}>
              <Settings s={t} set={setTweak} theme={t.theme} setTheme={(v) => setTweak("theme", v)} />
            </div>
          ) : active === "__dashboard__" ? (
            <div style={{ flex: 1, position: "relative", minHeight: 0 }}>
              <Dashboard
                totalWords={totalWords}
                onOpenFile={openFile}
                onNewDoc={() => ctxAction("newfile", null)}
                onImport={() => flash("Import Folder — choose a directory to add")}
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
            onPickRepo={() => setRepoMenu({ x: window.innerWidth - 280, y: 120 })}
            onAddRepo={() => flash("Connect a new GitHub repository")}
          />
        )}
      </div>

      {showTerm && (
        <Terminal git={git} onClose={() => setShowTerm(false)} onToggleMax={() => setTermMax((v) => !v)} />
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
      {repoMenu && (
        <RepoMenu
          x={repoMenu.x}
          y={repoMenu.y}
          repos={git.repos}
          current={git.repo}
          onPick={pickRepo}
          onAdd={() => flash("Add a repository")}
          onClose={() => setRepoMenu(null)}
        />
      )}
      {prompt && <PromptModal {...prompt} onClose={() => setPrompt(null)} />}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
