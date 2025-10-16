/**
 * 自定义页面API路由
 * 定义自定义页面相关的RESTful API端点
 */

const express = require('express');
const router = express.Router();
const customPageController = require('../controllers/customPageController');

/**
 * @route   GET /api/custom-pages
 * @desc    获取所有自定义页面
 * @access  Private - 需要登录
 * @query   page - 页码 (默认: 1)
 * @query   limit - 每页数量 (默认: 50)
 * @query   sort - 排序字段 (默认: -updatedAt)
 */
router.get('/', customPageController.getAllCustomPages);

/**
 * @route   GET /api/custom-pages/search
 * @desc    搜索自定义页面
 * @access  Private - 需要登录
 * @query   q - 搜索关键词 (必填，至少1个字符)
 * @query   page - 页码 (可选，默认为1)
 * @query   limit - 每页数量 (可选，默认为20，最大为50)
 * @query   sort - 排序字段 (可选，默认为'-updatedAt'，按更新时间降序)
 */
router.get('/search', customPageController.searchCustomPages);

/**
 * @route   GET /api/custom-pages/by-name/:name
 * @desc    根据名称获取单个自定义页面
 * @access  Private - 需要登录
 * @param   name - 页面名称 (URL编码)
 * @query   populate - 是否填充引用的数据信息 (full/ids，默认为ids)
 * @query   include - 是否包含统计信息 (counts)
 */
router.get('/by-name/:name', customPageController.getCustomPageByName);

/**
 * @route   POST /api/custom-pages
 * @desc    创建新自定义页面
 * @access  Private - 需要登录
 * @body    name - 页面名称 (必填)
 * @body    referencedDocumentIds - 引用的笔记ID数组 (可选)
 * @body    referencedQuoteIds - 引用的引用体ID数组 (可选)
 * @body    referencedAttachmentIds - 引用的附件ID数组 (可选)
 */
router.post('/', customPageController.createCustomPage);

/**
 * @route   PUT /api/custom-pages/:id
 * @desc    更新自定义页面
 * @access  Private - 需要登录
 * @param   id - 页面ID
 * @body    name - 页面名称 (可选)
 * @body    referencedDocumentIds - 引用的笔记ID数组 (可选)
 * @body    referencedQuoteIds - 引用的引用体ID数组 (可选)
 * @body    referencedAttachmentIds - 引用的附件ID数组 (可选)
 * @query   populate - 是否填充引用的数据信息 (full/ids，默认为ids)
 * @query   include - 是否包含统计信息 (counts)
 */
router.put('/:id', customPageController.updateCustomPage);

/**
 * @route   DELETE /api/custom-pages/:id
 * @desc    删除自定义页面
 * @access  Private - 需要登录
 * @param   id - 页面ID
 */
router.delete('/:id', customPageController.deleteCustomPage);

module.exports = router;