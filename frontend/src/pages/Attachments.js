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
  Tab,
  Fab,
  Badge
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Image as ImageIcon,
  VideoLibrary as VideoIcon,
  Description as DocumentIcon,
  Code as CodeIcon,
  CloudUpload as UploadIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { useDispatch, useSelector } from 'react-redux';
import AttachmentGrid from '../components/AttachmentGrid';
import AttachmentDetailModal from '../components/legacy/AttachmentDetailModal';
import AttachmentUploadButton from '../components/AttachmentUploadButton';
import AttachmentUploadTasksPanel from '../components/AttachmentUploadTasksPanel';
import {
  selectAttachmentsError,
  clearError,
  selectAttachmentsStats,
  setSelectedAttachment,
  setModalOpen,
  upsertAttachment,
  fetchAttachmentConfig,
  selectAttachmentConfigStatus
} from '../store/attachmentsSlice';
import { selectIsAuthenticated } from '../store/authSlice';
import {
  openAttachmentWindowAndFetch
} from '../store/windowsSlice';
import { isTauri, listen } from '../services/tauriBridge';
import { useAttachmentUploadManager } from '../hooks/useAttachmentUploadManager';

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

const StyledContainer = styled(Container)(({ theme }) => ({
  paddingTop: theme.spacing(2),
  paddingBottom: theme.spacing(2),
  minHeight: '100vh',
}));

// 鏍峰紡鍖栭〉闈㈡爣棰?
const PageTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 600,
  marginBottom: theme.spacing(3),
}));

// 鏍峰紡鍖栨搷浣滄爮
const ActionBar = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: theme.spacing(3),
}));

// 鏍峰紡鍖栧乏渚ф搷浣?
const LeftActions = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(2),
  alignItems: 'center',
}));

// 鏍峰紡鍖栧彸渚ф搷浣?
const RightActions = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(1),
}));

/**
 * 闄勪欢绠＄悊椤甸潰
 */
const AttachmentsPage = () => {
  const dispatch = useDispatch();
  const error = useSelector(selectAttachmentsError);
  const stats = useSelector(selectAttachmentsStats);
  const configStatus = useSelector(selectAttachmentConfigStatus);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  
  const uploadButtonRef = useRef(null);
  const currentCategoryRef = useRef('image');
  const uploadPanelRef = useRef(null);
  const uploadFabRef = useRef(null);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [currentTab, setCurrentTab] = useState(0); // 0:image, 1:video, 2:document, 3:script
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploadPanelOpen, setUploadPanelOpen] = useState(false);

  const uploadManager = useAttachmentUploadManager({
    onUploaded: (attachment) => {
      dispatch(upsertAttachment(attachment));
      setSnackbarOpen(true);
    }
  });
  
  // 获取当前选中的分类
  const getCurrentCategory = () => {
    switch (currentTab) {
      case 0: return 'image';
      case 1: return 'video';
      case 2: return 'document';
      case 3: return 'script';
      default: return 'image';
    }
  };

  // 澶勭悊鍏抽棴閿欒鎻愮ず
  const handleCloseError = () => {
    dispatch(clearError());
  };

  // 澶勭悊鍏抽棴Snackbar
  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  // 澶勭悊涓婁紶鎴愬姛
  const handleUploadSuccess = (result) => {
    setSnackbarOpen(true);
  };

  // 澶勭悊涓婁紶閿欒
  const handleUploadError = (error) => {
    console.error('上传失败:', error);
  };

  const uploadFilesToCurrentCategory = useCallback(async (files, source) => {
    if (!files || files.length === 0) return;

    const category = currentCategoryRef.current || 'image';

    try {
      await uploadButtonRef.current?.uploadFiles(files, category);
    } catch (e) {
      // 閿欒鎻愮ず鐢?Redux error/snackbar 鍏滃簳
    }
  }, []);

  // 澶勭悊鏌ョ湅闄勪欢
  const handleViewAttachment = async (attachment) => {
    try {
      // 浣跨敤鏂扮殑闄勪欢绐楀彛绯荤粺
      await dispatch(openAttachmentWindowAndFetch({
        attachmentId: attachment._id,
        label: attachment.originalName || '查看详情',
        source: 'attachments-page',
        initialData: attachment
      })).unwrap();
    } catch (error) {
      console.error('打开附件窗口失败:', error);
      
      if (error.message?.includes('401') || error.message?.includes('未授权')) {
        alert('访问附件需要登录，请先登录系统');
        return;
      }
      
      console.log('新窗口系统失败，回退使用旧的模态框');
      dispatch(setSelectedAttachment(attachment));
      dispatch(setModalOpen(true));
    }
  };

  // 澶勭悊鍒犻櫎闄勪欢
  const handleDeleteAttachment = (attachmentId) => {
    // 閫氳繃Redux鐘舵€佺鐞嗘潵澶勭悊鍒犻櫎
    // 杩欓噷涓嶉渶瑕侀澶栧鐞嗭紝鍥犱负AttachmentCard宸茬粡澶勭悊浜?
  };

  // 鏍煎紡鍖栨枃浠跺ぇ灏?
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };
  
  // 澶勭悊鏍囩椤靛垏鎹?
  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const handleToggleUploadPanel = () => {
    setUploadPanelOpen((prev) => !prev);
  };

  const handleCloseUploadPanel = () => {
    setUploadPanelOpen(false);
  };

  // 鑾峰彇闄勪欢閰嶇疆
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

  useEffect(() => {
    if (!uploadPanelOpen) {
      return undefined;
    }

    const handleOutsidePointerDown = (event) => {
      const panelElement = uploadPanelRef.current;
      const fabElement = uploadFabRef.current;
      const target = event.target;

      if (panelElement && panelElement.contains(target)) {
        return;
      }

      if (fabElement && fabElement.contains(target)) {
        return;
      }

      setUploadPanelOpen(false);
    };

    document.addEventListener('mousedown', handleOutsidePointerDown);
    document.addEventListener('touchstart', handleOutsidePointerDown);

    return () => {
      document.removeEventListener('mousedown', handleOutsidePointerDown);
      document.removeEventListener('touchstart', handleOutsidePointerDown);
    };
  }, [uploadPanelOpen]);

  // 鏀寔 Ctrl+V 绮樿创鏂囦欢/鎴浘鍒伴檮浠堕〉杩涜涓婁紶
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

  const inferCategoryFromPath = (path) => {
    const raw = String(path || '').trim();
    if (!raw) return '';

    const normalized = raw.replace(/\\/g, '/');
    const name = normalized.split('/').pop() || '';
    const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : '';
    if (!ext) return '';

    const imageExts = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'ico', 'tiff', 'tif']);
    const videoExts = new Set(['mp4', 'webm', 'ogg', 'mov', 'mkv', 'avi', 'flv', 'm4v']);
    const documentExts = new Set([
      'pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx',
      'txt', 'md', 'markdown', 'html', 'htm', 'csv', 'json',
    ]);
    const scriptExts = new Set([
      'js', 'ts', 'jsx', 'tsx', 'py', 'sh', 'bat', 'ps1', 'rb', 'go', 'rs', 'java', 'c', 'cpp', 'h', 'hpp',
    ]);

    if (imageExts.has(ext)) return 'image';
    if (videoExts.has(ext)) return 'video';
    if (documentExts.has(ext)) return 'document';
    if (scriptExts.has(ext)) return 'script';
    return '';
  };

  // 桌面端拖拽：使用 Tauri 的 drag-drop 事件
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

          try {
            const fallbackCategory = currentCategoryRef.current || 'image';
            const groups = new Map();

            for (const p of paths) {
              const trimmed = String(p || '').trim();
              if (!trimmed) continue;
              const inferred = inferCategoryFromPath(trimmed) || fallbackCategory;
              const arr = groups.get(inferred) || [];
              arr.push(trimmed);
              groups.set(inferred, arr);
            }

            for (const [cat, groupPaths] of groups.entries()) {
              if (!groupPaths || groupPaths.length === 0) continue;
              await uploadButtonRef.current?.uploadPaths(groupPaths, cat);
            }
          } catch (e) {
            // 閿欒鎻愮ず鐢?Redux error/snackbar 鍏滃簳
          }
        });
      } catch (e) {
        console.warn('Tauri drag-drop 监听失败:', e);
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

  // 娓叉煋缁熻淇℃伅
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
            onQueueFiles={uploadManager.enqueueFiles}
            onQueuePaths={uploadManager.enqueuePaths}
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

      <Fab
        ref={uploadFabRef}
        color="primary"
        aria-label="上传进度"
        onClick={handleToggleUploadPanel}
        sx={{
          position: 'fixed',
          right: 24,
          bottom: 24,
          zIndex: (theme) => theme.zIndex.drawer + 1,
        }}
      >
        <Badge
          color="error"
          badgeContent={uploadManager.tasks.length}
          max={99}
        >
          <UploadIcon />
        </Badge>
      </Fab>

      {uploadPanelOpen && (
        <Box
          ref={uploadPanelRef}
          sx={{
            position: 'fixed',
            right: 24,
            bottom: 96,
            width: { xs: 'calc(100vw - 32px)', sm: 440 },
            maxHeight: '70vh',
            overflowY: 'auto',
            zIndex: (theme) => theme.zIndex.drawer + 1,
          }}
        >
          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              backgroundColor: 'background.paper',
              boxShadow: 8,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                上传进度
              </Typography>
              <IconButton size="small" onClick={handleCloseUploadPanel} aria-label="关闭上传进度面板">
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>

            {uploadManager.tasks.length > 0 ? (
              <Box sx={{ '& .MuiPaper-root': { mb: 0 } }}>
                <AttachmentUploadTasksPanel
                  tasks={uploadManager.tasks}
                  stats={uploadManager.stats}
                  onPause={uploadManager.pauseTask}
                  onResume={uploadManager.resumeTask}
                  onCancel={uploadManager.cancelTask}
                  onClearFinished={uploadManager.clearFinished}
                />
              </Box>
            ) : (
              <Box
                sx={{
                  p: 3,
                  borderRadius: 2,
                  backgroundColor: 'background.paper',
                  boxShadow: 1,
                  textAlign: 'center',
                  color: 'text.secondary',
                }}
              >
                <Typography variant="h6" sx={{ mb: 1 }}>
                  暂无上传任务
                </Typography>
                <Typography variant="body2">
                  开始上传后，这里会显示任务进度。
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      )}

      <AttachmentDetailModal />

      {/* 閿欒鎻愮ず */}
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

      {/* 涓婁紶鎴愬姛鎻愮ず */}
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

