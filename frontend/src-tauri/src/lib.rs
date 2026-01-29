mod gateway;

use std::sync::{Arc, RwLock};
use tauri::Manager;
use tauri::State;

#[derive(Default)]
struct GatewayState {
  config: Arc<RwLock<gateway::GatewayConfig>>,
  addr: Arc<RwLock<Option<std::net::SocketAddr>>>,
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
      pdh_gateway_set_token
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
