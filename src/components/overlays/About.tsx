import { useEffect } from "react";
import { Icon } from "../Icon";
import { miscApi } from "../../lib/tauri";

const REPO = "https://github.com/mehdisayn/IWE";

interface AboutProps {
  version: string;
  onClose: () => void;
}

export function About({ version, onClose }: AboutProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="scrim" onMouseDown={onClose}>
      <div
        className="about-modal fade-in"
        role="dialog"
        aria-label="About IWE"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="about-mark">IWE</div>
        <div className="about-name">Integrated Writing Environment</div>
        <div className="about-ver">Version {version}</div>
        <p className="about-desc">
          A markdown workspace with a built-in terminal and Git, for people who write.
        </p>
        <div className="about-links">
          <button className="btn ghost" onClick={() => miscApi.openExternal(REPO)}>
            <Icon name="github" size={15} /> GitHub
          </button>
          <button className="btn ghost" onClick={() => miscApi.openExternal(REPO + "/issues")}>
            <Icon name="bell" size={15} /> Report an issue
          </button>
        </div>
        <div className="about-foot">MIT Licensed · © {new Date().getFullYear()} Mehdi Sayn</div>
        <button className="about-close" aria-label="Close" onClick={onClose}>
          <Icon name="x" size={15} />
        </button>
      </div>
    </div>
  );
}
