import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import MainLayout from './layout/MainLayout';
import Home from './pages/Home';
import TagFilter from './pages/TagFilter';
import Quotes from './pages/Quotes';
import Attachments from './pages/Attachments';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';
import CustomPage from './pages/CustomPage';
import AIChat from './pages/AIChat';
import AIChatTest from './pages/AIChatTest';
import ProtectedRoute from './components/ProtectedRoute';
import { checkAuth, resetAuthState, selectIsAuthenticated } from './store/authSlice';
import { fetchAttachmentConfig } from './store/attachmentsSlice';
import { fetchAllPages } from './store/customPagesSlice';
import { TransparencyProvider } from './contexts/TransparencyContext';
import { getServerUrl } from './services/serverConfig';

function App() {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(selectIsAuthenticated);

  // 应用启动时：如果已配置服务器，尝试恢复登录态
  useEffect(() => {
    const serverUrl = getServerUrl();
    if (serverUrl) {
      dispatch(checkAuth());
    }
  }, [dispatch]);

  // 切换服务器后：清空 auth slice，并重新检查登录态
  useEffect(() => {
    const handler = () => {
      dispatch(resetAuthState());
      const serverUrl = getServerUrl();
      if (serverUrl) {
        dispatch(checkAuth());
      }
    };

    window.addEventListener('pdh-auth-reset', handler);
    return () => window.removeEventListener('pdh-auth-reset', handler);
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
        <Route path="/" element={<MainLayout />}>
          {/* 兼容旧链接：/登录 -> /设置 */}
          <Route path="/登录" element={<Navigate to="/设置" replace />} />
          <Route
            index
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />
          {/* 兼容旧链接：/笔记 -> /标签筛选 */}
          <Route path="/笔记" element={<Navigate to="/标签筛选" replace />} />
          <Route
            path="/标签筛选"
            element={
              <ProtectedRoute>
                <TagFilter />
              </ProtectedRoute>
            }
          />
          {/* 兼容旧链接：/引用体 -> /收藏夹 */}
          <Route path="/引用体" element={<Navigate to="/收藏夹" replace />} />
          <Route
            path="/收藏夹"
            element={
              <ProtectedRoute>
                <Quotes />
              </ProtectedRoute>
            }
          />
          <Route
            path="/附件"
            element={
              <ProtectedRoute>
                <Attachments />
              </ProtectedRoute>
            }
          />

          {/* 设置页不需要登录，用于添加/切换服务器 */}
          <Route path="/设置" element={<Settings />} />

          <Route
            path="/AI-Chat"
            element={
              <ProtectedRoute>
                <AIChat />
              </ProtectedRoute>
            }
          />
          <Route
            path="/AI-Chat-Test"
            element={
              <ProtectedRoute>
                <AIChatTest />
              </ProtectedRoute>
            }
          />
          <Route
            path="/自定义/:name"
            element={
              <ProtectedRoute>
                <CustomPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </TransparencyProvider>
  );
}

export default App;
