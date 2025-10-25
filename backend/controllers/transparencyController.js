const fs = require('fs');
const path = require('path');

// 透明度配置文件存储目录
const TRANSPARENCY_DIR = path.join(__dirname, '..', 'assets', 'transparency');

// 确保透明度配置目录存在
const ensureTransparencyDir = () => {
  if (!fs.existsSync(TRANSPARENCY_DIR)) {
    fs.mkdirSync(TRANSPARENCY_DIR, { recursive: true });
  }
};

// 获取所有透明度配置
const getAllConfigs = (req, res) => {
  try {
    ensureTransparencyDir();
    
    const files = fs.readdirSync(TRANSPARENCY_DIR);
    const configs = [];
    
    files.forEach(file => {
      if (file.endsWith('.json')) {
        try {
          const filePath = path.join(TRANSPARENCY_DIR, file);
          const fileContent = fs.readFileSync(filePath, 'utf8');
          const config = JSON.parse(fileContent);
          configs.push({
            name: path.basename(file, '.json'),
            ...config
          });
        } catch (error) {
          console.error(`读取透明度配置文件 ${file} 失败:`, error);
        }
      }
    });
    
    res.status(200).json({
      success: true,
      data: configs
    });
  } catch (error) {
    console.error('获取透明度配置失败:', error);
    res.status(500).json({
      success: false,
      message: '获取透明度配置失败',
      error: error.message
    });
  }
};

// 获取特定透明度配置
const getConfigByName = (req, res) => {
  try {
    const { configName } = req.params;
    
    if (!configName) {
      return res.status(400).json({
        success: false,
        message: '配置名称不能为空'
      });
    }
    
    ensureTransparencyDir();
    
    const filePath = path.join(TRANSPARENCY_DIR, `${configName}.json`);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: '透明度配置不存在'
      });
    }
    
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const config = JSON.parse(fileContent);
    
    res.status(200).json({
      success: true,
      data: {
        name: configName,
        ...config
      }
    });
  } catch (error) {
    console.error('获取透明度配置失败:', error);
    res.status(500).json({
      success: false,
      message: '获取透明度配置失败',
      error: error.message
    });
  }
};

// 创建或更新透明度配置
const saveConfig = (req, res) => {
  try {
    const { configName } = req.params;
    const { name, description, transparency } = req.body;
    
    if (!configName) {
      return res.status(400).json({
        success: false,
        message: '配置名称不能为空'
      });
    }
    
    if (!transparency || typeof transparency !== 'object') {
      return res.status(400).json({
        success: false,
        message: '透明度配置不能为空且必须是对象'
      });
    }
    
    // 验证透明度值范围
    const validComponents = ['cards', 'sidebar', 'appBar'];
    for (const component of validComponents) {
      if (transparency[component] !== undefined) {
        const value = parseInt(transparency[component]);
        if (isNaN(value) || value < 0 || value > 100) {
          return res.status(400).json({
            success: false,
            message: `${component} 的透明度值必须是0-100之间的整数`
          });
        }
      }
    }
    
    ensureTransparencyDir();
    
    const filePath = path.join(TRANSPARENCY_DIR, `${configName}.json`);
    const config = {
      name: name || configName,
      description: description || '',
      transparency,
      createdAt: fs.existsSync(filePath) 
        ? JSON.parse(fs.readFileSync(filePath, 'utf8')).createdAt 
        : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    fs.writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf8');
    
    res.status(200).json({
      success: true,
      message: '透明度配置保存成功',
      data: config
    });
  } catch (error) {
    console.error('保存透明度配置失败:', error);
    res.status(500).json({
      success: false,
      message: '保存透明度配置失败',
      error: error.message
    });
  }
};

// 删除透明度配置
const deleteConfig = (req, res) => {
  try {
    const { configName } = req.params;
    
    if (!configName) {
      return res.status(400).json({
        success: false,
        message: '配置名称不能为空'
      });
    }
    
    ensureTransparencyDir();
    
    const filePath = path.join(TRANSPARENCY_DIR, `${configName}.json`);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: '透明度配置不存在'
      });
    }
    
    fs.unlinkSync(filePath);
    
    res.status(200).json({
      success: true,
      message: '透明度配置删除成功'
    });
  } catch (error) {
    console.error('删除透明度配置失败:', error);
    res.status(500).json({
      success: false,
      message: '删除透明度配置失败',
      error: error.message
    });
  }
};

module.exports = {
  getAllConfigs,
  getConfigByName,
  saveConfig,
  deleteConfig
};