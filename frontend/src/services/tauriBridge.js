export const isTauri = () => {
  if (typeof window === 'undefined') return false;
  return !!window.__TAURI__ || !!window.__TAURI_INTERNALS__;
};

let cachedModuleInvoke = null;

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

export const getGatewayUrl = async () => invoke('pdh_gateway_url');
export const setGatewayBackendUrl = async (url) => invoke('pdh_gateway_set_backend_url', { url });
export const setGatewayToken = async (token) => invoke('pdh_gateway_set_token', { token });

// 认证：refresh token 存在 Tauri 侧（OS 凭据库），前端不持有明文
export const authLogin = async (username, password) => invoke('pdh_auth_login', { username, password });
export const authRefresh = async () => invoke('pdh_auth_refresh');
export const clearRefreshToken = async () => invoke('pdh_auth_clear_refresh_token');
