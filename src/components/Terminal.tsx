import { useCallback, useEffect, useRef, useState } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { Icon } from "./Icon";
import { IS_TAURI, ptyApi } from "../lib/tauri";

interface TerminalProps {
  cwd?: string | null;
  onClose: () => void;
  onToggleMax: () => void;
}

type Register = (id: string, write: (d: string) => void, exit: () => void) => void;

interface PtyViewProps {
  ptyId: string;
  cwd: string;
  visible: boolean;
  register: Register;
  unregister: (id: string) => void;
}

// One xterm.js instance bound to one backend PTY session. Kept mounted while its
// tab exists (hidden when inactive) so scrollback and shell state survive tab
// switches.
function PtyView({ ptyId, cwd, visible, register, unregister }: PtyViewProps) {
  const holder = useRef<HTMLDivElement>(null);
  const termRef = useRef<XTerm | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const visibleRef = useRef(visible);
  visibleRef.current = visible;

  useEffect(() => {
    const el = holder.current;
    if (!el) return;
    const term = new XTerm({
      fontFamily: '"JetBrains Mono", ui-monospace, monospace',
      fontSize: 12.5,
      cursorBlink: true,
      allowTransparency: true,
      theme: {
        background: "rgba(0,0,0,0)",
        foreground: "#d6d6da",
        cursor: "#d6d6da",
        selectionBackground: "rgba(255,255,255,0.18)",
      },
      scrollback: 5000,
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(el);
    termRef.current = term;
    fitRef.current = fit;
    try {
      fit.fit();
    } catch {
      /* element not laid out yet */
    }

    term.onData((d) => ptyApi.write(ptyId, d));
    register(
      ptyId,
      (d) => term.write(d),
      () => term.write("\r\n\x1b[2m[process exited]\x1b[0m\r\n")
    );

    ptyApi
      .spawn(ptyId, cwd, term.cols || 80, term.rows || 24)
      .then(() => {
        if (visibleRef.current) term.focus();
      })
      .catch((e) => term.writeln("Failed to start shell: " + String(e)));

    const ro = new ResizeObserver(() => {
      if (!visibleRef.current) return;
      try {
        fit.fit();
        ptyApi.resize(ptyId, term.cols, term.rows);
      } catch {
        /* ignore transient layout errors */
      }
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      unregister(ptyId);
      ptyApi.kill(ptyId);
      term.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refit + refocus when this tab becomes active (its size was 0 while hidden).
  useEffect(() => {
    if (!visible) return;
    const term = termRef.current;
    const fit = fitRef.current;
    if (!term || !fit) return;
    const raf = requestAnimationFrame(() => {
      try {
        fit.fit();
        ptyApi.resize(ptyId, term.cols, term.rows);
        term.focus();
      } catch {
        /* ignore */
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [visible, ptyId]);

  return (
    <div ref={holder} className="xterm-holder" style={{ display: visible ? "block" : "none" }} />
  );
}

const newPtyId = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : "pty-" + Math.random().toString(36).slice(2) + Date.now();

export function Terminal({ cwd, onClose, onToggleMax }: TerminalProps) {
  const hasFolder = !!cwd && IS_TAURI;
  const [sessions, setSessions] = useState<{ id: number; ptyId: string }[]>(() =>
    hasFolder ? [{ id: 1, ptyId: newPtyId() }] : []
  );
  const [active, setActive] = useState(1);

  // Route backend pty events to the right xterm instance.
  const sinks = useRef(new Map<string, (d: string) => void>());
  const exits = useRef(new Map<string, () => void>());
  const register = useCallback<Register>((id, write, exit) => {
    sinks.current.set(id, write);
    exits.current.set(id, exit);
  }, []);
  const unregister = useCallback((id: string) => {
    sinks.current.delete(id);
    exits.current.delete(id);
  }, []);

  useEffect(() => {
    if (!IS_TAURI) return;
    let unData: (() => void) | undefined;
    let unExit: (() => void) | undefined;
    let disposed = false;
    ptyApi
      .onData((id, data) => sinks.current.get(id)?.(data))
      .then((u) => {
        if (disposed) u();
        else unData = u;
      });
    ptyApi
      .onExit((id) => exits.current.get(id)?.())
      .then((u) => {
        if (disposed) u();
        else unExit = u;
      });
    return () => {
      disposed = true;
      unData?.();
      unExit?.();
    };
  }, []);

  const addSession = () => {
    const id = sessions.length ? Math.max(...sessions.map((s) => s.id)) + 1 : 1;
    setSessions((ss) => [...ss, { id, ptyId: newPtyId() }]);
    setActive(id);
  };

  const closeSession = (id: number) => {
    if (sessions.length <= 1) {
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
            key={s.ptyId}
            className={"term-tab" + (s.id === active ? " active" : "")}
            onClick={() => setActive(s.id)}
          >
            <span className="tdot" />
            <span>{s.id}: shell</span>
            <button
              className="x"
              aria-label="Close terminal"
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
          <button
            className="icon-btn"
            title="New terminal"
            aria-label="New terminal"
            onClick={addSession}
            disabled={!hasFolder}
          >
            <Icon name="plus" size={14} />
          </button>
          <button
            className="icon-btn"
            title="Maximize"
            aria-label="Maximize terminal"
            onClick={onToggleMax}
          >
            <Icon name="split" size={13} />
          </button>
          <button
            className="icon-btn"
            title="Close panel (⌘`)"
            aria-label="Close terminal panel"
            onClick={onClose}
          >
            <Icon name="x" size={14} />
          </button>
        </div>
      </div>
      <div className="term-body-wrap">
        {!hasFolder ? (
          <div className="term-empty">
            {IS_TAURI
              ? "Open a folder to use the terminal."
              : "Terminal requires the IWE desktop app."}
          </div>
        ) : (
          sessions.map((s) => (
            <PtyView
              key={s.ptyId}
              ptyId={s.ptyId}
              cwd={cwd as string}
              visible={s.id === active}
              register={register}
              unregister={unregister}
            />
          ))
        )}
      </div>
    </div>
  );
}
