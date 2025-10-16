const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // 代理 /api 请求到后端服务器
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:8444',
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
  
  // 代理 /node_modules 请求到后端服务器
  app.use(
    '/node_modules',
    createProxyMiddleware({
      target: 'http://localhost:8444',
      changeOrigin: true,
      logLevel: 'debug'
    })
  );
};