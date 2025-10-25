/**
 * 主题颜色控制器层
 * 处理主题颜色相关的HTTP请求和响应
 */

const themeColorService = require('../services/themeColorService');
const Wallpaper = require('../models/Wallpaper');

/**
 * 主题颜色控制器类
 */
class ThemeColorController {
  /**
   * 获取用户的当前主题颜色
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   * @param {Function} next - Express下一个中间件函数
   */
  async getCurrentThemeColors(req, res, next) {
    try {
      const userId = req.user.id;
      
      const themeColors = await themeColorService.getCurrentThemeColors(userId);

      // 返回成功响应
      res.status(200).json({
        success: true,
        data: themeColors,
        message: themeColors ? '获取当前主题颜色成功' : '未找到主题颜色'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 重新生成主题颜色
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   * @param {Function} next - Express下一个中间件函数
   */
  async regenerateThemeColors(req, res, next) {
    try {
      const userId = req.user.id;
      const { wallpaperId } = req.body;

      let targetWallpaperId = wallpaperId;
      
      // 如果没有指定壁纸ID，使用当前壁纸
      if (!targetWallpaperId) {
        const currentWallpaper = await Wallpaper.getCurrentWallpaper(userId);
        if (!currentWallpaper) {
          return res.status(404).json({
            success: false,
            message: '未设置当前壁纸，请先设置壁纸或指定壁纸ID'
          });
        }
        targetWallpaperId = currentWallpaper._id;
      }

      // 验证壁纸是否存在且属于当前用户
      const wallpaper = await Wallpaper.findOne({ _id: targetWallpaperId, userId });
      if (!wallpaper) {
        return res.status(404).json({
          success: false,
          message: '壁纸不存在或无权访问'
        });
      }

      // 生成主题颜色
      const themeColors = await themeColorService.generateThemeFromWallpaper(
        targetWallpaperId, 
        userId
      );

      // 返回成功响应
      res.status(200).json({
        success: true,
        data: themeColors,
        message: '主题颜色生成成功'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取指定壁纸的主题颜色
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   * @param {Function} next - Express下一个中间件函数
   */
  async getWallpaperThemeColors(req, res, next) {
    try {
      const userId = req.user.id;
      const { wallpaperId } = req.params;

      // 验证壁纸是否存在且属于当前用户
      const wallpaper = await Wallpaper.findOne({ _id: wallpaperId, userId });
      if (!wallpaper) {
        return res.status(404).json({
          success: false,
          message: '壁纸不存在或无权访问'
        });
      }

      // 获取主题颜色
      const themeColors = await themeColorService.getWallpaperThemeColors(
        userId, 
        wallpaper.hash
      );

      // 返回成功响应
      res.status(200).json({
        success: true,
        data: themeColors,
        message: themeColors ? '获取壁纸主题颜色成功' : '未找到该壁纸的主题颜色'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 删除壁纸相关的主题颜色
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   * @param {Function} next - Express下一个中间件函数
   */
  async deleteWallpaperThemeColors(req, res, next) {
    try {
      const userId = req.user.id;
      const { wallpaperId } = req.params;

      // 验证壁纸是否存在且属于当前用户
      const wallpaper = await Wallpaper.findOne({ _id: wallpaperId, userId });
      if (!wallpaper) {
        return res.status(404).json({
          success: false,
          message: '壁纸不存在或无权访问'
        });
      }

      // 删除主题颜色文件
      const deleted = await themeColorService.deleteWallpaperThemeColors(
        userId, 
        wallpaper.hash
      );

      // 返回成功响应
      res.status(200).json({
        success: true,
        message: deleted ? '壁纸主题颜色删除成功' : '未找到要删除的主题颜色文件'
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ThemeColorController();