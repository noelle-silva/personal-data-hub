/**
 * 附件鉴权中间件
 * 支持Bearer Token和HMAC签名URL两种鉴权方式
 */

const attachmentService = require('../services/attachmentService');

/**
 * 附件鉴权中间件
 * @param {Object} options - 配置选项
 * @param {Boolean} options.allowSignedUrl - 是否允许签名URL鉴权
 * @param {Boolean} options.allowBearer - 是否允许Bearer Token鉴权
 * @returns {Function} Express中间件函数
 */
const requireAttachmentAuth = (options = {}) => {
  const {
    allowSignedUrl = true,
    allowBearer = true
  } = options;

  return (req, res, next) => {
    try {
      // 优先检查 X-Attachment-Token 头（用于分离 JWT 和附件令牌）
      if (allowBearer) {
        const attachmentToken = req.headers['x-attachment-token'];
        if (attachmentToken && attachmentService.validateBearerToken(attachmentToken)) {
          // X-Attachment-Token 验证通过
          req.authType = 'attachment-token';
          return next();
        }
        
        // 如果没有 X-Attachment-Token，则检查 Authorization Bearer Token
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          const token = authHeader.substring(7);
          if (attachmentService.validateBearerToken(token)) {
            // Bearer Token验证通过
            req.authType = 'bearer';
            return next();
          }
        }
      }

      // 检查签名URL鉴权
      if (allowSignedUrl) {
        const { token, exp } = req.query;
        const attachmentId = req.params.id;

        if (token && exp && attachmentId) {
          if (attachmentService.validateSignedUrl(attachmentId, token, parseInt(exp))) {
            // 签名URL验证通过
            req.authType = 'signed';
            return next();
          }
        }
      }

      // 两种鉴权方式都失败
      return res.status(401).json({
        success: false,
        message: '未授权访问，请提供有效的鉴权信息',
        hint: allowBearer && allowSignedUrl 
          ? '支持Bearer Token或签名URL鉴权' 
          : allowBearer 
            ? '支持Bearer Token鉴权' 
            : '支持签名URL鉴权'
      });

    } catch (error) {
      console.error('附件鉴权中间件错误:', error);
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  };
};

/**
 * 仅Bearer Token鉴权中间件
 * 用于需要严格鉴权的操作，如上传、删除等
 */
const requireBearerAuth = (req, res, next) => {
  return requireAttachmentAuth({ 
    allowSignedUrl: false, 
    allowBearer: true 
  })(req, res, next);
};

/**
 * 仅签名URL鉴权中间件
 * 用于文件访问等操作
 */
const requireSignedUrlAuth = (req, res, next) => {
  return requireAttachmentAuth({ 
    allowSignedUrl: true, 
    allowBearer: false 
  })(req, res, next);
};

module.exports = {
  requireAttachmentAuth,
  requireBearerAuth,
  requireSignedUrlAuth
};