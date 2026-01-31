import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Container,
  AppBar,
  Toolbar,
  IconButton,
  Snackbar,
  Alert,
  Button,
  Tabs,
  Tab
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Image as ImageIcon,
  VideoLibrary as VideoIcon,
  Description as DocumentIcon,
  Code as CodeIcon
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { useDispatch, useSelector } from 'react-redux';
import AttachmentGrid from '../components/AttachmentGrid';
import AttachmentDetailModal from '../components/legacy/AttachmentDetailModal';
import AttachmentUploadButton from '../components/AttachmentUploadButton';
import {
  selectAttachmentsError,
  clearError,
  selectAttachmentsStats,
  setSelectedAttachment,
  setModalOpen,
  fetchAttachmentConfig,
  selectAttachmentConfigStatus
} from '../store/attachmentsSlice';
import { selectIsAuthenticated } from '../store/authSlice';
import {
  openAttachmentWindowAndFetch
} from '../store/windowsSlice';

// 样式化容器
const StyledContainer = styled(Container)(({ theme }) => ({
  paddingTop: theme.spacing(2),
  paddingBottom: theme.spacing(2),
  minHeight: '100vh',
}));

// 样式化页面标题
const PageTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 600,
  marginBottom: theme.spacing(3),
}));

// 样式化操作栏
const ActionBar = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: theme.spacing(3),
}));

// 样式化左侧操作
const LeftActions = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(2),
  alignItems: 'center',
}));

// 样式化右侧操作
const RightActions = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(1),
}));

/**
 * 附件管理页面
 */
const AttachmentsPage = () => {
  const dispatch = useDispatch();
  const error = useSelector(selectAttachmentsError);
  const stats = useSelector(selectAttachmentsStats);
  const configStatus = useSelector(selectAttachmentConfigStatus);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [currentTab, setCurrentTab] = useState(0); // 0: 图片, 1: 视频, 2: 文档, 3: 程序与脚本
  
  // 获取当前选中的类别
  const getCurrentCategory = () => {
    switch (currentTab) {
      case 0: return 'image';
      case 1: return 'video';
      case 2: return 'document';
      case 3: return 'script';
      default: return 'image';
    }
  };

  // 处理关闭错误提示
  const handleCloseError = () => {
    dispatch(clearError());
  };

  // 处理关闭Snackbar
  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  // 处理上传成功
  const handleUploadSuccess = (result) => {
    setSnackbarOpen(true);
  };

  // 处理上传错误
  const handleUploadError = (error) => {
    console.error('上传失败:', error);
  };

  // 处理查看附件
  const handleViewAttachment = async (attachment) => {
    try {
      // 使用新的附件窗口系统
      await dispatch(openAttachmentWindowAndFetch({
        attachmentId: attachment._id,
        label: attachment.originalName || '查看详情',
        source: 'attachments-page',
        initialData: attachment
      })).unwrap();
    } catch (error) {
      console.error('打开附件窗口失败:', error);
      
      // 如果是401错误（未授权），提示用户登录
      if (error.message?.includes('401') || error.message?.includes('未授权')) {
        alert('访问附件需要登录，请先登录系统');
        return;
      }
      
      // 其他错误情况，使用旧的模态框作为兜底
      console.log('新窗口系统失败，回退使用旧的模态框');
      dispatch(setSelectedAttachment(attachment));
      dispatch(setModalOpen(true));
    }
  };

  // 处理删除附件
  const handleDeleteAttachment = (attachmentId) => {
    // 通过Redux状态管理来处理删除
    // 这里不需要额外处理，因为AttachmentCard已经处理了
  };

  // 格式化文件大小
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };
  
  // 处理标签页切换
  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  // 获取附件配置
  useEffect(() => {
    if (isAuthenticated && configStatus === 'idle') {
      dispatch(fetchAttachmentConfig());
    }
  }, [dispatch, configStatus, isAuthenticated]);

  // 渲染统计信息
  const renderStats = () => {
    if (!showStats || !stats) return null;

    return (
      <Box sx={{
        p: 2,
        mb: 3,
        borderRadius: 2,
        backgroundColor: 'background.paper',
        boxShadow: 1
      }}>
        <Typography variant="h6" gutterBottom>
          附件统计
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          <Box>
            <Typography variant="body2" color="text.secondary">
              总数
            </Typography>
            <Typography variant="h6">
              {stats.total || 0}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">
              总大小
            </Typography>
            <Typography variant="h6">
              {formatFileSize(stats.sizeInfo?.totalSize || 0)}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">
              图片数量
            </Typography>
            <Typography variant="h6">
              {stats.images || 0}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">
              视频数量
            </Typography>
            <Typography variant="h6">
              {stats.videos || 0}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">
              文档数量
            </Typography>
            <Typography variant="h6">
              {stats.documents || 0}
            </Typography>
          </Box>
          {stats.categorySizeInfo && (
            <>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  图片大小
                </Typography>
                <Typography variant="h6">
                  {formatFileSize(stats.categorySizeInfo.image?.totalSize || 0)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  视频大小
                </Typography>
                <Typography variant="h6">
                  {formatFileSize(stats.categorySizeInfo.video?.totalSize || 0)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  文档大小
                </Typography>
                <Typography variant="h6">
                  {formatFileSize(stats.categorySizeInfo.document?.totalSize || 0)}
                </Typography>
              </Box>
            </>
          )}
        </Box>
      </Box>
    );
  };

  return (
    <StyledContainer maxWidth="xl">
      <AppBar position="static" color="default" elevation={0}>
        <Toolbar>
          <PageTitle variant="h4" component="h1">
            附件管理
          </PageTitle>
          <Box sx={{ flexGrow: 1 }} />
          <RightActions>
            <Button
              variant="text"
              onClick={() => setShowStats(!showStats)}
              sx={{ mr: 1 }}
            >
              {showStats ? '隐藏统计' : '显示统计'}
            </Button>
            <IconButton color="inherit">
              <SettingsIcon />
            </IconButton>
          </RightActions>
        </Toolbar>
      </AppBar>

      {renderStats()}

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={currentTab} onChange={handleTabChange} aria-label="attachment categories">
          <Tab
            icon={<ImageIcon />}
            label="图片"
            iconPosition="start"
          />
          <Tab
            icon={<VideoIcon />}
            label="视频"
            iconPosition="start"
          />
          <Tab
            icon={<DocumentIcon />}
            label="文档"
            iconPosition="start"
          />
          <Tab
            icon={<CodeIcon />}
            label="程序与脚本"
            iconPosition="start"
          />
        </Tabs>
      </Box>

      <ActionBar>
        <LeftActions>
          <Typography variant="body1" color="text.secondary">
            {isAuthenticated ? '已登录' : '未登录'}
          </Typography>
        </LeftActions>
        <RightActions>
          <AttachmentUploadButton
            category={getCurrentCategory()}
            onUploadSuccess={handleUploadSuccess}
            onUploadError={handleUploadError}
          />
        </RightActions>
      </ActionBar>

      <AttachmentGrid
        category={getCurrentCategory()}
        onViewAttachment={handleViewAttachment}
        onDeleteAttachment={handleDeleteAttachment}
      />

      <AttachmentDetailModal />

      {/* 错误提示 */}
      {error && (
        <Snackbar
          open={!!error}
          autoHideDuration={6000}
          onClose={handleCloseError}
        >
          <Alert onClose={handleCloseError} severity="error" sx={{ width: '100%' }}>
            {error}
          </Alert>
        </Snackbar>
      )}

      {/* 上传成功提示 */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
      >
        <Alert onClose={handleCloseSnackbar} severity="success" sx={{ width: '100%' }}>
          附件上传成功
        </Alert>
      </Snackbar>

    </StyledContainer>
  );
};

export default AttachmentsPage;
