/**
 * Express服务器入口文件
 * 配置和启动Express应用服务器
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: './db.env' });
require('dotenv').config({ path: '../port.env' });
require('dotenv').config({ path: '../file.env' });
require('dotenv').config({ path: '../login.env' });

// 导入路由和中间件
const authRoutes = require('./routes/auth');
const documentRoutes = require('./routes/documents');
const quoteRoutes = require('./routes/quotes');
const attachmentRoutes = require('./routes/attachments');
const customPageRoutes = require('./routes/customPages');
const connectDB = require('./config/database');
const requireAuth = require('./middlewares/requireAuth');
const helmet = require('helmet');

// 输出关键配置信息用于调试
console.log('=== 附件系统配置检查 ===');
console.log('ATTACHMENTS_ENABLE_RANGE:', process.env.ATTACHMENTS_ENABLE_RANGE);
console.log('ATTACHMENTS_VIDEO_DIR:', process.env.ATTACHMENTS_VIDEO_DIR);
console.log('ATTACHMENTS_CACHE_TTL:', process.env.ATTACHMENTS_CACHE_TTL);
console.log('ATTACHMENTS_SECRET:', process.env.ATTACHMENTS_SECRET ? '已配置' : '未配置');
console.log('========================');

// 输出自定义页面配置信息
console.log('=== 自定义页面配置检查 ===');
console.log('CUSTOM_PAGE_COLLECTION:', process.env.CUSTOM_PAGE_COLLECTION || 'custom-pages');
console.log('========================');

/**
 * 创建Express应用实例
 */
const app = express();

// 安全中间件
app.use(helmet());

/**
 * 连接到MongoDB数据库
 */
connectDB();

/**
 * 中间件配置
 */

// 从环境变量获取全局请求大小限制，默认为10MB
const maxRequestBodySize = process.env.MAX_REQUEST_BODY_SIZE || '10mb';

// 解析JSON请求体
app.use(express.json({ limit: maxRequestBodySize }));

// 解析URL编码的请求体
app.use(express.urlencoded({ extended: true, limit: maxRequestBodySize }));

// 配置CORS中间件，允许跨域请求
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:8333',
    'http://127.0.0.1:8333',
    // 允许Live Server的常用端口范围
    /^http:\/\/localhost:(55[0-9]{2}|[5-9][0-9]{3}|[1-9][0-9]{4})$/,
    /^http:\/\/127\.0\.0\.1:(55[0-9]{2}|[5-9][0-9]{3}|[1-9][0-9]{4})$/
  ], // 允许的前端地址
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // 允许的HTTP方法
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Attachment-Token'], // 允许的请求头
  credentials: true // 允许发送凭证
}));

// 静态文件服务（用于提供静态资源）
app.use(express.static(path.join(__dirname, 'public')));

// 暴露 vendor/node_modules 作为静态资源（支持原生依赖引用）
app.use('/node_modules', express.static(path.join(__dirname, 'vendor', 'node_modules'), {
  maxAge: '1y', // 设置长期缓存，依赖版本通常稳定
  etag: true,   // 启用 ETag
  lastModified: true, // 启用 Last-Modified
  index: false, // 禁止目录索引
  setHeaders: (res, filePath) => {
    // 对 JS/CSS 文件设置更积极的缓存策略
    if (/\.(js|css|map)$/.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  }
}));

/**
 * 请求日志中间件
 */
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

/**
 * API路由配置
 */

// 健康检查端点
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: '服务器运行正常',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API根路径
app.get('/api', (req, res) => {
  res.status(200).json({
    success: true,
    message: '文档卡片API服务',
    version: '1.0.0',
    endpoints: {
      auth: {
        login: '/api/auth/login',
        me: '/api/auth/me',
        logout: '/api/auth/logout'
      },
      documents: '/api/documents',
      search: '/api/documents/search',
      tags: '/api/documents/tags',
      stats: '/api/documents/stats',
      quotes: '/api/quotes',
      quotesSearch: '/api/quotes/search',
      quotesCombinedSearch: '/api/quotes/search/combined',
      quotesTags: '/api/quotes/tags',
      quotesStats: '/api/quotes/stats',
      attachments: '/api/attachments',
      attachmentUpload: '/api/attachments/images',
      attachmentDownload: '/api/attachments/:id',
      attachmentMeta: '/api/attachments/:id/meta',
      attachmentSigned: '/api/attachments/:id/signed',
      customPages: '/api/custom-pages',
      customPagesSearch: '/api/custom-pages/search',
      customPagesByName: '/api/custom-pages/by-name/:name'
    }
  });
});

// 认证路由（不需要JWT认证）
app.use('/api/auth', authRoutes);

// 附件相关路由（需要附件认证，不需要JWT认证）
app.use('/api/attachments', attachmentRoutes);

// 对其他API路由应用JWT认证中间件
app.use('/api', requireAuth);

// 文档相关路由
app.use('/api/documents', documentRoutes);

// 引用体相关路由
app.use('/api/quotes', quoteRoutes);

// 自定义页面相关路由
app.use('/api/custom-pages', customPageRoutes);

/**
 * 404错误处理
 */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: '请求的资源不存在',
    path: req.originalUrl
  });
});

/**
 * 全局错误处理中间件
 */
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);

  // 处理带有statusCode的自定义错误
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message
    });
  }

  // Mongoose验证错误
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      success: false,
      message: '数据验证失败',
      errors
    });
  }

  // Mongoose重复键错误
  if (err.code === 11000) {
    return res.status(400).json({
      success: false,
      message: '数据已存在，请检查重复项'
    });
  }

  // Mongoose转换错误
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: '无效的数据格式'
    });
  }

  // 默认服务器错误
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || '服务器内部错误',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

/**
 * 获取端口号
 */
const PORT = process.env.BACKEND_PORT || 5000;

/**
 * 启动服务器
 */
const server = app.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
  console.log(`环境: ${process.env.NODE_ENV || 'development'}`);
  console.log(`API文档: http://localhost:${PORT}/api`);
  console.log(`健康检查: http://localhost:${PORT}/health`);
});

/**
 * 优雅关闭服务器
 */
process.on('SIGTERM', () => {
  console.log('收到SIGTERM信号，正在关闭服务器...');
  server.close(() => {
    console.log('服务器已关闭');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('收到SIGINT信号，正在关闭服务器...');
  server.close(() => {
    console.log('服务器已关闭');
    process.exit(0);
  });
});

// 导出app实例（用于测试）
module.exports = app;