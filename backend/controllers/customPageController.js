/**
 * 自定义页面控制器层
 * 处理HTTP请求和响应，调用服务层方法处理业务逻辑
 */

const customPageService = require('../services/customPageService');

/**
 * 自定义页面控制器类
 */
class CustomPageController {
  /**
   * 获取所有自定义页面
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   * @param {Function} next - Express下一个中间件函数
   */
  async getAllCustomPages(req, res, next) {
    try {
      // 从查询参数获取分页和排序选项
      const options = {
        page: req.query.page ? parseInt(req.query.page) : 1,
        limit: req.query.limit ? parseInt(req.query.limit) : 50,
        sort: req.query.sort || '-updatedAt'
      };

      const result = await customPageService.getAllCustomPages(options);

      // 返回成功响应
      res.status(200).json({
        success: true,
        data: result.customPages,
        pagination: result.pagination,
        message: '获取自定义页面列表成功'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 根据名称获取单个自定义页面
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   * @param {Function} next - Express下一个中间件函数
   */
  async getCustomPageByName(req, res, next) {
    try {
      const { name } = req.params;
      
      // 验证名称参数
      if (!name) {
        return res.status(400).json({
          success: false,
          message: '页面名称是必填项'
        });
      }
      
      // 解码URL编码的名称
      const decodedName = decodeURIComponent(name);
      
      // 解析查询参数
      const options = {
        populate: req.query.populate || 'ids', // 'full', 'ids'
        include: req.query.include || '' // 'counts', 'previews'
      };
      
      const customPage = await customPageService.getCustomPageByName(decodedName, options);

      // 返回成功响应
      res.status(200).json({
        success: true,
        data: customPage,
        message: '获取自定义页面成功'
      });
    } catch (error) {
      // 如果是页面不存在的错误，返回404
      if (error.message && error.message.includes('自定义页面不存在')) {
        return res.status(404).json({
          success: false,
          message: '自定义页面不存在'
        });
      }
      next(error);
    }
  }

  /**
   * 创建新自定义页面
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   * @param {Function} next - Express下一个中间件函数
   */
  async createCustomPage(req, res, next) {
    try {
      // 从请求体获取页面数据
      const pageData = {
        name: req.body.name,
        referencedDocumentIds: req.body.referencedDocumentIds,
        referencedQuoteIds: req.body.referencedQuoteIds,
        referencedAttachmentIds: req.body.referencedAttachmentIds,
        contentItems: req.body.contentItems
      };

      const customPage = await customPageService.createCustomPage(pageData);

      // 返回创建成功响应
      res.status(201).json({
        success: true,
        data: customPage,
        message: '自定义页面创建成功'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 更新自定义页面
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   * @param {Function} next - Express下一个中间件函数
   */
  async updateCustomPage(req, res, next) {
    try {
      const { id } = req.params;
      
      // 验证ObjectId
      if (!require('mongoose').Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: '无效的页面ID'
        });
      }
      
      // 从请求体获取更新数据
      const updateData = {};
      if (req.body.name !== undefined) updateData.name = req.body.name;
      if (req.body.referencedDocumentIds !== undefined) updateData.referencedDocumentIds = req.body.referencedDocumentIds;
      if (req.body.referencedQuoteIds !== undefined) updateData.referencedQuoteIds = req.body.referencedQuoteIds;
      if (req.body.referencedAttachmentIds !== undefined) updateData.referencedAttachmentIds = req.body.referencedAttachmentIds;
      if (req.body.contentItems !== undefined) updateData.contentItems = req.body.contentItems;

      // 解析查询参数，用于返回更新后的页面数据
      const options = {
        populate: req.query.populate || 'ids', // 'full', 'ids'
        include: req.query.include || '' // 'counts', 'previews'
      };

      const customPage = await customPageService.updateCustomPage(id, updateData, options);

      // 返回更新成功响应
      res.status(200).json({
        success: true,
        data: customPage,
        message: '自定义页面更新成功'
      });
    } catch (error) {
      // 如果是页面不存在的错误，返回404
      if (error.message && error.message.includes('自定义页面不存在')) {
        return res.status(404).json({
          success: false,
          message: '自定义页面不存在'
        });
      }
      next(error);
    }
  }

  /**
   * 删除自定义页面
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   * @param {Function} next - Express下一个中间件函数
   */
  async deleteCustomPage(req, res, next) {
    try {
      const { id } = req.params;
      
      // 验证ObjectId
      if (!require('mongoose').Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: '无效的页面ID'
        });
      }
      
      const result = await customPageService.deleteCustomPage(id);

      // 返回删除成功响应
      res.status(200).json({
        success: true,
        data: {
          id: result.id,
          name: result.name,
          counts: result.counts
        },
        message: '自定义页面删除成功'
      });
    } catch (error) {
      // 如果是页面不存在的错误，返回404
      if (error.message && error.message.includes('自定义页面不存在')) {
        return res.status(404).json({
          success: false,
          message: '自定义页面不存在'
        });
      }
      next(error);
    }
  }

  /**
   * 搜索自定义页面
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   * @param {Function} next - Express下一个中间件函数
   */
  async searchCustomPages(req, res, next) {
    try {
      const { q } = req.query;
      
      // 参数验证
      if (!q) {
        return res.status(400).json({
          success: false,
          message: '请提供搜索关键词'
        });
      }
      
      if (q.length < 1) {
        return res.status(400).json({
          success: false,
          message: '搜索关键词至少需要1个字符'
        });
      }

      // 解析分页参数
      const options = {
        page: req.query.page ? parseInt(req.query.page) : 1,
        limit: req.query.limit ? Math.min(parseInt(req.query.limit), 50) : 20, // 限制最大50条
        sort: req.query.sort || '-updatedAt'
      };

      const result = await customPageService.searchCustomPages(q, options);

      // 返回搜索结果
      res.status(200).json({
        success: true,
        data: result.customPages,
        pagination: result.pagination,
        message: '搜索成功'
      });
    } catch (error) {
      next(error);
    }
  }
}

// 导出控制器实例
module.exports = new CustomPageController();