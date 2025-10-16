import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Box, Fab, Typography, IconButton } from '@mui/material';
import { styled } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import RestoreIcon from '@mui/icons-material/Restore';
import CloseIcon from '@mui/icons-material/Close';
import DocumentWindow from './DocumentWindow';
import QuoteWindow from './QuoteWindow';
import AttachmentWindow from './AttachmentWindow';
import WindowsLimitPrompt from './WindowsLimitPrompt';
import {
  selectAllWindows,
  selectActiveWindowId,
  selectIsLimitPromptOpen,
  selectMinimizedWindows,
  closeWindow,
  activateWindow,
  minimizeWindow,
  restoreWindow,
  setWindowPosition,
  setWindowSize,
  closeLimitPrompt,
  fetchWindowDocument,
  fetchWindowQuote,
  fetchWindowAttachment,
  openWindowAndFetch
} from '../store/windowsSlice';
import {
  fetchDocumentById,
  openDocumentModal
} from '../store/documentsSlice';
import apiClient from '../services/apiClient';
import { deleteAttachment } from '../services/attachments';

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

// 最小化窗口栏
const MinimizedWindowsBar = styled(Box)(({ theme }) => ({
  position: 'fixed',
  bottom: 0,
  left: 0,
  right: 0,
  height: 60,
  backgroundColor: theme.palette.background.paper,
  borderTop: `1px solid ${theme.palette.divider}`,
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(1),
  gap: theme.spacing(1),
  overflowX: 'auto',
  zIndex: theme.zIndex.modal + 100,
  pointerEvents: 'auto',
  '&::-webkit-scrollbar': {
    height: 4,
  },
  '&::-webkit-scrollbar-track': {
    background: theme.palette.background.default,
  },
  '&::-webkit-scrollbar-thumb': {
    background: theme.palette.primary.main,
    borderRadius: 2,
  },
}));

// 最小化窗口项
const MinimizedWindowItem = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'isActive'
})(({ theme, isActive }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  padding: theme.spacing(1),
  minWidth: 200,
  maxWidth: 300,
  backgroundColor: isActive 
    ? theme.palette.primaryContainer.main 
    : theme.palette.background.default,
  borderRadius: 12,
  border: `1px solid ${theme.palette.divider}`,
  cursor: 'pointer',
  transition: 'background-color 0.2s ease, transform 0.1s ease',
  '&:hover': {
    backgroundColor: isActive 
      ? theme.palette.primaryContainer.dark 
      : theme.palette.action.hover,
    transform: 'translateY(-2px)',
  },
}));

// 最小化窗口标题
const MinimizedWindowTitle = styled(Typography)(({ theme }) => ({
  fontSize: '0.875rem',
  fontWeight: 500,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  flexGrow: 1,
}));

// 添加新窗口浮动按钮
const AddWindowFab = styled(Fab)(({ theme }) => ({
  position: 'fixed',
  bottom: 80, // 留出最小化窗口栏的空间
  right: 20,
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  borderRadius: 16,
  zIndex: theme.zIndex.modal + 101,
  '&:hover': {
    backgroundColor: theme.palette.primary.dark,
  },
}));

const DocumentWindowsContainer = () => {
  const dispatch = useDispatch();
  const windows = useSelector(selectAllWindows);
  const activeWindowId = useSelector(selectActiveWindowId);
  const isLimitPromptOpen = useSelector(selectIsLimitPromptOpen);
  const minimizedWindows = useSelector(selectMinimizedWindows);
  
  // 处理文档窗口保存
  const handleSaveDocument = async (id, documentData) => {
    try {
      const response = await apiClient.put(`/documents/${id}`, documentData);
      const result = response.data;
      console.log('文档更新成功:', result);
      
      // 更新所有引用了该文档的窗口
      windows.forEach(window => {
        if ((window.docId === id || window.resourceId === id) &&
            window.document && window.document._id === id) {
          dispatch(fetchWindowDocument({ windowId: window.id, docId: id }));
        }
      });
    } catch (error) {
      console.error('更新文档失败:', error);
      const errorMessage = error.response?.data?.message || error.message || '更新文档失败，请重试';
      alert(errorMessage);
    }
  };
  
  // 处理文档窗口删除
  const handleDeleteDocument = async (id) => {
    try {
      const response = await apiClient.delete(`/documents/${id}`);
      const result = response.data;
      console.log('文档删除成功:', result);
      
      // 关闭所有引用了该文档的窗口
      windows.forEach(window => {
        if (window.docId === id || window.resourceId === id) {
          dispatch(closeWindow(window.id));
        }
      });
    } catch (error) {
      console.error('删除文档失败:', error);
      const errorMessage = error.response?.data?.message || error.message || '删除文档失败，请重试';
      alert(errorMessage);
    }
  };
  
  // 处理文档引用关系保存
  const handleSaveDocumentReferences = async (id, referencedDocumentIds) => {
    try {
      const response = await apiClient.put(`/documents/${id}`, { referencedDocumentIds }, {
        params: {
          populate: 'full',
          include: 'referencingQuotes',
          quotesLimit: 20
        }
      });

      const result = response.data;
      console.log('引用关系更新成功:', result);
      
      // 更新所有引用了该文档的窗口
      windows.forEach(window => {
        if ((window.docId === id || window.resourceId === id) &&
            window.document && window.document._id === id) {
          dispatch(fetchWindowDocument({ windowId: window.id, docId: id }));
        }
      });
      
      return result.data;
    } catch (error) {
      console.error('更新引用关系失败:', error);
      alert('更新引用关系失败，请重试');
      throw error;
    }
  };
  
  // 处理文档附件引用保存
  const handleSaveDocumentAttachmentReferences = async (id, referencedAttachmentIds) => {
    try {
      const response = await apiClient.put(`/documents/${id}`, { referencedAttachmentIds }, {
        params: {
          populate: 'full',
          include: 'referencingQuotes',
          quotesLimit: 20
        }
      });

      const result = response.data;
      console.log('文档附件引用关系更新成功:', result);
      
      // 更新所有引用了该文档的窗口
      windows.forEach(window => {
        if ((window.docId === id || window.resourceId === id) &&
            window.document && window.document._id === id) {
          dispatch(fetchWindowDocument({ windowId: window.id, docId: id }));
        }
      });
      
      return result.data;
    } catch (error) {
      console.error('更新文档附件引用关系失败:', error);
      const errorMessage = error.response?.data?.message || error.message || '更新文档附件引用关系失败，请重试';
      alert(errorMessage);
      throw error;
    }
  };

  // 处理引用体窗口保存
  const handleSaveQuote = async (id, quoteData) => {
    try {
      const response = await apiClient.put(`/quotes/${id}`, quoteData);
      const result = response.data;
      console.log('引用体更新成功:', result);
      
      // 更新所有引用了该引用体的窗口
      windows.forEach(window => {
        if (window.resourceId === id && window.quote && window.quote._id === id) {
          dispatch(fetchWindowQuote({ windowId: window.id, quoteId: id }));
        }
      });
    } catch (error) {
      console.error('更新引用体失败:', error);
      const errorMessage = error.response?.data?.message || error.message || '更新引用体失败，请重试';
      alert(errorMessage);
    }
  };

  // 处理引用体窗口删除
  const handleDeleteQuote = async (id) => {
    try {
      const response = await apiClient.delete(`/quotes/${id}`);
      const result = response.data;
      console.log('引用体删除成功:', result);
      
      // 关闭所有引用了该引用体的窗口
      windows.forEach(window => {
        if (window.resourceId === id) {
          dispatch(closeWindow(window.id));
        }
      });
    } catch (error) {
      console.error('删除引用体失败:', error);
      const errorMessage = error.response?.data?.message || error.message || '删除引用体失败，请重试';
      alert(errorMessage);
    }
  };

  // 处理引用体引用关系保存
  const handleSaveQuoteReferences = async (id, referencedDocumentIds) => {
    try {
      const response = await apiClient.put(`/quotes/${id}`, { referencedDocumentIds });

      const result = response.data;
      console.log('引用体引用关系更新成功:', result);
      
      // 更新所有引用了该引用体的窗口
      windows.forEach(window => {
        if (window.resourceId === id && window.quote && window.quote._id === id) {
          dispatch(fetchWindowQuote({ windowId: window.id, quoteId: id }));
        }
      });
      
      return result.data;
    } catch (error) {
      console.error('更新引用体引用关系失败:', error);
      alert('更新引用体引用关系失败，请重试');
      throw error;
    }
  };
  
  // 处理引用引用体关系保存
  const handleSaveQuoteQuoteReferences = async (id, referencedQuoteIds) => {
    try {
      const response = await apiClient.put(`/quotes/${id}`, { referencedQuoteIds });

      const result = response.data;
      console.log('引用引用体关系更新成功:', result);
      
      // 更新所有引用了该引用体的窗口
      windows.forEach(window => {
        if (window.resourceId === id && window.quote && window.quote._id === id) {
          dispatch(fetchWindowQuote({ windowId: window.id, quoteId: id }));
        }
      });
      
      return result.data;
    } catch (error) {
      console.error('更新引用引用体关系失败:', error);
      alert('更新引用引用体关系失败，请重试');
      throw error;
    }
  };
  
  // 处理引用体附件引用保存
  const handleSaveQuoteAttachmentReferences = async (id, referencedAttachmentIds) => {
    try {
      const response = await apiClient.put(`/quotes/${id}`, { referencedAttachmentIds });

      const result = response.data;
      console.log('引用体附件引用关系更新成功:', result);
      
      // 更新所有引用了该引用体的窗口
      windows.forEach(window => {
        if (window.resourceId === id && window.quote && window.quote._id === id) {
          dispatch(fetchWindowQuote({ windowId: window.id, quoteId: id }));
        }
      });
      
      return result.data;
    } catch (error) {
      console.error('更新引用体附件引用关系失败:', error);
      const errorMessage = error.response?.data?.message || error.message || '更新引用体附件引用关系失败，请重试';
      alert(errorMessage);
      throw error;
    }
  };

  // 处理附件窗口删除
  const handleDeleteAttachment = async (id) => {
    try {
      // 使用 attachments 服务中的 deleteAttachment 方法，它会自动处理认证头
      await deleteAttachment(id);
      console.log('附件删除成功');
      
      // 关闭所有引用了该附件的窗口
      windows.forEach(window => {
        if (window.resourceId === id) {
          dispatch(closeWindow(window.id));
        }
      });
    } catch (error) {
      console.error('删除附件失败:', error);
      const errorMessage = error.response?.data?.message || error.message || '删除附件失败，请重试';
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
              onViewDocument={handleViewDocument}
            />
          );
      }
    });
  };
  
  // 渲染最小化窗口
  const renderMinimizedWindows = () => {
    return minimizedWindows.map((window) => (
      <MinimizedWindowItem
        key={window.id}
        isActive={window.id === activeWindowId}
        onClick={() => dispatch(restoreWindow(window.id))}
      >
        <MinimizedWindowTitle>
          {window.title}
        </MinimizedWindowTitle>
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            dispatch(closeWindow(window.id));
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </MinimizedWindowItem>
    ));
  };
  
  return (
    <>
      <WindowsContainer>
        {renderWindows()}
      </WindowsContainer>
      
      {minimizedWindows.length > 0 && (
        <MinimizedWindowsBar>
          {renderMinimizedWindows()}
        </MinimizedWindowsBar>
      )}
      
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