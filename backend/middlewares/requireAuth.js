/**
 * JWT 认证中间件
 * 验证请求头中的 JWT Token
 */

const jwt = require('jsonwebtoken');
const config = require('../config/config');

/**
 * JWT 认证中间件
 * @param {Object} req - Express 请求对象
 * @param {Object} res - Express 响应对象
 * @param {Function} next - Express 下一个中间件函数
 */
const requireAuth = (req, res, next) => {
  try {
    // 桌面端专用：仅接受 Authorization: Bearer <token>
    const authHeader = req.headers.authorization;
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: '未提供有效的认证令牌',
        hint: '请在请求头中提供 Authorization: Bearer <token>'
      });
    }

    // 验证 JWT Token
    const jwtSecret = config.auth.jwtSecret;
    if (!jwtSecret) {
      console.error('JWT_SECRET 环境变量未配置');
      return res.status(500).json({
        success: false,
        message: '服务器配置错误'
      });
    }

    // 验证并解码 Token
    const decoded = jwt.verify(token, jwtSecret);
    
    // 将用户信息添加到请求对象
    req.user = {
      id: decoded.id,
      username: decoded.username,
      loginTime: decoded.loginTime
    };

    // 继续处理请求
    next();
  } catch (error) {
    console.error('JWT 认证错误:', error.message);
    
    // 根据错误类型返回不同的错误信息
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: '认证令牌已过期',
        hint: '请重新登录'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: '无效的认证令牌',
        hint: '请提供有效的 JWT Token'
      });
    }
    
    // 其他未知错误
    return res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

module.exports = requireAuth;
