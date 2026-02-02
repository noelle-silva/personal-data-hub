/**
 * 收藏夹控制器层
 * 处理HTTP请求和响应，调用服务层方法处理业务逻辑
 */

const quoteService = require('../services/quoteService');

/**
 * 收藏夹控制器类
 */
class QuoteController {
  /**
   * 获取所有收藏夹
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   * @param {Function} next - Express下一个中间件函数
   */
  async getAllQuotes(req, res, next) {
    try {
      // 从查询参数获取分页和排序选项
      const options = {
        page: req.query.page ? parseInt(req.query.page) : 1,
        limit: req.query.limit ? Math.min(parseInt(req.query.limit), 50) : 10,
        sort: req.query.sort || '-createdAt',
        populate: req.query.populate || 'title',
        raw: req.query.raw === 'true'
      };

      // 验证排序字段
      const allowedSortFields = [
        'createdAt', '-createdAt',
        'updatedAt', '-updatedAt',
        'title', '-title'
      ];
      
      if (!allowedSortFields.includes(options.sort)) {
        options.sort = '-createdAt';
      }

      const result = await quoteService.getAllQuotes(options);

      // 返回成功响应
      res.status(200).json({
        success: true,
        data: result.quotes,
        pagination: result.pagination,
        message: '获取收藏夹列表成功'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 根据ID获取单个收藏夹
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   * @param {Function} next - Express下一个中间件函数
   */
  async getQuoteById(req, res, next) {
    try {
      const { id } = req.params;
      
      // 验证ObjectId
      if (!require('mongoose').Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: '无效的收藏夹ID'
        });
      }
      
      const options = {
        populate: req.query.populate || 'title',
        raw: req.query.raw === 'true'
      };
      
      const quote = await quoteService.getQuoteById(id, options.populate, options.raw);

      // 返回成功响应
      res.status(200).json({
        success: true,
        data: quote,
        message: '获取收藏夹成功'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 创建新收藏夹
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   * @param {Function} next - Express下一个中间件函数
   */
  async createQuote(req, res, next) {
    try {
      // 从请求体获取收藏夹数据
      const quoteData = {
        title: req.body.title,
        description: req.body.description,
        content: req.body.content,
        tags: req.body.tags,
        referencedDocumentIds: req.body.referencedDocumentIds,
        referencedAttachmentIds: req.body.referencedAttachmentIds,
        referencedQuoteIds: req.body.referencedQuoteIds
      };

      // 验证必填字段
      if (!quoteData.title || !quoteData.content) {
        return res.status(400).json({
          success: false,
          message: '标题和内容是必填项'
        });
      }

      // 验证描述长度
      if (quoteData.description && quoteData.description.length > 300) {
        return res.status(400).json({
          success: false,
          message: '描述不能超过300个字符'
        });
      }

      // 验证引用的文档ID数组
      if (quoteData.referencedDocumentIds) {
        if (!Array.isArray(quoteData.referencedDocumentIds)) {
          return res.status(400).json({
            success: false,
            message: '引用的文档ID必须是数组'
          });
        }

        // 验证每个ID是否为有效的ObjectId
        for (const id of quoteData.referencedDocumentIds) {
          if (!require('mongoose').Types.ObjectId.isValid(id)) {
            return res.status(400).json({
              success: false,
              message: `无效的文档ID: ${id}`
            });
          }
        }
      }

      // 验证引用的附件ID数组
      if (quoteData.referencedAttachmentIds) {
        if (!Array.isArray(quoteData.referencedAttachmentIds)) {
          return res.status(400).json({
            success: false,
            message: '引用的附件ID必须是数组'
          });
        }

        // 验证每个ID是否为有效的ObjectId
        for (const id of quoteData.referencedAttachmentIds) {
          if (!require('mongoose').Types.ObjectId.isValid(id)) {
            return res.status(400).json({
              success: false,
              message: `无效的附件ID: ${id}`
            });
          }
        }
      }

      // 验证引用的收藏夹ID数组
      if (quoteData.referencedQuoteIds) {
        if (!Array.isArray(quoteData.referencedQuoteIds)) {
          return res.status(400).json({
            success: false,
            message: '引用的收藏夹ID必须是数组'
          });
        }

        // 验证每个ID是否为有效的ObjectId
        for (const id of quoteData.referencedQuoteIds) {
          if (!require('mongoose').Types.ObjectId.isValid(id)) {
            return res.status(400).json({
              success: false,
              message: `无效的收藏夹ID: ${id}`
            });
          }
        }
      }

      const quote = await quoteService.createQuote(quoteData);

      // 返回创建成功响应
      res.status(201).json({
        success: true,
        data: quote,
        message: '收藏夹创建成功'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 更新收藏夹
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   * @param {Function} next - Express下一个中间件函数
   */
  async updateQuote(req, res, next) {
    try {
      const { id } = req.params;
      
      // 验证ObjectId
      if (!require('mongoose').Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: '无效的收藏夹ID'
        });
      }
      
      // 从请求体获取更新数据
      const updateData = {};
      if (req.body.title !== undefined) updateData.title = req.body.title;
      if (req.body.description !== undefined) updateData.description = req.body.description;
      if (req.body.content !== undefined) updateData.content = req.body.content;
      if (req.body.tags !== undefined) updateData.tags = req.body.tags;
      if (req.body.referencedDocumentIds !== undefined) updateData.referencedDocumentIds = req.body.referencedDocumentIds;
      if (req.body.referencedAttachmentIds !== undefined) updateData.referencedAttachmentIds = req.body.referencedAttachmentIds;
      if (req.body.referencedQuoteIds !== undefined) updateData.referencedQuoteIds = req.body.referencedQuoteIds;

      // 验证描述长度
      if (updateData.description && updateData.description.length > 300) {
        return res.status(400).json({
          success: false,
          message: '描述不能超过300个字符'
        });
      }

      // 验证引用的文档ID数组
      if (updateData.referencedDocumentIds) {
        if (!Array.isArray(updateData.referencedDocumentIds)) {
          return res.status(400).json({
            success: false,
            message: '引用的文档ID必须是数组'
          });
        }

        // 验证每个ID是否为有效的ObjectId
        for (const docId of updateData.referencedDocumentIds) {
          if (!require('mongoose').Types.ObjectId.isValid(docId)) {
            return res.status(400).json({
              success: false,
              message: `无效的文档ID: ${docId}`
            });
          }
        }
      }

      // 验证引用的附件ID数组
      if (updateData.referencedAttachmentIds) {
        if (!Array.isArray(updateData.referencedAttachmentIds)) {
          return res.status(400).json({
            success: false,
            message: '引用的附件ID必须是数组'
          });
        }

        // 验证每个ID是否为有效的ObjectId
        for (const attachmentId of updateData.referencedAttachmentIds) {
          if (!require('mongoose').Types.ObjectId.isValid(attachmentId)) {
            return res.status(400).json({
              success: false,
              message: `无效的附件ID: ${attachmentId}`
            });
          }
        }
      }

      // 验证引用的收藏夹ID数组
      if (updateData.referencedQuoteIds) {
        if (!Array.isArray(updateData.referencedQuoteIds)) {
          return res.status(400).json({
            success: false,
            message: '引用的收藏夹ID必须是数组'
          });
        }

        // 验证每个ID是否为有效的ObjectId
        for (const quoteId of updateData.referencedQuoteIds) {
          if (!require('mongoose').Types.ObjectId.isValid(quoteId)) {
            return res.status(400).json({
              success: false,
              message: `无效的收藏夹ID: ${quoteId}`
            });
          }
          
          // 检查自引用
          if (quoteId === id) {
            return res.status(400).json({
              success: false,
              message: '不能引用自身'
            });
          }
        }
      }

      const quote = await quoteService.updateQuote(id, updateData);

      // 返回更新成功响应
      res.status(200).json({
        success: true,
        data: quote,
        message: '收藏夹更新成功'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 删除收藏夹
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   * @param {Function} next - Express下一个中间件函数
   */
  async deleteQuote(req, res, next) {
    try {
      const { id } = req.params;
      
      // 验证ObjectId
      if (!require('mongoose').Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: '无效的收藏夹ID'
        });
      }
      
      const result = await quoteService.deleteQuote(id);

      // 返回删除成功响应
      res.status(200).json({
        success: true,
        data: result,
        message: '收藏夹删除成功'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 按标签搜索收藏夹
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   * @param {Function} next - Express下一个中间件函数
   */
  async searchByTags(req, res, next) {
    try {
      const { tags, mode = 'all', page, limit, sort = '-updatedAt', populate, raw } = req.query;
      
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

      // 验证排序字段
      const allowedSortFields = [
        'createdAt', '-createdAt',
        'updatedAt', '-updatedAt',
        'title', '-title'
      ];
      
      const validatedSort = allowedSortFields.includes(sort) ? sort : '-updatedAt';

      // 构建查询选项
      const options = {
        mode, // 'all' 或 'any'
        page: page ? parseInt(page) : 1,
        limit: limit ? Math.min(parseInt(limit), 50) : 20, // 限制最大50条
        sort: validatedSort,
        populate: populate || 'title',
        raw: raw === 'true'
      };

      const result = await quoteService.searchByTags(tagArray, options);

      // 返回搜索结果
      res.status(200).json({
        success: true,
        data: result.quotes,
        pagination: result.pagination,
        message: '按标签搜索收藏夹成功'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 全文搜索收藏夹
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   * @param {Function} next - Express下一个中间件函数
   */
  async searchQuotes(req, res, next) {
    try {
      const { q, page, limit, sort, populate, raw } = req.query;
      
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

      // 验证排序字段
      const allowedSortFields = [
        'createdAt', '-createdAt',
        'updatedAt', '-updatedAt',
        'title', '-title'
      ];
      
      const validatedSort = allowedSortFields.includes(sort) ? sort : '-updatedAt';

      // 解析分页参数
      const options = {
        page: page ? parseInt(page) : 1,
        limit: limit ? Math.min(parseInt(limit), 50) : 20, // 限制最大50条
        sort: validatedSort,
        populate: populate || 'title',
        raw: raw === 'true'
      };

      const result = await quoteService.searchQuotes(q, options);

      // 返回搜索结果
      res.status(200).json({
        success: true,
        data: result.items,
        pagination: {
          page: result.page,
          limit: result.limit,
          hasMore: result.hasMore
        },
        message: '搜索收藏夹成功'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 复合搜索收藏夹（支持关键词和标签）
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   * @param {Function} next - Express下一个中间件函数
   */
  async searchQuotesCombined(req, res, next) {
    try {
      const { q, tags, mode = 'all', page, limit, sort, populate, raw } = req.query;
      
      // 参数验证
      if (!q && !tags) {
        return res.status(400).json({
          success: false,
          message: '请提供搜索关键词或标签'
        });
      }
      
      if (q && q.length < 2) {
        return res.status(400).json({
          success: false,
          message: '搜索关键词至少需要2个字符'
        });
      }

      // 处理标签
      let tagArray = [];
      if (tags) {
        tagArray = Array.isArray(tags) ? tags : tags.split(',');
        tagArray = [...new Set(tagArray.map(tag => tag.trim()).filter(tag => tag))];
      }

      // 验证排序字段
      const allowedSortFields = [
        'createdAt', '-createdAt',
        'updatedAt', '-updatedAt',
        'title', '-title'
      ];
      
      const validatedSort = allowedSortFields.includes(sort) ? sort : '-updatedAt';

      // 解析分页参数
      const options = {
        mode, // 'all' 或 'any'
        page: page ? parseInt(page) : 1,
        limit: limit ? Math.min(parseInt(limit), 50) : 20, // 限制最大50条
        sort: validatedSort,
        populate: populate || 'title',
        raw: raw === 'true'
      };

      const result = await quoteService.searchQuotesCombined(q, tagArray, options);

      // 返回搜索结果
      res.status(200).json({
        success: true,
        data: result.items,
        pagination: {
          page: result.page,
          limit: result.limit,
          hasMore: result.hasMore
        },
        message: '复合搜索收藏夹成功'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取收藏夹统计信息
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   * @param {Function} next - Express下一个中间件函数
   */
  async getQuoteStats(req, res, next) {
    try {
      const stats = await quoteService.getQuoteStats();

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
module.exports = new QuoteController();