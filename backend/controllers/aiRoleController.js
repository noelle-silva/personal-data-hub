/**
 * AI 角色控制器
 * 处理AI角色的CRUD操作
 */

const AIRole = require('../models/AIRole');

/**
 * AI 角色控制器类
 */
class AIRoleController {
  /**
   * 获取所有AI角色
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   * @param {Function} next - Express下一个中间件函数
   */
  async list(req, res, next) {
    try {
      const roles = await AIRole.find().sort({ isDefault: -1, createdAt: -1 });
      
      res.status(200).json({
        success: true,
        data: roles,
        message: '获取AI角色列表成功'
      });
    } catch (error) {
      console.error('获取AI角色列表失败:', error);
      next(error);
    }
  }

  /**
   * 获取默认AI角色
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   * @param {Function} next - Express下一个中间件函数
   */
  async getDefault(req, res, next) {
    try {
      const defaultRole = await AIRole.getDefault();
      
      if (!defaultRole) {
        return res.status(404).json({
          success: false,
          message: '未找到默认AI角色'
        });
      }
      
      res.status(200).json({
        success: true,
        data: defaultRole,
        message: '获取默认AI角色成功'
      });
    } catch (error) {
      console.error('获取默认AI角色失败:', error);
      next(error);
    }
  }

  /**
   * 根据ID获取AI角色
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   * @param {Function} next - Express下一个中间件函数
   */
  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const role = await AIRole.findById(id);
      
      if (!role) {
        return res.status(404).json({
          success: false,
          message: '未找到指定的AI角色'
        });
      }
      
      res.status(200).json({
        success: true,
        data: role,
        message: '获取AI角色成功'
      });
    } catch (error) {
      console.error('获取AI角色失败:', error);
      next(error);
    }
  }

  /**
   * 创建新的AI角色
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   * @param {Function} next - Express下一个中间件函数
   */
  async create(req, res, next) {
    try {
      const {
        name,
        systemPrompt,
        defaultModel,
        defaultTemperature = 0.7,
        contextTokenLimit = 8192,
        maxOutputTokens = 4096,
        topP = 1.0,
        topK = 0,
        isDefault = false
      } = req.body;
      
      // 验证必填字段
      if (!name || !systemPrompt) {
        return res.status(400).json({
          success: false,
          message: '角色名称和系统提示词不能为空'
        });
      }
      
      // 验证温度范围
      if (defaultTemperature !== undefined && (defaultTemperature < 0 || defaultTemperature > 2)) {
        return res.status(400).json({
          success: false,
          message: '温度值必须在0到2之间'
        });
      }
      
      // 验证上下文Token上限
      if (contextTokenLimit !== undefined && (contextTokenLimit < 1 || contextTokenLimit > 2000000)) {
        return res.status(400).json({
          success: false,
          message: '上下文Token上限必须在1到2000000之间'
        });
      }
      
      // 验证最大输出Token上限
      if (maxOutputTokens !== undefined && (maxOutputTokens < 1 || maxOutputTokens > 2000000)) {
        return res.status(400).json({
          success: false,
          message: '最大输出Token上限必须在1到2000000之间'
        });
      }
      
      // 验证Top P值
      if (topP !== undefined && (topP < 0 || topP > 1)) {
        return res.status(400).json({
          success: false,
          message: 'Top P值必须在0到1之间'
        });
      }
      
      // 验证Top K值
      if (topK !== undefined && (topK < 0 || topK > 64)) {
        return res.status(400).json({
          success: false,
          message: 'Top K值必须在0到64之间'
        });
      }
      
      // 检查名称是否已存在
      const existingRole = await AIRole.findOne({ name });
      if (existingRole) {
        return res.status(400).json({
          success: false,
          message: '角色名称已存在'
        });
      }
      
      // 创建新角色
      const newRole = new AIRole({
        name,
        systemPrompt,
        defaultModel,
        defaultTemperature,
        contextTokenLimit,
        maxOutputTokens,
        topP,
        topK,
        isDefault
      });
      
      await newRole.save();
      
      res.status(201).json({
        success: true,
        data: newRole,
        message: '创建AI角色成功'
      });
    } catch (error) {
      console.error('创建AI角色失败:', error);
      
      // 处理Mongoose验证错误
      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(e => e.message);
        return res.status(400).json({
          success: false,
          message: '数据验证失败',
          errors
        });
      }
      
      // 处理重复键错误
      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: '角色名称已存在'
        });
      }
      
      next(error);
    }
  }

  /**
   * 更新AI角色
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   * @param {Function} next - Express下一个中间件函数
   */
  async update(req, res, next) {
    try {
      const { id } = req.params;
      const {
        name,
        systemPrompt,
        defaultModel,
        defaultTemperature,
        contextTokenLimit,
        maxOutputTokens,
        topP,
        topK,
        isDefault
      } = req.body;
      
      // 查找要更新的角色
      const role = await AIRole.findById(id);
      if (!role) {
        return res.status(404).json({
          success: false,
          message: '未找到指定的AI角色'
        });
      }
      
      // 如果更新了名称，检查新名称是否已存在
      if (name && name !== role.name) {
        const existingRole = await AIRole.findOne({ name });
        if (existingRole) {
          return res.status(400).json({
            success: false,
            message: '角色名称已存在'
          });
        }
      }
      
      // 验证温度范围
      if (defaultTemperature !== undefined && (defaultTemperature < 0 || defaultTemperature > 2)) {
        return res.status(400).json({
          success: false,
          message: '温度值必须在0到2之间'
        });
      }
      
      // 验证上下文Token上限
      if (contextTokenLimit !== undefined && (contextTokenLimit < 1 || contextTokenLimit > 2000000)) {
        return res.status(400).json({
          success: false,
          message: '上下文Token上限必须在1到2000000之间'
        });
      }
      
      // 验证最大输出Token上限
      if (maxOutputTokens !== undefined && (maxOutputTokens < 1 || maxOutputTokens > 2000000)) {
        return res.status(400).json({
          success: false,
          message: '最大输出Token上限必须在1到2000000之间'
        });
      }
      
      // 验证Top P值
      if (topP !== undefined && (topP < 0 || topP > 1)) {
        return res.status(400).json({
          success: false,
          message: 'Top P值必须在0到1之间'
        });
      }
      
      // 验证Top K值
      if (topK !== undefined && (topK < 0 || topK > 64)) {
        return res.status(400).json({
          success: false,
          message: 'Top K值必须在0到64之间'
        });
      }
      
      // 更新字段
      if (name) role.name = name;
      if (systemPrompt) role.systemPrompt = systemPrompt;
      if (defaultModel !== undefined) role.defaultModel = defaultModel;
      if (defaultTemperature !== undefined) role.defaultTemperature = defaultTemperature;
      if (contextTokenLimit !== undefined) role.contextTokenLimit = contextTokenLimit;
      if (maxOutputTokens !== undefined) role.maxOutputTokens = maxOutputTokens;
      if (topP !== undefined) role.topP = topP;
      if (topK !== undefined) role.topK = topK;
      if (isDefault !== undefined) role.isDefault = isDefault;
      
      await role.save();
      
      res.status(200).json({
        success: true,
        data: role,
        message: '更新AI角色成功'
      });
    } catch (error) {
      console.error('更新AI角色失败:', error);
      
      // 处理Mongoose验证错误
      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(e => e.message);
        return res.status(400).json({
          success: false,
          message: '数据验证失败',
          errors
        });
      }
      
      // 处理重复键错误
      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: '角色名称已存在'
        });
      }
      
      next(error);
    }
  }

  /**
   * 删除AI角色
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   * @param {Function} next - Express下一个中间件函数
   */
  async delete(req, res, next) {
    try {
      const { id } = req.params;
      
      // 查找要删除的角色
      const role = await AIRole.findById(id);
      if (!role) {
        return res.status(404).json({
          success: false,
          message: '未找到指定的AI角色'
        });
      }
      
      // 检查是否是最后一个角色
      const roleCount = await AIRole.countDocuments();
      if (roleCount <= 1) {
        return res.status(400).json({
          success: false,
          message: '不能删除最后一个AI角色'
        });
      }
      
      await role.deleteOne();
      
      res.status(200).json({
        success: true,
        data: { id },
        message: '删除AI角色成功'
      });
    } catch (error) {
      console.error('删除AI角色失败:', error);
      next(error);
    }
  }

  /**
   * 设置默认AI角色
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   * @param {Function} next - Express下一个中间件函数
   */
  async setDefault(req, res, next) {
    try {
      const { id } = req.params;
      
      // 检查角色是否存在
      const role = await AIRole.findById(id);
      if (!role) {
        return res.status(404).json({
          success: false,
          message: '未找到指定的AI角色'
        });
      }
      
      // 设置为默认
      const updatedRole = await AIRole.setDefault(id);
      
      res.status(200).json({
        success: true,
        data: updatedRole,
        message: '设置默认AI角色成功'
      });
    } catch (error) {
      console.error('设置默认AI角色失败:', error);
      next(error);
    }
  }
}

// 导出控制器实例
module.exports = new AIRoleController();