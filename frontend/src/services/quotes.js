/**
 * 引用体API服务
 * 封装引用体相关的API调用
 */

import apiClient from './apiClient';

/**
 * 更新引用体
 * @param {String} id - 引用体ID
 * @param {Object} updateData - 更新数据
 * @param {Array} updateData.referencedDocumentIds - 引用的笔记ID数组
 * @param {Array} updateData.referencedAttachmentIds - 引用的附件ID数组
 * @param {Array} updateData.referencedQuoteIds - 引用的引用体ID数组
 * @param {Object} options - 查询选项
 * @param {String} options.populate - 是否填充引用的数据 ('title', 'full')
 * @returns {Promise} 更新后的引用体
 */
export const updateQuote = async (id, updateData, options = {}) => {
  const response = await apiClient.put(`/quotes/${id}`, updateData, {
    params: options
  });
  return response.data;
};

export default {
  updateQuote
};