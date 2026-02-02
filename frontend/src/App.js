import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import MainLayout from './layout/MainLayout';
import Home from './pages/Home';
import TagFilter from './pages/TagFilter';
import Quotes from './pages/Quotes';
import Attachments from './pages/Attachments';
import Settings from './pages/Settings';
import Login from './pages/Login';
import NotFound from './pages/NotFound';
import CustomPage from './pages/CustomPage';
import AIChat from './pages/AIChat';
import AIChatTest from './pages/AIChatTest';
import ProtectedRoute from './components/ProtectedRoute';
import { checkAuth, selectIsAuthenticated } from './store/authSlice';
import { fetchAttachmentConfig } from './store/attachmentsSlice';
import { fetchAllPages } from './store/customPagesSlice';
import { TransparencyProvider } from './contexts/TransparencyContext';

function App() {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(selectIsAuthenticated);

  // 应用启动时检查登录态（Cookie）
  useEffect(() => {
    dispatch(checkAuth());
  }, [dispatch]);

  // 登录后获取附件配置和自定义页面列表
  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchAttachmentConfig());
      // 同时获取自定义页面列表
      dispatch(fetchAllPages());
    }
  }, [dispatch, isAuthenticated]);

  return (
    <TransparencyProvider>
      <Routes>
      {/* 登录页面 - 不需要认证 */}
      <Route path="/登录" element={<Login />} />
      
      {/* 受保护的路由 */}
      <Route path="/" element={
        <ProtectedRoute>
          <MainLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Home />} />
        {/* 兼容旧链接：/笔记 -> /标签筛选 */}
        <Route path="/笔记" element={<Navigate to="/标签筛选" replace />} />
        <Route path="/标签筛选" element={<TagFilter />} />
        {/* 兼容旧链接：/引用体 -> /收藏夹 */}
        <Route path="/引用体" element={<Navigate to="/收藏夹" replace />} />
        <Route path="/收藏夹" element={<Quotes />} />
        <Route path="/附件" element={<Attachments />} />
        <Route path="/设置" element={<Settings />} />
        <Route path="/AI-Chat" element={<AIChat />} />
        <Route path="/AI-Chat-Test" element={<AIChatTest />} />
        <Route path="/自定义/:name" element={<CustomPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
      </Routes>
    </TransparencyProvider>
  );
}

export default App;
