/**
 * 自定义页面Redux切片
 * 管理自定义页面的状态和操作
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import customPagesService from '../services/customPages';

// 异步thunk：获取所有自定义页面
export const fetchAllPages = createAsyncThunk(
  'customPages/fetchAll',
  async (options = {}, { rejectWithValue }) => {
    try {
      const response = await customPagesService.listPages(options);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

// 异步thunk：根据名称获取自定义页面
export const fetchPageByName = createAsyncThunk(
  'customPages/fetchByName',
  async ({ name, options = {} }, { rejectWithValue }) => {
    try {
      const response = await customPagesService.getByName(name, options);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

// 异步thunk：创建自定义页面
export const createPage = createAsyncThunk(
  'customPages/create',
  async (pageData, { rejectWithValue }) => {
    try {
      const response = await customPagesService.createPage(pageData);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

// 异步thunk：更新自定义页面
export const updatePage = createAsyncThunk(
  'customPages/update',
  async ({ id, updateData, options = {} }, { rejectWithValue }) => {
    try {
      const response = await customPagesService.updatePage(id, updateData, options);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

// 异步thunk：删除自定义页面
export const deletePage = createAsyncThunk(
  'customPages/delete',
  async (id, { rejectWithValue }) => {
    try {
      const response = await customPagesService.deletePage(id);
      return { id, ...response };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

// 异步thunk：搜索自定义页面
export const searchPages = createAsyncThunk(
  'customPages/search',
  async ({ searchTerm, options = {} }, { rejectWithValue }) => {
    try {
      const response = await customPagesService.searchPages(searchTerm, options);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

// 初始状态
const initialState = {
  // 页面列表
  pages: [],
  // 当前查看的页面
  currentPage: null,
  // 搜索结果
  searchResults: [],
  // 分页信息
  pagination: {
    page: 1,
    limit: 50,
    total: 0,
    pages: 0,
    hasNext: false,
    hasPrev: false
  },
  // 搜索分页信息
  searchPagination: {
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
    hasNext: false,
    hasPrev: false
  },
  // 加载状态
  loading: false,
  // 保存状态（用于创建、更新、删除操作）
  saving: false,
  // 搜索状态
  searching: false,
  // 错误信息
  error: null
};

// 创建切片
const customPagesSlice = createSlice({
  name: 'customPages',
  initialState,
  reducers: {
    // 清除错误
    clearError: (state) => {
      state.error = null;
    },
    // 清除当前页面
    clearCurrentPage: (state) => {
      state.currentPage = null;
    },
    // 清除搜索结果
    clearSearchResults: (state) => {
      state.searchResults = [];
      state.searchPagination = initialState.searchPagination;
    }
  },
  extraReducers: (builder) => {
    // 获取所有页面
    builder
      .addCase(fetchAllPages.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllPages.fulfilled, (state, action) => {
        state.loading = false;
        state.pages = action.payload.data;
        state.pagination = action.payload.pagination || initialState.pagination;
      })
      .addCase(fetchAllPages.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // 根据名称获取页面
    builder
      .addCase(fetchPageByName.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPageByName.fulfilled, (state, action) => {
        state.loading = false;
        state.currentPage = action.payload.data;
      })
      .addCase(fetchPageByName.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.currentPage = null;
      });

    // 创建页面
    builder
      .addCase(createPage.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(createPage.fulfilled, (state, action) => {
        state.saving = false;
        // 将新页面添加到列表开头
        state.pages.unshift(action.payload.data);
        // 更新分页信息
        if (state.pagination.total !== undefined) {
          state.pagination.total += 1;
        }
      })
      .addCase(createPage.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload;
      });

    // 更新页面
    builder
      .addCase(updatePage.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(updatePage.fulfilled, (state, action) => {
        state.saving = false;
        const updatedPage = action.payload.data;
        
        // 更新列表中的页面
        const index = state.pages.findIndex(page => page._id === updatedPage._id);
        if (index !== -1) {
          state.pages[index] = updatedPage;
        }
        
        // 更新当前页面
        if (state.currentPage && state.currentPage._id === updatedPage._id) {
          state.currentPage = updatedPage;
        }
      })
      .addCase(updatePage.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload;
      });

    // 删除页面
    builder
      .addCase(deletePage.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(deletePage.fulfilled, (state, action) => {
        state.saving = false;
        const deletedId = action.payload.id;
        
        // 从列表中移除页面
        state.pages = state.pages.filter(page => page._id !== deletedId);
        
        // 如果删除的是当前页面，清除当前页面
        if (state.currentPage && state.currentPage._id === deletedId) {
          state.currentPage = null;
        }
        
        // 更新分页信息
        if (state.pagination.total !== undefined) {
          state.pagination.total = Math.max(0, state.pagination.total - 1);
        }
      })
      .addCase(deletePage.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload;
      });

    // 搜索页面
    builder
      .addCase(searchPages.pending, (state) => {
        state.searching = true;
        state.error = null;
      })
      .addCase(searchPages.fulfilled, (state, action) => {
        state.searching = false;
        state.searchResults = action.payload.data;
        state.searchPagination = action.payload.pagination || initialState.searchPagination;
      })
      .addCase(searchPages.rejected, (state, action) => {
        state.searching = false;
        state.error = action.payload;
      });
  }
});

// 导出actions
export const { clearError, clearCurrentPage, clearSearchResults } = customPagesSlice.actions;

// 选择器
export const selectAllPages = (state) => state.customPages.pages;
export const selectCurrentPage = (state) => state.customPages.currentPage;
export const selectSearchResults = (state) => state.customPages.searchResults;
export const selectPagination = (state) => state.customPages.pagination;
export const selectSearchPagination = (state) => state.customPages.searchPagination;
export const selectLoading = (state) => state.customPages.loading;
export const selectSaving = (state) => state.customPages.saving;
export const selectSearching = (state) => state.customPages.searching;
export const selectError = (state) => state.customPages.error;

// 根据名称查找页面
export const selectPageByName = (state, name) => {
  return state.customPages.pages.find(page => page.name === name);
};

// 根据ID查找页面
export const selectPageById = (state, id) => {
  return state.customPages.pages.find(page => page._id === id);
};

// 导出reducer
export default customPagesSlice.reducer;