/**
 * AI 提示词控制器
 * 处理AI系统提示词的CRUD操作
 */

const AIPrompt = require('../models/AIPrompt');

/**
 * AI 提示词控制器类
 */
class AIPromptController {
  /**
   * 获取所有AI提示词
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   * @param {Function} next - Express下一个中间件函数
   */
  async list(req, res, next) {
    try {
      const prompts = await AIPrompt.find().sort({ isDefault: -1, createdAt: -1 });
      
      res.status(200).json({
        success: true,
        data: prompts,
        message: '获取AI提示词列表成功'
      });
    } catch (error) {
      console.error('获取AI提示词列表失败:', error);
      next(error);
    }
  }

  /**
   * 获取默认AI提示词
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   * @param {Function} next - Express下一个中间件函数
   */
  async getDefault(req, res, next) {
    try {
      const defaultPrompt = await AIPrompt.getDefault();
      
      if (!defaultPrompt) {
        return res.status(404).json({
          success: false,
          message: '未找到默认AI提示词'
        });
      }
      
      res.status(200).json({
        success: true,
        data: defaultPrompt,
        message: '获取默认AI提示词成功'
      });
    } catch (error) {
      console.error('获取默认AI提示词失败:', error);
      next(error);
    }
  }

  /**
   * 根据ID获取AI提示词
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   * @param {Function} next - Express下一个中间件函数
   */
  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const prompt = await AIPrompt.findById(id);
      
      if (!prompt) {
        return res.status(404).json({
          success: false,
          message: '未找到指定的AI提示词'
        });
      }
      
      res.status(200).json({
        success: true,
        data: prompt,
        message: '获取AI提示词成功'
      });
    } catch (error) {
      console.error('获取AI提示词失败:', error);
      next(error);
    }
  }

  /**
   * 创建新的AI提示词
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   * @param {Function} next - Express下一个中间件函数
   */
  async create(req, res, next) {
    try {
      const { name, content, isDefault = false } = req.body;
      
      // 验证必填字段
      if (!name || !content) {
        return res.status(400).json({
          success: false,
          message: '提示词名称和内容不能为空'
        });
      }
      
      // 检查名称是否已存在
      const existingPrompt = await AIPrompt.findOne({ name });
      if (existingPrompt) {
        return res.status(400).json({
          success: false,
          message: '提示词名称已存在'
        });
      }
      
      // 创建新提示词
      const newPrompt = new AIPrompt({
        name,
        content,
        isDefault
      });
      
      await newPrompt.save();
      
      res.status(201).json({
        success: true,
        data: newPrompt,
        message: '创建AI提示词成功'
      });
    } catch (error) {
      console.error('创建AI提示词失败:', error);
      
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
          message: '提示词名称已存在'
        });
      }
      
      next(error);
    }
  }

  /**
   * 更新AI提示词
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   * @param {Function} next - Express下一个中间件函数
   */
  async update(req, res, next) {
    try {
      const { id } = req.params;
      const { name, content, isDefault } = req.body;
      
      // 查找要更新的提示词
      const prompt = await AIPrompt.findById(id);
      if (!prompt) {
        return res.status(404).json({
          success: false,
          message: '未找到指定的AI提示词'
        });
      }
      
      // 如果更新了名称，检查新名称是否已存在
      if (name && name !== prompt.name) {
        const existingPrompt = await AIPrompt.findOne({ name });
        if (existingPrompt) {
          return res.status(400).json({
            success: false,
            message: '提示词名称已存在'
          });
        }
      }
      
      // 更新字段
      if (name) prompt.name = name;
      if (content) prompt.content = content;
      if (isDefault !== undefined) prompt.isDefault = isDefault;
      
      await prompt.save();
      
      res.status(200).json({
        success: true,
        data: prompt,
        message: '更新AI提示词成功'
      });
    } catch (error) {
      console.error('更新AI提示词失败:', error);
      
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
          message: '提示词名称已存在'
        });
      }
      
      next(error);
    }
  }

  /**
   * 删除AI提示词
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   * @param {Function} next - Express下一个中间件函数
   */
  async delete(req, res, next) {
    try {
      const { id } = req.params;
      
      // 查找要删除的提示词
      const prompt = await AIPrompt.findById(id);
      if (!prompt) {
        return res.status(404).json({
          success: false,
          message: '未找到指定的AI提示词'
        });
      }
      
      // 检查是否是最后一个提示词
      const promptCount = await AIPrompt.countDocuments();
      if (promptCount <= 1) {
        return res.status(400).json({
          success: false,
          message: '不能删除最后一个AI提示词'
        });
      }
      
      await prompt.deleteOne();
      
      res.status(200).json({
        success: true,
        data: { id },
        message: '删除AI提示词成功'
      });
    } catch (error) {
      console.error('删除AI提示词失败:', error);
      next(error);
    }
  }

  /**
   * 设置默认AI提示词
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   * @param {Function} next - Express下一个中间件函数
   */
  async setDefault(req, res, next) {
    try {
      const { id } = req.params;
      
      // 检查提示词是否存在
      const prompt = await AIPrompt.findById(id);
      if (!prompt) {
        return res.status(404).json({
          success: false,
          message: '未找到指定的AI提示词'
        });
      }
      
      // 设置为默认
      const updatedPrompt = await AIPrompt.setDefault(id);
      
      res.status(200).json({
        success: true,
        data: updatedPrompt,
        message: '设置默认AI提示词成功'
      });
    } catch (error) {
      console.error('设置默认AI提示词失败:', error);
      next(error);
    }
  }
}

// 导出控制器实例
module.exports = new AIPromptController();