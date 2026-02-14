use base64::engine::general_purpose;
use base64::Engine;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Component;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};
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

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalWallpaper {
  #[serde(rename = "_id")]
  pub id: String,
  pub original_name: String,
  pub url: String,
  pub mime_type: String,
  pub size: u64,
  pub description: String,
  pub created_at: String,
  pub updated_at: String,
  pub is_current: bool,
  pub source: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct WallpapersFile {
  version: u32,
  current_wallpaper_id: Option<String>,
  wallpapers: Vec<LocalWallpaper>,
}

impl Default for WallpapersFile {
  fn default() -> Self {
    Self {
      version: 1,
      current_wallpaper_id: None,
      wallpapers: Vec::new(),
    }
  }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TransparencyValue {
  pub cards: u8,
  pub sidebar: u8,
  pub app_bar: u8,
}

impl Default for TransparencyValue {
  fn default() -> Self {
    Self {
      cards: 100,
      sidebar: 100,
      app_bar: 100,
    }
  }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TransparencyConfigRecord {
  pub name: String,
  pub description: String,
  pub transparency: TransparencyValue,
  pub created_at: String,
  pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct TransparencyFile {
  version: u32,
  current: Option<TransparencyValue>,
  configs: Vec<TransparencyConfigRecord>,
}

impl Default for TransparencyFile {
  fn default() -> Self {
    Self {
      version: 1,
      current: None,
      configs: Vec::new(),
    }
  }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WallpaperDeleteResult {
  pub deleted_id: String,
  pub current_wallpaper: Option<LocalWallpaper>,
  pub total: usize,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WallpaperStats {
  pub total_wallpapers: usize,
  pub total_size: u64,
  pub avg_size: u64,
  pub current_wallpaper: u8,
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

fn wallpapers_file_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
  let (data_dir, _default, _cfg_path, _custom) = resolve_data_dir(app)?;
  Ok(data_dir.join("themes").join("wallpapers.json"))
}

fn wallpapers_images_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
  let (data_dir, _default, _cfg_path, _custom) = resolve_data_dir(app)?;
  Ok(data_dir.join("themes").join("wallpapers"))
}

fn sanitize_extension(ext: &str) -> Option<String> {
  let trimmed = ext.trim().trim_start_matches('.').to_lowercase();
  if trimmed.is_empty() || trimmed.len() > 12 {
    return None;
  }
  if !trimmed.chars().all(|c| c.is_ascii_alphanumeric()) {
    return None;
  }
  Some(trimmed)
}

fn ext_from_original_name(original_name: &str) -> Option<String> {
  Path::new(original_name)
    .extension()
    .and_then(|s| s.to_str())
    .and_then(sanitize_extension)
    .map(|ext| if ext == "jpeg" { "jpg".to_string() } else { ext })
}

fn ext_from_mime_type(mime_type: &str) -> Option<String> {
  let mt = mime_type.trim().to_lowercase();
  match mt.as_str() {
    "image/jpeg" => Some("jpg".to_string()),
    "image/png" => Some("png".to_string()),
    "image/webp" => Some("webp".to_string()),
    "image/gif" => Some("gif".to_string()),
    "image/bmp" => Some("bmp".to_string()),
    "image/avif" => Some("avif".to_string()),
    _ => None,
  }
}

fn data_url_decode(data_url: &str) -> Option<(String, Vec<u8>)> {
  let input = data_url.trim();
  if !input.starts_with("data:") {
    return None;
  }
  let comma = input.find(',')?;
  let (meta, payload) = input.split_at(comma);
  let payload = payload.trim_start_matches(',').trim();
  let meta = meta.trim_start_matches("data:").trim();
  let mut parts = meta.split(';');
  let mime_type = parts.next().unwrap_or("").trim().to_string();
  let is_base64 = parts.any(|p| p.trim().eq_ignore_ascii_case("base64"));
  if !is_base64 {
    return None;
  }
  let bytes = general_purpose::STANDARD.decode(payload.as_bytes()).ok()?;
  Some((mime_type, bytes))
}

fn ensure_relative_path_no_escape(path: &Path) -> bool {
  !path.components().any(|c| matches!(c, Component::ParentDir | Component::RootDir | Component::Prefix(_)))
}

fn write_wallpaper_bytes(
  app: &tauri::AppHandle,
  id: &str,
  original_name: &str,
  mime_type: &str,
  bytes: &[u8],
) -> Result<PathBuf, String> {
  if id.trim().is_empty() {
    return Err("wallpaper id is empty".to_string());
  }

  let dir = wallpapers_images_dir(app)?;
  ensure_dir(&dir)?;

  let ext = ext_from_original_name(original_name)
    .or_else(|| ext_from_mime_type(mime_type))
    .unwrap_or_else(|| "img".to_string());

  let file_name = format!("{id}.{ext}");
  let rel = Path::new(&file_name);
  if !ensure_relative_path_no_escape(rel) {
    return Err("invalid wallpaper file name".to_string());
  }

  let path = dir.join(rel);
  fs::write(&path, bytes).map_err(|e| format!("write wallpaper file failed: {e}"))?;
  Ok(path)
}

fn maybe_delete_wallpaper_file(app: &tauri::AppHandle, url: &str) -> Result<(), String> {
  let raw = url.trim();
  if raw.is_empty() || raw.starts_with("data:") {
    return Ok(());
  }

  let images_dir = wallpapers_images_dir(app)?;
  let images_dir_canon = fs::canonicalize(&images_dir).unwrap_or(images_dir);
  let file_path = PathBuf::from(raw);
  let file_canon = match fs::canonicalize(&file_path) {
    Ok(p) => p,
    Err(_) => return Ok(()),
  };

  // 永不破坏用户空间：只删除 wallpapers 目录内的文件
  if !file_canon.starts_with(&images_dir_canon) {
    return Ok(());
  }

  if file_canon.is_file() {
    let _ = fs::remove_file(file_canon);
  }
  Ok(())
}

fn transparency_file_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
  let (data_dir, _default, _cfg_path, _custom) = resolve_data_dir(app)?;
  Ok(data_dir.join("themes").join("transparency.json"))
}

fn generate_local_id(prefix: &str) -> String {
  let millis = SystemTime::now()
    .duration_since(UNIX_EPOCH)
    .map(|d| d.as_millis())
    .unwrap_or(0);
  format!("{}_{}", prefix, millis)
}

fn normalize_transparency_value(value: TransparencyValue) -> TransparencyValue {
  TransparencyValue {
    cards: value.cards.min(100),
    sidebar: value.sidebar.min(100),
    app_bar: value.app_bar.min(100),
  }
}

fn load_wallpapers(app: &tauri::AppHandle) -> Result<WallpapersFile, String> {
  let path = wallpapers_file_path(app)?;
  let raw = match fs::read_to_string(&path) {
    Ok(s) => s,
    Err(_) => return Ok(WallpapersFile::default()),
  };
  let parsed = serde_json::from_str::<WallpapersFile>(&raw).unwrap_or_default();
  Ok(parsed)
}

fn save_wallpapers(app: &tauri::AppHandle, file: &WallpapersFile) -> Result<(), String> {
  let path = wallpapers_file_path(app)?;
  if let Some(parent) = path.parent() {
    ensure_dir(parent)?;
  }
  let raw = serde_json::to_string_pretty(file).map_err(|e| format!("serialize wallpapers failed: {e}"))?;
  fs::write(path, raw).map_err(|e| format!("write wallpapers failed: {e}"))?;
  Ok(())
}

fn sort_wallpapers_desc(wallpapers: &mut Vec<LocalWallpaper>) {
  wallpapers.sort_by(|a, b| b.created_at.cmp(&a.created_at));
}

fn migrate_wallpaper_data_urls(app: &tauri::AppHandle, file: &mut WallpapersFile) -> Result<(), String> {
  for wallpaper in file.wallpapers.iter_mut() {
    let raw = wallpaper.url.trim();
    if !raw.starts_with("data:") {
      continue;
    }

    let (decoded_mime, bytes) = match data_url_decode(raw) {
      Some(v) => v,
      None => continue,
    };

    let mime_type = if wallpaper.mime_type.trim().is_empty() {
      decoded_mime
    } else {
      wallpaper.mime_type.clone()
    };

    let path = match write_wallpaper_bytes(app, &wallpaper.id, &wallpaper.original_name, &mime_type, &bytes) {
      Ok(p) => p,
      Err(_) => continue,
    };
    wallpaper.url = path.to_string_lossy().to_string();
    wallpaper.mime_type = mime_type;
    wallpaper.size = bytes.len() as u64;
  }

  Ok(())
}

fn normalize_wallpapers_file(app: &tauri::AppHandle, file: &mut WallpapersFile) -> Result<(), String> {
  migrate_wallpaper_data_urls(app, file)?;
  sort_wallpapers_desc(&mut file.wallpapers);

  if file.wallpapers.is_empty() {
    file.current_wallpaper_id = None;
    return Ok(());
  }

  let mut current_id = file.current_wallpaper_id.clone().unwrap_or_default();
  if current_id.trim().is_empty() {
    if let Some(current) = file.wallpapers.iter().find(|w| w.is_current) {
      current_id = current.id.clone();
    } else if let Some(first) = file.wallpapers.first() {
      current_id = first.id.clone();
    }
  }

  if !file.wallpapers.iter().any(|w| w.id == current_id) {
    if let Some(first) = file.wallpapers.first() {
      current_id = first.id.clone();
    }
  }

  for wallpaper in file.wallpapers.iter_mut() {
    wallpaper.is_current = wallpaper.id == current_id;
    if wallpaper.source.trim().is_empty() {
      wallpaper.source = "local".to_string();
    }
  }

  file.current_wallpaper_id = Some(current_id);
  Ok(())
}

fn load_transparency(app: &tauri::AppHandle) -> Result<TransparencyFile, String> {
  let path = transparency_file_path(app)?;
  let raw = match fs::read_to_string(&path) {
    Ok(s) => s,
    Err(_) => return Ok(TransparencyFile::default()),
  };
  let mut parsed = serde_json::from_str::<TransparencyFile>(&raw).unwrap_or_default();
  if let Some(current) = parsed.current.take() {
    parsed.current = Some(normalize_transparency_value(current));
  }
  parsed.configs = parsed
    .configs
    .into_iter()
    .map(|mut item| {
      item.transparency = normalize_transparency_value(item.transparency);
      item
    })
    .collect();
  Ok(parsed)
}

fn save_transparency(app: &tauri::AppHandle, file: &TransparencyFile) -> Result<(), String> {
  let path = transparency_file_path(app)?;
  if let Some(parent) = path.parent() {
    ensure_dir(parent)?;
  }
  let raw = serde_json::to_string_pretty(file).map_err(|e| format!("serialize transparency failed: {e}"))?;
  fs::write(path, raw).map_err(|e| format!("write transparency failed: {e}"))?;
  Ok(())
}

#[tauri::command]
pub fn pdh_wallpapers_list(app: tauri::AppHandle) -> Result<Vec<LocalWallpaper>, String> {
  let mut file = load_wallpapers(&app)?;
  normalize_wallpapers_file(&app, &mut file)?;
  save_wallpapers(&app, &file)?;
  Ok(file.wallpapers)
}

#[tauri::command]
pub fn pdh_wallpapers_get_current(app: tauri::AppHandle) -> Result<Option<LocalWallpaper>, String> {
  let mut file = load_wallpapers(&app)?;
  normalize_wallpapers_file(&app, &mut file)?;
  save_wallpapers(&app, &file)?;
  Ok(file.wallpapers.into_iter().find(|item| item.is_current))
}

#[tauri::command]
pub fn pdh_wallpapers_create(
  app: tauri::AppHandle,
  original_name: String,
  bytes: Vec<u8>,
  mime_type: String,
  description: String,
  created_at: String,
  updated_at: String,
) -> Result<LocalWallpaper, String> {
  let mut file = load_wallpapers(&app)?;

  if bytes.is_empty() {
    return Err("wallpaper bytes is empty".to_string());
  }

  let id = generate_local_id("local");
  let path = write_wallpaper_bytes(&app, &id, &original_name, &mime_type, &bytes)?;

  let mut next = LocalWallpaper {
    id,
    original_name: original_name.trim().to_string(),
    url: path.to_string_lossy().to_string(),
    mime_type,
    size: bytes.len() as u64,
    description: description.trim().to_string(),
    created_at,
    updated_at,
    is_current: false,
    source: "local".to_string(),
  };

  if file.wallpapers.is_empty() {
    next.is_current = true;
    file.current_wallpaper_id = Some(next.id.clone());
  }

  file.wallpapers.insert(0, next.clone());
  normalize_wallpapers_file(&app, &mut file)?;
  save_wallpapers(&app, &file)?;

  let created = file
    .wallpapers
    .iter()
    .find(|item| item.id == next.id)
    .cloned()
    .ok_or_else(|| "create wallpaper failed".to_string())?;

  Ok(created)
}

#[tauri::command]
pub fn pdh_wallpapers_set_current(app: tauri::AppHandle, id: String) -> Result<LocalWallpaper, String> {
  let target = id.trim();
  if target.is_empty() {
    return Err("wallpaper id is empty".to_string());
  }

  let mut file = load_wallpapers(&app)?;
  if !file.wallpapers.iter().any(|item| item.id == target) {
    return Err("wallpaper not found".to_string());
  }

  file.current_wallpaper_id = Some(target.to_string());
  normalize_wallpapers_file(&app, &mut file)?;
  save_wallpapers(&app, &file)?;

  file
    .wallpapers
    .into_iter()
    .find(|item| item.id == target)
    .ok_or_else(|| "wallpaper not found".to_string())
}

#[tauri::command]
pub fn pdh_wallpapers_delete(app: tauri::AppHandle, id: String) -> Result<WallpaperDeleteResult, String> {
  let target = id.trim();
  if target.is_empty() {
    return Err("wallpaper id is empty".to_string());
  }

  let mut file = load_wallpapers(&app)?;
  let to_delete_url = file
    .wallpapers
    .iter()
    .find(|item| item.id == target)
    .map(|item| item.url.clone())
    .unwrap_or_default();
  let before = file.wallpapers.len();
  file.wallpapers.retain(|item| item.id != target);

  if file.wallpapers.len() == before {
    return Err("wallpaper not found".to_string());
  }

  if file.current_wallpaper_id.as_deref() == Some(target) {
    file.current_wallpaper_id = file.wallpapers.first().map(|item| item.id.clone());
  }

  normalize_wallpapers_file(&app, &mut file)?;
  save_wallpapers(&app, &file)?;

  let _ = maybe_delete_wallpaper_file(&app, &to_delete_url);

  let current_wallpaper = file.wallpapers.iter().find(|item| item.is_current).cloned();

  Ok(WallpaperDeleteResult {
    deleted_id: target.to_string(),
    current_wallpaper,
    total: file.wallpapers.len(),
  })
}

#[tauri::command]
pub fn pdh_wallpapers_update_description(
  app: tauri::AppHandle,
  id: String,
  description: String,
  updated_at: String,
) -> Result<LocalWallpaper, String> {
  let target = id.trim();
  if target.is_empty() {
    return Err("wallpaper id is empty".to_string());
  }

  let mut file = load_wallpapers(&app)?;
  let mut found = false;

  for wallpaper in file.wallpapers.iter_mut() {
    if wallpaper.id == target {
      wallpaper.description = description.trim().to_string();
      wallpaper.updated_at = updated_at.clone();
      found = true;
      break;
    }
  }

  if !found {
    return Err("wallpaper not found".to_string());
  }

  normalize_wallpapers_file(&app, &mut file)?;
  save_wallpapers(&app, &file)?;

  file
    .wallpapers
    .into_iter()
    .find(|item| item.id == target)
    .ok_or_else(|| "wallpaper not found".to_string())
}

#[tauri::command]
pub fn pdh_wallpapers_stats(app: tauri::AppHandle) -> Result<WallpaperStats, String> {
  let mut file = load_wallpapers(&app)?;
  normalize_wallpapers_file(&app, &mut file)?;
  save_wallpapers(&app, &file)?;

  let total_wallpapers = file.wallpapers.len();
  let total_size = file.wallpapers.iter().map(|item| item.size).sum::<u64>();
  let avg_size = if total_wallpapers > 0 {
    total_size / total_wallpapers as u64
  } else {
    0
  };
  let current_wallpaper = if file.wallpapers.iter().any(|item| item.is_current) {
    1
  } else {
    0
  };

  Ok(WallpaperStats {
    total_wallpapers,
    total_size,
    avg_size,
    current_wallpaper,
  })
}

#[tauri::command]
pub fn pdh_transparency_get_current(app: tauri::AppHandle) -> Result<Option<TransparencyValue>, String> {
  let file = load_transparency(&app)?;
  Ok(file.current)
}

#[tauri::command]
pub fn pdh_transparency_set_current(
  app: tauri::AppHandle,
  transparency: TransparencyValue,
) -> Result<TransparencyValue, String> {
  let mut file = load_transparency(&app)?;
  let normalized = normalize_transparency_value(transparency);
  file.current = Some(normalized.clone());
  save_transparency(&app, &file)?;
  Ok(normalized)
}

#[tauri::command]
pub fn pdh_transparency_clear_current(app: tauri::AppHandle) -> Result<(), String> {
  let mut file = load_transparency(&app)?;
  file.current = None;
  save_transparency(&app, &file)?;
  Ok(())
}

#[tauri::command]
pub fn pdh_transparency_list_configs(app: tauri::AppHandle) -> Result<Vec<TransparencyConfigRecord>, String> {
  let file = load_transparency(&app)?;
  Ok(file.configs)
}

#[tauri::command]
pub fn pdh_transparency_get_config(
  app: tauri::AppHandle,
  name: String,
) -> Result<Option<TransparencyConfigRecord>, String> {
  let target = name.trim();
  if target.is_empty() {
    return Ok(None);
  }

  let file = load_transparency(&app)?;
  Ok(file.configs.into_iter().find(|item| item.name == target))
}

#[tauri::command]
pub fn pdh_transparency_save_config(
  app: tauri::AppHandle,
  name: String,
  description: String,
  transparency: TransparencyValue,
  created_at: String,
  updated_at: String,
) -> Result<TransparencyConfigRecord, String> {
  let target = name.trim();
  if target.is_empty() {
    return Err("config name is empty".to_string());
  }

  let mut file = load_transparency(&app)?;
  let normalized = normalize_transparency_value(transparency);

  if let Some(item) = file.configs.iter_mut().find(|item| item.name == target) {
    item.description = description.trim().to_string();
    item.transparency = normalized;
    item.updated_at = updated_at;
  } else {
    file.configs.push(TransparencyConfigRecord {
      name: target.to_string(),
      description: description.trim().to_string(),
      transparency: normalized,
      created_at,
      updated_at,
    });
  }

  save_transparency(&app, &file)?;

  file
    .configs
    .into_iter()
    .find(|item| item.name == target)
    .ok_or_else(|| "save transparency config failed".to_string())
}

#[tauri::command]
pub fn pdh_transparency_delete_config(app: tauri::AppHandle, name: String) -> Result<(), String> {
  let target = name.trim();
  if target.is_empty() {
    return Ok(());
  }

  let mut file = load_transparency(&app)?;
  file.configs.retain(|item| item.name != target);
  save_transparency(&app, &file)?;
  Ok(())
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
