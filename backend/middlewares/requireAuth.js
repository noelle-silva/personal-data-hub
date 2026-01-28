/**
 * JWT 认证中间件
 * 验证请求头中的 JWT Token
 */

const jwt = require('jsonwebtoken');

/**
 * JWT 认证中间件
 * @param {Object} req - Express 请求对象
 * @param {Object} res - Express 响应对象
 * @param {Function} next - Express 下一个中间件函数
 */
const requireAuth = (req, res, next) => {
  try {
    const cookieName = process.env.AUTH_COOKIE_NAME || 'pdh_auth';

    // 兼容两种来源：
    // 1) Authorization: Bearer <token>（旧客户端/脚本）
    // 2) HttpOnly Cookie（推荐，防止 token 被前端 JS 读到）
    const authHeader = req.headers.authorization;
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.cookies && req.cookies[cookieName]) {
      token = req.cookies[cookieName];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: '未提供有效的认证令牌',
        hint: '请先登录（推荐 Cookie 登录态），或在请求头中提供 Authorization: Bearer <token>'
      });
    }

    // 验证 JWT Token
    const jwtSecret = process.env.JWT_SECRET;
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
