/**
 * 文档控制器层
 * 处理HTTP请求和响应，调用服务层方法处理业务逻辑
 */

const documentService = require('../services/documentService');

/**
 * 文档控制器类
 */
class DocumentController {
  /**
   * 获取所有文档
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   * @param {Function} next - Express下一个中间件函数
   */
  async getAllDocuments(req, res, next) {
    try {
      // 从查询参数获取分页和排序选项
      const options = {
        page: req.query.page ? parseInt(req.query.page) : 1,
        limit: req.query.limit ? parseInt(req.query.limit) : 10,
        sort: req.query.sort || '-createdAt'
      };

      const result = await documentService.getAllDocuments(options);

      // 返回成功响应
      res.status(200).json({
        success: true,
        data: result.documents,
        pagination: result.pagination,
        message: '获取文档列表成功'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 根据ID获取单个文档
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   * @param {Function} next - Express下一个中间件函数
   */
  async getDocumentById(req, res, next) {
    try {
      const { id } = req.params;
      
      // 验证ObjectId
      if (!require('mongoose').Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: '无效的文档ID'
        });
      }
      
      // 解析查询参数
      const options = {
        populate: req.query.populate || 'title', // 'title', 'full', 'none'
        include: req.query.include || '', // 'referencingQuotes'
        quotesLimit: req.query.quotesLimit ? parseInt(req.query.quotesLimit) : 20,
        quotesPage: req.query.quotesPage ? parseInt(req.query.quotesPage) : 1,
        quotesSort: req.query.quotesSort || '-updatedAt'
      };
      
      const document = await documentService.getDocumentById(id, options);

      // 返回成功响应
      res.status(200).json({
        success: true,
        data: document,
        message: '获取文档成功'
      });
    } catch (error) {
      // 如果是文档不存在的错误，返回404
      if (error.message && error.message.includes('文档不存在')) {
        return res.status(404).json({
          success: false,
          message: '文档不存在'
        });
      }
      next(error);
    }
  }

  /**
   * 创建新文档
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   * @param {Function} next - Express下一个中间件函数
   */
  async createDocument(req, res, next) {
    try {
      // 从请求体获取文档数据
      const documentData = {
        title: req.body.title,
        content: req.body.content,
        htmlContent: req.body.htmlContent,
        tags: req.body.tags,
        source: req.body.source,
        referencedAttachmentIds: req.body.referencedAttachmentIds,
        referencedQuoteIds: req.body.referencedQuoteIds
      };

      const document = await documentService.createDocument(documentData);

      // 返回创建成功响应
      res.status(201).json({
        success: true,
        data: document,
        message: '文档创建成功'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 更新文档
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   * @param {Function} next - Express下一个中间件函数
   */
  async updateDocument(req, res, next) {
    try {
      const { id } = req.params;
      
      // 从请求体获取更新数据
      const updateData = {};
      if (req.body.title !== undefined) updateData.title = req.body.title;
      if (req.body.content !== undefined) updateData.content = req.body.content;
      if (req.body.htmlContent !== undefined) updateData.htmlContent = req.body.htmlContent;
      if (req.body.tags !== undefined) updateData.tags = req.body.tags;
      if (req.body.source !== undefined) updateData.source = req.body.source;
      if (req.body.referencedDocumentIds !== undefined) updateData.referencedDocumentIds = req.body.referencedDocumentIds;
      if (req.body.referencedAttachmentIds !== undefined) updateData.referencedAttachmentIds = req.body.referencedAttachmentIds;
      if (req.body.referencedQuoteIds !== undefined) updateData.referencedQuoteIds = req.body.referencedQuoteIds;

      // 解析查询参数，用于返回更新后的文档数据
      const options = {
        populate: req.query.populate || 'title', // 'title', 'full', 'none'
        include: req.query.include || '', // 'referencingQuotes'
        quotesLimit: req.query.quotesLimit ? parseInt(req.query.quotesLimit) : 20,
        quotesPage: req.query.quotesPage ? parseInt(req.query.quotesPage) : 1,
        quotesSort: req.query.quotesSort || '-updatedAt'
      };

      const document = await documentService.updateDocument(id, updateData, options);

      // 返回更新成功响应
      res.status(200).json({
        success: true,
        data: document,
        message: '文档更新成功'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 删除文档
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   * @param {Function} next - Express下一个中间件函数
   */
  async deleteDocument(req, res, next) {
    try {
      const { id } = req.params;
      
      const result = await documentService.deleteDocument(id);

      // 返回删除成功响应
      res.status(200).json({
        success: true,
        data: result,
        message: '文档删除成功'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 按标签搜索文档
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   * @param {Function} next - Express下一个中间件函数
   */
  async searchByTags(req, res, next) {
    try {
      const { tags, mode = 'all', page, limit, sort = '-updatedAt' } = req.query;
      
      if (!tags) {
        return res.status(400).json({
          success: false,
          message: '请提供搜索标签'
        });
      }

      // 将标签字符串转换为数组，去重并去除空格
      let tagArray = Array.isArray(tags) ? tags : tags.split(',');
      tagArray = [...new Set(tagArray.map(tag => tag.trim()).filter(tag => tag))];
      
      if (tagArray.length === 0) {
        return res.status(400).json({
          success: false,
          message: '标签不能为空'
        });
      }

      // 构建查询选项
      const options = {
        mode, // 'all' 或 'any'
        page: page ? parseInt(page) : 1,
        limit: limit ? Math.min(parseInt(limit), 50) : 20, // 限制最大50条
        sort
      };

      const result = await documentService.searchByTags(tagArray, options);

      // 返回搜索结果
      res.status(200).json({
        success: true,
        data: result.documents,
        pagination: result.pagination,
        message: '按标签搜索成功'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 全文搜索文档
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   * @param {Function} next - Express下一个中间件函数
   */
  async searchDocuments(req, res, next) {
    try {
      const { q, page, limit } = req.query;
      
      // 参数验证
      if (!q) {
        return res.status(400).json({
          success: false,
          message: '请提供搜索关键词'
        });
      }
      
      if (q.length < 2) {
        return res.status(400).json({
          success: false,
          message: '搜索关键词至少需要2个字符'
        });
      }

      // 解析分页参数
      const options = {
        page: page ? parseInt(page) : 1,
        limit: limit ? Math.min(parseInt(limit), 50) : 20 // 限制最大50条
      };

      const result = await documentService.searchDocuments(q, options);

      // 返回搜索结果
      res.status(200).json({
        success: true,
        data: result.items,
        pagination: {
          page: result.page,
          limit: result.limit,
          hasMore: result.hasMore
        },
        message: '搜索成功'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取引用此文档的引用体列表
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   * @param {Function} next - Express下一个中间件函数
   */
  async getReferencingQuotes(req, res, next) {
    try {
      const { id } = req.params;
      
      // 解析查询参数
      const options = {
        page: req.query.page ? parseInt(req.query.page) : 1,
        limit: req.query.limit ? Math.min(parseInt(req.query.limit), 50) : 20,
        sort: req.query.sort || '-updatedAt',
        populate: req.query.populate || 'title' // 'title', 'full'
      };

      const result = await documentService.getReferencingQuotes(id, options);

      // 返回成功响应
      res.status(200).json({
        success: true,
        data: result.quotes,
        pagination: result.pagination,
        message: '获取引用体列表成功'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取文档统计信息
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   * @param {Function} next - Express下一个中间件函数
   */
  async getDocumentStats(req, res, next) {
    try {
      const stats = await documentService.getDocumentStats();

      // 返回统计信息
      res.status(200).json({
        success: true,
        data: stats,
        message: '获取统计信息成功'
      });
    } catch (error) {
      next(error);
    }
  }
}

// 导出控制器实例
module.exports = new DocumentController();