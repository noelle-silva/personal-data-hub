/**
 * 自定义页面服务层
 * 封装自定义页面相关的业务逻辑，与数据访问层交互
 */

const mongoose = require('mongoose');
const CustomPage = require('../models/CustomPage');
const Document = require('../models/Document');
const Quote = require('../models/Quote');
const Attachment = require('../models/Attachment');
const HttpError = require('../utils/HttpError');

/**
 * 自定义页面服务类
 */
class CustomPageService {
  /**
   * 获取所有自定义页面
   * @param {Object} options - 查询选项
   * @param {Number} options.page - 页码
   * @param {Number} options.limit - 每页数量
   * @param {String} options.sort - 排序字段
   * @returns {Promise} 自定义页面列表和分页信息
   */
  async getAllCustomPages(options = {}) {
    const {
      page = 1,
      limit = 50,
      sort = '-updatedAt'
    } = options;

    const nLimit = parseInt(limit);
    const nPage = parseInt(page);

    // 计算跳过的页面数量
    const skip = (nPage - 1) * nLimit;

    try {
      // 查询自定义页面总数
      const total = await CustomPage.countDocuments();
      
      // 构建查询
      let query = CustomPage.find().sort(sort);

      if (nLimit > 0) {
        query = query.skip(skip).limit(nLimit);
      }

      const customPages = await query.exec();

      // 为每个页面添加引用统计
      const pagesWithCounts = customPages.map(page => {
        const pageObj = page.toObject();
        pageObj.counts = {
          documents: page.referencedDocumentIds.length,
          quotes: page.referencedQuoteIds.length,
          attachments: page.referencedAttachmentIds.length
        };
        return pageObj;
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
        customPages: pagesWithCounts,
        pagination
      };
    } catch (error) {
      if (error.statusCode) throw error;
      throw new Error(`获取自定义页面列表失败: ${error.message}`);
    }
  }

  /**
   * 根据名称获取单个自定义页面
   * @param {String} name - 页面名称
   * @param {Object} options - 查询选项
   * @param {String} options.populate - 是否填充引用的数据 ('full', 'ids')
   * @param {String} options.include - 是否包含统计信息 ('counts')
   * @returns {Promise} 自定义页面对象
   */
  async getCustomPageByName(name, options = {}) {
    try {
      const {
        populate = 'ids',
        include = ''
      } = options;

      // 构建查询
      let query = CustomPage.findOne({ name });
      
      // 处理引用数据的填充
      if (populate === 'full') {
        // 根据是否包含预览内容来决定选择的字段
        const includePreviews = include.includes('previews');
        
        // 填充引用的文档信息
        query = query.populate({
          path: 'referencedDocumentIds',
          select: includePreviews
            ? '_id title tags updatedAt summary content htmlContent source'
            : '_id title tags updatedAt summary'
        });
        
        // 填充引用的引用体信息
        query = query.populate({
          path: 'referencedQuoteIds',
          select: includePreviews
            ? '_id title tags updatedAt summary description'
            : '_id title tags updatedAt summary',
          // 嵌套填充引用的文档信息，以便 QuoteCard 显示引用笔记
          populate: {
            path: 'referencedDocumentIds',
            select: '_id title'
          }
        });
        
        // 填充引用的附件信息
        query = query.populate({
          path: 'referencedAttachmentIds',
          select: '_id originalName category mimeType size updatedAt'
        });
      }
      
      // 执行查询获取页面
      const customPage = await query.exec();
      
      if (!customPage) {
        throw new HttpError(404, '自定义页面不存在', 'CUSTOM_PAGE_NOT_FOUND');
      }
      
      // 转换为普通对象以便添加额外字段
      const result = customPage.toObject();
      
      // 如果需要包含统计信息
      if (include.includes('counts')) {
        result.counts = {
          documents: customPage.referencedDocumentIds.length,
          quotes: customPage.referencedQuoteIds.length,
          attachments: customPage.referencedAttachmentIds.length
        };
      }
      
      // 处理 contentItems
      if (!result.contentItems || result.contentItems.length === 0) {
        // 如果 contentItems 为空，根据引用数组生成默认内容项
        if (populate === 'full') {
          result.contentItems = CustomPage.generateDefaultContentItems(
            customPage.referencedDocumentIds || [],
            customPage.referencedQuoteIds || [],
            customPage.referencedAttachmentIds || []
          );
        } else {
          // 如果没有填充数据，返回空的 contentItems
          result.contentItems = [];
        }
      }
      
      return result;
    } catch (error) {
      if (error.statusCode) throw error;
      throw new Error(`获取自定义页面失败: ${error.message}`);
    }
  }

  /**
   * 创建新自定义页面
   * @param {Object} pageData - 页面数据
   * @returns {Promise} 新创建的自定义页面
   */
  async createCustomPage(pageData) {
    try {
      // 验证必填字段
      if (!pageData.name) {
        throw new Error('页面名称是必填项');
      }

      // 生成唯一名称（如果重名会自动添加序号）
      const uniqueName = await CustomPage.generateUniqueName(pageData.name);
      
      // 如果提供了引用数据，进行验证
      if (pageData.referencedDocumentIds && pageData.referencedDocumentIds.length > 0) {
        await CustomPage.validateReferencedDocuments(pageData.referencedDocumentIds);
      }
      
      if (pageData.referencedQuoteIds && pageData.referencedQuoteIds.length > 0) {
        await CustomPage.validateReferencedQuotes(pageData.referencedQuoteIds);
      }
      
      if (pageData.referencedAttachmentIds && pageData.referencedAttachmentIds.length > 0) {
        await CustomPage.validateReferencedAttachments(pageData.referencedAttachmentIds);
      }
      
      // 处理 contentItems
      let contentItems = pageData.contentItems || [];
      
      // 如果提供了 contentItems，进行验证
      if (contentItems.length > 0) {
        await CustomPage.validateContentItems(contentItems);
      } else {
        // 如果没有提供 contentItems，但提供了引用数组，则生成默认内容项
        const hasReferences = (
          (pageData.referencedDocumentIds && pageData.referencedDocumentIds.length > 0) ||
          (pageData.referencedQuoteIds && pageData.referencedQuoteIds.length > 0) ||
          (pageData.referencedAttachmentIds && pageData.referencedAttachmentIds.length > 0)
        );
        
        if (hasReferences) {
          // 获取引用的详细数据以生成默认排序
          const documents = pageData.referencedDocumentIds ?
            await mongoose.model('Document').find({ _id: { $in: pageData.referencedDocumentIds } }) : [];
          
          const quotes = pageData.referencedQuoteIds ?
            await mongoose.model('Quote').find({ _id: { $in: pageData.referencedQuoteIds } }) : [];
          
          const attachments = pageData.referencedAttachmentIds ?
            await mongoose.model('Attachment').find({ _id: { $in: pageData.referencedAttachmentIds } }) : [];
          
          contentItems = CustomPage.generateDefaultContentItems(documents, quotes, attachments);
        }
      }
      
      // 创建新自定义页面
      const customPage = new CustomPage({
        name: uniqueName,
        referencedDocumentIds: pageData.referencedDocumentIds || [],
        referencedQuoteIds: pageData.referencedQuoteIds || [],
        referencedAttachmentIds: pageData.referencedAttachmentIds || [],
        contentItems
      });

      // 保存到数据库
      const savedPage = await customPage.save();
      
      return savedPage;
    } catch (error) {
      if (error.statusCode) throw error;
      throw new Error(`创建自定义页面失败: ${error.message}`);
    }
  }

  /**
   * 更新自定义页面
   * @param {String} id - 页面ID
   * @param {Object} updateData - 更新数据
   * @param {Object} options - 查询选项
   * @returns {Promise} 更新后的自定义页面
   */
  async updateCustomPage(id, updateData, options = {}) {
    try {
      // 获取当前页面数据
      const currentPage = await CustomPage.findById(id);
      if (!currentPage) {
        throw new HttpError(404, '自定义页面不存在', 'CUSTOM_PAGE_NOT_FOUND');
      }
      
      // 如果更新包含名称，进行重名检查和处理
      if (updateData.name) {
        // 如果名称没有变化，不需要处理重名
        if (currentPage.name !== updateData.name) {
          // 生成唯一名称
          const uniqueName = await CustomPage.generateUniqueName(updateData.name);
          updateData.name = uniqueName;
        }
      }
      
      // 如果更新包含引用文档，进行验证
      if (updateData.referencedDocumentIds) {
        await CustomPage.validateReferencedDocuments(updateData.referencedDocumentIds);
      }
      
      // 如果更新包含引用引用体，进行验证
      if (updateData.referencedQuoteIds) {
        await CustomPage.validateReferencedQuotes(updateData.referencedQuoteIds);
      }
      
      // 如果更新包含引用附件，进行验证
      if (updateData.referencedAttachmentIds) {
        await CustomPage.validateReferencedAttachments(updateData.referencedAttachmentIds);
      }
      
      // 处理 contentItems
      let finalUpdateData = { ...updateData };
      
      // 如果提供了 contentItems，进行验证
      if (updateData.contentItems) {
        await CustomPage.validateContentItems(updateData.contentItems);
        
        // 根据 contentItems 更新引用数组
        const documentIds = updateData.contentItems
          .filter(item => item.kind === 'Document')
          .map(item => item.refId);
        
        const quoteIds = updateData.contentItems
          .filter(item => item.kind === 'Quote')
          .map(item => item.refId);
        
        const attachmentIds = updateData.contentItems
          .filter(item => item.kind === 'Attachment')
          .map(item => item.refId);
        
        // 更新引用数组
        finalUpdateData.referencedDocumentIds = documentIds;
        finalUpdateData.referencedQuoteIds = quoteIds;
        finalUpdateData.referencedAttachmentIds = attachmentIds;
      } else if (
        updateData.referencedDocumentIds ||
        updateData.referencedQuoteIds ||
        updateData.referencedAttachmentIds
      ) {
        // 如果只更新了引用数组而没有提供 contentItems，则自动对齐
        // 注意：syncContentItemsWithReferences 会将新增项插入到最前面
        const documentIds = updateData.referencedDocumentIds || currentPage.referencedDocumentIds || [];
        const quoteIds = updateData.referencedQuoteIds || currentPage.referencedQuoteIds || [];
        const attachmentIds = updateData.referencedAttachmentIds || currentPage.referencedAttachmentIds || [];
        
        // 使用同步方法对齐 contentItems
        const syncedData = CustomPage.syncContentItemsWithReferences(
          currentPage.contentItems || [],
          documentIds,
          quoteIds,
          attachmentIds
        );
        
        finalUpdateData.contentItems = syncedData.contentItems;
        finalUpdateData.referencedDocumentIds = syncedData.referencedDocumentIds;
        finalUpdateData.referencedQuoteIds = syncedData.referencedQuoteIds;
        finalUpdateData.referencedAttachmentIds = syncedData.referencedAttachmentIds;
      }
      
      // 查找并更新自定义页面
      const customPage = await CustomPage.findByIdAndUpdate(
        id,
        finalUpdateData,
        { new: true, runValidators: true }
      );

      if (!customPage) {
        throw new HttpError(404, '自定义页面不存在', 'CUSTOM_PAGE_NOT_FOUND');
      }

      // 如果有查询选项，重新获取完整数据
      if (options.populate || options.include) {
        return await this.getCustomPageByName(customPage.name, options);
      }

      return customPage;
    } catch (error) {
      if (error.statusCode) throw error;
      throw new Error(`更新自定义页面失败: ${error.message}`);
    }
  }

  /**
   * 删除自定义页面
   * @param {String} id - 页面ID
   * @returns {Promise} 删除结果
   */
  async deleteCustomPage(id) {
    try {
      const customPage = await CustomPage.findById(id);
      
      if (!customPage) {
        throw new HttpError(404, '自定义页面不存在', 'CUSTOM_PAGE_NOT_FOUND');
      }

      // 获取删除前的引用统计
      const counts = {
        documents: customPage.referencedDocumentIds.length,
        quotes: customPage.referencedQuoteIds.length,
        attachments: customPage.referencedAttachmentIds.length
      };

      // 删除页面
      await CustomPage.findByIdAndDelete(id);

      return { 
        message: '自定义页面删除成功', 
        id,
        name: customPage.name,
        counts
      };
    } catch (error) {
      if (error.statusCode) throw error;
      throw new Error(`删除自定义页面失败: ${error.message}`);
    }
  }

  /**
   * 搜索自定义页面
   * @param {String} searchTerm - 搜索关键词
   * @param {Object} options - 查询选项
   * @returns {Promise} 匹配的自定义页面列表和分页信息
   */
  async searchCustomPages(searchTerm, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        sort = '-updatedAt'
      } = options;
      
      const nLimit = parseInt(limit);
      const nPage = parseInt(page);

      // 计算总数
      const total = await CustomPage.countDocuments({
        name: { $regex: searchTerm, $options: 'i' }
      });

      // 构建查询
      let query = CustomPage.find({
        name: { $regex: searchTerm, $options: 'i' }
      }).sort(sort);

      // 处理分页
      if (nLimit > 0) {
        const skip = (nPage - 1) * nLimit;
        query = query.skip(skip).limit(nLimit);
      }

      // 执行查询
      const customPages = await query.exec();

      // 为每个页面添加引用统计
      const pagesWithCounts = customPages.map(page => {
        const pageObj = page.toObject();
        pageObj.counts = {
          documents: page.referencedDocumentIds.length,
          quotes: page.referencedQuoteIds.length,
          attachments: page.referencedAttachmentIds.length
        };
        return pageObj;
      });

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
        customPages: pagesWithCounts,
        pagination
      };
    } catch (error) {
      if (error.statusCode) throw error;
      throw new Error(`搜索自定义页面失败: ${error.message}`);
    }
  }
}

// 导出服务实例
module.exports = new CustomPageService();
