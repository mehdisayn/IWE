import type { ReactNode } from "react";
import { Icon } from "../Icon";
import type { TweakState } from "../../types";

interface ToggleProps {
  on: boolean;
  onClick: () => void;
}

function Toggle({ on, onClick }: ToggleProps) {
  return (
    <button className={"toggle" + (on ? " on" : "")} onClick={onClick}>
      <i />
    </button>
  );
}

interface RowProps {
  t: string;
  d?: string;
  children: ReactNode;
}

function Row({ t, d, children }: RowProps) {
  return (
    <div className="set-row">
      <div className="label">
        <div className="t">{t}</div>
        {d && <div className="d">{d}</div>}
      </div>
      {children}
    </div>
  );
}

interface SettingsProps {
  s: TweakState;
  set: <K extends keyof TweakState>(key: K, value: TweakState[K]) => void;
  theme: TweakState["theme"];
  setTheme: (v: TweakState["theme"]) => void;
  folderName?: string;
}

export function Settings({ s, set, theme, setTheme, folderName }: SettingsProps) {
  return (
    <div className="settings">
      <div className="settings-inner">
        <h1>Settings</h1>
        <div className="sub">
          {folderName
            ? "Preferences for this workspace · " + folderName
            : "Preferences for this workspace"}
        </div>

        <div className="set-section">
          <h2>General</h2>
          <Row t="Theme" d="Visual direction for the whole app">
            <select
              className="set-input"
              value={theme}
              onChange={(e) => setTheme(e.target.value as TweakState["theme"])}
            >
              <option value="slate">Soft Slate</option>
              <option value="terminal">True Terminal</option>
              <option value="warm">Warm Ink</option>
            </select>
          </Row>
          <Row t="UI font size" d="Sidebar, tabs, panels">
            <select
              className="set-input"
              value={s.uiScale}
              onChange={(e) => set("uiScale", e.target.value as TweakState["uiScale"])}
            >
              <option value="compact">Compact</option>
              <option value="comfortable">Comfortable</option>
            </select>
          </Row>
        </div>

        <div className="set-section">
          <h2>Editor</h2>
          <Row t="Editor font size" d={`${s.fontSize}px`}>
            <input
              className="set-input"
              type="range"
              min={12}
              max={22}
              value={s.fontSize}
              onChange={(e) => set("fontSize", +e.target.value)}
              style={{ minWidth: 200 }}
            />
          </Row>
          <Row t="Line numbers" d="Show the gutter (turns off soft-wrap)">
            <Toggle on={s.lineNumbers} onClick={() => set("lineNumbers", !s.lineNumbers)} />
          </Row>
          <Row t="Soft wrap" d="Wrap long lines to the viewport">
            <Toggle on={s.wordWrap} onClick={() => set("wordWrap", !s.wordWrap)} />
          </Row>
          <Row t="Autosave" d="Save changes after a short delay">
            <Toggle on={s.autosave} onClick={() => set("autosave", !s.autosave)} />
          </Row>
        </div>

        <div className="set-section">
          <h2>Git</h2>
          <div className="gh-account">
            <span className="av">
              <Icon name="git" size={20} />
            </span>
            <div>
              <div className="nm">System Git</div>
              <div className="h">
                Commit &amp; push use your machine's git and stored credentials.
              </div>
            </div>
          </div>
          <Row t="Commit on save" d="Auto-commit the file when you save with ⌘S">
            <Toggle on={s.commitOnSave} onClick={() => set("commitOnSave", !s.commitOnSave)} />
          </Row>
        </div>

        <div className="set-section">
          <h2>Extensions</h2>
          <div
            className="git-empty"
            style={{ textAlign: "left", padding: "8px 0", color: "var(--text-2)" }}
          >
            Extension marketplace arrives in <span className="kbd">v2</span>. You'll be able to
            browse and install themes, exporters, and AI integrations here.
          </div>
        </div>
      </div>
    </div>
  );
}
