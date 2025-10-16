/**
 * 引用体API路由
 * 定义引用体相关的RESTful API端点
 */

const express = require('express');
const router = express.Router();
const quoteController = require('../controllers/quoteController');
const requireAuth = require('../middlewares/requireAuth');

/**
 * @route   GET /api/quotes
 * @desc    获取所有引用体
 * @access  Public
 * @query   page - 页码 (默认: 1)
 * @query   limit - 每页数量 (默认: 10)
 * @query   sort - 排序字段 (默认: -createdAt)
 * @query   populate - 是否填充引用的文档/附件/引用体信息 (title/full)
 * @query   raw - 是否返回原始数据 (true/false)
 */
router.get('/', quoteController.getAllQuotes);

/**
 * @route   GET /api/quotes/search
 * @desc    全文搜索引用体
 * @access  Public
 * @query   q - 搜索关键词 (必填，至少2个字符)
 * @query   page - 页码 (可选，默认为1)
 * @query   limit - 每页数量 (可选，默认为20，最大为50)
 * @query   sort - 排序字段 (可选，默认为-updatedAt)
 * @query   populate - 是否填充引用的文档/附件/引用体信息 (title/full)
 * @query   raw - 是否返回原始数据 (true/false)
 * @sort    默认按更新时间降序排序 (updatedAt desc)
 */
router.get('/search', quoteController.searchQuotes);

/**
 * @route   GET /api/quotes/search/combined
 * @desc    复合搜索引用体（支持关键词和标签）
 * @access  Public
 * @query   q - 搜索关键词 (可选，至少2个字符)
 * @query   tags - 标签数组或逗号分隔的标签字符串 (可选)
 * @query   mode - 标签匹配模式: 'all'(AND) 或 'any'(OR) (可选，默认为'all')
 * @query   page - 页码 (可选，默认为1)
 * @query   limit - 每页数量 (可选，默认为20，最大为50)
 * @query   sort - 排序字段 (可选，默认为-updatedAt)
 * @query   populate - 是否填充引用的文档/附件/引用体信息 (title/full)
 * @query   raw - 是否返回原始数据 (true/false)
 */
router.get('/search/combined', quoteController.searchQuotesCombined);

/**
 * @route   GET /api/quotes/tags
 * @desc    按标签搜索引用体
 * @access  Public
 * @query   tags - 标签数组或逗号分隔的标签字符串 (必填)
 * @query   mode - 匹配模式: 'all'(AND) 或 'any'(OR) (可选，默认为'all')
 * @query   page - 页码 (可选，默认为1)
 * @query   limit - 每页数量 (可选，默认为20，最大为50；0表示不分页)
 * @query   sort - 排序字段 (可选，默认为'-updatedAt'，按更新时间降序)
 * @query   populate - 是否填充引用的文档/附件/引用体信息 (title/full)
 * @query   raw - 是否返回原始数据 (true/false)
 */
router.get('/tags', quoteController.searchByTags);

/**
 * @route   GET /api/quotes/stats
 * @desc    获取引用体统计信息
 * @access  Public
 */
router.get('/stats', quoteController.getQuoteStats);

/**
 * @route   GET /api/quotes/:id
 * @desc    根据ID获取单个引用体
 * @access  Public
 * @param   id - 引用体ID
 * @query   populate - 是否填充引用的文档/附件/引用体信息 (title/full)
 * @query   raw - 是否返回原始数据 (true/false)
 */
router.get('/:id', quoteController.getQuoteById);

/**
 * @route   POST /api/quotes
 * @desc    创建新引用体
 * @access  Private - 需要登录
 * @body    title - 引用体标题 (必填)
 * @body    content - 引用体内容 (必填)
 * @body    description - 引用体描述 (可选)
 * @body    tags - 引用体标签数组 (可选)
 * @body    referencedDocumentIds - 引用的笔记ID数组 (可选)
 * @body    referencedAttachmentIds - 引用的附件ID数组 (可选)
 * @body    referencedQuoteIds - 引用的引用体ID数组 (可选)
 */
router.post('/', requireAuth, quoteController.createQuote);

/**
 * @route   PUT /api/quotes/:id
 * @desc    更新引用体
 * @access  Private - 需要登录
 * @param   id - 引用体ID
 * @body    title - 引用体标题 (可选)
 * @body    content - 引用体内容 (可选)
 * @body    description - 引用体描述 (可选)
 * @body    tags - 引用体标签数组 (可选)
 * @body    referencedDocumentIds - 引用的笔记ID数组 (可选)
 * @body    referencedAttachmentIds - 引用的附件ID数组 (可选)
 * @body    referencedQuoteIds - 引用的引用体ID数组 (可选)
 */
router.put('/:id', quoteController.updateQuote);

/**
 * @route   DELETE /api/quotes/:id
 * @desc    删除引用体
 * @access  Private - 需要登录
 * @param   id - 引用体ID
 */
router.delete('/:id', quoteController.deleteQuote);

module.exports = router;