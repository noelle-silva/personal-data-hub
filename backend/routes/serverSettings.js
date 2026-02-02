const express = require('express');
const router = express.Router();

const serverSettingsController = require('../controllers/serverSettingsController');

// 服务器设置（仅少量可在线编辑的白名单项）
router.get('/attachments', serverSettingsController.getAttachmentSettings);
router.put('/attachments', serverSettingsController.updateAttachmentSettings.bind(serverSettingsController));
router.get('/attachments/backups', serverSettingsController.listAttachmentBackups);
router.post('/attachments/restore', serverSettingsController.restoreAttachmentBackup.bind(serverSettingsController));

module.exports = router;

