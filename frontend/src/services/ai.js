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
   * @param {string} params.system_preset_id - 系统提示词预设ID（可选）
   * @param {boolean} params.disable_system_prompt - 是否禁用系统提示词（可选）
   * @returns {Promise} 返回聊天完成结果的Promise
   */
  async createChatCompletion(params) {
    try {
      const response = await apiClient.post('/ai/v1/chat/completions', {
        ...params,
        stream: false
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
   * @param {string} params.system_preset_id - 系统提示词预设ID（可选）
   * @param {boolean} params.disable_system_prompt - 是否禁用系统提示词（可选）
   * @param {Function} params.onChunk - 接收到数据块时的回调函数
   * @param {Function} params.onError - 发生错误时的回调函数
   * @param {Function} params.onComplete - 完成时的回调函数
   * @returns {Promise} 返回AbortController的Promise，可用于取消请求
   */
  async createStreamingChatCompletion(params) {
    const { onChunk, onError, onComplete, ...requestParams } = params;
    
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
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;
          
          // 解码数据块
          buffer += decoder.decode(value, { stream: true });
          
          // 处理SSE数据
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // 保留最后一行（可能不完整）
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              
              // 检查是否结束
              if (data === '[DONE]') {
                if (onComplete) onComplete();
                return controller;
              }
              
              try {
                // 解析JSON数据
                const chunk = JSON.parse(data);
                
                // 调用回调函数
                if (onChunk) onChunk(chunk);
              } catch (parseError) {
                console.warn('解析SSE数据失败:', parseError, data);
              }
            }
          }
        }
        
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
   * 获取所有AI系统提示词
   * @returns {Promise} 返回AI提示词列表的Promise
   */
  async listPrompts() {
    try {
      const response = await apiClient.get('/ai/v1/prompts');
      return response.data;
    } catch (error) {
      console.error('获取AI提示词列表失败:', error);
      throw error;
    }
  }

  /**
   * 获取默认AI系统提示词
   * @returns {Promise} 返回默认AI提示词的Promise
   */
  async getDefaultPrompt() {
    try {
      const response = await apiClient.get('/ai/v1/prompts/default');
      return response.data;
    } catch (error) {
      console.error('获取默认AI提示词失败:', error);
      throw error;
    }
  }

  /**
   * 根据ID获取AI系统提示词
   * @param {string} id - 提示词ID
   * @returns {Promise} 返回AI提示词的Promise
   */
  async getPromptById(id) {
    try {
      const response = await apiClient.get(`/ai/v1/prompts/${id}`);
      return response.data;
    } catch (error) {
      console.error('获取AI提示词失败:', error);
      throw error;
    }
  }

  /**
   * 创建新的AI系统提示词
   * @param {Object} params - 请求参数
   * @param {string} params.name - 提示词名称
   * @param {string} params.content - 提示词内容
   * @param {boolean} params.isDefault - 是否设为默认
   * @returns {Promise} 返回创建结果的Promise
   */
  async createPrompt(params) {
    try {
      const response = await apiClient.post('/ai/v1/prompts', params);
      return response.data;
    } catch (error) {
      console.error('创建AI提示词失败:', error);
      throw error;
    }
  }

  /**
   * 更新AI系统提示词
   * @param {string} id - 提示词ID
   * @param {Object} params - 请求参数
   * @param {string} params.name - 提示词名称（可选）
   * @param {string} params.content - 提示词内容（可选）
   * @param {boolean} params.isDefault - 是否设为默认（可选）
   * @returns {Promise} 返回更新结果的Promise
   */
  async updatePrompt(id, params) {
    try {
      const response = await apiClient.put(`/ai/v1/prompts/${id}`, params);
      return response.data;
    } catch (error) {
      console.error('更新AI提示词失败:', error);
      throw error;
    }
  }

  /**
   * 删除AI系统提示词
   * @param {string} id - 提示词ID
   * @returns {Promise} 返回删除结果的Promise
   */
  async deletePrompt(id) {
    try {
      const response = await apiClient.delete(`/ai/v1/prompts/${id}`);
      return response.data;
    } catch (error) {
      console.error('删除AI提示词失败:', error);
      throw error;
    }
  }

  /**
   * 设置默认AI系统提示词
   * @param {string} id - 提示词ID
   * @returns {Promise} 返回设置结果的Promise
   */
  async setDefaultPrompt(id) {
    try {
      const response = await apiClient.post(`/ai/v1/prompts/${id}/default`);
      return response.data;
    } catch (error) {
      console.error('设置默认AI提示词失败:', error);
      throw error;
    }
  }
}

// 创建并导出服务实例
const aiService = new AIService();
export default aiService;