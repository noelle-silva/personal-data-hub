import { isTauri, invoke } from './tauriBridge';

const STORAGE_KEY = 'pdh_theme_presets_v1';

const safeParseJson = (raw, fallback) => {
  try {
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};

const safeStringifyJson = (value, fallback = '[]') => {
  try {
    return JSON.stringify(value);
  } catch {
    return fallback;
  }
};

const nowIso = () => {
  try {
    return new Date().toISOString();
  } catch {
    return '';
  }
};

const generateId = () => {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `tp_${crypto.randomUUID()}`;
    }
  } catch {
    // ignore
  }
  return `tp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
};

const normalizePreset = (raw) => {
  if (!raw || typeof raw !== 'object') return null;
  const id = typeof raw.id === 'string' ? raw.id.trim() : '';
  if (!id) return null;
  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  if (!name) return null;
  const createdAt = typeof raw.createdAt === 'string' ? raw.createdAt : (typeof raw.created_at === 'string' ? raw.created_at : '');
  const payload = raw.payload && typeof raw.payload === 'object' ? raw.payload : null;
  if (!payload) return null;
  return { id, name, createdAt, payload };
};

const readFromLocalStorage = () => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = safeParseJson(raw, []);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizePreset).filter(Boolean);
  } catch {
    return [];
  }
};

const writeToLocalStorage = (presets) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, safeStringifyJson(presets));
  } catch {
    // ignore
  }
};

export const listThemePresets = async () => {
  if (isTauri()) {
    const presets = await invoke('pdh_theme_presets_list');
    return Array.isArray(presets) ? presets.map(normalizePreset).filter(Boolean) : [];
  }
  return readFromLocalStorage();
};

export const getThemePresetById = async (id) => {
  const target = (id || '').trim();
  if (!target) return null;
  const presets = await listThemePresets();
  return presets.find((p) => p.id === target) || null;
};

export const saveThemePreset = async ({ name, payload }) => {
  const presetName = String(name || '').trim();
  if (!presetName) {
    throw new Error('配色名称不能为空');
  }
  if (!payload || typeof payload !== 'object') {
    throw new Error('配色数据无效');
  }

  const preset = {
    id: generateId(),
    name: presetName,
    createdAt: nowIso(),
    payload,
  };

  if (isTauri()) {
    const saved = await invoke('pdh_theme_presets_save', {
      id: preset.id,
      name: preset.name,
      createdAt: preset.createdAt,
      payload: preset.payload,
    });
    return normalizePreset(saved) || preset;
  }

  const presets = readFromLocalStorage();
  const next = [preset, ...presets.filter((p) => p.id !== preset.id)];
  writeToLocalStorage(next);
  return preset;
};

export const deleteThemePreset = async (id) => {
  const target = (id || '').trim();
  if (!target) return;

  if (isTauri()) {
    await invoke('pdh_theme_presets_delete', { id: target });
    return;
  }

  const presets = readFromLocalStorage();
  const next = presets.filter((p) => p.id !== target);
  writeToLocalStorage(next);
};

