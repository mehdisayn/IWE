import { Icon } from "../Icon";

interface OnboardingProps {
  // Native folder picker. Undefined when not running as the desktop app.
  onOpenFolder?: () => void;
}

export function Onboarding({ onOpenFolder }: OnboardingProps) {
  return (
    <div className="onboard fade-in">
      <div className="onboard-card">
        <div className="logo">
          <Icon name="book" size={32} fill />
        </div>
        <h1>IWE</h1>
        {onOpenFolder ? (
          <>
            <p>
              A markdown workspace with a built-in terminal and Git, for people who write.
              <br />
              Open a folder to get started.
            </p>
            <div className="onboard-actions">
              <button className="ob-btn primary" onClick={onOpenFolder}>
                <span className="obi">
                  <Icon name="folder-open" size={18} />
                </span>
                <span className="t">Open Folder…</span>
              </button>
            </div>
            <div className="ob-skip" style={{ cursor: "default" }}>
              Your files stay on disk. Git uses the repository in the folder you open.
            </div>
          </>
        ) : (
          <>
            <p>
              IWE is a desktop application.
              <br />
              Launch the desktop build to open a folder from your computer.
            </p>
            <div className="ob-skip" style={{ cursor: "default" }}>
              Run <code>npm run tauri:dev</code> to start the app.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
