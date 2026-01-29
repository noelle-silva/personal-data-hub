/**
 * API 客户端（桌面端专用）
 * 所有请求统一走本机网关：避免 CORS/CSRF/WebView 安全头等浏览器机制干扰
 */

import axios from 'axios';
import { ensureDesktopGatewayReady } from './desktopGateway';

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
  async (config) => {
    const gateway = await ensureDesktopGatewayReady();
    config.baseURL = `${gateway}/api`;

    // 桌面端：认证由网关注入 token，前端不应传 Authorization/Cookie/CSRF
    if (config.headers && 'Authorization' in config.headers) {
      delete config.headers.Authorization;
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
      
      const currentHash = window.location.hash || '';
      const isOnLogin = currentHash.startsWith('#/登录') || currentHash.startsWith('#/%E7%99%BB%E5%BD%95');
      const isAuthRequest = error.config.url?.includes('/auth/');
      
      // 如果不是登录请求且当前不在登录页，且没有正在重定向中，则重定向到登录页面
      if (!isAuthRequest && !isOnLogin && !redirectingToLogin) {
        // 设置重定向标志，防止重复跳转
        redirectingToLogin = true;
        
        // 延迟重定向，让组件有时间处理错误
        setTimeout(() => {
          window.location.hash = '#/登录';
          
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
