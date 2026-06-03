import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "./Icon";
import { VAULT } from "../data/vault";
import type { GitState, TreeNode } from "../types";

const TERM_PROMPT = "~/the-salt-road";

function flatFiles(): string[] {
  const out: string[] = [];
  const walk = (nodes: TreeNode[]) =>
    nodes.forEach((n) => {
      if (n.type === "folder") walk(n.children);
      else out.push(n.path);
    });
  walk(VAULT.tree);
  return out;
}

interface LineProps {
  children: ReactNode;
  cls?: string;
}

function Line({ children, cls }: LineProps) {
  return <div className={"term-line" + (cls ? " " + cls : "")}>{children}</div>;
}

function Prompt() {
  return (
    <>
      <span className="pr">➜</span> <span className="pth">{TERM_PROMPT}</span>{" "}
    </>
  );
}

type CommandResult = ReactNode[] | "CLEAR";

function runCommand(raw: string, git: GitState): CommandResult {
  const cmd = raw.trim();
  if (!cmd) return [];
  const [c, ...args] = cmd.split(/\s+/);
  const arg = args.join(" ");
  const ls = flatFiles();

  switch (c) {
    case "help":
      return [
        <Line cls="muted">Available commands:</Line>,
        <Line>
          <span className="ok">ls</span> list files <span className="ok">cat &lt;file&gt;</span> print file{" "}
          <span className="ok">wc &lt;file&gt;</span> word count
        </Line>,
        <Line>
          <span className="ok">git status</span> · <span className="ok">git log</span> ·{" "}
          <span className="ok">git add .</span> · <span className="ok">git commit -m</span> ·{" "}
          <span className="ok">git push</span>
        </Line>,
        <Line>
          <span className="ok">claude</span> AI assistant <span className="ok">pwd</span> ·{" "}
          <span className="ok">whoami</span> · <span className="ok">date</span> ·{" "}
          <span className="ok">clear</span>
        </Line>,
      ];
    case "ls": {
      const top = VAULT.tree.map((n) => (n.type === "folder" ? n.name + "/" : n.name));
      return [
        <Line>
          {top.map((n, i) => (
            <span key={i} style={{ marginRight: 18, color: n.endsWith("/") ? "var(--accent)" : "var(--text)" }}>
              {n}
            </span>
          ))}
        </Line>,
      ];
    }
    case "pwd":
      return [<Line>/Users/mira/the-salt-road</Line>];
    case "whoami":
      return [<Line>mira</Line>];
    case "date":
      return [<Line>{new Date().toString()}</Line>];
    case "echo":
      return [<Line>{arg}</Line>];
    case "cat": {
      const match = ls.find((p) => arg && p.toLowerCase().includes(arg.toLowerCase().replace(/\.md$/, "")));
      if (!match) return [<Line cls="err">cat: {arg || "(no file)"}: No such file</Line>];
      const body = VAULT.files[match].split("\n").slice(0, 12);
      return [
        <Line cls="muted">── {match} ──</Line>,
        ...body.map((l, i) => <Line key={i}>{l || " "}</Line>),
        <Line cls="muted">… (truncated)</Line>,
      ];
    }
    case "wc": {
      const match = ls.find((p) => arg && p.toLowerCase().includes(arg.toLowerCase().replace(/\.md$/, "")));
      if (!match) return [<Line cls="err">wc: {arg}: No such file</Line>];
      const t = VAULT.files[match];
      return [
        <Line>
          {String(t.split(/\s+/).filter(Boolean).length).padStart(6)} words{" "}
          {String(t.split("\n").length).padStart(5)} lines {match}
        </Line>,
      ];
    }
    case "claude":
      return [
        <Line cls="warn">✻ Claude Code</Line>,
        <Line cls="muted">
          Connected. Working in salt-road on branch {git.branch}.
        </Line>,
        <Line>{" "}</Line>,
        <Line>
          Try: <span className="ok">claude "tighten the blackmail scene in Chapter 3"</span>
        </Line>,
        <Line cls="muted">(demo) — wire the real CLI in Settings → Terminal.</Line>,
      ];
    case "git": {
      const sub = args[0];
      if (sub === "status") {
        return [
          <Line>
            On branch <span className="ok">{git.branch}</span>
          </Line>,
          <Line cls="muted">
            Your branch is ahead of 'origin/{git.branch}' by {git.ahead} commits.
          </Line>,
          <Line>{" "}</Line>,
          <Line>Changes not staged for commit:</Line>,
          ...git.changes
            .filter((x) => !x.staged)
            .map((x, i) => (
              <Line key={i} cls={x.status === "D" ? "err" : x.status === "A" ? "ok" : "warn"}>
                {"  "}
                {x.status === "M" ? "modified:" : x.status === "A" ? "new file:" : "deleted: "} {x.path}
              </Line>
            )),
        ];
      }
      if (sub === "log") {
        return [
          <Line>
            <span className="warn">a3f9c1</span> tighten Ch.1 harbor open
          </Line>,
          <Line>
            <span className="warn">7b2e08</span> add Characters research note
          </Line>,
          <Line>
            <span className="warn">f04dd2</span> outline Part Two beats
          </Line>,
        ];
      }
      if (sub === "add") return [<Line cls="ok">staged {git.changes.length} files</Line>];
      if (sub === "commit")
        return [
          <Line cls="ok">
            [{git.branch} c0ffee2] {arg.replace(/-m\s*/, "").replace(/"/g, "") || "wip"}
          </Line>,
          <Line cls="muted"> {git.changes.length} files changed</Line>,
        ];
      if (sub === "push")
        return [
          <Line cls="muted">Enumerating objects… done.</Line>,
          <Line cls="ok">
            To github.com:mira/salt-road.git {git.branch} → {git.branch}
          </Line>,
        ];
      return [<Line>git version 2.43.0</Line>];
    }
    case "clear":
      return "CLEAR";
    default:
      return [
        <Line cls="err">zsh: command not found: {c}</Line>,
        <Line cls="muted">
          type <span className="ok">help</span> for commands
        </Line>,
      ];
  }
}

interface Session {
  id: number;
  name: string;
  lines: ReactNode[];
}

interface TerminalProps {
  git: GitState;
  onClose: () => void;
  onToggleMax: () => void;
}

export function Terminal({ git, onClose, onToggleMax }: TerminalProps) {
  const seed: ReactNode[] = [
    <Line cls="muted">
      IWE terminal · zsh · type <span className="ok">help</span>
    </Line>,
    <Line>
      <Prompt />
      <span>git status</span>
    </Line>,
    ...(runCommand("git status", git) as ReactNode[]),
  ];
  const [sessions, setSessions] = useState<Session[]>([{ id: 1, name: "zsh", lines: seed }]);
  const [active, setActive] = useState(1);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [hIdx, setHIdx] = useState(-1);
  const bodyRef = useRef<HTMLDivElement>(null);
  const inRef = useRef<HTMLInputElement>(null);
  const sess = sessions.find((s) => s.id === active);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [sessions, active]);

  const submit = () => {
    const cmd = input;
    const echo = (
      <Line>
        <Prompt />
        <span>{cmd}</span>
      </Line>
    );
    const result = runCommand(cmd, git);
    setSessions((ss) =>
      ss.map((s) => {
        if (s.id !== active) return s;
        if (result === "CLEAR") return { ...s, lines: [] };
        return { ...s, lines: [...s.lines, echo, ...result] };
      })
    );
    if (cmd.trim()) setHistory((h) => [...h, cmd]);
    setHIdx(-1);
    setInput("");
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const ni = hIdx < 0 ? history.length - 1 : Math.max(0, hIdx - 1);
      if (history[ni] != null) {
        setHIdx(ni);
        setInput(history[ni]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (hIdx < 0) return;
      const ni = hIdx + 1;
      if (ni >= history.length) {
        setHIdx(-1);
        setInput("");
      } else {
        setHIdx(ni);
        setInput(history[ni]);
      }
    } else if (e.key === "l" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      setSessions((ss) => ss.map((s) => (s.id === active ? { ...s, lines: [] } : s)));
    }
  };

  const addSession = () => {
    const id = Math.max(...sessions.map((s) => s.id)) + 1;
    setSessions([
      ...sessions,
      {
        id,
        name: "zsh",
        lines: [
          <Line cls="muted">
            new session · type <span className="ok">help</span>
          </Line>,
        ],
      },
    ]);
    setActive(id);
  };

  const closeSession = (id: number) => {
    if (sessions.length === 1) {
      onClose();
      return;
    }
    const rest = sessions.filter((s) => s.id !== id);
    setSessions(rest);
    if (active === id) setActive(rest[rest.length - 1].id);
  };

  return (
    <div className="terminal slide-up">
      <div className="term-tabs">
        {sessions.map((s) => (
          <div
            key={s.id}
            className={"term-tab" + (s.id === active ? " active" : "")}
            onClick={() => setActive(s.id)}
          >
            <span className="tdot" />
            <span>
              {s.id}: {s.name}
            </span>
            <button
              className="x"
              onClick={(e) => {
                e.stopPropagation();
                closeSession(s.id);
              }}
            >
              <Icon name="x" size={11} />
            </button>
          </div>
        ))}
        <div className="term-actions">
          <button className="icon-btn" title="New terminal" onClick={addSession}>
            <Icon name="plus" size={14} />
          </button>
          <button className="icon-btn" title="Maximize" onClick={onToggleMax}>
            <Icon name="split" size={13} />
          </button>
          <button className="icon-btn" title="Close panel (⌘`)" onClick={onClose}>
            <Icon name="x" size={14} />
          </button>
        </div>
      </div>
      <div className="term-body" ref={bodyRef} onClick={() => inRef.current && inRef.current.focus()}>
        {sess?.lines.map((l, i) => (
          <Fragment key={i}>{l}</Fragment>
        ))}
        <div className="term-input-row">
          <span className="pr">➜</span>
          <span className="pth">{TERM_PROMPT}</span>
          <input
            ref={inRef}
            className="term-input"
            value={input}
            autoFocus
            spellCheck={false}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
          />
        </div>
      </div>
    </div>
  );
}
