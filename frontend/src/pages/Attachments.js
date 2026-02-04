import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { isTauri, listen } from '../services/tauriBridge';

const getCategoryLabel = (category) => {
  switch (category) {
    case 'video': return '视频';
    case 'document': return '文档';
    case 'script': return '程序与脚本';
    default: return '图片';
  }
};

const extractFilesFromClipboard = (clipboardData) => {
  const fileList = clipboardData?.files;
  if (fileList && fileList.length > 0) {
    return Array.from(fileList);
  }

  const items = Array.from(clipboardData?.items || []);
  const files = items
    .filter((item) => item.kind === 'file')
    .map((item) => item.getAsFile())
    .filter(Boolean);

  return files;
};

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
  
  const uploadButtonRef = useRef(null);
  const currentCategoryRef = useRef('image');

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [currentTab, setCurrentTab] = useState(0); // 0: 图片, 1: 视频, 2: 文档, 3: 程序与脚本
  const [isDragActive, setIsDragActive] = useState(false);
  const [hintSnackbarOpen, setHintSnackbarOpen] = useState(false);
  const [hintSnackbarMessage, setHintSnackbarMessage] = useState('');
  
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

  const uploadFilesToCurrentCategory = useCallback(async (files, source) => {
    if (!files || files.length === 0) return;

    const category = currentCategoryRef.current || 'image';
    setHintSnackbarMessage(`${source}：已选择 ${files.length} 个文件，开始上传到「${getCategoryLabel(category)}」`);
    setHintSnackbarOpen(true);

    try {
      await uploadButtonRef.current?.uploadFiles(files, category);
    } catch (e) {
      // 错误提示由 Redux error/snackbar 兜底
    }
  }, []);

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

  useEffect(() => {
    switch (currentTab) {
      case 1:
        currentCategoryRef.current = 'video';
        break;
      case 2:
        currentCategoryRef.current = 'document';
        break;
      case 3:
        currentCategoryRef.current = 'script';
        break;
      default:
        currentCategoryRef.current = 'image';
    }
  }, [currentTab]);

  // 支持 Ctrl+V 粘贴文件/截图到附件页进行上传
  useEffect(() => {
    const handlePaste = async (event) => {
      const files = extractFilesFromClipboard(event.clipboardData);
      if (!files || files.length === 0) return;

      event.preventDefault();
      await uploadFilesToCurrentCategory(files, '粘贴');
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [uploadFilesToCurrentCategory]);

  const extractPathsFromTauriDragPayload = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (payload && Array.isArray(payload.paths)) return payload.paths;
    return [];
  };

  // 桌面端拖拽：必须走 Tauri 的 drag-drop 事件（OS -> WebView 通常不会触发 DOM drag/drop）
  useEffect(() => {
    if (!isTauri()) return;

    let unlistenEnter = null;
    let unlistenOver = null;
    let unlistenLeave = null;
    let unlistenDrop = null;
    let alive = true;

    const setup = async () => {
      try {
        unlistenEnter = await listen('tauri://drag-enter', () => {
          if (!alive) return;
          setIsDragActive(true);
        });

        unlistenOver = await listen('tauri://drag-over', () => {
          if (!alive) return;
          setIsDragActive(true);
        });

        unlistenLeave = await listen('tauri://drag-leave', () => {
          if (!alive) return;
          setIsDragActive(false);
        });

        unlistenDrop = await listen('tauri://drag-drop', async (event) => {
          if (!alive) return;
          setIsDragActive(false);

          const paths = extractPathsFromTauriDragPayload(event?.payload);
          if (paths.length === 0) return;

          const category = currentCategoryRef.current || 'image';
          setHintSnackbarMessage(`拖拽：已选择 ${paths.length} 个文件，开始上传到「${getCategoryLabel(category)}」`);
          setHintSnackbarOpen(true);

          try {
            await uploadButtonRef.current?.uploadPaths(paths, category);
          } catch (e) {
            const msg = String(e?.message || e || '上传失败');
            setHintSnackbarMessage(`拖拽上传失败：${msg.slice(0, 160)}`);
            setHintSnackbarOpen(true);
          }
        });
      } catch (e) {
        console.warn('Tauri drag-drop 监听失败：', e);
      }
    };

    setup();

    return () => {
      alive = false;
      try { unlistenDrop?.(); } catch (_) {}
      try { unlistenEnter?.(); } catch (_) {}
      try { unlistenOver?.(); } catch (_) {}
      try { unlistenLeave?.(); } catch (_) {}
    };
  }, []);

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
          <Typography variant="body2" color="text.secondary">
            支持拖拽文件或 Ctrl+V 粘贴到当前分类上传
          </Typography>
        </LeftActions>
        <RightActions>
          <AttachmentUploadButton
            ref={uploadButtonRef}
            category={getCurrentCategory()}
            onUploadSuccess={handleUploadSuccess}
            onUploadError={handleUploadError}
          />
        </RightActions>
      </ActionBar>

      {isDragActive && (
        <Box
          sx={{
            position: 'fixed',
            inset: 0,
            zIndex: (theme) => theme.zIndex.modal + 2,
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.25)',
          }}
        >
          <Box
            sx={{
              px: 4,
              py: 3,
              borderRadius: 2,
              border: '2px dashed',
              borderColor: 'primary.main',
              backgroundColor: 'background.paper',
              boxShadow: 6,
              maxWidth: 520,
              textAlign: 'center',
            }}
          >
            <Typography variant="h6" gutterBottom>
              松开即可上传到「{getCategoryLabel(getCurrentCategory())}」
            </Typography>
            <Typography variant="body2" color="text.secondary">
              也支持 Ctrl+V 粘贴文件/截图
            </Typography>
          </Box>
        </Box>
      )}

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

      {/* 拖拽/粘贴提示 */}
      <Snackbar
        open={hintSnackbarOpen}
        autoHideDuration={2000}
        onClose={() => setHintSnackbarOpen(false)}
        message={hintSnackbarMessage}
      />

    </StyledContainer>
  );
};

export default AttachmentsPage;
