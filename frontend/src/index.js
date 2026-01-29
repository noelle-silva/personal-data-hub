import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import CssBaseline from '@mui/material/CssBaseline';
import './index.css';
// Import styles for react-pdf
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import App from './App';
import store from './store';
import { ThemeProvider } from './contexts/ThemeContext';
import reportWebVitals from './reportWebVitals';
import { isTauri, getGatewayUrl, setGatewayBackendUrl, setGatewayToken } from './services/tauriBridge';
import { getServerUrl } from './services/serverConfig';
import { getAuthToken } from './services/authToken';

// 全局抑制 ResizeObserver 循环错误
// 这是一个已知的浏览器问题，通常在组件卸载时发生，不影响功能
const resizeObserverErrorHandler = (event) => {
  const message = event.message || (event.error && event.error.message) || '';
  if (
    message.includes('ResizeObserver loop completed with undelivered notifications.') ||
    message.includes('ResizeObserver loop limit exceeded')
  ) {
    event.stopImmediatePropagation();
    event.preventDefault();
    return false;
  }
};

// 使用捕获阶段监听错误，确保在错误覆盖层之前处理
window.addEventListener('error', resizeObserverErrorHandler, { capture: true });
// 同时监听未处理的 Promise 拒绝
window.addEventListener('unhandledrejection', (event) => {
  const message = event.reason && event.reason.message ? event.reason.message : String(event.reason);
  if (
    message.includes('ResizeObserver loop completed with undelivered notifications.') ||
    message.includes('ResizeObserver loop limit exceeded')
  ) {
    event.preventDefault();
  }
}, { capture: true });

const root = ReactDOM.createRoot(document.getElementById('root'));
const tauri = isTauri();
const Router = tauri ? HashRouter : BrowserRouter;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const initDesktopGateway = async () => {
  if (!tauri) return;

  // 等网关起来（避免启动时竞态）
  let url = '';
  for (let i = 0; i < 100; i += 1) {
    try {
      url = await getGatewayUrl();
      if (url) break;
    } catch (_) {
      // ignore
    }
    await sleep(100);
  }

  if (url) {
    window.__PDH_GATEWAY_URL__ = url;
  }
  // 若仍未拿到 URL，后台继续尝试，不阻塞 UI（避免首次登录点太快又直连后端）
  if (!url) {
    let tries = 0;
    const timer = setInterval(async () => {
      tries += 1;
      if (tries > 300) {
        clearInterval(timer);
        return;
      }
      try {
        const next = await getGatewayUrl();
        if (next) {
          window.__PDH_GATEWAY_URL__ = next;
          clearInterval(timer);
        }
      } catch (_) {
        // ignore
      }
    }, 100);
  }

  // 同步后端地址与 token 到网关（用于附件资源转发时补 Authorization）
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

  // 后续变更：监听事件同步到网关
  window.addEventListener('pdh-server-changed', (e) => {
    const next = e?.detail?.serverUrl || '';
    setGatewayBackendUrl(next).catch(() => {});
  });
  window.addEventListener('pdh-auth-token-changed', () => {
    const token = getAuthToken();
    setGatewayToken(token || null).catch(() => {});
  });
};

const mount = async () => {
  await initDesktopGateway();

  root.render(
    <React.StrictMode>
      <Provider store={store}>
        <Router>
          <ThemeProvider>
            <CssBaseline />
            <App />
          </ThemeProvider>
        </Router>
      </Provider>
    </React.StrictMode>
  );
};

mount();

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
