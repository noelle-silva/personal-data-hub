/**
 * 认证状态管理
 * 处理用户登录、登出和认证状态
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import authService from '../services/auth';
import { fetchAttachmentConfig } from './attachmentsSlice';

// 异步 thunk：用户登录
export const login = createAsyncThunk(
  'auth/login',
  async ({ username, password }, { rejectWithValue }) => {
    try {
      const response = await authService.login(username, password);
      
      // 存储认证信息到 localStorage
      if (response.success && response.data) {
        const { token, attachmentToken, user } = response.data;
        
        // 存储 JWT Token
        localStorage.setItem('authToken', token);
        
        // 如果有附件令牌，也存储
        if (attachmentToken) {
          localStorage.setItem('attachmentBearerToken', attachmentToken);
        }
        
        // 存储用户信息
        localStorage.setItem('authUser', JSON.stringify(user));
        
        return {
          token,
          attachmentToken,
          user,
          isAuthenticated: true,
          // 标记需要获取附件配置
          shouldFetchAttachmentConfig: !!attachmentToken
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

// 异步 thunk：获取当前用户信息
export const getCurrentUser = createAsyncThunk(
  'auth/getCurrentUser',
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
        error.response?.data?.message || error.message || '获取用户信息失败'
      );
    }
  }
);

// 异步 thunk：用户登出
export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      // 调用登出 API（虽然 JWT 是无状态的，但可以用于记录日志等）
      await authService.logout();
      
      // 清除本地存储
      localStorage.removeItem('authToken');
      localStorage.removeItem('attachmentBearerToken');
      localStorage.removeItem('authUser');
      
      return { isAuthenticated: false };
    } catch (error) {
      // 即使 API 调用失败，也要清除本地存储
      localStorage.removeItem('authToken');
      localStorage.removeItem('attachmentBearerToken');
      localStorage.removeItem('authUser');
      
      return rejectWithValue(
        error.response?.data?.message || error.message || '登出失败'
      );
    }
  }
);

// 初始状态
const initialState = {
  user: null,
  token: localStorage.getItem('authToken'),
  attachmentToken: localStorage.getItem('attachmentBearerToken'),
  isAuthenticated: false,
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
    
    // 从本地存储恢复认证状态
    restoreAuth: (state) => {
      const token = localStorage.getItem('authToken');
      const attachmentToken = localStorage.getItem('attachmentBearerToken');
      const userStr = localStorage.getItem('authUser');
      
      if (token && userStr) {
        try {
          const user = JSON.parse(userStr);
          state.token = token;
          state.attachmentToken = attachmentToken;
          state.user = user;
          state.isAuthenticated = true;
        } catch (error) {
          console.error('恢复认证状态失败:', error);
          // 清除无效的本地存储
          localStorage.removeItem('authToken');
          localStorage.removeItem('attachmentBearerToken');
          localStorage.removeItem('authUser');
        }
      }
    }
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
        state.token = action.payload.token;
        state.attachmentToken = action.payload.attachmentToken;
        state.error = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        state.attachmentToken = null;
        state.error = action.payload;
      });
    
    // 获取当前用户信息
    builder
      .addCase(getCurrentUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getCurrentUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.error = null;
      })
      .addCase(getCurrentUser.rejected, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        state.attachmentToken = null;
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
        state.token = null;
        state.attachmentToken = null;
        state.error = null;
      })
      .addCase(logout.rejected, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        state.attachmentToken = null;
        state.error = action.payload;
      });
  }
});

// 导出 actions
export const { clearError, restoreAuth } = authSlice.actions;

// 选择器
export const selectAuth = (state) => state.auth;
export const selectUser = (state) => state.auth.user;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectAuthLoading = (state) => state.auth.isLoading;
export const selectAuthError = (state) => state.auth.error;
export const selectAuthToken = (state) => state.auth.token;
export const selectAttachmentToken = (state) => state.auth.attachmentToken;

// 导出 reducer
export default authSlice.reducer;