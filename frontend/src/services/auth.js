/**
 * 认证服务
 * 封装所有与认证相关的 API 调用
 */

import apiClient from './apiClient';

/**
 * 用户登录
 * @param {string} username - 用户名
 * @param {string} password - 密码
 * @returns {Promise<Object>} 登录结果
 */
export const login = async (username, password) => {
  try {
    const response = await apiClient.post('/auth/login', {
      username,
      password
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

/**
 * 获取当前用户信息
 * @returns {Promise<Object>} 用户信息
 */
export const getCurrentUser = async () => {
  try {
    const response = await apiClient.get('/auth/me');
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

/**
 * 用户登出
 * @returns {Promise<Object>} 登出结果
 */
export const logout = async () => {
  try {
    const response = await apiClient.post('/auth/logout');
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
        return new Error(data.message || '用户名或密码错误');
      case 403:
        return new Error(data.message || '禁止访问');
      case 429:
        return new Error(data.message || '登录尝试次数过多，请稍后再试');
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
 * 清除本地存储的认证信息（升级为 Cookie 登录态后保留为空实现，避免旧代码调用时报错）
 */
export const clearAuthData = () => {
  // no-op
};

export default {
  login,
  getCurrentUser,
  logout,
  clearAuthData
};
