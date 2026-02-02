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
      return { tags, fetchedAt: Date.now() };
    } catch (error) {
      return rejectWithValue(error.message || '获取收藏夹标签列表失败');
    }
  },
  {
    // 防止并发重复请求的条件
    condition: (_, { getState }) => {
      const { quotesFilter } = getState();
      
      // 如果正在加载中，则跳过此次请求
      if (quotesFilter.tagsLoading) {
        return false;
      }
      
      // 如果已有标签数据且未过期（5分钟缓存），则跳过请求
      const CACHE_TTL = 5 * 60 * 1000; // 5分钟
      if (
        quotesFilter.availableTags.length > 0 &&
        quotesFilter.tagsLastFetched &&
        (Date.now() - quotesFilter.tagsLastFetched < CACHE_TTL)
      ) {
        return false;
      }
      
      return true;
    }
  }
);

// 异步thunk：复合搜索收藏夹（支持关键词和标签）
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
      return rejectWithValue(error.message || '搜索收藏夹失败');
    }
  },
  {
    condition: (args, { getState }) => {
      const { quotesFilter } = getState();
      
      // 如果正在加载列表，则跳过此次请求
      if (quotesFilter.listLoading) {
        return false;
      }
      
      // 检查是否是相同参数的请求
      const { query, tags, mode, page, limit, sort } = args;
      const requestKey = JSON.stringify({ query, tags, mode, page, limit, sort });
      if (quotesFilter.lastListRequest === requestKey) {
        return false;
      }
      
      return true;
    }
  }
);

// 异步thunk：获取所有收藏夹（分页）
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
      return rejectWithValue(error.message || '获取收藏夹列表失败');
    }
  },
  {
    condition: (args, { getState }) => {
      const { quotesFilter } = getState();
      
      // 如果正在加载列表，则跳过此次请求
      if (quotesFilter.listLoading) {
        return false;
      }
      
      // 检查是否是相同参数的请求
      const { page, limit, sort } = args;
      const requestKey = JSON.stringify({ page, limit, sort });
      if (quotesFilter.lastListRequest === requestKey) {
        return false;
      }
      
      return true;
    }
  }
);

// 初始状态
const initialState = {
  availableTags: [], // 可用标签列表 {name, count}[]
  selectedTags: [], // 当前选中的标签数组
  query: '', // 搜索关键词
  items: [], // 搜索结果收藏夹列表
  status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed' - 用于列表加载状态
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
  },
  // 标签加载状态（与列表状态分离）
  tagsLoading: false,
  tagsError: null,
  tagsLastFetched: null, // 标签最后获取时间，用于缓存判断
  // 列表请求并发控制
  listLoading: false, // 列表加载状态，用于并发控制
  lastListRequest: null // 上一次列表请求的参数，用于相同参数去重
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
        state.tagsLoading = true;
        state.tagsError = null;
      })
      .addCase(fetchAvailableQuoteTags.fulfilled, (state, action) => {
        state.tagsLoading = false;
        state.availableTags = action.payload.tags;
        state.tagsLastFetched = action.payload.fetchedAt;
        state.tagsError = null;
      })
      .addCase(fetchAvailableQuoteTags.rejected, (state, action) => {
        state.tagsLoading = false;
        state.tagsError = action.payload;
      })
      // 复合搜索收藏夹
      .addCase(fetchQuotesByFilter.pending, (state, action) => {
        state.status = 'loading';
        state.listLoading = true;
        state.error = null;
        // 记录当前请求参数，用于去重
        const { query, tags, mode, page, limit, sort } = action.meta.arg;
        state.lastListRequest = JSON.stringify({ query, tags, mode, page, limit, sort });
      })
      .addCase(fetchQuotesByFilter.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.listLoading = false;
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
        // 清除最后请求参数，允许相同参数的下次请求
        state.lastListRequest = null;
      })
      .addCase(fetchQuotesByFilter.rejected, (state, action) => {
        state.status = 'failed';
        state.listLoading = false;
        state.error = action.payload;
        // 清除最后请求参数，允许重试
        state.lastListRequest = null;
      })
      // 获取所有收藏夹（分页）
      .addCase(fetchAllQuotesPaged.pending, (state, action) => {
        state.status = 'loading';
        state.listLoading = true;
        state.error = null;
        // 记录当前请求参数，用于去重
        const { page, limit, sort } = action.meta.arg;
        state.lastListRequest = JSON.stringify({ page, limit, sort });
      })
      .addCase(fetchAllQuotesPaged.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.listLoading = false;
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
        // 清除最后请求参数，允许相同参数的下次请求
        state.lastListRequest = null;
      })
      .addCase(fetchAllQuotesPaged.rejected, (state, action) => {
        state.status = 'failed';
        state.listLoading = false;
        state.error = action.payload;
        // 清除最后请求参数，允许重试
        state.lastListRequest = null;
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

// 新增：标签相关 selectors
export const selectQuoteTagsLoading = (state) => state.quotesFilter.tagsLoading;
export const selectQuoteTagsError = (state) => state.quotesFilter.tagsError;
export const selectQuoteTagsLastFetched = (state) => state.quotesFilter.tagsLastFetched;

export default quotesFilterSlice.reducer;