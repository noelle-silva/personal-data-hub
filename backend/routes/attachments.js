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
const config = require('../config/config');

// 桌面端专用：所有附件接口都要求登录态（JWT Bearer）
router.use(requireAuth);

/**
 * 配置multer用于文件上传
 */
const imageStorage = multer.memoryStorage();

// 文件过滤器，只允许图片文件
const imageFileFilter = (req, file, cb) => {
  // 检查MIME类型
  const allowedMimeTypes = config.attachments.allowedTypes.image;
  
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
    fileSize: config.attachments.maxSizeBytes.image,
    files: 1 // 一次只允许上传一个文件
  },
  fileFilter: imageFileFilter
});

// 配置视频和文档上传的磁盘存储
const fs = require('fs');

const resolveStoragePath = (dirPath) => {
  if (!dirPath) return dirPath;
  if (path.isAbsolute(dirPath)) return dirPath;

  // 相对路径统一相对于项目根目录（与 AttachmentService.resolveStoragePath 对齐）
  const projectRoot = path.resolve(__dirname, '..', '..');
  return path.resolve(projectRoot, dirPath);
};

// 确保临时目录存在
const tmpDir = resolveStoragePath(config.attachments.tmpDir);
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
  const allowedMimeTypes = config.attachments.allowedTypes.video;
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`不支持的文件类型: ${file.mimetype}`), false);
  }
};

// 文件过滤器，只允许文档文件
const documentFileFilter = (req, file, cb) => {
  // 检查MIME类型
  const allowedMimeTypes = config.attachments.allowedTypes.document;
  
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
    fileSize: config.attachments.maxSizeBytes.video,
    files: 1 // 一次只允许上传一个文件
  },
  fileFilter: videoFileFilter
});

// 配置文档上传multer
const documentUpload = multer({
  storage: diskStorage,
  limits: {
    fileSize: config.attachments.maxSizeBytes.document,
    files: 1 // 一次只允许上传一个文件
  },
  fileFilter: documentFileFilter
});

// 文件过滤器，只允许脚本和程序文件
const scriptFileFilter = (req, file, cb) => {
  // 检查MIME类型
  const allowedMimeTypes = config.attachments.allowedTypes.script;
  
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
    fileSize: config.attachments.maxSizeBytes.script,
    files: 1 // 一次只允许上传一个文件
  },
  fileFilter: scriptFileFilter
});

/**
 * 分片/断点续传：chunk 上传（内存存储，服务层负责落盘）
 */
const resumableChunkUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    // 单个 chunk 上限：8MB（避免占用过多内存；客户端会按更小 chunk 分片）
    fileSize: 8 * 1024 * 1024,
    files: 1
  }
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
 * @route   POST /api/attachments/uploads/init
 * @desc    初始化断点续传上传会话
 * @access  Private (需要登录态鉴权)
 * @body    category/originalName/mimeType/size
 */
router.post('/uploads/init', attachmentController.initResumableUpload);

/**
 * @route   GET /api/attachments/uploads/:uploadId
 * @desc    查询上传会话状态（用于断点续传）
 * @access  Private
 */
router.get('/uploads/:uploadId', attachmentController.getResumableUploadStatus);

/**
 * @route   POST /api/attachments/uploads/:uploadId/chunk
 * @desc    上传一个分片（按 offset 顺序追加）
 * @access  Private
 * @query   offset - 分片起始偏移（字节）
 * @form    chunk - 分片二进制
 */
router.post(
  '/uploads/:uploadId/chunk',
  resumableChunkUpload.single('chunk'),
  attachmentController.uploadResumableChunk
);

/**
 * @route   POST /api/attachments/uploads/:uploadId/complete
 * @desc    完成上传（合并/落盘/写元数据/去重）
 * @access  Private
 */
router.post('/uploads/:uploadId/complete', attachmentController.completeResumableUpload);

/**
 * @route   DELETE /api/attachments/uploads/:uploadId
 * @desc    取消上传并清理临时文件
 * @access  Private
 */
router.delete('/uploads/:uploadId', attachmentController.abortResumableUpload);

/**
 * @route   GET /api/attachments
 * @desc    获取附件列表
 * @access  Private (需要登录态鉴权)
 * @query   page - 页码 (默认: 1)
 * @query   limit - 每页数量 (默认: 20)
 * @query   sort - 排序字段 (默认: -createdAt)
 * @query   category - 附件类别 (可选)
 */
router.get('/', attachmentController.getAttachments);

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
router.get('/search', attachmentController.searchAttachments);

/**
 * @route   GET /api/attachments/stats
 * @desc    获取附件统计信息
 * @access  Private (需要登录态鉴权)
 */
router.get('/stats', attachmentController.getAttachmentStats);

/**
 * @route   GET /api/attachments/config
 * @desc    获取附件配置信息
 * @access  Private (需要登录态鉴权)
  */
  router.get('/config', attachmentController.getConfig);

  /**
   * @route   GET /api/attachments/:id/thumb
   * @desc    获取图片附件缩略图（用于列表预览）
   * @access  Private (需要登录态鉴权)
   * @param   id - 附件ID
   * @query   w - 宽度（默认 560）
   * @query   h - 高度（默认 360）
   * @query   fit - 裁剪方式（默认 cover）
   * @query   format - 输出格式（默认 webp）
   * @query   q - 质量（默认 75）
   */
  router.get('/:id/thumb', attachmentController.getThumbnail);
  router.head('/:id/thumb', attachmentController.headThumbnail);

  /**
   * @route   GET /api/attachments/:id
   * @desc    获取附件文件
   * @access  Private (需要登录态鉴权)
   * @param   id - 附件ID
   */
  router.get('/:id', attachmentController.getFile);

/**
 * @route   HEAD /api/attachments/:id
 * @desc    获取附件文件头信息
 * @access  Private (需要登录态鉴权)
 * @param   id - 附件ID
 */
router.head('/:id', attachmentController.headFile);

/**
 * @route   GET /api/attachments/:id/meta
 * @desc    获取附件元数据
 * @access  Private (需要登录态鉴权)
 * @param   id - 附件ID
 */
router.get('/:id/meta', attachmentController.getMetadata);

/**
 * @route   PATCH /api/attachments/:id/meta
 * @desc    更新附件元数据
 * @access  Private (需要登录态鉴权)
 * @param   id - 附件ID
 * @body    originalName - 原始文件名（可选）
 * @body    description - 内容描述（可选）
 */
router.patch('/:id/meta', attachmentController.updateMetadata);

/**
 * @route   POST /api/attachments/:category
 * @desc    上传附件文件（支持图片、视频、文档）
 * @access  Private (需要登录态鉴权)
 * @param   category - 附件类别 (image/video/document/script)
 * @body    file - 附件文件 (必填)
 */
router.post('/:category', dynamicMulterMiddleware, attachmentController.uploadAttachment);

/**
 * @route   DELETE /api/attachments/:id
 * @desc    删除附件
 * @access  Private (需要登录态鉴权)
 * @param   id - 附件ID
 */
router.delete('/:id', attachmentController.deleteAttachment);

module.exports = router;
