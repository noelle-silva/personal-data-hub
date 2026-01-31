/**
 * 引用体数据模型
 * 定义引用体在MongoDB中的数据结构和验证规则
 */

const mongoose = require('mongoose');
const config = require('../config/config');

/**
 * 引用体Schema定义
 * 包含标题、描述、内容、标签、引用的笔记ID等字段
 */
const quoteSchema = new mongoose.Schema(
  {
    // 引用体标题，必填字段
    title: {
      type: String,
      required: [true, '引用体标题是必填项'],
      trim: true,
      maxlength: [100, '标题不能超过100个字符']
    },
    
    // 引用体描述，可选字段
    description: {
      type: String,
      trim: true,
      maxlength: [300, '描述不能超过300个字符']
    },
    
    // 引用体内容，必填字段
    content: {
      type: String,
      required: [true, '引用体内容是必填项'],
      trim: true
    },
    
    // 引用体标签数组，可选字段
    tags: [{
      type: String,
      trim: true,
      maxlength: [50, '标签不能超过50个字符']
    }],
    
    // 引用的笔记ID数组，可选字段（允许为空，支持笔记删除后引用体保留）
    referencedDocumentIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document'
    }],
    
    // 引用的附件ID数组，可选字段（允许为空，支持附件删除后引用体保留）
    referencedAttachmentIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Attachment',
      default: []
    }],
    
    // 引用的引用体ID数组，可选字段（允许为空，支持引用体删除后引用体保留）
    referencedQuoteIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quote',
      default: []
    }],
    
    // 创建时间，自动设置为文档创建时的时间
    createdAt: {
      type: Date,
      default: Date.now,
      immutable: true
    },
    
    // 更新时间，每次文档更新时自动更新
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    // 指定集合名称，从环境变量读取，默认为quotes
    collection: config.mongo.collections.quotes,
    
    // 启用时间戳，自动管理createdAt和updatedAt字段
    timestamps: true,
    
    // 添加虚拟字段和实例方法
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// 创建索引以提高查询性能
quoteSchema.index({ title: 'text', description: 'text', content: 'text' }); // 全文搜索索引
quoteSchema.index({ tags: 1 }); // 标签索引
quoteSchema.index({ referencedDocumentIds: 1 }); // 引用文档ID索引
quoteSchema.index({ referencedAttachmentIds: 1 }); // 引用附件ID索引
quoteSchema.index({ referencedQuoteIds: 1 }); // 引用引用体ID索引
quoteSchema.index({ createdAt: -1 }); // 按创建时间降序索引
quoteSchema.index({ updatedAt: -1 }); // 按更新时间降序索引（用于搜索排序）

/**
 * 虚拟字段：引用体摘要
 * 返回内容的前100个字符作为摘要
 */
quoteSchema.virtual('summary').get(function() {
  if (!this.content) return '';
  return this.content.length > 100
    ? this.content.substring(0, 100) + '...'
    : this.content;
});

/**
 * 虚拟字段：引用此引用体的引用体
 * 通过查询引用体模型获取所有引用此引用体的引用体
 */
quoteSchema.virtual('referencingQuotes', {
  ref: 'Quote',
  localField: '_id',
  foreignField: 'referencedQuoteIds'
});

/**
 * 实例方法：更新引用体
 * @param {Object} updateData - 要更新的数据
 * @returns {Promise} 更新后的引用体
 */
quoteSchema.methods.updateQuote = function(updateData) {
  Object.assign(this, updateData);
  this.updatedAt = new Date();
  return this.save();
};

/**
 * 静态方法：按标签查找引用体
 * @param {Array} tags - 标签数组
 * @returns {Promise} 匹配的引用体数组
 */
quoteSchema.statics.findByTags = function(tags) {
  return this.find({ 
    tags: { 
      $in: tags 
    } 
  }).sort({ createdAt: -1 });
};

/**
 * 静态方法：搜索引用体
 * @param {String} searchTerm - 搜索关键词
 * @param {Object} options - 查询选项
 * @param {Number} options.page - 页码（默认1）
 * @param {Number} options.limit - 每页数量（默认20）
 * @param {String} options.sort - 排序字段（默认'-updatedAt'）
 * @returns {Promise} 匹配的引用体数组和分页信息
 */
quoteSchema.statics.searchQuotes = function(searchTerm, options = {}) {
  const {
    page = 1,
    limit = 20,
    sort = '-updatedAt'
  } = options;
  
  // 计算跳过的引用体数量
  const skip = (page - 1) * limit;
  
  // 构建搜索条件，匹配标题、描述、内容和标签
  const searchConditions = [
    { title: { $regex: searchTerm, $options: 'i' } },
    { description: { $regex: searchTerm, $options: 'i' } },
    { content: { $regex: searchTerm, $options: 'i' } },
    { tags: { $regex: searchTerm, $options: 'i' } }
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

/**
 * 静态方法：按引用的文档ID查找引用体
 * @param {String} documentId - 文档ID
 * @returns {Promise} 匹配的引用体数组
 */
quoteSchema.statics.findByReferencedDocument = function(documentId) {
  return this.find({
    referencedDocumentIds: documentId
  }).sort({ updatedAt: -1 });
};

// 中间件：保存前更新时间戳
quoteSchema.pre('save', function(next) {
  if (!this.isNew) {
    this.updatedAt = new Date();
  }
  next();
});

/**
 * 导出引用体模型
 */
const Quote = mongoose.model('Quote', quoteSchema);

module.exports = Quote;
