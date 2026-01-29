/**
 * 壁纸Redux Slice
 * 管理壁纸相关的状态和操作
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../services/apiClient';
import { ensureDesktopGatewayReady } from '../services/desktopGateway';

const resolveGatewayUrl = (gateway, value) => {
  if (!value || typeof value !== 'string') return value;
  if (/^https?:\/\//i.test(value)) return value;
  if (!gateway) return value;
  return value.startsWith('/') ? `${gateway}${value}` : `${gateway}/${value}`;
};

const normalizeWallpaper = (gateway, wallpaper) => {
  if (!wallpaper || typeof wallpaper !== 'object') return wallpaper;
  return {
    ...wallpaper,
    url: resolveGatewayUrl(gateway, wallpaper.url)
  };
};

/**
 * 异步thunk：获取用户的壁纸列表
 */
export const fetchWallpapers = createAsyncThunk(
  'wallpaper/fetchWallpapers',
  async (params = {}, { rejectWithValue }) => {
    try {
      const { page = 1, limit = 20, sort = '-createdAt' } = params;
      const response = await apiClient.get('/themes/wallpapers', {
        params: { page, limit, sort }
      });
      
      if (response.data.success) {
        const gateway = await ensureDesktopGatewayReady().catch(() => '');
        return {
          wallpapers: (response.data.data || []).map(w => normalizeWallpaper(gateway, w)),
          pagination: response.data.pagination
        };
      } else {
        throw new Error(response.data.message || '获取壁纸列表失败');
      }
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || '获取壁纸列表失败');
    }
  }
);

/**
 * 异步thunk：获取当前壁纸
 */
export const fetchCurrentWallpaper = createAsyncThunk(
  'wallpaper/fetchCurrentWallpaper',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/themes/wallpapers/current');
      
      if (response.data.success) {
        const gateway = await ensureDesktopGatewayReady().catch(() => '');
        return normalizeWallpaper(gateway, response.data.data);
      } else {
        throw new Error(response.data.message || '获取当前壁纸失败');
      }
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || '获取当前壁纸失败');
    }
  }
);

/**
 * 异步thunk：上传壁纸
 */
export const uploadWallpaper = createAsyncThunk(
  'wallpaper/uploadWallpaper',
  async ({ file, description }, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (description) {
        formData.append('description', description);
      }
      
      const response = await apiClient.post('/themes/wallpapers', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (response.data.success) {
        const gateway = await ensureDesktopGatewayReady().catch(() => '');
        return normalizeWallpaper(gateway, response.data.data);
      } else {
        throw new Error(response.data.message || '上传壁纸失败');
      }
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || '上传壁纸失败');
    }
  }
);

/**
 * 异步thunk：设置当前壁纸
 */
export const setCurrentWallpaper = createAsyncThunk(
  'wallpaper/setCurrentWallpaper',
  async (wallpaperId, { rejectWithValue }) => {
    try {
      const response = await apiClient.put(`/themes/wallpapers/current/${wallpaperId}`);
      
      if (response.data.success) {
        const gateway = await ensureDesktopGatewayReady().catch(() => '');
        return normalizeWallpaper(gateway, response.data.data);
      } else {
        throw new Error(response.data.message || '设置当前壁纸失败');
      }
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || '设置当前壁纸失败');
    }
  }
);

/**
 * 异步thunk：删除壁纸
 */
export const deleteWallpaper = createAsyncThunk(
  'wallpaper/deleteWallpaper',
  async (wallpaperId, { rejectWithValue }) => {
    try {
      const response = await apiClient.delete(`/themes/wallpapers/${wallpaperId}`);
      
      if (response.data.success) {
        return wallpaperId;
      } else {
        throw new Error(response.data.message || '删除壁纸失败');
      }
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || '删除壁纸失败');
    }
  }
);

/**
 * 异步thunk：更新壁纸描述
 */
export const updateWallpaperDescription = createAsyncThunk(
  'wallpaper/updateWallpaperDescription',
  async ({ wallpaperId, description }, { rejectWithValue }) => {
    try {
      const response = await apiClient.patch(`/themes/wallpapers/${wallpaperId}/description`, {
        description
      });
      
      if (response.data.success) {
        const gateway = await ensureDesktopGatewayReady().catch(() => '');
        return normalizeWallpaper(gateway, response.data.data);
      } else {
        throw new Error(response.data.message || '更新壁纸描述失败');
      }
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || '更新壁纸描述失败');
    }
  }
);

/**
 * 异步thunk：获取壁纸统计信息
 */
export const fetchWallpaperStats = createAsyncThunk(
  'wallpaper/fetchWallpaperStats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/themes/wallpapers/stats');
      
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || '获取壁纸统计信息失败');
      }
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || '获取壁纸统计信息失败');
    }
  }
);

/**
 * 初始状态
 */
const initialState = {
  wallpapers: [],
  currentWallpaper: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  },
  stats: {
    totalWallpapers: 0,
    totalSize: 0,
    avgSize: 0,
    currentWallpaper: 0
  },
  loading: {
    wallpapers: false,
    currentWallpaper: false,
    upload: false,
    setCurrent: false,
    delete: false,
    updateDescription: false,
    stats: false
  },
  error: {
    wallpapers: null,
    currentWallpaper: null,
    upload: null,
    setCurrent: null,
    delete: null,
    updateDescription: null,
    stats: null
  }
};

/**
 * 壁纸Slice
 */
const wallpaperSlice = createSlice({
  name: 'wallpaper',
  initialState,
  reducers: {
    // 清除错误
    clearError: (state, action) => {
      const errorType = action.payload;
      if (errorType) {
        state.error[errorType] = null;
      } else {
        // 清除所有错误
        Object.keys(state.error).forEach(key => {
          state.error[key] = null;
        });
      }
    },
    // 重置状态
    resetWallpaperState: (state) => {
      return { ...initialState };
    }
  },
  extraReducers: (builder) => {
    // 获取壁纸列表
    builder
      .addCase(fetchWallpapers.pending, (state) => {
        state.loading.wallpapers = true;
        state.error.wallpapers = null;
      })
      .addCase(fetchWallpapers.fulfilled, (state, action) => {
        state.loading.wallpapers = false;
        state.wallpapers = action.payload.wallpapers;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchWallpapers.rejected, (state, action) => {
        state.loading.wallpapers = false;
        state.error.wallpapers = action.payload;
      });

    // 获取当前壁纸
    builder
      .addCase(fetchCurrentWallpaper.pending, (state) => {
        state.loading.currentWallpaper = true;
        state.error.currentWallpaper = null;
      })
      .addCase(fetchCurrentWallpaper.fulfilled, (state, action) => {
        state.loading.currentWallpaper = false;
        state.currentWallpaper = action.payload;
      })
      .addCase(fetchCurrentWallpaper.rejected, (state, action) => {
        state.loading.currentWallpaper = false;
        state.error.currentWallpaper = action.payload;
      });

    // 上传壁纸
    builder
      .addCase(uploadWallpaper.pending, (state) => {
        state.loading.upload = true;
        state.error.upload = null;
      })
      .addCase(uploadWallpaper.fulfilled, (state, action) => {
        state.loading.upload = false;
        // 将新壁纸添加到列表开头
        state.wallpapers.unshift(action.payload);
        // 更新分页信息
        state.pagination.total += 1;
        state.pagination.pages = Math.ceil(state.pagination.total / state.pagination.limit);
      })
      .addCase(uploadWallpaper.rejected, (state, action) => {
        state.loading.upload = false;
        state.error.upload = action.payload;
      });

    // 设置当前壁纸
    builder
      .addCase(setCurrentWallpaper.pending, (state) => {
        state.loading.setCurrent = true;
        state.error.setCurrent = null;
      })
      .addCase(setCurrentWallpaper.fulfilled, (state, action) => {
        state.loading.setCurrent = false;
        const newCurrentWallpaper = action.payload;
        
        // 更新当前壁纸
        state.currentWallpaper = newCurrentWallpaper;
        
        // 更新壁纸列表中的当前状态
        state.wallpapers = state.wallpapers.map(wallpaper => ({
          ...wallpaper,
          isCurrent: wallpaper._id === newCurrentWallpaper._id
        }));
      })
      .addCase(setCurrentWallpaper.rejected, (state, action) => {
        state.loading.setCurrent = false;
        state.error.setCurrent = action.payload;
      });

    // 删除壁纸
    builder
      .addCase(deleteWallpaper.pending, (state) => {
        state.loading.delete = true;
        state.error.delete = null;
      })
      .addCase(deleteWallpaper.fulfilled, (state, action) => {
        state.loading.delete = false;
        const deletedId = action.payload;
        
        // 从列表中移除壁纸
        state.wallpapers = state.wallpapers.filter(wallpaper => wallpaper._id !== deletedId);
        
        // 更新分页信息
        state.pagination.total -= 1;
        state.pagination.pages = Math.ceil(state.pagination.total / state.pagination.limit);
      })
      .addCase(deleteWallpaper.rejected, (state, action) => {
        state.loading.delete = false;
        state.error.delete = action.payload;
      });

    // 更新壁纸描述
    builder
      .addCase(updateWallpaperDescription.pending, (state) => {
        state.loading.updateDescription = true;
        state.error.updateDescription = null;
      })
      .addCase(updateWallpaperDescription.fulfilled, (state, action) => {
        state.loading.updateDescription = false;
        const updatedWallpaper = action.payload;
        
        // 更新列表中的壁纸
        state.wallpapers = state.wallpapers.map(wallpaper =>
          wallpaper._id === updatedWallpaper._id ? updatedWallpaper : wallpaper
        );
        
        // 如果是当前壁纸，也更新当前壁纸
        if (state.currentWallpaper && state.currentWallpaper._id === updatedWallpaper._id) {
          state.currentWallpaper = updatedWallpaper;
        }
      })
      .addCase(updateWallpaperDescription.rejected, (state, action) => {
        state.loading.updateDescription = false;
        state.error.updateDescription = action.payload;
      });

    // 获取壁纸统计信息
    builder
      .addCase(fetchWallpaperStats.pending, (state) => {
        state.loading.stats = true;
        state.error.stats = null;
      })
      .addCase(fetchWallpaperStats.fulfilled, (state, action) => {
        state.loading.stats = false;
        state.stats = action.payload;
      })
      .addCase(fetchWallpaperStats.rejected, (state, action) => {
        state.loading.stats = false;
        state.error.stats = action.payload;
      });
  }
});

// 导出actions
export const { clearError, resetWallpaperState } = wallpaperSlice.actions;

// 导出selectors
export const selectWallpapers = (state) => state.wallpaper.wallpapers;
export const selectCurrentWallpaper = (state) => state.wallpaper.currentWallpaper;
export const selectWallpaperPagination = (state) => state.wallpaper.pagination;
export const selectWallpaperStats = (state) => state.wallpaper.stats;
export const selectWallpaperLoading = (state) => state.wallpaper.loading;
export const selectWallpaperError = (state) => state.wallpaper.error;

// 导出reducer
export default wallpaperSlice.reducer;
