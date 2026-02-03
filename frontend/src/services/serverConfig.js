import { clearAuthToken } from './authToken';
import { isTauri } from './tauriBridge';

const LEGACY_SERVER_URL_KEY = 'pdh_server_url';
const SERVERS_KEY = 'pdh_servers';
const ACTIVE_SERVER_ID_KEY = 'pdh_active_server_id';

const safeParseJson = (raw, fallback) => {
  try {
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};

const safeStringifyJson = (value) => {
  try {
    return JSON.stringify(value);
  } catch {
    return '[]';
  }
};

const generateId = () => `srv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

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

const readServers = () => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(SERVERS_KEY);
    const parsed = safeParseJson(raw, []);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((s) => (s && typeof s === 'object' ? s : null))
      .filter(Boolean)
      .map((s) => ({
        id: typeof s.id === 'string' && s.id.trim() ? s.id.trim() : generateId(),
        url: normalizeServerUrl(s.url),
        username: typeof s.username === 'string' ? s.username : '',
        name: typeof s.name === 'string' ? s.name : '',
        lastUsedAt: typeof s.lastUsedAt === 'number' ? s.lastUsedAt : 0,
      }))
      .filter((s) => !!s.url);
  } catch {
    return [];
  }
};

const writeServers = (servers) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SERVERS_KEY, safeStringifyJson(servers));
  } catch {
    // ignore
  }
};

const readActiveServerId = () => {
  if (typeof window === 'undefined') return '';
  try {
    return (window.localStorage.getItem(ACTIVE_SERVER_ID_KEY) || '').trim();
  } catch {
    return '';
  }
};

const writeActiveServerId = (id) => {
  if (typeof window === 'undefined') return;
  try {
    if (!id) window.localStorage.removeItem(ACTIVE_SERVER_ID_KEY);
    else window.localStorage.setItem(ACTIVE_SERVER_ID_KEY, id);
  } catch {
    // ignore
  }
};

const migrateLegacyServer = () => {
  if (typeof window === 'undefined') return;
  const existing = readServers();
  if (existing.length > 0) return;

  try {
    const rawLegacy = window.localStorage.getItem(LEGACY_SERVER_URL_KEY) || '';
    const normalized = normalizeServerUrl(rawLegacy);
    if (!normalized) return;

    const id = generateId();
    const servers = [{ id, url: normalized, username: '', name: '', lastUsedAt: Date.now() }];
    writeServers(servers);
    writeActiveServerId(id);

    // 保留 legacy key，避免老代码读取不到
    window.localStorage.setItem(LEGACY_SERVER_URL_KEY, normalized);
  } catch {
    // ignore
  }
};

export const getServers = () => {
  migrateLegacyServer();
  return readServers();
};

export const getActiveServer = () => {
  migrateLegacyServer();

  const servers = readServers();
  const activeId = readActiveServerId();
  const active = servers.find((s) => s.id === activeId) || servers[0] || null;
  if (active) return active;

  // 兜底：legacy 单值模式
  try {
    const raw = window.localStorage.getItem(LEGACY_SERVER_URL_KEY) || '';
    const normalized = normalizeServerUrl(raw);
    return normalized ? { id: '', url: normalized, username: '', name: '', lastUsedAt: 0 } : null;
  } catch {
    return null;
  }
};

export const getServerUrl = () => {
  const active = getActiveServer();
  return active?.url || '';
};

export const setActiveServerId = (id) => {
  if (typeof window === 'undefined') return null;
  migrateLegacyServer();

  const servers = readServers();
  const target = servers.find((s) => s.id === id) || null;

  writeActiveServerId(target ? target.id : '');

  if (target) {
    const nextServers = servers.map((s) =>
      s.id === target.id ? { ...s, lastUsedAt: Date.now() } : s
    );
    writeServers(nextServers);
  }

  const nextUrl = target?.url || '';
  try {
    if (!nextUrl) window.localStorage.removeItem(LEGACY_SERVER_URL_KEY);
    else window.localStorage.setItem(LEGACY_SERVER_URL_KEY, nextUrl);
  } catch {
    // ignore
  }

  // 切换服务器时避免携带旧 token
  clearAuthToken();

  try {
    window.dispatchEvent(new CustomEvent('pdh-server-changed', { detail: { serverUrl: nextUrl } }));
    window.dispatchEvent(new CustomEvent('pdh-auth-reset', { detail: { reason: 'server-changed' } }));
  } catch {
    // ignore
  }

  return target;
};

export const upsertServer = ({ url, username = '', name = '' }) => {
  if (typeof window === 'undefined') return null;
  migrateLegacyServer();

  const normalized = normalizeServerUrl(url);
  if (!normalized) return null;

  const servers = readServers();
  const existing = servers.find((s) => s.url === normalized) || null;
  const next = existing
    ? {
        ...existing,
        username: String(username || existing.username || ''),
        name: String(name || existing.name || ''),
        lastUsedAt: Date.now(),
      }
    : {
        id: generateId(),
        url: normalized,
        username: String(username || ''),
        name: String(name || ''),
        lastUsedAt: Date.now(),
      };

  const nextServers = existing ? servers.map((s) => (s.url === normalized ? next : s)) : [next, ...servers];
  writeServers(nextServers);
  setActiveServerId(next.id);

  return next;
};

export const removeServer = (id) => {
  if (typeof window === 'undefined') return;
  migrateLegacyServer();

  const servers = readServers();
  const nextServers = servers.filter((s) => s.id !== id);
  writeServers(nextServers);

  const activeId = readActiveServerId();
  if (activeId === id) {
    const nextActive = nextServers[0] || null;
    writeActiveServerId(nextActive ? nextActive.id : '');

    const nextUrl = nextActive?.url || '';
    try {
      if (!nextUrl) window.localStorage.removeItem(LEGACY_SERVER_URL_KEY);
      else window.localStorage.setItem(LEGACY_SERVER_URL_KEY, nextUrl);
    } catch {
      // ignore
    }

    clearAuthToken();

    try {
      window.dispatchEvent(new CustomEvent('pdh-server-changed', { detail: { serverUrl: nextUrl } }));
      window.dispatchEvent(new CustomEvent('pdh-auth-reset', { detail: { reason: 'server-removed' } }));
    } catch {
      // ignore
    }
  }
};

export const setServerUrl = (raw) => {
  // 兼容旧接口：设置（并激活）一个后端地址
  if (typeof window === 'undefined') return '';
  const normalized = normalizeServerUrl(raw);

  if (!normalized) {
    try {
      window.localStorage.removeItem(LEGACY_SERVER_URL_KEY);
    } catch {
      // ignore
    }

    writeServers([]);
    writeActiveServerId('');
    clearAuthToken();

    try {
      window.dispatchEvent(new CustomEvent('pdh-server-changed', { detail: { serverUrl: '' } }));
      window.dispatchEvent(new CustomEvent('pdh-auth-reset', { detail: { reason: 'server-cleared' } }));
    } catch {
      // ignore
    }

    return '';
  }

  const server = upsertServer({ url: normalized });
  return server?.url || normalized;
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
