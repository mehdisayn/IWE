import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

// Catches render-time crashes anywhere below it so a single component fault
// shows a recoverable screen instead of a blank window. Errors are logged to
// the console (captured by tauri-plugin-log in dev builds).
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("IWE crashed:", error, info.componentStack);
  }

  private reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div
        role="alert"
        style={{
          height: "100vh",
          display: "grid",
          placeItems: "center",
          padding: 24,
          textAlign: "center",
          color: "var(--text-2, #aaa)",
          background: "var(--bg-0, #1a1a1a)",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ maxWidth: 520 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>⚠</div>
          <h1 style={{ fontSize: 18, margin: "0 0 8px", color: "var(--text-1, #eee)" }}>
            Something went wrong
          </h1>
          <p style={{ margin: "0 0 16px" }}>
            IWE hit an unexpected error. Your files on disk are untouched.
          </p>
          <pre
            style={{
              textAlign: "left",
              fontSize: 12,
              whiteSpace: "pre-wrap",
              opacity: 0.7,
              maxHeight: 160,
              overflow: "auto",
              marginBottom: 16,
            }}
          >
            {this.state.error.message}
          </pre>
          <button
            onClick={this.reset}
            style={{
              padding: "8px 16px",
              borderRadius: 6,
              border: "1px solid var(--border, #444)",
              background: "var(--bg-1, #2a2a2a)",
              color: "inherit",
              cursor: "pointer",
            }}
          >
            Reload view
          </button>
        </div>
      </div>
    );
  }
}
