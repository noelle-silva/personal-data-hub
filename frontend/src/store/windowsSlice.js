import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../services/apiClient';
import { deleteAttachment, getAttachmentMetadata } from '../services/attachments';
import {
  clampWindowPositionToViewport,
  getDefaultWindowSizeForViewport,
  getViewportSnapshot,
} from '../utils/windowSizing';

// 异步thunk：获取窗口文档内容
export const fetchWindowDocument = createAsyncThunk(
  'windows/fetchWindowDocument',
  async ({ windowId, docId }, { rejectWithValue }) => {
    try {
      // 添加查询参数以获取引用关系数据
      const params = new URLSearchParams({
        populate: 'full', // 获取引用文档的完整信息
        include: 'referencingQuotes', // 包含引用此文档的收藏夹
        quotesLimit: '20' // 限制收藏夹数量
      });
      
      const response = await apiClient.get(`/documents/${docId}?${params.toString()}`);
      return {
        windowId,
        document: response.data.data
      };
    } catch (error) {
      return rejectWithValue({
        windowId,
        error: error.message
      });
    }
  }
);

// 异步thunk：获取窗口收藏夹内容
export const fetchWindowQuote = createAsyncThunk(
  'windows/fetchWindowQuote',
  async ({ windowId, quoteId }, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(`/quotes/${quoteId}`);
      return {
        windowId,
        quote: response.data.data
      };
    } catch (error) {
      return rejectWithValue({
        windowId,
        error: error.message
      });
    }
  }
);

// 异步thunk：获取窗口附件内容
export const fetchWindowAttachment = createAsyncThunk(
  'windows/fetchWindowAttachment',
  async ({ windowId, attachmentId }, { rejectWithValue }) => {
    try {
      console.debug(`[fetchWindowAttachment] 开始获取附件元数据: windowId=${windowId}, attachmentId=${attachmentId}`);
      
      // 仅获取附件元数据，不再获取文件流（文件流用于浏览器直接加载，不是JSON）
      const metadataResponse = await getAttachmentMetadata(attachmentId);
      console.debug(`[fetchWindowAttachment] 获取元数据成功:`, metadataResponse);
      
      return {
        windowId,
        attachment: metadataResponse.data // 修正：元数据在 response.data 中（统一命名为 attachment）
      };
    } catch (error) {
      // 更详细的错误信息
      const errorMessage = error.response?.data?.message || error.message || '获取附件失败';
      console.error(`[fetchWindowAttachment] 获取附件元数据失败: windowId=${windowId}, attachmentId=${attachmentId}`, error);
      
      // 如果是401错误，触发认证要求事件（apiClient拦截器已处理，这里确保一致性）
      if (error.response?.status === 401) {
        console.debug('[fetchWindowAttachment] 检测到401错误');
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.error(`[windowsSlice.fetchWindowAttachment] 失败: windowId=${windowId}, error=${errorMessage}`);
      }
      
      return rejectWithValue({
        windowId,
        error: errorMessage
      });
    }
  }
);

// 生成唯一窗口ID
const generateWindowId = () => {
  return `window-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// 异步thunk：打开窗口并获取文档内容
export const openWindowAndFetch = createAsyncThunk(
  'windows/openWindowAndFetch',
  async ({ docId, label, source, variant }, { dispatch, getState, rejectWithValue }) => {
    try {
      const existingWindow = getState().windows?.windows?.find((w) => {
        const isDoc = !w.contentType || w.contentType === 'document';
        if (!isDoc) return false;
        if (w.resourceId === docId || w.docId === docId) return true;
        return w.document && w.document._id === docId;
      });

      if (existingWindow) {
        dispatch(activateWindow(existingWindow.id));
        if (!existingWindow.document || existingWindow.status !== 'loaded') {
          const result = await dispatch(fetchWindowDocument({ windowId: existingWindow.id, docId })).unwrap();
          return { windowId: existingWindow.id, document: result.document };
        }
        return { windowId: existingWindow.id, document: existingWindow.document };
      }

      // 生成窗口ID
      const windowId = generateWindowId();
      const viewport = getViewportSnapshot();
      
      // 打开窗口
      dispatch(openWindow({
        windowId,
        docId,
        label,
        source,
        variant,
        viewport,
      }));
      
      // 获取文档内容
      const result = await dispatch(fetchWindowDocument({ windowId, docId })).unwrap();
      
      return {
        windowId,
        document: result.document
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// 异步thunk：打开收藏夹窗口并获取收藏夹内容
export const openQuoteWindowAndFetch = createAsyncThunk(
  'windows/openQuoteWindowAndFetch',
  async ({ quoteId, label, source, variant }, { dispatch, getState, rejectWithValue }) => {
    try {
      const existingWindow = getState().windows?.windows?.find((w) => {
        if (w.contentType !== 'quote') return false;
        if (w.resourceId === quoteId || w.docId === quoteId) return true;
        return w.quote && w.quote._id === quoteId;
      });

      if (existingWindow) {
        dispatch(activateWindow(existingWindow.id));
        if (!existingWindow.quote || existingWindow.status !== 'loaded') {
          const result = await dispatch(fetchWindowQuote({ windowId: existingWindow.id, quoteId })).unwrap();
          return { windowId: existingWindow.id, quote: result.quote };
        }
        return { windowId: existingWindow.id, quote: existingWindow.quote };
      }

      // 生成窗口ID
      const windowId = generateWindowId();
      const viewport = getViewportSnapshot();
      
      // 打开窗口
      dispatch(openWindow({
        windowId,
        resourceId: quoteId,
        contentType: 'quote',
        label,
        source,
        variant,
        viewport,
      }));
      
      // 获取收藏夹内容
      const result = await dispatch(fetchWindowQuote({ windowId, quoteId })).unwrap();
      
      return {
        windowId,
        quote: result.quote
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// 异步thunk：打开附件窗口并获取附件内容
export const openAttachmentWindowAndFetch = createAsyncThunk(
  'windows/openAttachmentWindowAndFetch',
  async ({ attachmentId, label, source, variant, initialData }, { dispatch, getState, rejectWithValue }) => {
    try {
      const existingWindow = getState().windows?.windows?.find((w) => {
        if (w.contentType !== 'attachment') return false;
        if (w.resourceId === attachmentId || w.docId === attachmentId) return true;
        return w.attachment && w.attachment._id === attachmentId;
      });

      if (existingWindow) {
        dispatch(activateWindow(existingWindow.id));
        if (initialData && !existingWindow.attachment) {
          dispatch(updateWindowData({ windowId: existingWindow.id, data: { attachment: initialData, title: initialData.originalName || existingWindow.title } }));
        }
        if (!existingWindow.attachment || existingWindow.status !== 'loaded') {
          const result = await dispatch(fetchWindowAttachment({ windowId: existingWindow.id, attachmentId })).unwrap();
          return { windowId: existingWindow.id, attachment: result.attachment };
        }
        return { windowId: existingWindow.id, attachment: existingWindow.attachment };
      }

      // 生成窗口ID
      const windowId = generateWindowId();
      const viewport = getViewportSnapshot();
      
      // 打开窗口
      dispatch(openWindow({
        windowId,
        resourceId: attachmentId,
        contentType: 'attachment',
        label: label || initialData?.originalName || '加载中...',
        source,
        variant,
        viewport,
      }));
      
      // 如果有初始数据，先设置它，然后再获取完整数据
      if (initialData) {
        // 设置初始数据
        dispatch({
          type: 'windows/updateWindowData',
          payload: {
            windowId,
            data: {
              attachment: initialData,
              status: 'loaded',
              title: initialData.originalName || '无标题附件'
            }
          }
        });
      }
      
      // 获取附件完整内容
      const result = await dispatch(fetchWindowAttachment({ windowId, attachmentId })).unwrap();
      
      return {
        windowId,
        attachment: result.attachment
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// 异步thunk：保存引用收藏夹
export const saveQuoteReferences = createAsyncThunk(
  'windows/saveQuoteReferences',
  async ({ quoteId, referencedQuoteIds }, { rejectWithValue }) => {
    try {
      const response = await apiClient.put(`/quotes/${quoteId}`, {
        referencedQuoteIds
      });
      return {
        quoteId,
        referencedQuoteIds,
        quote: response.data.data
      };
    } catch (error) {
      return rejectWithValue({
        quoteId,
        error: error.response?.data?.message || error.message || '保存引用收藏夹失败'
      });
    }
  }
);

// 异步thunk：保存文档引用
export const saveDocumentReferences = createAsyncThunk(
  'windows/saveDocumentReferences',
  async ({ documentId, referencedDocumentIds }, { rejectWithValue }) => {
    try {
      const response = await apiClient.put(`/documents/${documentId}`, { referencedDocumentIds }, {
        params: {
          populate: 'full',
          include: 'referencingQuotes',
          quotesLimit: 20
        }
      });
      return {
        documentId,
        referencedDocumentIds,
        document: response.data.data
      };
    } catch (error) {
      return rejectWithValue({
        documentId,
        error: error.response?.data?.message || error.message || '保存文档引用失败'
      });
    }
  }
);

// 异步thunk：保存附件引用
export const saveAttachmentReferences = createAsyncThunk(
  'windows/saveAttachmentReferences',
  async ({ documentId, referencedAttachmentIds }, { rejectWithValue }) => {
    try {
      const response = await apiClient.put(`/documents/${documentId}`, { referencedAttachmentIds }, {
        params: {
          populate: 'full',
          include: 'referencingQuotes',
          quotesLimit: 20
        }
      });
      return {
        documentId,
        referencedAttachmentIds,
        document: response.data.data
      };
    } catch (error) {
      return rejectWithValue({
        documentId,
        error: error.response?.data?.message || error.message || '保存附件引用失败'
      });
    }
  }
);

// 异步thunk：保存文档收藏夹引用
export const saveDocumentQuoteReferences = createAsyncThunk(
  'windows/saveDocumentQuoteReferences',
  async ({ documentId, referencedQuoteIds }, { rejectWithValue }) => {
    try {
      const response = await apiClient.put(`/documents/${documentId}`, {
        referencedQuoteIds
      }, {
        params: {
          populate: 'full',
          include: 'referencingQuotes',
          quotesLimit: 20
        }
      });
      return {
        documentId,
        referencedQuoteIds,
        document: response.data.data
      };
    } catch (error) {
      return rejectWithValue({
        documentId,
        error: error.response?.data?.message || error.message || '保存收藏夹引用失败'
      });
    }
  }
);

export const updateDocumentById = createAsyncThunk(
  'windows/updateDocumentById',
  async ({ documentId, documentData }, { rejectWithValue }) => {
    try {
      const response = await apiClient.put(`/documents/${documentId}`, documentData);
      return {
        documentId,
        document: response.data.data
      };
    } catch (error) {
      return rejectWithValue({
        documentId,
        error: error.response?.data?.message || error.message || '更新文档失败'
      });
    }
  }
);

export const deleteDocumentById = createAsyncThunk(
  'windows/deleteDocumentById',
  async ({ documentId }, { rejectWithValue }) => {
    try {
      await apiClient.delete(`/documents/${documentId}`);
      return { documentId };
    } catch (error) {
      return rejectWithValue({
        documentId,
        error: error.response?.data?.message || error.message || '删除文档失败'
      });
    }
  }
);

export const updateQuoteById = createAsyncThunk(
  'windows/updateQuoteById',
  async ({ quoteId, quoteData }, { rejectWithValue }) => {
    try {
      const response = await apiClient.put(`/quotes/${quoteId}`, quoteData);
      return {
        quoteId,
        quote: response.data.data
      };
    } catch (error) {
      return rejectWithValue({
        quoteId,
        error: error.response?.data?.message || error.message || '更新收藏夹失败'
      });
    }
  }
);

export const deleteQuoteById = createAsyncThunk(
  'windows/deleteQuoteById',
  async ({ quoteId }, { rejectWithValue }) => {
    try {
      await apiClient.delete(`/quotes/${quoteId}`);
      return { quoteId };
    } catch (error) {
      return rejectWithValue({
        quoteId,
        error: error.response?.data?.message || error.message || '删除收藏夹失败'
      });
    }
  }
);

export const saveQuoteDocumentReferences = createAsyncThunk(
  'windows/saveQuoteDocumentReferences',
  async ({ quoteId, referencedDocumentIds }, { rejectWithValue }) => {
    try {
      const response = await apiClient.put(`/quotes/${quoteId}`, { referencedDocumentIds });
      return {
        quoteId,
        referencedDocumentIds,
        quote: response.data.data
      };
    } catch (error) {
      return rejectWithValue({
        quoteId,
        error: error.response?.data?.message || error.message || '保存收藏夹引用失败'
      });
    }
  }
);

export const saveQuoteAttachmentReferences = createAsyncThunk(
  'windows/saveQuoteAttachmentReferences',
  async ({ quoteId, referencedAttachmentIds }, { rejectWithValue }) => {
    try {
      const response = await apiClient.put(`/quotes/${quoteId}`, { referencedAttachmentIds });
      return {
        quoteId,
        referencedAttachmentIds,
        quote: response.data.data
      };
    } catch (error) {
      return rejectWithValue({
        quoteId,
        error: error.response?.data?.message || error.message || '保存收藏夹附件引用失败'
      });
    }
  }
);

export const deleteAttachmentById = createAsyncThunk(
  'windows/deleteAttachmentById',
  async ({ attachmentId }, { rejectWithValue }) => {
    try {
      await deleteAttachment(attachmentId);
      return { attachmentId };
    } catch (error) {
      return rejectWithValue({
        attachmentId,
        error: error.response?.data?.message || error.message || '删除附件失败'
      });
    }
  }
);

// 获取下一个 zIndex 值
const getNextZIndex = (windows) => {
  if (windows.length === 0) return 1400; // 基础 zIndex
  const maxZIndex = Math.max(...windows.map(w => w.zIndex || 1400));
  return maxZIndex + 10;
};

// 获取级联位置
const getCascadedPosition = (windows) => {
  const basePosition = { x: 100, y: 100 };
  const offset = { x: 30, y: 30 };
  
  if (windows.length === 0) return basePosition;
  
  // 找到最高 zIndex 的窗口位置
  const topWindow = windows.reduce((prev, current) =>
    (prev.zIndex > current.zIndex) ? prev : current
  );
  
  // 添加偏移量，避免窗口重叠
  return {
    x: (topWindow.position?.x || basePosition.x) + offset.x,
    y: (topWindow.position?.y || basePosition.y) + offset.y
  };
};

const getWindowContentData = (window, contentType) => {
  switch (contentType) {
    case 'quote':
      return window.quote;
    case 'attachment':
      return window.attachment;
    case 'document':
    default:
      return window.document;
  }
};

const isWindowForResource = (window, contentType, resourceId) => {
  if (window.contentType === contentType &&
      (window.resourceId === resourceId || window.docId === resourceId)) {
    return true;
  }

  const data = getWindowContentData(window, contentType);
  return data && data._id === resourceId;
};

const updateWindowsForResource = (state, contentType, resourceId, data) => {
  state.windows.forEach((window) => {
    if (!isWindowForResource(window, contentType, resourceId)) return;

    window.status = 'loaded';
    window.error = null;

    if (contentType === 'document') {
      window.document = data;
      window.title = data?.title || window.title || '无标题文档';
    } else if (contentType === 'quote') {
      window.quote = data;
      window.title = data?.title || window.title || '无标题收藏夹';
    } else if (contentType === 'attachment') {
      window.attachment = data;
      window.title = window.title || data?.originalName || '无标题附件';
    }
  });
};

const closeWindowsForResource = (state, contentType, resourceId) => {
  const remaining = state.windows.filter((w) => !isWindowForResource(w, contentType, resourceId));
  const closedActive = state.activeWindowId &&
    state.windows.some((w) => w.id === state.activeWindowId && isWindowForResource(w, contentType, resourceId));

  state.windows = remaining;

  if (closedActive) {
    if (state.windows.length > 0) {
      const topWindow = state.windows.reduce((prev, current) =>
        (prev.zIndex > current.zIndex) ? prev : current
      );
      state.activeWindowId = topWindow.id;
    } else {
      state.activeWindowId = null;
    }
  }
};

const initialState = {
  windows: [],
  activeWindowId: null,
  maxZIndex: 1400,
  isLimitPromptOpen: false,
  saving: false
};

const windowsSlice = createSlice({
  name: 'windows',
  initialState,
  reducers: {
    openWindow: (state, action) => {
      const {
        docId,
        resourceId,
        contentType = 'document',
        label,
        source,
        variant,
        windowId: providedWindowId,
        size: providedSize,
        viewport,
      } = action.payload;
      
      // 检查窗口数量限制
      if (state.windows.length >= 20) {
        state.isLimitPromptOpen = true;
        return;
      }
      
      const windowId = providedWindowId || generateWindowId();
      const zIndex = getNextZIndex(state.windows);
      const defaultSize = providedSize || getDefaultWindowSizeForViewport(contentType, viewport);
      const cascadedPosition = getCascadedPosition(state.windows);
      const position = viewport
        ? clampWindowPositionToViewport({ position: cascadedPosition, size: defaultSize, viewport })
        : cascadedPosition;
      
      // 创建新窗口
      const newWindow = {
        id: windowId,
        docId: docId || resourceId, // 兼容性保留 docId
        resourceId: resourceId || docId,
        contentType,
        title: label || '加载中...',
        document: null, // 保持向后兼容
        quote: null,
        attachment: null,
        status: 'loading', // 'loading' | 'loaded' | 'error'
        error: null,
        position,
        size: defaultSize,
        zIndex,
        minimized: false,
        createdAt: new Date().toISOString(),
        source: source || 'unknown',
        variant: variant || 'primary'
      };
      
      state.windows.push(newWindow);
      state.activeWindowId = windowId;
      state.maxZIndex = zIndex;
    },
    
    closeWindow: (state, action) => {
      const windowId = action.payload;
      state.windows = state.windows.filter(w => w.id !== windowId);
      
      // 如果关闭的是活动窗口，则激活另一个窗口
      if (state.activeWindowId === windowId) {
        if (state.windows.length > 0) {
          // 激活 zIndex 最高的窗口
          const topWindow = state.windows.reduce((prev, current) => 
            (prev.zIndex > current.zIndex) ? prev : current
          );
          state.activeWindowId = topWindow.id;
        } else {
          state.activeWindowId = null;
        }
      }
    },
    
    activateWindow: (state, action) => {
      const windowId = action.payload;
      const window = state.windows.find(w => w.id === windowId);
      
      if (window) {
        state.activeWindowId = windowId;
        
        // 如果窗口被最小化，则恢复
        if (window.minimized) {
          window.minimized = false;
        }
        
        // 更新 zIndex
        state.maxZIndex += 10;
        window.zIndex = state.maxZIndex;
      }
    },
    
    minimizeWindow: (state, action) => {
      const windowId = action.payload;
      const window = state.windows.find(w => w.id === windowId);
      
      if (window) {
        window.minimized = true;
        
        // 如果最小化的是活动窗口，则激活另一个窗口
        if (state.activeWindowId === windowId) {
          const nonMinimizedWindows = state.windows.filter(w => !w.minimized);
          if (nonMinimizedWindows.length > 0) {
            const topWindow = nonMinimizedWindows.reduce((prev, current) => 
              (prev.zIndex > current.zIndex) ? prev : current
            );
            state.activeWindowId = topWindow.id;
          } else {
            state.activeWindowId = null;
          }
        }
      }
    },
    
    restoreWindow: (state, action) => {
      const windowId = action.payload;
      const window = state.windows.find(w => w.id === windowId);
      
      if (window) {
        window.minimized = false;
        state.activeWindowId = windowId;
        
        // 更新 zIndex
        state.maxZIndex += 10;
        window.zIndex = state.maxZIndex;
      }
    },
    
    setWindowPosition: (state, action) => {
      const { windowId, position } = action.payload;
      const window = state.windows.find(w => w.id === windowId);
      
      if (window) {
        window.position = position;
      }
    },
    
    setWindowSize: (state, action) => {
      const { windowId, size } = action.payload;
      const window = state.windows.find(w => w.id === windowId);
      
      if (window) {
        window.size = size;
      }
    },
    
    closeLimitPrompt: (state) => {
      state.isLimitPromptOpen = false;
    },
    
    updateWindowData: (state, action) => {
      const { windowId, data } = action.payload;
      const window = state.windows.find(w => w.id === windowId);
      if (window) {
        Object.assign(window, data);
      }
    }
  },
  extraReducers: (builder) => {
    builder
      // 获取窗口文档内容
      .addCase(fetchWindowDocument.pending, (state, action) => {
        const { windowId } = action.meta.arg;
        const window = state.windows.find(w => w.id === windowId);
        
        if (window) {
          window.status = 'loading';
          window.error = null;
        }
      })
      .addCase(fetchWindowDocument.fulfilled, (state, action) => {
        const { windowId, document } = action.payload;
        const window = state.windows.find(w => w.id === windowId);
        
        if (window) {
          window.status = 'loaded';
          window.document = document;
          window.title = document.title || '无标题文档';
        }
      })
      .addCase(fetchWindowDocument.rejected, (state, action) => {
        const { windowId, error } = action.payload;
        const window = state.windows.find(w => w.id === windowId);
        
        if (window) {
          window.status = 'error';
          window.error = error;
          window.title = '加载失败';
        }
      })
      // 获取窗口收藏夹内容
      .addCase(fetchWindowQuote.pending, (state, action) => {
        const { windowId } = action.meta.arg;
        const window = state.windows.find(w => w.id === windowId);
        
        if (window) {
          window.status = 'loading';
          window.error = null;
        }
      })
      .addCase(fetchWindowQuote.fulfilled, (state, action) => {
        const { windowId, quote } = action.payload;
        const window = state.windows.find(w => w.id === windowId);
        
        if (window) {
          window.status = 'loaded';
          window.quote = quote;
          window.title = quote.title || '无标题收藏夹';
        }
      })
      .addCase(fetchWindowQuote.rejected, (state, action) => {
        const { windowId, error } = action.payload;
        const window = state.windows.find(w => w.id === windowId);
        
        if (window) {
          window.status = 'error';
          window.error = error;
          window.title = '加载失败';
        }
      })
      // 获取窗口附件内容
      .addCase(fetchWindowAttachment.pending, (state, action) => {
        const { windowId } = action.meta.arg;
        const window = state.windows.find(w => w.id === windowId);
        
        if (window) {
          window.status = 'loading';
          window.error = null;
        }
      })
      .addCase(fetchWindowAttachment.fulfilled, (state, action) => {
        const { windowId, attachment } = action.payload;
        const window = state.windows.find(w => w.id === windowId);
        
        if (window) {
          window.status = 'loaded';
          // 合并策略：保留现有的 attachment 数据（来自 initialData），增量合并元数据
          const currentAttachment = window.attachment || {};
          window.attachment = { ...currentAttachment, ...attachment };
          // 标题优先使用已有标题，其次使用元数据中的原始名称
          window.title = window.title || attachment.originalName || '无标题附件';
          
          if (process.env.NODE_ENV === 'development') {
            console.debug(`[windowsSlice.fetchWindowAttachment] 成功: windowId=${windowId}, title=${window.title}`);
          }
        }
      })
      .addCase(fetchWindowAttachment.rejected, (state, action) => {
        const { windowId, error } = action.payload;
        const window = state.windows.find(w => w.id === windowId);
        
        if (window) {
          window.status = 'error';
          window.error = error;
          window.title = '加载失败';
        }
      })
      // 更新文档
      .addCase(updateDocumentById.pending, (state) => {
        state.saving = true;
      })
      .addCase(updateDocumentById.fulfilled, (state, action) => {
        state.saving = false;
        const { documentId, document } = action.payload;
        updateWindowsForResource(state, 'document', documentId, document);
      })
      .addCase(updateDocumentById.rejected, (state, action) => {
        state.saving = false;
        console.error('更新文档失败:', action.payload?.error || action.error?.message);
      })
      // 删除文档
      .addCase(deleteDocumentById.pending, (state) => {
        state.saving = true;
      })
      .addCase(deleteDocumentById.fulfilled, (state, action) => {
        state.saving = false;
        const { documentId } = action.payload;
        closeWindowsForResource(state, 'document', documentId);
      })
      .addCase(deleteDocumentById.rejected, (state, action) => {
        state.saving = false;
        console.error('删除文档失败:', action.payload?.error || action.error?.message);
      })
      // 更新收藏夹
      .addCase(updateQuoteById.pending, (state) => {
        state.saving = true;
      })
      .addCase(updateQuoteById.fulfilled, (state, action) => {
        state.saving = false;
        const { quoteId, quote } = action.payload;
        updateWindowsForResource(state, 'quote', quoteId, quote);
      })
      .addCase(updateQuoteById.rejected, (state, action) => {
        state.saving = false;
        console.error('更新收藏夹失败:', action.payload?.error || action.error?.message);
      })
      // 删除收藏夹
      .addCase(deleteQuoteById.pending, (state) => {
        state.saving = true;
      })
      .addCase(deleteQuoteById.fulfilled, (state, action) => {
        state.saving = false;
        const { quoteId } = action.payload;
        closeWindowsForResource(state, 'quote', quoteId);
      })
      .addCase(deleteQuoteById.rejected, (state, action) => {
        state.saving = false;
        console.error('删除收藏夹失败:', action.payload?.error || action.error?.message);
      })
      // 删除附件
      .addCase(deleteAttachmentById.pending, (state) => {
        state.saving = true;
      })
      .addCase(deleteAttachmentById.fulfilled, (state, action) => {
        state.saving = false;
        const { attachmentId } = action.payload;
        closeWindowsForResource(state, 'attachment', attachmentId);
      })
      .addCase(deleteAttachmentById.rejected, (state, action) => {
        state.saving = false;
        console.error('删除附件失败:', action.payload?.error || action.error?.message);
      })
      // 处理保存文档引用
      .addCase(saveDocumentReferences.pending, (state) => {
        state.saving = true;
      })
      .addCase(saveDocumentReferences.fulfilled, (state, action) => {
        state.saving = false;
        const { documentId, document } = action.payload;
        
        updateWindowsForResource(state, 'document', documentId, document);
      })
      .addCase(saveDocumentReferences.rejected, (state, action) => {
        state.saving = false;
        console.error('保存文档引用失败:', action.payload.error);
      })
      // 处理保存附件引用
      .addCase(saveAttachmentReferences.pending, (state) => {
        state.saving = true;
      })
      .addCase(saveAttachmentReferences.fulfilled, (state, action) => {
        state.saving = false;
        const { documentId, document } = action.payload;
        
        updateWindowsForResource(state, 'document', documentId, document);
      })
      .addCase(saveAttachmentReferences.rejected, (state, action) => {
        state.saving = false;
        console.error('保存附件引用失败:', action.payload.error);
      })
      // 处理保存文档收藏夹引用
      .addCase(saveDocumentQuoteReferences.pending, (state) => {
        state.saving = true;
      })
      .addCase(saveDocumentQuoteReferences.fulfilled, (state, action) => {
        state.saving = false;
        const { documentId, document } = action.payload;
        updateWindowsForResource(state, 'document', documentId, document);
      })
      .addCase(saveDocumentQuoteReferences.rejected, (state, action) => {
        state.saving = false;
        console.error('保存收藏夹引用失败:', action.payload.error);
      })
      // 处理保存引用收藏夹
      .addCase(saveQuoteReferences.pending, (state) => {
        state.saving = true;
      })
      .addCase(saveQuoteReferences.fulfilled, (state, action) => {
        state.saving = false;
        const { quoteId, quote } = action.payload;
        
        updateWindowsForResource(state, 'quote', quoteId, quote);
      })
      .addCase(saveQuoteReferences.rejected, (state, action) => {
        state.saving = false;
        console.error('保存引用收藏夹失败:', action.payload.error);
      })
      // 处理保存收藏夹引用（引用文档）
      .addCase(saveQuoteDocumentReferences.pending, (state) => {
        state.saving = true;
      })
      .addCase(saveQuoteDocumentReferences.fulfilled, (state, action) => {
        state.saving = false;
        const { quoteId, quote } = action.payload;
        updateWindowsForResource(state, 'quote', quoteId, quote);
      })
      .addCase(saveQuoteDocumentReferences.rejected, (state, action) => {
        state.saving = false;
        console.error('保存收藏夹引用失败:', action.payload.error);
      })
      // 处理保存收藏夹附件引用
      .addCase(saveQuoteAttachmentReferences.pending, (state) => {
        state.saving = true;
      })
      .addCase(saveQuoteAttachmentReferences.fulfilled, (state, action) => {
        state.saving = false;
        const { quoteId, quote } = action.payload;
        updateWindowsForResource(state, 'quote', quoteId, quote);
      })
      .addCase(saveQuoteAttachmentReferences.rejected, (state, action) => {
        state.saving = false;
        console.error('保存收藏夹附件引用失败:', action.payload.error);
      });
  },
});

export const {
  openWindow,
  closeWindow,
  activateWindow,
  minimizeWindow,
  restoreWindow,
  setWindowPosition,
  setWindowSize,
  closeLimitPrompt,
  updateWindowData
} = windowsSlice.actions;

// Selectors
export const selectAllWindows = (state) => state.windows.windows;
export const selectActiveWindowId = (state) => state.windows.activeWindowId;
export const selectActiveWindow = (state) => {
  const activeId = state.windows.activeWindowId;
  return activeId ? state.windows.windows.find(w => w.id === activeId) : null;
};
export const selectWindowById = (state, windowId) => 
  state.windows.windows.find(w => w.id === windowId);
export const selectIsLimitPromptOpen = (state) => state.windows.isLimitPromptOpen;
export const selectNonMinimizedWindows = (state) =>
  state.windows.windows.filter(w => !w.minimized);
export const selectMinimizedWindows = (state) =>
  state.windows.windows.filter(w => w.minimized);

export default windowsSlice.reducer;
