/**
 * 附件API路由
 * 定义附件相关的RESTful API端点
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const attachmentController = require('../controllers/attachmentController');
const requireAuth = require('../middlewares/requireAuth');
const requireCsrf = require('../middlewares/requireCsrf');
const { requireAuthOrSignedUrl } = require('../middlewares/requireAttachmentAuth');

/**
 * 配置multer用于文件上传
 */
const imageStorage = multer.memoryStorage();

// 文件过滤器，只允许图片文件
const imageFileFilter = (req, file, cb) => {
  // 检查MIME类型
  const allowedMimeTypes = (process.env.ATTACHMENTS_ALLOWED_IMAGE_TYPES || 'image/png,image/jpeg,image/webp,image/gif').split(',');
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`不支持的文件类型: ${file.mimetype}`), false);
  }
};

// 配置图片上传multer
const imageUpload = multer({
  storage: imageStorage,
  limits: {
    fileSize: parseInt(process.env.ATTACHMENTS_MAX_IMAGE_SIZE) || 10485760, // 默认10MB
    files: 1 // 一次只允许上传一个文件
  },
  fileFilter: imageFileFilter
});

// 配置视频和文档上传的磁盘存储
const fs = require('fs');

// 确保临时目录存在
const tmpDir = process.env.ATTACHMENTS_TMP_DIR || 'backend/attachments/tmp';
if (!fs.existsSync(tmpDir)) {
  fs.mkdirSync(tmpDir, { recursive: true });
}

const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tmpDir);
  },
  filename: (req, file, cb) => {
    // 生成唯一文件名
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// 文件过滤器，只允许视频文件
const videoFileFilter = (req, file, cb) => {
  // 检查MIME类型
  const allowedMimeTypes = (process.env.ATTACHMENTS_ALLOWED_VIDEO_TYPES || 'video/mp4,video/webm,video/ogg,video/quicktime,video/x-msvideo,video/x-matroska,video/x-flv').split(',');
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`不支持的文件类型: ${file.mimetype}`), false);
  }
};

// 文件过滤器，只允许文档文件
const documentFileFilter = (req, file, cb) => {
  // 检查MIME类型
  const allowedMimeTypes = (process.env.ATTACHMENTS_ALLOWED_DOCUMENT_TYPES || 'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet').split(',');
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`不支持的文件类型: ${file.mimetype}`), false);
  }
};

// 配置视频上传multer
const videoUpload = multer({
  storage: diskStorage,
  limits: {
    fileSize: parseInt(process.env.ATTACHMENTS_MAX_VIDEO_SIZE) || 1073741824, // 默认1GB
    files: 1 // 一次只允许上传一个文件
  },
  fileFilter: videoFileFilter
});

// 配置文档上传multer
const documentUpload = multer({
  storage: diskStorage,
  limits: {
    fileSize: parseInt(process.env.ATTACHMENTS_MAX_DOCUMENT_SIZE) || 52428800, // 默认50MB
    files: 1 // 一次只允许上传一个文件
  },
  fileFilter: documentFileFilter
});

// 文件过滤器，只允许脚本和程序文件
const scriptFileFilter = (req, file, cb) => {
  // 检查MIME类型
  const allowedMimeTypes = (process.env.ATTACHMENTS_ALLOWED_SCRIPT_TYPES || 'text/x-python,application/x-msdos-program,text/x-shellscript,application/javascript,text/x-c++src,application/x-msdownload').split(',');
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`不支持的文件类型: ${file.mimetype}`), false);
  }
};

// 配置脚本和程序上传multer
const scriptUpload = multer({
  storage: diskStorage,
  limits: {
    fileSize: parseInt(process.env.ATTACHMENTS_MAX_SCRIPT_SIZE) || 10485760, // 默认10MB
    files: 1 // 一次只允许上传一个文件
  },
  fileFilter: scriptFileFilter
});

/**
 * 动态Multer中间件，根据URL中的category参数选择相应的multer配置
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express下一个中间件函数
 */
const dynamicMulterMiddleware = (req, res, next) => {
  const category = req.params.category;
  let uploader;
  
  if (category === 'image') {
    uploader = imageUpload;
  } else if (category === 'video') {
    uploader = videoUpload;
  } else if (category === 'document') {
    uploader = documentUpload;
  } else if (category === 'script') {
    uploader = scriptUpload;
  } else {
    return res.status(400).json({
      success: false,
      message: '不支持的附件类别'
    });
  }
  
  uploader.single('file')(req, res, next);
};

/**
 * @route   POST /api/attachments/:category
 * @desc    上传附件文件（支持图片、视频、文档）
 * @access  Private (需要登录态鉴权)
 * @param   category - 附件类别 (image/video/document)
 * @body    file - 附件文件 (必填)
 */
router.post('/:category', requireAuth, requireCsrf, dynamicMulterMiddleware, attachmentController.uploadAttachment);

/**
 * @route   GET /api/attachments
 * @desc    获取附件列表
 * @access  Private (需要登录态鉴权)
 * @query   page - 页码 (默认: 1)
 * @query   limit - 每页数量 (默认: 20)
 * @query   sort - 排序字段 (默认: -createdAt)
 * @query   category - 附件类别 (可选)
 */
router.get('/', requireAuth, attachmentController.getAttachments);

/**
 * @route   GET /api/attachments/search
 * @desc    搜索附件
 * @access  Private (需要登录态鉴权)
 * @query   q - 搜索关键词 (必填，至少2个字符)
 * @query   page - 页码 (可选，默认为1)
 * @query   limit - 每页数量 (可选，默认为20，最大为50)
 * @query   sort - 排序字段 (可选，默认为'-createdAt')
 * @query   category - 附件类别 (可选)
 */
router.get('/search', requireAuth, attachmentController.searchAttachments);

/**
 * @route   GET /api/attachments/stats
 * @desc    获取附件统计信息
 * @access  Private (需要登录态鉴权)
 */
router.get('/stats', requireAuth, attachmentController.getAttachmentStats);

/**
 * @route   GET /api/attachments/config
 * @desc    获取附件配置信息
 * @access  Private (需要登录态鉴权)
 */
router.get('/config', requireAuth, attachmentController.getConfig);

/**
 * @route   GET /api/attachments/:id
 * @desc    获取附件文件
 * @access  Public (登录态或签名URL鉴权)
 * @param   id - 附件ID
 * @query   token - 签名令牌 (签名URL鉴权时必填)
 * @query   exp - 过期时间戳 (签名URL鉴权时必填)
 */
router.get('/:id', requireAuthOrSignedUrl, attachmentController.getFile);

/**
 * @route   HEAD /api/attachments/:id
 * @desc    获取附件文件头信息
 * @access  Public (登录态或签名URL鉴权)
 * @param   id - 附件ID
 * @query   token - 签名令牌 (签名URL鉴权时必填)
 * @query   exp - 过期时间戳 (签名URL鉴权时必填)
 */
router.head('/:id', requireAuthOrSignedUrl, attachmentController.headFile);

/**
 * @route   GET /api/attachments/:id/meta
 * @desc    获取附件元数据
 * @access  Private (需要登录态鉴权)
 * @param   id - 附件ID
 */
router.get('/:id/meta', requireAuth, attachmentController.getMetadata);

/**
 * @route   PATCH /api/attachments/:id/meta
 * @desc    更新附件元数据
 * @access  Private (需要登录态鉴权)
 * @param   id - 附件ID
 * @body    originalName - 原始文件名（可选）
 * @body    description - 内容描述（可选）
 */
router.patch('/:id/meta', requireAuth, requireCsrf, attachmentController.updateMetadata);

/**
 * @route   POST /api/attachments/:id/signed
 * @desc    生成签名URL
 * @access  Private (需要登录态鉴权)
 * @param   id - 附件ID
 * @query   ttl - 有效期（秒，可选，默认使用配置值）
 */
router.post('/:id/signed', requireAuth, requireCsrf, attachmentController.generateSignedUrl);

/**
 * @route   POST /api/attachments/signed-batch
 * @desc    批量生成签名URL
 * @access  Private (需要登录态鉴权)
 * @body    ids - 附件ID数组
 * @body    ttl - 有效期（秒，可选）
 */
router.post('/signed-batch', requireAuth, requireCsrf, attachmentController.generateSignedUrlBatch);

/**
 * @route   DELETE /api/attachments/:id
 * @desc    删除附件
 * @access  Private (需要登录态鉴权)
 * @param   id - 附件ID
 */
router.delete('/:id', requireAuth, requireCsrf, attachmentController.deleteAttachment);

module.exports = router;
