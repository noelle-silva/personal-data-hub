/**
 * 认证路由
 * 定义登录、登出和获取用户信息相关的API端点
 */

const express = require('express');
const router = express.Router();
const { login, me, logout, createLoginRateLimit } = require('../controllers/authController');
const requireAuth = require('../middlewares/requireAuth');

/**
 * @route   POST /api/auth/login
 * @desc    用户登录
 * @access  Public
 * @body    username - 用户名 (必填)
 * @body    password - 密码 (必填)
 */
router.post('/login', createLoginRateLimit(), login);

/**
 * @route   GET /api/auth/me
 * @desc    获取当前用户信息
 * @access  Private (需要JWT认证)
 */
router.get('/me', requireAuth, me);

/**
 * @route   POST /api/auth/logout
 * @desc    用户登出
 * @access  Private (需要JWT认证)
 */
router.post('/logout', requireAuth, logout);

module.exports = router;