/**
 * AI 服务
 * 提供与后端AI API交互的方法
 */

import apiClient from './apiClient';

/**
 * AI 服务类
 */
class AIService {
  /**
   * 获取可用的AI模型列表
   * @returns {Promise} 返回模型列表的Promise
   */
  async getModels() {
    try {
      const response = await apiClient.get('/ai/v1/models');
      return response.data;
    } catch (error) {
      console.error('获取AI模型列表失败:', error);
      throw error;
    }
  }

  /**
   * 创建聊天完成（非流式）
   * @param {Object} params - 请求参数
   * @param {Array} params.messages - 消息数组
   * @param {string} params.model - 模型名称（可选）
   * @param {number} params.temperature - 温度参数（可选）
   * @param {number} params.max_tokens - 最大token数（可选）
   * @param {boolean} params.disable_system_prompt - 是否禁用系统提示词（可选）
   * @returns {Promise} 返回聊天完成结果的Promise
   */
  async createChatCompletion(params) {
    try {
      const response = await apiClient.post('/ai/v1/chat/completions', {
        ...params,
        stream: false
      }, {
        timeout: 120000 // 2分钟超时，避免长回答被误判为超时
      });
      return response.data;
    } catch (error) {
      console.error('创建AI聊天完成失败:', error);
      throw error;
    }
  }

  /**
   * 创建聊天完成（流式）
   * @param {Object} params - 请求参数
   * @param {Array} params.messages - 消息数组
   * @param {string} params.model - 模型名称（可选）
   * @param {number} params.temperature - 温度参数（可选）
   * @param {number} params.max_tokens - 最大token数（可选）
   * @param {boolean} params.disable_system_prompt - 是否禁用系统提示词（可选）
   * @param {Function} params.onChunk - 接收到数据块时的回调函数
   * @param {Function} params.onError - 发生错误时的回调函数
   * @param {Function} params.onComplete - 完成时的回调函数
   * @returns {Promise} 返回AbortController的Promise，可用于取消请求
   */
  async createStreamingChatCompletion(params) {
    const { onChunk, onError, onComplete, onHistory, onFinish, ...requestParams } = params;
    
    // 创建AbortController用于取消请求
    const controller = new AbortController();
    
    try {
      // 获取认证token
      const authToken = localStorage.getItem('authToken');
      
      // 发送流式请求
      const response = await fetch('/api/ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          ...requestParams,
          stream: true
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(errorData.message || `请求失败: ${response.status}`);
        error.status = response.status;
        error.code = errorData.error?.code || 'request_failed';
        throw error;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let completed = false;
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            // 流结束时，flush 解码器以处理可能的多字节字符末尾
            const tail = decoder.decode();
            if (tail) {
              buffer += tail;
            }
            break;
          }
          
          // 解码数据块
          buffer += decoder.decode(value, { stream: true });
          
          // 处理SSE数据，支持 CRLF 换行符
          const lines = buffer.split(/\r?\n/);
          buffer = lines.pop() || ''; // 保留最后一行（可能不完整）
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim(); // 去除可能的空白字符和 CR
              
              // 检查是否结束
              if (data === '[DONE]') {
                completed = true;
                break; // 跳出循环，确保在 finally 中处理完成逻辑
              }
              
              try {
                // 解析JSON数据
                const chunk = JSON.parse(data);
                
                // 检查是否是history元事件
                if (chunk.type === 'history' && chunk.data) {
                  if (onHistory) onHistory(chunk.data);
                  continue;
                }
                
                // 检查是否是finish元事件
                if (chunk.type === 'finish' && chunk.data) {
                  if (onFinish) onFinish(chunk.data);
                  continue;
                }
                
                // 检查是否是错误数据
                if (chunk.error) {
                  console.error('SSE错误数据:', chunk.error);
                  if (onError) {
                    const error = new Error(chunk.error.message || '流式请求失败');
                    error.status = chunk.error.status || 500;
                    error.code = chunk.error.code || 'stream_error';
                    onError(error);
                  }
                  completed = true;
                  break;
                }
                
                // 调用回调函数
                if (onChunk) onChunk(chunk);
              } catch (parseError) {
                console.warn('解析SSE数据失败:', parseError, data);
              }
            }
          }
          
          // 如果已经收到 [DONE] 标记，跳出读取循环
          if (completed) break;
        }
        
        // 处理 buffer 中剩余的数据（如果有）
        if (buffer && !completed) {
          const lines = buffer.split(/\r?\n/);
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();
              
              if (data === '[DONE]') {
                completed = true;
                break;
              }
              
              try {
                const chunk = JSON.parse(data);
                
                if (chunk.type === 'history' && chunk.data) {
                  if (onHistory) onHistory(chunk.data);
                  continue;
                }
                
                if (chunk.error) {
                  console.error('SSE错误数据:', chunk.error);
                  if (onError) {
                    const error = new Error(chunk.error.message || '流式请求失败');
                    error.status = chunk.error.status || 500;
                    error.code = chunk.error.code || 'stream_error';
                    onError(error);
                  }
                  completed = true;
                  break;
                }
                
                if (onChunk) onChunk(chunk);
              } catch (parseError) {
                console.warn('解析SSE数据失败:', parseError, data);
              }
            }
          }
        }
        
        // 调用完成回调
        if (onComplete) onComplete();
      } finally {
        reader.releaseLock();
      }
      
      return controller;
    } catch (error) {
      console.error('创建流式AI聊天完成失败:', error);
      
      // 如果是AbortError，不调用错误回调
      if (error.name === 'AbortError') {
        console.log('请求已取消');
      } else if (onError) {
        onError(error);
      } else {
        throw error;
      }
      
      return controller;
    }
  }


  /**
   * 获取所有AI角色
   * @returns {Promise} 返回AI角色列表的Promise
   */
  async listRoles() {
    try {
      const response = await apiClient.get('/ai/v1/roles');
      return response.data;
    } catch (error) {
      console.error('获取AI角色列表失败:', error);
      throw error;
    }
  }

  /**
   * 获取默认AI角色
   * @returns {Promise} 返回默认AI角色的Promise
   */
  async getDefaultRole() {
    try {
      const response = await apiClient.get('/ai/v1/roles/default');
      return response.data;
    } catch (error) {
      console.error('获取默认AI角色失败:', error);
      throw error;
    }
  }

  /**
   * 根据ID获取AI角色
   * @param {string} id - 角色ID
   * @returns {Promise} 返回AI角色的Promise
   */
  async getRoleById(id) {
    try {
      const response = await apiClient.get(`/ai/v1/roles/${id}`);
      return response.data;
    } catch (error) {
      console.error('获取AI角色失败:', error);
      throw error;
    }
  }

  /**
   * 创建新的AI角色
   * @param {Object} params - 请求参数
   * @param {string} params.name - 角色名称
   * @param {string} params.systemPrompt - 系统提示词
   * @param {string} params.defaultModel - 默认模型（可选）
   * @param {number} params.defaultTemperature - 默认温度（可选）
   * @param {number} params.contextTokenLimit - 上下文Token上限（可选，1-2000000）
   * @param {number} params.maxOutputTokens - 最大输出Token上限（可选）
   * @param {number} params.topP - Top P值（可选，0-1）
   * @param {number} params.topK - Top K值（可选，0-64）
   * @param {boolean} params.isDefault - 是否设为默认
   * @returns {Promise} 返回创建结果的Promise
   */
  async createRole(params) {
    try {
      const response = await apiClient.post('/ai/v1/roles', params);
      return response.data;
    } catch (error) {
      console.error('创建AI角色失败:', error);
      throw error;
    }
  }

  /**
   * 更新AI角色
   * @param {string} id - 角色ID
   * @param {Object} params - 请求参数
   * @param {string} params.name - 角色名称（可选）
   * @param {string} params.systemPrompt - 系统提示词（可选）
   * @param {string} params.defaultModel - 默认模型（可选）
   * @param {number} params.defaultTemperature - 默认温度（可选）
   * @param {number} params.contextTokenLimit - 上下文Token上限（可选，1-2000000）
   * @param {number} params.maxOutputTokens - 最大输出Token上限（可选）
   * @param {number} params.topP - Top P值（可选，0-1）
   * @param {number} params.topK - Top K值（可选，0-64）
   * @param {boolean} params.isDefault - 是否设为默认（可选）
   * @returns {Promise} 返回更新结果的Promise
   */
  async updateRole(id, params) {
    try {
      const response = await apiClient.put(`/ai/v1/roles/${id}`, params);
      return response.data;
    } catch (error) {
      console.error('更新AI角色失败:', error);
      throw error;
    }
  }

  /**
   * 删除AI角色
   * @param {string} id - 角色ID
   * @returns {Promise} 返回删除结果的Promise
   */
  async deleteRole(id) {
    try {
      const response = await apiClient.delete(`/ai/v1/roles/${id}`);
      return response.data;
    } catch (error) {
      console.error('删除AI角色失败:', error);
      throw error;
    }
  }

  /**
   * 设置默认AI角色
   * @param {string} id - 角色ID
   * @returns {Promise} 返回设置结果的Promise
   */
  async setDefaultRole(id) {
    try {
      const response = await apiClient.post(`/ai/v1/roles/${id}/default`);
      return response.data;
    } catch (error) {
      console.error('设置默认AI角色失败:', error);
      throw error;
    }
  }

  /**
   * 获取聊天历史列表
   * @param {Object} params - 请求参数
   * @param {string} params.role_id - 角色ID (可选)
   * @param {number} params.page - 页码 (可选，默认1)
   * @param {number} params.limit - 每页数量 (可选，默认50)
   * @returns {Promise} 返回聊天历史列表的Promise
   */
  async listChatHistories(params = {}) {
    try {
      const { role_id, page = 1, limit = 50 } = params;
      const queryParams = new URLSearchParams();
      
      if (role_id && role_id !== 'all') {
        queryParams.append('role_id', role_id);
      }
      queryParams.append('page', page.toString());
      queryParams.append('limit', limit.toString());
      
      const response = await apiClient.get(`/ai/v1/chat/histories?${queryParams.toString()}`);
      return response.data;
    } catch (error) {
      console.error('获取聊天历史列表失败:', error);
      throw error;
    }
  }

  /**
   * 根据ID获取聊天历史详情
   * @param {string} id - 聊天历史ID
   * @returns {Promise} 返回聊天历史详情的Promise
   */
  async getChatHistoryById(id) {
    try {
      const response = await apiClient.get(`/ai/v1/chat/histories/${id}`);
      return response.data;
    } catch (error) {
      console.error('获取聊天历史详情失败:', error);
      throw error;
    }
  }

  /**
   * 更新聊天历史标题
   * @param {string} id - 聊天历史ID
   * @param {string} title - 新标题
   * @returns {Promise} 返回更新结果的Promise
   */
  async updateChatHistoryTitle(id, title) {
    try {
      const response = await apiClient.put(`/ai/v1/chat/histories/${id}`, { title });
      return response.data;
    } catch (error) {
      console.error('更新聊天历史标题失败:', error);
      throw error;
    }
  }

  /**
   * 删除聊天历史
   * @param {string} id - 聊天历史ID
   * @returns {Promise} 返回删除结果的Promise
   */
  async deleteChatHistory(id) {
    try {
      const response = await apiClient.delete(`/ai/v1/chat/histories/${id}`);
      return response.data;
    } catch (error) {
      console.error('删除聊天历史失败:', error);
      throw error;
    }
  }

  /**
   * 获取AI配置
   * @returns {Promise} 返回AI配置的Promise
   */
  async getConfig() {
    try {
      const response = await apiClient.get('/ai/v1/config');
      return response.data;
    } catch (error) {
      console.error('获取AI配置失败:', error);
      throw error;
    }
  }

  /**
   * 更新AI配置
   * @param {Object} params - 请求参数
   * @param {boolean} params.enabled - AI启用状态 (可选)
   * @param {string} params.current - 当前供应商键名 (可选)
   * @returns {Promise} 返回更新结果的Promise
   */
  async updateConfig(params) {
    try {
      const response = await apiClient.put('/ai/v1/config', params);
      return response.data;
    } catch (error) {
      console.error('更新AI配置失败:', error);
      throw error;
    }
  }

  /**
   * 切换AI启用状态
   * @param {boolean} enabled - AI启用状态
   * @returns {Promise} 返回切换结果的Promise
   */
  async toggleEnabled(enabled) {
    try {
      const response = await apiClient.post('/ai/v1/toggle', { enabled });
      return response.data;
    } catch (error) {
      console.error('切换AI启用状态失败:', error);
      throw error;
    }
  }

  /**
   * 获取所有供应商
   * @returns {Promise} 返回供应商列表的Promise
   */
  async listProviders() {
    try {
      const response = await apiClient.get('/ai/v1/providers');
      return response.data;
    } catch (error) {
      console.error('获取供应商列表失败:', error);
      throw error;
    }
  }

  /**
   * 创建或更新供应商
   * @param {string} key - 供应商键名
   * @param {Object} params - 供应商配置
   * @param {string} params.AI_BASE_URL - API基础URL
   * @param {string} params.AI_API_KEY - API密钥
   * @param {Array} params.AI_ALLOWED_MODELS - 允许的模型列表 (可选)
   * @returns {Promise} 返回保存结果的Promise
   */
  async upsertProvider(key, params) {
    try {
      const response = await apiClient.post(`/ai/v1/providers/${key}`, params);
      return response.data;
    } catch (error) {
      console.error('保存供应商失败:', error);
      throw error;
    }
  }

  /**
   * 更新供应商
   * @param {string} key - 供应商键名
   * @param {Object} params - 供应商配置
   * @param {string} params.AI_BASE_URL - API基础URL (可选)
   * @param {string} params.AI_API_KEY - API密钥 (可选)
   * @param {Array} params.AI_ALLOWED_MODELS - 允许的模型列表 (可选)
   * @returns {Promise} 返回更新结果的Promise
   */
  async updateProvider(key, params) {
    try {
      const response = await apiClient.put(`/ai/v1/providers/${key}`, params);
      return response.data;
    } catch (error) {
      console.error('更新供应商失败:', error);
      throw error;
    }
  }

  /**
   * 删除供应商
   * @param {string} key - 供应商键名
   * @returns {Promise} 返回删除结果的Promise
   */
  async deleteProvider(key) {
    try {
      const response = await apiClient.delete(`/ai/v1/providers/${key}`);
      return response.data;
    } catch (error) {
      console.error('删除供应商失败:', error);
      throw error;
    }
  }

  /**
   * 设置当前供应商
   * @param {string} key - 供应商键名
   * @returns {Promise} 返回设置结果的Promise
   */
  async selectProvider(key) {
    try {
      const response = await apiClient.post(`/ai/v1/providers/${key}/select`);
      return response.data;
    } catch (error) {
      console.error('设置当前供应商失败:', error);
      throw error;
    }
  }
}

// 创建并导出服务实例
const aiService = new AIService();
export default aiService;