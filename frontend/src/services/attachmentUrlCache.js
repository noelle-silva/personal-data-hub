/**
 * 附件URL缓存工具
 * 提供基于LRU算法的附件签名URL缓存，支持过期时间管理
 */

import { generateSignedUrl, generateSignedUrlBatch } from './attachments';

/**
 * LRU缓存实现
 * 用于缓存附件签名URL，避免重复请求
 */
class LRUCache {
  constructor(capacity = 50) {
    this.capacity = capacity;
    this.cache = new Map();
  }

  /**
   * 获取缓存项
   * @param {string} key - 缓存键
   * @returns {any|null} 缓存值或null
   */
  get(key) {
    if (this.cache.has(key)) {
      const value = this.cache.get(key);
      
      // 检查是否过期
      if (value.expiresAt > Date.now()) {
        // 移到最后（最近使用）
        this.cache.delete(key);
        this.cache.set(key, value);
        return value.signedUrl;
      } else {
        // 过期，删除
        this.cache.delete(key);
      }
    }
    return null;
  }

  /**
   * 设置缓存项
   * @param {string} key - 缓存键
   * @param {string} signedUrl - 签名URL
   * @param {number} ttl - 生存时间（秒）
   */
  set(key, signedUrl, ttl) {
    // 计算过期时间
    const expiresAt = Date.now() + ttl * 1000;
    
    if (this.cache.size >= this.capacity) {
      // 删除最久未使用的项
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, { signedUrl, expiresAt });
  }

  /**
   * 删除缓存项
   * @param {string} key - 缓存键
   */
  delete(key) {
    return this.cache.delete(key);
  }

  /**
   * 清空缓存
   */
  clear() {
    this.cache.clear();
  }

  /**
   * 获取缓存大小
   * @returns {number} 缓存项数量
   */
  get size() {
    return this.cache.size;
  }

  /**
   * 清理过期项
   * @returns {number} 清理的项数量
   */
  cleanup() {
    let cleaned = 0;
    const now = Date.now();
    
    for (const [key, value] of this.cache.entries()) {
      if (value.expiresAt <= now) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    return cleaned;
  }

  /**
   * 获取缓存统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    const now = Date.now();
    let expired = 0;
    let valid = 0;
    
    for (const [key, value] of this.cache.entries()) {
      if (value.expiresAt <= now) {
        expired++;
      } else {
        valid++;
      }
    }
    
    return {
      total: this.cache.size,
      valid,
      expired,
      capacity: this.capacity
    };
  }
}

// 创建全局缓存实例
const attachmentUrlCache = new LRUCache(50);

// 定期清理过期项（每5分钟）
setInterval(() => {
  const cleaned = attachmentUrlCache.cleanup();
  if (cleaned > 0 && process.env.NODE_ENV === 'development') {
    console.log(`[AttachmentUrlCache] 清理了 ${cleaned} 个过期项`);
  }
}, 5 * 60 * 1000);

/**
 * 获取缓存的签名URL
 * @param {string} attachmentId - 附件ID
 * @param {number} ttl - 生存时间（秒），可选
 * @returns {Promise<string>} 签名URL
 */
export const getSignedUrlCached = async (attachmentId, ttl) => {
  // 检查缓存
  const cachedUrl = attachmentUrlCache.get(attachmentId);
  if (cachedUrl) {
    return cachedUrl;
  }

  try {
    // 缓存未命中，生成新的签名URL
    const response = await generateSignedUrl(attachmentId, ttl);
    const signedUrl = response.data.signedUrl;
    
    // 缓存结果
    const effectiveTtl = ttl || response.data.ttl || 3600;
    attachmentUrlCache.set(attachmentId, signedUrl, effectiveTtl);
    
    return signedUrl;
  } catch (error) {
    console.error(`[AttachmentUrlCache] 获取签名URL失败: ${attachmentId}`, error);
    throw error;
  }
};

/**
 * 批量获取缓存的签名URL
 * @param {string[]} attachmentIds - 附件ID数组
 * @param {number} ttl - 生存时间（秒），可选
 * @returns {Promise<Object>} ID到URL的映射
 */
export const getSignedUrlsBatchCached = async (attachmentIds, ttl) => {
  const results = {};
  const uncachedIds = [];

  // 检查缓存
  for (const id of attachmentIds) {
    const cachedUrl = attachmentUrlCache.get(id);
    if (cachedUrl) {
      results[id] = cachedUrl;
    } else {
      uncachedIds.push(id);
    }
  }

  // 批量获取未缓存的URL
  if (uncachedIds.length > 0) {
    try {
      // 使用批量接口
      const response = await generateSignedUrlBatch(uncachedIds, ttl);
      const { signedUrls, errors } = response.data;
      
      // 处理成功的签名URL
      for (const [id, urlInfo] of Object.entries(signedUrls)) {
        results[id] = urlInfo.signedUrl;
        
        // 缓存结果
        const effectiveTtl = ttl || urlInfo.ttl || 3600;
        attachmentUrlCache.set(id, urlInfo.signedUrl, effectiveTtl);
      }
      
      // 处理错误
      if (errors) {
        for (const [id, errorMessage] of Object.entries(errors)) {
          console.error(`[AttachmentUrlCache] 批量获取失败: ${id}`, errorMessage);
        }
      }
    } catch (error) {
      console.error('[AttachmentUrlCache] 批量获取签名URL失败，降级为单个请求', error);
      
      // 降级为单个请求
      const promises = uncachedIds.map(async (id) => {
        try {
          const response = await generateSignedUrl(id, ttl);
          return { id, url: response.data.signedUrl, ttl: response.data.ttl };
        } catch (error) {
          console.error(`[AttachmentUrlCache] 单个获取失败: ${id}`, error);
          return { id, error };
        }
      });

      const responses = await Promise.allSettled(promises);
      
      for (const promiseResult of responses) {
        if (promiseResult.status === 'fulfilled') {
          const { id, url, ttl: responseTtl, error } = promiseResult.value;
          
          if (error) {
            // 记录错误但不抛出，让其他成功的请求继续
            continue;
          }
          
          results[id] = url;
          
          // 缓存结果
          const effectiveTtl = ttl || responseTtl || 3600;
          attachmentUrlCache.set(id, url, effectiveTtl);
        }
      }
    }
  }

  return results;
};

/**
 * 预加载附件签名URL
 * @param {string[]} attachmentIds - 附件ID数组
 * @param {number} ttl - 生存时间（秒），可选
 * @returns {Promise<void>}
 */
export const preloadSignedUrls = async (attachmentIds, ttl) => {
  try {
    await getSignedUrlsBatchCached(attachmentIds, ttl);
  } catch (error) {
    // 预加载失败不影响主流程
    console.warn('[AttachmentUrlCache] 预加载失败', error);
  }
};

/**
 * 从内容中提取附件ID
 * @param {string} content - 内容文本
 * @returns {string[]} 附件ID数组
 */
export const extractAttachmentIds = (content) => {
  if (!content || typeof content !== 'string') {
    return [];
  }

  const regex = /attach:\/\/([a-fA-F0-9]{24})/g;
  const ids = new Set();
  let match;

  while ((match = regex.exec(content)) !== null) {
    ids.add(match[1]);
  }

  return Array.from(ids);
};

/**
 * 替换内容中的attach://为签名URL
 * @param {string} content - 内容文本
 * @param {number} ttl - 生存时间（秒），可选
 * @returns {Promise<string>} 替换后的内容
 */
export const replaceWithSignedUrls = async (content, ttl) => {
  if (!content || typeof content !== 'string') {
    return content;
  }

  const ids = extractAttachmentIds(content);
  if (ids.length === 0) {
    return content;
  }

  try {
    const signedUrls = await getSignedUrlsBatchCached(ids, ttl);
    
    return content.replace(/attach:\/\/([a-fA-F0-9]{24})/g, (match, id) => {
      return signedUrls[id] || match;
    });
  } catch (error) {
    console.error('[AttachmentUrlCache] 替换签名URL失败', error);
    // 失败时返回原内容
    return content;
  }
};

/**
 * 清理缓存
 */
export const clearCache = () => {
  attachmentUrlCache.clear();
};

/**
 * 获取缓存统计信息
 * @returns {Object} 统计信息
 */
export const getCacheStats = () => {
  return attachmentUrlCache.getStats();
};

/**
 * 调试函数：打印缓存状态
 */
export const debugCacheStatus = () => {
  const stats = getCacheStats();
  console.log('[AttachmentUrlCache] 缓存状态:', stats);
  
  if (process.env.NODE_ENV === 'development') {
    const now = Date.now();
    const items = Array.from(attachmentUrlCache.cache.entries()).map(([id, item]) => ({
      id,
      expiresAt: new Date(item.expiresAt).toISOString(),
      isExpired: item.expiresAt <= now,
      timeToExpiry: Math.max(0, Math.floor((item.expiresAt - now) / 1000))
    }));
    
    console.log('[AttachmentUrlCache] 缓存项详情:', items);
  }
};

// 在开发环境下暴露全局调试接口
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  window.attachmentUrlCacheDebug = {
    getStats: getCacheStats,
    debugStatus: debugCacheStatus,
    clear: clearCache,
    cache: attachmentUrlCache
  };
}

export default attachmentUrlCache;