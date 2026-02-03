/**
 * 文档版本API服务
 * 封装文档版本提交/查询相关的API调用
 */

import apiClient from './apiClient';

export const listDocumentVersions = async (documentId, options = {}) => {
  const response = await apiClient.get(`/documents/${documentId}/versions`, {
    params: options,
  });
  return response.data;
};

export const getDocumentVersion = async (documentId, versionId) => {
  const response = await apiClient.get(`/documents/${documentId}/versions/${versionId}`);
  return response.data;
};

export const createDocumentVersion = async (documentId, payload) => {
  const response = await apiClient.post(`/documents/${documentId}/versions`, payload);
  return response.data;
};

const documentVersionsService = {
  listDocumentVersions,
  getDocumentVersion,
  createDocumentVersion,
};

export default documentVersionsService;

