/**
 * 文档服务层
 * 封装文档相关的业务逻辑，与数据访问层交互
 */

const mongoose = require('mongoose');
const Document = require('../models/Document');
const Quote = require('../models/Quote');
const Attachment = require('../models/Attachment');

/**
 * 文档服务类
 */
class DocumentService {
  /**
   * 获取所有文档
   * @param {Object} options - 查询选项
   * @param {Number} options.page - 页码
   * @param {Number} options.limit - 每页数量
   * @param {String} options.sort - 排序字段
   * @returns {Promise} 文档列表和分页信息
   */
  async getAllDocuments(options = {}) {
    const {
      page = 1,
      limit = 10,
      sort = '-createdAt'
    } = options;

    const nLimit = parseInt(limit);
    const nPage = parseInt(page);

    // 计算跳过的文档数量
    const skip = (nPage - 1) * nLimit;

    try {
      // 查询文档总数
      const total = await Document.countDocuments();
      
      // 构建查询
      let query = Document.find().sort(sort);

      if (nLimit > 0) {
        query = query.skip(skip).limit(nLimit);
      }

      const documents = await query.exec();

      // 计算分页信息
      const pages = nLimit > 0 ? Math.ceil(total / nLimit) : 1;
      const pagination = {
        page: nPage,
        limit: nLimit,
        total,
        pages,
        hasNext: nLimit > 0 && nPage < pages,
        hasPrev: nLimit > 0 && nPage > 1
      };

      return {
        documents,
        pagination
      };
    } catch (error) {
      throw new Error(`获取文档列表失败: ${error.message}`);
    }
  }

  /**
   * 根据ID获取单个文档
   * @param {String} id - 文档ID
   * @param {Object} options - 查询选项
   * @param {String} options.populate - 是否填充引用的文档信息 ('title', 'full', 'none')
   * @param {String} options.include - 是否包含引用此文档的引用体 ('referencingQuotes')
   * @param {Number} options.quotesLimit - 引用体分页限制
   * @param {Number} options.quotesPage - 引用体分页页码
   * @param {String} options.quotesSort - 引用体排序字段
   * @returns {Promise} 文档对象
   */
  async getDocumentById(id, options = {}) {
    try {
      const {
        populate = 'title',
        include = '',
        quotesLimit = 20,
        quotesPage = 1,
        quotesSort = '-updatedAt'
      } = options;

      // 构建查询
      let query = Document.findById(id);
      
      // 处理引用文档的填充
      if (populate !== 'none') {
        const populateFields = populate === 'full'
          ? '_id title tags updatedAt summary'
          : '_id title';
        
        query = query.populate({
          path: 'referencedDocumentIds',
          select: populateFields
        });
        
        // 填充引用的附件信息
        query = query.populate({
          path: 'referencedAttachmentIds',
          select: '_id originalName category mimeType size'
        });
      }
      
      // 执行查询获取文档
      const document = await query.exec();
      
      if (!document) {
        throw new Error('文档不存在');
      }
      
      // 转换为普通对象以便添加额外字段
      const result = document.toObject();
      
      // 如果需要包含引用此文档的引用体
      if (include.includes('referencingQuotes')) {
        const referencingQuotes = await this.getReferencingQuotes(id, {
          page: quotesPage,
          limit: quotesLimit,
          sort: quotesSort,
          populate
        });
        
        result.referencingQuotes = referencingQuotes.quotes;
        result.referencingQuotesPagination = referencingQuotes.pagination;
      }
      
      return result;
    } catch (error) {
      throw new Error(`获取文档失败: ${error.message}`);
    }
  }

  /**
   * 创建新文档
   * @param {Object} documentData - 文档数据
   * @returns {Promise} 新创建的文档
   */
  async createDocument(documentData) {
    try {
      // 验证必填字段
      if (!documentData.title) {
        throw new Error('标题是必填项');
      }

      // 验证引用的附件ID
      if (documentData.referencedAttachmentIds) {
        await this.validateReferencedAttachments(documentData.referencedAttachmentIds);
      }
      
      // 创建新文档
      const document = new Document({
        title: documentData.title,
        content: documentData.content || '',
        htmlContent: documentData.htmlContent || '',
        tags: documentData.tags || [],
        source: documentData.source || '',
        referencedAttachmentIds: documentData.referencedAttachmentIds || []
      });

      // 保存到数据库
      const savedDocument = await document.save();
      
      return savedDocument;
    } catch (error) {
      throw new Error(`创建文档失败: ${error.message}`);
    }
  }

  /**
   * 更新文档
   * @param {String} id - 文档ID
   * @param {Object} updateData - 更新数据
   * @param {Object} options - 查询选项
   * @returns {Promise} 更新后的文档
   */
  async updateDocument(id, updateData, options = {}) {
    try {
      // 如果更新包含引用文档，进行验证
      if (updateData.referencedDocumentIds) {
        await this.validateReferencedDocuments(id, updateData.referencedDocumentIds);
      }
      
      // 如果更新包含引用附件，进行验证
      if (updateData.referencedAttachmentIds) {
        await this.validateReferencedAttachments(updateData.referencedAttachmentIds);
      }
      
      // 查找并更新文档
      const document = await Document.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      );

      if (!document) {
        throw new Error('文档不存在');
      }

      // 如果有查询选项，重新获取完整数据
      if (options.populate || options.include) {
        return await this.getDocumentById(id, options);
      }

      return document;
    } catch (error) {
      throw new Error(`更新文档失败: ${error.message}`);
    }
  }

  /**
   * 验证引用的文档
   * @param {String} currentId - 当前文档ID
   * @param {Array} referencedIds - 引用的文档ID数组
   * @returns {Promise} 验证结果
   */
  async validateReferencedDocuments(currentId, referencedIds) {
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
      
      // 检查自引用
      if (uniqueIds.includes(currentId)) {
        throw new Error('文档不能引用自身');
      }
      
      // 验证ObjectId格式
      for (const refId of uniqueIds) {
        if (!mongoose.Types.ObjectId.isValid(refId)) {
          throw new Error(`无效的文档ID: ${refId}`);
        }
      }
      
      // 检查所有引用的文档是否存在
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
  }

  /**
   * 验证引用的附件
   * @param {Array} referencedIds - 引用的附件ID数组
   * @returns {Promise} 验证结果
   */
  async validateReferencedAttachments(referencedIds) {
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
  }

  /**
   * 获取引用此文档的引用体列表
   * @param {String} documentId - 文档ID
   * @param {Object} options - 查询选项
   * @returns {Promise} 引用体列表和分页信息
   */
  async getReferencingQuotes(documentId, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        sort = '-updatedAt',
        populate = 'title'
      } = options;

      const nLimit = parseInt(limit);
      const nPage = parseInt(page);
      const skip = (nPage - 1) * nLimit;

      // 构建查询
      let query = Quote.find({
        referencedDocumentIds: documentId
      }).sort(sort);

      // 处理populate选项
      if (populate !== 'none') {
        const populateFields = populate === 'full'
          ? '_id title tags updatedAt summary'
          : '_id title';
        
        query = query.populate({
          path: 'referencedDocumentIds',
          select: populateFields
        });
      }

      // 分页处理
      if (nLimit > 0) {
        query = query.skip(skip).limit(nLimit);
      }

      // 执行查询
      const quotes = await query.exec();

      // 查询总数
      const total = await Quote.countDocuments({
        referencedDocumentIds: documentId
      });

      // 计算分页信息
      const pages = nLimit > 0 ? Math.ceil(total / nLimit) : 1;
      const pagination = {
        page: nPage,
        limit: nLimit,
        total,
        pages,
        hasNext: nLimit > 0 && nPage < pages,
        hasPrev: nLimit > 0 && nPage > 1
      };

      return {
        quotes,
        pagination
      };
    } catch (error) {
      throw new Error(`获取引用体列表失败: ${error.message}`);
    }
  }

  /**
   * 删除文档
   * @param {String} id - 文档ID
   * @returns {Promise} 删除结果
   */
  async deleteDocument(id) {
    try {
      const document = await Document.findByIdAndDelete(id);
      
      if (!document) {
        throw new Error('文档不存在');
      }

      // 从引用体中移除已删除的文档ID
      try {
        const quoteResult = await Quote.updateMany(
          { referencedDocumentIds: id },
          { $pull: { referencedDocumentIds: id } }
        );
        
        console.log(`已从 ${quoteResult.modifiedCount} 个引用体中移除文档 ${id} 的引用`);
      } catch (quoteError) {
        console.error('清理引用体引用失败:', quoteError);
        // 不抛出错误，避免影响文档删除
      }

      // 从其他文档的引用列表中移除已删除的文档ID
      try {
        const docResult = await Document.updateMany(
          { referencedDocumentIds: id },
          { $pull: { referencedDocumentIds: id } }
        );
        
        console.log(`已从 ${docResult.modifiedCount} 个文档中移除对文档 ${id} 的引用`);
      } catch (docError) {
        console.error('清理文档引用失败:', docError);
        // 不抛出错误，避免影响文档删除
      }

      return { message: '文档删除成功', id };
    } catch (error) {
      throw new Error(`删除文档失败: ${error.message}`);
    }
  }

  /**
   * 按标签搜索文档
   * @param {Array} tags - 标签数组
   * @param {Object} options - 查询选项
   * @param {String} options.mode - 匹配模式: 'all'(AND) 或 'any'(OR)
   * @param {Number} options.page - 页码（默认1）
   * @param {Number} options.limit - 每页数量（默认20，最大50；0表示不分页）
   * @param {String} options.sort - 排序字段（默认'-updatedAt'）
   * @returns {Promise} 匹配的文档列表和分页信息
   */
  async searchByTags(tags, options = {}) {
    try {
      if (!tags || tags.length === 0) {
        throw new Error('标签数组不能为空');
      }

      // 解析选项
      const {
        mode = 'all',
        page = 1,
        limit = 20,
        sort = '-updatedAt'
      } = options;
      
      const nLimit = parseInt(limit) || 20;
      const nPage = parseInt(page) || 1;

      // 构建查询过滤器
      let filter;
      if (mode === 'all') {
        // AND 语义：必须包含所有标签
        filter = { tags: { $all: tags } };
      } else {
        // OR 语义：包含任一标签
        filter = { tags: { $in: tags } };
      }

      // 计算总数
      const total = await Document.countDocuments(filter);

      // 构建查询
      let query = Document.find(filter).sort(sort);

      // 处理分页
      if (nLimit > 0) {
        const skip = (nPage - 1) * nLimit;
        query = query.skip(skip).limit(nLimit);
      }

      // 执行查询
      const documents = await query.exec();

      // 计算分页信息
      let pagination = {};
      if (nLimit > 0) {
        const pages = Math.ceil(total / nLimit);
        pagination = {
          page: nPage,
          limit: nLimit,
          total,
          pages,
          hasMore: nPage < pages,
          hasNext: nPage < pages,
          hasPrev: nPage > 1
        };
      } else {
        // 不分页情况
        pagination = {
          page: 1,
          limit: 0,
          total,
          pages: 1,
          hasMore: false,
          hasNext: false,
          hasPrev: false
        };
      }

      return {
        documents,
        pagination
      };
    } catch (error) {
      throw new Error(`按标签搜索失败: ${error.message}`);
    }
  }

  /**
   * 全文搜索文档
   * @param {String} searchTerm - 搜索关键词
   * @param {Object} options - 查询选项
   * @param {Number} options.page - 页码（默认1）
   * @param {Number} options.limit - 每页数量（默认20，最大50）
   * @param {String} options.sort - 排序字段（默认'-updatedAt'）
   * @returns {Promise} 匹配的文档列表和分页信息
   */
  async searchDocuments(searchTerm, options = {}) {
    try {
      if (!searchTerm) {
        throw new Error('搜索关键词不能为空');
      }

      // 参数解析与验证
      const {
        page = 1,
        limit = 20,
        sort = '-updatedAt'
      } = options;
      
      // 限制每页最大数量
      const nLimit = Math.min(parseInt(limit) || 20, 50);
      const nPage = parseInt(page) || 1;

      // 转义正则特殊字符，防止正则注入
      const escapeRegExp = (string) => {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      };
      
      const escapedSearchTerm = escapeRegExp(searchTerm);
      
      // 执行搜索查询
      const documents = await Document.searchDocuments(escapedSearchTerm, {
        page: nPage,
        limit: nLimit,
        sort
      });
      
      // 计算是否有更多数据
      const hasMore = documents.length === nLimit;
      
      // 限制返回字段，避免传输过大的content正文
      const limitedDocuments = documents.map(doc => ({
        _id: doc._id,
        title: doc.title,
        tags: doc.tags,
        source: doc.source,
        updatedAt: doc.updatedAt,
        summary: doc.summary, // 使用虚拟字段生成摘要
        referencedAttachmentIds: doc.referencedAttachmentIds || []
      }));

      return {
        items: limitedDocuments,
        page: nPage,
        limit: nLimit,
        hasMore
      };
    } catch (error) {
      throw new Error(`搜索文档失败: ${error.message}`);
    }
  }

  /**
   * 获取文档统计信息
   * @returns {Promise} 统计信息
   */
  async getDocumentStats() {
    try {
      const total = await Document.countDocuments();
      const tagStats = await Document.aggregate([
        { $unwind: '$tags' },
        { $group: { _id: '$tags', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);

      return {
        totalDocuments: total,
        tagStats
      };
    } catch (error) {
      throw new Error(`获取统计信息失败: ${error.message}`);
    }
  }
}

// 导出服务实例
module.exports = new DocumentService();