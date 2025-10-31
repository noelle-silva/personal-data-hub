import { ShortcutMap, ShortcutExportData, Platform, ShortcutOptions } from './types';

// localStorage 键名
const STORAGE_KEY = 'shortcutSettings';

// 默认配置
const DEFAULT_OPTIONS: ShortcutOptions = {
  enabled: true,
  scopePolicy: {
    global: true,
    modal: true,
    'editor-safe': true,
    'input-safe': true,
  },
  shortcuts: {} as ShortcutMap,
};

/**
 * 获取当前平台
 */
export const getPlatform = (): Platform => {
  const userAgent = navigator.userAgent.toLowerCase();
  if (userAgent.includes('mac')) return 'mac';
  if (userAgent.includes('linux')) return 'linux';
  if (userAgent.includes('win')) return 'windows';
  return 'unknown';
};

/**
 * 从 localStorage 加载快捷键配置
 */
export const loadShortcutSettings = (): ShortcutOptions => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return DEFAULT_OPTIONS;
    }
    
    const parsed = JSON.parse(stored);
    // 合并默认配置，确保新增的字段存在
    return {
      ...DEFAULT_OPTIONS,
      ...parsed,
      scopePolicy: {
        ...DEFAULT_OPTIONS.scopePolicy,
        ...parsed.scopePolicy,
      },
      shortcuts: {
        ...DEFAULT_OPTIONS.shortcuts,
        ...parsed.shortcuts,
      },
    };
  } catch (error) {
    console.warn('加载快捷键设置失败，使用默认配置:', error);
    return DEFAULT_OPTIONS;
  }
};

/**
 * 保存快捷键配置到 localStorage
 */
export const saveShortcutSettings = (settings: ShortcutOptions): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('保存快捷键设置失败:', error);
  }
};

/**
 * 保存快捷键映射
 */
export const saveShortcutMap = (shortcuts: ShortcutMap): void => {
  const settings = loadShortcutSettings();
  settings.shortcuts = shortcuts;
  saveShortcutSettings(settings);
};

/**
 * 加载快捷键映射
 */
export const loadShortcutMap = (): ShortcutMap => {
  const settings = loadShortcutSettings();
  return settings.shortcuts;
};

/**
 * 导出快捷键配置
 */
export const exportShortcuts = (): ShortcutExportData => {
  const settings = loadShortcutSettings();
  return {
    version: '1.0.0',
    platform: getPlatform(),
    timestamp: new Date().toISOString(),
    shortcuts: settings.shortcuts,
  };
};

/**
 * 导入快捷键配置
 */
export const importShortcuts = (data: ShortcutExportData): boolean => {
  try {
    // 验证数据格式
    if (!data.version || !data.shortcuts) {
      throw new Error('无效的快捷键配置格式');
    }
    
    const settings = loadShortcutSettings();
    settings.shortcuts = data.shortcuts;
    saveShortcutSettings(settings);
    
    return true;
  } catch (error) {
    console.error('导入快捷键配置失败:', error);
    return false;
  }
};

/**
 * 重置为默认配置
 */
export const resetToDefaults = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('重置快捷键设置失败:', error);
  }
};

/**
 * 清除所有快捷键配置
 */
export const clearAllSettings = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('清除快捷键设置失败:', error);
  }
};