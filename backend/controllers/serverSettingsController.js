const serverSettingsService = require('../config/runtime/serverSettingsService');
const config = require('../config/config');
const HttpError = require('../utils/HttpError');

function requireAdmin(req) {
  const adminUserId = config.auth.adminUserId;
  if (adminUserId && req.user?.id !== adminUserId) {
    throw new HttpError(403, '无权限：仅管理员可修改服务器设置');
  }
}

class ServerSettingsController {
  getAttachmentSettings(req, res) {
    const attachments = serverSettingsService.getAttachments();
    res.status(200).json({
      success: true,
      data: attachments,
      meta: { restartRequired: true },
      message: '获取服务器附件设置成功',
    });
  }

  updateAttachmentSettings(req, res, next) {
    try {
      requireAdmin(req);

      const updated = serverSettingsService.updateAttachments(req.body, {
        userId: req.user?.id || null,
        username: req.user?.username || null,
        ip: req.ip || req.connection?.remoteAddress || null,
      });

      res.status(200).json({
        success: true,
        data: updated,
        meta: { restartRequired: true },
        message: '已保存服务器附件设置（重启后端后完全生效）',
      });
    } catch (e) {
      next(e);
    }
  }

  listAttachmentBackups(req, res) {
    const backups = serverSettingsService.listBackups();
    res.status(200).json({
      success: true,
      data: backups,
      message: '获取服务器设置备份列表成功',
    });
  }

  restoreAttachmentBackup(req, res, next) {
    try {
      requireAdmin(req);
      const { backupName } = req.body || {};
      const restored = serverSettingsService.restoreBackup(backupName);
      res.status(200).json({
        success: true,
        data: restored.attachments,
        meta: { restartRequired: true },
        message: '已回滚服务器设置（重启后端后完全生效）',
      });
    } catch (e) {
      next(e);
    }
  }
}

module.exports = new ServerSettingsController();

