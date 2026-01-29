/**
 * 附件 Redux Slice
 * 管理附件相关的状态和操作
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  getAttachments,
  uploadImage,
  uploadVideo,
  uploadDocument,
  uploadScript,
  deleteAttachment,
  generateSignedUrl,
  getAttachmentMetadata,
  getAttachmentConfig,
  updateAttachmentMetadata
} from '../services/attachments';
import { getAttachmentProxyUrl } from '../services/serverConfig';

// 异步 thunk：获取附件列表
export const fetchAttachments = createAsyncThunk(
  'attachments/fetchAttachments',
  async ({ page = 1, limit = 20, sort = '-createdAt', category = 'image', append = false } = {}) => {
    const response = await getAttachments({ page, limit, sort, category });
    return { ...response, append };
  }
);

// 异步 thunk：上传图片
export const uploadAttachmentImage = createAsyncThunk(
  'attachments/uploadAttachmentImage',
  async ({ file, onUploadProgress }) => {
    const response = await uploadImage(file, onUploadProgress);
    return response;
  }
);

// 异步 thunk：上传视频
export const uploadAttachmentVideo = createAsyncThunk(
  'attachments/uploadAttachmentVideo',
  async ({ file, onUploadProgress }) => {
    const response = await uploadVideo(file, onUploadProgress);
    return response;
  }
);

// 异步 thunk：上传文档
export const uploadAttachmentDocument = createAsyncThunk(
  'attachments/uploadAttachmentDocument',
  async ({ file, onUploadProgress }) => {
    const response = await uploadDocument(file, onUploadProgress);
    return response;
  }
);

// 异步 thunk：上传程序与脚本
export const uploadAttachmentScript = createAsyncThunk(
  'attachments/uploadAttachmentScript',
  async ({ file, onUploadProgress }) => {
    const response = await uploadScript(file, onUploadProgress);
    return response;
  }
);

// 异步 thunk：删除附件
export const deleteAttachmentById = createAsyncThunk(
  'attachments/deleteAttachmentById',
  async (id) => {
    const response = await deleteAttachment(id);
    return { id, ...response };
  }
);

// 异步 thunk：获取签名URL（带缓存）
export const getSignedUrl = createAsyncThunk(
  'attachments/getSignedUrl',
  async ({ id, ttl = 3600 }, { getState, rejectWithValue }) => {
    // 桌面端网关模式：直接用本地代理URL，不走签名接口
    const proxyUrl = getAttachmentProxyUrl(id);
    if (proxyUrl && proxyUrl.startsWith('http://127.0.0.1:')) {
      const expAt = Date.now() + (ttl * 1000);
      return { id, url: proxyUrl, expAt, fromCache: false };
    }

    const state = getState().attachments;
    const cached = state.signedUrlCache[id];
    
    // 检查缓存是否有效（提前10秒过期）
    if (cached && cached.expAt > Date.now() + 10000) {
      return { id, url: cached.url, fromCache: true };
    }
    
    // 移除"请求已在进行中"的早期拒绝，让组件层控制并发
    // 这样可以避免不必要的错误日志和界面卡在加载状态
    
    try {
      const response = await generateSignedUrl(id, ttl);
      // 使用后端返回的TTL计算过期时间，避免前后端TTL不一致导致的问题
      const serverTtl = response.data?.ttl || ttl || 3600;
      const expAt = Date.now() + (serverTtl * 1000);
      return { id, url: response.data.signedUrl, expAt, fromCache: false };
    } catch (error) {
      return rejectWithValue({ id, message: error.message, fromCache: false });
    }
  }
);

// 异步 thunk：获取附件元数据
export const fetchAttachmentMetadata = createAsyncThunk(
  'attachments/fetchAttachmentMetadata',
  async (id) => {
    const response = await getAttachmentMetadata(id);
    return { id, metadata: response.data };
  }
);

// 异步 thunk：获取附件配置
export const fetchAttachmentConfig = createAsyncThunk(
  'attachments/fetchAttachmentConfig',
  async () => {
    const response = await getAttachmentConfig();
    return response;
  }
);

// 异步 thunk：更新附件元数据
export const updateAttachmentMetadataById = createAsyncThunk(
  'attachments/updateAttachmentMetadataById',
  async ({ id, metadata }, { rejectWithValue }) => {
    try {
      const response = await updateAttachmentMetadata(id, metadata);
      return { id, metadata: response.data };
    } catch (error) {
      return rejectWithValue({ id, message: error.message });
    }
  }
);

// 初始状态
const initialState = {
  // 附件数据
  itemsById: {}, // 以ID为键的附件对象
  items: [], // 附件ID数组（按顺序）
  
  // 分页信息
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
    hasNext: false,
    hasPrev: false
  },
  
  // 状态
  status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
  
  // 签名URL缓存
  signedUrlCache: {}, // { id: { url, expAt } }
  
  // 正在进行的签名URL请求
  inflightSignedRequests: {}, // { id: true }
  
  // 选中的附件
  selectedAttachmentId: null,
  
  // 模态框状态
  isModalOpen: false,
  
  // 上传状态
  uploadStatus: 'idle', // 'idle' | 'uploading' | 'succeeded' | 'failed'
  uploadProgress: 0,
  uploadError: null,
  
  // 删除状态
  deleteStatus: 'idle', // 'idle' | 'deleting' | 'succeeded' | 'failed'
  deleteError: null,
  
  // 更新状态
  updateStatus: 'idle', // 'idle' | 'updating' | 'succeeded' | 'failed'
  updateError: null,
  
  // 更新状态
  updateStatus: 'idle', // 'idle' | 'updating' | 'succeeded' | 'failed'
  updateError: null,
  
  // 性能统计（开发环境）
  stats: {
    cacheHits: 0,
    cacheMisses: 0,
    signedUrlRequests: 0,
    concurrentRequests: 0
  },
  
  // 附件配置（由后端动态获取，此处仅作初始化）
  config: {
    image: {
      allowedTypes: [],
      maxSize: 0,
      acceptString: ''
    },
    video: {
      allowedTypes: [],
      maxSize: 0,
      acceptString: ''
    },
    document: {
      allowedTypes: [],
      maxSize: 0,
      acceptString: ''
    },
    script: {
      allowedTypes: [],
      maxSize: 0,
      acceptString: ''
    }
  },
  configStatus: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  configError: null
};

// 创建 slice
const attachmentsSlice = createSlice({
  name: 'attachments',
  initialState,
  reducers: {
    // 设置附件数据
    setAttachmentData: (state, action) => {
      const { id, data } = action.payload;
      if (!state.itemsById[id]) {
        state.itemsById[id] = {};
      }
      state.itemsById[id] = { ...state.itemsById[id], ...data };
      
      // 如果ID不在列表中，添加到列表
      if (!state.items.includes(id)) {
        state.items.push(id);
      }
    },
    
    // 设置选中的附件
    setSelectedAttachment: (state, action) => {
      state.selectedAttachmentId = action.payload;
    },
    
    // 打开/关闭模态框
    setModalOpen: (state, action) => {
      state.isModalOpen = action.payload;
    },
    
    // 重置上传状态
    resetUploadStatus: (state) => {
      state.uploadStatus = 'idle';
      state.uploadProgress = 0;
      state.uploadError = null;
    },
    
    // 更新上传进度
    setUploadProgress: (state, action) => {
      state.uploadProgress = action.payload;
    },
    
    // 重置删除状态
    resetDeleteStatus: (state) => {
      state.deleteStatus = 'idle';
      state.deleteError = null;
    },
    
    // 重置更新状态
    resetUpdateStatus: (state) => {
      state.updateStatus = 'idle';
      state.updateError = null;
    },
    
    // 清除错误
    clearError: (state) => {
      state.error = null;
      state.uploadError = null;
      state.deleteError = null;
      state.updateError = null;
    },
    
    // 清除签名URL缓存
    clearSignedUrlCache: (state) => {
      state.signedUrlCache = {};
    },
    
    // 设置签名URL缓存（手动设置）
    setSignedUrlCache: (state, action) => {
      const { id, url, expAt } = action.payload;
      state.signedUrlCache[id] = { url, expAt };
    },
    
    // 重置状态
    resetAttachmentsState: (state) => {
      return { ...initialState };
    }
  },
  extraReducers: (builder) => {
    // 获取附件列表
    builder
      .addCase(fetchAttachments.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchAttachments.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const { data, pagination, append } = action.payload;
        
        if (append) {
          // 追加模式：保留现有数据，添加新数据
          data.forEach(item => {
            state.itemsById[item._id] = item;
            if (!state.items.includes(item._id)) {
              state.items.push(item._id);
            }
          });
        } else {
          // 替换模式：完全替换数据
          state.itemsById = {};
          state.items = [];
          data.forEach(item => {
            state.itemsById[item._id] = item;
            state.items.push(item._id);
          });
        }
        
        state.pagination = pagination;
      })
      .addCase(fetchAttachments.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      });
    
    // 上传图片
    builder
      .addCase(uploadAttachmentImage.pending, (state) => {
        state.uploadStatus = 'uploading';
        state.uploadProgress = 0;
        state.uploadError = null;
      })
      .addCase(uploadAttachmentImage.fulfilled, (state, action) => {
        state.uploadStatus = 'succeeded';
        const attachment = action.payload.data;
        
        // 添加到列表开头
        state.itemsById[attachment._id] = attachment;
        state.items.unshift(attachment._id);
        
        // 更新分页信息
        state.pagination.total += 1;
      })
      .addCase(uploadAttachmentImage.rejected, (state, action) => {
        state.uploadStatus = 'failed';
        state.uploadError = action.error.message;
      });
    
    // 上传视频
    builder
      .addCase(uploadAttachmentVideo.pending, (state) => {
        state.uploadStatus = 'uploading';
        state.uploadProgress = 0;
        state.uploadError = null;
      })
      .addCase(uploadAttachmentVideo.fulfilled, (state, action) => {
        state.uploadStatus = 'succeeded';
        const attachment = action.payload.data;
        
        // 添加到列表开头
        state.itemsById[attachment._id] = attachment;
        state.items.unshift(attachment._id);
        
        // 更新分页信息
        state.pagination.total += 1;
      })
      .addCase(uploadAttachmentVideo.rejected, (state, action) => {
        state.uploadStatus = 'failed';
        state.uploadError = action.error.message;
      });
    
    // 上传文档
    builder
      .addCase(uploadAttachmentDocument.pending, (state) => {
        state.uploadStatus = 'uploading';
        state.uploadProgress = 0;
        state.uploadError = null;
      })
      .addCase(uploadAttachmentDocument.fulfilled, (state, action) => {
        state.uploadStatus = 'succeeded';
        const attachment = action.payload.data;
        
        // 添加到列表开头
        state.itemsById[attachment._id] = attachment;
        state.items.unshift(attachment._id);
        
        // 更新分页信息
        state.pagination.total += 1;
      })
      .addCase(uploadAttachmentDocument.rejected, (state, action) => {
        state.uploadStatus = 'failed';
        state.uploadError = action.error.message;
      });
    
    // 上传程序与脚本
    builder
      .addCase(uploadAttachmentScript.pending, (state) => {
        state.uploadStatus = 'uploading';
        state.uploadProgress = 0;
        state.uploadError = null;
      })
      .addCase(uploadAttachmentScript.fulfilled, (state, action) => {
        state.uploadStatus = 'succeeded';
        const attachment = action.payload.data;
        
        // 添加到列表开头
        state.itemsById[attachment._id] = attachment;
        state.items.unshift(attachment._id);
        
        // 更新分页信息
        state.pagination.total += 1;
      })
      .addCase(uploadAttachmentScript.rejected, (state, action) => {
        state.uploadStatus = 'failed';
        state.uploadError = action.error.message;
      });
    
    // 删除附件
    builder
      .addCase(deleteAttachmentById.pending, (state, action) => {
        state.deleteStatus = 'deleting';
        state.deleteError = null;
      })
      .addCase(deleteAttachmentById.fulfilled, (state, action) => {
        state.deleteStatus = 'succeeded';
        const { id } = action.payload;
        
        // 从列表中移除
        if (state.items.includes(id)) {
          state.items = state.items.filter(itemId => itemId !== id);
        }
        
        // 从详情中移除
        if (state.itemsById[id]) {
          delete state.itemsById[id];
        }
        
        // 清除签名URL缓存
        if (state.signedUrlCache[id]) {
          delete state.signedUrlCache[id];
        }
        
        // 更新分页信息
        if (state.pagination.total > 0) {
          state.pagination.total -= 1;
        }
        
        // 如果删除的是当前选中的附件，清除选择
        if (state.selectedAttachmentId === id) {
          state.selectedAttachmentId = null;
        }
      })
      .addCase(deleteAttachmentById.rejected, (state, action) => {
        state.deleteStatus = 'failed';
        state.deleteError = action.error.message;
      });
    
    // 获取签名URL
    builder
      .addCase(getSignedUrl.pending, (state, action) => {
        const { id } = action.meta.arg;
        state.inflightSignedRequests[id] = true;
        
        // 更新性能统计
        state.stats.concurrentRequests += 1;
        state.stats.signedUrlRequests += 1;
      })
      .addCase(getSignedUrl.fulfilled, (state, action) => {
        const { id, url, expAt, fromCache } = action.payload;
        
        // 清除进行中的请求标记
        delete state.inflightSignedRequests[id];
        
        // 更新并发请求数
        if (state.stats.concurrentRequests > 0) {
          state.stats.concurrentRequests -= 1;
        }
        
        // 更新缓存统计
        if (fromCache) {
          state.stats.cacheHits += 1;
        } else {
          state.stats.cacheMisses += 1;
          // 更新缓存
          state.signedUrlCache[id] = { url, expAt };
        }
      })
      .addCase(getSignedUrl.rejected, (state, action) => {
        const { id } = action.meta.arg;
        
        // 清除进行中的请求标记
        delete state.inflightSignedRequests[id];
        
        // 更新并发请求数
        if (state.stats.concurrentRequests > 0) {
          state.stats.concurrentRequests -= 1;
        }
        
        // 如果是重复请求，不记录为错误
        if (action.payload?.message !== '请求已在进行中') {
          console.error(`获取签名URL失败: ${id}`, action.error.message);
        }
      });
    
    // 获取附件元数据
    builder
      .addCase(fetchAttachmentMetadata.fulfilled, (state, action) => {
        const { id, metadata } = action.payload;
        if (state.itemsById[id]) {
          state.itemsById[id] = { ...state.itemsById[id], ...metadata };
        }
      });
    
    // 获取附件配置
    builder
      .addCase(fetchAttachmentConfig.pending, (state) => {
        state.configStatus = 'loading';
        state.configError = null;
      })
      .addCase(fetchAttachmentConfig.fulfilled, (state, action) => {
        state.configStatus = 'succeeded';
        state.config = action.payload.data;
      })
      .addCase(fetchAttachmentConfig.rejected, (state, action) => {
        state.configStatus = 'failed';
        state.configError = action.error.message;
      });
    
    // 更新附件元数据
    builder
      .addCase(updateAttachmentMetadataById.pending, (state) => {
        state.updateStatus = 'updating';
        state.updateError = null;
      })
      .addCase(updateAttachmentMetadataById.fulfilled, (state, action) => {
        state.updateStatus = 'succeeded';
        const { id, metadata } = action.payload;
        
        // 更新附件数据
        if (state.itemsById[id]) {
          state.itemsById[id] = { ...state.itemsById[id], ...metadata };
        }
        
        // 清除签名URL缓存，强制重新获取以反映新的文件名
        if (state.signedUrlCache[id]) {
          delete state.signedUrlCache[id];
        }
      })
      .addCase(updateAttachmentMetadataById.rejected, (state, action) => {
        state.updateStatus = 'failed';
        state.updateError = action.payload?.message || action.error.message;
      });
  }
});

// 导出 actions
export const {
  setAttachmentData,
  setSelectedAttachment,
  setModalOpen,
  resetUploadStatus,
  setUploadProgress,
  resetDeleteStatus,
  resetUpdateStatus,
  clearError,
  clearSignedUrlCache,
  setSignedUrlCache,
  resetAttachmentsState
} = attachmentsSlice.actions;

// 选择器
export const selectAttachments = (state) => state.attachments.items.map(id => state.attachments.itemsById[id]);
export const selectAttachmentById = (id) => (state) => state.attachments.itemsById[id];
export const selectAttachmentsStatus = (state) => state.attachments.status;
export const selectAttachmentsError = (state) => state.attachments.error;
export const selectAttachmentsPagination = (state) => state.attachments.pagination;
export const selectSelectedAttachment = (state) => {
  const { selectedAttachmentId, itemsById } = state.attachments;
  return selectedAttachmentId ? itemsById[selectedAttachmentId] : null;
};
export const selectModalOpen = (state) => state.attachments.isModalOpen;
export const selectUploadStatus = (state) => state.attachments.uploadStatus;
export const selectUploadProgress = (state) => state.attachments.uploadProgress;
export const selectUploadError = (state) => state.attachments.uploadError;
export const selectDeleteStatus = (state) => state.attachments.deleteStatus;
export const selectDeleteError = (state) => state.attachments.deleteError;
export const selectUpdateStatus = (state) => state.attachments.updateStatus;
export const selectUpdateError = (state) => state.attachments.updateError;
export const selectSignedUrlCache = (state) => state.attachments.signedUrlCache;
export const selectInflightSignedRequests = (state) => state.attachments.inflightSignedRequests;
export const selectAttachmentsStats = (state) => state.attachments.stats;
export const selectAttachmentConfig = (state) => state.attachments.config;
export const selectAttachmentConfigStatus = (state) => state.attachments.configStatus;
export const selectAttachmentConfigError = (state) => state.attachments.configError;

// 导出 reducer
export default attachmentsSlice.reducer;
