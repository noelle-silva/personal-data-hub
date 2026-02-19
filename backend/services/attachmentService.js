/**
 * 附件服务层
 * 封装附件相关的业务逻辑，处理文件存储、元数据管理等操作
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const mime = require('mime-types');
const config = require('../config/config');
const Attachment = require('../models/Attachment');
const Document = require('../models/Document');
const Quote = require('../models/Quote');
const sharp = require('sharp');

const thumbnailInFlight = new Map();

/**
 * 附件服务类
 */
class AttachmentService {
  /**
   * 类别 -> 相对目录映射（相对于 attachments.baseDir）
   * @param {String} category
   * @returns {String}
   */
  getRelativeDirForCategory(category) {
    switch (category) {
      case 'image':
        return 'images';
      case 'video':
        return 'videos';
      case 'document':
        return 'document-file';
      case 'script':
        return 'scripts';
      default:
        return 'images';
    }
  }

  /**
   * 获取项目根目录
   * @returns {String} 项目根目录路径
   */
  getProjectRoot() {
    // services 目录位于 backend/services，因此需要返回到项目根目录
    return path.resolve(__dirname, '..', '..');
  }

  /**
   * 解析存储路径，支持相对路径和绝对路径
   * @param {String} dirPath - 配置的目录路径
   * @returns {String} 解析后的绝对路径
   */
  resolveStoragePath(dirPath) {
    if (path.isAbsolute(dirPath)) {
      return dirPath;
    }
    // 相对路径相对于项目根目录
    return path.resolve(this.getProjectRoot(), dirPath);
  }

  /**
   * 确保目录存在，不存在则创建
   * @param {String} dirPath - 目录路径
   */
  async ensureDirectoryExists(dirPath) {
    try {
      await fs.access(dirPath);
    } catch (error) {
      // 目录不存在，创建目录
      await fs.mkdir(dirPath, { recursive: true });
      console.log(`创建附件目录: ${dirPath}`);
    }
  }

  /**
   * 获取类别对应的存储目录
   * @param {String} category - 附件类别
   * @returns {String} 存储目录路径
   */
  getCategoryStorageDir(category) {
    const imageDir = config.attachments.dirs.image;
    const videoDir = config.attachments.dirs.video;
    const documentDir = config.attachments.dirs.document;
    const scriptDir = config.attachments.dirs.script;

    switch (category) {
      case 'image':
        return this.resolveStoragePath(imageDir);
      case 'video':
        return this.resolveStoragePath(videoDir);
      case 'document':
        return this.resolveStoragePath(documentDir);
      case 'script':
        return this.resolveStoragePath(scriptDir);
      default:
        return this.resolveStoragePath(imageDir);
    }
  }

  /**
   * 验证文件类型是否允许
   * @param {String} mimeType - MIME类型
   * @param {String} extension - 文件扩展名
   * @param {String} category - 附件类别
   * @returns {Boolean} 是否允许
   */
  isAllowedFileType(mimeType, extension, category) {
    const normalizedExtension = extension.toLowerCase();
    
    if (category === 'image') {
      const allowedTypes = config.attachments.allowedTypes.image;
      const allowedExtensions = ['png', 'jpg', 'jpeg', 'webp', 'gif'];
      
      return allowedTypes.includes(mimeType) &&
             allowedExtensions.includes(normalizedExtension);
    }
    
    if (category === 'video') {
      const allowedTypes = config.attachments.allowedTypes.video;
      const allowedExtensions = ['mp4', 'webm', 'ogv', 'ogg', 'mov', 'avi', 'wmv', 'flv', 'mkv'];
      
      return allowedTypes.includes(mimeType) &&
             allowedExtensions.includes(normalizedExtension);
    }
    
    if (category === 'document') {
      const allowedTypes = config.attachments.allowedTypes.document;
      const allowedExtensions = ['pdf', 'doc', 'docx', 'txt', 'ppt', 'pptx', 'xls', 'xlsx', 'epub'];
      
      return allowedTypes.includes(mimeType) &&
             allowedExtensions.includes(normalizedExtension);
    }

    if (category === 'script') {
      const allowedTypes = config.attachments.allowedTypes.script;
      const allowedExtensions = ['py', 'sh', 'bat', 'js', 'cpp', 'exe', 'ps1'];
      
      return allowedTypes.includes(mimeType) &&
             allowedExtensions.includes(normalizedExtension);
    }
    
    // 不支持的类别
    return false;
  }

  /**
   * 获取类别对应的最大文件大小
   * @param {String} category - 附件类别
   * @returns {Number} 最大文件大小（字节）
   */
  getMaxFileSize(category) {
    if (category === 'image') {
      return config.attachments.maxSizeBytes.image;
    }
    
    if (category === 'video') {
      return config.attachments.maxSizeBytes.video;
    }
    
    if (category === 'document') {
      return config.attachments.maxSizeBytes.document;
    }

    if (category === 'script') {
      return config.attachments.maxSizeBytes.script;
    }
    
    // 默认大小
    return 10485760; // 10MB
  }

  /**
   * 计算文件的SHA-256哈希值
   * @param {String} filePath - 文件路径
   * @returns {Promise<String>} 哈希值
   */
  async calculateFileHash(filePath) {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = require('fs').createReadStream(filePath);
      
      stream.on('data', (data) => {
        hash.update(data);
      });
      
      stream.on('end', () => {
        resolve(hash.digest('hex'));
      });
      
      stream.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * 生成唯一的磁盘文件名
   * @param {String} extension - 文件扩展名
   * @returns {String} 唯一文件名
   */
  generateDiskFilename(extension) {
    return `${uuidv4()}.${extension}`;
  }

  /**
   * 清洗文件名，移除可能导致响应头注入的字符
   * @param {String} filename - 原始文件名
   * @returns {String} 清洗后的文件名
   */
  sanitizeFilename(filename) {
    if (!filename) return 'unnamed';
    
    // 移除控制字符和可能导致注入的特殊字符
    return filename
      .replace(/[\r\n]/g, '') // 移除换行符
      .replace(/["]/g, '')   // 移除双引号
      .replace(/[<>]/g, '')  // 移除尖括号
      .replace(/[|&]/g, '')  // 移除管道符和&
      .replace(/[\x00-\x1F\x7F]/g, '') // 移除控制字符
      .trim();
  }

  /**
   * 保存上传的文件并创建元数据
   * @param {Object} file - 上传的文件对象
   * @param {String} category - 附件类别
   * @returns {Promise<Object>} 附件元数据
   */
  async saveUploadedFile(file, category = 'image') {
    try {
      // 验证文件类型
      const extension = path.extname(file.originalname).substring(1).toLowerCase();
      const mimeType = file.mimetype;
      
      if (!this.isAllowedFileType(mimeType, extension, category)) {
        throw new Error(`不支持的文件类型: ${mimeType}`);
      }
      
      // 验证文件大小
      const maxSize = this.getMaxFileSize(category);
      if (file.size > maxSize) {
        throw new Error(`文件大小超过限制: ${file.size} > ${maxSize}`);
      }
      
      // 获取存储目录
      const storageDir = this.getCategoryStorageDir(category);
      await this.ensureDirectoryExists(storageDir);
      
      // 生成唯一文件名
      const diskFilename = this.generateDiskFilename(extension);
      const filePath = path.join(storageDir, diskFilename);
      
      // 保存文件（支持buffer和path两种方式）
      if (file.buffer) {
        // 内存存储方式（适用于小文件，如图片）
        await fs.writeFile(filePath, file.buffer);
      } else if (file.path) {
        // 磁盘存储方式（适用于大文件，如视频和文档）
        const fsSync = require('fs');
        const pipeline = require('stream').pipeline;
        const source = fsSync.createReadStream(file.path);
        const destination = fsSync.createWriteStream(filePath);
        
        await new Promise((resolve, reject) => {
          pipeline(source, destination, (err) => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          });
        });
        
        // 删除临时文件
        try {
          await fs.unlink(file.path);
        } catch (error) {
          console.warn(`删除临时文件失败: ${error.message}`);
        }
      } else {
        throw new Error('文件对象缺少buffer或path属性');
      }
      
      // 计算文件哈希
      const hash = await this.calculateFileHash(filePath);
      
      // 检查是否启用去重
      const enableDeduplication = config.attachments.enableDeduplication;
      if (enableDeduplication) {
        const existingAttachment = await Attachment.findByHash(hash);
        if (existingAttachment) {
          // 删除刚保存的文件，返回已存在的附件
          await fs.unlink(filePath);
          console.log(`文件已存在，返回已有附件: ${existingAttachment._id}`);
          return existingAttachment;
        }
      }
      
      const relativeDir = this.getRelativeDirForCategory(category);
      
      // 创建附件元数据
      const attachmentData = {
        category,
        originalName: file.originalname,
        mimeType,
        extension,
        size: file.size,
        diskFilename,
        relativeDir,
        hash
      };
      
      const attachment = new Attachment(attachmentData);
      const savedAttachment = await attachment.save();
      
      console.log(`保存附件成功: ${savedAttachment._id}`);
      return savedAttachment;
      
    } catch (error) {
      throw new Error(`保存附件失败: ${error.message}`);
    }
  }

  /**
   * 断点续传：校验 uploadId（避免路径穿越）
   * @param {String} uploadId
   */
  validateResumableUploadId(uploadId) {
    const id = String(uploadId || '').trim();
    if (!/^[0-9a-fA-F-]{16,64}$/.test(id)) {
      const err = new Error('uploadId 非法');
      err.statusCode = 400;
      throw err;
    }
    return id;
  }

  /**
   * 断点续传：会话工作目录
   */
  async getResumableUploadWorkDir() {
    const baseTmp = this.resolveStoragePath(config.attachments.tmpDir);
    const dir = path.join(baseTmp, 'resumable-uploads');
    await this.ensureDirectoryExists(dir);
    return dir;
  }

  async getResumableMetaPath(uploadId) {
    const id = this.validateResumableUploadId(uploadId);
    const dir = await this.getResumableUploadWorkDir();
    return path.join(dir, `${id}.json`);
  }

  async getResumableDataPath(uploadId) {
    const id = this.validateResumableUploadId(uploadId);
    const dir = await this.getResumableUploadWorkDir();
    return path.join(dir, `${id}.bin`);
  }

  /**
   * 创建断点续传上传会话
   */
  async createResumableUploadSession({ category, originalName, mimeType, size }) {
    const normalizedCategory = String(category || '').trim();
    const normalizedName = this.sanitizeFilename(String(originalName || '').trim());
    const normalizedMime = String(mimeType || '').trim();
    const normalizedSize = Number.parseInt(String(size ?? ''), 10);

    if (!normalizedCategory) {
      const err = new Error('category 不能为空');
      err.statusCode = 400;
      throw err;
    }
    if (!normalizedName) {
      const err = new Error('originalName 不能为空');
      err.statusCode = 400;
      throw err;
    }
    if (!Number.isFinite(normalizedSize) || normalizedSize <= 0) {
      const err = new Error('size 非法');
      err.statusCode = 400;
      throw err;
    }

    const extension = path.extname(normalizedName).substring(1).toLowerCase();
    if (!extension) {
      const err = new Error('文件扩展名为空');
      err.statusCode = 400;
      throw err;
    }

    if (!this.isAllowedFileType(normalizedMime, extension, normalizedCategory)) {
      const err = new Error(`不支持的文件类型: ${normalizedMime}`);
      err.statusCode = 400;
      throw err;
    }

    const maxSize = this.getMaxFileSize(normalizedCategory);
    if (normalizedSize > maxSize) {
      const err = new Error(`文件大小超过限制: ${normalizedSize} > ${maxSize}`);
      err.statusCode = 400;
      throw err;
    }

    const uploadId = uuidv4();
    const metaPath = await this.getResumableMetaPath(uploadId);
    const dataPath = await this.getResumableDataPath(uploadId);

    // 初始化空文件与元数据（幂等：若极端情况下碰撞，直接拒绝）
    try {
      await fs.access(metaPath);
      const err = new Error('uploadId 冲突');
      err.statusCode = 409;
      throw err;
    } catch (error) {
      // meta 不存在：继续；其他错误直接抛出
      if (error && error.statusCode === 409) throw error;
      if (error && error.code && error.code !== 'ENOENT') throw error;
    }

    await fs.writeFile(dataPath, Buffer.alloc(0));

    const now = new Date().toISOString();
    const meta = {
      version: 1,
      uploadId,
      category: normalizedCategory,
      originalName: normalizedName,
      mimeType: normalizedMime,
      extension,
      size: normalizedSize,
      bytesReceived: 0,
      createdAt: now,
      updatedAt: now
    };

    await fs.writeFile(metaPath, JSON.stringify(meta, null, 2), 'utf8');
    return meta;
  }

  async getResumableUploadSession(uploadId) {
    const id = this.validateResumableUploadId(uploadId);
    const metaPath = await this.getResumableMetaPath(id);
    try {
      const raw = await fs.readFile(metaPath, 'utf8');
      const meta = JSON.parse(raw);
      if (!meta || meta.uploadId !== id) {
        const err = new Error('上传会话损坏');
        err.statusCode = 500;
        throw err;
      }
      return meta;
    } catch (error) {
      if (error && (error.code === 'ENOENT' || error.code === 'ENOTDIR')) {
        const err = new Error('上传会话不存在或已过期');
        err.statusCode = 404;
        throw err;
      }
      throw error;
    }
  }

  async writeResumableUploadSession(meta) {
    const metaPath = await this.getResumableMetaPath(meta.uploadId);
    await fs.writeFile(metaPath, JSON.stringify(meta, null, 2), 'utf8');
  }

  async appendResumableUploadChunk(uploadId, chunkBuffer, offset) {
    const id = this.validateResumableUploadId(uploadId);
    const meta = await this.getResumableUploadSession(id);

    const expectedOffset = Number(meta.bytesReceived || 0);
    const chunkSize = chunkBuffer?.length || 0;

    if (!Number.isFinite(offset) || offset < 0) {
      const err = new Error('offset 非法');
      err.statusCode = 400;
      throw err;
    }

    if (offset !== expectedOffset) {
      const err = new Error(`offset 不匹配：expected=${expectedOffset}, got=${offset}`);
      err.statusCode = 409;
      err.expectedOffset = expectedOffset;
      throw err;
    }

    if (!chunkSize) {
      const err = new Error('chunk 为空');
      err.statusCode = 400;
      throw err;
    }

    if (expectedOffset + chunkSize > meta.size) {
      const err = new Error('chunk 超出文件大小');
      err.statusCode = 400;
      throw err;
    }

    const dataPath = await this.getResumableDataPath(id);
    await fs.appendFile(dataPath, chunkBuffer);

    meta.bytesReceived = expectedOffset + chunkSize;
    meta.updatedAt = new Date().toISOString();
    await this.writeResumableUploadSession(meta);

    return meta;
  }

  async abortResumableUploadSession(uploadId) {
    const id = this.validateResumableUploadId(uploadId);
    const metaPath = await this.getResumableMetaPath(id);
    const dataPath = await this.getResumableDataPath(id);

    // 幂等删除
    try { await fs.unlink(metaPath); } catch (_) {}
    try { await fs.unlink(dataPath); } catch (_) {}

    return { uploadId: id };
  }

  async completeResumableUploadSession(uploadId) {
    const id = this.validateResumableUploadId(uploadId);
    const meta = await this.getResumableUploadSession(id);

    if (Number(meta.bytesReceived || 0) !== Number(meta.size || 0)) {
      const err = new Error('上传未完成');
      err.statusCode = 400;
      throw err;
    }

    const dataPath = await this.getResumableDataPath(id);

    // 计算哈希（用于去重）
    const hash = await this.calculateFileHash(dataPath);

    if (config.attachments.enableDeduplication) {
      const existingAttachment = await Attachment.findByHash(hash);
      if (existingAttachment) {
        await this.abortResumableUploadSession(id);
        return existingAttachment;
      }
    }

    const storageDir = this.getCategoryStorageDir(meta.category);
    await this.ensureDirectoryExists(storageDir);

    const diskFilename = this.generateDiskFilename(meta.extension);
    const finalPath = path.join(storageDir, diskFilename);

    await fs.rename(dataPath, finalPath);

    const relativeDir = this.getRelativeDirForCategory(meta.category);
    const attachmentData = {
      category: meta.category,
      originalName: meta.originalName,
      mimeType: meta.mimeType,
      extension: meta.extension,
      size: meta.size,
      diskFilename,
      relativeDir,
      hash
    };

    const attachment = new Attachment(attachmentData);
    const savedAttachment = await attachment.save();

    // 清理元数据文件
    try {
      const metaPath = await this.getResumableMetaPath(id);
      await fs.unlink(metaPath);
    } catch (_) {}

    console.log(`断点续传保存附件成功: ${savedAttachment._id}`);
    return savedAttachment;
  }

  /**
   * 获取附件的完整文件路径
   * @param {Object} attachment - 附件对象
   * @returns {String} 文件路径
   */
  getAttachmentFilePath(attachment) {
    // 使用数据库中存储的 relativeDir 来构建路径，而不是依赖 category 的 switch-case
    const baseDir = this.resolveStoragePath(config.attachments.baseDir);
    return path.join(baseDir, attachment.relativeDir, attachment.diskFilename);
  }

  /**
   * 检查附件文件是否存在
   * @param {Object} attachment - 附件对象
   * @returns {Promise<Boolean>} 文件是否存在
   */
  async checkAttachmentFileExists(attachment) {
    try {
      const filePath = this.getAttachmentFilePath(attachment);
      await fs.access(filePath);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 获取附件文件信息
   * @param {String} filePath - 文件路径
   * @returns {Promise<Object>} 文件信息
   */
  async getAttachmentFileInfo(filePath) {
    try {
      const stats = await fs.stat(filePath);
      return {
        size: stats.size,
        mtime: stats.mtime,
        exists: true
      };
    } catch (error) {
      return {
        exists: false
      };
    }
  }

  /**
   * 删除附件文件和元数据
   * @param {String} attachmentId - 附件ID
   * @returns {Promise<Object>} 删除结果
   */
  async deleteAttachment(attachmentId) {
    try {
      const attachment = await Attachment.findById(attachmentId);
      if (!attachment) {
        // 幂等删除：附件不存在时返回成功消息
        return {
          success: true,
          message: '附件不存在或已删除，视为幂等成功',
          id: attachmentId
        };
      }
      
      // 删除物理文件
      const filePath = this.getAttachmentFilePath(attachment);
      try {
        await fs.unlink(filePath);
        console.log(`删除附件文件: ${filePath}`);
      } catch (error) {
        console.warn(`删除附件文件失败，但继续删除元数据: ${error.message}`);
      }
      
      // 删除元数据或标记为已删除
      await Attachment.findByIdAndDelete(attachmentId);
      
      // 从文档中移除已删除的附件ID
      try {
        const docResult = await Document.updateMany(
          { referencedAttachmentIds: attachmentId },
          { $pull: { referencedAttachmentIds: attachmentId } }
        );
        
        console.log(`已从 ${docResult.modifiedCount} 个文档中移除附件 ${attachmentId} 的引用`);
      } catch (docError) {
        console.error('清理文档附件引用失败:', docError);
        // 不抛出错误，避免影响附件删除
      }
      
      // 从收藏夹中移除已删除的附件ID
      try {
        const quoteResult = await Quote.updateMany(
          { referencedAttachmentIds: attachmentId },
          { $pull: { referencedAttachmentIds: attachmentId } }
        );
        
        console.log(`已从 ${quoteResult.modifiedCount} 个收藏夹中移除附件 ${attachmentId} 的引用`);
      } catch (quoteError) {
        console.error('清理收藏夹附件引用失败:', quoteError);
        // 不抛出错误，避免影响附件删除
      }
      
      return {
        success: true,
        message: '附件删除成功',
        id: attachmentId
      };
      
    } catch (error) {
      throw new Error(`删除附件失败: ${error.message}`);
    }
  }

  /**
   * 根据ID获取附件
   * @param {String} attachmentId - 附件ID
   * @returns {Promise<Object>} 附件对象
   */
  async getAttachmentById(attachmentId) {
    try {
      // 检查ID格式
      if (!attachmentId || typeof attachmentId !== 'string') {
        const error = new Error('无效的附件ID');
        error.statusCode = 400;
        throw error;
      }

      const attachment = await Attachment.findById(attachmentId);
      
      if (!attachment || attachment.status !== 'active') {
        console.warn(`[getAttachmentById] 附件不存在或已删除: ${attachmentId}`);
        const error = new Error('附件不存在或已删除');
        error.statusCode = 404;
        throw error;
      }
      
      // 检查文件是否存在
      const fileExists = await this.checkAttachmentFileExists(attachment);
      if (!fileExists) {
        console.warn(`[getAttachmentById] 附件文件不存在: ${attachmentId}`);
        const error = new Error('附件文件不存在');
        error.statusCode = 404;
        throw error;
      }
      
      return attachment;
      
    } catch (error) {
      // 如果错误已经有statusCode，直接抛出
      if (error.statusCode) {
        throw error;
      }
      
      // 处理特定的Mongoose错误
      if (error.name === 'CastError') {
        console.warn(`[getAttachmentById] 无效的附件ID格式: ${attachmentId}`);
        const castError = new Error('无效的附件ID格式');
        castError.statusCode = 400;
        throw castError;
      }
      
      // 其他未知错误
      console.error(`[getAttachmentById] 获取附件失败:`, {
        attachmentId,
        error: error.message,
        stack: error.stack
      });
      throw new Error(`获取附件失败: ${error.message}`);
    }
  }

  /**
   * 获取附件元数据
   * @param {String} attachmentId - 附件ID
   * @returns {Promise<Object>} 附件元数据
   */
  async getAttachmentMetadata(attachmentId) {
    try {
      const attachment = await this.getAttachmentById(attachmentId);
      
      // 获取文件信息
      const filePath = this.getAttachmentFilePath(attachment);
      const fileInfo = await this.getAttachmentFileInfo(filePath);
      
      // 返回安全的元数据，不包含物理路径
      return {
        _id: attachment._id,
        category: attachment.category,
        originalName: attachment.originalName,
        mimeType: attachment.mimeType,
        extension: attachment.extension,
        size: attachment.size,
        hash: attachment.hash,
        status: attachment.status,
        description: attachment.description || '',
        createdAt: attachment.createdAt,
        updatedAt: attachment.updatedAt,
        url: attachment.url,
        fileInfo
      };
      
    } catch (error) {
      throw new Error(`获取附件元数据失败: ${error.message}`);
    }
  }

  /**
   * 更新附件元数据
   * @param {String} attachmentId - 附件ID
   * @param {Object} payload - 更新数据
   * @param {String} payload.originalName - 原始文件名（可选）
   * @param {String} payload.description - 内容描述（可选）
   * @returns {Promise<Object>} 更新后的附件元数据
   */
  async updateAttachmentMetadata(attachmentId, payload) {
    try {
      // 验证附件存在
      const attachment = await this.getAttachmentById(attachmentId);
      
      // 构建更新对象，只允许更新指定字段
      const updateData = {};
      
      if (payload.originalName !== undefined) {
        // 验证文件名长度
        if (payload.originalName && payload.originalName.length > 255) {
          throw new Error('文件名不能超过255个字符');
        }
        updateData.originalName = payload.originalName;
      }
      
      if (payload.description !== undefined) {
        // 验证描述长度
        if (payload.description && payload.description.length > 20000) {
          throw new Error('内容描述不能超过20000个字符');
        }
        updateData.description = payload.description;
      }
      
      // 如果没有需要更新的字段，直接返回当前元数据
      if (Object.keys(updateData).length === 0) {
        return await this.getAttachmentMetadata(attachmentId);
      }
      
      // 更新附件元数据
      const updatedAttachment = await Attachment.findByIdAndUpdate(
        attachmentId,
        updateData,
        {
          new: true, // 返回更新后的文档
          runValidators: true // 运行验证器
        }
      );
      
      if (!updatedAttachment) {
        throw new Error('附件不存在');
      }
      
      // 返回更新后的元数据
      return await this.getAttachmentMetadata(attachmentId);
      
    } catch (error) {
      throw new Error(`更新附件元数据失败: ${error.message}`);
    }
  }

  /**
   * 获取附件文件流
   * @param {String} attachmentId - 附件ID
   * @param {String} rangeHeader - Range请求头（可选）
   * @returns {Promise<Object>} 文件流和相关信息
   */
  async getAttachmentStream(attachmentId, rangeHeader = null, { ifNoneMatch, ifModifiedSince } = {}) {
    try {
      const debug = config.nodeEnv === 'development' && process.env.PDH_ATTACHMENTS_DEBUG === '1';
      if (debug) {
        console.log(`[getAttachmentStream] 开始处理请求: ID=${attachmentId}, Range=${rangeHeader || '无'}`);
      }
      
      const attachment = await this.getAttachmentById(attachmentId);
      const filePath = this.getAttachmentFilePath(attachment);
      
      if (debug) {
        console.log(`[getAttachmentStream] 文件路径: ${filePath}`);
      }
      
      // 获取文件信息
      const fileInfo = await this.getAttachmentFileInfo(filePath);
      
      if (!fileInfo.exists) {
        console.error(`[getAttachmentStream] 文件不存在: ${filePath}`);
        const error = new Error('附件文件不存在');
        error.statusCode = 404;
        throw error;
      }

      // 条件请求：ETag / If-Modified-Since（命中则不创建文件流）
      if (ifNoneMatch) {
        const hash = attachment.hash;
        const etag = `"${hash}"`;
        const candidates = String(ifNoneMatch)
          .split(',')
          .map(s => s.trim())
          .filter(Boolean);

        const etagMatched = candidates.includes('*') ||
          candidates.includes(etag) ||
          candidates.includes(`W/${etag}`) ||
          candidates.includes(hash) ||
          candidates.includes(`W/"${hash}"`);

        if (etagMatched) {
          if (debug) {
            console.log(`[getAttachmentStream] ETag匹配，返回304（不创建流）`);
          }
          return {
            stream: null,
            attachment,
            fileInfo,
            statusCode: 304
          };
        }
      }

      if (ifModifiedSince) {
        const lastModified = new Date(ifModifiedSince);
        if (!Number.isNaN(lastModified.getTime())) {
          const fileModifiedTime = new Date(fileInfo.mtime);
          if (fileModifiedTime <= lastModified) {
            if (debug) {
              console.log(`[getAttachmentStream] 文件未修改，返回304（不创建流）`);
            }
            return {
              stream: null,
              attachment,
              fileInfo,
              statusCode: 304
            };
          }
        }
      }
      
      // 检查是否启用Range支持
      const enableRange = config.attachments.enableRange;
      if (debug) {
        console.log(`[getAttachmentStream] Range支持: ${enableRange}`);
      }
      
      // 如果没有Range请求头或未启用Range支持，返回完整文件流
      if (!rangeHeader || !enableRange) {
        if (debug) {
          console.log(`[getAttachmentStream] 返回完整文件流`);
        }
        const stream = require('fs').createReadStream(filePath);
        
        return {
          stream,
          attachment,
          fileInfo,
          statusCode: 200
        };
      }
      
      // 解析Range请求头
      if (debug) {
        console.log(`[getAttachmentStream] 解析Range请求头: ${rangeHeader}`);
      }
      const range = this.parseRangeHeader(rangeHeader, fileInfo.size);
      
      if (!range) {
        console.error(`[getAttachmentStream] 无效的Range请求: ${rangeHeader}`);
        // 无效的Range请求
        const error = new Error('无效的Range请求');
        error.statusCode = 416;
        throw error;
      }
      
      if (debug) {
        console.log(`[getAttachmentStream] 创建范围文件流: ${range.start}-${range.end}/${fileInfo.size}`);
      }
      
      // 创建范围文件流
      const stream = require('fs').createReadStream(filePath, {
        start: range.start,
        end: range.end
      });
      
      const rangeMeta = {
        unit: 'bytes',
        start: range.start,
        end: range.end,
        total: fileInfo.size,
        length: range.end - range.start + 1
      };
      
      return {
        stream,
        attachment,
        fileInfo,
        statusCode: 206,
        rangeMeta
      };
      
    } catch (error) {
      console.error(`[getAttachmentStream] 获取文件流失败:`, {
        attachmentId,
        rangeHeader,
        error: error.message,
        stack: error.stack
      });
      
      // 如果错误已经有statusCode，直接抛出，否则包装为通用错误
      if (error.statusCode) {
        throw error;
      }
      throw new Error(`获取附件文件流失败: ${error.message}`);
    }
  }

  /**
   * 解析Range请求头
   * @param {String} rangeHeader - Range请求头
   * @param {Number} fileSize - 文件大小
   * @returns {Object|null} 范围对象或null（如果无效）
   */
  parseRangeHeader(rangeHeader, fileSize) {
    // Range格式: "bytes=start-end" 或 "bytes=start-"
    const rangeRegex = /^bytes=(\d+)-(\d*)$/;
    const match = rangeHeader.match(rangeRegex);
    
    if (!match) {
      return null;
    }
    
    const start = parseInt(match[1], 10);
    const endStr = match[2];
    let end;
    
    if (endStr === '') {
      // "bytes=start-" 表示从start到文件末尾
      end = fileSize - 1;
    } else {
      end = parseInt(endStr, 10);
    }
    
    // 验证范围有效性
    if (
      isNaN(start) || isNaN(end) ||
      start < 0 || end >= fileSize ||
      start > end
    ) {
      return null;
    }
    
    return { start, end };
  }

  /**
   * 获取附件列表
   * @param {Object} options - 查询选项
   * @returns {Promise<Object>} 附件列表和分页信息
   */
  async getAttachments(options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        sort = '-createdAt',
        category = null
      } = options;
      
      const nLimit = parseInt(limit);
      const nPage = parseInt(page);
      const skip = (nPage - 1) * nLimit;
      
      // 构建查询条件
      let filter = { status: 'active' };
      if (category) {
        filter.category = category;
      }
      
      // 查询总数
      const total = await Attachment.countDocuments(filter);
      
      // 查询附件
      let query = Attachment.find(filter)
        .select('-__v') // 排除版本字段
        .sort(sort);
      
      if (nLimit > 0) {
        query = query.skip(skip).limit(nLimit);
      }
      
      const attachments = await query.exec();
      
      // 计算分页信息
      const pages = nLimit > 0 ? Math.ceil(total / nLimit) : 1;
      const pagination = {
        page: nPage,
        limit: nLimit,
        total,
        pages,
        hasNext: nLimit > 0 && nPage < pages,
        hasPrev: nLimit > 0 && nPage > 1
      };
      
      return {
        attachments,
        pagination
      };
      
    } catch (error) {
      throw new Error(`获取附件列表失败: ${error.message}`);
    }
  }

  /**
   * 搜索附件
   * @param {String} searchTerm - 搜索关键词
   * @param {Object} options - 查询选项
   * @returns {Promise<Object>} 搜索结果
   */
  async searchAttachments(searchTerm, options = {}) {
    try {
      if (!searchTerm) {
        throw new Error('搜索关键词不能为空');
      }
      
      const {
        page = 1,
        limit = 20,
        sort = '-createdAt',
        category = null
      } = options;
      
      const nLimit = parseInt(limit);
      const nPage = parseInt(page);
      const skip = (nPage - 1) * nLimit;
      
      // 构建查询条件
      let filter = {
        $and: [
          { status: 'active' },
          { 
            $or: [
              { originalName: { $regex: searchTerm, $options: 'i' } }
            ]
          }
        ]
      };
      
      if (category) {
        filter.$and.push({ category });
      }
      
      // 查询总数
      const total = await Attachment.countDocuments(filter);
      
      // 查询附件
      let query = Attachment.find(filter)
        .select('-__v')
        .sort(sort);
      
      if (nLimit > 0) {
        query = query.skip(skip).limit(nLimit);
      }
      
      const attachments = await query.exec();
      
      // 计算分页信息
      const pages = nLimit > 0 ? Math.ceil(total / nLimit) : 1;
      const pagination = {
        page: nPage,
        limit: nLimit,
        total,
        pages,
        hasNext: nLimit > 0 && nPage < pages,
        hasPrev: nLimit > 0 && nPage > 1
      };
      
      return {
        attachments,
        pagination
      };
      
    } catch (error) {
      throw new Error(`搜索附件失败: ${error.message}`);
    }
  }

  /**
   * 获取附件统计信息
   * @returns {Promise<Object>} 统计信息
   */
  async getAttachmentStats() {
    try {
      // 获取各类别数量
      const total = await Attachment.countDocuments({ status: 'active' });
      const images = await Attachment.countDocuments({
        status: 'active',
        category: 'image'
      });
      const videos = await Attachment.countDocuments({
        status: 'active',
        category: 'video'
      });
      const documents = await Attachment.countDocuments({
        status: 'active',
        category: 'document'
      });
      
      // 计算总大小和各类别大小
      const sizeStats = await Attachment.aggregate([
        { $match: { status: 'active' } },
        { $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalSize: { $sum: '$size' },
          avgSize: { $avg: '$size' },
          maxSize: { $max: '$size' },
          minSize: { $min: '$size' }
        }}
      ]);
      
      // 初始化各类别大小信息
      const categorySizeInfo = {
        image: { count: 0, totalSize: 0, avgSize: 0, maxSize: 0, minSize: 0 },
        video: { count: 0, totalSize: 0, avgSize: 0, maxSize: 0, minSize: 0 },
        document: { count: 0, totalSize: 0, avgSize: 0, maxSize: 0, minSize: 0 }
      };
      
      // 填充各类别大小信息
      sizeStats.forEach(stat => {
        if (categorySizeInfo[stat._id]) {
          categorySizeInfo[stat._id] = stat;
        }
      });
      
      // 计算总体大小信息
      const totalSizeInfo = {
        totalSize: categorySizeInfo.image.totalSize + categorySizeInfo.video.totalSize + categorySizeInfo.document.totalSize,
        avgSize: total > 0 ? (categorySizeInfo.image.totalSize + categorySizeInfo.video.totalSize + categorySizeInfo.document.totalSize) / total : 0,
        maxSize: Math.max(categorySizeInfo.image.maxSize, categorySizeInfo.video.maxSize, categorySizeInfo.document.maxSize),
        minSize: total > 0 ? Math.min(
          categorySizeInfo.image.minSize || 0,
          categorySizeInfo.video.minSize || 0,
          categorySizeInfo.document.minSize || 0
        ) : 0
      };
      
      return {
        total,
        images,
        videos,
        documents,
        sizeInfo: totalSizeInfo,
        categorySizeInfo
      };
      
    } catch (error) {
      throw new Error(`获取附件统计信息失败: ${error.message}`);
    }
  }

  /**
   * 获取附件配置信息
   * @returns {Object} 配置信息
   */
  getAttachmentConfig() {
    return {
      image: {
        maxSize: this.getMaxFileSize('image'),
        allowedTypes: config.attachments.allowedTypes.image,
        acceptString: config.attachments.allowedTypes.image.join(','),
        maxFiles: config.attachments.maxFiles.image
      },
      video: {
        maxSize: this.getMaxFileSize('video'),
        allowedTypes: config.attachments.allowedTypes.video,
        acceptString: config.attachments.allowedTypes.video.join(','),
        maxFiles: config.attachments.maxFiles.video
      },
      document: {
        maxSize: this.getMaxFileSize('document'),
        allowedTypes: config.attachments.allowedTypes.document,
        acceptString: config.attachments.allowedTypes.document.join(','),
        maxFiles: config.attachments.maxFiles.document
      },
      script: {
        maxSize: this.getMaxFileSize('script'),
        allowedTypes: config.attachments.allowedTypes.script,
        acceptString: config.attachments.allowedTypes.script.join(','),
        maxFiles: config.attachments.maxFiles.script
      }
    };
  }

  isEtagMatched(ifNoneMatch, etag) {
    if (!ifNoneMatch) return false;
    const candidates = String(ifNoneMatch)
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    return candidates.includes('*') ||
      candidates.includes(etag) ||
      candidates.includes(`W/${etag}`);
  }

  getThumbnailDir() {
    const baseDir = this.resolveStoragePath(config.attachments.baseDir);
    return path.join(baseDir, 'thumbs');
  }

  buildThumbnailKey({ hash, width, height, fit, format, quality }) {
    const raw = `thumb:${hash}:${width}x${height}:${fit}:${format}:q${quality}`;
    const digest = crypto.createHash('sha1').update(raw).digest('hex');
    return { raw, digest };
  }

  async ensureThumbnailFile(sourcePath, targetPath, { width, height, fit, format, quality }) {
    const existing = await this.getAttachmentFileInfo(targetPath);
    if (existing.exists) return;

    const inflightKey = targetPath;
    const inflight = thumbnailInFlight.get(inflightKey);
    if (inflight) {
      await inflight;
      return;
    }

    const job = (async () => {
      const dir = path.dirname(targetPath);
      await this.ensureDirectoryExists(dir);

      const tmpPath = `${targetPath}.tmp-${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const resizeFit = fit === 'contain' ? 'contain' : 'cover';

      await sharp(sourcePath, { failOnError: false })
        .rotate()
        .resize(width, height, {
          fit: resizeFit,
          withoutEnlargement: true,
          position: 'centre',
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .toFormat(format, { quality })
        .toFile(tmpPath);

      await fs.rename(tmpPath, targetPath);
    })();

    thumbnailInFlight.set(inflightKey, job);
    try {
      await job;
    } finally {
      thumbnailInFlight.delete(inflightKey);
    }
  }

  /**
   * 获取图片附件缩略图（生成并磁盘缓存）
   * @param {String} attachmentId
   * @param {Object} options - width/height/fit/format/quality
   * @param {Object} cond - ifNoneMatch/ifModifiedSince/headOnly
   */
  async getAttachmentThumbnailStream(attachmentId, options, cond = {}) {
    const { ifNoneMatch, ifModifiedSince, headOnly } = cond || {};

    const attachment = await this.getAttachmentById(attachmentId);
    if (!attachment) {
      const error = new Error('附件不存在');
      error.statusCode = 404;
      throw error;
    }

    const isImage = attachment.category === 'image' || String(attachment.mimeType || '').startsWith('image/');
    if (!isImage) {
      const error = new Error('该附件不是图片，无法生成缩略图');
      error.statusCode = 415;
      throw error;
    }

    const sourcePath = this.getAttachmentFilePath(attachment);
    const sourceInfo = await this.getAttachmentFileInfo(sourcePath);
    if (!sourceInfo.exists) {
      const error = new Error('附件文件不存在');
      error.statusCode = 404;
      throw error;
    }

    const { raw, digest } = this.buildThumbnailKey({
      hash: attachment.hash,
      width: options.width,
      height: options.height,
      fit: options.fit,
      format: options.format,
      quality: options.quality
    });

    const etag = `"${digest}"`;

    // ETag 协商：命中则直接 304（不创建缩略图也不读磁盘）
    const ext = options.format === 'jpeg' ? 'jpg' : options.format;

    if (this.isEtagMatched(ifNoneMatch, etag)) {
      return {
        stream: null,
        mimeType: mime.lookup(ext) || `image/${options.format}`,
        fileInfo: { size: 0, mtime: sourceInfo.mtime, exists: true },
        etag,
        statusCode: 304
      };
    }

    const thumbDir = this.getThumbnailDir();
    const thumbPath = path.join(thumbDir, `${digest}.${ext}`);

    await this.ensureThumbnailFile(sourcePath, thumbPath, options);

    const fileInfo = await this.getAttachmentFileInfo(thumbPath);
    if (!fileInfo.exists) {
      const error = new Error('缩略图生成失败');
      error.statusCode = 500;
      throw error;
    }

    // If-Modified-Since 协商（基于缩略图文件 mtime）
    if (ifModifiedSince) {
      const lastModified = new Date(ifModifiedSince);
      if (!Number.isNaN(lastModified.getTime())) {
        const fileModifiedTime = new Date(fileInfo.mtime);
        if (fileModifiedTime <= lastModified) {
          return {
            stream: null,
            mimeType: mime.lookup(ext) || `image/${options.format}`,
            fileInfo,
            etag,
            statusCode: 304
          };
        }
      }
    }

    const mimeType = mime.lookup(ext) || `image/${options.format}`;
    if (headOnly) {
      return { stream: null, mimeType, fileInfo, etag, statusCode: 200 };
    }

    const stream = fsSync.createReadStream(thumbPath);
    return { stream, mimeType, fileInfo, etag, statusCode: 200, key: raw };
  }
}

// 导出服务实例
module.exports = new AttachmentService();
