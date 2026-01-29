import { getAuthToken } from './authToken';
import { getServerUrl, isDesktopTauri } from './serverConfig';
import { getGatewayUrl, setGatewayBackendUrl, setGatewayToken } from './tauriBridge';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let inFlight = null;
let listenersInstalled = false;

const syncGatewayConfig = async () => {
  try {
    const backend = getServerUrl();
    if (backend) await setGatewayBackendUrl(backend);
  } catch (_) {
    // ignore
  }

  try {
    const token = getAuthToken();
    await setGatewayToken(token || null);
  } catch (_) {
    // ignore
  }
};

export const installDesktopGatewaySync = () => {
  if (!isDesktopTauri()) return;
  if (listenersInstalled) return;
  listenersInstalled = true;

  window.addEventListener('pdh-server-changed', (e) => {
    const next = e?.detail?.serverUrl || '';
    setGatewayBackendUrl(next).catch(() => {});
  });

  window.addEventListener('pdh-auth-token-changed', () => {
    const token = getAuthToken();
    setGatewayToken(token || null).catch(() => {});
  });
};

export const ensureDesktopGatewayReady = async ({ timeoutMs = 15000 } = {}) => {
  if (!isDesktopTauri()) return '';

  const existing = window.__PDH_GATEWAY_URL__ || '';
  if (existing) {
    await syncGatewayConfig();
    return existing;
  }

  if (!inFlight) {
    inFlight = (async () => {
      const deadline = Date.now() + timeoutMs;
      while (Date.now() < deadline) {
        try {
          const url = await getGatewayUrl();
          if (url) {
            window.__PDH_GATEWAY_URL__ = url;
            await syncGatewayConfig();
            return url;
          }
        } catch (_) {
          // ignore
        }
        await sleep(100);
      }
      throw new Error('本地网关未就绪，请稍后再试');
    })();
  }

  try {
    return await inFlight;
  } catch (e) {
    inFlight = null;
    throw e;
  }
};

