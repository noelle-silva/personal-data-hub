import React, { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import MainLayout from './layout/MainLayout';
import Home from './pages/Home';
import Notes from './pages/Notes';
import TagFilter from './pages/TagFilter';
import Quotes from './pages/Quotes';
import Attachments from './pages/Attachments';
import VideoTest from './pages/VideoTest';
import InteractiveTest from './pages/InteractiveTest';
import Settings from './pages/Settings';
import Login from './pages/Login';
import NotFound from './pages/NotFound';
import CustomPage from './pages/CustomPage';
import AIChat from './pages/AIChat';
import AIChatTest from './pages/AIChatTest';
import SSETest from './pages/SSETest';
import ShortcutTest from './pages/ShortcutTest';
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
        <Route path="/笔记" element={<Notes />} />
        <Route path="/标签筛选" element={<TagFilter />} />
        <Route path="/引用体" element={<Quotes />} />
        <Route path="/附件" element={<Attachments />} />
        <Route path="/视频测试" element={<VideoTest />} />
        <Route path="/交互测试" element={<InteractiveTest />} />
        <Route path="/设置" element={<Settings />} />
        <Route path="/AI-Chat" element={<AIChat />} />
        <Route path="/AI-Chat-Test" element={<AIChatTest />} />
        <Route path="/SSE-Test" element={<SSETest />} />
        <Route path="/快捷键测试" element={<ShortcutTest />} />
        <Route path="/自定义/:name" element={<CustomPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
      </Routes>
    </TransparencyProvider>
  );
}

export default App;
