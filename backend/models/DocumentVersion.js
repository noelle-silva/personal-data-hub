/**
 * 文档版本数据模型
 * 用于为单个文档保存“发布/提交版本”的快照信息
 */

const mongoose = require('mongoose');
const config = require('../config/config');

const referencedDocumentSnapshotSchema = new mongoose.Schema(
  {
    _id: { type: mongoose.Schema.Types.ObjectId, required: true },
    title: { type: String, trim: true },
    tags: [{ type: String, trim: true }],
    updatedAt: { type: Date },
    summary: { type: String, trim: true },
  },
  { _id: false }
);

const referencedQuoteSnapshotSchema = new mongoose.Schema(
  {
    _id: { type: mongoose.Schema.Types.ObjectId, required: true },
    title: { type: String, trim: true },
    tags: [{ type: String, trim: true }],
    updatedAt: { type: Date },
    summary: { type: String, trim: true },
  },
  { _id: false }
);

const referencedAttachmentSnapshotSchema = new mongoose.Schema(
  {
    _id: { type: mongoose.Schema.Types.ObjectId, required: true },
    originalName: { type: String, trim: true },
    category: { type: String, trim: true },
    mimeType: { type: String, trim: true },
    size: { type: Number },
  },
  { _id: false }
);

const documentVersionSnapshotSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true },
    content: { type: String, trim: true },
    htmlContent: { type: String, trim: true },
    tags: [{ type: String, trim: true }],
    source: { type: String, trim: true },

    referencedDocumentIds: [{ type: mongoose.Schema.Types.ObjectId }],
    referencedAttachmentIds: [{ type: mongoose.Schema.Types.ObjectId }],
    referencedQuoteIds: [{ type: mongoose.Schema.Types.ObjectId }],

    referencedDocuments: [referencedDocumentSnapshotSchema],
    referencedAttachments: [referencedAttachmentSnapshotSchema],
    referencedQuotes: [referencedQuoteSnapshotSchema],

    sourceDocumentCreatedAt: { type: Date },
    sourceDocumentUpdatedAt: { type: Date },
  },
  { _id: false }
);

const documentVersionSchema = new mongoose.Schema(
  {
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: [true, '文档ID是必填项'],
      index: true,
    },

    versionName: {
      type: String,
      required: [true, '版本名称是必填项'],
      trim: true,
      maxlength: [120, '版本名称不能超过120个字符'],
    },

    description: {
      type: String,
      trim: true,
      maxlength: [5000, '版本描述不能超过5000个字符'],
    },

    snapshot: {
      type: documentVersionSnapshotSchema,
      required: true,
    },
  },
  {
    collection: config.mongo.collections.documentVersions,
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

documentVersionSchema.index({ documentId: 1, createdAt: -1 });

const DocumentVersion = mongoose.model('DocumentVersion', documentVersionSchema);

module.exports = DocumentVersion;
