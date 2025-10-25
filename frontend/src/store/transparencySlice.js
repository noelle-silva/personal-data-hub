import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import transparencyService from '../services/transparency';

// 异步thunk：获取所有透明度配置
export const fetchAllTransparencyConfigs = createAsyncThunk(
  'transparency/fetchAllConfigs',
  async (_, { rejectWithValue }) => {
    try {
      const response = await transparencyService.getAllConfigs();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || '获取透明度配置失败');
    }
  }
);

// 异步thunk：获取特定透明度配置
export const fetchTransparencyConfig = createAsyncThunk(
  'transparency/fetchConfig',
  async (configName, { rejectWithValue }) => {
    try {
      const response = await transparencyService.getConfigByName(configName);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || '获取透明度配置失败');
    }
  }
);

// 异步thunk：保存透明度配置
export const saveTransparencyConfig = createAsyncThunk(
  'transparency/saveConfig',
  async ({ configName, configData }, { rejectWithValue }) => {
    try {
      const response = await transparencyService.saveConfig(configName, configData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || '保存透明度配置失败');
    }
  }
);

// 异步thunk：删除透明度配置
export const deleteTransparencyConfig = createAsyncThunk(
  'transparency/deleteConfig',
  async (configName, { rejectWithValue }) => {
    try {
      const response = await transparencyService.deleteConfig(configName);
      return { configName, message: response.message };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || '删除透明度配置失败');
    }
  }
);

const initialState = {
  // 所有透明度配置列表
  configs: [],
  // 当前选中的配置
  currentConfig: null,
  // 当前应用的透明度值
  currentTransparency: {
    cards: 100,
    sidebar: 100,
    appBar: 100
  },
  // 加载状态
  loading: false,
  // 保存状态
  saving: false,
  // 错误信息
  error: null,
  // 是否已从localStorage恢复透明度设置
  restoredFromStorage: false
};

const transparencySlice = createSlice({
  name: 'transparency',
  initialState,
  reducers: {
    // 设置当前应用的透明度值
    setCurrentTransparency: (state, action) => {
      state.currentTransparency = {
        ...state.currentTransparency,
        ...action.payload
      };
      // 应用到DOM
      transparencyService.applyTransparency(state.currentTransparency);
    },
    
    // 设置当前选中的配置
    setCurrentConfig: (state, action) => {
      state.currentConfig = action.payload;
      if (action.payload && action.payload.transparency) {
        state.currentTransparency = {
          ...state.currentTransparency,
          ...action.payload.transparency
        };
        // 应用到DOM
        transparencyService.applyTransparency(state.currentTransparency);
      }
    },
    
    // 清除错误
    clearError: (state) => {
      state.error = null;
    },
    
    // 重置透明度到默认值
    resetTransparency: (state) => {
      state.currentTransparency = {
        cards: 100,
        sidebar: 100,
        appBar: 100
      };
      state.currentConfig = null;
      transparencyService.clearTransparency();
    },
    
    // 从localStorage恢复透明度设置
    restoreFromStorage: (state) => {
      if (!state.restoredFromStorage) {
        const stored = transparencyService.getStoredTransparency();
        if (stored) {
          state.currentTransparency = {
            ...state.currentTransparency,
            ...stored
          };
          transparencyService.applyTransparency(state.currentTransparency);
        }
        state.restoredFromStorage = true;
      }
    }
  },
  extraReducers: (builder) => {
    // 获取所有配置
    builder
      .addCase(fetchAllTransparencyConfigs.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllTransparencyConfigs.fulfilled, (state, action) => {
        state.loading = false;
        state.configs = action.payload;
      })
      .addCase(fetchAllTransparencyConfigs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
    
    // 获取特定配置
    builder
      .addCase(fetchTransparencyConfig.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTransparencyConfig.fulfilled, (state, action) => {
        state.loading = false;
        state.currentConfig = action.payload;
        if (action.payload.transparency) {
          state.currentTransparency = {
            ...state.currentTransparency,
            ...action.payload.transparency
          };
          transparencyService.applyTransparency(state.currentTransparency);
        }
      })
      .addCase(fetchTransparencyConfig.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
    
    // 保存配置
    builder
      .addCase(saveTransparencyConfig.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(saveTransparencyConfig.fulfilled, (state, action) => {
        state.saving = false;
        state.currentConfig = action.payload;
        if (action.payload.transparency) {
          state.currentTransparency = {
            ...state.currentTransparency,
            ...action.payload.transparency
          };
          transparencyService.applyTransparency(state.currentTransparency);
        }
        
        // 更新或添加到配置列表
        const existingIndex = state.configs.findIndex(
          config => config.name === action.payload.name
        );
        if (existingIndex !== -1) {
          state.configs[existingIndex] = action.payload;
        } else {
          state.configs.push(action.payload);
        }
      })
      .addCase(saveTransparencyConfig.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload;
      });
    
    // 删除配置
    builder
      .addCase(deleteTransparencyConfig.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteTransparencyConfig.fulfilled, (state, action) => {
        state.loading = false;
        // 从配置列表中移除
        state.configs = state.configs.filter(
          config => config.name !== action.payload.configName
        );
        
        // 如果删除的是当前选中的配置，则重置
        if (state.currentConfig && state.currentConfig.name === action.payload.configName) {
          state.currentConfig = null;
        }
      })
      .addCase(deleteTransparencyConfig.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

// 导出actions
export const {
  setCurrentTransparency,
  setCurrentConfig,
  clearError,
  resetTransparency,
  restoreFromStorage
} = transparencySlice.actions;

// 导出selectors
export const selectAllConfigs = (state) => state.transparency.configs;
export const selectCurrentConfig = (state) => state.transparency.currentConfig;
export const selectCurrentTransparency = (state) => state.transparency.currentTransparency;
export const selectLoading = (state) => state.transparency.loading;
export const selectSaving = (state) => state.transparency.saving;
export const selectError = (state) => state.transparency.error;
export const selectRestoredFromStorage = (state) => state.transparency.restoredFromStorage;

// 导出reducer
export default transparencySlice.reducer;