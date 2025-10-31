import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../services/apiClient';

// 异步thunk：获取所有引用体
export const fetchQuotes = createAsyncThunk(
  'quotes/fetchQuotes',
  async (_, { rejectWithValue }) => {
    try {
      // limit=0 表示不限制返回数量；sort=-createdAt 按创建时间倒序
      const response = await apiClient.get('/quotes?limit=0&sort=-createdAt');
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.message || '获取引用体列表失败');
    }
  }
);

// 异步thunk：根据ID获取单个引用体
export const fetchQuoteById = createAsyncThunk(
  'quotes/fetchQuoteById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(`/quotes/${id}`);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.message || '获取引用体详情失败');
    }
  }
);

// 异步thunk：创建引用体
export const createQuote = createAsyncThunk(
  'quotes/createQuote',
  async (quoteData, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/quotes', quoteData);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || '创建引用体失败');
    }
  }
);

// 异步thunk：更新引用体
export const updateQuote = createAsyncThunk(
  'quotes/updateQuote',
  async ({ id, quoteData }, { rejectWithValue }) => {
    try {
      const response = await apiClient.put(`/quotes/${id}`, quoteData);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || '更新引用体失败');
    }
  }
);

// 异步thunk：删除引用体
export const deleteQuote = createAsyncThunk(
  'quotes/deleteQuote',
  async (id, { rejectWithValue }) => {
    try {
      const response = await apiClient.delete(`/quotes/${id}`);
      return { id, ...response.data.data };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || '删除引用体失败');
    }
  }
);

const initialState = {
  items: [],
  status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed' - 用于引用体列表
  error: null,
  selectedQuote: null,
  isModalOpen: false,
  isCreateModalOpen: false, // 新建引用体模态框开关
  selectedQuoteStatus: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed' - 用于单个引用体
};

const quotesSlice = createSlice({
  name: 'quotes',
  initialState,
  reducers: {
    openQuoteModal: (state, action) => {
      // 如果有 payload，则更新 selectedQuote
      if (action.payload) {
        state.selectedQuote = action.payload;
        // 如果传入的数据不完整（比如没有content），则设置加载状态
        if (!action.payload.content) {
          state.selectedQuoteStatus = 'loading';
        }
      }
      // 直接打开弹窗，无论是否有 payload
      state.isModalOpen = true;
    },
    closeQuoteModal: (state) => {
      state.selectedQuote = null;
      state.isModalOpen = false;
      state.selectedQuoteStatus = 'idle'; // 关闭时重置状态
    },
    openQuoteCreateModal: (state) => {
      state.isCreateModalOpen = true;
    },
    closeQuoteCreateModal: (state) => {
      state.isCreateModalOpen = false;
    },
  },
  extraReducers: (builder) => {
    builder
      // 获取引用体列表
      .addCase(fetchQuotes.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchQuotes.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchQuotes.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // 获取单个引用体
      .addCase(fetchQuoteById.pending, (state) => {
        state.selectedQuoteStatus = 'loading';
        state.error = null;
      })
      .addCase(fetchQuoteById.fulfilled, (state, action) => {
        state.selectedQuoteStatus = 'succeeded';
        state.selectedQuote = action.payload;
      })
      .addCase(fetchQuoteById.rejected, (state, action) => {
        state.selectedQuoteStatus = 'failed';
        state.error = action.payload;
      })
      // 创建引用体
      .addCase(createQuote.pending, (state) => {
        state.error = null;
      })
      .addCase(createQuote.fulfilled, (state, action) => {
        // 将新创建的引用体添加到列表开头
        state.items.unshift(action.payload);
      })
      .addCase(createQuote.rejected, (state, action) => {
        state.error = action.payload;
      })
      // 更新引用体
      .addCase(updateQuote.pending, (state) => {
        state.error = null;
      })
      .addCase(updateQuote.fulfilled, (state, action) => {
        // 更新列表中的引用体
        const index = state.items.findIndex(item => item._id === action.payload._id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        // 更新选中的引用体
        if (state.selectedQuote && state.selectedQuote._id === action.payload._id) {
          state.selectedQuote = action.payload;
        }
      })
      .addCase(updateQuote.rejected, (state, action) => {
        state.error = action.payload;
      })
      // 删除引用体
      .addCase(deleteQuote.pending, (state) => {
        state.error = null;
      })
      .addCase(deleteQuote.fulfilled, (state, action) => {
        // 从列表中移除引用体
        state.items = state.items.filter(item => item._id !== action.payload.id);
        // 如果删除的是当前选中的引用体，关闭弹窗
        if (state.selectedQuote && state.selectedQuote._id === action.payload.id) {
          state.selectedQuote = null;
          state.isModalOpen = false;
          state.selectedQuoteStatus = 'idle';
        }
      })
      .addCase(deleteQuote.rejected, (state, action) => {
        state.error = action.payload;
      });
  },
});

export const {
  openQuoteModal,
  closeQuoteModal,
  openQuoteCreateModal,
  closeQuoteCreateModal
} = quotesSlice.actions;

// Selectors
export const selectAllQuotes = (state) => state.quotes.items;
export const selectQuotesStatus = (state) => state.quotes.status;
export const selectQuotesError = (state) => state.quotes.error;
export const selectSelectedQuote = (state) => state.quotes.selectedQuote;
export const selectIsQuoteModalOpen = (state) => state.quotes.isModalOpen;
export const selectIsQuoteCreateModalOpen = (state) => state.quotes.isCreateModalOpen;
export const selectSelectedQuoteStatus = (state) => state.quotes.selectedQuoteStatus;

export default quotesSlice.reducer;