/**
 * AI API路由
 * 定义AI相关的RESTful API端点
 */

const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const aiRoleController = require('../controllers/aiRoleController');
const aiChatHistoryController = require('../controllers/aiChatHistoryController');
const aiSettingsController = require('../controllers/aiSettingsController');

/**
 * @route   GET /api/ai/v1/models
 * @desc    获取可用的AI模型列表
 * @access  Private - 需要登录
 */
router.get('/v1/models', aiController.getModels.bind(aiController));

/**
 * @route   POST /api/ai/v1/chat/completions
 * @desc    创建聊天完成（支持流式和非流式）
 * @access  Private - 需要登录
 * @body    messages - 消息数组 (必填)
 * @body    model - 模型名称 (可选，默认使用AI角色的默认模型)
 * @body    stream - 是否启用流式响应 (可选，默认false)
 * @body    temperature - 温度参数 (可选，默认使用AI角色的默认温度)
 * @body    max_tokens - 最大token数 (可选，默认使用AI角色的maxOutputTokens)
 */
router.post('/v1/chat/completions', aiController.createChatCompletion.bind(aiController));


/**
 * @route   GET /api/ai/v1/roles
 * @desc    获取所有AI角色
 * @access  Private - 需要登录
 */
router.get('/v1/roles', aiRoleController.list);

/**
 * @route   GET /api/ai/v1/roles/default
 * @desc    获取默认AI角色 (已废弃)
 * @access  Private - 需要登录
 * @deprecated 默认角色功能已移除，请使用具体角色ID或禁用系统提示词
 */
// router.get('/v1/roles/default', aiRoleController.getDefault); // 已废弃

/**
 * @route   GET /api/ai/v1/roles/:id
 * @desc    根据ID获取AI角色
 * @access  Private - 需要登录
 */
router.get('/v1/roles/:id', aiRoleController.getById);

/**
 * @route   POST /api/ai/v1/roles
 * @desc    创建新的AI角色
 * @access  Private - 需要登录
 * @body    name - 角色名称 (必填)
 * @body    systemPrompt - 系统提示词 (必填)
 * @body    defaultModel - 默认模型 (可选)
 * @body    defaultTemperature - 默认温度 (可选，默认0.7)
 * @body    isDefault - 是否设为默认 (可选，默认false)
 */
router.post('/v1/roles', aiRoleController.create);

/**
 * @route   PUT /api/ai/v1/roles/:id
 * @desc    更新AI角色
 * @access  Private - 需要登录
 * @body    name - 角色名称 (可选)
 * @body    systemPrompt - 系统提示词 (可选)
 * @body    defaultModel - 默认模型 (可选)
 * @body    defaultTemperature - 默认温度 (可选)
 * @body    isDefault - 是否设为默认 (可选)
 */
router.put('/v1/roles/:id', aiRoleController.update);

/**
 * @route   DELETE /api/ai/v1/roles/:id
 * @desc    删除AI角色
 * @access  Private - 需要登录
 */
router.delete('/v1/roles/:id', aiRoleController.delete);

/**
 * @route   POST /api/ai/v1/roles/:id/default
 * @desc    设置默认AI角色 (已废弃)
 * @access  Private - 需要登录
 * @deprecated 默认角色功能已移除，请使用具体角色ID或禁用系统提示词
 */
// router.post('/v1/roles/:id/default', aiRoleController.setDefault); // 已废弃

/**
 * @route   GET /api/ai/v1/chat/histories
 * @desc    获取聊天历史列表
 * @access  Private - 需要登录
 * @query   role_id - 角色ID (可选，不提供则获取所有)
 * @query   page - 页码 (可选，默认1)
 * @query   limit - 每页数量 (可选，默认50，最大100)
 */
router.get('/v1/chat/histories', aiChatHistoryController.list);

/**
 * @route   GET /api/ai/v1/chat/histories/:id
 * @desc    根据ID获取聊天历史详情
 * @access  Private - 需要登录
 */
router.get('/v1/chat/histories/:id', aiChatHistoryController.getById);

/**
 * @route   PUT /api/ai/v1/chat/histories/:id
 * @desc    更新聊天历史标题
 * @access  Private - 需要登录
 * @body    title - 新标题 (必填)
 */
router.put('/v1/chat/histories/:id', aiChatHistoryController.updateTitle);

/**
 * @route   DELETE /api/ai/v1/chat/histories/:id
 * @desc    删除聊天历史
 * @access  Private - 需要登录
 */
router.delete('/v1/chat/histories/:id', aiChatHistoryController.delete);

// AI 设置相关路由

/**
 * @route   GET /api/ai/v1/config
 * @desc    获取AI配置
 * @access  Private - 需要登录
 */
router.get('/v1/config', aiSettingsController.getConfig);

/**
 * @route   PUT /api/ai/v1/config
 * @desc    更新AI配置
 * @access  Private - 需要登录
 * @body    enabled - AI启用状态 (可选)
 * @body    current - 当前供应商键名 (可选)
 */
router.put('/v1/config', aiSettingsController.updateConfig);

/**
 * @route   POST /api/ai/v1/toggle
 * @desc    切换AI启用状态
 * @access  Private - 需要登录
 * @body    enabled - AI启用状态 (必填)
 */
router.post('/v1/toggle', aiSettingsController.toggleEnabled);

/**
 * @route   GET /api/ai/v1/providers
 * @desc    获取所有供应商
 * @access  Private - 需要登录
 */
router.get('/v1/providers', aiSettingsController.getProviders);

/**
 * @route   POST /api/ai/v1/providers/:key
 * @desc    创建或更新供应商
 * @access  Private - 需要登录
 * @body    AI_BASE_URL - API基础URL (必填)
 * @body    AI_API_KEY - API密钥 (必填)
 * @body    AI_ALLOWED_MODELS - 允许的模型列表 (可选)
 */
router.post('/v1/providers/:key', aiSettingsController.upsertProvider);

/**
 * @route   PUT /api/ai/v1/providers/:key
 * @desc    更新供应商
 * @access  Private - 需要登录
 * @body    AI_BASE_URL - API基础URL (可选)
 * @body    AI_API_KEY - API密钥 (可选)
 * @body    AI_ALLOWED_MODELS - 允许的模型列表 (可选)
 */
router.put('/v1/providers/:key', aiSettingsController.updateProvider);

/**
 * @route   DELETE /api/ai/v1/providers/:key
 * @desc    删除供应商
 * @access  Private - 需要登录
 */
router.delete('/v1/providers/:key', aiSettingsController.deleteProvider);

/**
 * @route   POST /api/ai/v1/providers/:key/select
 * @desc    设置当前供应商
 * @access  Private - 需要登录
 */
router.post('/v1/providers/:key/select', aiSettingsController.setCurrentProvider);

module.exports = router;