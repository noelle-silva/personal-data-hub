import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../services/apiClient';

// 异步thunk：搜索文档
export const searchDocuments = createAsyncThunk(
  'search/searchDocuments',
  async ({ q, page = 1, limit = 20 }, { rejectWithValue, signal }) => {
    try {
      // 构建查询参数
      const params = new URLSearchParams({
        q,
        page: page.toString(),
        limit: limit.toString()
      });

      const response = await apiClient.get(`/documents/search?${params}`, {
        signal
      });

      return {
        items: response.data.data,
        page: response.data.pagination.page,
        limit: response.data.pagination.limit,
        hasMore: response.data.pagination.hasMore,
        isFirstPage: page === 1
      };
    } catch (error) {
      // 如果是AbortError，不处理，让组件自行处理
      if (error.name === 'AbortError') {
        return rejectWithValue('请求已取消');
      }
      return rejectWithValue(error.message || '搜索失败');
    }
  }
);

// 初始状态
const initialState = {
  query: '',
  items: [],
  page: 1,
  hasMore: false,
  status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
  open: false,
  highlightedIndex: -1
};

const searchSlice = createSlice({
  name: 'search',
  initialState,
  reducers: {
    setQuery: (state, action) => {
      state.query = action.payload;
    },
    clearResults: (state) => {
      state.items = [];
      state.page = 1;
      state.hasMore = false;
      state.status = 'idle';
      state.error = null;
      state.highlightedIndex = -1;
    },
    openDropdown: (state) => {
      state.open = true;
    },
    closeDropdown: (state) => {
      state.open = false;
      state.highlightedIndex = -1;
    },
    setHighlightedIndex: (state, action) => {
      state.highlightedIndex = action.payload;
    },
    resetSearch: (state) => {
      state.query = '';
      state.items = [];
      state.page = 1;
      state.hasMore = false;
      state.status = 'idle';
      state.error = null;
      state.open = false;
      state.highlightedIndex = -1;
    }
  },
  extraReducers: (builder) => {
    builder
      // 搜索文档
      .addCase(searchDocuments.pending, (state, action) => {
        const { isFirstPage } = action.meta.arg;
        if (isFirstPage) {
          state.status = 'loading';
          state.items = [];
          state.error = null;
        }
      })
      .addCase(searchDocuments.fulfilled, (state, action) => {
        const { items, page, hasMore, isFirstPage } = action.payload;
        state.status = 'succeeded';
        
        if (isFirstPage) {
          state.items = items;
        } else {
          // 追加新结果
          state.items = [...state.items, ...items];
        }
        
        state.page = page;
        state.hasMore = hasMore;
        state.error = null;
      })
      .addCase(searchDocuments.rejected, (state, action) => {
        if (action.payload !== '请求已取消') {
          state.status = 'failed';
          state.error = action.payload;
        }
      });
  },
});

export const {
  setQuery,
  clearResults,
  openDropdown,
  closeDropdown,
  setHighlightedIndex,
  resetSearch
} = searchSlice.actions;

// Selectors
export const selectSearchQuery = (state) => state.search.query;
export const selectSearchItems = (state) => state.search.items;
export const selectSearchPage = (state) => state.search.page;
export const selectSearchHasMore = (state) => state.search.hasMore;
export const selectSearchStatus = (state) => state.search.status;
export const selectSearchError = (state) => state.search.error;
export const selectSearchOpen = (state) => state.search.open;
export const selectHighlightedIndex = (state) => state.search.highlightedIndex;

export default searchSlice.reducer;