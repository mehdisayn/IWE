import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "./Icon";
import { termApi } from "../lib/tauri";

// Strip ANSI escape sequences so raw CLI color codes don't leak into the DOM.
// eslint-disable-next-line no-control-regex
const ANSI = /\[[0-9;]*m/g;

interface LineProps {
  children: ReactNode;
  cls?: string;
}

function Line({ children, cls }: LineProps) {
  return <div className={"term-line" + (cls ? " " + cls : "")}>{children}</div>;
}

function textToLines(text: string, cls?: string): ReactNode[] {
  if (!text) return [];
  return text
    .replace(ANSI, "")
    .replace(/\n$/, "")
    .split("\n")
    .map((l, i) => (
      <Line key={i} cls={cls}>
        {l || " "}
      </Line>
    ));
}

// Show a compact, shell-like label for the current directory.
function shortPath(abs: string): string {
  const parts = abs.split("/").filter(Boolean);
  if (parts.length === 0) return "/";
  return "~/…/" + parts[parts.length - 1];
}

function Prompt({ path, busy }: { path: string; busy?: boolean }) {
  return (
    <>
      <span className="pr">{busy ? "…" : "➜"}</span> <span className="pth">{path}</span>{" "}
    </>
  );
}

interface Session {
  id: number;
  name: string;
  lines: ReactNode[];
  cwd: string;
}

interface TerminalProps {
  cwd?: string | null;
  onClose: () => void;
  onToggleMax: () => void;
}

export function Terminal({ cwd, onClose, onToggleMax }: TerminalProps) {
  const hasFolder = !!cwd;
  const startCwd = cwd || "";

  const makeSeed = (dir: string): ReactNode[] => [
    <Line cls="muted">IWE terminal · {shortPath(dir)} · runs real commands in this folder</Line>,
  ];

  const [sessions, setSessions] = useState<Session[]>([
    { id: 1, name: "zsh", lines: hasFolder ? makeSeed(startCwd) : [], cwd: startCwd },
  ]);
  const [active, setActive] = useState(1);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [hIdx, setHIdx] = useState(-1);
  const [busy, setBusy] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const inRef = useRef<HTMLInputElement>(null);
  const sess = sessions.find((s) => s.id === active);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [sessions, active]);

  const appendLines = (id: number, nodes: ReactNode[]) =>
    setSessions((ss) => ss.map((s) => (s.id === id ? { ...s, lines: [...s.lines, ...nodes] } : s)));

  const submit = async () => {
    if (!hasFolder || busy) return;
    const cmd = input;
    const cur = sessions.find((s) => s.id === active);
    const sessionCwd = cur?.cwd || startCwd;
    const echo = (
      <Line>
        <Prompt path={shortPath(sessionCwd)} />
        <span>{cmd}</span>
      </Line>
    );
    if (cmd.trim()) setHistory((h) => [...h, cmd]);
    setHIdx(-1);
    setInput("");

    const trimmed = cmd.trim();
    if (trimmed === "clear") {
      setSessions((ss) => ss.map((s) => (s.id === active ? { ...s, lines: [] } : s)));
      return;
    }
    appendLines(active, [echo]);
    if (!trimmed) return;

    if (trimmed === "cd" || trimmed.startsWith("cd ")) {
      const target = trimmed === "cd" ? "" : trimmed.slice(3).trim();
      try {
        const next = await termApi.changeDir(sessionCwd, target);
        setSessions((ss) => ss.map((s) => (s.id === active ? { ...s, cwd: next } : s)));
      } catch (e) {
        appendLines(active, [<Line cls="err">{String(e)}</Line>]);
      }
      return;
    }

    setBusy(true);
    try {
      const out = await termApi.run(sessionCwd, cmd);
      appendLines(active, [...textToLines(out.stdout), ...textToLines(out.stderr, "err")]);
    } catch (e) {
      appendLines(active, [<Line cls="err">{String(e)}</Line>]);
    } finally {
      setBusy(false);
    }
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
      { id, name: "zsh", cwd: startCwd, lines: hasFolder ? makeSeed(startCwd) : [] },
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
        {!hasFolder ? (
          <Line cls="muted">Open a folder to use the terminal.</Line>
        ) : (
          <>
            {sess?.lines.map((l, i) => (
              <Fragment key={i}>{l}</Fragment>
            ))}
            <div className="term-input-row">
              <span className="pr">{busy ? "…" : "➜"}</span>
              <span className="pth">{sess ? shortPath(sess.cwd) : ""}</span>
              <input
                ref={inRef}
                className="term-input"
                value={input}
                autoFocus
                spellCheck={false}
                disabled={busy}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKey}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
