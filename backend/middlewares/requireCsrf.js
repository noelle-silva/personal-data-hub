/**
 * CSRF 防护中间件（Double Submit Cookie）
 * - 服务端设置一个非 HttpOnly 的 CSRF Cookie
 * - 前端在所有非安全方法请求里带上 X-CSRF-Token
 * - 服务端校验 Header 与 Cookie 一致
 *
 * 说明：如果你把前后端放在同站点（推荐：同域 + HTTPS），该方案简单有效。
 */

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const requireCsrf = (req, res, next) => {
  // 仅对“会产生副作用”的请求做校验
  if (SAFE_METHODS.has(req.method)) {
    return next();
  }

  // 登录阶段没有 CSRF Cookie，放行
  // 注意：该中间件最好只挂在需要登录态的路由上
  if (req.path === '/auth/login') {
    return next();
  }

  const csrfCookieName = process.env.CSRF_COOKIE_NAME || 'pdh_csrf';
  const csrfHeaderName = process.env.CSRF_HEADER_NAME || 'x-csrf-token';

  const csrfCookie = req.cookies && req.cookies[csrfCookieName];
  const csrfHeader = req.get(csrfHeaderName);

  if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
    return res.status(403).json({
      success: false,
      message: 'CSRF 校验失败',
      hint: '请在请求头中提供 X-CSRF-Token，并确保其与 CSRF Cookie 一致'
    });
  }

  return next();
};

module.exports = requireCsrf;

