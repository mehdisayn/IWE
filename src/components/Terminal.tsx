import { termApi } from "../lib/tauri";
import { Icon } from "./Icon";

interface TerminalProps {
  cwd?: string | null;
  onClose: () => void;
  onToggleMax: () => void;
}

export function Terminal({ cwd, onClose, onToggleMax }: TerminalProps) {
  const handleOpen = () => {
    if (cwd) termApi.openExternalTerminal(cwd).catch((e) => console.error(e));
  };

  return (
    <div className="terminal slide-up">
      <div className="term-tabs">
        <div className="term-tab active">
          <span className="tdot" />
          <span>Terminal Guide</span>
        </div>
        <div className="term-actions">
          <button className="icon-btn" title="Maximize" onClick={onToggleMax}>
            <Icon name="split" size={13} />
          </button>
          <button className="icon-btn" title="Close panel (⌘`)" onClick={onClose}>
            <Icon name="x" size={14} />
          </button>
        </div>
      </div>
      <div
        className="term-body"
        style={{
          padding: "24px 32px",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
          alignItems: "flex-start",
          color: "var(--fg-muted)",
          overflowY: "auto",
        }}
      >
        <div style={{ maxWidth: "600px" }}>
          <h2 style={{ margin: "0 0 8px 0", color: "var(--fg)", fontWeight: 600 }}>Terminal Integration</h2>
          <p style={{ margin: 0, lineHeight: 1.5 }}>
            IWE embraces your workflow. Instead of using a constrained built-in emulator, IWE delegates to your
            default native terminal app to ensure full compatibility with your aliases, shell scripts, and interactive tools.
          </p>
        </div>

        <button
          onClick={handleOpen}
          style={{
            padding: "10px 20px",
            background: "var(--accent)",
            color: "var(--bg)",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: "14px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <Icon name="terminal" size={16} />
          Open External Terminal
        </button>

        <div style={{ marginTop: "8px" }}>
          <h4 style={{ margin: "0 0 12px 0", color: "var(--fg)", fontSize: "14px", fontWeight: 600 }}>
            Things you can do:
          </h4>
          <ul
            style={{
              margin: 0,
              paddingLeft: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              lineHeight: 1.5,
            }}
          >
            <li>
              <b>Run advanced Git commands</b>: While IWE has a built-in Git panel for quick commits, your external
              terminal allows for complex rebasing, stashing, or submodule management.
            </li>
            <li>
              <b>Use AI CLI agents</b>: Launch tools like <code>ai-cli</code> or other AI agents directly in your workspace to
              intelligently draft or edit your documents without leaving your flow.
            </li>
            <li>
              <b>Run build scripts</b>: If you're using static site generators like Hugo, Next.js, or Docusaurus for
              your "Docs as Code" workflow, you can run the dev servers natively.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
