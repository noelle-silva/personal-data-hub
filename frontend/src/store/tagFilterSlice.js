import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../services/apiClient';

// 异步thunk：获取可用标签列表
export const fetchAvailableTags = createAsyncThunk(
  'tagFilter/fetchAvailableTags',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/documents/stats');
      // 将tagStats转换为{name, count}格式
      const tags = response.data.data.tagStats.map(tag => ({
        name: tag._id,
        count: tag.count
      }));
      return { tags, fetchedAt: Date.now() };
    } catch (error) {
      return rejectWithValue(error.message || '获取标签列表失败');
    }
  },
  {
    // 防止并发重复请求的条件
    condition: (_, { getState }) => {
      const { tagFilter } = getState();
      
      // 如果正在加载中，则跳过此次请求
      if (tagFilter.tagsLoading) {
        return false;
      }
      
      // 如果已有标签数据且未过期（5分钟缓存），则跳过请求
      const CACHE_TTL = 5 * 60 * 1000; // 5分钟
      if (
        tagFilter.availableTags.length > 0 &&
        tagFilter.tagsLastFetched &&
        (Date.now() - tagFilter.tagsLastFetched < CACHE_TTL)
      ) {
        return false;
      }
      
      return true;
    }
  }
);

// 异步thunk：按标签搜索文档
export const fetchByTags = createAsyncThunk(
  'tagFilter/fetchByTags',
  async ({ tags, mode = 'all', page = 1, limit = 20, sort = '-updatedAt' }, { rejectWithValue }) => {
    try {
      // 构建查询参数
      const params = new URLSearchParams({
        tags: tags.join(','),
        mode,
        page: page.toString(),
        limit: limit.toString(),
        sort
      });

      const response = await apiClient.get(`/documents/tags?${params}`);
      return {
        items: response.data.data,
        pagination: response.data.pagination,
        isFirstPage: page === 1
      };
    } catch (error) {
      return rejectWithValue(error.message || '按标签搜索文档失败');
    }
  },
  {
    condition: ({ tags, mode, page, limit, sort }, { getState }) => {
      const { tagFilter } = getState();
      
      // 如果正在加载列表，则跳过此次请求
      if (tagFilter.listLoading) {
        return false;
      }
      
      // 检查是否是相同参数的请求
      const requestKey = JSON.stringify({ tags, mode, page, limit, sort });
      if (tagFilter.lastListRequest === requestKey) {
        return false;
      }
      
      return true;
    }
  }
);

// 异步thunk：获取所有文档（分页）
export const fetchAllDocumentsPaged = createAsyncThunk(
  'tagFilter/fetchAllDocumentsPaged',
  async ({ page = 1, limit = 20, sort = '-updatedAt' }, { rejectWithValue }) => {
    try {
      // 构建查询参数
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sort
      });

      const response = await apiClient.get(`/documents?${params}`);
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
      return rejectWithValue(error.message || '获取文档列表失败');
    }
  },
  {
    condition: ({ page, limit, sort }, { getState }) => {
      const { tagFilter } = getState();
      
      // 如果正在加载列表，则跳过此次请求
      if (tagFilter.listLoading) {
        return false;
      }
      
      // 检查是否是相同参数的请求
      const requestKey = JSON.stringify({ page, limit, sort });
      if (tagFilter.lastListRequest === requestKey) {
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
  items: [], // 搜索结果文档列表
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

const tagFilterSlice = createSlice({
  name: 'tagFilter',
  initialState,
  reducers: {
    setSelectedTags: (state, action) => {
      state.selectedTags = action.payload;
      state.pagination.page = 1;
    },
    clearSelectedTags: (state) => {
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
    },
    setSort: (state, action) => {
      state.sort = action.payload;
      state.pagination.page = 1;
    },
    setPage: (state, action) => {
      state.pagination.page = action.payload;
    },
    resetFilter: (state) => {
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
      .addCase(fetchAvailableTags.pending, (state) => {
        state.tagsLoading = true;
        state.tagsError = null;
      })
      .addCase(fetchAvailableTags.fulfilled, (state, action) => {
        state.tagsLoading = false;
        state.availableTags = action.payload.tags;
        state.tagsLastFetched = action.payload.fetchedAt;
        state.tagsError = null;
      })
      .addCase(fetchAvailableTags.rejected, (state, action) => {
        state.tagsLoading = false;
        state.tagsError = action.payload;
      })
      // 按标签搜索文档
      .addCase(fetchByTags.pending, (state, action) => {
        state.status = 'loading';
        state.listLoading = true;
        state.error = null;
        // 记录当前请求参数，用于去重
        const { tags, mode, page, limit, sort } = action.meta.arg;
        state.lastListRequest = JSON.stringify({ tags, mode, page, limit, sort });
      })
      .addCase(fetchByTags.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.listLoading = false;
        const { items, pagination } = action.payload;
        // 分页切换模式：始终替换当前页数据（不做“加载更多/追加”）
        state.items = items;
        state.pagination = pagination;
        state.error = null;
        // 清除最后请求参数，允许相同参数的下次请求
        state.lastListRequest = null;
      })
      .addCase(fetchByTags.rejected, (state, action) => {
        state.status = 'failed';
        state.listLoading = false;
        state.error = action.payload;
        // 清除最后请求参数，允许重试
        state.lastListRequest = null;
      })
      // 获取所有文档（分页）
      .addCase(fetchAllDocumentsPaged.pending, (state, action) => {
        state.status = 'loading';
        state.listLoading = true;
        state.error = null;
        // 记录当前请求参数，用于去重
        const { page, limit, sort } = action.meta.arg;
        state.lastListRequest = JSON.stringify({ page, limit, sort });
      })
      .addCase(fetchAllDocumentsPaged.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.listLoading = false;
        const { items, pagination } = action.payload;
        // 分页切换模式：始终替换当前页数据（不做“加载更多/追加”）
        state.items = items;
        state.pagination = pagination;
        state.error = null;
        // 清除最后请求参数，允许相同参数的下次请求
        state.lastListRequest = null;
      })
      .addCase(fetchAllDocumentsPaged.rejected, (state, action) => {
        state.status = 'failed';
        state.listLoading = false;
        state.error = action.payload;
        // 清除最后请求参数，允许重试
        state.lastListRequest = null;
      });
  },
});

export const {
  setSelectedTags,
  clearSelectedTags,
  setSort,
  setPage,
  resetFilter
} = tagFilterSlice.actions;


// Selectors
export const selectAvailableTags = (state) => state.tagFilter.availableTags;
export const selectSelectedTags = (state) => state.tagFilter.selectedTags;
export const selectTagFilterItems = (state) => state.tagFilter.items;
export const selectTagFilterStatus = (state) => state.tagFilter.status;
export const selectTagFilterError = (state) => state.tagFilter.error;
export const selectTagFilterMode = (state) => state.tagFilter.mode;
export const selectTagFilterSort = (state) => state.tagFilter.sort;
export const selectTagFilterPagination = (state) => state.tagFilter.pagination;
export const selectTagFilterHasMore = (state) => state.tagFilter.pagination.hasMore;

// 新增：标签相关 selectors
export const selectTagsLoading = (state) => state.tagFilter.tagsLoading;
export const selectTagsError = (state) => state.tagFilter.tagsError;
export const selectTagsLastFetched = (state) => state.tagFilter.tagsLastFetched;

export default tagFilterSlice.reducer;
