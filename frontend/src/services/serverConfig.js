import { clearAuthToken } from './authToken';
import { clearRefreshToken, isTauri } from './tauriBridge';

const STORAGE_KEY = 'pdh_server_url';

export const normalizeServerUrl = (raw) => {
  const value = (raw || '').trim();
  if (!value) return '';

  // 兼容用户只填端口的情况：":8444" 或 "8444" -> 默认本机
  if (/^:\d{2,5}$/.test(value)) {
    return `http://127.0.0.1${value}`;
  }
  if (/^\d{2,5}$/.test(value)) {
    return `http://127.0.0.1:${value}`;
  }

  const withScheme = /^https?:\/\//i.test(value) ? value : `http://${value}`;

  try {
    const url = new URL(withScheme);
    // URL(origin) 必须包含有效 hostname
    if (!url.hostname) return '';
    const origin = url.origin;
    return origin.endsWith('/') ? origin.slice(0, -1) : origin;
  } catch {
    return '';
  }
};

export const getServerUrl = () => {
  if (typeof window === 'undefined') return '';
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY) || '';
    const normalized = normalizeServerUrl(raw);
    // 自动修复旧值（不清 token）
    if (normalized && normalized !== raw) {
      window.localStorage.setItem(STORAGE_KEY, normalized);
      return normalized;
    }
    return raw;
  } catch {
    return '';
  }
};

export const setServerUrl = (raw) => {
  if (typeof window === 'undefined') return '';
  const normalized = normalizeServerUrl(raw);

  try {
    if (!normalized) {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, normalized);
    }
  } catch {
    // ignore
  }

  clearAuthToken();
  if (isTauri()) {
    clearRefreshToken().catch(() => {});
  }

  try {
    window.dispatchEvent(new CustomEvent('pdh-server-changed', { detail: { serverUrl: normalized } }));
  } catch {
    // ignore
  }

  return normalized;
};

export const getGatewayBaseUrl = () => {
  if (typeof window === 'undefined') return '';
  return window.__PDH_GATEWAY_URL__ || '';
};

export const resolveClientUrl = (path) => {
  if (!path) return path;
  if (/^https?:\/\//i.test(path)) return path;

  const gateway = getGatewayBaseUrl();
  if (gateway) {
    if (path.startsWith('/')) return `${gateway}${path}`;
    return `${gateway}/${path}`;
  }

  // 桌面端以网关为唯一网络出口：网关未就绪时不做“直连后端”兜底
  return path;
};

export const getAttachmentProxyUrl = (id) => {
  if (!id) return '';
  // 网关模式：走本地 /attachments/:id
  const gateway = getGatewayBaseUrl();
  if (gateway) return `${gateway}/attachments/${id}`;

  return '';
};

export const isDesktopTauri = () => isTauri();
