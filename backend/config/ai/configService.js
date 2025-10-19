/**
 * AI 配置服务
 * 负责管理 AI 配置的读取、写入和验证
 */

const fs = require('fs');
const path = require('path');

// 配置文件路径
const CONFIG_FILE_PATH = path.join(__dirname, 'settings.json');

/**
 * 默认配置结构
 */
const DEFAULT_CONFIG = {
  enabled: false,
  current: null,
  providers: {}
};

/**
 * AI 配置服务类
 */
class AIConfigService {
  constructor() {
    this.config = null;
    this.configPath = CONFIG_FILE_PATH;
    this.init();
  }

  /**
   * 初始化配置服务
   * 确保配置文件存在，如果不存在则创建默认配置
   */
  init() {
    try {
      // 确保配置目录存在
      const configDir = path.dirname(this.configPath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }

      // 如果配置文件不存在，创建默认配置
      if (!fs.existsSync(this.configPath)) {
        this.saveConfig(DEFAULT_CONFIG);
        console.log('AI配置文件已创建:', this.configPath);
      }

      // 加载配置
      this.loadConfig();
    } catch (error) {
      console.error('初始化AI配置服务失败:', error);
      this.config = { ...DEFAULT_CONFIG };
    }
  }

  /**
   * 从文件加载配置
   */
  loadConfig() {
    try {
      const configData = fs.readFileSync(this.configPath, 'utf8');
      this.config = JSON.parse(configData);
      
      // 验证配置结构
      this.config = this.validateConfig(this.config);
    } catch (error) {
      console.error('加载AI配置失败:', error);
      this.config = { ...DEFAULT_CONFIG };
    }
  }

  /**
   * 保存配置到文件
   * @param {Object} config - 要保存的配置
   */
  saveConfig(config = this.config) {
    try {
      const configData = JSON.stringify(config, null, 2);
      fs.writeFileSync(this.configPath, configData, 'utf8');
      this.config = config;
    } catch (error) {
      console.error('保存AI配置失败:', error);
      throw error;
    }
  }

  /**
   * 验证配置结构
   * @param {Object} config - 要验证的配置
   * @returns {Object} 验证后的配置
   */
  validateConfig(config) {
    const validated = { ...DEFAULT_CONFIG };

    // 验证 enabled
    if (typeof config.enabled === 'boolean') {
      validated.enabled = config.enabled;
    }

    // 验证 current
    if (config.current === null || typeof config.current === 'string') {
      validated.current = config.current;
    }

    // 验证 providers
    if (config.providers && typeof config.providers === 'object') {
      validated.providers = {};
      
      for (const [key, provider] of Object.entries(config.providers)) {
        if (typeof key === 'string' && this.validateProvider(provider)) {
          validated.providers[key] = provider;
        }
      }
    }

    // 如果 current 指向的 provider 不存在，则重置 current
    if (validated.current && !validated.providers[validated.current]) {
      validated.current = null;
    }

    return validated;
  }

  /**
   * 验证供应商配置
   * @param {Object} provider - 供应商配置
   * @returns {boolean} 是否有效
   */
  validateProvider(provider) {
    if (!provider || typeof provider !== 'object') {
      return false;
    }

    // 必需字段
    if (typeof provider.AI_BASE_URL !== 'string' || !provider.AI_BASE_URL.trim()) {
      return false;
    }

    if (typeof provider.AI_API_KEY !== 'string' || !provider.AI_API_KEY.trim()) {
      return false;
    }

    // 可选字段
    if (provider.AI_ALLOWED_MODELS !== undefined) {
      if (!Array.isArray(provider.AI_ALLOWED_MODELS)) {
        return false;
      }
      
      // 验证数组中的每个元素都是字符串
      for (const model of provider.AI_ALLOWED_MODELS) {
        if (typeof model !== 'string') {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * 获取完整配置
   * @returns {Object} 配置对象
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * 获取 AI 启用状态
   * @returns {boolean} 是否启用
   */
  isEnabled() {
    return this.config.enabled;
  }

  /**
   * 获取当前供应商配置
   * @returns {Object|null} 当前供应商配置，如果未设置则返回 null
   */
  getCurrentProvider() {
    if (!this.config.enabled || !this.config.current) {
      return null;
    }

    return this.config.providers[this.config.current] || null;
  }

  /**
   * 获取所有供应商
   * @returns {Object} 供应商对象
   */
  getProviders() {
    return { ...this.config.providers };
  }

  /**
   * 获取供应商列表（键名数组）
   * @returns {Array<string>} 供应商键名数组
   */
  getProviderKeys() {
    return Object.keys(this.config.providers);
  }

  /**
   * 更新配置
   * @param {Object} updates - 要更新的配置
   * @returns {Object} 更新后的配置
   */
  updateConfig(updates) {
    const newConfig = { ...this.config };

    // 更新 enabled
    if (typeof updates.enabled === 'boolean') {
      newConfig.enabled = updates.enabled;
    }

    // 更新 current
    if (updates.current === null || typeof updates.current === 'string') {
      newConfig.current = updates.current;
    }

    // 验证并保存配置
    this.config = this.validateConfig(newConfig);
    this.saveConfig();
    
    return this.getConfig();
  }

  /**
   * 添加或更新供应商
   * @param {string} key - 供应商键名
   * @param {Object} provider - 供应商配置
   * @returns {Object} 更新后的配置
   */
  upsertProvider(key, provider) {
    if (typeof key !== 'string' || !key.trim()) {
      throw new Error('供应商键名必须是非空字符串');
    }

    if (!this.validateProvider(provider)) {
      throw new Error('供应商配置无效');
    }

    const newConfig = { ...this.config };
    newConfig.providers[key] = provider;

    // 如果这是第一个供应商且没有设置当前供应商，则设置为当前
    if (!newConfig.current && Object.keys(newConfig.providers).length === 1) {
      newConfig.current = key;
    }

    this.config = this.validateConfig(newConfig);
    this.saveConfig();
    
    return this.getConfig();
  }

  /**
   * 删除供应商
   * @param {string} key - 供应商键名
   * @returns {Object} 更新后的配置
   */
  deleteProvider(key) {
    if (typeof key !== 'string' || !key.trim()) {
      throw new Error('供应商键名必须是非空字符串');
    }

    const newConfig = { ...this.config };
    
    if (!newConfig.providers[key]) {
      throw new Error('供应商不存在');
    }

    delete newConfig.providers[key];

    // 如果删除的是当前供应商，则重置当前供应商
    if (newConfig.current === key) {
      const remainingKeys = Object.keys(newConfig.providers);
      newConfig.current = remainingKeys.length > 0 ? remainingKeys[0] : null;
    }

    this.config = this.validateConfig(newConfig);
    this.saveConfig();
    
    return this.getConfig();
  }

  /**
   * 设置当前供应商
   * @param {string} key - 供应商键名
   * @returns {Object} 更新后的配置
   */
  setCurrentProvider(key) {
    if (key !== null && (typeof key !== 'string' || !key.trim())) {
      throw new Error('供应商键名必须是非空字符串或 null');
    }

    if (key !== null && !this.config.providers[key]) {
      throw new Error('供应商不存在');
    }

    return this.updateConfig({ current: key });
  }

  /**
   * 切换 AI 启用状态
   * @param {boolean} enabled - 启用状态
   * @returns {Object} 更新后的配置
   */
  toggleEnabled(enabled) {
    if (typeof enabled !== 'boolean') {
      throw new Error('启用状态必须是布尔值');
    }

    return this.updateConfig({ enabled });
  }
}

// 创建并导出单例实例
const aiConfigService = new AIConfigService();
module.exports = aiConfigService;