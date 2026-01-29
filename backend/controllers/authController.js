/**
 * 认证控制器
 * 处理用户登录、登出和获取用户信息等操作
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');

const parseExpiresInToMs = (expiresIn) => {
  if (!expiresIn || typeof expiresIn !== 'string') return null;
  const match = expiresIn.trim().match(/^(\d+)\s*([smhd])$/i);
  if (!match) return null;
  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  if (!Number.isFinite(value) || value <= 0) return null;
  switch (unit) {
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default: return null;
  }
};

const buildCookieOptions = () => {
  const cookieSecure = process.env.COOKIE_SECURE
    ? process.env.COOKIE_SECURE === 'true'
    : process.env.NODE_ENV === 'production';

  const sameSite = (process.env.COOKIE_SAMESITE || 'lax').toLowerCase();
  const cookieDomain = process.env.COOKIE_DOMAIN;

  return {
    secure: cookieSecure,
    sameSite: (sameSite === 'strict' || sameSite === 'none') ? sameSite : 'lax',
    path: '/',
    ...(cookieDomain ? { domain: cookieDomain } : {})
  };
};

/**
 * 创建登录限流中间件
 * 限制登录尝试频率，防止暴力破解
 */
const createLoginRateLimit = () => {
  // 开关策略（更符合开发体验）：
  // - 生产环境默认开启（防爆破）
  // - 开发环境默认关闭（避免输错几次就被锁 15 分钟）
  // - 可用 LOGIN_RATE_LIMIT_ENABLED=true/false 强制覆盖
  const override = (process.env.LOGIN_RATE_LIMIT_ENABLED || '').toLowerCase();
  if (override === 'false') return (req, res, next) => next();
  if (override !== 'true' && process.env.NODE_ENV !== 'production') {
    return (req, res, next) => next();
  }

  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15分钟
    max: 5, // 最多5次尝试
    message: {
      success: false,
      message: '登录尝试次数过多，请15分钟后再试'
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

/**
 * 用户登录
 * @param {Object} req - Express 请求对象
 * @param {Object} res - Express 响应对象
 * @param {Function} next - Express 下一个中间件函数
 */
const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    // 参数验证
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: '用户名和密码不能为空'
      });
    }

    // 获取环境变量中的用户信息
    const envUsername = process.env.LOGIN_USERNAME;
    const envPasswordHash = process.env.LOGIN_PASSWORD_HASH;
    const jwtSecret = process.env.JWT_SECRET;
    const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '24h';

    const authCookieName = process.env.AUTH_COOKIE_NAME || 'pdh_auth';
    const csrfCookieName = process.env.CSRF_COOKIE_NAME || 'pdh_csrf';

    // 检查必要的环境变量是否配置
    if (!envUsername || !envPasswordHash || !jwtSecret) {
      console.error('登录配置不完整:', {
        hasUsername: !!envUsername,
        hasPasswordHash: !!envPasswordHash,
        hasJwtSecret: !!jwtSecret
      });
      return res.status(500).json({
        success: false,
        message: '服务器登录配置不完整'
      });
    }

    // 获取或生成管理员用户ID（必须是有效的ObjectId格式）
    let adminUserId = process.env.ADMIN_USER_ID;
    
    // 如果没有配置ADMIN_USER_ID，则基于用户名和JWT_SECRET生成一个稳定的ObjectId
    if (!adminUserId) {
      // 使用SHA256哈希用户名和JWT_SECRET，然后取前24个字符作为ObjectId
      const hash = crypto.createHash('sha256')
        .update(envUsername + jwtSecret)
        .digest('hex');
      adminUserId = hash.substring(0, 24);
      
      // 验证生成的ID是否为有效的24位十六进制字符串
      if (!/^[a-f0-9]{24}$/i.test(adminUserId)) {
        console.error('生成的管理员用户ID格式无效');
        return res.status(500).json({
          success: false,
          message: '服务器配置错误：无法生成有效的用户ID'
        });
      }
      
      console.log('基于环境变量生成管理员用户ID:', adminUserId);
    } else {
      // 验证配置的ADMIN_USER_ID是否为有效的ObjectId格式
      if (!/^[a-f0-9]{24}$/i.test(adminUserId)) {
        console.error('配置的ADMIN_USER_ID格式无效:', adminUserId);
        return res.status(500).json({
          success: false,
          message: '服务器配置错误：ADMIN_USER_ID必须是24位十六进制字符串'
        });
      }
    }

    // 验证用户名
    if (username !== envUsername) {
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误'
      });
    }

    // 验证密码
    let isPasswordValid;
    try {
      isPasswordValid = await bcrypt.compare(password, envPasswordHash);
    } catch (error) {
      console.error('密码验证错误:', error);
      // 如果密码不是 bcrypt 哈希，尝试直接比较（兼容明文密码）
      isPasswordValid = (password === envPasswordHash);
    }

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误'
      });
    }

    // 生成 JWT Token
    const now = Date.now();
    const payload = {
      id: adminUserId, // 使用有效的ObjectId格式作为用户ID
      username: envUsername,
      loginTime: now
    };

    const token = jwt.sign(payload, jwtSecret, { expiresIn: jwtExpiresIn });

    // CSRF token（Double Submit Cookie）
    const csrfToken = crypto.randomBytes(32).toString('hex');

    const baseCookieOptions = buildCookieOptions();
    const maxAgeMs = parseExpiresInToMs(jwtExpiresIn);

    // 设置 HttpOnly 登录态 Cookie（推荐）
    res.cookie(authCookieName, token, {
      ...baseCookieOptions,
      httpOnly: true,
      ...(maxAgeMs ? { maxAge: maxAgeMs } : {})
    });

    // 设置 CSRF Cookie（非 HttpOnly，供前端读取并回传 Header）
    res.cookie(csrfCookieName, csrfToken, {
      ...baseCookieOptions,
      httpOnly: false,
      ...(maxAgeMs ? { maxAge: maxAgeMs } : {})
    });

    // 返回登录成功响应
    const clientHint = (req.get('X-PDH-CLIENT') || '').toLowerCase();
    const isDev = process.env.NODE_ENV !== 'production';
    // 桌面端/开发环境直接返回 token（避免 Cookie/CSRF/CORS 牵扯）；生产环境需显式开启或桌面端标记
    const shouldReturnToken = process.env.AUTH_RETURN_TOKEN === 'true' || clientHint === 'tauri' || isDev;

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: payload.id,
          username: payload.username
        },
        expiresIn: jwtExpiresIn,
        // 可选：为了兼容旧客户端，可通过环境变量开启返回 token
        ...(shouldReturnToken ? { token } : {})
      },
      message: '登录成功'
    });
  } catch (error) {
    console.error('登录处理错误:', error);
    next(error);
  }
};

/**
 * 获取当前用户信息
 * @param {Object} req - Express 请求对象
 * @param {Object} res - Express 响应对象
 */
const me = (req, res) => {
  try {
    // 从中间件获取用户信息
    const { user } = req;
    
    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          loginTime: user.loginTime
        }
      },
      message: '获取用户信息成功'
    });
  } catch (error) {
    console.error('获取用户信息错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 用户登出（客户端负责清除令牌）
 * @param {Object} req - Express 请求对象
 * @param {Object} res - Express 响应对象
 */
const logout = (req, res) => {
  try {
    const authCookieName = process.env.AUTH_COOKIE_NAME || 'pdh_auth';
    const csrfCookieName = process.env.CSRF_COOKIE_NAME || 'pdh_csrf';
    const baseCookieOptions = buildCookieOptions();

    // 清理 Cookie（服务端侧显式清除更可靠）
    res.clearCookie(authCookieName, { ...baseCookieOptions, httpOnly: true });
    res.clearCookie(csrfCookieName, { ...baseCookieOptions, httpOnly: false });

    res.status(200).json({
      success: true,
      message: '登出成功'
    });
  } catch (error) {
    console.error('登出处理错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

module.exports = {
  login,
  me,
  logout,
  createLoginRateLimit
};
