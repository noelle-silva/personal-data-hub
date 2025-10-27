/**
 * API 客户端
 * 统一处理 HTTP 请求、错误处理和认证
 */

import axios from 'axios';

// 创建 axios 实例
const apiClient = axios.create({
  baseURL: '/api',
  timeout: 30000, // 30秒超时
  headers: {
    'Content-Type': 'application/json',
  },
});

// 防止重复跳转登录页的标志
let redirectingToLogin = false;

// 请求拦截器 - 添加认证头
apiClient.interceptors.request.use(
  (config) => {
    // 从 localStorage 获取 JWT Token
    const authToken = localStorage.getItem('authToken');
    if (authToken) {
      config.headers.Authorization = `Bearer ${authToken}`;
    }
    
    // 如果是附件相关的请求，额外添加 X-Attachment-Token
    if (config.url && config.url.includes('/attachments')) {
      const attachmentToken = localStorage.getItem('attachmentBearerToken');
      if (attachmentToken) {
        config.headers['X-Attachment-Token'] = attachmentToken;
      }
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器 - 处理错误
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // 处理 401 未授权错误
    if (error.response?.status === 401) {
      // 清除所有认证信息
      localStorage.removeItem('authToken');
      localStorage.removeItem('attachmentBearerToken');
      localStorage.removeItem('authUser');
      
      // 触发自定义事件，通知应用需要重新登录
      window.dispatchEvent(new CustomEvent('auth-required', {
        detail: { message: '需要重新登录' }
      }));
      
      const currentPath = window.location.pathname;
      const isAuthRequest = error.config.url?.includes('/auth/');
      
      // 如果不是登录请求且当前不在登录页，且没有正在重定向中，则重定向到登录页面
      if (!isAuthRequest && currentPath !== '/登录' && !redirectingToLogin) {
        // 设置重定向标志，防止重复跳转
        redirectingToLogin = true;
        
        // 延迟重定向，让组件有时间处理错误
        setTimeout(() => {
          window.location.href = '/登录';
          
          // 1.5秒后重置重定向标志，允许后续的401可以再次触发重定向
          setTimeout(() => {
            redirectingToLogin = false;
          }, 1500);
        }, 100);
      }
    }
    
    return Promise.reject(error);
  }
);

/**
 * 设置 JWT Token
 * @param {string} token - JWT Token
 */
export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem('authToken', token);
  } else {
    localStorage.removeItem('authToken');
  }
};

/**
 * 获取当前 JWT Token
 * @returns {string|null} 当前存储的 JWT Token
 */
export const getAuthToken = () => {
  return localStorage.getItem('authToken');
};

/**
 * 检查是否已设置 JWT Token
 * @returns {boolean} 是否已设置 Token
 */
export const hasAuthToken = () => {
  return !!localStorage.getItem('authToken');
};

/**
 * 设置附件 Bearer Token
 * @param {string} token - 附件 Bearer Token
 */
export const setBearerToken = (token) => {
  if (token) {
    localStorage.setItem('attachmentBearerToken', token);
  } else {
    localStorage.removeItem('attachmentBearerToken');
  }
};

/**
 * 获取当前附件 Bearer Token
 * @returns {string|null} 当前存储的附件 Bearer Token
 */
export const getBearerToken = () => {
  return localStorage.getItem('attachmentBearerToken');
};

/**
 * 检查是否已设置附件 Bearer Token
 * @returns {boolean} 是否已设置 Token
 */
export const hasBearerToken = () => {
  return !!localStorage.getItem('attachmentBearerToken');
};

export default apiClient;