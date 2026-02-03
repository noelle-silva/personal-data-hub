/**
 * API 客户端（桌面端专用）
 * 所有请求统一走本机网关：避免 CORS/CSRF/WebView 安全头等浏览器机制干扰
 */

import axios from 'axios';
import { ensureDesktopGatewayReady } from './desktopGateway';
import { setAuthToken } from './authToken';
import { authRefresh, isTauri } from './tauriBridge';

// 创建 axios 实例
const apiClient = axios.create({
  baseURL: '/api',
  timeout: 30000, // 30秒超时
  headers: {
    'Content-Type': 'application/json',
  },
});

// 防止并发 401 时重复刷新
let refreshInFlight = null;

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
    const refreshedToken = response?.headers?.['x-pdh-auth-token'];
    if (refreshedToken && typeof refreshedToken === 'string') {
      setAuthToken(refreshedToken);
    }
    return response;
  },
  async (error) => {
    // 处理 401 未授权错误
    if (error.response?.status === 401) {
      const url = String(error.config?.url || '');
      const isLoginRequest = url.includes('/auth/login');
      const isRefreshRequest = url.includes('/auth/refresh');
      const alreadyRetried = !!error.config?.__pdhRetried;

      // 优先尝试“无感刷新并重放请求”（跳过 login/refresh 自身，避免循环）
      if (!isLoginRequest && !isRefreshRequest && !alreadyRetried) {
        try {
          if (isTauri()) {
            if (!refreshInFlight) {
              refreshInFlight = authRefresh();
            }

            const refreshResponse = await refreshInFlight;
            refreshInFlight = null;

            const nextToken = refreshResponse?.data?.token;
            if (refreshResponse?.success && nextToken) {
              setAuthToken(nextToken);

              // 确保网关拿到新 token，再重放原请求
              await ensureDesktopGatewayReady().catch(() => {});

              const nextConfig = { ...error.config, __pdhRetried: true };
              return apiClient(nextConfig);
            }
          }
        } catch (_) {
          refreshInFlight = null;
          setAuthToken('');
        }
      }

      // 刷新失败或无刷新令牌：需要重新登录
      if (!isLoginRequest && !isRefreshRequest) {
        // 触发自定义事件，通知应用需要重新登录（刷新失败或无刷新令牌）
        window.dispatchEvent(
          new CustomEvent('auth-required', {
            detail: { message: '需要重新登录' },
          })
        );
      }
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;
