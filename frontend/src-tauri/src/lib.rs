mod gateway;

use std::sync::{Arc, RwLock};
use tauri::Manager;
use tauri::State;
use serde_json::json;

#[derive(Default)]
struct GatewayState {
  config: Arc<RwLock<gateway::GatewayConfig>>,
  addr: Arc<RwLock<Option<std::net::SocketAddr>>>,
}

const KEYRING_SERVICE: &str = "personal-data-hub";
const KEYRING_ACCOUNT_REFRESH_LEGACY: &str = "refresh-token";

fn refresh_token_entry(account: &str) -> Result<keyring::Entry, String> {
  keyring::Entry::new(KEYRING_SERVICE, account).map_err(|e| e.to_string())
}

fn is_no_entry_error(err: &keyring::Error) -> bool {
  let msg = err.to_string().to_ascii_lowercase();
  msg.contains("no entry") || msg.contains("not found")
}

fn refresh_token_account_for_backend(backend_base_url: &str) -> String {
  // 按服务器隔离 refresh token，避免多服务器切换互相覆盖
  // backend_base_url 预期是 origin（http(s)://host[:port]）
  format!("refresh-token|{}", backend_base_url.trim().trim_end_matches('/'))
}

fn password_account_for_backend(backend_base_url: &str, username: &str) -> String {
  format!(
    "password|{}|{}",
    backend_base_url.trim().trim_end_matches('/'),
    username.trim()
  )
}

fn load_refresh_token_for_backend(backend_base_url: &str) -> Result<Option<String>, String> {
  let account = refresh_token_account_for_backend(backend_base_url);
  let entry = refresh_token_entry(&account)?;
  match entry.get_password() {
    Ok(token) => {
      let t = token.trim().to_string();
      Ok(if t.is_empty() { None } else { Some(t) })
    }
    Err(err) => {
      // 没有 server-scoped token：尝试读取 legacy 单值，并迁移
      if is_no_entry_error(&err) {
        let legacy = refresh_token_entry(KEYRING_ACCOUNT_REFRESH_LEGACY)?;
        match legacy.get_password() {
          Ok(token) => {
            let t = token.trim().to_string();
            if t.is_empty() {
              Ok(None)
            } else {
              // 尝试迁移到 server-scoped；失败也不阻断
              let _ = entry.set_password(&t);
              let _ = legacy.delete_password();
              Ok(Some(t))
            }
          }
          Err(legacy_err) => {
            if is_no_entry_error(&legacy_err) {
              Ok(None)
            } else {
              Err(legacy_err.to_string())
            }
          }
        }
      } else {
        Err(err.to_string())
      }
    }
  }
}

fn store_refresh_token_for_backend(backend_base_url: &str, token: Option<String>) -> Result<(), String> {
  let account = refresh_token_account_for_backend(backend_base_url);
  let entry = refresh_token_entry(&account)?;
  match token {
    Some(raw) => {
      let t = raw.trim().to_string();
      if t.is_empty() {
        let _ = entry.delete_password();
        return Ok(());
      }
      entry.set_password(&t).map_err(|e| e.to_string())
    }
    None => {
      let _ = entry.delete_password();
      Ok(())
    }
  }
}

#[tauri::command]
fn pdh_secret_set_password(
  backend_base_url: String,
  username: String,
  password: String,
) -> Result<(), String> {
  let backend = backend_base_url.trim().trim_end_matches('/').to_string();
  if backend.is_empty() {
    return Err("backend_base_url is empty".to_string());
  }
  let user = username.trim().to_string();
  if user.is_empty() {
    return Err("username is empty".to_string());
  }

  let account = password_account_for_backend(&backend, &user);
  let entry = refresh_token_entry(&account)?;

  let pwd = password.trim().to_string();
  if pwd.is_empty() {
    let _ = entry.delete_password();
    return Ok(());
  }

  entry.set_password(&pwd).map_err(|e| e.to_string())
}

#[tauri::command]
fn pdh_secret_get_password(
  backend_base_url: String,
  username: String,
) -> Result<Option<String>, String> {
  let backend = backend_base_url.trim().trim_end_matches('/').to_string();
  if backend.is_empty() {
    return Err("backend_base_url is empty".to_string());
  }
  let user = username.trim().to_string();
  if user.is_empty() {
    return Err("username is empty".to_string());
  }

  let account = password_account_for_backend(&backend, &user);
  let entry = refresh_token_entry(&account)?;

  match entry.get_password() {
    Ok(pwd) => {
      let p = pwd.trim().to_string();
      Ok(if p.is_empty() { None } else { Some(p) })
    }
    Err(err) => {
      if is_no_entry_error(&err) {
        Ok(None)
      } else {
        Err(err.to_string())
      }
    }
  }
}

#[tauri::command]
fn pdh_secret_delete_password(backend_base_url: String, username: String) -> Result<(), String> {
  let backend = backend_base_url.trim().trim_end_matches('/').to_string();
  if backend.is_empty() {
    return Err("backend_base_url is empty".to_string());
  }
  let user = username.trim().to_string();
  if user.is_empty() {
    return Err("username is empty".to_string());
  }

  let account = password_account_for_backend(&backend, &user);
  let entry = refresh_token_entry(&account)?;
  let _ = entry.delete_password();
  Ok(())
}

#[tauri::command]
fn pdh_gateway_url(state: State<GatewayState>) -> Result<String, String> {
  let addr = state
    .addr
    .read()
    .map_err(|_| "gateway state poisoned".to_string())?
    .ok_or_else(|| "gateway not ready".to_string())?;
  Ok(format!("http://{}", addr))
}

#[tauri::command]
fn pdh_gateway_set_backend_url(state: State<GatewayState>, url: String) -> Result<(), String> {
  let normalized = url.trim().trim_end_matches('/').to_string();
  let mut cfg = state
    .config
    .write()
    .map_err(|_| "gateway state poisoned".to_string())?;

  if normalized.is_empty() {
    cfg.backend_base_url = None;
    return Ok(());
  }

  let lower = normalized.to_ascii_lowercase();
  if !(lower.starts_with("http://") || lower.starts_with("https://")) {
    return Err("backend url must start with http:// or https://".to_string());
  }

  cfg.backend_base_url = Some(normalized);
  Ok(())
}

#[tauri::command]
fn pdh_gateway_set_token(state: State<GatewayState>, token: Option<String>) -> Result<(), String> {
  let mut cfg = state
    .config
    .write()
    .map_err(|_| "gateway state poisoned".to_string())?;
  cfg.bearer_token = token.and_then(|t| {
    let trimmed = t.trim().to_string();
    if trimmed.is_empty() {
      None
    } else {
      Some(trimmed)
    }
  });
  Ok(())
}

#[tauri::command]
fn pdh_auth_clear_refresh_token(state: State<'_, GatewayState>) -> Result<(), String> {
  // 清理当前服务器的 refresh token；同时顺带清理 legacy 单值，避免升级遗留
  if let Ok(backend) = backend_base_url_from_state(&state) {
    let _ = store_refresh_token_for_backend(&backend, None);
  }
  let legacy = refresh_token_entry(KEYRING_ACCOUNT_REFRESH_LEGACY)?;
  let _ = legacy.delete_password();
  Ok(())
}

fn backend_base_url_from_state(state: &State<GatewayState>) -> Result<String, String> {
  let cfg = state
    .config
    .read()
    .map_err(|_| "gateway state poisoned".to_string())?;
  cfg
    .backend_base_url
    .clone()
    .ok_or_else(|| "backend url not set".to_string())
}

#[tauri::command]
async fn pdh_auth_login(
  state: State<'_, GatewayState>,
  username: String,
  password: String,
) -> Result<serde_json::Value, String> {
  let backend = backend_base_url_from_state(&state)?;
  let url = format!("{}/api/auth/login", backend);

  let client = reqwest::Client::new();
  let resp = client
    .post(url)
    .json(&json!({ "username": username, "password": password }))
    .send()
    .await
    .map_err(|e| e.to_string())?;

  let status = resp.status();
  let body = resp
    .json::<serde_json::Value>()
    .await
    .map_err(|e| e.to_string())?;

  if !status.is_success() {
    let msg = body
      .get("message")
      .and_then(|v| v.as_str())
      .unwrap_or("login failed");
    return Err(msg.to_string());
  }

  let token = body
    .get("data")
    .and_then(|d| d.get("token"))
    .and_then(|v| v.as_str())
    .unwrap_or("")
    .trim()
    .to_string();
  let refresh_token = body
    .get("data")
    .and_then(|d| d.get("refreshToken"))
    .and_then(|v| v.as_str())
    .map(|s| s.to_string());

  // 保存 refresh token 到系统凭据库；前端永不持有
  store_refresh_token_for_backend(&backend, refresh_token)?;

  // 同步更新网关当前 bearer token（尽快生效）
  if !token.is_empty() {
    if let Ok(mut cfg) = state.config.write() {
      cfg.bearer_token = Some(token.clone());
    }
  }

  let sanitized = json!({
    "success": body.get("success").and_then(|v| v.as_bool()).unwrap_or(true),
    "data": {
      "user": body.get("data").and_then(|d| d.get("user")).cloned().unwrap_or(json!(null)),
      "expiresIn": body.get("data").and_then(|d| d.get("expiresIn")).cloned().unwrap_or(json!("")),
      "token": token,
    },
    "message": body.get("message").and_then(|v| v.as_str()).unwrap_or("登录成功"),
  });

  Ok(sanitized)
}

#[tauri::command]
async fn pdh_auth_refresh(state: State<'_, GatewayState>) -> Result<serde_json::Value, String> {
  let backend = backend_base_url_from_state(&state)?;
  let refresh_token =
    load_refresh_token_for_backend(&backend)?.ok_or_else(|| "no refresh token".to_string())?;
  let url = format!("{}/api/auth/refresh", backend);

  let client = reqwest::Client::new();
  let resp = client
    .post(url)
    .json(&json!({ "refreshToken": refresh_token }))
    .send()
    .await
    .map_err(|e| e.to_string())?;

  let status = resp.status();
  let body = resp
    .json::<serde_json::Value>()
    .await
    .map_err(|e| e.to_string())?;

  if !status.is_success() {
    // 401/403：refresh 无效，清理本地 refresh token
    if status.as_u16() == 401 || status.as_u16() == 403 {
      let _ = store_refresh_token_for_backend(&backend, None);
    }
    let msg = body
      .get("message")
      .and_then(|v| v.as_str())
      .unwrap_or("refresh failed");
    return Err(msg.to_string());
  }

  let token = body
    .get("data")
    .and_then(|d| d.get("token"))
    .and_then(|v| v.as_str())
    .unwrap_or("")
    .trim()
    .to_string();
  let next_refresh = body
    .get("data")
    .and_then(|d| d.get("refreshToken"))
    .and_then(|v| v.as_str())
    .map(|s| s.to_string());

  if let Some(rt) = next_refresh {
    store_refresh_token_for_backend(&backend, Some(rt))?;
  }

  if !token.is_empty() {
    if let Ok(mut cfg) = state.config.write() {
      cfg.bearer_token = Some(token.clone());
    }
  }

  let sanitized = json!({
    "success": body.get("success").and_then(|v| v.as_bool()).unwrap_or(true),
    "data": {
      "expiresIn": body.get("data").and_then(|d| d.get("expiresIn")).cloned().unwrap_or(json!("")),
      "token": token,
    },
    "message": body.get("message").and_then(|v| v.as_str()).unwrap_or("刷新成功"),
  });

  Ok(sanitized)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .manage(GatewayState::default())
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      // Start local gateway (random port, localhost-only)
      let state = app.state::<GatewayState>();
      let cfg = state.config.clone();
      let addr_store = state.addr.clone();
      tauri::async_runtime::spawn(async move {
        match gateway::start_gateway(cfg).await {
          Ok((addr, _handle)) => {
            if let Ok(mut guard) = addr_store.write() {
              *guard = Some(addr);
            }
            log::info!("[gateway] started at http://{}", addr);
          }
          Err(e) => {
            log::error!("[gateway] failed to start: {}", e);
          }
        }
      });

      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      pdh_gateway_url,
      pdh_gateway_set_backend_url,
      pdh_gateway_set_token,
      pdh_auth_login,
      pdh_auth_refresh,
      pdh_auth_clear_refresh_token,
      pdh_secret_set_password,
      pdh_secret_get_password,
      pdh_secret_delete_password
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
