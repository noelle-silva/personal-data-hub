/**
 * 主题颜色服务
 * 处理与后端主题颜色API的交互
 */

import apiClient from './apiClient';

/**
 * 主题颜色服务类
 */
class ThemesService {
  /**
   * 获取用户的当前主题颜色
   * @returns {Promise<Object>} 主题颜色数据
   */
  async getCurrentColors() {
    try {
      const response = await apiClient.get('/themes/colors/current');
      // 解包后端响应，返回纯主题数据
      return response.data.data;
    } catch (error) {
      console.error('获取当前主题颜色失败:', error);
      throw error;
    }
  }

  /**
   * 重新生成主题颜色
   * @param {String} wallpaperId - 壁纸ID（可选）
   * @returns {Promise<Object>} 生成的主题颜色数据
   */
  async regenerateColors(wallpaperId = null) {
    try {
      const payload = wallpaperId ? { wallpaperId } : {};
      const response = await apiClient.post('/themes/colors/regenerate', payload);
      // 解包后端响应，返回纯主题数据
      return response.data.data;
    } catch (error) {
      console.error('重新生成主题颜色失败:', error);
      throw error;
    }
  }

  /**
   * 获取指定壁纸的主题颜色
   * @param {String} wallpaperId - 壁纸ID
   * @returns {Promise<Object>} 主题颜色数据
   */
  async getWallpaperColors(wallpaperId) {
    try {
      const response = await apiClient.get(`/themes/colors/by-wallpaper/${wallpaperId}`);
      // 解包后端响应，返回纯主题数据
      return response.data.data;
    } catch (error) {
      console.error('获取壁纸主题颜色失败:', error);
      throw error;
    }
  }

  /**
   * 删除壁纸相关的主题颜色
   * @param {String} wallpaperId - 壁纸ID
   * @returns {Promise<Object>} 删除结果
   */
  async deleteWallpaperColors(wallpaperId) {
    try {
      const response = await apiClient.delete(`/themes/colors/by-wallpaper/${wallpaperId}`);
      return response.data;
    } catch (error) {
      console.error('删除壁纸主题颜色失败:', error);
      throw error;
    }
  }

  /**
   * 检查主题颜色数据是否有效
   * @param {Object} themeData - 主题颜色数据
   * @returns {Boolean} 是否有效
   */
  isValidThemeData(themeData) {
    return (
      themeData &&
      themeData.sourceColor &&
      themeData.variants &&
      themeData.schemes &&
      themeData.wallpaper
    );
  }

  /**
   * 获取可用的主题变体列表
   * @returns {Array<String>} 变体列表
   */
  getAvailableVariants() {
    return ['tonalSpot', 'vibrant', 'expressive', 'fidelity', 'muted'];
  }

  /**
   * 获取变体的显示名称
   * @param {String} variant - 变体标识符
   * @returns {String} 显示名称
   */
  getVariantDisplayName(variant) {
    const variantNames = {
      tonalSpot: '柔和色调',
      vibrant: '鲜艳活力',
      expressive: '表现力强',
      fidelity: '忠实原色',
      muted: '低饱和柔和'
    };
    return variantNames[variant] || variant;
  }
}

// 创建单例实例
const themesService = new ThemesService();

export default themesService;