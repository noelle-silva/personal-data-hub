/**
 * 自定义页面数据模型
 * 定义自定义页面在MongoDB中的数据结构和验证规则
 */

const mongoose = require('mongoose');

/**
 * 自定义页面Schema定义
 * 包含名称、引用的文档ID数组、引用的引用体ID数组、引用的附件ID数组等字段
 */
const customPageSchema = new mongoose.Schema(
  {
    // 页面名称，必填字段，唯一
    name: {
      type: String,
      required: [true, '页面名称是必填项'],
      trim: true,
      maxlength: [100, '页面名称不能超过100个字符'],
      validate: {
        validator: function(v) {
          // 禁止包含 / 和 \ 字符
          return !/[\/\\]/.test(v);
        },
        message: '页面名称不能包含 / 或 \\ 字符'
      },
      unique: true
    },
    
    // 引用的笔记ID数组，可选字段
    referencedDocumentIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      default: []
    }],
    
    // 引用的引用体ID数组，可选字段
    referencedQuoteIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quote',
      default: []
    }],
    
    // 引用的附件ID数组，可选字段
    referencedAttachmentIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Attachment',
      default: []
    }],
    
    // 统一内容项数组，用于混合排序
    contentItems: [{
      kind: {
        type: String,
        required: true,
        enum: ['Document', 'Quote', 'Attachment'],
        default: 'Document'
      },
      refId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: 'contentItems.kind'
      }
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
    // 指定集合名称，从环境变量读取，默认为custom-pages
    collection: process.env.CUSTOM_PAGE_COLLECTION || 'custom-pages',
    
    // 启用时间戳，自动管理createdAt和updatedAt字段
    timestamps: true,
    
    // 添加虚拟字段和实例方法
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// 创建索引以提高查询性能
customPageSchema.index({ name: 1 }, { unique: true }); // 名称唯一索引
customPageSchema.index({ updatedAt: -1 }); // 按更新时间降序索引

/**
 * 虚拟字段：页面引用统计
 * 返回各类引用的数量统计
 */
customPageSchema.virtual('counts').get(function() {
  return {
    documents: this.referencedDocumentIds.length,
    quotes: this.referencedQuoteIds.length,
    attachments: this.referencedAttachmentIds.length
  };
});

/**
 * 虚拟字段：页面URL
 * 返回页面的访问URL
 */
customPageSchema.virtual('url').get(function() {
  return `/自定义/${encodeURIComponent(this.name)}`;
});

/**
 * 实例方法：更新页面
 * @param {Object} updateData - 要更新的数据
 * @returns {Promise} 更新后的页面
 */
customPageSchema.methods.updateCustomPage = function(updateData) {
  Object.assign(this, updateData);
  this.updatedAt = new Date();
  return this.save();
};

/**
 * 静态方法：按名称查找页面
 * @param {String} name - 页面名称
 * @returns {Promise} 匹配的页面
 */
customPageSchema.statics.findByName = function(name) {
  return this.findOne({ name: name });
};

/**
 * 静态方法：生成唯一名称
 * @param {String} baseName - 基础名称
 * @returns {Promise} 唯一的名称
 */
customPageSchema.statics.generateUniqueName = async function(baseName) {
  let name = baseName.trim();
  let counter = 1;
  
  // 检查基础名称是否已存在
  let existingPage = await this.findOne({ name });
  
  // 如果基础名称已存在，则添加序号
  while (existingPage) {
    name = `${baseName.trim()}-${counter}`;
    existingPage = await this.findOne({ name });
    counter++;
  }
  
  return name;
};

/**
 * 静态方法：搜索页面
 * @param {String} searchTerm - 搜索关键词
 * @param {Object} options - 查询选项
 * @returns {Promise} 匹配的页面数组
 */
customPageSchema.statics.searchCustomPages = function(searchTerm, options = {}) {
  const {
    page = 1,
    limit = 20,
    sort = '-updatedAt'
  } = options;
  
  const skip = (page - 1) * limit;
  
  // 构建搜索条件，匹配页面名称
  const searchConditions = [
    { name: { $regex: searchTerm, $options: 'i' } }
  ];
  
  return this.find({
    $or: searchConditions
  })
  .sort(sort)
  .skip(skip)
  .limit(limit)
  .exec();
};

/**
 * 静态方法：验证引用的文档
 * @param {Array} referencedIds - 引用的文档ID数组
 * @returns {Promise} 验证结果
 */
customPageSchema.statics.validateReferencedDocuments = async function(referencedIds) {
  try {
    // 检查是否为数组
    if (!Array.isArray(referencedIds)) {
      throw new Error('引用的文档ID必须是数组');
    }
    
    // 去重
    const uniqueIds = [...new Set(referencedIds)];
    if (uniqueIds.length !== referencedIds.length) {
      throw new Error('引用的文档ID存在重复');
    }
    
    // 验证ObjectId格式
    for (const refId of uniqueIds) {
      if (!mongoose.Types.ObjectId.isValid(refId)) {
        throw new Error(`无效的文档ID: ${refId}`);
      }
    }
    
    // 检查所有引用的文档是否存在
    const Document = mongoose.model('Document');
    const existingDocs = await Document.find({
      _id: { $in: uniqueIds }
    }).select('_id');
    
    if (existingDocs.length !== uniqueIds.length) {
      throw new Error('部分引用的文档不存在');
    }
    
    return true;
  } catch (error) {
    throw error;
  }
};

/**
 * 静态方法：验证引用的引用体
 * @param {Array} referencedIds - 引用的引用体ID数组
 * @returns {Promise} 验证结果
 */
customPageSchema.statics.validateReferencedQuotes = async function(referencedIds) {
  try {
    // 检查是否为数组
    if (!Array.isArray(referencedIds)) {
      throw new Error('引用的引用体ID必须是数组');
    }
    
    // 去重
    const uniqueIds = [...new Set(referencedIds)];
    if (uniqueIds.length !== referencedIds.length) {
      throw new Error('引用的引用体ID存在重复');
    }
    
    // 验证ObjectId格式
    for (const refId of uniqueIds) {
      if (!mongoose.Types.ObjectId.isValid(refId)) {
        throw new Error(`无效的引用体ID: ${refId}`);
      }
    }
    
    // 检查所有引用的引用体是否存在
    const Quote = mongoose.model('Quote');
    const existingQuotes = await Quote.find({
      _id: { $in: uniqueIds }
    }).select('_id');
    
    if (existingQuotes.length !== uniqueIds.length) {
      throw new Error('部分引用的引用体不存在');
    }
    
    return true;
  } catch (error) {
    throw error;
  }
};

/**
 * 静态方法：验证引用的附件
 * @param {Array} referencedIds - 引用的附件ID数组
 * @returns {Promise} 验证结果
 */
customPageSchema.statics.validateReferencedAttachments = async function(referencedIds) {
  try {
    // 检查是否为数组
    if (!Array.isArray(referencedIds)) {
      throw new Error('引用的附件ID必须是数组');
    }
    
    // 去重
    const uniqueIds = [...new Set(referencedIds)];
    if (uniqueIds.length !== referencedIds.length) {
      throw new Error('引用的附件ID存在重复');
    }
    
    // 验证ObjectId格式
    for (const refId of uniqueIds) {
      if (!mongoose.Types.ObjectId.isValid(refId)) {
        throw new Error(`无效的附件ID: ${refId}`);
      }
    }
    
    // 检查所有引用的附件是否存在
    const Attachment = mongoose.model('Attachment');
    const existingAttachments = await Attachment.find({
      _id: { $in: uniqueIds },
      status: 'active'
    }).select('_id');
    
    if (existingAttachments.length !== uniqueIds.length) {
      throw new Error('部分引用的附件不存在或已删除');
    }
    
    return true;
  } catch (error) {
    throw error;
  }
};

/**
 * 静态方法：验证内容项数组
 * @param {Array} contentItems - 内容项数组
 * @returns {Promise} 验证结果
 */
customPageSchema.statics.validateContentItems = async function(contentItems) {
  try {
    // 检查是否为数组
    if (!Array.isArray(contentItems)) {
      throw new Error('内容项必须是数组');
    }
    
    // 验证每个内容项
    for (const item of contentItems) {
      // 检查必需字段
      if (!item.kind || !item.refId) {
        throw new Error('内容项必须包含 kind 和 refId 字段');
      }
      
      // 验证 kind 字段
      if (!['Document', 'Quote', 'Attachment'].includes(item.kind)) {
        throw new Error(`无效的内容项类型: ${item.kind}`);
      }
      
      // 验证 refId 格式
      if (!mongoose.Types.ObjectId.isValid(item.refId)) {
        throw new Error(`无效的引用ID: ${item.refId}`);
      }
    }
    
    // 检查重复项 (kind, refId) 组合
    const itemKeys = contentItems.map(item => `${item.kind}:${item.refId}`);
    const uniqueKeys = [...new Set(itemKeys)];
    if (uniqueKeys.length !== contentItems.length) {
      throw new Error('内容项存在重复项');
    }
    
    // 验证引用的对象是否存在
    for (const item of contentItems) {
      const Model = mongoose.model(item.kind);
      
      // 对于附件，需要查询 status 字段；其他类型只需 _id
      const selectFields = item.kind === 'Attachment' ? '_id status' : '_id';
      const existing = await Model.findById(item.refId).select(selectFields);
      
      if (!existing) {
        throw new Error(`引用的${item.kind}不存在: ${item.refId}`);
      }
      
      // 对于附件，额外检查状态
      if (item.kind === 'Attachment') {
        if (existing.status !== 'active') {
          throw new Error(`引用的附件已被删除: ${item.refId}`);
        }
      }
    }
    
    return true;
  } catch (error) {
    throw error;
  }
};

/**
 * 静态方法：根据引用数组生成默认内容项（按更新时间降序）
 * @param {Array} documents - 文档数组
 * @param {Array} quotes - 引用体数组
 * @param {Array} attachments - 附件数组
 * @returns {Array} 内容项数组
 */
customPageSchema.statics.generateDefaultContentItems = function(documents, quotes, attachments) {
  const allItems = [];
  
  // 添加文档项
  documents.forEach(doc => {
    allItems.push({
      kind: 'Document',
      refId: doc._id,
      updatedAt: doc.updatedAt
    });
  });
  
  // 添加引用体项
  quotes.forEach(quote => {
    allItems.push({
      kind: 'Quote',
      refId: quote._id,
      updatedAt: quote.updatedAt
    });
  });
  
  // 添加附件项
  attachments.forEach(attachment => {
    allItems.push({
      kind: 'Attachment',
      refId: attachment._id,
      updatedAt: attachment.updatedAt
    });
  });
  
  // 按更新时间降序排序
  allItems.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  
  // 返回只包含 kind 和 refId 的数组
  return allItems.map(item => ({
    kind: item.kind,
    refId: item.refId
  }));
};

/**
 * 静态方法：同步内容项与引用数组
 * @param {Array} contentItems - 内容项数组
 * @param {Array} documentIds - 文档ID数组
 * @param {Array} quoteIds - 引用体ID数组
 * @param {Array} attachmentIds - 附件ID数组
 * @returns {Object} 同步后的数组
 *
 * 行为说明：
 * - 新增项将按类型顺序（Document → Quote → Attachment）插入到内容列表最前面
 * - 同类型新增项会保持其在传入数组中的相对顺序（多选顺序）
 * - 既有项的相对顺序不变，仅移除不再被引用的项
 */
customPageSchema.statics.syncContentItemsWithReferences = function(contentItems, documentIds, quoteIds, attachmentIds) {
  // 创建引用ID集合
  const docIdSet = new Set(documentIds.map(id => id.toString()));
  const quoteIdSet = new Set(quoteIds.map(id => id.toString()));
  const attachmentIdSet = new Set(attachmentIds.map(id => id.toString()));
  
  // 过滤掉不再存在于引用数组中的内容项
  const validContentItems = contentItems.filter(item => {
    const refIdStr = item.refId.toString();
    switch (item.kind) {
      case 'Document':
        return docIdSet.has(refIdStr);
      case 'Quote':
        return quoteIdSet.has(refIdStr);
      case 'Attachment':
        return attachmentIdSet.has(refIdStr);
      default:
        return false;
    }
  });
  
  // 找出新增的引用ID（不在现有内容项中的）
  const existingDocIds = new Set(
    validContentItems
      .filter(item => item.kind === 'Document')
      .map(item => item.refId.toString())
  );
  const existingQuoteIds = new Set(
    validContentItems
      .filter(item => item.kind === 'Quote')
      .map(item => item.refId.toString())
  );
  const existingAttachmentIds = new Set(
    validContentItems
      .filter(item => item.kind === 'Attachment')
      .map(item => item.refId.toString())
  );
  
  // 收集新增项（按类型顺序：Document → Quote → Attachment，保持各自数组内的多选顺序）
  const newItems = [];
  
  // 添加新文档项（收集而不立即追加）
  documentIds.forEach(id => {
    if (!existingDocIds.has(id.toString())) {
      newItems.push({
        kind: 'Document',
        refId: id
      });
    }
  });
  
  // 添加新引用体项（收集而不立即追加）
  quoteIds.forEach(id => {
    if (!existingQuoteIds.has(id.toString())) {
      newItems.push({
        kind: 'Quote',
        refId: id
      });
    }
  });
  
  // 添加新附件项（收集而不立即追加）
  attachmentIds.forEach(id => {
    if (!existingAttachmentIds.has(id.toString())) {
      newItems.push({
        kind: 'Attachment',
        refId: id
      });
    }
  });
  
  // 将新增项前插到最前面，保持既有项的相对顺序不变
  const finalContentItems = [...newItems, ...validContentItems];
  
  return {
    contentItems: finalContentItems,
    referencedDocumentIds: documentIds,
    referencedQuoteIds: quoteIds,
    referencedAttachmentIds: attachmentIds
  };
};

// 中间件：保存前更新时间戳
customPageSchema.pre('save', function(next) {
  if (!this.isNew) {
    this.updatedAt = new Date();
  }
  next();
});

/**
 * 导出自定义页面模型
 */
const CustomPage = mongoose.model('CustomPage', customPageSchema);

module.exports = CustomPage;
