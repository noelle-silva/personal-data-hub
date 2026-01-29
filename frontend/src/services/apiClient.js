/**
 * API 客户端
 * 统一处理 HTTP 请求、错误处理和认证
 */

import axios from 'axios';
import { getApiBaseUrl } from './serverConfig';
import { getAuthToken } from './authToken';

const getCookieValue = (name) => {
  if (typeof document === 'undefined') return null;
  const parts = document.cookie.split(';').map(s => s.trim());
  for (const part of parts) {
    if (part.startsWith(`${encodeURIComponent(name)}=`)) {
      return decodeURIComponent(part.substring(name.length + 1));
    }
  }
  return null;
};

// 创建 axios 实例
const apiClient = axios.create({
  baseURL: '/api',
  timeout: 30000, // 30秒超时
  withCredentials: true, // Cookie 模式需要；Token 模式会在拦截器里关闭
  headers: {
    'Content-Type': 'application/json',
  },
});

// 防止重复跳转登录页的标志
let redirectingToLogin = false;

// 请求拦截器 - 添加认证头
apiClient.interceptors.request.use(
  (config) => {
    // 动态 baseURL：桌面端可配置服务器；未配置时保留 /api 以兼容开发代理
    config.baseURL = getApiBaseUrl();

    // Token 优先：存在 token 则走 Bearer（不需要 Cookie / CSRF）
    const token = getAuthToken();
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
      config.withCredentials = false;
      return config;
    }

    // CSRF（Double Submit Cookie）：对所有非安全方法补上 X-CSRF-Token
    const method = (config.method || 'get').toLowerCase();
    const isSafeMethod = method === 'get' || method === 'head' || method === 'options';
    if (!isSafeMethod) {
      const csrfCookieName = process.env.REACT_APP_CSRF_COOKIE_NAME || 'pdh_csrf';
      const csrfToken = getCookieValue(csrfCookieName);
      if (csrfToken) {
        config.headers['X-CSRF-Token'] = csrfToken;
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

export default apiClient;
