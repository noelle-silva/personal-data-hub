const { createProxyMiddleware } = require('http-proxy-middleware');
const fs = require('fs');
const path = require('path');

// 读取 port.env 获取后端端口
function getBackendPort() {
  try {
    const envPath = path.resolve(__dirname, '../../port.env');
    const content = fs.readFileSync(envPath, 'utf8');
    const match = content.match(/BACKEND_PORT=(\d+)/);
    return match ? match[1] : '8444';
  } catch (e) {
    return '8444';
  }
}

const BACKEND_PORT = getBackendPort();
const BACKEND_URL = `http://localhost:${BACKEND_PORT}`;

module.exports = function(app) {
  console.log(`[Proxy] 后端地址: ${BACKEND_URL}`);

  // 代理 /api 请求到后端服务器
  app.use(
    '/api',
    createProxyMiddleware({
      target: BACKEND_URL,
      changeOrigin: true,
      logLevel: 'debug',
      // 确保所有请求头都传递到后端，特别是Range请求头
      onProxyReq: (proxyReq, req, res) => {
        // 记录关键请求头用于调试
        if (req.url.includes('/attachments/') && req.headers.range) {
          console.log(`[Proxy] 转发Range请求: ${req.url} Range: ${req.headers.range}`);
        }
        
        // 确保If-None-Match和If-Modified-Since头也被传递
        if (req.headers['if-none-match']) {
          proxyReq.setHeader('If-None-Match', req.headers['if-none-match']);
        }
        
        if (req.headers['if-modified-since']) {
          proxyReq.setHeader('If-Modified-Since', req.headers['if-modified-since']);
        }
      },
      onError: (err, req, res) => {
        console.error(`[Proxy] 代理错误:`, err);
      }
    })
  );
};