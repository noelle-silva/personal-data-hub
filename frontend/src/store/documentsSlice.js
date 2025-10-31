import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../services/apiClient';

// 异步thunk：获取所有文档
export const fetchDocuments = createAsyncThunk(
  'documents/fetchDocuments',
  async (_, { rejectWithValue }) => {
    try {
      // limit=0 表示不限制返回数量；sort=-createdAt 按创建时间倒序
      const response = await apiClient.get('/documents?limit=0&sort=-createdAt');
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.message || '获取文档列表失败');
    }
  }
);

// 异步thunk：根据ID获取单个文档
export const fetchDocumentById = createAsyncThunk(
  'documents/fetchDocumentById',
  async (id, { rejectWithValue }) => {
    try {
      // 添加查询参数以获取引用关系数据
      const params = new URLSearchParams({
        populate: 'full', // 获取引用文档的完整信息
        include: 'referencingQuotes', // 包含引用此文档的引用体
        quotesLimit: '20' // 限制引用体数量
      });
      
      const response = await apiClient.get(`/documents/${id}?${params.toString()}`);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.message || '获取文档详情失败');
    }
  }
);

const initialState = {
  items: [],
  status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed' - 用于文档列表
  error: null,
  selectedDocument: null,
  isModalOpen: false,
  selectedDocumentStatus: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed' - 用于单个文档
};

const documentsSlice = createSlice({
  name: 'documents',
  initialState,
  reducers: {
    openDocumentModal: (state, action) => {
      // 如果有 payload，则更新 selectedDocument
      if (action.payload) {
        state.selectedDocument = action.payload;
        // 如果传入的数据不完整（比如没有content和htmlContent），则设置加载状态
        if (!action.payload.content && !action.payload.htmlContent) {
          state.selectedDocumentStatus = 'loading';
        }
      }
      // 直接打开弹窗，无论是否有 payload
      state.isModalOpen = true;
    },
    closeDocumentModal: (state) => {
      state.selectedDocument = null;
      state.isModalOpen = false;
      state.selectedDocumentStatus = 'idle'; // 关闭时重置状态
    },
  },
  extraReducers: (builder) => {
    builder
      // 获取文档列表
      .addCase(fetchDocuments.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchDocuments.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchDocuments.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // 获取单个文档
      .addCase(fetchDocumentById.pending, (state) => {
        state.selectedDocumentStatus = 'loading';
        state.error = null;
      })
      .addCase(fetchDocumentById.fulfilled, (state, action) => {
        state.selectedDocumentStatus = 'succeeded';
        state.selectedDocument = action.payload;
      })
      .addCase(fetchDocumentById.rejected, (state, action) => {
        state.selectedDocumentStatus = 'failed';
        state.error = action.payload;
      });
  },
});

export const { openDocumentModal, closeDocumentModal } = documentsSlice.actions;

// Selectors
export const selectAllDocuments = (state) => state.documents.items;
export const selectDocumentsStatus = (state) => state.documents.status;
export const selectDocumentsError = (state) => state.documents.error;
export const selectSelectedDocument = (state) => state.documents.selectedDocument;
export const selectIsModalOpen = (state) => state.documents.isModalOpen;
export const selectSelectedDocumentStatus = (state) => state.documents.selectedDocumentStatus;

export default documentsSlice.reducer;