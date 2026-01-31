/**
 * 壁纸服务层
 * 处理壁纸相关的业务逻辑，包括上传、存储、获取等操作
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');
const config = require('../config/config');
const Wallpaper = require('../models/Wallpaper');
const themeColorService = require('./themeColorService');

/**
 * 壁纸服务类
 */
class WallpaperService {
  /**
   * 获取壁纸存储目录
   * @returns {String} 壁纸存储目录路径
   */
  static getWallpaperDir() {
    return path.join(__dirname, '../assets/themes/wallpapers');
  }

  /**
   * 确保壁纸存储目录存在
   */
  static async ensureWallpaperDir() {
    const wallpaperDir = this.getWallpaperDir();
    try {
      await fs.access(wallpaperDir);
    } catch (error) {
      // 目录不存在，创建目录
      await fs.mkdir(wallpaperDir, { recursive: true });
    }
  }

  /**
   * 生成唯一文件名
   * @param {String} originalName - 原始文件名
   * @param {String} userId - 用户ID
   * @returns {String} 唯一文件名
   */
  static generateUniqueFilename(originalName, userId) {
    const ext = path.extname(originalName);
    const timestamp = Date.now();
    const random = Math.round(Math.random() * 1E9);
    return `${userId}-${timestamp}-${random}${ext}`;
  }

  /**
   * 计算文件哈希值
   * @param {Buffer} buffer - 文件缓冲区
   * @returns {String} 文件哈希值
   */
  static calculateHash(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * 验证图片格式
   * @param {String} mimeType - MIME类型
   * @returns {Boolean} 是否为支持的格式
   */
  static isValidImageFormat(mimeType) {
    const allowedTypes = config.wallpapers.allowedTypes;
    return allowedTypes.includes(mimeType);
  }

  /**
   * 处理上传的壁纸文件
   * @param {Object} file - 上传的文件对象
   * @param {String} userId - 用户ID
   * @param {Object} options - 处理选项
   * @returns {Object} 壁纸对象
   */
  static async processUploadedWallpaper(file, userId, options = {}) {
    // 验证文件格式
    if (!this.isValidImageFormat(file.mimetype)) {
      throw new Error(`不支持的文件格式: ${file.mimetype}`);
    }

    // 计算文件哈希
    const hash = this.calculateHash(file.buffer);
    
    // 检查是否已存在相同哈希的文件
    const existingWallpaper = await Wallpaper.findByHash(userId, hash);
    if (existingWallpaper) {
      throw new Error('该壁纸已存在');
    }

    // 确保存储目录存在
    await this.ensureWallpaperDir();

    // 生成唯一文件名和路径
    const filename = this.generateUniqueFilename(file.originalname, userId);
    const filePath = path.join(this.getWallpaperDir(), filename);

    // 处理图片：调整大小和优化
    let processedBuffer = file.buffer;
    
    try {
      // 使用sharp处理图片
      processedBuffer = await sharp(file.buffer)
        .resize({
          width: options.maxWidth || 3840,  // 4K宽度
          height: options.maxHeight || 2160, // 4K高度
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: options.quality || 90 }) // 转换为JPEG格式以减小文件大小
        .toBuffer();
    } catch (error) {
      console.warn('图片处理失败，使用原始文件:', error);
      // 如果处理失败，使用原始文件
      processedBuffer = file.buffer;
    }

    // 保存文件到磁盘
    await fs.writeFile(filePath, processedBuffer);

    // 生成访问URL
    const url = `/api/themes/wallpapers/file/${filename}`;

    // 创建壁纸记录
    const wallpaper = new Wallpaper({
      userId,
      originalName: file.originalname,
      filePath,
      url,
      mimeType: 'image/jpeg', // 统一转换为JPEG格式
      extension: '.jpg',
      size: processedBuffer.length,
      hash,
      description: options.description || ''
    });

    // 保存到数据库
    await wallpaper.save();

    return wallpaper;
  }

  /**
   * 获取用户的壁纸列表
   * @param {String} userId - 用户ID
   * @param {Object} options - 查询选项
   * @returns {Object} 壁纸列表和分页信息
   */
  static async getUserWallpapers(userId, options = {}) {
    const {
      page = 1,
      limit = 20,
      sort = '-createdAt'
    } = options;

    const skip = (page - 1) * limit;
    
    // 获取总数
    const total = await Wallpaper.countDocuments({ userId });
    
    // 获取壁纸列表
    const wallpapers = await Wallpaper.find({ userId })
      .sort(sort)
      .skip(skip)
      .limit(limit);

    return {
      wallpapers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * 获取用户的当前壁纸
   * @param {String} userId - 用户ID
   * @returns {Object|null} 当前壁纸对象
   */
  static async getCurrentWallpaper(userId) {
    return await Wallpaper.getCurrentWallpaper(userId);
  }

  /**
   * 设置当前壁纸
   * @param {String} userId - 用户ID
   * @param {String} wallpaperId - 壁纸ID
   * @returns {Object} 更新后的壁纸对象
   */
  static async setCurrentWallpaper(userId, wallpaperId) {
    const wallpaper = await Wallpaper.findOne({ _id: wallpaperId, userId });
    if (!wallpaper) {
      throw new Error('壁纸不存在或无权访问');
    }

    await wallpaper.setAsCurrent();
    
    // 异步生成主题颜色，不阻塞壁纸设置流程
    setImmediate(async () => {
      try {
        await themeColorService.generateThemeFromWallpaper(wallpaperId, userId);
        console.log(`为用户 ${userId} 和壁纸 ${wallpaperId} 成功生成主题颜色`);
      } catch (error) {
        console.error(`生成主题颜色失败 (用户: ${userId}, 壁纸: ${wallpaperId}):`, error.message);
        // 不抛出错误，不影响壁纸设置流程
      }
    });
    
    return wallpaper;
  }

  /**
   * 删除壁纸
   * @param {String} userId - 用户ID
   * @param {String} wallpaperId - 壁纸ID
   * @returns {Boolean} 删除是否成功
   */
  static async deleteWallpaper(userId, wallpaperId) {
    const wallpaper = await Wallpaper.findOne({ _id: wallpaperId, userId });
    if (!wallpaper) {
      throw new Error('壁纸不存在或无权访问');
    }

    // 如果是当前壁纸，不允许删除
    if (wallpaper.isCurrent) {
      throw new Error('不能删除当前使用的壁纸');
    }

    await Wallpaper.deleteWallpaper(wallpaperId);
    return true;
  }

  /**
   * 获取壁纸文件
   * @param {String} filename - 文件名
   * @returns {Object} 文件信息和流
   */
  static async getWallpaperFile(filename) {
    const filePath = path.join(this.getWallpaperDir(), filename);
    
    try {
      await fs.access(filePath);
      const stats = await fs.stat(filePath);
      
      return {
        filePath,
        size: stats.size,
        mtime: stats.mtime,
        exists: true
      };
    } catch (error) {
      return {
        exists: false
      };
    }
  }

  /**
   * 更新壁纸描述
   * @param {String} userId - 用户ID
   * @param {String} wallpaperId - 壁纸ID
   * @param {String} description - 描述
   * @returns {Object} 更新后的壁纸对象
   */
  static async updateWallpaperDescription(userId, wallpaperId, description) {
    const wallpaper = await Wallpaper.findOne({ _id: wallpaperId, userId });
    if (!wallpaper) {
      throw new Error('壁纸不存在或无权访问');
    }

    wallpaper.description = description;
    await wallpaper.save();
    
    return wallpaper;
  }

  /**
   * 获取壁纸统计信息
   * @param {String} userId - 用户ID
   * @returns {Object} 统计信息
   */
  static async getWallpaperStats(userId) {
    return await Wallpaper.getWallpaperStats(userId);
  }
}

module.exports = WallpaperService;
