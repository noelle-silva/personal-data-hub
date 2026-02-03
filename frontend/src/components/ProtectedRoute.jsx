/**
 * 受保护路由组件
 * 检查是否已连接/登录；未满足则重定向到设置页
 */

import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { checkAuth, selectAuthInitialized, selectIsAuthenticated } from '../store/authSlice';
import { Box, CircularProgress } from '@mui/material';
import { getServerUrl } from '../services/serverConfig';

/**
 * 受保护路由组件
 * @param {Object} props - 组件属性
 * @param {React.ReactNode} props.children - 子组件
 * @param {boolean} props.requireAuth - 是否需要认证（默认为 true）
 */
const ProtectedRoute = ({ children, requireAuth = true }) => {
  const dispatch = useDispatch();
  const location = useLocation();
  const serverUrl = getServerUrl();
  
  // Redux 状态
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const initialized = useSelector(selectAuthInitialized);

  // 组件挂载时尝试检查登录态（避免刷新后直接误判未登录）
  useEffect(() => {
    if (requireAuth && serverUrl && !initialized) {
      dispatch(checkAuth());
    }
  }, [dispatch, initialized, requireAuth, serverUrl]);

  // 如果不需要认证，直接渲染子组件
  if (!requireAuth) {
    return children;
  }

  // 未配置服务器：统一引导到设置页
  if (!serverUrl) {
    return <Navigate to="/设置" state={{ from: location, reason: 'need-server' }} replace />;
  }

  // 还没完成登录态检查：给个最小 loading，避免闪跳登录页
  if (!initialized) {
    return (
      <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  // 如果未认证，重定向到设置页面，并保存当前路径
  if (!isAuthenticated) {
    return (
      <Navigate 
        to="/设置"
        state={{ from: location, reason: 'need-auth' }}
        replace 
      />
    );
  }

  // 如果已认证，渲染子组件
  return children;
};

export default ProtectedRoute;
