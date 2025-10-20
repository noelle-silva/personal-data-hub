/**
 * AI 控制器层
 * 处理AI相关的HTTP请求和响应，调用OpenAI SDK处理业务逻辑
 */

const AIRole = require('../models/AIRole');
const AIChatHistory = require('../models/AIChatHistory');
const aiChatHistoryController = require('./aiChatHistoryController');
const aiConfigService = require('../config/ai/configService');

/**
 * AI 控制器类
 */
class AIController {
  /**
   * 估算文本的 token 数量（简单估算：按字符数/4）
   * @param {string} text - 要估算的文本
   * @returns {number} 估算的 token 数量
   */
  estimateTokens(text) {
    // 简单估算：平均每个 token 约等于 4 个字符（英文）或 1.5 个字符（中文）
    // 这里使用保守的估算方法
    if (!text) return 0;
    
    // 计算中文字符数
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    // 计算非中文字符数
    const otherChars = text.length - chineseChars;
    
    // 中文字符按 1.5 个字符/token，其他字符按 4 个字符/token
    return Math.ceil(chineseChars / 1.5 + otherChars / 4);
  }

  /**
   * 估算消息数组的总 token 数量
   * @param {Array} messages - 消息数组
   * @returns {number} 估算的总 token 数量
   */
  estimateMessagesTokens(messages) {
    if (!messages || !Array.isArray(messages)) return 0;
    
    return messages.reduce((total, msg) => {
      return total + this.estimateTokens(msg.content || '');
    }, 0);
  }

  /**
   * 根据上下文限制截断消息
   * @param {Array} messages - 消息数组
   * @param {number} maxTokens - 最大 token 数量
   * @returns {Array} 截断后的消息数组
   */
  truncateMessages(messages, maxTokens) {
    if (!messages || !Array.isArray(messages)) return messages;
    
    // 如果消息总 token 数量未超过限制，直接返回
    const totalTokens = this.estimateMessagesTokens(messages);
    if (totalTokens <= maxTokens) return messages;
    
    // 保留系统消息（如果存在）
    const systemMessage = messages.find(msg => msg.role === 'system');
    const otherMessages = messages.filter(msg => msg.role !== 'system');
    
    // 从最新消息开始，逐步添加直到达到限制
    const truncatedMessages = [];
    let currentTokens = 0;
    
    // 添加系统消息
    if (systemMessage) {
      truncatedMessages.push(systemMessage);
      currentTokens += this.estimateTokens(systemMessage.content);
    }
    
    // 从最新消息开始倒序添加
    for (let i = otherMessages.length - 1; i >= 0; i--) {
      const msg = otherMessages[i];
      const msgTokens = this.estimateTokens(msg.content);
      
      if (currentTokens + msgTokens <= maxTokens) {
        truncatedMessages.unshift(msg);
        currentTokens += msgTokens;
      } else {
        break;
      }
    }
    
    return truncatedMessages;
  }

  /**
   * 获取可用的AI模型列表
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   * @param {Function} next - Express下一个中间件函数
   */
  async getModels(req, res, next) {
    try {
      // 检查AI功能是否启用
      if (!aiConfigService.isEnabled()) {
        return res.status(503).json({
          success: false,
          message: 'AI功能已禁用'
        });
      }

      // 获取当前供应商配置
      const currentProvider = aiConfigService.getCurrentProvider();
      if (!currentProvider) {
        return res.status(503).json({
          success: false,
          message: '未配置AI供应商'
        });
      }

      // 动态导入OpenAI模块（ESM模块在CJS环境中需要动态导入）
      const { default: OpenAI } = await import('openai');
      
      // 创建OpenAI客户端
      const openai = new OpenAI({
        baseURL: currentProvider.AI_BASE_URL,
        apiKey: currentProvider.AI_API_KEY,
      });

      // 获取模型列表
      const list = await openai.models.list();
      
      // 获取允许的模型列表（如果配置了的话）
      const allowedModels = currentProvider.AI_ALLOWED_MODELS || null;
      
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
      if (!aiConfigService.isEnabled()) {
        return res.status(503).json({
          success: false,
          message: 'AI功能已禁用'
        });
      }

      // 获取当前供应商配置
      const currentProvider = aiConfigService.getCurrentProvider();
      if (!currentProvider) {
        return res.status(503).json({
          success: false,
          message: '未配置AI供应商'
        });
      }

      const { messages, model, stream = false, temperature, max_tokens, top_p, top_k, role_id, disable_system_prompt, history_id } = req.body;

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
        baseURL: currentProvider.AI_BASE_URL,
        apiKey: currentProvider.AI_API_KEY,
      });

      // 处理系统提示词
      let processedMessages = [...messages];
      
      // 如果没有禁用系统提示词
      if (!disable_system_prompt) {
        let systemPrompt = null;
        
        // 优先级：role_id > 默认角色
        if (role_id) {
          // 使用指定角色的系统提示词
          try {
            const role = await AIRole.findById(role_id);
            if (role) {
              systemPrompt = role.systemPrompt;
            }
          } catch (error) {
            console.error('获取指定AI角色失败:', error);
          }
        } else {
          // 尝试使用默认角色
          try {
            const defaultRole = await AIRole.getDefault();
            if (defaultRole) {
              systemPrompt = defaultRole.systemPrompt;
            }
          } catch (error) {
            console.error('获取默认AI角色失败:', error);
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

      // 获取角色信息（如果指定了角色）
      let role = null;
      if (role_id) {
        try {
          role = await AIRole.findById(role_id);
        } catch (error) {
          console.error('获取AI角色失败:', error);
        }
      }

      // 确定最终使用的模型（优先级：用户参数 > 角色默认 > 环境默认）
      let finalModel = model;
      if (!finalModel && role && role.defaultModel) {
        finalModel = role.defaultModel;
      }
      
      // 确定最终使用的温度（优先级：用户参数 > 角色默认 > 环境默认）
      let finalTemperature = temperature;
      if (finalTemperature === undefined && role && role.defaultTemperature !== undefined) {
        finalTemperature = role.defaultTemperature;
      }
      
      // 确定最终使用的 Top P（优先级：用户参数 > 角色默认 > 环境默认）
      let finalTopP = top_p;
      if (finalTopP === undefined && role && role.topP !== undefined) {
        finalTopP = role.topP;
      }
      
      // 确定最终使用的 Top K（优先级：用户参数 > 角色默认 > 环境默认）
      let finalTopK = top_k;
      if (finalTopK === undefined && role && role.topK !== undefined) {
        finalTopK = role.topK;
      }
      
      // 确定最终使用的最大输出 Token（优先级：用户参数 > 角色默认 > 环境默认）
      let finalMaxTokens = max_tokens;
      if (finalMaxTokens === undefined && role && role.maxOutputTokens !== undefined) {
        finalMaxTokens = role.maxOutputTokens;
      }
      if (finalMaxTokens === undefined) {
        finalMaxTokens = 4096; // 默认值
      }
      
      // 如果角色有设置最大输出 Token，取较小值
      if (role && role.maxOutputTokens !== undefined) {
        finalMaxTokens = Math.min(finalMaxTokens, role.maxOutputTokens);
      }

      // 处理聊天历史
      let chatHistory = null;
      let isNewHistory = false;
      
      if (history_id) {
        // 如果提供了history_id，加载现有聊天历史
        try {
          chatHistory = await AIChatHistory.findById(history_id);
          if (!chatHistory) {
            return res.status(404).json({
              success: false,
              message: '未找到指定的聊天历史'
            });
          }
        } catch (error) {
          console.error('获取聊天历史失败:', error);
          return res.status(500).json({
            success: false,
            message: '获取聊天历史失败'
          });
        }
      } else {
        // 如果没有提供history_id，检查是否需要创建新的聊天历史
        // 只有当用户消息不为空时才创建新历史，避免空会话
        const userMessage = messages[messages.length - 1];
        if (userMessage && userMessage.role === 'user' && userMessage.content && userMessage.content.trim()) {
          try {
            // 获取系统提示词（用于快照）
            let systemPrompt = null;
            if (!disable_system_prompt) {
              if (role_id) {
                const role = await AIRole.findById(role_id);
                if (role) {
                  systemPrompt = role.systemPrompt;
                }
              } else {
                const defaultRole = await AIRole.getDefault();
                if (defaultRole) {
                  systemPrompt = defaultRole.systemPrompt;
                }
              }
            }
            
            chatHistory = await aiChatHistoryController.createHistory({
              userMessage: userMessage.content,
              roleId: role_id || null,
              systemPrompt,
              model: finalModel || 'gpt-4o-mini'
            });
            isNewHistory = true;
            console.log('创建新聊天历史成功:', chatHistory._id);
          } catch (error) {
            console.error('创建聊天历史失败:', error);
            // 创建失败不应该阻止聊天，继续处理但不保存历史
          }
        }
      }

      // 如果有现有聊天历史，将其消息添加到请求消息中
      if (chatHistory && !isNewHistory) {
        // 先将新的用户消息添加到历史中
        const userMessage = messages[messages.length - 1];
        if (userMessage && userMessage.role === 'user') {
          await chatHistory.addMessage({
            role: 'user',
            content: userMessage.content,
            timestamp: new Date()
          });
        }
        
        // 使用历史中的消息作为上下文，但排除系统消息（因为我们会重新添加）
        const historyMessages = chatHistory.messages
          .filter(msg => msg.role !== 'system')
          .map(msg => ({
            role: msg.role,
            content: msg.content
          }));
        
        // 合并历史消息和新的用户消息（不重复添加最新的用户消息）
        processedMessages = historyMessages;
      }


      // 根据角色的上下文限制截断消息
      if (role && role.contextTokenLimit) {
        processedMessages = this.truncateMessages(processedMessages, role.contextTokenLimit);
      }

      // 构建请求参数
      const completionParams = {
        model: finalModel || 'gpt-4o-mini',
        messages: processedMessages,
        stream,
        temperature: finalTemperature !== undefined ? finalTemperature : 0.7,
        max_tokens: finalMaxTokens,
      };
      
      // 添加 Top P 参数（如果设置了）
      if (finalTopP !== undefined) {
        completionParams.top_p = finalTopP;
      }
      
      // 添加 Top K 参数（如果设置了且大于0）
      if (finalTopK !== undefined && finalTopK > 0) {
        completionParams.top_k = finalTopK;
      }

      // 如果是流式请求
      if (stream) {
        // 设置响应头为SSE，明确指定UTF-8编码
        res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no'); // 禁用Nginx缓冲
        
        // 刷新响应头（如果方法存在）
        if (typeof res.flushHeaders === 'function') {
          res.flushHeaders();
        }

        // 如果是新创建的聊天历史，发送history元事件
        if (isNewHistory && chatHistory) {
          const historyEvent = {
            type: 'history',
            data: {
              id: chatHistory._id,
              title: chatHistory.title
            }
          };
          console.log('发送history元事件:', historyEvent);
          res.write(`data: ${JSON.stringify(historyEvent)}\n\n`);
        }

        let assistantContent = '';
        let finishReason = null;
        
        // 添加连接诊断
        res.on('close', () => {
          console.log('[SSE] 客户端连接关闭');
        });
        
        res.on('finish', () => {
          console.log('[SSE] 响应完成发送');
        });
        
        req.on('aborted', () => {
          console.log('[SSE] 客户端请求中止');
        });
        
        try {
          const streamResponse = await openai.chat.completions.create(completionParams);
          
          // 处理流式响应
          for await (const chunk of streamResponse) {
            const data = `data: ${JSON.stringify(chunk)}\n\n`;
            res.write(data);
            
            // 收集助手回复内容
            if (chunk.choices && chunk.choices[0]?.delta?.content) {
              assistantContent += chunk.choices[0].delta.content;
            }
            
            // 捕获finish_reason
            if (chunk.choices && chunk.choices[0]?.finish_reason) {
              finishReason = chunk.choices[0].finish_reason;
            }
          }
          
          // 发送finish元事件
          if (finishReason) {
            const finishEvent = {
              type: 'finish',
              data: {
                finish_reason: finishReason,
                content_length: assistantContent.length
              }
            };
            console.log('[SSE] 发送finish事件:', finishEvent);
            res.write(`data: ${JSON.stringify(finishEvent)}\n\n`);
          }
          
          // 流式响应完成，保存聊天历史
          if (chatHistory && assistantContent.trim()) {
            try {
              await aiChatHistoryController.updateLastAssistantMessage(
                chatHistory._id,
                assistantContent,
                finalModel || 'gpt-4o-mini'
              );
            } catch (saveError) {
              console.error('保存聊天历史失败:', saveError);
            }
          }
          
          // 发送结束标记
          res.write('data: [DONE]\n\n');
        } catch (streamError) {
          console.error('流式AI请求失败:', streamError);
          
          // 如果有部分内容，保存不完整的消息
          if (chatHistory && assistantContent && assistantContent.trim()) {
            try {
              await chatHistory.addMessage({
                role: 'assistant',
                content: assistantContent,
                model: finalModel || 'gpt-4o-mini',
                incomplete: true,
                timestamp: new Date()
              });
            } catch (saveError) {
              console.error('保存不完整聊天历史失败:', saveError);
            }
          }
          
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
        } finally {
          // 确保响应结束
          if (!res.destroyed) {
            res.end();
          }
        }
      } else {
        // 非流式请求
        const completion = await openai.chat.completions.create(completionParams);
        
        // 保存聊天历史
        if (chatHistory && completion.choices && completion.choices[0]?.message?.content) {
          try {
            await chatHistory.addMessage({
              role: 'assistant',
              content: completion.choices[0].message.content,
              model: completion.model,
              timestamp: new Date()
            });
          } catch (saveError) {
            console.error('保存聊天历史失败:', saveError);
          }
        }
        
        // 构建响应数据
        const responseData = {
          ...completion,
          // 如果是新创建的聊天历史，返回historyId
          ...(isNewHistory && chatHistory && { meta: { historyId: chatHistory._id } })
        };
        
        // 返回成功响应
        res.status(200).json({
          success: true,
          data: responseData,
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