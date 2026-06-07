import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";
import { termApi, listen, IS_TAURI } from "../lib/tauri";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";

interface Session {
  id: number;
  name: string;
}

function TermInstance({
  cwd,
  isActive,
  onReady,
  onExit,
}: {
  cwd: string;
  isActive: boolean;
  onReady: (id: number) => void;
  onExit: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const termRef = useRef<XTerm | null>(null);
  const fitRef = useRef<FitAddon | null>(null);

  useEffect(() => {
    if (!ref.current || !IS_TAURI) return;
    const term = new XTerm({
      fontFamily: "var(--font-editor)",
      fontSize: 13,
      theme: { background: "transparent" },
      cursorBlink: true,
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(ref.current);
    fit.fit();
    termRef.current = term;
    fitRef.current = fit;

    let ptyId: number | null = null;
    let unsubs: (() => void)[] = [];

    termApi.spawnPty(cwd, term.cols, term.rows).then(async (pid) => {
      ptyId = pid;
      onReady(pid);

      term.onData((data) => {
        termApi.writePty(pid, data);
      });
      term.onResize(({ cols, rows }) => {
        termApi.resizePty(pid, cols, rows);
      });

      const un1 = await listen<{ id: number; data: number[] }>("pty-out", (e) => {
        if (e.payload.id === pid) {
          term.write(new Uint8Array(e.payload.data));
        }
      });
      const un2 = await listen<number>("pty-exit", (e) => {
        if (e.payload === pid) {
          onExit();
        }
      });
      unsubs.push(un1, un2);
    });

    const resizer = new ResizeObserver(() => fit.fit());
    resizer.observe(ref.current);

    return () => {
      resizer.disconnect();
      term.dispose();
      unsubs.forEach((u) => u());
      if (ptyId != null) termApi.closePty(ptyId);
    };
  }, [cwd, onReady, onExit]);

  // Focus and fit when becoming active
  useEffect(() => {
    if (isActive) {
      setTimeout(() => {
        fitRef.current?.fit();
        termRef.current?.focus();
      }, 50);
    }
  }, [isActive]);

  return <div ref={ref} style={{ width: "100%", height: "100%", display: isActive ? "block" : "none", overflow: "hidden", padding: "8px 12px" }} />;
}

interface TerminalProps {
  cwd?: string | null;
  onClose: () => void;
  onToggleMax: () => void;
}

export function Terminal({ cwd, onClose, onToggleMax }: TerminalProps) {
  const hasFolder = !!cwd;
  const startCwd = cwd || "";

  const [sessions, setSessions] = useState<Session[]>([{ id: 1, name: "zsh" }]);
  const [active, setActive] = useState(1);
  const [nextId, setNextId] = useState(2);

  const addSession = () => {
    const id = nextId;
    setNextId((n) => n + 1);
    setSessions((ss) => [...ss, { id, name: "zsh" }]);
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
            <span>{s.name}</span>
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
      <div className="term-body" style={{ padding: 0 }}>
        {!hasFolder || !IS_TAURI ? (
          <div className="term-line muted" style={{ padding: 12 }}>
            {!IS_TAURI ? "Terminal requires native desktop build." : "Open a folder to use the terminal."}
          </div>
        ) : (
          sessions.map((s) => (
            <TermInstance
              key={s.id}
              cwd={startCwd}
              isActive={s.id === active}
              onReady={(pid) => console.log("PTY Ready:", pid)}
              onExit={() => closeSession(s.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
