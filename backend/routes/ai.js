/**
 * AI API路由
 * 定义AI相关的RESTful API端点
 */

const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

/**
 * @route   GET /api/ai/v1/models
 * @desc    获取可用的AI模型列表
 * @access  Private - 需要登录
 */
router.get('/v1/models', aiController.getModels);

/**
 * @route   POST /api/ai/v1/chat/completions
 * @desc    创建聊天完成（支持流式和非流式）
 * @access  Private - 需要登录
 * @body    messages - 消息数组 (必填)
 * @body    model - 模型名称 (可选，默认使用AI_DEFAULT_MODEL)
 * @body    stream - 是否启用流式响应 (可选，默认false)
 * @body    temperature - 温度参数 (可选，默认使用AI_TEMPERATURE)
 * @body    max_tokens - 最大token数 (可选，默认使用AI_MAX_TOKENS)
 */
router.post('/v1/chat/completions', aiController.createChatCompletion);

module.exports = router;