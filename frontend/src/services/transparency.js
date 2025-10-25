import apiClient from './apiClient';

/**
 * 透明度配置服务
 */
const transparencyService = {
  /**
   * 获取所有透明度配置
   * @returns {Promise} 返回所有透明度配置列表
   */
  getAllConfigs: async () => {
    const response = await apiClient.get('/transparency');
    return response.data;
  },

  /**
   * 获取特定透明度配置
   * @param {string} configName - 配置名称
   * @returns {Promise} 返回指定的透明度配置
   */
  getConfigByName: async (configName) => {
    const response = await apiClient.get(`/transparency/${configName}`);
    return response.data;
  },

  /**
   * 保存透明度配置
   * @param {string} configName - 配置名称
   * @param {Object} configData - 配置数据
   * @param {string} configData.name - 配置显示名称
   * @param {string} configData.description - 配置描述
   * @param {Object} configData.transparency - 透明度配置
   * @param {number} configData.transparency.cards - 卡片透明度 (0-100)
   * @param {number} configData.transparency.sidebar - 侧边栏透明度 (0-100)
   * @param {number} configData.transparency.appBar - 顶部导航栏透明度 (0-100)
   * @returns {Promise} 返回保存结果
   */
  saveConfig: async (configName, configData) => {
    const response = await apiClient.put(`/transparency/${configName}`, configData);
    return response.data;
  },

  /**
   * 删除透明度配置
   * @param {string} configName - 配置名称
   * @returns {Promise} 返回删除结果
   */
  deleteConfig: async (configName) => {
    const response = await apiClient.delete(`/transparency/${configName}`);
    return response.data;
  },

  /**
   * 应用透明度配置到当前会话
   * @param {Object} transparencyConfig - 透明度配置对象
   * @param {number} transparencyConfig.cards - 卡片透明度 (0-100)
   * @param {number} transparencyConfig.sidebar - 侧边栏透明度 (0-100)
   * @param {number} transparencyConfig.appBar - 顶部导航栏透明度 (0-100)
   */
  applyTransparency: (transparencyConfig) => {
    // 将百分比透明度转换为CSS opacity值
    const convertToOpacity = (value) => {
      return value !== undefined ? value / 100 : 1;
    };

    // 应用到CSS变量
    const root = document.documentElement;
    if (transparencyConfig.cards !== undefined) {
      root.style.setProperty('--transparency-cards', convertToOpacity(transparencyConfig.cards));
    }
    if (transparencyConfig.sidebar !== undefined) {
      root.style.setProperty('--transparency-sidebar', convertToOpacity(transparencyConfig.sidebar));
    }
    if (transparencyConfig.appBar !== undefined) {
      root.style.setProperty('--transparency-app-bar', convertToOpacity(transparencyConfig.appBar));
    }

    // 保存到localStorage以便页面刷新后恢复
    localStorage.setItem('currentTransparency', JSON.stringify(transparencyConfig));
  },

  /**
   * 从localStorage恢复透明度配置
   * @returns {Object|null} 返回保存的透明度配置或null
   */
  getStoredTransparency: () => {
    try {
      const stored = localStorage.getItem('currentTransparency');
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('恢复透明度配置失败:', error);
      return null;
    }
  },

  /**
   * 清除当前应用的透明度配置
   */
  clearTransparency: () => {
    const root = document.documentElement;
    root.style.removeProperty('--transparency-cards');
    root.style.removeProperty('--transparency-sidebar');
    root.style.removeProperty('--transparency-app-bar');
    localStorage.removeItem('currentTransparency');
  }
};

export default transparencyService;