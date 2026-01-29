export const isTauri = () => {
  if (typeof window === 'undefined') return false;
  return !!window.__TAURI__ || !!window.__TAURI_INTERNALS__;
};

const getInvoke = () => {
  if (typeof window === 'undefined') return null;
  const core = window.__TAURI__?.core;
  if (core && typeof core.invoke === 'function') return core.invoke.bind(core);
  return null;
};

export const invoke = async (command, args) => {
  const fn = getInvoke();
  if (!fn) throw new Error('tauri invoke not available');
  return fn(command, args);
};

export const getGatewayUrl = async () => invoke('pdh_gateway_url');
export const setGatewayBackendUrl = async (url) => invoke('pdh_gateway_set_backend_url', { url });
export const setGatewayToken = async (token) => invoke('pdh_gateway_set_token', { token });

