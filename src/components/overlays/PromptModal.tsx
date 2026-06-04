import { useEffect, useRef, useState } from "react";

export interface PromptConfig {
  title: string;
  value?: string;
  confirm?: boolean;
  onConfirm: (v: string) => void;
}

interface PromptModalProps extends PromptConfig {
  onClose: () => void;
}

export function PromptModal({ title, value, confirm, onConfirm, onClose }: PromptModalProps) {
  const [v, setV] = useState(value || "");
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.focus();
      ref.current.select();
    }
  }, []);
  const go = () => {
    onConfirm(v.trim());
    onClose();
  };
  return (
    <div className="scrim" onMouseDown={onClose}>
      <div
        className="palette fade-in"
        style={{ width: 420 }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div
          className="palette-input-row"
          style={{
            borderBottom: "none",
            flexDirection: "column",
            alignItems: "stretch",
            gap: 12,
            padding: "18px 18px",
          }}
        >
          <div style={{ fontSize: 13, color: "var(--text-2)" }}>{title}</div>
          <input
            ref={ref}
            className="set-input"
            style={{ width: "100%", fontSize: 14 }}
            value={v}
            onChange={(e) => setV(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") go();
              if (e.key === "Escape") onClose();
            }}
          />
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button
              className="btn ghost"
              style={{ flex: "0 0 auto", padding: "8px 16px" }}
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className="btn primary"
              style={{ flex: "0 0 auto", padding: "8px 18px" }}
              onClick={go}
            >
              {confirm ? "Confirm" : "OK"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
