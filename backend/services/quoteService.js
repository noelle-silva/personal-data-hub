/**
 * 引用体服务层
 * 封装引用体相关的业务逻辑，与数据访问层交互
 */

const mongoose = require('mongoose');
const Quote = require('../models/Quote');
const Document = require('../models/Document');
const Attachment = require('../models/Attachment');

/**
 * 引用体服务类
 */
class QuoteService {
  /**
   * 获取所有引用体
   * @param {Object} options - 查询选项
   * @param {Number} options.page - 页码
   * @param {Number} options.limit - 每页数量
   * @param {String} options.sort - 排序字段
   * @param {String} options.populate - 是否填充引用的文档信息
   * @param {Boolean} options.raw - 是否返回原始数据（不填充）
   * @returns {Promise} 引用体列表和分页信息
   */
  async getAllQuotes(options = {}) {
    const {
      page = 1,
      limit = 10,
      sort = '-createdAt',
      populate = 'title',
      raw = false
    } = options;

    const nLimit = parseInt(limit);
    const nPage = parseInt(page);

    // 计算跳过的引用体数量
    const skip = (nPage - 1) * nLimit;

    try {
      // 构建查询
      let query = Quote.find().sort(sort);

      // 处理populate选项
      if (!raw && populate) {
        if (populate === 'title') {
          // 默认只填充标题
          query = query.populate({
            path: 'referencedDocumentIds',
            select: '_id title'
          });
          query = query.populate({
            path: 'referencedAttachmentIds',
            select: '_id originalName category mimeType size'
          });
          query = query.populate({
            path: 'referencedQuoteIds',
            select: '_id title'
          });
        } else if (populate === 'full') {
          // 完整填充，但限制字段
          query = query.populate({
            path: 'referencedDocumentIds',
            select: '_id title tags updatedAt summary'
          });
          query = query.populate({
            path: 'referencedAttachmentIds',
            select: '_id originalName category mimeType size'
          });
          query = query.populate({
            path: 'referencedQuoteIds',
            select: '_id title tags updatedAt summary'
          });
        }
      }

      if (nLimit > 0) {
        query = query.skip(skip).limit(nLimit);
      }

      const quotes = await query.exec();

      // 查询总数
      const total = await Quote.countDocuments();

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
   * 根据ID获取单个引用体
   * @param {String} id - 引用体ID
   * @param {String} populate - 是否填充引用的文档信息
   * @param {Boolean} raw - 是否返回原始数据（不填充）
   * @returns {Promise} 引用体对象
   */
  async getQuoteById(id, populate = 'title', raw = false) {
    try {
      let query = Quote.findById(id);

      // 处理populate选项
      if (!raw && populate) {
        if (populate === 'title') {
          // 默认只填充标题
          query = query.populate({
            path: 'referencedDocumentIds',
            select: '_id title'
          });
          query = query.populate({
            path: 'referencedAttachmentIds',
            select: '_id originalName category mimeType size'
          });
          query = query.populate({
            path: 'referencedQuoteIds',
            select: '_id title'
          });
        } else if (populate === 'full') {
          // 完整填充，但限制字段
          query = query.populate({
            path: 'referencedDocumentIds',
            select: '_id title tags updatedAt summary'
          });
          query = query.populate({
            path: 'referencedAttachmentIds',
            select: '_id originalName category mimeType size'
          });
          query = query.populate({
            path: 'referencedQuoteIds',
            select: '_id title tags updatedAt summary'
          });
        }
      }

      const quote = await query.exec();
      
      if (!quote) {
        throw new Error('引用体不存在');
      }
      
      return quote;
    } catch (error) {
      throw new Error(`获取引用体失败: ${error.message}`);
    }
  }

  /**
   * 创建新引用体
   * @param {Object} quoteData - 引用体数据
   * @returns {Promise} 新创建的引用体
   */
  async createQuote(quoteData) {
    try {
      // 验证必填字段
      if (!quoteData.title || !quoteData.content) {
        throw new Error('标题和内容是必填项');
      }

      // 验证引用的文档ID
      if (quoteData.referencedDocumentIds && Array.isArray(quoteData.referencedDocumentIds)) {
        // 验证每个ID是否为有效的ObjectId
        for (const id of quoteData.referencedDocumentIds) {
          if (!mongoose.Types.ObjectId.isValid(id)) {
            throw new Error(`无效的文档ID: ${id}`);
          }
        }

        // 验证引用的文档是否存在
        const documents = await Document.find({
          _id: { $in: quoteData.referencedDocumentIds }
        });

        if (documents.length !== quoteData.referencedDocumentIds.length) {
          throw new Error('部分引用的文档不存在');
        }
      }

      // 验证引用的附件ID
      if (quoteData.referencedAttachmentIds && Array.isArray(quoteData.referencedAttachmentIds)) {
        await this.validateReferencedAttachments(quoteData.referencedAttachmentIds);
      }

      // 验证引用的引用体ID
      if (quoteData.referencedQuoteIds && Array.isArray(quoteData.referencedQuoteIds)) {
        await this.validateReferencedQuotes(quoteData.referencedQuoteIds);
      }

      // 创建新引用体
      const quote = new Quote({
        title: quoteData.title,
        description: quoteData.description || '',
        content: quoteData.content,
        tags: quoteData.tags || [],
        referencedDocumentIds: quoteData.referencedDocumentIds || [],
        referencedAttachmentIds: quoteData.referencedAttachmentIds || [],
        referencedQuoteIds: quoteData.referencedQuoteIds || []
      });

      // 保存到数据库
      const savedQuote = await quote.save();
      
      // 默认填充标题信息返回
      return await this.getQuoteById(savedQuote._id, 'title');
    } catch (error) {
      throw new Error(`创建引用体失败: ${error.message}`);
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
   * 验证引用的引用体
   * @param {Array} referencedIds - 引用的引用体ID数组
   * @param {String} currentQuoteId - 当前引用体ID（用于检查自引用）
   * @returns {Promise} 验证结果
   */
  async validateReferencedQuotes(referencedIds, currentQuoteId = null) {
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
      
      // 检查数量限制
      if (uniqueIds.length > 100) {
        throw new Error('引用的引用体数量不能超过100个');
      }
      
      // 验证ObjectId格式
      for (const refId of uniqueIds) {
        if (!mongoose.Types.ObjectId.isValid(refId)) {
          throw new Error(`无效的引用体ID: ${refId}`);
        }
        
        // 检查自引用
        if (currentQuoteId && refId === currentQuoteId.toString()) {
          throw new Error('不能引用自身');
        }
      }
      
      // 检查所有引用的引用体是否存在
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
  }

  /**
   * 更新引用体
   * @param {String} id - 引用体ID
   * @param {Object} updateData - 更新数据
   * @returns {Promise} 更新后的引用体
   */
  async updateQuote(id, updateData) {
    try {
      // 验证引用的文档ID
      if (updateData.referencedDocumentIds && Array.isArray(updateData.referencedDocumentIds)) {
        // 验证每个ID是否为有效的ObjectId
        for (const docId of updateData.referencedDocumentIds) {
          if (!mongoose.Types.ObjectId.isValid(docId)) {
            throw new Error(`无效的文档ID: ${docId}`);
          }
        }

        // 验证引用的文档是否存在
        const documents = await Document.find({
          _id: { $in: updateData.referencedDocumentIds }
        });

        if (documents.length !== updateData.referencedDocumentIds.length) {
          throw new Error('部分引用的文档不存在');
        }
      }

      // 验证引用的附件ID
      if (updateData.referencedAttachmentIds && Array.isArray(updateData.referencedAttachmentIds)) {
        await this.validateReferencedAttachments(updateData.referencedAttachmentIds);
      }

      // 验证引用的引用体ID
      if (updateData.referencedQuoteIds && Array.isArray(updateData.referencedQuoteIds)) {
        await this.validateReferencedQuotes(updateData.referencedQuoteIds, id);
      }

      // 查找并更新引用体
      const quote = await Quote.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      );

      if (!quote) {
        throw new Error('引用体不存在');
      }

      // 默认填充标题信息返回
      return await this.getQuoteById(quote._id, 'title');
    } catch (error) {
      throw new Error(`更新引用体失败: ${error.message}`);
    }
  }

  /**
   * 删除引用体
   * @param {String} id - 引用体ID
   * @returns {Promise} 删除结果
   */
  async deleteQuote(id) {
    try {
      const quote = await Quote.findByIdAndDelete(id);
      
      if (!quote) {
        throw new Error('引用体不存在');
      }

      // 清理其他引用体中对已删除引用体的引用
      await this.removeReferencedQuote(id);

      // 从文档的引用引用体列表中移除已删除的引用体ID
      try {
        const docResult = await Document.updateMany(
          { referencedQuoteIds: id },
          { $pull: { referencedQuoteIds: id } }
        );
        
        console.log(`已从 ${docResult.modifiedCount} 个文档的引用引用体列表中移除引用体 ${id}`);
      } catch (docError) {
        console.error('清理文档引用引用体失败:', docError);
        // 不抛出错误，避免影响引用体删除
      }

      return { message: '引用体删除成功', id };
    } catch (error) {
      throw new Error(`删除引用体失败: ${error.message}`);
    }
  }

  /**
   * 按标签搜索引用体
   * @param {Array} tags - 标签数组
   * @param {Object} options - 查询选项
   * @param {String} options.mode - 匹配模式: 'all'(AND) 或 'any'(OR)
   * @param {Number} options.page - 页码（默认1）
   * @param {Number} options.limit - 每页数量（默认20，最大50；0表示不分页）
   * @param {String} options.sort - 排序字段（默认'-updatedAt'）
   * @param {String} options.populate - 是否填充引用的文档信息
   * @param {Boolean} options.raw - 是否返回原始数据（不填充）
   * @returns {Promise} 匹配的引用体列表和分页信息
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
        sort = '-updatedAt',
        populate = 'title',
        raw = false
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
      const total = await Quote.countDocuments(filter);

      // 构建查询
      let query = Quote.find(filter).sort(sort);

      // 处理populate选项
      if (!raw && populate) {
        if (populate === 'title') {
          // 默认只填充标题
          query = query.populate({
            path: 'referencedDocumentIds',
            select: '_id title'
          });
          query = query.populate({
            path: 'referencedAttachmentIds',
            select: '_id originalName category mimeType size'
          });
        } else if (populate === 'full') {
          // 完整填充，但限制字段
          query = query.populate({
            path: 'referencedDocumentIds',
            select: '_id title tags updatedAt summary'
          });
          query = query.populate({
            path: 'referencedAttachmentIds',
            select: '_id originalName category mimeType size'
          });
        }
      }

      // 处理分页
      if (nLimit > 0) {
        const skip = (nPage - 1) * nLimit;
        query = query.skip(skip).limit(nLimit);
      }

      // 执行查询
      const quotes = await query.exec();

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
        quotes,
        pagination
      };
    } catch (error) {
      throw new Error(`按标签搜索引用体失败: ${error.message}`);
    }
  }

  /**
   * 全文搜索引用体
   * @param {String} searchTerm - 搜索关键词
   * @param {Object} options - 查询选项
   * @param {Number} options.page - 页码（默认1）
   * @param {Number} options.limit - 每页数量（默认20，最大50）
   * @param {String} options.sort - 排序字段（默认'-updatedAt'）
   * @param {String} options.populate - 是否填充引用的文档信息
   * @param {Boolean} options.raw - 是否返回原始数据（不填充）
   * @returns {Promise} 匹配的引用体列表和分页信息
   */
  async searchQuotes(searchTerm, options = {}) {
    try {
      if (!searchTerm) {
        throw new Error('搜索关键词不能为空');
      }

      // 参数解析与验证
      const {
        page = 1,
        limit = 20,
        sort = '-updatedAt',
        populate = 'title',
        raw = false
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
      const quotes = await Quote.searchQuotes(escapedSearchTerm, {
        page: nPage,
        limit: nLimit,
        sort
      });

      // 处理populate选项
      if (!raw && populate && quotes.length > 0) {
        const quoteIds = quotes.map(quote => quote._id);
        
        let populateFields = '_id title';
        if (populate === 'full') {
          populateFields = '_id title tags updatedAt summary';
        }

        const populatedQuotes = await Quote.find({
          _id: { $in: quoteIds }
        }).populate({
          path: 'referencedDocumentIds',
          select: populateFields
        }).populate({
          path: 'referencedAttachmentIds',
          select: '_id originalName category mimeType size'
        }).populate({
          path: 'referencedQuoteIds',
          select: populateFields
        }).sort(sort);

        // 保持原始顺序
        const orderedQuotes = quoteIds.map(id => 
          populatedQuotes.find(quote => quote._id.toString() === id.toString())
        );

        // 替换原始数据
        quotes.splice(0, quotes.length, ...orderedQuotes);
      }
      
      // 计算是否有更多数据
      const hasMore = quotes.length === nLimit;
      
      // 限制返回字段，避免传输过大的content正文
      const limitedQuotes = quotes.map(quote => ({
        _id: quote._id,
        title: quote.title,
        description: quote.description,
        tags: quote.tags,
        referencedDocumentIds: quote.referencedDocumentIds,
        referencedAttachmentIds: quote.referencedAttachmentIds || [],
        updatedAt: quote.updatedAt,
        summary: quote.summary, // 使用虚拟字段生成摘要
        referenced: quote.referencedDocumentIds, // 填充后的引用文档信息
        referencedAttachments: quote.referencedAttachmentIds // 填充后的引用附件信息
      }));

      return {
        items: limitedQuotes,
        page: nPage,
        limit: nLimit,
        hasMore
      };
    } catch (error) {
      throw new Error(`搜索引用体失败: ${error.message}`);
    }
  }

  /**
   * 复合搜索：同时支持关键词和标签搜索
   * @param {String} searchTerm - 搜索关键词（可选）
   * @param {Array} tags - 标签数组（可选）
   * @param {Object} options - 查询选项
   * @param {String} options.mode - 标签匹配模式: 'all'(AND) 或 'any'(OR)
   * @param {Number} options.page - 页码（默认1）
   * @param {Number} options.limit - 每页数量（默认20，最大50）
   * @param {String} options.sort - 排序字段（默认'-updatedAt'）
   * @param {String} options.populate - 是否填充引用的文档信息
   * @param {Boolean} options.raw - 是否返回原始数据（不填充）
   * @returns {Promise} 匹配的引用体列表和分页信息
   */
  async searchQuotesCombined(searchTerm, tags, options = {}) {
    try {
      // 如果没有搜索条件，返回空结果
      if (!searchTerm && (!tags || tags.length === 0)) {
        return {
          items: [],
          page: 1,
          limit: options.limit || 20,
          hasMore: false
        };
      }

      // 解析选项
      const {
        mode = 'all',
        page = 1,
        limit = 20,
        sort = '-updatedAt',
        populate = 'title',
        raw = false
      } = options;
      
      // 限制每页最大数量
      const nLimit = Math.min(parseInt(limit) || 20, 50);
      const nPage = parseInt(page) || 1;

      // 计算跳过的数量
      const skip = (nPage - 1) * nLimit;

      // 构建查询条件
      let filter = {};

      // 添加关键词搜索条件
      if (searchTerm) {
        const escapeRegExp = (string) => {
          return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        };
        const escapedSearchTerm = escapeRegExp(searchTerm);
        
        filter.$or = [
          { title: { $regex: escapedSearchTerm, $options: 'i' } },
          { description: { $regex: escapedSearchTerm, $options: 'i' } },
          { content: { $regex: escapedSearchTerm, $options: 'i' } },
          { tags: { $regex: escapedSearchTerm, $options: 'i' } }
        ];
      }

      // 添加标签搜索条件
      if (tags && tags.length > 0) {
        if (mode === 'all') {
          // AND 语义：必须包含所有标签
          filter.tags = { $all: tags };
        } else {
          // OR 语义：包含任一标签
          filter.tags = { $in: tags };
        }
      }

      // 计算总数
      const total = await Quote.countDocuments(filter);

      // 构建查询
      let query = Quote.find(filter).sort(sort);

      // 处理populate选项
      if (!raw && populate) {
        if (populate === 'title') {
          // 默认只填充标题
          query = query.populate({
            path: 'referencedDocumentIds',
            select: '_id title'
          });
          query = query.populate({
            path: 'referencedAttachmentIds',
            select: '_id originalName category mimeType size'
          });
          query = query.populate({
            path: 'referencedQuoteIds',
            select: '_id title'
          });
        } else if (populate === 'full') {
          // 完整填充，但限制字段
          query = query.populate({
            path: 'referencedDocumentIds',
            select: '_id title tags updatedAt summary'
          });
          query = query.populate({
            path: 'referencedAttachmentIds',
            select: '_id originalName category mimeType size'
          });
          query = query.populate({
            path: 'referencedQuoteIds',
            select: '_id title tags updatedAt summary'
          });
        }
      }

      // 处理分页
      if (nLimit > 0) {
        query = query.skip(skip).limit(nLimit);
      }

      // 执行查询
      const quotes = await query.exec();
      
      // 计算是否有更多数据
      const hasMore = nLimit > 0 && (skip + quotes.length) < total;
      
      // 限制返回字段，避免传输过大的content正文
      const limitedQuotes = quotes.map(quote => ({
        _id: quote._id,
        title: quote.title,
        description: quote.description,
        tags: quote.tags,
        referencedDocumentIds: quote.referencedDocumentIds,
        updatedAt: quote.updatedAt,
        summary: quote.summary, // 使用虚拟字段生成摘要
        referenced: quote.referencedDocumentIds // 填充后的引用文档信息
      }));

      return {
        items: limitedQuotes,
        page: nPage,
        limit: nLimit,
        hasMore
      };
    } catch (error) {
      throw new Error(`复合搜索引用体失败: ${error.message}`);
    }
  }

  /**
   * 获取引用体统计信息
   * @returns {Promise} 统计信息
   */
  async getQuoteStats() {
    try {
      const total = await Quote.countDocuments();
      const tagStats = await Quote.aggregate([
        { $unwind: '$tags' },
        { $group: { _id: '$tags', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);

      return {
        totalQuotes: total,
        tagStats
      };
    } catch (error) {
      throw new Error(`获取统计信息失败: ${error.message}`);
    }
  }

  /**
   * 从引用体中移除已删除的文档ID
   * @param {String} documentId - 已删除的文档ID
   * @returns {Promise} 更新结果
   */
  async removeReferencedDocument(documentId) {
    try {
      const result = await Quote.updateMany(
        { referencedDocumentIds: documentId },
        { $pull: { referencedDocumentIds: documentId } }
      );

      return {
        message: `已从 ${result.modifiedCount} 个引用体中移除文档引用`,
        modifiedCount: result.modifiedCount
      };
    } catch (error) {
      throw new Error(`移除文档引用失败: ${error.message}`);
    }
  }

  /**
   * 从引用体中移除已删除的引用体ID
   * @param {String} quoteId - 已删除的引用体ID
   * @returns {Promise} 更新结果
   */
  async removeReferencedQuote(quoteId) {
    try {
      const result = await Quote.updateMany(
        { referencedQuoteIds: quoteId },
        { $pull: { referencedQuoteIds: quoteId } }
      );

      return {
        message: `已从 ${result.modifiedCount} 个引用体中移除引用体引用`,
        modifiedCount: result.modifiedCount
      };
    } catch (error) {
      throw new Error(`移除引用体引用失败: ${error.message}`);
    }
  }
}

// 导出服务实例
module.exports = new QuoteService();