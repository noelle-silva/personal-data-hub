mod gateway;
mod local_data;

use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::{Arc, RwLock};
use tauri::Emitter;
use tauri::Manager;
use tauri::State;
use serde_json::json;
use tokio::io::{AsyncReadExt, AsyncSeekExt};
use tokio::sync::{Mutex, watch};
use tokio_util::io::ReaderStream;

struct GatewayState {
  config: Arc<RwLock<gateway::GatewayConfig>>,
  addr: Arc<RwLock<Option<std::net::SocketAddr>>>,
  upload_tasks: Arc<Mutex<HashMap<String, UploadTaskHandle>>>,
}

impl Default for GatewayState {
  fn default() -> Self {
    Self {
      config: Arc::new(RwLock::new(gateway::GatewayConfig::default())),
      addr: Arc::new(RwLock::new(None)),
      upload_tasks: Arc::new(Mutex::new(HashMap::new())),
    }
  }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum UploadRunState {
  Running,
  Paused,
  Canceled,
}

#[derive(Clone)]
struct UploadTaskHandle {
  tx: watch::Sender<UploadRunState>,
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

#[tauri::command]
async fn pdh_pick_directory() -> Result<Option<String>, String> {
  let picked = tauri::async_runtime::spawn_blocking(|| {
    rfd::FileDialog::new()
      .set_title("选择新的本地数据存放位置（会在其中创建 personal-data-hub-data）")
      .pick_folder()
  })
  .await
  .map_err(|e| format!("pick_folder join failed: {e}"))?;

  Ok(picked.map(|p| p.to_string_lossy().to_string()))
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

fn normalize_attachment_category(category: &str) -> Result<&'static str, String> {
  match category.trim() {
    "image" => Ok("image"),
    "video" => Ok("video"),
    "document" => Ok("document"),
    "script" => Ok("script"),
    _ => Err("invalid attachment category".to_string()),
  }
}

fn emit_upload_task_event(app: &tauri::AppHandle, payload: serde_json::Value) {
  let _ = app.emit("pdh-attachment-upload-task", payload);
}

async fn upload_init_session(
  client: &reqwest::Client,
  backend: &str,
  token: &str,
  category: &str,
  original_name: &str,
  mime: &str,
  size: u64,
) -> Result<String, String> {
  let url = format!("{}/api/attachments/uploads/init", backend.trim().trim_end_matches('/'));
  let mut req = client.post(url).json(&json!({
    "category": category,
    "originalName": original_name,
    "mimeType": mime,
    "size": size,
  }));

  if !token.trim().is_empty() {
    req = req.bearer_auth(token.trim());
  }

  let resp = req.send().await.map_err(|e| e.to_string())?;
  let status = resp.status();
  let body = resp.text().await.map_err(|e| e.to_string())?;
  if !status.is_success() {
    return Err(format!("init failed ({}): {}", status.as_u16(), body));
  }

  let v = serde_json::from_str::<serde_json::Value>(&body).map_err(|e| e.to_string())?;
  let upload_id = v
    .get("data")
    .and_then(|d| d.get("uploadId"))
    .and_then(|x| x.as_str())
    .unwrap_or("")
    .trim()
    .to_string();

  if upload_id.is_empty() {
    return Err("init response missing uploadId".to_string());
  }

  Ok(upload_id)
}

async fn upload_status(
  client: &reqwest::Client,
  backend: &str,
  token: &str,
  upload_id: &str,
) -> Result<u64, String> {
  let url = format!(
    "{}/api/attachments/uploads/{}",
    backend.trim().trim_end_matches('/'),
    upload_id.trim()
  );
  let mut req = client.get(url);
  if !token.trim().is_empty() {
    req = req.bearer_auth(token.trim());
  }

  let resp = req.send().await.map_err(|e| e.to_string())?;
  let status = resp.status();
  let body = resp.text().await.map_err(|e| e.to_string())?;
  if !status.is_success() {
    return Err(format!("status failed ({}): {}", status.as_u16(), body));
  }

  let v = serde_json::from_str::<serde_json::Value>(&body).map_err(|e| e.to_string())?;
  let bytes = v
    .get("data")
    .and_then(|d| d.get("bytesReceived"))
    .and_then(|x| x.as_u64())
    .unwrap_or(0);
  Ok(bytes)
}

async fn upload_chunk(
  client: &reqwest::Client,
  backend: &str,
  token: &str,
  upload_id: &str,
  offset: u64,
  bytes: Vec<u8>,
) -> Result<(), String> {
  let url = format!(
    "{}/api/attachments/uploads/{}/chunk?offset={}",
    backend.trim().trim_end_matches('/'),
    upload_id.trim(),
    offset
  );

  let part = reqwest::multipart::Part::bytes(bytes).file_name("chunk");
  let form = reqwest::multipart::Form::new().part("chunk", part);

  let mut req = client.post(url).multipart(form);
  if !token.trim().is_empty() {
    req = req.bearer_auth(token.trim());
  }

  let resp = req.send().await.map_err(|e| e.to_string())?;
  let status = resp.status();
  let body = resp.text().await.map_err(|e| e.to_string())?;
  if !status.is_success() {
    return Err(format!("chunk failed ({}): {}", status.as_u16(), body));
  }
  Ok(())
}

async fn upload_complete(
  client: &reqwest::Client,
  backend: &str,
  token: &str,
  upload_id: &str,
) -> Result<serde_json::Value, String> {
  let url = format!(
    "{}/api/attachments/uploads/{}/complete",
    backend.trim().trim_end_matches('/'),
    upload_id.trim()
  );
  let mut req = client.post(url);
  if !token.trim().is_empty() {
    req = req.bearer_auth(token.trim());
  }

  let resp = req.send().await.map_err(|e| e.to_string())?;
  let status = resp.status();
  let body = resp.text().await.map_err(|e| e.to_string())?;
  if !status.is_success() {
    return Err(format!("complete failed ({}): {}", status.as_u16(), body));
  }

  serde_json::from_str::<serde_json::Value>(&body).map_err(|e| e.to_string())
}

async fn upload_abort(
  client: &reqwest::Client,
  backend: &str,
  token: &str,
  upload_id: &str,
) -> Result<(), String> {
  let url = format!(
    "{}/api/attachments/uploads/{}",
    backend.trim().trim_end_matches('/'),
    upload_id.trim()
  );
  let mut req = client.delete(url);
  if !token.trim().is_empty() {
    req = req.bearer_auth(token.trim());
  }

  let resp = req.send().await.map_err(|e| e.to_string())?;
  if !resp.status().is_success() {
    // abort 是 best-effort：不阻断
    return Ok(());
  }
  Ok(())
}

async fn run_upload_task_from_path(
  app: tauri::AppHandle,
  tasks: Arc<Mutex<HashMap<String, UploadTaskHandle>>>,
  task_id: String,
  tx: watch::Sender<UploadRunState>,
  mut rx: watch::Receiver<UploadRunState>,
  backend: String,
  token: String,
  file_path: PathBuf,
  category: String,
) {
  let category = match normalize_attachment_category(&category) {
    Ok(v) => v.to_string(),
    Err(e) => {
      emit_upload_task_event(&app, json!({
        "taskId": task_id,
        "status": "failed",
        "error": e,
      }));
      let _ = tasks.lock().await.remove(&task_id);
      return;
    }
  };

  let meta = match tokio::fs::metadata(&file_path).await {
    Ok(m) => m,
    Err(e) => {
      emit_upload_task_event(&app, json!({
        "taskId": task_id,
        "status": "failed",
        "error": format!("stat file failed: {e}"),
      }));
      let _ = tasks.lock().await.remove(&task_id);
      return;
    }
  };

  let total_bytes = meta.len();
  let file_name = file_path
    .file_name()
    .and_then(|s| s.to_str())
    .unwrap_or("file")
    .to_string();

  let mime = mime_guess::from_path(&file_path)
    .first_or_octet_stream()
    .essence_str()
    .to_string();

  let client = reqwest::Client::new();
  let upload_id = match upload_init_session(&client, &backend, &token, &category, &file_name, &mime, total_bytes).await {
    Ok(id) => id,
    Err(e) => {
      emit_upload_task_event(&app, json!({
        "taskId": task_id,
        "status": "failed",
        "error": e,
        "totalBytes": total_bytes,
      }));
      let _ = tasks.lock().await.remove(&task_id);
      return;
    }
  };

  emit_upload_task_event(&app, json!({
    "taskId": task_id,
    "status": "uploading",
    "bytesSent": 0,
    "totalBytes": total_bytes,
    "uploadId": upload_id,
  }));

  let mut file = match tokio::fs::File::open(&file_path).await {
    Ok(f) => f,
    Err(e) => {
      emit_upload_task_event(&app, json!({
        "taskId": task_id,
        "status": "failed",
        "error": format!("open file failed: {e}"),
        "totalBytes": total_bytes,
        "uploadId": upload_id,
      }));
      let _ = upload_abort(&client, &backend, &token, &upload_id).await;
      let _ = tasks.lock().await.remove(&task_id);
      return;
    }
  };

  // 1MB：更细粒度的进度更新，暂停/取消响应更快
  const CHUNK_SIZE: usize = 1 * 1024 * 1024;

  loop {
    let state = *rx.borrow();
    if state == UploadRunState::Canceled {
      let _ = upload_abort(&client, &backend, &token, &upload_id).await;
      emit_upload_task_event(&app, json!({
        "taskId": task_id,
        "status": "canceled",
        "bytesSent": 0,
        "totalBytes": total_bytes,
        "uploadId": upload_id,
      }));
      break;
    }

    if state == UploadRunState::Paused {
      emit_upload_task_event(&app, json!({
        "taskId": task_id,
        "status": "paused",
        "totalBytes": total_bytes,
        "uploadId": upload_id,
      }));

      if rx.changed().await.is_err() {
        break;
      }
      continue;
    }

    // Running：对齐服务端 offset（断点续传）
    let offset = match upload_status(&client, &backend, &token, &upload_id).await {
      Ok(b) => b,
      Err(e) => {
        emit_upload_task_event(&app, json!({
          "taskId": task_id,
          "status": "failed",
          "error": e,
          "totalBytes": total_bytes,
          "uploadId": upload_id,
        }));
        let _ = tx.send(UploadRunState::Paused);
        continue;
      }
    };

    if offset >= total_bytes {
      match upload_complete(&client, &backend, &token, &upload_id).await {
        Ok(v) => {
          let attachment = v.get("data").cloned().unwrap_or(json!(null));
          emit_upload_task_event(&app, json!({
            "taskId": task_id,
            "status": "done",
            "bytesSent": total_bytes,
            "totalBytes": total_bytes,
            "uploadId": upload_id,
            "attachment": attachment,
          }));
          break;
        }
        Err(e) => {
          emit_upload_task_event(&app, json!({
            "taskId": task_id,
            "status": "failed",
            "error": e,
            "bytesSent": offset,
            "totalBytes": total_bytes,
            "uploadId": upload_id,
          }));
          let _ = tx.send(UploadRunState::Paused);
          continue;
        }
      }
    }

    // 读文件 chunk
    if let Err(e) = file.seek(std::io::SeekFrom::Start(offset)).await {
      emit_upload_task_event(&app, json!({
        "taskId": task_id,
        "status": "failed",
        "error": format!("seek failed: {e}"),
        "bytesSent": offset,
        "totalBytes": total_bytes,
        "uploadId": upload_id,
      }));
      let _ = tx.send(UploadRunState::Paused);
      continue;
    }

    let remaining = (total_bytes - offset) as usize;
    let to_read = std::cmp::min(remaining, CHUNK_SIZE);
    let mut buf = vec![0u8; to_read];
    let n = match file.read(&mut buf).await {
      Ok(n) => n,
      Err(e) => {
        emit_upload_task_event(&app, json!({
          "taskId": task_id,
          "status": "failed",
          "error": format!("read failed: {e}"),
          "bytesSent": offset,
          "totalBytes": total_bytes,
          "uploadId": upload_id,
        }));
        let _ = tx.send(UploadRunState::Paused);
        continue;
      }
    };

    if n == 0 {
      emit_upload_task_event(&app, json!({
        "taskId": task_id,
        "status": "failed",
        "error": "unexpected EOF".to_string(),
        "bytesSent": offset,
        "totalBytes": total_bytes,
        "uploadId": upload_id,
      }));
      let _ = tx.send(UploadRunState::Paused);
      continue;
    }

    buf.truncate(n);

    // 上传 chunk
    if let Err(e) = upload_chunk(&client, &backend, &token, &upload_id, offset, buf).await {
      emit_upload_task_event(&app, json!({
        "taskId": task_id,
        "status": "failed",
        "error": e,
        "bytesSent": offset,
        "totalBytes": total_bytes,
        "uploadId": upload_id,
      }));
      let _ = tx.send(UploadRunState::Paused);
      continue;
    }

    emit_upload_task_event(&app, json!({
      "taskId": task_id,
      "status": "uploading",
      "bytesSent": offset + n as u64,
      "totalBytes": total_bytes,
      "uploadId": upload_id,
    }));
  }

  let _ = tasks.lock().await.remove(&task_id);
}

#[tauri::command]
async fn pdh_upload_attachment_from_path(
  state: State<'_, GatewayState>,
  path: String,
  category: String,
) -> Result<serde_json::Value, String> {
  let backend = backend_base_url_from_state(&state)?;
  let category = normalize_attachment_category(&category)?;

  let file_path = PathBuf::from(path.trim());
  if file_path.as_os_str().is_empty() {
    return Err("path is empty".to_string());
  }

  let file_name = file_path
    .file_name()
    .and_then(|s| s.to_str())
    .unwrap_or("file")
    .to_string();

  let mime = mime_guess::from_path(&file_path)
    .first_or_octet_stream()
    .essence_str()
    .to_string();

  let file = tokio::fs::File::open(&file_path)
    .await
    .map_err(|e| format!("open file failed: {e}"))?;

  let stream = ReaderStream::new(file);
  let body = reqwest::Body::wrap_stream(stream);
  let part = reqwest::multipart::Part::stream(body)
    .file_name(file_name)
    .mime_str(&mime)
    .map_err(|e| e.to_string())?;
  let form = reqwest::multipart::Form::new().part("file", part);

  let token = {
    let cfg = state
      .config
      .read()
      .map_err(|_| "gateway state poisoned".to_string())?;
    cfg.bearer_token.clone().unwrap_or_default()
  };

  let url = format!("{}/api/attachments/{}", backend, category);
  let client = reqwest::Client::new();
  let mut req = client.post(url).multipart(form);

  if !token.trim().is_empty() {
    req = req.bearer_auth(token.trim());
  }

  let resp = req.send().await.map_err(|e| e.to_string())?;
  let status = resp.status();
  let body = resp.text().await.map_err(|e| e.to_string())?;

  if !status.is_success() {
    return Err(format!("upload failed ({}): {}", status.as_u16(), body));
  }

  serde_json::from_str::<serde_json::Value>(&body).map_err(|e| e.to_string())
}

#[tauri::command]
async fn pdh_attachment_upload_task_start(
  app: tauri::AppHandle,
  state: State<'_, GatewayState>,
  taskId: String,
  path: String,
  category: String,
) -> Result<(), String> {
  #[allow(non_snake_case)]
  let task_id = taskId.trim().to_string();
  if task_id.is_empty() {
    return Err("taskId is empty".to_string());
  }

  let backend = backend_base_url_from_state(&state)?;
  let token = {
    let cfg = state
      .config
      .read()
      .map_err(|_| "gateway state poisoned".to_string())?;
    cfg.bearer_token.clone().unwrap_or_default()
  };

  let file_path = PathBuf::from(path.trim());
  if file_path.as_os_str().is_empty() {
    return Err("path is empty".to_string());
  }

  let (tx, rx) = watch::channel(UploadRunState::Running);

  {
    let mut guard = state.upload_tasks.lock().await;
    if guard.contains_key(&task_id) {
      return Err("task already exists".to_string());
    }
    guard.insert(task_id.clone(), UploadTaskHandle { tx: tx.clone() });
  }

  let tasks = state.upload_tasks.clone();
  let app_handle = app.clone();
  tauri::async_runtime::spawn(async move {
    run_upload_task_from_path(
      app_handle,
      tasks,
      task_id,
      tx,
      rx,
      backend,
      token,
      file_path,
      category,
    )
    .await;
  });

  Ok(())
}

#[tauri::command]
async fn pdh_attachment_upload_task_pause(state: State<'_, GatewayState>, taskId: String) -> Result<(), String> {
  #[allow(non_snake_case)]
  let task_id = taskId.trim().to_string();
  let guard = state.upload_tasks.lock().await;
  if let Some(h) = guard.get(&task_id) {
    let _ = h.tx.send(UploadRunState::Paused);
    Ok(())
  } else {
    Err("task not found".to_string())
  }
}

#[tauri::command]
async fn pdh_attachment_upload_task_resume(state: State<'_, GatewayState>, taskId: String) -> Result<(), String> {
  #[allow(non_snake_case)]
  let task_id = taskId.trim().to_string();
  let guard = state.upload_tasks.lock().await;
  if let Some(h) = guard.get(&task_id) {
    let _ = h.tx.send(UploadRunState::Running);
    Ok(())
  } else {
    Err("task not found".to_string())
  }
}

#[tauri::command]
async fn pdh_attachment_upload_task_cancel(state: State<'_, GatewayState>, taskId: String) -> Result<(), String> {
  #[allow(non_snake_case)]
  let task_id = taskId.trim().to_string();
  let guard = state.upload_tasks.lock().await;
  if let Some(h) = guard.get(&task_id) {
    let _ = h.tx.send(UploadRunState::Canceled);
    Ok(())
  } else {
    Err("task not found".to_string())
  }
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
      pdh_upload_attachment_from_path,
      pdh_attachment_upload_task_start,
      pdh_attachment_upload_task_pause,
      pdh_attachment_upload_task_resume,
      pdh_attachment_upload_task_cancel,
      pdh_auth_login,
      pdh_auth_refresh,
      pdh_auth_clear_refresh_token,
      pdh_secret_set_password,
      pdh_secret_get_password,
      pdh_secret_delete_password,
      local_data::pdh_local_data_info,
      local_data::pdh_local_data_migrate,
      local_data::pdh_theme_presets_list,
      local_data::pdh_theme_presets_save,
      local_data::pdh_theme_presets_delete,
      local_data::pdh_wallpapers_list,
      local_data::pdh_wallpapers_get_current,
      local_data::pdh_wallpapers_create,
      local_data::pdh_wallpapers_set_current,
      local_data::pdh_wallpapers_delete,
      local_data::pdh_wallpapers_update_description,
      local_data::pdh_wallpapers_stats,
      local_data::pdh_transparency_get_current,
      local_data::pdh_transparency_set_current,
      local_data::pdh_transparency_clear_current,
      local_data::pdh_transparency_list_configs,
      local_data::pdh_transparency_get_config,
      local_data::pdh_transparency_save_config,
      local_data::pdh_transparency_delete_config,
      pdh_pick_directory
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
