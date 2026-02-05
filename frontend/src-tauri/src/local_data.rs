use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::Manager;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalDataInfo {
  pub data_dir: String,
  pub default_data_dir: String,
  pub config_path: String,
  pub using_custom_dir: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ThemePreset {
  pub id: String,
  pub name: String,
  pub created_at: String,
  pub payload: serde_json::Value,
}

#[derive(Debug, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct LocalDataConfig {
  data_dir: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ThemePresetsFile {
  version: u32,
  presets: Vec<ThemePreset>,
}

impl Default for ThemePresetsFile {
  fn default() -> Self {
    Self {
      version: 1,
      presets: Vec::new(),
    }
  }
}

fn config_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
  let dir = app
    .path()
    .app_config_dir()
    .map_err(|e| format!("resolve config dir failed: {e}"))?;
  Ok(dir.join("local-data.json"))
}

fn default_data_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
  let dir = app
    .path()
    .app_data_dir()
    .map_err(|e| format!("resolve app data dir failed: {e}"))?;
  Ok(dir.join("data"))
}

fn load_config(path: &Path) -> LocalDataConfig {
  let raw = match fs::read_to_string(path) {
    Ok(s) => s,
    Err(_) => return LocalDataConfig::default(),
  };
  match serde_json::from_str::<LocalDataConfig>(&raw) {
    Ok(cfg) => cfg,
    Err(_) => LocalDataConfig::default(),
  }
}

fn save_config(path: &Path, cfg: &LocalDataConfig) -> Result<(), String> {
  if let Some(parent) = path.parent() {
    fs::create_dir_all(parent).map_err(|e| format!("create config dir failed: {e}"))?;
  }
  let raw = serde_json::to_string_pretty(cfg).map_err(|e| format!("serialize config failed: {e}"))?;
  fs::write(path, raw).map_err(|e| format!("write config failed: {e}"))?;
  Ok(())
}

fn resolve_data_dir(app: &tauri::AppHandle) -> Result<(PathBuf, PathBuf, PathBuf, bool), String> {
  let cfg_path = config_path(app)?;
  let default_dir = default_data_dir(app)?;
  let cfg = load_config(&cfg_path);

  let (data_dir, using_custom) = match cfg.data_dir {
    Some(raw) if !raw.trim().is_empty() => (PathBuf::from(raw.trim()), true),
    _ => (default_dir.clone(), false),
  };

  Ok((data_dir, default_dir, cfg_path, using_custom))
}

fn ensure_dir(path: &Path) -> Result<(), String> {
  fs::create_dir_all(path).map_err(|e| format!("create dir failed: {e}"))?;
  Ok(())
}

fn is_dir_empty(path: &Path) -> Result<bool, String> {
  let mut it = fs::read_dir(path).map_err(|e| format!("read dir failed: {e}"))?;
  Ok(it.next().is_none())
}

fn canonicalize_if_exists(path: &Path) -> Option<PathBuf> {
  fs::canonicalize(path).ok()
}

fn copy_dir_recursive(src: &Path, dst: &Path) -> Result<(), String> {
  ensure_dir(dst)?;

  for entry in fs::read_dir(src).map_err(|e| format!("read dir failed: {e}"))? {
    let entry = entry.map_err(|e| format!("read dir entry failed: {e}"))?;
    let ty = entry
      .file_type()
      .map_err(|e| format!("read file type failed: {e}"))?;
    let src_path = entry.path();
    let dst_path = dst.join(entry.file_name());

    if ty.is_dir() {
      copy_dir_recursive(&src_path, &dst_path)?;
      continue;
    }

    if ty.is_file() {
      if dst_path.exists() {
        return Err(format!(
          "目标路径已存在同名文件：{}",
          dst_path.to_string_lossy()
        ));
      }
      if let Some(parent) = dst_path.parent() {
        ensure_dir(parent)?;
      }
      fs::copy(&src_path, &dst_path)
        .map_err(|e| format!("copy file failed ({}): {e}", src_path.to_string_lossy()))?;
      continue;
    }
  }

  Ok(())
}

fn presets_file_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
  let (data_dir, _default, _cfg_path, _custom) = resolve_data_dir(app)?;
  Ok(data_dir.join("themes").join("presets.json"))
}

fn load_presets(app: &tauri::AppHandle) -> Result<ThemePresetsFile, String> {
  let path = presets_file_path(app)?;
  let raw = match fs::read_to_string(&path) {
    Ok(s) => s,
    Err(_) => return Ok(ThemePresetsFile::default()),
  };
  let parsed = serde_json::from_str::<ThemePresetsFile>(&raw).unwrap_or_default();
  Ok(parsed)
}

fn save_presets(app: &tauri::AppHandle, file: &ThemePresetsFile) -> Result<(), String> {
  let path = presets_file_path(app)?;
  if let Some(parent) = path.parent() {
    ensure_dir(parent)?;
  }
  let raw = serde_json::to_string_pretty(file).map_err(|e| format!("serialize presets failed: {e}"))?;
  fs::write(path, raw).map_err(|e| format!("write presets failed: {e}"))?;
  Ok(())
}

#[tauri::command]
pub fn pdh_local_data_info(app: tauri::AppHandle) -> Result<LocalDataInfo, String> {
  let (data_dir, default_dir, cfg_path, using_custom) = resolve_data_dir(&app)?;
  ensure_dir(&data_dir)?;

  Ok(LocalDataInfo {
    data_dir: data_dir.to_string_lossy().to_string(),
    default_data_dir: default_dir.to_string_lossy().to_string(),
    config_path: cfg_path.to_string_lossy().to_string(),
    using_custom_dir: using_custom,
  })
}

#[tauri::command]
pub fn pdh_local_data_migrate(app: tauri::AppHandle, target_base_dir: String) -> Result<LocalDataInfo, String> {
  let base_raw = target_base_dir.trim();
  if base_raw.is_empty() {
    return Err("target_base_dir is empty".to_string());
  }

  let (src_dir, _default_dir, cfg_path, _using_custom) = resolve_data_dir(&app)?;
  ensure_dir(&src_dir)?;

  let base = PathBuf::from(base_raw);
  if base.as_os_str().is_empty() {
    return Err("target_base_dir is invalid".to_string());
  }
  ensure_dir(&base)?;

  let dst_dir = base.join("personal-data-hub-data");
  if dst_dir.exists() {
    let empty = is_dir_empty(&dst_dir)?;
    if !empty {
      return Err(format!(
        "目标目录非空：{}",
        dst_dir.to_string_lossy()
      ));
    }
  }

  let src_canon = canonicalize_if_exists(&src_dir);
  let dst_parent_canon = canonicalize_if_exists(&base);
  if let (Some(src_c), Some(dst_parent)) = (src_canon, dst_parent_canon) {
    if dst_parent.starts_with(&src_c) {
      return Err("目标目录不能位于当前数据目录内部".to_string());
    }
  }

  ensure_dir(&dst_dir)?;
  copy_dir_recursive(&src_dir, &dst_dir)?;

  let cfg = LocalDataConfig {
    data_dir: Some(dst_dir.to_string_lossy().to_string()),
  };
  save_config(&cfg_path, &cfg)?;

  pdh_local_data_info(app)
}

#[tauri::command]
pub fn pdh_theme_presets_list(app: tauri::AppHandle) -> Result<Vec<ThemePreset>, String> {
  let file = load_presets(&app)?;
  Ok(file.presets)
}

#[tauri::command]
pub fn pdh_theme_presets_save(
  app: tauri::AppHandle,
  id: String,
  name: String,
  created_at: String,
  payload: serde_json::Value,
) -> Result<ThemePreset, String> {
  let preset_id = id.trim().to_string();
  if preset_id.is_empty() {
    return Err("id is empty".to_string());
  }
  let preset_name = name.trim().to_string();
  if preset_name.is_empty() {
    return Err("name is empty".to_string());
  }

  let next = ThemePreset {
    id: preset_id,
    name: preset_name,
    created_at: created_at.trim().to_string(),
    payload,
  };

  let mut file = load_presets(&app)?;
  if let Some(idx) = file.presets.iter().position(|p| p.id == next.id) {
    file.presets[idx] = next.clone();
  } else {
    file.presets.insert(0, next.clone());
  }

  save_presets(&app, &file)?;
  Ok(next)
}

#[tauri::command]
pub fn pdh_theme_presets_delete(app: tauri::AppHandle, id: String) -> Result<(), String> {
  let target = id.trim();
  if target.is_empty() {
    return Ok(());
  }

  let mut file = load_presets(&app)?;
  let before = file.presets.len();
  file.presets.retain(|p| p.id != target);
  if file.presets.len() == before {
    return Ok(());
  }
  save_presets(&app, &file)?;
  Ok(())
}
