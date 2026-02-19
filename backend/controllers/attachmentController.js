/**
 * 附件控制器层
 * 处理HTTP请求和响应，调用服务层方法处理业务逻辑
 */

const attachmentService = require('../services/attachmentService');
const config = require('../config/config');

/**
 * 附件控制器类
 */
class AttachmentController {
  parseThumbOptions(req) {
    const wRaw = req.query?.w;
    const hRaw = req.query?.h;
    const qRaw = req.query?.q;
    const fitRaw = req.query?.fit;
    const formatRaw = req.query?.format;

    const toIntOr = (value, fallback) => {
      const n = Number.parseInt(String(value ?? ''), 10);
      return Number.isFinite(n) ? n : fallback;
    };

    const width = toIntOr(wRaw, 560);
    const height = toIntOr(hRaw, 360);
    const quality = toIntOr(qRaw, 75);

    const fit = String(fitRaw || 'cover').trim().toLowerCase();
    const format = String(formatRaw || 'webp').trim().toLowerCase();

    if (width < 16 || width > 2048) {
      const err = new Error('w 超出范围（16-2048）');
      err.statusCode = 400;
      throw err;
    }

    if (height < 16 || height > 2048) {
      const err = new Error('h 超出范围（16-2048）');
      err.statusCode = 400;
      throw err;
    }

    if (quality < 20 || quality > 95) {
      const err = new Error('q 超出范围（20-95）');
      err.statusCode = 400;
      throw err;
    }

    if (!['cover', 'contain'].includes(fit)) {
      const err = new Error('fit 非法（仅支持 cover/contain）');
      err.statusCode = 400;
      throw err;
    }

    if (!['webp', 'jpeg', 'jpg', 'png'].includes(format)) {
      const err = new Error('format 非法（仅支持 webp/jpeg/png）');
      err.statusCode = 400;
      throw err;
    }

    return {
      width,
      height,
      quality,
      fit,
      format: format === 'jpg' ? 'jpeg' : format
    };
  }

  /**
   * 通用上传附件方法
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   * @param {Function} next - Express下一个中间件函数
   */
  async uploadAttachment(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: '请选择要上传的文件'
        });
      }

      // 从URL参数中动态获取类别
      const { category } = req.params;

      // 修正文件名编码：multer将UTF-8编码的文件名错误地按latin1解码，需要转回UTF-8
      if (req.file.originalname) {
        req.file.originalname = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
      }

      const attachment = await attachmentService.saveUploadedFile(req.file, category);

      // 返回创建成功响应
      res.status(201).json({
        success: true,
        data: {
          _id: attachment._id,
          category: attachment.category,
          originalName: attachment.originalName,
          mimeType: attachment.mimeType,
          extension: attachment.extension,
          size: attachment.size,
          hash: attachment.hash,
          url: attachment.url,
          createdAt: attachment.createdAt
        },
        message: `${category}附件上传成功`
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 初始化断点续传上传会话
   * @param {Object} req
   * @param {Object} res
   * @param {Function} next
   */
  async initResumableUpload(req, res, next) {
    try {
      const { category, originalName, mimeType, size } = req.body || {};

      const session = await attachmentService.createResumableUploadSession({
        category,
        originalName,
        mimeType,
        size
      });

      res.status(201).json({
        success: true,
        data: {
          uploadId: session.uploadId,
          bytesReceived: session.bytesReceived,
          size: session.size,
          category: session.category,
          originalName: session.originalName,
          mimeType: session.mimeType,
          extension: session.extension,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt
        },
        message: '初始化上传会话成功'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取上传会话状态（用于断点续传）
   */
  async getResumableUploadStatus(req, res, next) {
    try {
      const { uploadId } = req.params;
      const session = await attachmentService.getResumableUploadSession(uploadId);

      res.status(200).json({
        success: true,
        data: {
          uploadId: session.uploadId,
          bytesReceived: session.bytesReceived,
          size: session.size,
          category: session.category,
          originalName: session.originalName,
          mimeType: session.mimeType,
          extension: session.extension,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt
        },
        message: '获取上传会话成功'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 上传分片（按 offset 追加）
   */
  async uploadResumableChunk(req, res, next) {
    try {
      const { uploadId } = req.params;
      const offset = Number.parseInt(String(req.query?.offset ?? ''), 10);

      if (!Number.isFinite(offset) || offset < 0) {
        return res.status(400).json({
          success: false,
          message: 'offset 非法（必须为非负整数）'
        });
      }

      if (!req.file || !req.file.buffer) {
        return res.status(400).json({
          success: false,
          message: 'chunk 不能为空'
        });
      }

      const session = await attachmentService.appendResumableUploadChunk(
        uploadId,
        req.file.buffer,
        offset
      );

      res.status(200).json({
        success: true,
        data: {
          uploadId: session.uploadId,
          bytesReceived: session.bytesReceived,
          size: session.size
        },
        message: '分片上传成功'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 完成断点续传上传
   */
  async completeResumableUpload(req, res, next) {
    try {
      const { uploadId } = req.params;
      const attachment = await attachmentService.completeResumableUploadSession(uploadId);

      res.status(201).json({
        success: true,
        data: {
          _id: attachment._id,
          category: attachment.category,
          originalName: attachment.originalName,
          mimeType: attachment.mimeType,
          extension: attachment.extension,
          size: attachment.size,
          hash: attachment.hash,
          url: attachment.url,
          createdAt: attachment.createdAt
        },
        message: '附件上传成功'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 取消上传并清理临时文件
   */
  async abortResumableUpload(req, res, next) {
    try {
      const { uploadId } = req.params;
      const result = await attachmentService.abortResumableUploadSession(uploadId);

      res.status(200).json({
        success: true,
        data: result,
        message: '已取消上传'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取附件文件
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   * @param {Function} next - Express下一个中间件函数
   */
  async getFile(req, res, next) {
    try {
      const { id } = req.params;
      const rangeHeader = req.headers.range;
      const debug = config.nodeEnv === 'development' && process.env.PDH_ATTACHMENTS_DEBUG === '1';

      // 条件请求：交由 service 处理，避免 304 时仍创建文件流
      const ifNoneMatch = req.headers['if-none-match'];
      const ifModifiedSince = req.headers['if-modified-since'];

      const { stream, attachment, fileInfo, statusCode, rangeMeta } = await attachmentService.getAttachmentStream(
        id,
        rangeHeader,
        { ifNoneMatch, ifModifiedSince }
      );

      if (debug) {
        console.log(`[getFile] 请求附件 ID: ${id}, Range: ${rangeHeader || '无'}, 状态码: ${statusCode}`);
      }

      // 清洗文件名
      const sanitizedFilename = attachmentService.sanitizeFilename(attachment.originalName);
      
      // 创建符合RFC 6266/RFC 5987的Content-Disposition头
      // 提供ASCII回退文件名和UTF-8编码的文件名
      const asciiFallback = sanitizedFilename.replace(/[^\x00-\x7F]/g, '_') || 'file';
      const encodedFilename = encodeURIComponent(sanitizedFilename);
      const contentDisposition = `inline; filename="${asciiFallback}"; filename*=UTF-8''${encodedFilename}`;
      const etag = `"${attachment.hash}"`;

      // 设置响应头
      const headers = {
        'Content-Type': attachment.mimeType,
        'ETag': etag,
        'Last-Modified': fileInfo.mtime.toUTCString(),
        'Cache-Control': `private, max-age=${config.attachments.cacheTtl || 3600}, immutable`,
        'Content-Disposition': contentDisposition
      };

      // 304：不返回 body，不需要/不应创建文件流
      if (statusCode === 304) {
        res.set(headers);
        return res.status(304).end();
      }

      // 处理Range请求
      if (statusCode === 206 && rangeMeta) {
        headers['Accept-Ranges'] = 'bytes';
        headers['Content-Range'] = `${rangeMeta.unit} ${rangeMeta.start}-${rangeMeta.end}/${rangeMeta.total}`;
        headers['Content-Length'] = rangeMeta.length;
        res.status(206);
        if (debug) {
          console.log(`[getFile] 返回Range响应: ${headers['Content-Range']}`);
        }
      } else {
        headers['Content-Length'] = fileInfo.size;
        // 即使是200响应，如果启用了Range支持，也添加Accept-Ranges头
        if (config.attachments.enableRange) {
          headers['Accept-Ranges'] = 'bytes';
        }
        res.status(200);
        if (debug) {
          console.log(`[getFile] 返回完整文件响应，大小: ${fileInfo.size}`);
        }
      }

      res.set(headers);

      // 添加请求中止处理
      const cleanup = () => {
        if (debug) {
          console.log(`[getFile] 请求已中止或连接已关闭，销毁文件流`);
        }
        if (stream && !stream.destroyed) {
          stream.destroy();
        }
      };

      req.on('aborted', cleanup);
      res.on('close', cleanup);

      // 流式传输文件
      stream.pipe(res);

      // 处理流错误
      stream.on('error', (error) => {
        console.error(`[getFile] 文件流错误:`, error);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            message: '文件传输错误'
          });
        }
      });

      // 流完成处理
      stream.on('end', () => {
        if (debug) {
          console.log(`[getFile] 文件流传输完成: ${id}`);
        }
      });

    } catch (error) {
      console.error(`[getFile] 处理请求时出错:`, {
        id: req.params.id,
        range: req.headers.range,
        error: error.message,
        stack: error.stack
      });
      next(error);
    }
  }

  /**
   * 获取图片缩略图（列表预览用）
   */
  async getThumbnail(req, res, next) {
    try {
      const { id } = req.params;
      const options = this.parseThumbOptions(req);
      const ifNoneMatch = req.headers['if-none-match'];
      const ifModifiedSince = req.headers['if-modified-since'];

      const {
        stream,
        mimeType,
        fileInfo,
        etag,
        statusCode
      } = await attachmentService.getAttachmentThumbnailStream(id, options, { ifNoneMatch, ifModifiedSince });

      const headers = {
        'Content-Type': mimeType,
        'ETag': etag,
        'Last-Modified': fileInfo.mtime.toUTCString(),
        'Cache-Control': `private, max-age=${config.attachments.cacheTtl || 3600}, immutable`,
        'Content-Disposition': 'inline'
      };

      if (statusCode === 304) {
        res.set(headers);
        return res.status(304).end();
      }

      headers['Content-Length'] = fileInfo.size;
      res.set(headers);
      res.status(200);

      const cleanup = () => {
        if (stream && !stream.destroyed) {
          stream.destroy();
        }
      };

      req.on('aborted', cleanup);
      res.on('close', cleanup);

      stream.pipe(res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取图片缩略图头信息（用于缓存协商）
   */
  async headThumbnail(req, res, next) {
    try {
      const { id } = req.params;
      const options = this.parseThumbOptions(req);
      const ifNoneMatch = req.headers['if-none-match'];
      const ifModifiedSince = req.headers['if-modified-since'];

      const {
        mimeType,
        fileInfo,
        etag,
        statusCode
      } = await attachmentService.getAttachmentThumbnailStream(id, options, { ifNoneMatch, ifModifiedSince, headOnly: true });

      const headers = {
        'Content-Type': mimeType,
        'ETag': etag,
        'Last-Modified': fileInfo.mtime.toUTCString(),
        'Cache-Control': `private, max-age=${config.attachments.cacheTtl || 3600}, immutable`,
        'Content-Disposition': 'inline',
        'Content-Length': fileInfo.size
      };

      res.set(headers);
      res.status(statusCode === 304 ? 304 : 200).end();
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取附件文件头信息
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   * @param {Function} next - Express下一个中间件函数
   */
  async headFile(req, res, next) {
    try {
      const { id } = req.params;
      
      // 检查If-None-Match和If-Modified-Since头
      const ifNoneMatch = req.headers['if-none-match'];
      const ifModifiedSince = req.headers['if-modified-since'];

      const attachment = await attachmentService.getAttachmentById(id);
      const filePath = attachmentService.getAttachmentFilePath(attachment);
      const fileInfo = await attachmentService.getAttachmentFileInfo(filePath);
      const etag = `"${attachment.hash}"`;

      // 检查ETag
      if (ifNoneMatch) {
        const hash = attachment.hash;
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
          return res.status(304).end();
        }
      }

      // 检查Last-Modified
      if (ifModifiedSince) {
        const lastModified = new Date(ifModifiedSince);
        const fileModifiedTime = new Date(fileInfo.mtime);
        if (fileModifiedTime <= lastModified) {
          return res.status(304).end();
        }
      }

      // 清洗文件名
      const sanitizedFilename = attachmentService.sanitizeFilename(attachment.originalName);
      
      // 创建符合RFC 6266/RFC 5987的Content-Disposition头
      // 提供ASCII回退文件名和UTF-8编码的文件名
      const asciiFallback = sanitizedFilename.replace(/[^\x00-\x7F]/g, '_') || 'file';
      const encodedFilename = encodeURIComponent(sanitizedFilename);
      const contentDisposition = `inline; filename="${asciiFallback}"; filename*=UTF-8''${encodedFilename}`;

      // 设置响应头
      const headers = {
        'Content-Type': attachment.mimeType,
        'Content-Length': fileInfo.size,
        'ETag': etag,
        'Last-Modified': fileInfo.mtime.toUTCString(),
        'Cache-Control': `private, max-age=${config.attachments.cacheTtl || 3600}`,
        'Content-Disposition': contentDisposition
      };

      // 如果启用了Range支持，添加Accept-Ranges头
      if (config.attachments.enableRange) {
        headers['Accept-Ranges'] = 'bytes';
      }

      res.set(headers);
      res.status(200).end();

    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取附件元数据
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   * @param {Function} next - Express下一个中间件函数
   */
  async getMetadata(req, res, next) {
    try {
      const { id } = req.params;
      
      const metadata = await attachmentService.getAttachmentMetadata(id);

      // 返回成功响应
      res.status(200).json({
        success: true,
        data: metadata,
        message: '获取附件元数据成功'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 删除附件
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   * @param {Function} next - Express下一个中间件函数
   */
  async deleteAttachment(req, res, next) {
    try {
      const { id } = req.params;
      
      const result = await attachmentService.deleteAttachment(id);

      // 返回删除成功响应
      res.status(200).json({
        success: true,
        data: result,
        message: '附件删除成功'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取附件列表
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   * @param {Function} next - Express下一个中间件函数
   */
  async getAttachments(req, res, next) {
    try {
      // 从查询参数获取分页和排序选项
      const options = {
        page: req.query.page ? parseInt(req.query.page) : 1,
        limit: req.query.limit ? parseInt(req.query.limit) : 20,
        sort: req.query.sort || '-createdAt',
        category: req.query.category || null
      };

      const result = await attachmentService.getAttachments(options);

      // 返回成功响应
      res.status(200).json({
        success: true,
        data: result.attachments,
        pagination: result.pagination,
        message: '获取附件列表成功'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 搜索附件
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   * @param {Function} next - Express下一个中间件函数
   */
  async searchAttachments(req, res, next) {
    try {
      const { q, category } = req.query;
      
      // 参数验证
      if (!q) {
        return res.status(400).json({
          success: false,
          message: '请提供搜索关键词'
        });
      }
      
      if (q.length < 2) {
        return res.status(400).json({
          success: false,
          message: '搜索关键词至少需要2个字符'
        });
      }

      // 解析查询参数
      const options = {
        page: req.query.page ? parseInt(req.query.page) : 1,
        limit: req.query.limit ? Math.min(parseInt(req.query.limit), 50) : 20,
        sort: req.query.sort || '-createdAt',
        category
      };

      const result = await attachmentService.searchAttachments(q, options);

      // 返回搜索结果
      res.status(200).json({
        success: true,
        data: result.attachments,
        pagination: result.pagination,
        message: '搜索附件成功'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取附件统计信息
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   * @param {Function} next - Express下一个中间件函数
   */
  async getAttachmentStats(req, res, next) {
    try {
      const stats = await attachmentService.getAttachmentStats();

      // 返回统计信息
      res.status(200).json({
        success: true,
        data: stats,
        message: '获取附件统计信息成功'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 更新附件元数据
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   * @param {Function} next - Express下一个中间件函数
   */
  async updateMetadata(req, res, next) {
    try {
      const { id } = req.params;
      const { originalName, description } = req.body;

      // 参数验证
      if (originalName !== undefined && typeof originalName !== 'string') {
        return res.status(400).json({
          success: false,
          message: '文件名必须是字符串'
        });
      }

      if (description !== undefined && typeof description !== 'string') {
        return res.status(400).json({
          success: false,
          message: '内容描述必须是字符串'
        });
      }

      // 验证文件名长度
      if (originalName && originalName.length > 255) {
        return res.status(400).json({
          success: false,
          message: '文件名不能超过255个字符'
        });
      }

      // 验证描述长度
      if (description && description.length > 20000) {
        return res.status(400).json({
          success: false,
          message: '内容描述不能超过20000个字符'
        });
      }

      // 构建更新对象
      const updateData = {};
      if (originalName !== undefined) updateData.originalName = originalName;
      if (description !== undefined) updateData.description = description;

      // 如果没有需要更新的字段，返回当前元数据
      if (Object.keys(updateData).length === 0) {
        const metadata = await attachmentService.getAttachmentMetadata(id);
        return res.status(200).json({
          success: true,
          data: metadata,
          message: '没有需要更新的字段'
        });
      }

      // 调用服务层更新元数据
      const updatedMetadata = await attachmentService.updateAttachmentMetadata(id, updateData);

      // 返回更新成功响应
      res.status(200).json({
        success: true,
        data: updatedMetadata,
        message: '附件元数据更新成功'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取附件配置信息
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   * @param {Function} next - Express下一个中间件函数
   */
  async getConfig(req, res, next) {
    try {
      const config = attachmentService.getAttachmentConfig();

      // 返回配置信息
      res.status(200).json({
        success: true,
        data: config,
        message: '获取附件配置成功'
      });
    } catch (error) {
      next(error);
    }
  }
}

// 导出控制器实例
module.exports = new AttachmentController();
