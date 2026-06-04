// GitHub "Sign in" for push, via the OAuth Device Flow. IWE never sees a
// password and never stores the token itself: the resulting token is handed to
// the *system git credential helper* (e.g. osxkeychain), so `git push` just works.
//
// Requires a GitHub OAuth App client id, supplied out-of-band so no secret is
// committed: set IWE_GITHUB_CLIENT_ID at runtime, or bake it in at build time
// with the same env var. Until then `github_signin_available` returns false and
// the UI hides the feature.

use std::io::Write;
use std::process::{Command, Stdio};

const DEVICE_CODE_URL: &str = "https://github.com/login/device/code";
const ACCESS_TOKEN_URL: &str = "https://github.com/login/oauth/access_token";
const SCOPE: &str = "repo";

/// Resolve the configured client id: runtime env var first, then a value baked
/// in at compile time. Returns None when neither is set.
fn client_id() -> Option<String> {
    if let Ok(v) = std::env::var("IWE_GITHUB_CLIENT_ID") {
        if !v.trim().is_empty() {
            return Some(v);
        }
    }
    option_env!("IWE_GITHUB_CLIENT_ID")
        .filter(|v| !v.trim().is_empty())
        .map(|v| v.to_string())
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DeviceStart {
    pub user_code: String,
    pub verification_uri: String,
    pub device_code: String,
    pub interval: u64,
    pub expires_in: u64,
}

#[derive(serde::Serialize)]
#[serde(tag = "status", rename_all = "snake_case")]
pub enum PollResult {
    Pending,
    SlowDown,
    Ok,
    Error { message: String },
}

/// True when a client id is configured, so the UI can show/hide "Sign in".
#[tauri::command]
pub fn github_signin_available() -> bool {
    client_id().is_some()
}

/// Begin the device flow: ask GitHub for a user code + verification URL.
#[tauri::command]
pub async fn github_device_start() -> Result<DeviceStart, String> {
    let cid = client_id().ok_or("GitHub sign-in is not configured (IWE_GITHUB_CLIENT_ID)")?;
    tauri::async_runtime::spawn_blocking(move || {
        let resp = ureq::post(DEVICE_CODE_URL)
            .set("Accept", "application/json")
            .send_form(&[("client_id", cid.as_str()), ("scope", SCOPE)])
            .map_err(|e| e.to_string())?;
        let v: serde_json::Value = resp.into_json().map_err(|e| e.to_string())?;
        Ok(DeviceStart {
            user_code: take_str(&v, "user_code")?,
            verification_uri: take_str(&v, "verification_uri")?,
            device_code: take_str(&v, "device_code")?,
            interval: v.get("interval").and_then(|x| x.as_u64()).unwrap_or(5),
            expires_in: v.get("expires_in").and_then(|x| x.as_u64()).unwrap_or(900),
        })
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Poll once for the access token. The frontend calls this on `interval` until
/// it gets `Ok` (then calls git_credential_approve) or an error.
#[tauri::command]
pub async fn github_device_poll(device_code: String) -> Result<PollResult, String> {
    let cid = client_id().ok_or("GitHub sign-in is not configured")?;
    tauri::async_runtime::spawn_blocking(move || {
        let resp = ureq::post(ACCESS_TOKEN_URL)
            .set("Accept", "application/json")
            .send_form(&[
                ("client_id", cid.as_str()),
                ("device_code", device_code.as_str()),
                ("grant_type", "urn:ietf:params:oauth:grant-type:device_code"),
            ]);
        // GitHub returns HTTP 200 with an `error` field while pending, so treat
        // any readable body as JSON.
        let v: serde_json::Value = match resp {
            Ok(r) => r.into_json().map_err(|e| e.to_string())?,
            Err(ureq::Error::Status(_, r)) => r.into_json().map_err(|e| e.to_string())?,
            Err(e) => return Err(e.to_string()),
        };
        if let Some(token) = v.get("access_token").and_then(|x| x.as_str()) {
            // Hand the token straight to the system credential helper; never keep it.
            store_credential(token)?;
            return Ok(PollResult::Ok);
        }
        Ok(match v.get("error").and_then(|x| x.as_str()) {
            Some("authorization_pending") => PollResult::Pending,
            Some("slow_down") => PollResult::SlowDown,
            Some(other) => PollResult::Error {
                message: other.to_string(),
            },
            None => PollResult::Error {
                message: "unexpected response".into(),
            },
        })
    })
    .await
    .map_err(|e| e.to_string())?
}

fn take_str(v: &serde_json::Value, key: &str) -> Result<String, String> {
    v.get(key)
        .and_then(|x| x.as_str())
        .map(|s| s.to_string())
        .ok_or_else(|| format!("missing `{key}` in GitHub response"))
}

/// Store an HTTPS token for github.com in the system git credential helper.
fn store_credential(token: &str) -> Result<(), String> {
    let mut child = Command::new("git")
        .args(["credential", "approve"])
        .stdin(Stdio::piped())
        .spawn()
        .map_err(|e| e.to_string())?;
    let payload = format!("protocol=https\nhost=github.com\nusername=oauth2\npassword={token}\n\n");
    child
        .stdin
        .take()
        .ok_or("failed to open git stdin")?
        .write_all(payload.as_bytes())
        .map_err(|e| e.to_string())?;
    let status = child.wait().map_err(|e| e.to_string())?;
    if status.success() {
        Ok(())
    } else {
        Err("git credential approve failed".into())
    }
}
