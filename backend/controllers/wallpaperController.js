/**
 * 壁纸控制器层
 * 处理HTTP请求和响应，调用服务层方法处理业务逻辑
 */

const wallpaperService = require('../services/wallpaperService');
const fs = require('fs');

/**
 * 壁纸控制器类
 */
class WallpaperController {
  /**
   * 上传壁纸
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   * @param {Function} next - Express下一个中间件函数
   */
  async uploadWallpaper(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: '请选择要上传的壁纸文件'
        });
      }

      // 修正文件名编码：multer将UTF-8编码的文件名错误地按latin1解码，需要转回UTF-8
      if (req.file.originalname) {
        req.file.originalname = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
      }

      const userId = req.user.id;
      const { description } = req.body;

      const wallpaper = await wallpaperService.processUploadedWallpaper(
        req.file, 
        userId, 
        { description }
      );

      // 返回创建成功响应
      res.status(201).json({
        success: true,
        data: {
          _id: wallpaper._id,
          originalName: wallpaper.originalName,
          url: wallpaper.url,
          mimeType: wallpaper.mimeType,
          size: wallpaper.size,
          hash: wallpaper.hash,
          isCurrent: wallpaper.isCurrent,
          description: wallpaper.description,
          createdAt: wallpaper.createdAt
        },
        message: '壁纸上传成功'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取用户的壁纸列表
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   * @param {Function} next - Express下一个中间件函数
   */
  async getWallpapers(req, res, next) {
    try {
      const userId = req.user.id;
      const options = {
        page: req.query.page ? parseInt(req.query.page) : 1,
        limit: req.query.limit ? parseInt(req.query.limit) : 20,
        sort: req.query.sort || '-createdAt'
      };

      const result = await wallpaperService.getUserWallpapers(userId, options);

      // 返回成功响应
      res.status(200).json({
        success: true,
        data: result.wallpapers,
        pagination: result.pagination,
        message: '获取壁纸列表成功'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取当前壁纸
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   * @param {Function} next - Express下一个中间件函数
   */
  async getCurrentWallpaper(req, res, next) {
    try {
      const userId = req.user.id;
      
      const wallpaper = await wallpaperService.getCurrentWallpaper(userId);

      // 返回成功响应
      res.status(200).json({
        success: true,
        data: wallpaper,
        message: wallpaper ? '获取当前壁纸成功' : '未设置当前壁纸'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 设置当前壁纸
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   * @param {Function} next - Express下一个中间件函数
   */
  async setCurrentWallpaper(req, res, next) {
    try {
      const userId = req.user.id;
      const { wallpaperId } = req.params;

      const wallpaper = await wallpaperService.setCurrentWallpaper(userId, wallpaperId);

      // 返回成功响应
      res.status(200).json({
        success: true,
        data: wallpaper,
        message: '设置当前壁纸成功'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 删除壁纸
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   * @param {Function} next - Express下一个中间件函数
   */
  async deleteWallpaper(req, res, next) {
    try {
      const userId = req.user.id;
      const { wallpaperId } = req.params;

      await wallpaperService.deleteWallpaper(userId, wallpaperId);

      // 返回删除成功响应
      res.status(200).json({
        success: true,
        message: '壁纸删除成功'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取壁纸文件
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   * @param {Function} next - Express下一个中间件函数
   */
  async getWallpaperFile(req, res, next) {
    try {
      const { filename } = req.params;
      
      const fileInfo = await wallpaperService.getWallpaperFile(filename);
      
      if (!fileInfo.exists) {
        return res.status(404).json({
          success: false,
          message: '壁纸文件不存在'
        });
      }

      // 设置响应头
      res.set({
        'Content-Type': 'image/jpeg',
        'Content-Length': fileInfo.size,
        'Last-Modified': fileInfo.mtime.toUTCString(),
        'Cache-Control': 'public, max-age=86400', // 缓存1天
        'Access-Control-Allow-Origin': '*'
      });

      // 检查If-Modified-Since头
      const ifModifiedSince = req.headers['if-modified-since'];
      if (ifModifiedSince) {
        const lastModified = new Date(ifModifiedSince);
        if (fileInfo.mtime <= lastModified) {
          return res.status(304).end();
        }
      }

      // 创建文件流并发送
      const fileStream = fs.createReadStream(fileInfo.filePath);
      
      // 处理流错误
      fileStream.on('error', (error) => {
        console.error('读取壁纸文件失败:', error);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            message: '文件读取失败'
          });
        }
      });

      // 发送文件
      fileStream.pipe(res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 更新壁纸描述
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   * @param {Function} next - Express下一个中间件函数
   */
  async updateWallpaperDescription(req, res, next) {
    try {
      const userId = req.user.id;
      const { wallpaperId } = req.params;
      const { description } = req.body;

      const wallpaper = await wallpaperService.updateWallpaperDescription(
        userId, 
        wallpaperId, 
        description
      );

      // 返回成功响应
      res.status(200).json({
        success: true,
        data: wallpaper,
        message: '更新壁纸描述成功'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取壁纸统计信息
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   * @param {Function} next - Express下一个中间件函数
   */
  async getWallpaperStats(req, res, next) {
    try {
      const userId = req.user.id;
      
      const stats = await wallpaperService.getWallpaperStats(userId);

      // 返回统计信息
      res.status(200).json({
        success: true,
        data: stats,
        message: '获取壁纸统计信息成功'
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new WallpaperController();