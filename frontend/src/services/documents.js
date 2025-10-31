/**
 * 文档API服务
 * 封装文档相关的API调用
 */

import apiClient from './apiClient';

/**
 * 创建新文档
 * @param {Object} documentData - 文档数据
 * @param {String} documentData.title - 文档标题
 * @param {String} documentData.content - 文档内容
 * @param {String} documentData.htmlContent - HTML内容
 * @param {Array} documentData.tags - 文档标签数组
 * @param {String} documentData.source - 文档来源
 * @param {Array} documentData.referencedAttachmentIds - 引用的附件ID数组
 * @returns {Promise} 创建的文档
 */
export const createDocument = async (documentData) => {
  const response = await apiClient.post('/documents', documentData);
  return response.data;
};

/**
 * 更新文档
 * @param {String} id - 文档ID
 * @param {Object} updateData - 更新数据
 * @param {Array} updateData.referencedDocumentIds - 引用的笔记ID数组
 * @param {Array} updateData.referencedAttachmentIds - 引用的附件ID数组
 * @param {Object} options - 查询选项
 * @param {String} options.populate - 是否填充引用的数据 ('title', 'full')
 * @param {String} options.include - 是否包含统计信息 ('referencingQuotes')
 * @returns {Promise} 更新后的文档
 */
export const updateDocument = async (id, updateData, options = {}) => {
  const response = await apiClient.put(`/documents/${id}`, updateData, {
    params: options
  });
  return response.data;
};

export default {
  createDocument,
  updateDocument
};