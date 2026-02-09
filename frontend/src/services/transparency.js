import { invoke, isTauri } from './tauriBridge';

const CURRENT_TRANSPARENCY_KEY = 'currentTransparency';

const normalizeTransparency = (value = {}) => ({
  cards: Number.isFinite(Number(value.cards)) ? Math.max(0, Math.min(100, Number(value.cards))) : 100,
  sidebar: Number.isFinite(Number(value.sidebar)) ? Math.max(0, Math.min(100, Number(value.sidebar))) : 100,
  appBar: Number.isFinite(Number(value.appBar)) ? Math.max(0, Math.min(100, Number(value.appBar))) : 100
});

const readJson = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};

const writeJson = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

const readCurrentFromLocalStorage = () => {
  const value = readJson(CURRENT_TRANSPARENCY_KEY, null);
  return value ? normalizeTransparency(value) : null;
};

const ensureDesktop = () => {
  if (!isTauri()) {
    throw new Error('当前仅支持桌面端本地数据目录');
  }
};

const nowIso = () => new Date().toISOString();

const toTauriTransparency = (value) => {
  const normalized = normalizeTransparency(value);
  return {
    cards: normalized.cards,
    sidebar: normalized.sidebar,
    appBar: normalized.appBar
  };
};

const fromTauriConfig = (value) => {
  if (!value || typeof value !== 'object') return null;
  return {
    name: String(value.name || '').trim(),
    description: String(value.description || ''),
    transparency: normalizeTransparency(value.transparency),
    createdAt: String(value.createdAt || ''),
    updatedAt: String(value.updatedAt || '')
  };
};

const transparencyService = {
  async getAllConfigs() {
    ensureDesktop();
    const configs = await invoke('pdh_transparency_list_configs');
    return {
      data: (Array.isArray(configs) ? configs : []).map(fromTauriConfig).filter(Boolean)
    };
  },

  async getConfigByName(configName) {
    ensureDesktop();
    const name = String(configName || '').trim();
    const config = await invoke('pdh_transparency_get_config', { name });
    const normalized = fromTauriConfig(config);

    if (!normalized) {
      throw new Error('未找到透明度配置');
    }

    return {
      data: normalized
    };
  },

  async saveConfig(configName, configData) {
    ensureDesktop();
    const name = String(configName || configData?.name || '').trim();
    if (!name) {
      throw new Error('配置名称不能为空');
    }

    const saved = await invoke('pdh_transparency_save_config', {
      name,
      description: String(configData?.description || '').trim(),
      transparency: toTauriTransparency(configData?.transparency),
      createdAt: String(configData?.createdAt || nowIso()),
      updatedAt: nowIso()
    });

    return {
      data: fromTauriConfig(saved)
    };
  },

  async deleteConfig(configName) {
    ensureDesktop();
    const name = String(configName || '').trim();
    await invoke('pdh_transparency_delete_config', { name });
    return {
      message: '删除透明度配置成功'
    };
  },

  applyTransparency: (transparencyConfig) => {
    const normalized = normalizeTransparency(transparencyConfig);
    const convertToOpacity = (value) => value / 100;

    const root = document.documentElement;
    root.style.setProperty('--transparency-cards', convertToOpacity(normalized.cards));
    root.style.setProperty('--transparency-sidebar', convertToOpacity(normalized.sidebar));
    root.style.setProperty('--transparency-app-bar', convertToOpacity(normalized.appBar));

    writeJson(CURRENT_TRANSPARENCY_KEY, normalized);

    invoke('pdh_transparency_set_current', {
      transparency: toTauriTransparency(normalized)
    }).catch(() => {
      // ignore
    });
  },

  getStoredTransparency: () => readCurrentFromLocalStorage(),

  clearTransparency: () => {
    const root = document.documentElement;
    root.style.removeProperty('--transparency-cards');
    root.style.removeProperty('--transparency-sidebar');
    root.style.removeProperty('--transparency-app-bar');

    localStorage.removeItem(CURRENT_TRANSPARENCY_KEY);

    invoke('pdh_transparency_clear_current').catch(() => {
      // ignore
    });
  }
};

export default transparencyService;
