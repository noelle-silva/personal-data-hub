/**
 * 文档版本服务层
 * 为单个文档提供版本提交/查询能力
 */

const mongoose = require('mongoose');
const Document = require('../models/Document');
const Quote = require('../models/Quote');
const Attachment = require('../models/Attachment');
const DocumentVersion = require('../models/DocumentVersion');
const HttpError = require('../utils/HttpError');

class DocumentVersionService {
  async listDocumentVersions(documentId, options = {}) {
    const { limit = 50 } = options;

    if (!mongoose.Types.ObjectId.isValid(documentId)) {
      throw new HttpError(400, '无效的文档ID', 'INVALID_DOCUMENT_ID');
    }

    const nLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);

    const items = await DocumentVersion.find({ documentId })
      .select('_id versionName description createdAt snapshot.sourceDocumentUpdatedAt')
      .sort({ createdAt: -1 })
      .limit(nLimit)
      .lean()
      .exec();

    return { items };
  }

  async getDocumentVersionById(documentId, versionId) {
    if (!mongoose.Types.ObjectId.isValid(documentId)) {
      throw new HttpError(400, '无效的文档ID', 'INVALID_DOCUMENT_ID');
    }

    if (!mongoose.Types.ObjectId.isValid(versionId)) {
      throw new HttpError(400, '无效的版本ID', 'INVALID_VERSION_ID');
    }

    const version = await DocumentVersion.findOne({
      _id: versionId,
      documentId,
    })
      .lean()
      .exec();

    if (!version) {
      throw new HttpError(404, '版本不存在', 'DOCUMENT_VERSION_NOT_FOUND');
    }

    return version;
  }

  async createDocumentVersion(documentId, payload = {}) {
    const { versionName, description = '' } = payload;

    if (!mongoose.Types.ObjectId.isValid(documentId)) {
      throw new HttpError(400, '无效的文档ID', 'INVALID_DOCUMENT_ID');
    }

    const name = String(versionName || '').trim();
    if (!name) {
      throw new HttpError(400, '请填写版本名称', 'VERSION_NAME_REQUIRED');
    }

    const doc = await Document.findById(documentId)
      .select(
        '_id title content htmlContent tags source referencedDocumentIds referencedAttachmentIds referencedQuoteIds createdAt updatedAt'
      )
      .lean()
      .exec();

    if (!doc) {
      throw new HttpError(404, '文档不存在', 'DOCUMENT_NOT_FOUND');
    }

    const referencedDocumentIds = Array.isArray(doc.referencedDocumentIds) ? doc.referencedDocumentIds : [];
    const referencedAttachmentIds = Array.isArray(doc.referencedAttachmentIds) ? doc.referencedAttachmentIds : [];
    const referencedQuoteIds = Array.isArray(doc.referencedQuoteIds) ? doc.referencedQuoteIds : [];

    const [referencedDocuments, referencedAttachments, referencedQuotes] = await Promise.all([
      referencedDocumentIds.length
        ? Document.find({ _id: { $in: referencedDocumentIds } })
            .select('_id title tags updatedAt summary')
            .lean()
            .exec()
        : [],
      referencedAttachmentIds.length
        ? Attachment.find({ _id: { $in: referencedAttachmentIds } })
            .select('_id originalName category mimeType size')
            .lean()
            .exec()
        : [],
      referencedQuoteIds.length
        ? Quote.find({ _id: { $in: referencedQuoteIds } })
            .select('_id title tags updatedAt summary')
            .lean()
            .exec()
        : [],
    ]);

    const version = await DocumentVersion.create({
      documentId,
      versionName: name,
      description: String(description || '').trim(),
      snapshot: {
        title: doc.title || '',
        content: doc.content || '',
        htmlContent: doc.htmlContent || '',
        tags: Array.isArray(doc.tags) ? doc.tags : [],
        source: doc.source || '',

        referencedDocumentIds,
        referencedAttachmentIds,
        referencedQuoteIds,

        referencedDocuments,
        referencedAttachments,
        referencedQuotes,

        sourceDocumentCreatedAt: doc.createdAt || null,
        sourceDocumentUpdatedAt: doc.updatedAt || null,
      },
    });

    return version.toObject ? version.toObject() : version;
  }
}

module.exports = new DocumentVersionService();

