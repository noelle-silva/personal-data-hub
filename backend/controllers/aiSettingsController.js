/**
 * AI 设置控制器
 * 处理AI配置和供应商设置的HTTP请求
 */

const aiConfigService = require('../config/ai/configService');

/**
 * AI 设置控制器类
 */
class AISettingsController {
  /**
   * 获取AI配置
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   * @param {Function} next - Express下一个中间件函数
   */
  async getConfig(req, res, next) {
    try {
      const config = aiConfigService.getConfig();
      
      res.status(200).json({
        success: true,
        data: config,
        message: '获取AI配置成功'
      });
    } catch (error) {
      console.error('获取AI配置失败:', error);
      next(error);
    }
  }

  /**
   * 更新AI配置
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   * @param {Function} next - Express下一个中间件函数
   */
  async updateConfig(req, res, next) {
    try {
      const { enabled, current } = req.body;
      const updates = {};

      // 验证并添加 enabled
      if (typeof enabled === 'boolean') {
        updates.enabled = enabled;
      }

      // 验证并添加 current
      if (current === null || typeof current === 'string') {
        updates.current = current;
      }

      // 如果没有提供任何有效更新
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({
          success: false,
          message: '没有提供有效的更新参数'
        });
      }

      const updatedConfig = aiConfigService.updateConfig(updates);
      
      res.status(200).json({
        success: true,
        data: updatedConfig,
        message: '更新AI配置成功'
      });
    } catch (error) {
      console.error('更新AI配置失败:', error);
      next(error);
    }
  }

  /**
   * 获取所有供应商
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   * @param {Function} next - Express下一个中间件函数
   */
  async getProviders(req, res, next) {
    try {
      const providers = aiConfigService.getProviders();
      
      res.status(200).json({
        success: true,
        data: providers,
        message: '获取供应商列表成功'
      });
    } catch (error) {
      console.error('获取供应商列表失败:', error);
      next(error);
    }
  }

  /**
   * 创建或更新供应商
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   * @param {Function} next - Express下一个中间件函数
   */
  async upsertProvider(req, res, next) {
    try {
      const { key } = req.params;
      const { AI_BASE_URL, AI_API_KEY, AI_ALLOWED_MODELS } = req.body;

      // 验证必填字段
      if (!AI_BASE_URL || typeof AI_BASE_URL !== 'string' || !AI_BASE_URL.trim()) {
        return res.status(400).json({
          success: false,
          message: 'AI_BASE_URL 是必填字段且必须是非空字符串'
        });
      }

      if (!AI_API_KEY || typeof AI_API_KEY !== 'string' || !AI_API_KEY.trim()) {
        return res.status(400).json({
          success: false,
          message: 'AI_API_KEY 是必填字段且必须是非空字符串'
        });
      }

      // 验证可选字段
      if (AI_ALLOWED_MODELS !== undefined) {
        if (!Array.isArray(AI_ALLOWED_MODELS)) {
          return res.status(400).json({
            success: false,
            message: 'AI_ALLOWED_MODELS 必须是数组'
          });
        }

        // 验证数组中的每个元素都是字符串
        for (const model of AI_ALLOWED_MODELS) {
          if (typeof model !== 'string') {
            return res.status(400).json({
              success: false,
              message: 'AI_ALLOWED_MODELS 中的所有元素都必须是字符串'
            });
          }
        }
      }

      const provider = {
        AI_BASE_URL: AI_BASE_URL.trim(),
        AI_API_KEY: AI_API_KEY.trim(),
        AI_ALLOWED_MODELS: AI_ALLOWED_MODELS || []
      };

      const updatedConfig = aiConfigService.upsertProvider(key, provider);
      
      res.status(200).json({
        success: true,
        data: updatedConfig,
        message: '供应商保存成功'
      });
    } catch (error) {
      console.error('保存供应商失败:', error);
      next(error);
    }
  }

  /**
   * 更新供应商
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   * @param {Function} next - Express下一个中间件函数
   */
  async updateProvider(req, res, next) {
    try {
      const { key } = req.params;
      const { AI_BASE_URL, AI_API_KEY, AI_ALLOWED_MODELS } = req.body;

      // 获取现有供应商配置
      const existingProviders = aiConfigService.getProviders();
      if (!existingProviders[key]) {
        return res.status(404).json({
          success: false,
          message: '供应商不存在'
        });
      }

      const provider = { ...existingProviders[key] };

      // 更新提供的字段
      if (AI_BASE_URL !== undefined) {
        if (!AI_BASE_URL || typeof AI_BASE_URL !== 'string' || !AI_BASE_URL.trim()) {
          return res.status(400).json({
            success: false,
            message: 'AI_BASE_URL 必须是非空字符串'
          });
        }
        provider.AI_BASE_URL = AI_BASE_URL.trim();
      }

      if (AI_API_KEY !== undefined) {
        if (!AI_API_KEY || typeof AI_API_KEY !== 'string' || !AI_API_KEY.trim()) {
          return res.status(400).json({
            success: false,
            message: 'AI_API_KEY 必须是非空字符串'
          });
        }
        provider.AI_API_KEY = AI_API_KEY.trim();
      }

      if (AI_ALLOWED_MODELS !== undefined) {
        if (!Array.isArray(AI_ALLOWED_MODELS)) {
          return res.status(400).json({
            success: false,
            message: 'AI_ALLOWED_MODELS 必须是数组'
          });
        }

        // 验证数组中的每个元素都是字符串
        for (const model of AI_ALLOWED_MODELS) {
          if (typeof model !== 'string') {
            return res.status(400).json({
              success: false,
              message: 'AI_ALLOWED_MODELS 中的所有元素都必须是字符串'
            });
          }
        }
        provider.AI_ALLOWED_MODELS = AI_ALLOWED_MODELS;
      }

      const updatedConfig = aiConfigService.upsertProvider(key, provider);
      
      res.status(200).json({
        success: true,
        data: updatedConfig,
        message: '供应商更新成功'
      });
    } catch (error) {
      console.error('更新供应商失败:', error);
      next(error);
    }
  }

  /**
   * 删除供应商
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   * @param {Function} next - Express下一个中间件函数
   */
  async deleteProvider(req, res, next) {
    try {
      const { key } = req.params;

      const updatedConfig = aiConfigService.deleteProvider(key);
      
      res.status(200).json({
        success: true,
        data: updatedConfig,
        message: '供应商删除成功'
      });
    } catch (error) {
      console.error('删除供应商失败:', error);
      next(error);
    }
  }

  /**
   * 设置当前供应商
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   * @param {Function} next - Express下一个中间件函数
   */
  async setCurrentProvider(req, res, next) {
    try {
      const { key } = req.params;

      const updatedConfig = aiConfigService.setCurrentProvider(key);
      
      res.status(200).json({
        success: true,
        data: updatedConfig,
        message: '当前供应商设置成功'
      });
    } catch (error) {
      console.error('设置当前供应商失败:', error);
      next(error);
    }
  }

  /**
   * 切换AI启用状态
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   * @param {Function} next - Express下一个中间件函数
   */
  async toggleEnabled(req, res, next) {
    try {
      const { enabled } = req.body;

      if (typeof enabled !== 'boolean') {
        return res.status(400).json({
          success: false,
          message: 'enabled 必须是布尔值'
        });
      }

      const updatedConfig = aiConfigService.toggleEnabled(enabled);
      
      res.status(200).json({
        success: true,
        data: updatedConfig,
        message: `AI功能已${enabled ? '启用' : '禁用'}`
      });
    } catch (error) {
      console.error('切换AI启用状态失败:', error);
      next(error);
    }
  }
}

// 导出控制器实例
module.exports = new AISettingsController();
