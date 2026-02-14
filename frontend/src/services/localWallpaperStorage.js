import { invoke, isTauri, convertFileSrc } from './tauriBridge';

const nowIso = () => new Date().toISOString();

const ensureDesktop = () => {
  if (!isTauri()) {
    throw new Error('当前仅支持桌面端本地数据目录');
  }
};

const readFileAsBytes = async (file) => {
  if (!(file instanceof File)) {
    throw new Error('请选择有效的图片文件');
  }

  try {
    const buffer = await file.arrayBuffer();
    return Array.from(new Uint8Array(buffer));
  } catch (error) {
    throw error || new Error('读取图片文件失败');
  }
};

const resolveWallpaperUrl = async (url) => {
  if (typeof url !== 'string') return url;
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/^(data:|blob:|https?:)/i.test(trimmed)) return trimmed;
  if (!isTauri()) return trimmed;

  try {
    return await convertFileSrc(trimmed);
  } catch (_) {
    return trimmed;
  }
};

const normalizeWallpaper = async (wallpaper) => {
  if (!wallpaper || typeof wallpaper !== 'object') return wallpaper;
  const mappedId = typeof wallpaper._id === 'string' ? wallpaper._id : String(wallpaper.id || '');
  const rawUrl = wallpaper.url || '';

  return {
    ...wallpaper,
    _id: mappedId,
    id: mappedId,
    originalName: wallpaper.originalName || wallpaper.original_name || '',
    mimeType: wallpaper.mimeType || wallpaper.mime_type || '',
    createdAt: wallpaper.createdAt || wallpaper.created_at || '',
    updatedAt: wallpaper.updatedAt || wallpaper.updated_at || '',
    source: wallpaper.source || 'local',
    filePath: rawUrl,
    url: await resolveWallpaperUrl(rawUrl),
  };
};

const localWallpaperStorage = {
  async listWallpapers() {
    ensureDesktop();
    const wallpapers = await invoke('pdh_wallpapers_list');
    const list = Array.isArray(wallpapers) ? wallpapers : [];
    return Promise.all(list.map((item) => normalizeWallpaper(item)));
  },

  async getCurrentWallpaper() {
    ensureDesktop();
    const current = await invoke('pdh_wallpapers_get_current');
    return normalizeWallpaper(current);
  },

  async createWallpaper(file, description = '') {
    ensureDesktop();
    const bytes = await readFileAsBytes(file);
    const created = await invoke('pdh_wallpapers_create', {
      originalName: file.name,
      bytes,
      mimeType: file.type || 'image/*',
      description: String(description || '').trim(),
      createdAt: nowIso(),
      updatedAt: nowIso()
    });

    return normalizeWallpaper(created);
  },

  async setCurrentWallpaper(wallpaperId) {
    ensureDesktop();
    const current = await invoke('pdh_wallpapers_set_current', { id: wallpaperId });
    return normalizeWallpaper(current);
  },

  async deleteWallpaper(wallpaperId) {
    ensureDesktop();
    const result = await invoke('pdh_wallpapers_delete', { id: wallpaperId });
    return {
      ...result,
      currentWallpaper: await normalizeWallpaper(result?.currentWallpaper || null)
    };
  },

  async updateDescription(wallpaperId, description = '') {
    ensureDesktop();
    const updated = await invoke('pdh_wallpapers_update_description', {
      id: wallpaperId,
      description: String(description || '').trim(),
      updatedAt: nowIso()
    });

    return normalizeWallpaper(updated);
  },

  async getStats() {
    ensureDesktop();
    return invoke('pdh_wallpapers_stats');
  }
};

export default localWallpaperStorage;
