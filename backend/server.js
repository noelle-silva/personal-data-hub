/**
 * Express服务器入口文件
 * 配置和启动Express应用服务器
 */

const express = require('express');
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
const aiRoutes = require('./routes/ai');
const testRoutes = require('./routes/test');
const themeRoutes = require('./routes/themes');
const transparencyRoutes = require('./routes/transparency');
const connectDB = require('./config/database');
const requireAuth = require('./middlewares/requireAuth');
const helmet = require('helmet');

// 输出关键配置信息用于调试
console.log('=== 附件系统配置检查 ===');
console.log('ATTACHMENTS_ENABLE_RANGE:', process.env.ATTACHMENTS_ENABLE_RANGE);
console.log('ATTACHMENTS_VIDEO_DIR:', process.env.ATTACHMENTS_VIDEO_DIR);
console.log('ATTACHMENTS_CACHE_TTL:', process.env.ATTACHMENTS_CACHE_TTL);
console.log('========================');

// 输出自定义页面配置信息
console.log('=== 自定义页面配置检查 ===');
console.log('CUSTOM_PAGE_COLLECTION:', process.env.CUSTOM_PAGE_COLLECTION || 'custom-pages');
console.log('========================');

// 导入AI配置服务
const aiConfigService = require('./config/ai/configService');

// 输出AI配置信息
console.log('=== AI配置检查 ===');
console.log('AI_ENABLED:', aiConfigService.isEnabled());
console.log('AI_CURRENT_PROVIDER:', aiConfigService.getConfig().current || '未设置');
console.log('AI_PROVIDERS_COUNT:', Object.keys(aiConfigService.getProviders()).length);
console.log('AI_ROLES_COLLECTION:', process.env.AI_ROLES_COLLECTION || 'AI-roles');
console.log('AI_CHAT_HISTORY_COLLECTION:', process.env.AI_CHAT_HISTORY_COLLECTION || 'ai-chat-history');
console.log('==================');

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

// 桌面端专用：所有请求经本机网关转发，不需要 CORS/CSRF/Cookie

// 静态文件服务（用于提供静态资源）
app.use(express.static(path.join(__dirname, 'public')));

// 壁纸文件静态服务
app.use('/api/themes/wallpapers/file', express.static(path.join(__dirname, 'assets/themes/wallpapers'), {
  maxAge: '1d', // 缓存1天
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    // 对图片文件设置更积极的缓存策略
    if (/\.(jpg|jpeg|png|webp)$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
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
      attachmentUpload: '/api/attachments/:category',
      attachmentDownload: '/api/attachments/:id',
      attachmentMeta: '/api/attachments/:id/meta',
      customPages: '/api/custom-pages',
      customPagesSearch: '/api/custom-pages/search',
      customPagesByName: '/api/custom-pages/by-name/:name',
      themes: '/api/themes',
      wallpapers: '/api/themes/wallpapers',
      currentWallpaper: '/api/themes/wallpapers/current',
      ai: '/api/ai/v1',
      aiChatCompletions: '/api/ai/v1/chat/completions',
      aiModels: '/api/ai/v1/models',
      transparency: '/api/transparency'
    }
  });
});

// 认证路由（不需要JWT认证）
app.use('/api/auth', authRoutes);

// 除 /api/auth 外，其他 /api 全部需要 JWT Bearer
app.use('/api', requireAuth);

// 测试相关路由（需要认证，仅用于开发测试）
app.use('/api/test', testRoutes);

// 附件相关路由（需要认证）
app.use('/api/attachments', attachmentRoutes);

// 文档相关路由
app.use('/api/documents', documentRoutes);

// 引用体相关路由
app.use('/api/quotes', quoteRoutes);

// 自定义页面相关路由
app.use('/api/custom-pages', customPageRoutes);

// AI相关路由（需要JWT认证）
app.use('/api/ai', aiRoutes);

// 主题相关路由（需要JWT认证）
app.use('/api/themes', themeRoutes);

// 透明度配置相关路由（需要JWT认证）
app.use('/api/transparency', transparencyRoutes);

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
      message: '无效的数据格式',
      hint: '请检查ID格式是否正确，例如userId必须是有效的ObjectId格式（24位十六进制字符串）'
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
