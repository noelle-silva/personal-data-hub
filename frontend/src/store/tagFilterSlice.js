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
      return tags;
    } catch (error) {
      return rejectWithValue(error.message || '获取标签列表失败');
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
  }
);

// 初始状态
const initialState = {
  availableTags: [], // 可用标签列表 {name, count}[]
  selectedTags: [], // 当前选中的标签数组
  items: [], // 搜索结果文档列表
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

const tagFilterSlice = createSlice({
  name: 'tagFilter',
  initialState,
  reducers: {
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
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchAvailableTags.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.availableTags = action.payload;
        state.error = null;
      })
      .addCase(fetchAvailableTags.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // 按标签搜索文档
      .addCase(fetchByTags.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchByTags.fulfilled, (state, action) => {
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
      .addCase(fetchByTags.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // 获取所有文档（分页）
      .addCase(fetchAllDocumentsPaged.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchAllDocumentsPaged.fulfilled, (state, action) => {
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
      .addCase(fetchAllDocumentsPaged.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
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

export default tagFilterSlice.reducer;