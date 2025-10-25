/**
 * 壁纸数据模型
 * 定义壁纸的数据结构和数据库操作
 */

const mongoose = require('mongoose');

/**
 * 壁纸Schema定义
 */
const wallpaperSchema = new mongoose.Schema({
  // 用户ID，关联到用户表
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  // 原始文件名
  originalName: {
    type: String,
    required: true,
    trim: true
  },
  // 文件存储路径
  filePath: {
    type: String,
    required: true
  },
  // 文件访问URL
  url: {
    type: String,
    required: true
  },
  // MIME类型
  mimeType: {
    type: String,
    required: true
  },
  // 文件扩展名
  extension: {
    type: String,
    required: true
  },
  // 文件大小（字节）
  size: {
    type: Number,
    required: true
  },
  // 文件哈希值，用于去重和完整性检查
  hash: {
    type: String,
    required: true,
    index: true
  },
  // 是否为当前使用的壁纸
  isCurrent: {
    type: Boolean,
    default: false,
    index: true
  },
  // 文件描述
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  // 上传时间
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  // 最后使用时间
  lastUsedAt: {
    type: Date
  }
}, {
  // 启用时间戳
  timestamps: true,
  // 指定集合名称
  collection: 'wallpapers'
});

// 创建复合索引，提高查询性能
wallpaperSchema.index({ userId: 1, isCurrent: 1 });
wallpaperSchema.index({ userId: 1, createdAt: -1 });

/**
 * 实例方法：设置为当前壁纸
 * @param {Date} lastUsedAt - 最后使用时间
 */
wallpaperSchema.methods.setAsCurrent = function(lastUsedAt = new Date()) {
  // 先将该用户的所有其他壁纸设置为非当前
  return this.constructor.updateMany(
    { userId: this.userId, _id: { $ne: this._id } },
    { isCurrent: false }
  ).then(() => {
    // 设置当前壁纸为当前使用
    this.isCurrent = true;
    this.lastUsedAt = lastUsedAt;
    return this.save();
  });
};

/**
 * 静态方法：获取用户的当前壁纸
 * @param {String} userId - 用户ID
 */
wallpaperSchema.statics.getCurrentWallpaper = function(userId) {
  return this.findOne({ userId, isCurrent: true });
};

/**
 * 静态方法：获取用户的所有壁纸
 * @param {String} userId - 用户ID
 * @param {Object} options - 查询选项
 */
wallpaperSchema.statics.getUserWallpapers = function(userId, options = {}) {
  const {
    page = 1,
    limit = 20,
    sort = '-createdAt'
  } = options;
  
  const query = { userId };
  
  return this.find(query)
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(limit);
};

/**
 * 静态方法：根据哈希查找壁纸
 * @param {String} userId - 用户ID
 * @param {String} hash - 文件哈希值
 */
wallpaperSchema.statics.findByHash = function(userId, hash) {
  return this.findOne({ userId, hash });
};

/**
 * 静态方法：删除壁纸及其文件
 * @param {String} wallpaperId - 壁纸ID
 */
wallpaperSchema.statics.deleteWallpaper = function(wallpaperId) {
  const fs = require('fs').promises;
  const path = require('path');
  
  return this.findById(wallpaperId).then(wallpaper => {
    if (!wallpaper) {
      throw new Error('壁纸不存在');
    }
    
    // 删除文件
    return fs.unlink(wallpaper.filePath)
      .catch(err => {
        // 文件可能已经不存在，记录但不抛出错误
        console.warn(`删除壁纸文件失败: ${wallpaper.filePath}`, err);
      })
      .then(() => {
        // 删除数据库记录
        return this.findByIdAndDelete(wallpaperId);
      });
  });
};

/**
 * 静态方法：获取壁纸统计信息
 * @param {String} userId - 用户ID
 */
wallpaperSchema.statics.getWallpaperStats = function(userId) {
  return this.aggregate([
    { $match: { userId: mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        totalWallpapers: { $sum: 1 },
        totalSize: { $sum: '$size' },
        avgSize: { $avg: '$size' },
        currentWallpaper: { $sum: { $cond: ['$isCurrent', 1, 0] } }
      }
    }
  ]).then(results => results[0] || {
    totalWallpapers: 0,
    totalSize: 0,
    avgSize: 0,
    currentWallpaper: 0
  });
};

// 导出模型
const Wallpaper = mongoose.model('Wallpaper', wallpaperSchema);

module.exports = Wallpaper;