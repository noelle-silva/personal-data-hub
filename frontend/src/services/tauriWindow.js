import { isTauri } from './tauriBridge';

let cachedCurrentWindowPromise = null;

const debugWarn = (message, error) => {
  if (process.env.NODE_ENV === 'production') return;
  // eslint-disable-next-line no-console
  console.warn(message, error);
};

const getGlobalCurrentWindow = () => {
  if (typeof window === 'undefined') return null;
  const candidates = [
    window.__TAURI__?.window?.getCurrentWindow?.(),
    window.__TAURI_INTERNALS__?.window?.getCurrentWindow?.(),
    window.__TAURI__?.window?.appWindow,
    window.__TAURI_INTERNALS__?.window?.appWindow,
  ];
  for (const w of candidates) {
    if (w) return w;
  }
  return null;
};

const getCurrentWindow = async () => {
  const globalWindow = getGlobalCurrentWindow();
  if (globalWindow) return globalWindow;

  if (cachedCurrentWindowPromise) return cachedCurrentWindowPromise;

  cachedCurrentWindowPromise = (async () => {
    const mod = await import('@tauri-apps/api/window');
    if (typeof mod.getCurrentWindow === 'function') return mod.getCurrentWindow();
    if (mod.appWindow) return mod.appWindow;
    throw new Error('tauri window not available');
  })();

  return cachedCurrentWindowPromise;
};

export const startDragging = async () => {
  if (!isTauri()) return;
  try {
    const w = await getCurrentWindow();
    if (typeof w.startDragging === 'function') await w.startDragging();
  } catch (e) {
    debugWarn('[tauriWindow] startDragging failed (check capabilities permissions)', e);
  }
};

export const minimizeWindow = async () => {
  if (!isTauri()) return;
  try {
    const w = await getCurrentWindow();
    if (typeof w.minimize === 'function') await w.minimize();
  } catch (e) {
    debugWarn('[tauriWindow] minimizeWindow failed (check capabilities permissions)', e);
  }
};

export const toggleMaximizeWindow = async () => {
  if (!isTauri()) return;
  try {
    const w = await getCurrentWindow();
    if (typeof w.toggleMaximize === 'function') {
      await w.toggleMaximize();
      return;
    }

    if (typeof w.isMaximized === 'function') {
      const maximized = await w.isMaximized();
      if (maximized && typeof w.unmaximize === 'function') await w.unmaximize();
      else if (!maximized && typeof w.maximize === 'function') await w.maximize();
    }
  } catch (e) {
    debugWarn('[tauriWindow] toggleMaximizeWindow failed (check capabilities permissions)', e);
  }
};

export const closeWindow = async () => {
  if (!isTauri()) return;
  try {
    const w = await getCurrentWindow();
    if (typeof w.close === 'function') await w.close();
  } catch (e) {
    debugWarn('[tauriWindow] closeWindow failed (check capabilities permissions)', e);
  }
};

export const preloadWindowApi = async () => {
  if (!isTauri()) return;
  try {
    await getCurrentWindow();
  } catch (e) {
    debugWarn('[tauriWindow] preloadWindowApi failed', e);
  }
};
