/**
 * 认证状态管理
 * 处理用户登录、登出和认证状态
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import authService from '../services/auth';
import { clearAuthToken, setAuthToken } from '../services/authToken';

// 异步 thunk：用户登录
export const login = createAsyncThunk(
  'auth/login',
  async ({ username, password }, { rejectWithValue }) => {
    try {
      const response = await authService.login(username, password);
      
      if (response.success && response.data && response.data.user) {
        const token = response.data.token;
        if (token) setAuthToken(token);
        else clearAuthToken();

        return {
          user: response.data.user,
          isAuthenticated: true
        };
      }
      
      throw new Error('登录响应格式错误');
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || '登录失败'
      );
    }
  }
);

// 异步 thunk：检查当前登录态（Cookie 登录态）
export const checkAuth = createAsyncThunk(
  'auth/checkAuth',
  async (_, { rejectWithValue }) => {
    try {
      const response = await authService.getCurrentUser();
      
      if (response.success && response.data) {
        return {
          user: response.data.user,
          isAuthenticated: true
        };
      }
      
      throw new Error('获取用户信息响应格式错误');
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || '未登录'
      );
    }
  }
);

// 异步 thunk：用户登出
export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      try {
        await authService.logout();
      } finally {
        clearAuthToken();
      }
      return { isAuthenticated: false };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || '登出失败'
      );
    }
  }
);

// 初始状态
const initialState = {
  user: null,
  isAuthenticated: false,
  initialized: false,
  isLoading: false,
  error: null
};

// 创建 slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // 清除错误
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // 登录
    builder
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.initialized = true;
        state.error = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.initialized = true;
        state.error = action.payload;
      });
    
    // 检查登录态
    builder
      .addCase(checkAuth.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(checkAuth.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.initialized = true;
        state.error = null;
      })
      .addCase(checkAuth.rejected, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.initialized = true;
        state.error = action.payload;
      });
    
    // 登出
    builder
      .addCase(logout.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(logout.fulfilled, (state) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.initialized = true;
        state.error = null;
      })
      .addCase(logout.rejected, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.initialized = true;
        state.error = action.payload;
      });
  }
});

// 导出 actions
export const { clearError } = authSlice.actions;

// 选择器
export const selectAuth = (state) => state.auth;
export const selectUser = (state) => state.auth.user;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectAuthInitialized = (state) => state.auth.initialized;
export const selectAuthLoading = (state) => state.auth.isLoading;
export const selectAuthError = (state) => state.auth.error;

// 导出 reducer
export default authSlice.reducer;
