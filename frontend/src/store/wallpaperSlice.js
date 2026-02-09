import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import localWallpaperStorage from '../services/localWallpaperStorage';

const buildPagination = (total, page = 1, limit = 20) => ({
  page,
  limit,
  total,
  pages: Math.ceil(total / limit) || 0
});

const toSortedWallpapers = (wallpapers, sort) => {
  const list = Array.isArray(wallpapers) ? [...wallpapers] : [];

  if (sort === 'createdAt') {
    return list.sort((left, right) => new Date(left.createdAt) - new Date(right.createdAt));
  }

  return list.sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
};

export const fetchWallpapers = createAsyncThunk(
  'wallpaper/fetchWallpapers',
  async (params = {}, { rejectWithValue }) => {
    try {
      const { page = 1, limit = 20, sort = '-createdAt' } = params;
      const wallpapers = await localWallpaperStorage.listWallpapers();
      const sorted = toSortedWallpapers(wallpapers, sort);

      const start = (page - 1) * limit;
      const end = start + limit;

      return {
        wallpapers: sorted.slice(start, end),
        pagination: buildPagination(sorted.length, page, limit)
      };
    } catch (error) {
      return rejectWithValue(error?.message || '获取本地壁纸列表失败');
    }
  }
);

export const fetchCurrentWallpaper = createAsyncThunk(
  'wallpaper/fetchCurrentWallpaper',
  async (_, { rejectWithValue }) => {
    try {
      return await localWallpaperStorage.getCurrentWallpaper();
    } catch (error) {
      return rejectWithValue(error?.message || '获取当前本地壁纸失败');
    }
  }
);

export const uploadWallpaper = createAsyncThunk(
  'wallpaper/uploadWallpaper',
  async ({ file, description }, { rejectWithValue }) => {
    try {
      return await localWallpaperStorage.createWallpaper(file, description);
    } catch (error) {
      return rejectWithValue(error?.message || '保存本地壁纸失败');
    }
  }
);

export const setCurrentWallpaper = createAsyncThunk(
  'wallpaper/setCurrentWallpaper',
  async (wallpaperId, { rejectWithValue }) => {
    try {
      return await localWallpaperStorage.setCurrentWallpaper(wallpaperId);
    } catch (error) {
      return rejectWithValue(error?.message || '设置当前本地壁纸失败');
    }
  }
);

export const deleteWallpaper = createAsyncThunk(
  'wallpaper/deleteWallpaper',
  async (wallpaperId, { rejectWithValue }) => {
    try {
      return await localWallpaperStorage.deleteWallpaper(wallpaperId);
    } catch (error) {
      return rejectWithValue(error?.message || '删除本地壁纸失败');
    }
  }
);

export const updateWallpaperDescription = createAsyncThunk(
  'wallpaper/updateWallpaperDescription',
  async ({ wallpaperId, description }, { rejectWithValue }) => {
    try {
      return await localWallpaperStorage.updateDescription(wallpaperId, description);
    } catch (error) {
      return rejectWithValue(error?.message || '更新本地壁纸描述失败');
    }
  }
);

export const fetchWallpaperStats = createAsyncThunk(
  'wallpaper/fetchWallpaperStats',
  async (_, { rejectWithValue }) => {
    try {
      return await localWallpaperStorage.getStats();
    } catch (error) {
      return rejectWithValue(error?.message || '获取本地壁纸统计信息失败');
    }
  }
);

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

const wallpaperSlice = createSlice({
  name: 'wallpaper',
  initialState,
  reducers: {
    clearError: (state, action) => {
      const errorType = action.payload;

      if (errorType) {
        state.error[errorType] = null;
      } else {
        Object.keys(state.error).forEach((key) => {
          state.error[key] = null;
        });
      }
    },
    resetWallpaperState: () => ({ ...initialState })
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWallpapers.pending, (state) => {
        state.loading.wallpapers = true;
        state.error.wallpapers = null;
      })
      .addCase(fetchWallpapers.fulfilled, (state, action) => {
        state.loading.wallpapers = false;
        state.wallpapers = action.payload.wallpapers;
        state.pagination = action.payload.pagination;
        state.currentWallpaper = state.wallpapers.find((item) => item.isCurrent) || state.currentWallpaper;
      })
      .addCase(fetchWallpapers.rejected, (state, action) => {
        state.loading.wallpapers = false;
        state.error.wallpapers = action.payload;
      });

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

    builder
      .addCase(uploadWallpaper.pending, (state) => {
        state.loading.upload = true;
        state.error.upload = null;
      })
      .addCase(uploadWallpaper.fulfilled, (state, action) => {
        state.loading.upload = false;
        state.wallpapers.unshift(action.payload);
        if (action.payload?.isCurrent) {
          state.currentWallpaper = action.payload;
        }
        state.pagination.total += 1;
        state.pagination.pages = Math.ceil(state.pagination.total / state.pagination.limit) || 0;
      })
      .addCase(uploadWallpaper.rejected, (state, action) => {
        state.loading.upload = false;
        state.error.upload = action.payload;
      });

    builder
      .addCase(setCurrentWallpaper.pending, (state) => {
        state.loading.setCurrent = true;
        state.error.setCurrent = null;
      })
      .addCase(setCurrentWallpaper.fulfilled, (state, action) => {
        state.loading.setCurrent = false;
        state.currentWallpaper = action.payload;
        state.wallpapers = state.wallpapers.map((wallpaper) => ({
          ...wallpaper,
          isCurrent: wallpaper._id === action.payload?._id
        }));
      })
      .addCase(setCurrentWallpaper.rejected, (state, action) => {
        state.loading.setCurrent = false;
        state.error.setCurrent = action.payload;
      });

    builder
      .addCase(deleteWallpaper.pending, (state) => {
        state.loading.delete = true;
        state.error.delete = null;
      })
      .addCase(deleteWallpaper.fulfilled, (state, action) => {
        state.loading.delete = false;
        const { deletedId, currentWallpaper, total } = action.payload;

        state.wallpapers = state.wallpapers.filter((wallpaper) => wallpaper._id !== deletedId);
        state.currentWallpaper = currentWallpaper || null;
        state.wallpapers = state.wallpapers.map((wallpaper) => ({
          ...wallpaper,
          isCurrent: wallpaper._id === currentWallpaper?._id
        }));

        state.pagination.total = typeof total === 'number' ? total : Math.max(0, state.pagination.total - 1);
        state.pagination.pages = Math.ceil(state.pagination.total / state.pagination.limit) || 0;
      })
      .addCase(deleteWallpaper.rejected, (state, action) => {
        state.loading.delete = false;
        state.error.delete = action.payload;
      });

    builder
      .addCase(updateWallpaperDescription.pending, (state) => {
        state.loading.updateDescription = true;
        state.error.updateDescription = null;
      })
      .addCase(updateWallpaperDescription.fulfilled, (state, action) => {
        state.loading.updateDescription = false;
        const updatedWallpaper = action.payload;

        state.wallpapers = state.wallpapers.map((wallpaper) =>
          wallpaper._id === updatedWallpaper._id ? updatedWallpaper : wallpaper
        );

        if (state.currentWallpaper && state.currentWallpaper._id === updatedWallpaper._id) {
          state.currentWallpaper = updatedWallpaper;
        }
      })
      .addCase(updateWallpaperDescription.rejected, (state, action) => {
        state.loading.updateDescription = false;
        state.error.updateDescription = action.payload;
      });

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

export const { clearError, resetWallpaperState } = wallpaperSlice.actions;

export const selectWallpapers = (state) => state.wallpaper.wallpapers;
export const selectCurrentWallpaper = (state) => state.wallpaper.currentWallpaper;
export const selectWallpaperPagination = (state) => state.wallpaper.pagination;
export const selectWallpaperStats = (state) => state.wallpaper.stats;
export const selectWallpaperLoading = (state) => state.wallpaper.loading;
export const selectWallpaperError = (state) => state.wallpaper.error;

export default wallpaperSlice.reducer;
