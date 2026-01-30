/**
 * 自定义页面API服务
 * 封装自定义页面相关的API调用
 */

import apiClient from './apiClient';

/**
 * 获取所有自定义页面列表
 * @param {Object} options - 查询选项
 * @param {Number} options.page - 页码
 * @param {Number} options.limit - 每页数量
 * @param {String} options.sort - 排序字段
 * @returns {Promise} 自定义页面列表和分页信息
 */
export const listPages = async (options = {}) => {
  const response = await apiClient.get('/custom-pages', {
    params: options
  });
  return response.data;
};

/**
 * 根据名称获取自定义页面详情
 * @param {String} name - 页面名称
 * @param {Object} options - 查询选项
 * @param {String} options.populate - 是否填充引用的数据 ('full', 'ids')
 * @param {String} options.include - 是否包含统计信息 ('counts')
 * @returns {Promise} 自定义页面对象
 */
export const getByName = async (name, options = {}) => {
  const response = await apiClient.get(`/custom-pages/by-name/${encodeURIComponent(name)}`, {
    params: options
  });
  return response.data;
};

/**
 * 创建新自定义页面
 * @param {Object} pageData - 页面数据
 * @param {String} pageData.name - 页面名称
 * @param {Array} pageData.referencedDocumentIds - 引用的笔记ID数组
 * @param {Array} pageData.referencedQuoteIds - 引用的引用体ID数组
 * @param {Array} pageData.referencedAttachmentIds - 引用的附件ID数组
 * @returns {Promise} 新创建的自定义页面
 */
export const createPage = async (pageData) => {
  const response = await apiClient.post('/custom-pages', pageData);
  return response.data;
};

/**
 * 更新自定义页面
 * @param {String} id - 页面ID
 * @param {Object} updateData - 更新数据
 * @param {String} updateData.name - 页面名称
 * @param {Array} updateData.referencedDocumentIds - 引用的笔记ID数组
 * @param {Array} updateData.referencedQuoteIds - 引用的引用体ID数组
 * @param {Array} updateData.referencedAttachmentIds - 引用的附件ID数组
 * @param {Object} options - 查询选项
 * @param {String} options.populate - 是否填充引用的数据 ('full', 'ids')
 * @param {String} options.include - 是否包含统计信息 ('counts')
 * @returns {Promise} 更新后的自定义页面
 */
export const updatePage = async (id, updateData, options = {}) => {
  const response = await apiClient.put(`/custom-pages/${id}`, updateData, {
    params: options
  });
  return response.data;
};

/**
 * 删除自定义页面
 * @param {String} id - 页面ID
 * @returns {Promise} 删除结果
 */
export const deletePage = async (id) => {
  const response = await apiClient.delete(`/custom-pages/${id}`);
  return response.data;
};

/**
 * 搜索自定义页面
 * @param {String} searchTerm - 搜索关键词
 * @param {Object} options - 查询选项
 * @param {Number} options.page - 页码
 * @param {Number} options.limit - 每页数量
 * @param {String} options.sort - 排序字段
 * @returns {Promise} 搜索结果
 */
export const searchPages = async (searchTerm, options = {}) => {
  const response = await apiClient.get('/custom-pages/search', {
    params: {
      q: searchTerm,
      ...options
    }
  });
  return response.data;
};

const customPagesService = {
  listPages,
  getByName,
  createPage,
  updatePage,
  deletePage,
  searchPages,
};

export default customPagesService;
