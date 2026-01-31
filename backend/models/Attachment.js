/**
 * 附件数据模型
 * 定义附件在MongoDB中的数据结构和验证规则
 */

const mongoose = require('mongoose');
const config = require('../config/config');

/**
 * 附件Schema定义
 * 包含文件基本信息、存储路径、哈希值等字段
 */
const attachmentSchema = new mongoose.Schema(
  {
    // 附件类别，必填字段
    category: {
      type: String,
      required: [true, '附件类别是必填项'],
      enum: {
        values: ['image', 'video', 'document', 'script'], // 支持图片、视频、文档、程序与脚本
        message: '不支持的附件类别'
      },
      default: 'image'
    },
    
    // 原始文件名，必填字段
    originalName: {
      type: String,
      required: [true, '原始文件名是必填项'],
      trim: true,
      maxlength: [255, '文件名不能超过255个字符']
    },
    
    // MIME类型，必填字段
    mimeType: {
      type: String,
      required: [true, 'MIME类型是必填项'],
      trim: true
    },
    
    // 文件扩展名，必填字段
    extension: {
      type: String,
      required: [true, '文件扩展名是必填项'],
      trim: true,
      maxlength: [10, '扩展名不能超过10个字符']
    },
    
    // 文件大小（字节），必填字段
    size: {
      type: Number,
      required: [true, '文件大小是必填项'],
      min: [0, '文件大小不能为负数']
    },
    
    // 磁盘存储文件名，必填字段
    diskFilename: {
      type: String,
      required: [true, '磁盘文件名是必填项'],
      trim: true,
      unique: true
    },
    
    // 相对存储目录，必填字段
    relativeDir: {
      type: String,
      required: [true, '相对存储目录是必填项'],
      trim: true,
      default: 'images'
    },
    
    // 文件内容哈希值（SHA-256），必填字段
    hash: {
      type: String,
      required: [true, '文件哈希值是必填项'],
      trim: true
    },
    
    // 附件状态，必填字段
    status: {
      type: String,
      required: true,
      enum: {
        values: ['active', 'deleted'],
        message: '不支持的附件状态'
      },
      default: 'active'
    },
    
    // 内容描述，可选字段
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [20000, '内容描述不能超过20000个字符']
    },
  },
  {
    // 指定集合名称，从环境变量读取，默认为attachments
    collection: config.mongo.collections.attachments,
    
    // 启用时间戳，自动管理createdAt和updatedAt字段
    timestamps: true,
    
    // 添加虚拟字段和实例方法
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// 创建索引以提高查询性能
attachmentSchema.index({ category: 1 }); // 类别索引
attachmentSchema.index({ hash: 1 }); // 哈希索引
attachmentSchema.index({ status: 1 }); // 状态索引
attachmentSchema.index({ createdAt: -1 }); // 按创建时间降序索引
attachmentSchema.index({ updatedAt: -1 }); // 按更新时间降序索引

/**
 * 虚拟字段：文件访问URL
 * 返回附件的访问URL
 */
attachmentSchema.virtual('url').get(function() {
  return `/api/attachments/${this._id}`;
});

/**
 * 实例方法：更新附件状态
 * @param {String} status - 新状态
 * @returns {Promise} 更新后的附件
 */
attachmentSchema.methods.updateStatus = function(status) {
  this.status = status;
  return this.save();
};

/**
 * 静态方法：按哈希查找附件
 * @param {String} hash - 文件哈希值
 * @returns {Promise} 匹配的附件
 */
attachmentSchema.statics.findByHash = function(hash) {
  return this.findOne({ 
    hash: hash,
    status: 'active'
  });
};

/**
 * 静态方法：按类别查找附件
 * @param {String} category - 附件类别
 * @param {Object} options - 查询选项
 * @returns {Promise} 匹配的附件数组
 */
attachmentSchema.statics.findByCategory = function(category, options = {}) {
  const {
    page = 1,
    limit = 20,
    sort = '-createdAt'
  } = options;
  
  const skip = (page - 1) * limit;
  
  return this.find({ 
    category: category,
    status: 'active'
  })
  .sort(sort)
  .skip(skip)
  .limit(limit)
  .exec();
};

/**
 * 静态方法：搜索附件
 * @param {String} searchTerm - 搜索关键词
 * @param {Object} options - 查询选项
 * @returns {Promise} 匹配的附件数组
 */
attachmentSchema.statics.searchAttachments = function(searchTerm, options = {}) {
  const {
    page = 1,
    limit = 20,
    sort = '-createdAt'
  } = options;
  
  const skip = (page - 1) * limit;
  
  // 构建搜索条件，匹配原始文件名
  const searchConditions = [
    { originalName: { $regex: searchTerm, $options: 'i' } }
  ];
  
  return this.find({
    $and: [
      { $or: searchConditions },
      { status: 'active' }
    ]
  })
  .sort(sort)
  .skip(skip)
  .limit(limit)
  .exec();
};

/**
 * 导出附件模型
 */
const Attachment = mongoose.model('Attachment', attachmentSchema);

module.exports = Attachment;
