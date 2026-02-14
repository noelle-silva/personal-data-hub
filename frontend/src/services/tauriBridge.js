export const isTauri = () => {
  if (typeof window === 'undefined') return false;
  return !!window.__TAURI__ || !!window.__TAURI_INTERNALS__;
};

let cachedModuleInvoke = null;
let cachedModuleConvertFileSrc = null;

const getGlobalInvoke = () => {
  if (typeof window === 'undefined') return null;
  const candidates = [
    window.__TAURI__?.core?.invoke,
    window.__TAURI__?.invoke,
    window.__TAURI_INTERNALS__?.core?.invoke,
    window.__TAURI_INTERNALS__?.invoke,
  ];
  for (const fn of candidates) {
    if (typeof fn === 'function') return fn;
  }
  return null;
};

export const invoke = async (command, args) => {
  const globalInvoke = getGlobalInvoke();
  if (globalInvoke) return globalInvoke(command, args);

  if (cachedModuleInvoke) return cachedModuleInvoke(command, args);

  try {
    const mod = await import('@tauri-apps/api/core');
    if (typeof mod.invoke === 'function') {
      cachedModuleInvoke = mod.invoke;
      return cachedModuleInvoke(command, args);
    }
  } catch (_) {
    // ignore
  }

  throw new Error('tauri invoke not available');
};

const getGlobalConvertFileSrc = () => {
  if (typeof window === 'undefined') return null;
  const candidates = [
    window.__TAURI__?.core?.convertFileSrc,
    window.__TAURI__?.tauri?.convertFileSrc,
    window.__TAURI_INTERNALS__?.core?.convertFileSrc,
    window.__TAURI_INTERNALS__?.tauri?.convertFileSrc,
  ];
  for (const fn of candidates) {
    if (typeof fn === 'function') return fn;
  }
  return null;
};

export const convertFileSrc = async (path, protocol) => {
  const globalConvert = getGlobalConvertFileSrc();
  if (globalConvert) return globalConvert(path, protocol);

  if (cachedModuleConvertFileSrc) return cachedModuleConvertFileSrc(path, protocol);

  try {
    const mod = await import('@tauri-apps/api/core');
    if (typeof mod.convertFileSrc === 'function') {
      cachedModuleConvertFileSrc = mod.convertFileSrc;
      return cachedModuleConvertFileSrc(path, protocol);
    }
  } catch (_) {
    // ignore
  }

  throw new Error('tauri convertFileSrc not available');
};

export const getGatewayUrl = async () => invoke('pdh_gateway_url');
export const setGatewayBackendUrl = async (url) => invoke('pdh_gateway_set_backend_url', { url });
export const setGatewayToken = async (token) => invoke('pdh_gateway_set_token', { token });

let cachedListen = null;

const getGlobalListen = () => {
  if (typeof window === 'undefined') return null;
  const candidates = [
    window.__TAURI__?.event?.listen,
    window.__TAURI_INTERNALS__?.event?.listen,
  ];
  for (const fn of candidates) {
    if (typeof fn === 'function') return fn;
  }
  return null;
};

export const listen = async (eventName, handler) => {
  const globalListen = getGlobalListen();
  if (globalListen) return globalListen(eventName, handler);

  if (cachedListen) return cachedListen(eventName, handler);

  const mod = await import('@tauri-apps/api/event');
  if (typeof mod.listen !== 'function') {
    throw new Error('tauri event listen not available');
  }
  cachedListen = mod.listen;
  return cachedListen(eventName, handler);
};

// 认证：refresh token 存在 Tauri 侧（OS 凭据库），前端不持有明文
export const authLogin = async (username, password) => invoke('pdh_auth_login', { username, password });
export const authRefresh = async () => invoke('pdh_auth_refresh');
export const clearRefreshToken = async () => invoke('pdh_auth_clear_refresh_token');

// 本地密钥/凭据（OS 凭据库）：用于“记住密码”
export const secretSetPassword = async (backendBaseUrl, username, password) =>
  invoke('pdh_secret_set_password', { backendBaseUrl, username, password });
export const secretGetPassword = async (backendBaseUrl, username) =>
  invoke('pdh_secret_get_password', { backendBaseUrl, username });
export const secretDeletePassword = async (backendBaseUrl, username) =>
  invoke('pdh_secret_delete_password', { backendBaseUrl, username });
