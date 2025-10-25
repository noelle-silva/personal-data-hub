const express = require('express');
const router = express.Router();
const {
  getAllConfigs,
  getConfigByName,
  saveConfig,
  deleteConfig
} = require('../controllers/transparencyController');

// 获取所有透明度配置
router.get('/', getAllConfigs);

// 获取特定透明度配置
router.get('/:configName', getConfigByName);

// 创建或更新透明度配置
router.put('/:configName', saveConfig);

// 删除透明度配置
router.delete('/:configName', deleteConfig);

module.exports = router;