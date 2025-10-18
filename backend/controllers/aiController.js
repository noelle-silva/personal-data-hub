/**
 * AI 控制器层
 * 处理AI相关的HTTP请求和响应，调用OpenAI SDK处理业务逻辑
 */

const AIPrompt = require('../models/AIPrompt');

/**
 * AI 控制器类
 */
class AIController {
  /**
   * 获取可用的AI模型列表
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   * @param {Function} next - Express下一个中间件函数
   */
  async getModels(req, res, next) {
    try {
      // 检查AI功能是否启用
      if (process.env.AI_ENABLED !== 'true') {
        return res.status(503).json({
          success: false,
          message: 'AI功能已禁用'
        });
      }

      // 动态导入OpenAI模块（ESM模块在CJS环境中需要动态导入）
      const { default: OpenAI } = await import('openai');
      
      // 创建OpenAI客户端
      const openai = new OpenAI({
        baseURL: process.env.AI_BASE_URL,
        apiKey: process.env.AI_API_KEY,
      });

      // 获取模型列表
      const list = await openai.models.list();
      
      // 获取允许的模型列表（如果配置了的话）
      const allowedModels = process.env.AI_ALLOWED_MODELS 
        ? process.env.AI_ALLOWED_MODELS.split(',').map(m => m.trim())
        : null;
      
      // 过滤模型列表
      let models = list.data;
      if (allowedModels && allowedModels.length > 0) {
        models = models.filter(model => allowedModels.includes(model.id));
      }

      // 返回成功响应
      res.status(200).json({
        success: true,
        data: models,
        message: '获取模型列表成功'
      });
    } catch (error) {
      console.error('获取AI模型列表失败:', error);
      
      // 处理OpenAI API错误
      if (error.status) {
        return res.status(error.status).json({
          success: false,
          message: error.message || '获取模型列表失败',
          error: error.code || 'unknown_error'
        });
      }
      
      next(error);
    }
  }

  /**
   * 创建聊天完成
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   * @param {Function} next - Express下一个中间件函数
   */
  async createChatCompletion(req, res, next) {
    try {
      // 检查AI功能是否启用
      if (process.env.AI_ENABLED !== 'true') {
        return res.status(503).json({
          success: false,
          message: 'AI功能已禁用'
        });
      }

      const { messages, model, stream = false, temperature, max_tokens, system_preset_id, disable_system_prompt } = req.body;

      // 验证请求参数
      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({
          success: false,
          message: '消息列表不能为空'
        });
      }

      // 动态导入OpenAI模块
      const { default: OpenAI } = await import('openai');
      
      // 创建OpenAI客户端
      const openai = new OpenAI({
        baseURL: process.env.AI_BASE_URL,
        apiKey: process.env.AI_API_KEY,
      });

      // 处理系统提示词
      let processedMessages = [...messages];
      
      // 如果没有禁用系统提示词
      if (!disable_system_prompt) {
        let systemPrompt = null;
        
        // 如果指定了预设ID，使用指定的预设
        if (system_preset_id) {
          try {
            const prompt = await AIPrompt.findById(system_preset_id);
            if (prompt) {
              systemPrompt = prompt.content;
            }
          } catch (error) {
            console.error('获取指定AI提示词失败:', error);
          }
        }
        // 否则使用默认预设
        else {
          try {
            const defaultPrompt = await AIPrompt.getDefault();
            if (defaultPrompt) {
              systemPrompt = defaultPrompt.content;
            }
          } catch (error) {
            console.error('获取默认AI提示词失败:', error);
          }
        }
        
        // 如果找到了系统提示词，添加到消息数组的开头
        if (systemPrompt) {
          // 检查是否已经有系统消息
          const hasSystemMessage = processedMessages.some(msg => msg.role === 'system');
          
          if (hasSystemMessage) {
            // 如果已经有系统消息，替换它
            processedMessages = processedMessages.map(msg =>
              msg.role === 'system' ? { role: 'system', content: systemPrompt } : msg
            );
          } else {
            // 如果没有系统消息，添加一个
            processedMessages.unshift({ role: 'system', content: systemPrompt });
          }
        }
      }

      // 构建请求参数
      const completionParams = {
        model: model || process.env.AI_DEFAULT_MODEL || 'gpt-4o-mini',
        messages: processedMessages,
        stream,
        temperature: temperature !== undefined ? temperature : parseFloat(process.env.AI_TEMPERATURE) || 0.7,
        max_tokens: max_tokens !== undefined ? max_tokens : parseInt(process.env.AI_MAX_TOKENS) || 4096,
      };

      // 如果是流式请求
      if (stream) {
        // 设置响应头为SSE
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        try {
          const streamResponse = await openai.chat.completions.create(completionParams);
          
          // 处理流式响应
          for await (const chunk of streamResponse) {
            const data = `data: ${JSON.stringify(chunk)}\n\n`;
            res.write(data);
          }
          
          // 发送结束标记
          res.write('data: [DONE]\n\n');
          res.end();
        } catch (streamError) {
          console.error('流式AI请求失败:', streamError);
          // 发送错误信息
          const errorData = {
            error: {
              message: streamError.message || '流式请求失败',
              type: 'stream_error',
              code: streamError.code || 'unknown_error'
            }
          };
          res.write(`data: ${JSON.stringify(errorData)}\n\n`);
          res.write('data: [DONE]\n\n');
          res.end();
        }
      } else {
        // 非流式请求
        const completion = await openai.chat.completions.create(completionParams);
        
        // 返回成功响应
        res.status(200).json({
          success: true,
          data: completion,
          message: '聊天完成创建成功'
        });
      }
    } catch (error) {
      console.error('创建AI聊天完成失败:', error);
      
      // 处理OpenAI API错误
      if (error.status) {
        return res.status(error.status).json({
          success: false,
          message: error.message || '创建聊天完成失败',
          error: error.code || 'unknown_error'
        });
      }
      
      // 非流式请求的错误处理
      if (!req.body.stream) {
        return next(error);
      }
      
      // 流式请求的错误处理
      try {
        const errorData = {
          error: {
            message: error.message || '服务器内部错误',
            type: 'internal_error',
            code: 'internal_error'
          }
        };
        res.write(`data: ${JSON.stringify(errorData)}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
      } catch (writeError) {
        console.error('写入错误响应失败:', writeError);
      }
    }
  }
}

// 导出控制器实例
module.exports = new AIController();