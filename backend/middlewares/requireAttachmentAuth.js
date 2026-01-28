/**
 * 附件鉴权中间件
 * 支持：登录态（JWT/Cookie）或 HMAC 签名 URL
 */

const attachmentService = require('../services/attachmentService');
const requireAuth = require('./requireAuth');

/**
 * 仅签名URL鉴权中间件（适合“对外分享/直链下载”）
 */
const requireSignedUrlAuth = (req, res, next) => {
  try {
    const { token, exp } = req.query;
    const attachmentId = req.params.id;

    if (!token || !exp || !attachmentId) {
      return res.status(401).json({
        success: false,
        message: '未授权访问，请提供有效的签名URL鉴权信息',
        hint: '请提供 ?token=<signature>&exp=<unix_timestamp>'
      });
    }

    if (!attachmentService.validateSignedUrl(attachmentId, token, parseInt(exp, 10))) {
      return res.status(401).json({
        success: false,
        message: '签名URL无效或已过期'
      });
    }

    req.authType = 'signed';
    return next();
  } catch (error) {
    console.error('附件签名URL鉴权中间件错误:', error);
    return res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 登录态（JWT/Cookie）或签名URL鉴权
 * - 已登录用户：可直接访问附件文件
 * - 未登录用户：必须使用签名URL（用于分享/直链）
 */
const requireAuthOrSignedUrl = (req, res, next) => {
  // 先尝试签名URL（避免无谓的 JWT 报错日志）
  const { token, exp } = req.query;
  const attachmentId = req.params.id;

  if (token && exp && attachmentId) {
    try {
      if (attachmentService.validateSignedUrl(attachmentId, token, parseInt(exp, 10))) {
        req.authType = 'signed';
        return next();
      }
    } catch (_) {
      // ignore，回落到 requireAuth
    }
  }

  req.authType = 'jwt';
  return requireAuth(req, res, next);
};

module.exports = {
  requireSignedUrlAuth,
  requireAuthOrSignedUrl
};
