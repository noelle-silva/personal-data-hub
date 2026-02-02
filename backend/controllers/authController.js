/**
 * 认证控制器
 * 处理用户登录、登出和获取用户信息等操作
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const config = require('../config/config');
const AuthSession = require('../models/AuthSession');

const hashRefreshToken = (token, jwtSecret) => {
  const secret = jwtSecret || '';
  return crypto.createHash('sha256').update(String(token) + secret).digest('hex');
};

const generateRefreshToken = () => crypto.randomBytes(32).toString('hex');

/**
 * 创建登录限流中间件
 * 限制登录尝试频率，防止暴力破解
 */
const createLoginRateLimit = () => {
  // 桌面端默认关闭（避免输错几次就被锁 15 分钟）
  // 如需开启：设置 LOGIN_RATE_LIMIT_ENABLED=true
  if (!config.auth.loginRateLimitEnabled) return (req, res, next) => next();

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
    const envUsername = config.auth.loginUsername;
    const envPasswordHash = config.auth.loginPasswordHash;
    const jwtSecret = config.auth.jwtSecret;
    const jwtExpiresIn = config.auth.jwtExpiresIn;
    const refreshTokenTtlSeconds = config.auth.refreshTokenTtlSeconds;

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
    let adminUserId = config.auth.adminUserId;
    
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

    const signOptions = jwtExpiresIn ? { expiresIn: jwtExpiresIn } : undefined;
    const token = signOptions
      ? jwt.sign(payload, jwtSecret, signOptions)
      : jwt.sign(payload, jwtSecret);

    // 生成 refresh token（用于 access token 过期后无感续期）
    let refreshToken = null;
    let refreshTokenExpiresInSeconds = 0;
    if (refreshTokenTtlSeconds > 0) {
      refreshToken = generateRefreshToken();
      refreshTokenExpiresInSeconds = refreshTokenTtlSeconds;
      const expiresAt = new Date(Date.now() + refreshTokenTtlSeconds * 1000);
      const refreshTokenHash = hashRefreshToken(refreshToken, jwtSecret);

      await AuthSession.findOneAndUpdate(
        { userId: adminUserId },
        {
          userId: adminUserId,
          refreshTokenHash,
          loginTimeMs: now,
          expiresAt,
          lastUsedAt: new Date(),
          revokedAt: null,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    // 返回登录成功响应
    res.status(200).json({
      success: true,
      data: {
        user: {
          id: payload.id,
          username: payload.username
        },
        expiresIn: jwtExpiresIn || 'never',
        token,
        ...(refreshToken ? { refreshToken, refreshTokenExpiresInSeconds } : {})
      },
      message: '登录成功'
    });
  } catch (error) {
    console.error('登录处理错误:', error);
    next(error);
  }
};

/**
 * refresh：使用 refresh token 换取新的 access token（并轮换 refresh token）
 * @route   POST /api/auth/refresh
 * @access  Public（基于 refresh token 校验）
 */
const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body || {};
    if (!refreshToken || !String(refreshToken).trim()) {
      return res.status(400).json({
        success: false,
        message: 'refreshToken 不能为空',
      });
    }

    const jwtSecret = config.auth.jwtSecret;
    const jwtExpiresIn = config.auth.jwtExpiresIn;
    const refreshTokenTtlSeconds = config.auth.refreshTokenTtlSeconds;

    if (!jwtSecret) {
      return res.status(500).json({ success: false, message: '服务器配置错误' });
    }
    if (refreshTokenTtlSeconds <= 0) {
      return res.status(403).json({ success: false, message: '刷新令牌功能未启用' });
    }

    const tokenHash = hashRefreshToken(refreshToken, jwtSecret);
    const session = await AuthSession.findOne({
      refreshTokenHash: tokenHash,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    }).lean();

    if (!session) {
      return res.status(401).json({
        success: false,
        message: '刷新令牌无效或已过期',
      });
    }

    // 轮换 refresh token（减少泄露窗口）
    const nextRefreshToken = generateRefreshToken();
    const nextRefreshTokenHash = hashRefreshToken(nextRefreshToken, jwtSecret);
    const nextExpiresAt = new Date(Date.now() + refreshTokenTtlSeconds * 1000);

    await AuthSession.updateOne(
      { userId: session.userId, refreshTokenHash: tokenHash, revokedAt: null },
      {
        refreshTokenHash: nextRefreshTokenHash,
        expiresAt: nextExpiresAt,
        lastUsedAt: new Date(),
      }
    );

    const accessPayload = {
      id: session.userId,
      username: config.auth.loginUsername || 'admin',
      loginTime: session.loginTimeMs || Date.now(),
    };

    const signOptions = jwtExpiresIn ? { expiresIn: jwtExpiresIn } : undefined;
    const token = signOptions
      ? jwt.sign(accessPayload, jwtSecret, signOptions)
      : jwt.sign(accessPayload, jwtSecret);

    return res.status(200).json({
      success: true,
      data: {
        token,
        expiresIn: jwtExpiresIn || 'never',
        refreshToken: nextRefreshToken,
        refreshTokenExpiresInSeconds: refreshTokenTtlSeconds,
      },
      message: '刷新成功',
    });
  } catch (error) {
    console.error('刷新令牌错误:', error);
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
    // 尽力撤销 refresh session（单用户场景：直接按 userId 撤销）
    const userId = req.user?.id;
    if (userId) {
      AuthSession.updateOne(
        { userId, revokedAt: null },
        { revokedAt: new Date(), lastUsedAt: new Date() }
      ).catch(() => {});
    }
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
  refresh,
  logout,
  createLoginRateLimit
};
