import { useState } from "react";
import { Icon } from "../Icon";

interface OnboardingProps {
  onOpen: () => void;
}

export function Onboarding({ onOpen }: OnboardingProps) {
  const [step, setStep] = useState(0);
  return (
    <div className="onboard fade-in">
      <div className="onboard-card">
        <div className="logo">
          <Icon name="book" size={32} fill />
        </div>
        <h1>IWE</h1>
        {step === 0 && (
          <>
            <p>
              A markdown workspace with a built-in terminal and Git, for people who write.
              <br />
              Open a folder to get started.
            </p>
            <div className="onboard-actions">
              <button className="ob-btn primary" onClick={() => setStep(1)}>
                <span className="obi">
                  <Icon name="folder-open" size={18} />
                </span>
                <span className="t">Open Folder…</span>
              </button>
              <button className="ob-btn" onClick={onOpen}>
                <span className="obi">
                  <Icon name="book" size={18} />
                </span>
                <div>
                  <div className="t">Open sample vault</div>
                  <div className="d">"The Salt Road" — a manuscript in progress</div>
                </div>
              </button>
            </div>
          </>
        )}
        {step === 1 && (
          <>
            <p>
              Connect GitHub to sync your folder to a repository.
              <br />
              You can skip this and add it later.
            </p>
            <div className="onboard-actions">
              <button className="ob-btn primary" onClick={onOpen}>
                <span className="obi">
                  <Icon name="github" size={18} fill />
                </span>
                <span className="t">Connect GitHub</span>
              </button>
              <button className="ob-btn" onClick={onOpen}>
                <span className="obi">
                  <Icon name="arrowright" size={18} />
                </span>
                <div>
                  <div className="t">Open without syncing</div>
                  <div className="d">Local folder only</div>
                </div>
              </button>
            </div>
          </>
        )}
        <div className="ob-skip" onClick={onOpen} role="button">
          Skip — open "the-salt-road"
        </div>
      </div>
    </div>
  );
}
