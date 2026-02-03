/**
 * 文档版本控制器层
 * 处理版本提交/查询请求
 */

const documentVersionService = require('../services/documentVersionService');

class DocumentVersionController {
  async listDocumentVersions(req, res, next) {
    try {
      const { id } = req.params;
      const { limit } = req.query;

      const result = await documentVersionService.listDocumentVersions(id, { limit });

      res.status(200).json({
        success: true,
        data: result.items,
        message: '获取版本列表成功',
      });
    } catch (error) {
      next(error);
    }
  }

  async getDocumentVersionById(req, res, next) {
    try {
      const { id, versionId } = req.params;

      const version = await documentVersionService.getDocumentVersionById(id, versionId);

      res.status(200).json({
        success: true,
        data: version,
        message: '获取版本成功',
      });
    } catch (error) {
      next(error);
    }
  }

  async createDocumentVersion(req, res, next) {
    try {
      const { id } = req.params;
      const { versionName, description } = req.body || {};

      const version = await documentVersionService.createDocumentVersion(id, {
        versionName,
        description,
      });

      res.status(201).json({
        success: true,
        data: version,
        message: '版本提交成功',
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new DocumentVersionController();

