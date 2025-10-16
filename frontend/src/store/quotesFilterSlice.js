import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../services/apiClient';

// 异步thunk：获取可用标签列表
export const fetchAvailableQuoteTags = createAsyncThunk(
  'quotesFilter/fetchAvailableQuoteTags',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/quotes/stats');
      // 将tagStats转换为{name, count}格式
      const tags = response.data.data.tagStats.map(tag => ({
        name: tag._id,
        count: tag.count
      }));
      return tags;
    } catch (error) {
      return rejectWithValue(error.message || '获取引用体标签列表失败');
    }
  }
);

// 异步thunk：复合搜索引用体（支持关键词和标签）
export const fetchQuotesByFilter = createAsyncThunk(
  'quotesFilter/fetchQuotesByFilter',
  async ({ query, tags, mode = 'all', page = 1, limit = 20, sort = '-updatedAt' }, { rejectWithValue }) => {
    try {
      // 构建查询参数
      const params = new URLSearchParams();
      
      if (query) {
        params.append('q', query);
      }
      
      if (tags && tags.length > 0) {
        params.append('tags', tags.join(','));
        params.append('mode', mode);
      }
      
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      params.append('sort', sort);

      const response = await apiClient.get(`/quotes/search/combined?${params}`);
      return {
        items: response.data.data,
        pagination: response.data.pagination,
        isFirstPage: page === 1
      };
    } catch (error) {
      return rejectWithValue(error.message || '搜索引用体失败');
    }
  }
);

// 异步thunk：获取所有引用体（分页）
export const fetchAllQuotesPaged = createAsyncThunk(
  'quotesFilter/fetchAllQuotesPaged',
  async ({ page = 1, limit = 20, sort = '-updatedAt' }, { rejectWithValue }) => {
    try {
      // 构建查询参数
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sort
      });

      const response = await apiClient.get(`/quotes?${params}`);
      return {
        items: response.data.data,
        pagination: {
          ...response.data.pagination,
          // 兼容处理：确保 hasMore 字段存在
          hasMore: response.data.pagination.hasMore !== undefined
            ? response.data.pagination.hasMore
            : response.data.pagination.hasNext || page < response.data.pagination.pages
        },
        isFirstPage: page === 1
      };
    } catch (error) {
      return rejectWithValue(error.message || '获取引用体列表失败');
    }
  }
);

// 初始状态
const initialState = {
  availableTags: [], // 可用标签列表 {name, count}[]
  selectedTags: [], // 当前选中的标签数组
  query: '', // 搜索关键词
  items: [], // 搜索结果引用体列表
  status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
  mode: 'all', // 匹配模式，固定为'all'
  sort: '-updatedAt', // 排序字段，默认按更新时间降序
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
    hasMore: false,
    hasNext: false,
    hasPrev: false
  }
};

const quotesFilterSlice = createSlice({
  name: 'quotesFilter',
  initialState,
  reducers: {
    setQuery: (state, action) => {
      state.query = action.payload;
    },
    setSelectedTags: (state, action) => {
      state.selectedTags = action.payload;
    },
    clearSelectedTags: (state) => {
      state.selectedTags = [];
      state.items = [];
      state.pagination = {
        page: 1,
        limit: 20,
        total: 0,
        pages: 0,
        hasMore: false,
        hasNext: false,
        hasPrev: false
      };
    },
    setSort: (state, action) => {
      state.sort = action.payload;
    },
    setPage: (state, action) => {
      state.pagination.page = action.payload;
    },
    resetFilter: (state) => {
      state.query = '';
      state.selectedTags = [];
      state.items = [];
      state.status = 'idle';
      state.error = null;
      state.pagination = {
        page: 1,
        limit: 20,
        total: 0,
        pages: 0,
        hasMore: false,
        hasNext: false,
        hasPrev: false
      };
    }
  },
  extraReducers: (builder) => {
    builder
      // 获取可用标签
      .addCase(fetchAvailableQuoteTags.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchAvailableQuoteTags.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.availableTags = action.payload;
        state.error = null;
      })
      .addCase(fetchAvailableQuoteTags.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // 复合搜索引用体
      .addCase(fetchQuotesByFilter.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchQuotesByFilter.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const { items, pagination, isFirstPage } = action.payload;
        
        if (isFirstPage) {
          // 第一页，替换数据
          state.items = items;
        } else {
          // 后续页面，追加数据
          state.items = [...state.items, ...items];
        }
        
        state.pagination = pagination;
        state.error = null;
      })
      .addCase(fetchQuotesByFilter.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // 获取所有引用体（分页）
      .addCase(fetchAllQuotesPaged.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchAllQuotesPaged.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const { items, pagination, isFirstPage } = action.payload;
        
        if (isFirstPage) {
          // 第一页，替换数据
          state.items = items;
        } else {
          // 后续页面，追加数据
          state.items = [...state.items, ...items];
        }
        
        state.pagination = pagination;
        state.error = null;
      })
      .addCase(fetchAllQuotesPaged.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  },
});

export const {
  setQuery,
  setSelectedTags,
  clearSelectedTags,
  setSort,
  setPage,
  resetFilter
} = quotesFilterSlice.actions;


// Selectors
export const selectAvailableQuoteTags = (state) => state.quotesFilter.availableTags;
export const selectSelectedQuoteTags = (state) => state.quotesFilter.selectedTags;
export const selectQuoteFilterItems = (state) => state.quotesFilter.items;
export const selectQuoteFilterStatus = (state) => state.quotesFilter.status;
export const selectQuoteFilterError = (state) => state.quotesFilter.error;
export const selectQuoteFilterQuery = (state) => state.quotesFilter.query;
export const selectQuoteFilterMode = (state) => state.quotesFilter.mode;
export const selectQuoteFilterSort = (state) => state.quotesFilter.sort;
export const selectQuoteFilterPagination = (state) => state.quotesFilter.pagination;
export const selectQuoteFilterHasMore = (state) => state.quotesFilter.pagination.hasMore;

export default quotesFilterSlice.reducer;