/**
 * 文档数据模型
 * 定义文档在MongoDB中的数据结构和验证规则
 */

const mongoose = require('mongoose');
const config = require('../config/config');

/**
 * 文档Schema定义
 * 包含标题、内容、标签、创建时间等字段
 */
const documentSchema = new mongoose.Schema(
  {
    // 文档标题，必填字段
    title: {
      type: String,
      required: [true, '文档标题是必填项'],
      trim: true,
      maxlength: [100, '标题不能超过100个字符']
    },
    
    // 文档内容，可选字段
    content: {
      type: String,
      required: false,
      trim: true
    },
    
    // HTML内容，可选字段
    htmlContent: {
      type: String,
      required: false,
      trim: true
    },
    
    // 文档标签数组，可选字段
    tags: [{
      type: String,
      trim: true,
      maxlength: [50, '标签不能超过50个字符']
    }],
    
    // 文档来源，可选字段
    source: {
      type: String,
      trim: true,
      maxlength: [100, '来源不能超过100个字符']
    },
    
    // 此笔记引用的笔记ID数组，可选字段
    referencedDocumentIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document'
    }],
    
    // 引用的附件ID数组，可选字段（允许为空，支持附件删除后笔记保留）
    referencedAttachmentIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Attachment',
      default: []
    }],
    
    // 引用的收藏夹ID数组，可选字段（允许为空，支持收藏夹删除后笔记保留）
    referencedQuoteIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quote',
      default: []
    }],
  },
  {
    // 指定集合名称，从环境变量读取，默认为documents
    collection: config.mongo.collections.documents,
    
    // 启用时间戳，自动管理createdAt和updatedAt字段
    timestamps: true,
    
    // 添加虚拟字段和实例方法
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// 创建索引以提高查询性能
documentSchema.index({ title: 'text', content: 'text' }); // 全文搜索索引
documentSchema.index({ tags: 1 }); // 标签索引
documentSchema.index({ createdAt: -1 }); // 按创建时间降序索引
documentSchema.index({ updatedAt: -1 }); // 按更新时间降序索引（用于搜索排序）
documentSchema.index({ referencedDocumentIds: 1 }); // 引用文档ID索引
documentSchema.index({ referencedAttachmentIds: 1 }); // 引用附件ID索引
documentSchema.index({ referencedQuoteIds: 1 }); // 引用收藏夹ID索引

/**
 * 虚拟字段：文档摘要
 * 返回内容的前100个字符作为摘要
 */
documentSchema.virtual('summary').get(function() {
  if (!this.content) return '';
  return this.content.length > 100 
    ? this.content.substring(0, 100) + '...' 
    : this.content;
});

/**
 * 虚拟字段：引用此笔记的收藏夹
 * 通过查询收藏夹模型获取所有引用此笔记的收藏夹
 */
documentSchema.virtual('referencingQuotes', {
  ref: 'Quote',
  localField: '_id',
  foreignField: 'referencedDocumentIds'
});

/**
 * 实例方法：更新文档
 * @param {Object} updateData - 要更新的数据
 * @returns {Promise} 更新后的文档
 */
documentSchema.methods.updateDocument = function(updateData) {
  Object.assign(this, updateData);
  return this.save();
};

/**
 * 静态方法：按标签查找文档
 * @param {Array} tags - 标签数组
 * @returns {Promise} 匹配的文档数组
 */
documentSchema.statics.findByTags = function(tags) {
  return this.find({ 
    tags: { 
      $in: tags 
    } 
  }).sort({ createdAt: -1 });
};

/**
 * 静态方法：搜索文档
 * @param {String} searchTerm - 搜索关键词
 * @param {Object} options - 查询选项
 * @param {Number} options.page - 页码（默认1）
 * @param {Number} options.limit - 每页数量（默认20）
 * @param {String} options.sort - 排序字段（默认'-updatedAt'）
 * @returns {Promise} 匹配的文档数组和分页信息
 */
documentSchema.statics.searchDocuments = function(searchTerm, options = {}) {
  const {
    page = 1,
    limit = 20,
    sort = '-updatedAt'
  } = options;
  
  // 计算跳过的文档数量
  const skip = (page - 1) * limit;
  
  // 构建搜索条件，匹配标题、内容、标签和来源
  const searchConditions = [
    { title: { $regex: searchTerm, $options: 'i' } },
    { content: { $regex: searchTerm, $options: 'i' } },
    { tags: { $regex: searchTerm, $options: 'i' } },
    { source: { $regex: searchTerm, $options: 'i' } }
  ];
  
  // 构建查询
  const query = this.find({
    $or: searchConditions
  })
  .sort(sort)
  .skip(skip)
  .limit(limit);
  
  return query.exec();
};

// 中间件：保存前更新时间戳
/**
 * 导出文档模型
 */
const Document = mongoose.model('Document', documentSchema);

module.exports = Document;
