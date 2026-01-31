import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Box,
  Fab,
  Typography,
  IconButton,
  Paper,
  Tooltip,
  List,
  ListItemButton,
  ListItemText,
  Divider,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import NoteIcon from '@mui/icons-material/Note';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import DocumentWindow from './DocumentWindow';
import QuoteWindow from './QuoteWindow';
import AttachmentWindow from './AttachmentWindow';
import WindowsLimitPrompt from './WindowsLimitPrompt';
import {
  selectAllWindows,
  selectActiveWindowId,
  selectIsLimitPromptOpen,
  closeWindow,
  activateWindow,
  minimizeWindow,
  setWindowPosition,
  setWindowSize,
  closeLimitPrompt,
  openWindowAndFetch,
  deleteAttachmentById,
  deleteDocumentById,
  deleteQuoteById,
  saveAttachmentReferences,
  saveDocumentQuoteReferences,
  saveDocumentReferences,
  saveQuoteAttachmentReferences,
  saveQuoteDocumentReferences,
  saveQuoteReferences,
  updateDocumentById,
  updateQuoteById
} from '../store/windowsSlice';
import {
  fetchDocumentById,
  openDocumentModal
} from '../store/documentsSlice';

// 窗口容器
const WindowsContainer = styled(Box)(({ theme }) => ({
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100vw',
  height: '100vh',
  pointerEvents: 'none',
  zIndex: theme.zIndex.modal,
}));

// 添加新窗口浮动按钮
const AddWindowFab = styled(Fab)(({ theme }) => ({
  position: 'fixed',
  bottom: 20,
  right: 20,
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  borderRadius: 16,
  zIndex: theme.zIndex.modal + 101,
  '&:hover': {
    backgroundColor: theme.palette.primary.dark,
  },
}));

const APP_DRAWER_WIDTH = 240;
const OPEN_NOTES_BAR_HEIGHT = 44;

const OpenNotesSidebar = styled(Paper, {
  shouldForwardProp: (prop) =>
    prop !== 'sidebarWidth' && prop !== 'expanded' && prop !== 'panelHeight' && prop !== 'dock'
})(({ theme, sidebarWidth, expanded, panelHeight, dock }) => ({
  position: 'fixed',
  top: 64, // 贴合 AppBar 底部（desktop）
  left: dock === 'left' ? 0 : 'auto',
  right: dock === 'right' ? 0 : 'auto',
  width: sidebarWidth,
  height: expanded ? panelHeight : OPEN_NOTES_BAR_HEIGHT,
  display: 'flex',
  flexDirection: 'column',
  borderRadius: dock === 'left'
    ? (expanded ? '0 20px 20px 0' : '0 999px 999px 0')
    : (expanded ? '20px 0 0 20px' : '999px 0 0 999px'),
  overflow: 'hidden',
  borderRight: dock === 'left' ? `1px solid ${theme.palette.divider}` : 'none',
  borderLeft: dock === 'right' ? `1px solid ${theme.palette.divider}` : 'none',
  backgroundColor: theme.palette.background.paper,
  // 必须低于浮动窗口（windowsSlice 的窗口 zIndex 从 ~1400 起），避免盖住窗口标题栏/按钮
  zIndex: theme.zIndex.modal - 10,
  pointerEvents: 'auto',
  transition: 'height 0.18s ease, border-radius 0.18s ease',
  boxShadow: 'none',
  [theme.breakpoints.up('md')]: {
    left: dock === 'left' ? APP_DRAWER_WIDTH : 'auto', // 避开左侧导航 Drawer（desktop）
  },
  [theme.breakpoints.down('sm')]: {
    top: 56, // 贴合 AppBar 底部（mobile）
  },
}));

const OpenNotesSidebarHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: theme.spacing(1, 1),
  minHeight: 44,
  borderBottom: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.default,
}));

const SidebarResizeHandle = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'dock',
})(({ theme, dock }) => ({
  position: 'absolute',
  top: 0,
  bottom: 0,
  right: dock === 'left' ? 0 : 'auto',
  left: dock === 'right' ? 0 : 'auto',
  width: 6,
  cursor: 'col-resize',
  touchAction: 'none',
  backgroundColor: 'transparent',
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
}));

const DocumentWindowsContainer = () => {
  const dispatch = useDispatch();
  const windows = useSelector(selectAllWindows);
  const activeWindowId = useSelector(selectActiveWindowId);
  const isLimitPromptOpen = useSelector(selectIsLimitPromptOpen);

  const OPEN_NOTES_SIDEBAR_MIN_WIDTH = 220;
  const OPEN_NOTES_SIDEBAR_MAX_WIDTH = 520;
  const OPEN_NOTES_SIDEBAR_DEFAULT_WIDTH = 280;

  const [openNotesSidebarHovering, setOpenNotesSidebarHovering] = useState(false);
  const [openNotesDockSide, setOpenNotesDockSide] = useState('left'); // 'left' | 'right'
  const [openNotesSidebarWidth, setOpenNotesSidebarWidth] = useState(OPEN_NOTES_SIDEBAR_DEFAULT_WIDTH);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const resizeRef = useRef({ startX: 0, startWidth: OPEN_NOTES_SIDEBAR_DEFAULT_WIDTH });
  const [viewport, setViewport] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
  }));

  const documentWindows = useMemo(() => {
    return windows
      .filter(w => !w.contentType || w.contentType === 'document')
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [windows]);

  const openNotesExpanded = openNotesSidebarHovering || isResizingSidebar;

  const openNotesPanelHeight = useMemo(() => {
    const headerHeight = OPEN_NOTES_BAR_HEIGHT;
    const rowHeight = 40; // ListItemButton(dense) 近似高度
    const dividerHeight = 1;
    const emptyHeight = 56;
    const footerPadding = 8;

    const desired = documentWindows.length === 0
      ? headerHeight + dividerHeight + emptyHeight + footerPadding
      : headerHeight + dividerHeight + (documentWindows.length * rowHeight);

    const topOffsetDesktop = viewport.width < 600 ? 56 : 64;
    const bottomMargin = 12;
    const maxHeight = Math.max(OPEN_NOTES_BAR_HEIGHT, viewport.height - topOffsetDesktop - bottomMargin);
    return Math.min(desired, maxHeight);
  }, [documentWindows.length, viewport.height, viewport.width]);

  useEffect(() => {
    const handleResize = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 侧边栏拖拽调整宽度
  useEffect(() => {
    if (!isResizingSidebar) return;

    const handlePointerMove = (e) => {
      const dx = e.clientX - resizeRef.current.startX;
      const nextWidth = openNotesDockSide === 'left'
        ? resizeRef.current.startWidth + dx
        : resizeRef.current.startWidth - dx;
      const clamped = Math.max(
        OPEN_NOTES_SIDEBAR_MIN_WIDTH,
        Math.min(OPEN_NOTES_SIDEBAR_MAX_WIDTH, nextWidth)
      );
      setOpenNotesSidebarWidth(clamped);
    };

    const handlePointerUp = () => {
      setIsResizingSidebar(false);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isResizingSidebar, openNotesDockSide]);
  
  // 管理背景滚动锁定状态
  useEffect(() => {
    // 检查是否存在活动且未最小化的窗口
    const activeWindow = windows.find(w => w.id === activeWindowId);
    const hasActiveWindow = activeWindow && !activeWindow.minimized;
    
    if (hasActiveWindow) {
      document.body.classList.add('has-active-floating-window');
    } else {
      document.body.classList.remove('has-active-floating-window');
    }
    
    // 清理函数：组件卸载时移除类名
    return () => {
      document.body.classList.remove('has-active-floating-window');
    };
  }, [windows, activeWindowId]);
  
  // 处理文档窗口保存
  const handleSaveDocument = async (id, documentData) => {
    try {
      const result = await dispatch(updateDocumentById({
        documentId: id,
        documentData
      })).unwrap();

      console.log('文档更新成功:', result);
    } catch (error) {
      console.error('更新文档失败:', error);
      const errorMessage = error.error || error.message || '更新文档失败，请重试';
      alert(errorMessage);
    }
  };
  
  // 处理文档窗口删除
  const handleDeleteDocument = async (id) => {
    try {
      const result = await dispatch(deleteDocumentById({ documentId: id })).unwrap();
      console.log('文档删除成功:', result);
    } catch (error) {
      console.error('删除文档失败:', error);
      const errorMessage = error.error || error.message || '删除文档失败，请重试';
      alert(errorMessage);
    }
  };
  
  // 处理文档引用关系保存
  const handleSaveDocumentReferences = async (id, referencedDocumentIds) => {
    try {
      const result = await dispatch(saveDocumentReferences({
        documentId: id,
        referencedDocumentIds
      })).unwrap();

      console.log('引用关系更新成功:', result);
      return result.document;
    } catch (error) {
      console.error('更新引用关系失败:', error);
      const errorMessage = error.error || error.message || '更新引用关系失败，请重试';
      alert(errorMessage);
      throw error;
    }
  };
  
  // 处理文档附件引用保存
  const handleSaveDocumentAttachmentReferences = async (id, referencedAttachmentIds) => {
    try {
      const result = await dispatch(saveAttachmentReferences({
        documentId: id,
        referencedAttachmentIds
      })).unwrap();

      console.log('文档附件引用关系更新成功:', result);
      return result.document;
    } catch (error) {
      console.error('更新文档附件引用关系失败:', error);
      const errorMessage = error.error || error.message || '更新文档附件引用关系失败，请重试';
      alert(errorMessage);
      throw error;
    }
  };

  // 处理引用体窗口保存
  const handleSaveQuote = async (id, quoteData) => {
    try {
      const result = await dispatch(updateQuoteById({
        quoteId: id,
        quoteData
      })).unwrap();

      console.log('引用体更新成功:', result);
    } catch (error) {
      console.error('更新引用体失败:', error);
      const errorMessage = error.error || error.message || '更新引用体失败，请重试';
      alert(errorMessage);
    }
  };

  // 处理引用体窗口删除
  const handleDeleteQuote = async (id) => {
    try {
      const result = await dispatch(deleteQuoteById({ quoteId: id })).unwrap();
      console.log('引用体删除成功:', result);
    } catch (error) {
      console.error('删除引用体失败:', error);
      const errorMessage = error.error || error.message || '删除引用体失败，请重试';
      alert(errorMessage);
    }
  };

  // 处理引用体引用关系保存
  const handleSaveQuoteReferences = async (id, referencedDocumentIds) => {
    try {
      const result = await dispatch(saveQuoteDocumentReferences({
        quoteId: id,
        referencedDocumentIds
      })).unwrap();

      console.log('引用体引用关系更新成功:', result);
      return result.quote;
    } catch (error) {
      console.error('更新引用体引用关系失败:', error);
      const errorMessage = error.error || error.message || '更新引用体引用关系失败，请重试';
      alert(errorMessage);
      throw error;
    }
  };
  
  // 处理引用引用体关系保存
  const handleSaveQuoteQuoteReferences = async (id, referencedQuoteIds) => {
    try {
      const result = await dispatch(saveQuoteReferences({
        quoteId: id,
        referencedQuoteIds
      })).unwrap();

      console.log('引用引用体关系更新成功:', result);
      return result.quote;
    } catch (error) {
      console.error('更新引用引用体关系失败:', error);
      const errorMessage = error.error || error.message || '更新引用引用体关系失败，请重试';
      alert(errorMessage);
      throw error;
    }
  };
  
  // 处理引用体附件引用保存
  const handleSaveQuoteAttachmentReferences = async (id, referencedAttachmentIds) => {
    try {
      const result = await dispatch(saveQuoteAttachmentReferences({
        quoteId: id,
        referencedAttachmentIds
      })).unwrap();

      console.log('引用体附件引用关系更新成功:', result);
      return result.quote;
    } catch (error) {
      console.error('更新引用体附件引用关系失败:', error);
      const errorMessage = error.error || error.message || '更新引用体附件引用关系失败，请重试';
      alert(errorMessage);
      throw error;
    }
  };

  // 处理文档引用体引用保存
  const handleSaveDocumentQuoteReferences = async (id, referencedQuoteIds) => {
    try {
      const result = await dispatch(saveDocumentQuoteReferences({
        documentId: id,
        referencedQuoteIds
      })).unwrap();
      
      console.log('文档引用体引用关系更新成功:', result);

      return result.document;
    } catch (error) {
      console.error('更新文档引用体引用关系失败:', error);
      const errorMessage = error.error || error.message || '更新文档引用体引用关系失败，请重试';
      alert(errorMessage);
      throw error;
    }
  };

  // 处理附件窗口删除
  const handleDeleteAttachment = async (id) => {
    try {
      const result = await dispatch(deleteAttachmentById({ attachmentId: id })).unwrap();
      console.log('附件删除成功:', result);
    } catch (error) {
      console.error('删除附件失败:', error);
      const errorMessage = error.error || error.message || '删除附件失败，请重试';
      alert(errorMessage);
    }
  };
  
  // 处理查看文档（在窗口中打开）
  const handleViewDocument = async (doc) => {
    const docId = doc._id || doc;
    const title = doc.title || '查看详情';
    
    try {
      // 使用新的窗口系统打开文档
      await dispatch(openWindowAndFetch({
        docId,
        label: title,
        source: 'window-content'
      })).unwrap();
    } catch (error) {
      console.error('打开文档窗口失败:', error);
      // 如果新窗口系统失败，使用原有的单窗口模态框作为后备
      dispatch(openDocumentModal({
        _id: docId,
        title: title,
        content: '加载中...',
        tags: doc.tags || [],
        source: doc.source || ''
      }));
      
      // 获取完整数据
      dispatch(fetchDocumentById(docId));
    }
  };
  
  // 处理限制提示继续
  const handleLimitPromptContinue = () => {
    dispatch(closeLimitPrompt());
    
    // 这里可以添加强制创建新窗口的逻辑
    // 由于我们已经关闭了提示，用户需要再次触发打开操作
  };
  
  // 处理 ESC 键
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && activeWindowId) {
        // 关闭活动窗口
        dispatch(closeWindow(activeWindowId));
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeWindowId, dispatch]);
  
  // 渲染窗口
  const renderWindows = () => {
    return windows.map((window) => {
      // 根据内容类型渲染不同的窗口
      switch (window.contentType) {
        case 'quote':
          return (
            <QuoteWindow
              key={window.id}
              windowData={window}
              isActive={window.id === activeWindowId}
              onClose={() => dispatch(closeWindow(window.id))}
              onMinimize={() => dispatch(minimizeWindow(window.id))}
              onActivate={() => dispatch(activateWindow(window.id))}
              onUpdatePosition={(position) => dispatch(setWindowPosition({ windowId: window.id, position }))}
              onUpdateSize={(size) => dispatch(setWindowSize({ windowId: window.id, size }))}
              onSave={handleSaveQuote}
              onDelete={handleDeleteQuote}
              onSaveReferences={handleSaveQuoteReferences}
              onSaveAttachmentReferences={handleSaveQuoteAttachmentReferences}
              onSaveQuoteReferences={handleSaveQuoteQuoteReferences}
              onViewDocument={handleViewDocument}
            />
          );
        case 'attachment':
          return (
            <AttachmentWindow
              key={window.id}
              windowData={window}
              isActive={window.id === activeWindowId}
              onClose={() => dispatch(closeWindow(window.id))}
              onMinimize={() => dispatch(minimizeWindow(window.id))}
              onActivate={() => dispatch(activateWindow(window.id))}
              onUpdatePosition={(position) => dispatch(setWindowPosition({ windowId: window.id, position }))}
              onUpdateSize={(size) => dispatch(setWindowSize({ windowId: window.id, size }))}
              onDelete={handleDeleteAttachment}
            />
          );
        case 'document':
        default:
          return (
            <DocumentWindow
              key={window.id}
              windowData={window}
              isActive={window.id === activeWindowId}
              onClose={() => dispatch(closeWindow(window.id))}
              onMinimize={() => dispatch(minimizeWindow(window.id))}
              onActivate={() => dispatch(activateWindow(window.id))}
              onUpdatePosition={(position) => dispatch(setWindowPosition({ windowId: window.id, position }))}
              onUpdateSize={(size) => dispatch(setWindowSize({ windowId: window.id, size }))}
              onSave={handleSaveDocument}
              onDelete={handleDeleteDocument}
              onSaveReferences={handleSaveDocumentReferences}
              onSaveAttachmentReferences={handleSaveDocumentAttachmentReferences}
              onSaveQuoteReferences={handleSaveDocumentQuoteReferences}
              onViewDocument={handleViewDocument}
            />
          );
      }
    });
  };
  
  // 渲染最小化窗口
  const handleSidebarResizeStart = (e) => {
    setIsResizingSidebar(true);
    setOpenNotesSidebarHovering(true);
    resizeRef.current = {
      startX: e.clientX,
      startWidth: openNotesSidebarWidth
    };
    e.preventDefault();
  };

  const handleToggleDockSide = () => {
    setOpenNotesDockSide((side) => (side === 'left' ? 'right' : 'left'));
  };

  const handleActivateWindowFromSidebar = (windowId) => {
    dispatch(activateWindow(windowId));
  };

  const dockTooltipPlacement = openNotesDockSide === 'left' ? 'right' : 'left';
  
  return (
    <>
      <WindowsContainer>
        {renderWindows()}
      </WindowsContainer>

      {/* 左上角“已打开笔记”横条：悬停展开 */}
      <OpenNotesSidebar
        sidebarWidth={openNotesSidebarWidth}
        expanded={openNotesExpanded}
        panelHeight={openNotesPanelHeight}
        dock={openNotesDockSide}
        elevation={0}
        aria-label="已打开笔记"
        onMouseEnter={() => {
          setOpenNotesSidebarHovering(true);
        }}
        onMouseLeave={() => {
          if (!isResizingSidebar) setOpenNotesSidebarHovering(false);
        }}
      >
        <SidebarResizeHandle
          dock={openNotesDockSide}
          onPointerDown={handleSidebarResizeStart}
          aria-label="调整侧边栏宽度"
        />

        <OpenNotesSidebarHeader>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pl: 0.75, minWidth: 0 }}>
            <NoteIcon fontSize="small" />
            <Typography
              variant="subtitle2"
              sx={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
            >
              已打开笔记
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {documentWindows.length}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, pr: 0.25 }}>
            <Tooltip title="悬停展开 / 离开收起" placement={dockTooltipPlacement}>
              <Box sx={{ px: 0.5 }}>
                <Typography variant="caption" color="text.secondary">
                  悬停
                </Typography>
              </Box>
            </Tooltip>

            <Tooltip
              title={openNotesDockSide === 'left' ? '切到右侧' : '切到左侧'}
              placement={dockTooltipPlacement}
            >
              <IconButton
                size="small"
                onClick={handleToggleDockSide}
                aria-label={openNotesDockSide === 'left' ? '将已打开笔记横条切换到右侧' : '将已打开笔记横条切换到左侧'}
              >
                <SwapHorizIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </OpenNotesSidebarHeader>

        {openNotesExpanded && (
          <>
            <Divider />
            <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
              {documentWindows.length === 0 ? (
                <Box sx={{ p: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    暂无打开的笔记
                  </Typography>
                </Box>
              ) : (
                <List dense disablePadding>
                  {documentWindows.map((w) => (
                    <ListItemButton
                      key={w.id}
                      selected={w.id === activeWindowId}
                      onClick={() => handleActivateWindowFromSidebar(w.id)}
                      sx={{
                        px: 1.25,
                        py: 0.75,
                        gap: 1,
                        alignItems: 'center',
                        '&.Mui-selected': {
                          backgroundColor: 'action.selected',
                        },
                      }}
                      aria-label={`切换到笔记：${w.title}`}
                    >
                      <NoteIcon fontSize="small" sx={{ color: 'primary.main' }} />
                      <ListItemText
                        primary={w.title}
                        secondary={w.minimized ? '已最小化' : undefined}
                        primaryTypographyProps={{
                          variant: 'body2',
                          sx: { fontWeight: w.id === activeWindowId ? 700 : 500 },
                          noWrap: true
                        }}
                        secondaryTypographyProps={{ variant: 'caption', noWrap: true }}
                      />
                      <Tooltip title="关闭" placement={dockTooltipPlacement}>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            dispatch(closeWindow(w.id));
                          }}
                          aria-label={`关闭笔记：${w.title}`}
                        >
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </ListItemButton>
                  ))}
                </List>
              )}
            </Box>
          </>
        )}
      </OpenNotesSidebar>
      
      <AddWindowFab
        color="primary"
        aria-label="添加新窗口"
        onClick={() => {
          // 这里可以添加打开文档选择器的逻辑
          // 暂时使用原有的模态框作为示例
          dispatch(openDocumentModal());
        }}
      >
        <AddIcon />
      </AddWindowFab>
      
      <WindowsLimitPrompt
        open={isLimitPromptOpen}
        onClose={() => dispatch(closeLimitPrompt())}
        onContinue={handleLimitPromptContinue}
      />
    </>
  );
};

export default DocumentWindowsContainer;
