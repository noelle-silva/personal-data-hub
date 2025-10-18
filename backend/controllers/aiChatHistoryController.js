/**
 * AI 聊天历史控制器
 * 处理AI聊天历史的CRUD操作
 */

const AIChatHistory = require('../models/AIChatHistory');
const AIRole = require('../models/AIRole');

/**
 * AI 聊天历史控制器类
 */
class AIChatHistoryController {
  /**
   * 获取聊天历史列表
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   * @param {Function} next - Express下一个中间件函数
   */
  async list(req, res, next) {
    try {
      const { role_id, page = 1, limit = 50 } = req.query;
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      
      // 验证分页参数
      if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
        return res.status(400).json({
          success: false,
          message: '分页参数无效，page必须大于0，limit必须在1-100之间'
        });
      }
      
      let histories;
      let total;
      
      if (role_id && role_id !== 'all') {
        // 获取指定角色的聊天历史
        histories = await AIChatHistory.getByRoleId(role_id, {
          page: pageNum,
          limit: limitNum
        });
        
        // 获取总数
        total = await AIChatHistory.countDocuments({ 
          roleId: role_id, 
          archived: false 
        });
      } else {
        // 获取所有聊天历史
        histories = await AIChatHistory.getAll({
          page: pageNum,
          limit: limitNum
        });
        
        // 获取总数
        total = await AIChatHistory.countDocuments({ 
          archived: false 
        });
      }
      
      res.status(200).json({
        success: true,
        data: {
          histories,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            pages: Math.ceil(total / limitNum)
          }
        },
        message: '获取聊天历史列表成功'
      });
    } catch (error) {
      console.error('获取聊天历史列表失败:', error);
      next(error);
    }
  }

  /**
   * 根据ID获取聊天历史详情
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   * @param {Function} next - Express下一个中间件函数
   */
  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const history = await AIChatHistory.findById(id);
      
      if (!history) {
        return res.status(404).json({
          success: false,
          message: '未找到指定的聊天历史'
        });
      }
      
      if (history.archived) {
        return res.status(404).json({
          success: false,
          message: '该聊天历史已归档'
        });
      }
      
      res.status(200).json({
        success: true,
        data: history,
        message: '获取聊天历史成功'
      });
    } catch (error) {
      console.error('获取聊天历史失败:', error);
      next(error);
    }
  }

  /**
   * 更新聊天历史标题
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   * @param {Function} next - Express下一个中间件函数
   */
  async updateTitle(req, res, next) {
    try {
      const { id } = req.params;
      const { title } = req.body;
      
      // 验证标题
      if (!title || typeof title !== 'string') {
        return res.status(400).json({
          success: false,
          message: '标题不能为空且必须是字符串'
        });
      }
      
      if (title.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: '标题不能为空字符串'
        });
      }
      
      if (title.length > 100) {
        return res.status(400).json({
          success: false,
          message: '标题不能超过100个字符'
        });
      }
      
      // 查找并更新聊天历史
      const history = await AIChatHistory.findById(id);
      
      if (!history) {
        return res.status(404).json({
          success: false,
          message: '未找到指定的聊天历史'
        });
      }
      
      if (history.archived) {
        return res.status(404).json({
          success: false,
          message: '该聊天历史已归档，无法更新'
        });
      }
      
      history.title = title.trim();
      await history.save();
      
      res.status(200).json({
        success: true,
        data: {
          id: history._id,
          title: history.title
        },
        message: '更新聊天历史标题成功'
      });
    } catch (error) {
      console.error('更新聊天历史标题失败:', error);
      next(error);
    }
  }

  /**
   * 删除聊天历史
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   * @param {Function} next - Express下一个中间件函数
   */
  async delete(req, res, next) {
    try {
      const { id } = req.params;
      
      // 查找聊天历史
      const history = await AIChatHistory.findById(id);
      
      if (!history) {
        return res.status(404).json({
          success: false,
          message: '未找到指定的聊天历史'
        });
      }
      
      // 硬删除
      await AIChatHistory.findByIdAndDelete(id);
      
      res.status(200).json({
        success: true,
        data: { id },
        message: '删除聊天历史成功'
      });
    } catch (error) {
      console.error('删除聊天历史失败:', error);
      next(error);
    }
  }

  /**
   * 创建新的聊天历史（内部方法，用于AI控制器）
   * @param {Object} params - 创建参数
   * @param {string} params.userMessage - 用户消息内容
   * @param {string} params.roleId - 角色ID（可选）
   * @param {string} params.systemPrompt - 系统提示词（可选）
   * @param {string} params.model - 模型名称（可选）
   * @returns {Promise<AIChatHistory>} 返回创建的聊天历史
   */
  async createHistory(params) {
    try {
      const { userMessage, roleId, systemPrompt, model } = params;
      
      // 获取角色信息（如果提供了roleId）
      let roleNameSnapshot = null;
      if (roleId) {
        try {
          const role = await AIRole.findById(roleId);
          if (role) {
            roleNameSnapshot = role.name;
          }
        } catch (error) {
          console.error('获取角色信息失败:', error);
        }
      }
      
      // 生成标题
      const title = AIChatHistory.generateTitle(userMessage, roleNameSnapshot);
      
      // 创建新的聊天历史
      const newHistory = new AIChatHistory({
        roleId: roleId || null,
        roleNameSnapshot,
        systemPromptSnapshot: systemPrompt || null,
        modelSnapshot: model || null,
        title,
        messages: [{
          role: 'user',
          content: userMessage,
          timestamp: new Date()
        }],
        messageCount: 1,
        lastMessageAt: new Date()
      });
      
      return await newHistory.save();
    } catch (error) {
      console.error('创建聊天历史失败:', error);
      throw error;
    }
  }

  /**
   * 向聊天历史添加助手消息（内部方法，用于AI控制器）
   * @param {string} historyId - 聊天历史ID
   * @param {string} content - 助手消息内容
   * @param {string} model - 模型名称（可选）
   * @param {boolean} incomplete - 是否未完成（用于流式响应中断）
   * @returns {Promise<AIChatHistory>} 返回更新后的聊天历史
   */
  async addAssistantMessage(historyId, content, model = null, incomplete = false) {
    try {
      const history = await AIChatHistory.findById(historyId);
      
      if (!history) {
        throw new Error('未找到指定的聊天历史');
      }
      
      await history.addMessage({
        role: 'assistant',
        content,
        model,
        incomplete,
        timestamp: new Date()
      });
      
      return history;
    } catch (error) {
      console.error('添加助手消息失败:', error);
      throw error;
    }
  }

  /**
   * 更新最后一条助手消息（内部方法，用于流式响应完成后的最终更新）
   * @param {string} historyId - 聊天历史ID
   * @param {string} content - 完整的助手消息内容
   * @param {string} model - 模型名称（可选）
   * @returns {Promise<AIChatHistory>} 返回更新后的聊天历史
   */
  async updateLastAssistantMessage(historyId, content, model = null) {
    try {
      const history = await AIChatHistory.findById(historyId);
      
      if (!history) {
        throw new Error('未找到指定的聊天历史');
      }
      
      await history.updateLastAssistantMessage(content, model);
      
      return history;
    } catch (error) {
      console.error('更新最后一条助手消息失败:', error);
      throw error;
    }
  }
}

// 导出控制器实例
module.exports = new AIChatHistoryController();