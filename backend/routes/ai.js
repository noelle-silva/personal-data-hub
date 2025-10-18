/**
 * AI API路由
 * 定义AI相关的RESTful API端点
 */

const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const aiPromptController = require('../controllers/aiPromptController');

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

/**
 * @route   GET /api/ai/v1/prompts
 * @desc    获取所有AI系统提示词
 * @access  Private - 需要登录
 */
router.get('/v1/prompts', aiPromptController.list);

/**
 * @route   GET /api/ai/v1/prompts/default
 * @desc    获取默认AI系统提示词
 * @access  Private - 需要登录
 */
router.get('/v1/prompts/default', aiPromptController.getDefault);

/**
 * @route   GET /api/ai/v1/prompts/:id
 * @desc    根据ID获取AI系统提示词
 * @access  Private - 需要登录
 */
router.get('/v1/prompts/:id', aiPromptController.getById);

/**
 * @route   POST /api/ai/v1/prompts
 * @desc    创建新的AI系统提示词
 * @access  Private - 需要登录
 * @body    name - 提示词名称 (必填)
 * @body    content - 提示词内容 (必填)
 * @body    isDefault - 是否设为默认 (可选，默认false)
 */
router.post('/v1/prompts', aiPromptController.create);

/**
 * @route   PUT /api/ai/v1/prompts/:id
 * @desc    更新AI系统提示词
 * @access  Private - 需要登录
 * @body    name - 提示词名称 (可选)
 * @body    content - 提示词内容 (可选)
 * @body    isDefault - 是否设为默认 (可选)
 */
router.put('/v1/prompts/:id', aiPromptController.update);

/**
 * @route   DELETE /api/ai/v1/prompts/:id
 * @desc    删除AI系统提示词
 * @access  Private - 需要登录
 */
router.delete('/v1/prompts/:id', aiPromptController.delete);

/**
 * @route   POST /api/ai/v1/prompts/:id/default
 * @desc    设置默认AI系统提示词
 * @access  Private - 需要登录
 */
router.post('/v1/prompts/:id/default', aiPromptController.setDefault);

module.exports = router;