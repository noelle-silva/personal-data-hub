/**
 * 主题API路由
 * 定义壁纸相关的RESTful API端点
 */

const express = require('express');
const multer = require('multer');
const router = express.Router();
const WallpaperController = require('../controllers/wallpaperController');
const ThemeColorController = require('../controllers/themeColorController');
const requireAuth = require('../middlewares/requireAuth');
const config = require('../config/config');

/**
 * 配置multer用于壁纸上传
 */
const wallpaperStorage = multer.memoryStorage();

// 文件过滤器，只允许图片文件
const wallpaperFileFilter = (req, file, cb) => {
  // 检查MIME类型
  const allowedMimeTypes = config.wallpapers.allowedTypes;
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`不支持的文件类型: ${file.mimetype}。支持的格式: ${allowedMimeTypes.join(', ')}`), false);
  }
};

// 配置壁纸上传multer
const wallpaperUpload = multer({
  storage: wallpaperStorage,
  limits: {
    fileSize: config.wallpapers.maxSizeBytes,
    files: 1 // 一次只允许上传一个文件
  },
  fileFilter: wallpaperFileFilter
});

/**
 * @route   POST /api/themes/wallpapers
 * @desc    上传壁纸
 * @access  Private (需要JWT认证)
 * @body    file - 壁纸文件 (必填)
 * @body    description - 壁纸描述 (可选)
 */
router.post('/wallpapers', requireAuth, wallpaperUpload.single('file'), WallpaperController.uploadWallpaper);

/**
 * @route   GET /api/themes/wallpapers
 * @desc    获取用户的壁纸列表
 * @access  Private (需要JWT认证)
 * @query   page - 页码 (默认: 1)
 * @query   limit - 每页数量 (默认: 20)
 * @query   sort - 排序字段 (默认: -createdAt)
 */
router.get('/wallpapers', requireAuth, WallpaperController.getWallpapers);

/**
 * @route   GET /api/themes/wallpapers/current
 * @desc    获取当前壁纸
 * @access  Private (需要JWT认证)
 */
router.get('/wallpapers/current', requireAuth, WallpaperController.getCurrentWallpaper);

/**
 * @route   PUT /api/themes/wallpapers/current/:wallpaperId
 * @desc    设置当前壁纸
 * @access  Private (需要JWT认证)
 * @param   wallpaperId - 壁纸ID
 */
router.put('/wallpapers/current/:wallpaperId', requireAuth, WallpaperController.setCurrentWallpaper);

/**
 * @route   DELETE /api/themes/wallpapers/:wallpaperId
 * @desc    删除壁纸
 * @access  Private (需要JWT认证)
 * @param   wallpaperId - 壁纸ID
 */
router.delete('/wallpapers/:wallpaperId', requireAuth, WallpaperController.deleteWallpaper);

/**
 * @route   GET /api/themes/wallpapers/file/:filename
 * @desc    获取壁纸文件
 * @access  Public
 * @param   filename - 文件名
 */
router.get('/wallpapers/file/:filename', WallpaperController.getWallpaperFile);

/**
 * @route   PATCH /api/themes/wallpapers/:wallpaperId/description
 * @desc    更新壁纸描述
 * @access  Private (需要JWT认证)
 * @param   wallpaperId - 壁纸ID
 * @body    description - 壁纸描述
 */
router.patch('/wallpapers/:wallpaperId/description', requireAuth, WallpaperController.updateWallpaperDescription);

/**
 * @route   GET /api/themes/wallpapers/stats
 * @desc    获取壁纸统计信息
 * @access  Private (需要JWT认证)
 */
router.get('/wallpapers/stats', requireAuth, WallpaperController.getWallpaperStats);

/**
 * @route   GET /api/themes/colors/current
 * @desc    获取用户的当前主题颜色
 * @access  Private (需要JWT认证)
 */
router.get('/colors/current', requireAuth, ThemeColorController.getCurrentThemeColors);

/**
 * @route   POST /api/themes/colors/regenerate
 * @desc    重新生成主题颜色
 * @access  Private (需要JWT认证)
 * @body    wallpaperId - 壁纸ID (可选，默认使用当前壁纸)
 */
router.post('/colors/regenerate', requireAuth, ThemeColorController.regenerateThemeColors);

/**
 * @route   GET /api/themes/colors/by-wallpaper/:wallpaperId
 * @desc    获取指定壁纸的主题颜色
 * @access  Private (需要JWT认证)
 * @param   wallpaperId - 壁纸ID
 */
router.get('/colors/by-wallpaper/:wallpaperId', requireAuth, ThemeColorController.getWallpaperThemeColors);

/**
 * @route   DELETE /api/themes/colors/by-wallpaper/:wallpaperId
 * @desc    删除壁纸相关的主题颜色
 * @access  Private (需要JWT认证)
 * @param   wallpaperId - 壁纸ID
 */
router.delete('/colors/by-wallpaper/:wallpaperId', requireAuth, ThemeColorController.deleteWallpaperThemeColors);

module.exports = router;
