/**
 * 受保护路由组件
 * 检查用户是否已登录，未登录则重定向到登录页面
 */

import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { selectIsAuthenticated, selectAuthToken, restoreAuth } from '../store/authSlice';

/**
 * 受保护路由组件
 * @param {Object} props - 组件属性
 * @param {React.ReactNode} props.children - 子组件
 * @param {boolean} props.requireAuth - 是否需要认证（默认为 true）
 */
const ProtectedRoute = ({ children, requireAuth = true }) => {
  const dispatch = useDispatch();
  const location = useLocation();
  
  // Redux 状态
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const authToken = useSelector(selectAuthToken);

  // 组件挂载时尝试恢复认证状态
  useEffect(() => {
    if (authToken && !isAuthenticated) {
      dispatch(restoreAuth());
    }
  }, [dispatch, authToken, isAuthenticated]);

  // 如果不需要认证，直接渲染子组件
  if (!requireAuth) {
    return children;
  }

  // 如果未认证，重定向到登录页面，并保存当前路径
  if (!isAuthenticated) {
    return (
      <Navigate 
        to="/登录" 
        state={{ from: location }} 
        replace 
      />
    );
  }

  // 如果已认证，渲染子组件
  return children;
};

export default ProtectedRoute;