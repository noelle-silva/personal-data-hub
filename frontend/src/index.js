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
const isTauri = typeof window !== 'undefined' && (!!window.__TAURI__ || !!window.__TAURI_INTERNALS__);
const Router = isTauri ? HashRouter : BrowserRouter;
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

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
