import { useEffect, useRef, useState } from "react";
import { Icon } from "../Icon";
import { authApi, miscApi, type DeviceStart } from "../../lib/tauri";

interface GitHubSignInProps {
  onClose: () => void;
  onSuccess: () => void;
}

// Drives the GitHub OAuth Device Flow: shows the one-time code, opens the
// verification page, and polls until the user authorizes (token is stored by
// the backend in the system credential helper).
export function GitHubSignIn({ onClose, onSuccess }: GitHubSignInProps) {
  const [data, setData] = useState<DeviceStart | null>(null);
  const [status, setStatus] = useState("Starting…");
  const [err, setErr] = useState<string | null>(null);
  const cb = useRef({ onClose, onSuccess });
  cb.current = { onClose, onSuccess };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") cb.current.onClose();
    };
    window.addEventListener("keydown", onKey);

    let cancelled = false;
    let timer: number | undefined;
    let done = false;

    authApi
      .start()
      .then((d) => {
        if (cancelled) return;
        setData(d);
        setStatus("Waiting for you to authorize on GitHub…");
        navigator.clipboard?.writeText(d.userCode).catch(() => {});
        let interval = Math.max(d.interval, 1) * 1000;
        const expireAt = Date.now() + d.expiresIn * 1000;
        const tick = () => {
          if (cancelled || done) return;
          if (Date.now() > expireAt) {
            setErr("This code expired. Close and try again.");
            return;
          }
          authApi
            .poll(d.deviceCode)
            .then((r) => {
              if (cancelled) return;
              if (r.status === "ok") {
                done = true;
                cb.current.onSuccess();
                cb.current.onClose();
              } else if (r.status === "error") {
                setErr(r.message || "Authorization failed");
              } else {
                if (r.status === "slow_down") interval += 5000;
                timer = window.setTimeout(tick, interval);
              }
            })
            .catch((e) => {
              if (!cancelled) setErr(String(e));
            });
        };
        timer = window.setTimeout(tick, interval);
      })
      .catch((e) => {
        if (!cancelled) setErr(String(e));
      });

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div className="scrim" onMouseDown={onClose}>
      <div
        className="signin-modal fade-in"
        role="dialog"
        aria-label="Sign in to GitHub"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="signin-head">
          <Icon name="github" size={20} />
          <span>Sign in to GitHub</span>
        </div>
        {err ? (
          <div className="signin-err">{err}</div>
        ) : !data ? (
          <div className="signin-status">{status}</div>
        ) : (
          <>
            <p className="signin-desc">
              Enter this code on GitHub to authorize <strong>push</strong> access. The code is
              copied to your clipboard.
            </p>
            <div className="signin-code" aria-label="One-time code">
              {data.userCode}
            </div>
            <button
              className="btn primary"
              onClick={() => miscApi.openExternal(data.verificationUri)}
            >
              <Icon name="arrowright" size={15} /> Open GitHub
            </button>
            <div className="signin-status">{status}</div>
          </>
        )}
        <button className="about-close" aria-label="Close" onClick={onClose}>
          <Icon name="x" size={15} />
        </button>
      </div>
    </div>
  );
}
