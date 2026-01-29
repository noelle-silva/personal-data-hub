import { clearAuthToken } from './authToken';

const STORAGE_KEY = 'pdh_server_url';

export const normalizeServerUrl = (raw) => {
  const value = (raw || '').trim();
  if (!value) return '';

  const withScheme = /^https?:\/\//i.test(value) ? value : `http://${value}`;

  try {
    const url = new URL(withScheme);
    const origin = url.origin;
    return origin.endsWith('/') ? origin.slice(0, -1) : origin;
  } catch {
    return '';
  }
};

export const getServerUrl = () => {
  if (typeof window === 'undefined') return '';
  try {
    return window.localStorage.getItem(STORAGE_KEY) || '';
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

  try {
    window.dispatchEvent(new CustomEvent('pdh-server-changed', { detail: { serverUrl: normalized } }));
  } catch {
    // ignore
  }

  return normalized;
};

export const resolveApiUrl = (path) => {
  if (!path) return path;
  if (/^https?:\/\//i.test(path)) return path;

  const serverUrl = getServerUrl();
  if (!serverUrl) return path;

  if (path.startsWith('/')) return `${serverUrl}${path}`;
  return `${serverUrl}/${path}`;
};

export const getApiBaseUrl = () => {
  const serverUrl = getServerUrl();
  if (serverUrl) return `${serverUrl}/api`;
  return '/api';
};

