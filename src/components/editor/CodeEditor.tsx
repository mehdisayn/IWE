import { useMemo, useRef, useState, type RefObject } from "react";
import { Icon } from "../Icon";
import { highlight } from "../../lib/markdown";
import type { Caret, FlatFile } from "../../types";

interface CodeEditorProps {
  value: string;
  onChange: (v: string) => void;
  lineNumbers: boolean;
  wordWrap: boolean;
  fileNames: FlatFile[];
  onCaret: (c: Caret) => void;
  taRef: RefObject<HTMLTextAreaElement>;
}

interface WikiState {
  query: string;
  items: FlatFile[];
  sel: number;
}

export function CodeEditor({ value, onChange, lineNumbers, wordWrap, fileNames, onCaret, taRef }: CodeEditorProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [wiki, setWiki] = useState<WikiState | null>(null);
  const wrap = !lineNumbers && wordWrap;
  const ws = wrap ? "pre-wrap" : "pre";

  const html = useMemo(() => highlight(value) + " ", [value]);
  const lines = useMemo(() => value.split("\n").length, [value]);

  const updateCaret = (el: HTMLTextAreaElement) => {
    const upto = el.value.slice(0, el.selectionStart);
    const ln = upto.split("\n");
    onCaret({ line: ln.length, col: ln[ln.length - 1].length + 1 });
  };

  const checkWiki = (el: HTMLTextAreaElement) => {
    const upto = el.value.slice(0, el.selectionStart);
    const m = upto.match(/\[\[([^\]\n]*)$/);
    if (m) {
      const q = m[1].toLowerCase();
      const items = fileNames.filter((f) => f.label.toLowerCase().includes(q)).slice(0, 6);
      setWiki(items.length ? { query: m[1], items, sel: 0 } : null);
    } else setWiki(null);
  };

  const acceptWiki = (item: FlatFile) => {
    const el = taRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const before = el.value.slice(0, start).replace(/\[\[([^\]\n]*)$/, "[[" + item.label + "]]");
    const after = el.value.slice(start);
    const next = before + after;
    onChange(next);
    setWiki(null);
    requestAnimationFrame(() => {
      el.focus();
      const pos = before.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (wiki) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setWiki({ ...wiki, sel: (wiki.sel + 1) % wiki.items.length });
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setWiki({ ...wiki, sel: (wiki.sel - 1 + wiki.items.length) % wiki.items.length });
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        acceptWiki(wiki.items[wiki.sel]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setWiki(null);
        return;
      }
    }
    if (e.key === "Tab") {
      e.preventDefault();
      const el = e.currentTarget;
      const s = el.selectionStart;
      const en = el.selectionEnd;
      const next = value.slice(0, s) + "  " + value.slice(en);
      onChange(next);
      requestAnimationFrame(() => {
        el.setSelectionRange(s + 2, s + 2);
      });
    }
  };

  return (
    <div className={"pane" + (lineNumbers ? " with-gutter" : "")}>
      <div className="pane-label">Markdown</div>
      <div className="code-scroll" ref={scrollRef}>
        <div className="code-inner">
          {lineNumbers && (
            <div className="gutter" style={{ whiteSpace: "pre" }}>
              {Array.from({ length: lines }, (_, i) => (
                <span key={i}>{i + 1}</span>
              ))}
            </div>
          )}
          <pre
            className="code-layer"
            style={{ whiteSpace: ws }}
            dangerouslySetInnerHTML={{ __html: html }}
          />
          <textarea
            ref={taRef}
            className="code-area"
            style={{ whiteSpace: ws, overflowX: wrap ? "hidden" : "visible" }}
            spellCheck={false}
            value={value}
            placeholder="Start writing…"
            onChange={(e) => {
              onChange(e.target.value);
              updateCaret(e.target);
              checkWiki(e.target);
            }}
            onKeyUp={(e) => {
              updateCaret(e.currentTarget);
            }}
            onClick={(e) => {
              updateCaret(e.currentTarget);
              setWiki(null);
            }}
            onKeyDown={onKeyDown}
          />
        </div>
      </div>
      {wiki && (
        <div className="wiki-pop" style={{ left: 22, bottom: 18 }}>
          <div className="wiki-pop-head">Link to note · ↑↓ Enter</div>
          {wiki.items.map((it, i) => (
            <div
              key={it.path}
              className={"wiki-opt" + (i === wiki.sel ? " sel" : "")}
              onMouseEnter={() => setWiki({ ...wiki, sel: i })}
              onMouseDown={(e) => {
                e.preventDefault();
                acceptWiki(it);
              }}
            >
              <span className="wic">
                <Icon name="md" size={13} />
              </span>
              <span>{it.label}</span>
              <span className="wp">{it.dir}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
