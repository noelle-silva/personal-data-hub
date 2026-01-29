/**
 * 附件服务
 * 封装所有与附件相关的 API 调用
 */

import apiClient from './apiClient';
import { resolveApiUrl } from './serverConfig';

/**
 * 获取附件列表
 * @param {Object} params - 查询参数
 * @param {number} params.page - 页码 (默认: 1)
 * @param {number} params.limit - 每页数量 (默认: 20)
 * @param {string} params.sort - 排序字段 (默认: '-createdAt')
 * @param {string} params.category - 附件类别 (可选)
 * @returns {Promise<Object>} 附件列表和分页信息
 */
export const getAttachments = async (params = {}) => {
  const {
    page = 1,
    limit = 20,
    sort = '-createdAt',
    category = null
  } = params;

  const queryParams = new URLSearchParams();
  queryParams.append('page', page.toString());
  queryParams.append('limit', limit.toString());
  queryParams.append('sort', sort);
  if (category) {
    queryParams.append('category', category);
  }

  try {
    const response = await apiClient.get(`/attachments?${queryParams.toString()}`);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

/**
 * 搜索附件
 * @param {Object} params - 查询参数
 * @param {string} params.q - 搜索关键词 (必填，至少2个字符)
 * @param {number} params.page - 页码 (默认: 1)
 * @param {number} params.limit - 每页数量 (默认: 20)
 * @param {string} params.sort - 排序字段 (默认: '-createdAt')
 * @param {string} params.category - 附件类别 (可选)
 * @returns {Promise<Object>} 搜索结果和分页信息
 */
export const searchAttachments = async (params = {}) => {
  const {
    q,
    page = 1,
    limit = 20,
    sort = '-createdAt',
    category = null
  } = params;

  if (!q || q.length < 2) {
    throw new Error('搜索关键词至少需要2个字符');
  }

  const queryParams = new URLSearchParams();
  queryParams.append('q', q);
  queryParams.append('page', page.toString());
  queryParams.append('limit', limit.toString());
  queryParams.append('sort', sort);
  if (category) {
    queryParams.append('category', category);
  }

  try {
    const response = await apiClient.get(`/attachments/search?${queryParams.toString()}`);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

/**
 * 获取附件统计信息
 * @returns {Promise<Object>} 附件统计信息
 */
export const getAttachmentStats = async () => {
  try {
    const response = await apiClient.get('/attachments/stats');
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

/**
 * 获取附件配置信息
 * @returns {Promise<Object>} 附件配置信息
 */
export const getAttachmentConfig = async () => {
  try {
    const response = await apiClient.get('/attachments/config');
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

/**
 * 通用上传附件方法
 * @param {File} file - 要上传的文件
 * @param {string} category - 附件类别
 * @param {Function} onUploadProgress - 上传进度回调
 * @returns {Promise<Object>} 上传结果
 */
export const uploadAttachment = async (file, category, onUploadProgress) => {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await apiClient.post(`/attachments/${category}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress,
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// 为了向后兼容，保留旧的API方法，但内部调用新的通用方法
/**
 * 上传图片文件
 * @param {File} file - 要上传的文件
 * @param {Function} onUploadProgress - 上传进度回调
 * @returns {Promise<Object>} 上传结果
 */
export const uploadImage = async (file, onUploadProgress) => {
  return uploadAttachment(file, 'image', onUploadProgress);
};

/**
 * 上传视频文件
 * @param {File} file - 要上传的文件
 * @param {Function} onUploadProgress - 上传进度回调
 * @returns {Promise<Object>} 上传结果
 */
export const uploadVideo = async (file, onUploadProgress) => {
  return uploadAttachment(file, 'video', onUploadProgress);
};

/**
 * 上传文档文件
 * @param {File} file - 要上传的文件
 * @param {Function} onUploadProgress - 上传进度回调
 * @returns {Promise<Object>} 上传结果
 */
export const uploadDocument = async (file, onUploadProgress) => {
  return uploadAttachment(file, 'document', onUploadProgress);
};

/**
 * 上传程序与脚本文件
 * @param {File} file - 要上传的文件
 * @param {Function} onUploadProgress - 上传进度回调
 * @returns {Promise<Object>} 上传结果
 */
export const uploadScript = async (file, onUploadProgress) => {
  return uploadAttachment(file, 'script', onUploadProgress);
};

/**
 * 获取附件元数据
 * @param {string} id - 附件ID
 * @returns {Promise<Object>} 附件元数据
 */
export const getAttachmentMetadata = async (id) => {
  try {
    const response = await apiClient.get(`/attachments/${id}/meta`);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

/**
 * 获取附件完整数据
 * @param {string} id - 附件ID
 * @returns {Promise<Object>} 附件完整数据
 */
export const getAttachment = async (id) => {
  try {
    const response = await apiClient.get(`/attachments/${id}`);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

/**
 * 生成签名URL
 * @param {string} id - 附件ID
 * @param {number} ttl - 有效期（秒，可选）
 * @returns {Promise<Object>} 签名URL信息
 */
export const generateSignedUrl = async (id, ttl) => {
  try {
    const url = ttl ? `/attachments/${id}/signed?ttl=${ttl}` : `/attachments/${id}/signed`;
    const response = await apiClient.post(url);
    const payload = response.data;
    if (payload?.data?.signedUrl) {
      payload.data.signedUrl = resolveApiUrl(payload.data.signedUrl);
    }
    return payload;
  } catch (error) {
    throw handleApiError(error);
  }
};

/**
 * 批量生成签名URL
 * @param {string[]} ids - 附件ID数组
 * @param {number} ttl - 有效期（秒，可选）
 * @returns {Promise<Object>} 批量签名URL信息
 */
export const generateSignedUrlBatch = async (ids, ttl) => {
  try {
    const response = await apiClient.post('/attachments/signed-batch', {
      ids,
      ttl
    });
    const payload = response.data;
    const signedUrls = payload?.data?.signedUrls;
    if (signedUrls && typeof signedUrls === 'object') {
      for (const urlInfo of Object.values(signedUrls)) {
        if (urlInfo && typeof urlInfo === 'object' && urlInfo.signedUrl) {
          urlInfo.signedUrl = resolveApiUrl(urlInfo.signedUrl);
        }
      }
    }
    return payload;
  } catch (error) {
    throw handleApiError(error);
  }
};

/**
 * 删除附件
 * @param {string} id - 附件ID
 * @returns {Promise<Object>} 删除结果
 */
export const deleteAttachment = async (id) => {
  try {
    const response = await apiClient.delete(`/attachments/${id}`);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

/**
 * 更新附件元数据
 * @param {string} id - 附件ID
 * @param {Object} payload - 更新数据
 * @param {string} payload.originalName - 原始文件名（可选）
 * @param {string} payload.description - 内容描述（可选）
 * @returns {Promise<Object>} 更新后的附件元数据
 */
export const updateAttachmentMetadata = async (id, payload) => {
  try {
    const response = await apiClient.patch(`/attachments/${id}/meta`, payload);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

/**
 * 处理API错误
 * @param {Error} error - 原始错误
 * @returns {Error} 处理后的错误
 */
const handleApiError = (error) => {
  if (error.response) {
    // 服务器返回了错误状态码
    const { status, data } = error.response;
    
    // 根据状态码返回更友好的错误信息
    switch (status) {
      case 400:
        return new Error(data.message || '请求参数错误');
      case 401:
        return new Error(data.message || '未授权访问，请检查访问令牌');
      case 403:
        return new Error(data.message || '禁止访问');
      case 404:
        return new Error(data.message || '附件不存在');
      case 413:
        return new Error('文件大小超过限制');
      case 415:
        return new Error('不支持的文件类型');
      case 500:
        return new Error(data.message || '服务器内部错误');
      default:
        return new Error(data.message || `请求失败 (${status})`);
    }
  } else if (error.request) {
    // 请求已发出，但没有收到响应
    return new Error('网络连接失败，请检查网络设置');
  } else {
    // 其他错误
    return new Error(error.message || '未知错误');
  }
};

/**
 * 获取图片占位SVG
 * @param {number} width - 宽度
 * @param {number} height - 高度
 * @param {string} text - 显示文本
 * @returns {string} Base64编码的SVG
 */
export const getPlaceholderImage = (width = 200, height = 150, text = '图片加载失败') => {
  const svg = `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="#f0f0f0"/>
      <path d="M${width/2-20} ${height/2-20}L${width/2} ${height/2+20}L${width/2+40} ${height/2-20}V${height/2}H${width/2+20}V${height/2+40}" fill="#ccc"/>
      <path d="M${width/2-20} ${height/2+20}L${width/2} ${height/2+60}L${width/2+40} ${height/2+20}V${height/2+40}H${width/2+20}V${height/2+80}" fill="#ccc"/>
      <text x="${width/2}" y="${height/2+10}" text-anchor="middle" fill="#999" font-size="14">${text}</text>
    </svg>
  `;
  
  // 使用 encodeURIComponent 处理中文字符，避免 btoa 的 Latin1 限制
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};
