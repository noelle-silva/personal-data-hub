import { invoke, isTauri } from './tauriBridge';

const nowIso = () => new Date().toISOString();

const ensureDesktop = () => {
  if (!isTauri()) {
    throw new Error('当前仅支持桌面端本地数据目录');
  }
};

const readFileAsDataUrl = (file) => {
  if (!(file instanceof File)) {
    throw new Error('请选择有效的图片文件');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('读取图片文件失败'));
    reader.readAsDataURL(file);
  });
};

const normalizeWallpaper = (wallpaper) => {
  if (!wallpaper || typeof wallpaper !== 'object') return wallpaper;
  const mappedId = typeof wallpaper._id === 'string' ? wallpaper._id : String(wallpaper.id || '');

  return {
    ...wallpaper,
    _id: mappedId,
    id: mappedId,
    originalName: wallpaper.originalName || wallpaper.original_name || '',
    mimeType: wallpaper.mimeType || wallpaper.mime_type || '',
    createdAt: wallpaper.createdAt || wallpaper.created_at || '',
    updatedAt: wallpaper.updatedAt || wallpaper.updated_at || '',
    source: wallpaper.source || 'local'
  };
};

const localWallpaperStorage = {
  async listWallpapers() {
    ensureDesktop();
    const wallpapers = await invoke('pdh_wallpapers_list');
    return (Array.isArray(wallpapers) ? wallpapers : []).map(normalizeWallpaper);
  },

  async getCurrentWallpaper() {
    ensureDesktop();
    const current = await invoke('pdh_wallpapers_get_current');
    return normalizeWallpaper(current);
  },

  async createWallpaper(file, description = '') {
    ensureDesktop();
    const url = await readFileAsDataUrl(file);
    const created = await invoke('pdh_wallpapers_create', {
      originalName: file.name,
      dataUrl: url,
      mimeType: file.type || 'image/*',
      size: file.size || 0,
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
      currentWallpaper: normalizeWallpaper(result?.currentWallpaper || null)
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
