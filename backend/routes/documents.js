/**
 * 文档API路由
 * 定义文档相关的RESTful API端点
 */

const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');

/**
 * @route   GET /api/documents
 * @desc    获取所有文档
 * @access  Public
 * @query   page - 页码 (默认: 1)
 * @query   limit - 每页数量 (默认: 10)
 * @query   sort - 排序字段 (默认: -createdAt)
 */
router.get('/', documentController.getAllDocuments);

/**
 * @route   GET /api/documents/search
 * @desc    全文搜索文档
 * @access  Public
 * @query   q - 搜索关键词 (必填，至少2个字符)
 * @query   page - 页码 (可选，默认为1)
 * @query   limit - 每页数量 (可选，默认为20，最大为50)
 * @sort    默认按更新时间降序排序 (updatedAt desc)
 */
router.get('/search', documentController.searchDocuments);

/**
 * @route   GET /api/documents/tags
 * @desc    按标签搜索文档
 * @access  Public
 * @query   tags - 标签数组或逗号分隔的标签字符串 (必填)
 * @query   mode - 匹配模式: 'all'(AND) 或 'any'(OR) (可选，默认为'all')
 * @query   page - 页码 (可选，默认为1)
 * @query   limit - 每页数量 (可选，默认为20，最大为50；0表示不分页)
 * @query   sort - 排序字段 (可选，默认为'-updatedAt'，按更新时间降序)
 */
router.get('/tags', documentController.searchByTags);

/**
 * @route   GET /api/documents/stats
 * @desc    获取文档统计信息
 * @access  Public
 */
router.get('/stats', documentController.getDocumentStats);

/**
 * @route   GET /api/documents/:id
 * @desc    根据ID获取单个文档
 * @access  Public
 * @param   id - 文档ID
 * @query   populate - 是否填充引用的文档信息 (title/full/none)
 * @query   include - 是否包含引用此文档的收藏夹 (referencingQuotes)
 * @query   quotesLimit - 收藏夹分页限制 (默认20)
 * @query   quotesPage - 收藏夹分页页码 (默认1)
 * @query   quotesSort - 收藏夹排序字段 (默认-updatedAt)
 */
router.get('/:id', documentController.getDocumentById);

/**
 * @route   GET /api/documents/:id/referencing-quotes
 * @desc    获取引用此文档的收藏夹列表
 * @access  Public
 * @param   id - 文档ID
 * @query   page - 页码 (默认1)
 * @query   limit - 每页数量 (默认20，最大50)
 * @query   sort - 排序字段 (默认-updatedAt)
 * @query   populate - 是否填充引用的文档信息 (title/full/none)
 */
router.get('/:id/referencing-quotes', documentController.getReferencingQuotes);

/**
 * @route   POST /api/documents
 * @desc    创建新文档
 * @access  Private - 需要登录
 * @body    title - 文档标题 (必填)
 * @body    content - 文档内容 (必填)
 * @body    tags - 文档标签数组 (可选)
 * @body    source - 文档来源 (可选)
 */
router.post('/', documentController.createDocument);

/**
 * @route   PUT /api/documents/:id
 * @desc    更新文档
 * @access  Private - 需要登录
 * @param   id - 文档ID
 * @body    title - 文档标题 (可选)
 * @body    content - 文档内容 (可选)
 * @body    tags - 文档标签数组 (可选)
 * @body    source - 文档来源 (可选)
 */
router.put('/:id', documentController.updateDocument);

/**
 * @route   DELETE /api/documents/:id
 * @desc    删除文档
 * @access  Private - 需要登录
 * @param   id - 文档ID
 */
router.delete('/:id', documentController.deleteDocument);

module.exports = router;