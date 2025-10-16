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
import ProtectedRoute from './components/ProtectedRoute';
import { restoreAuth, selectAttachmentToken } from './store/authSlice';
import { fetchAttachmentConfig } from './store/attachmentsSlice';
import { fetchAllPages } from './store/customPagesSlice';

function App() {
  const dispatch = useDispatch();
  const attachmentToken = useSelector(selectAttachmentToken);

  // 应用启动时尝试恢复认证状态
  useEffect(() => {
    dispatch(restoreAuth());
  }, [dispatch]);

  // 监听认证成功，如果有附件令牌则获取附件配置
  useEffect(() => {
    if (attachmentToken) {
      dispatch(fetchAttachmentConfig());
      // 同时获取自定义页面列表
      dispatch(fetchAllPages());
    }
  }, [dispatch, attachmentToken]);

  return (
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
        <Route path="/自定义/:name" element={<CustomPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

export default App;
