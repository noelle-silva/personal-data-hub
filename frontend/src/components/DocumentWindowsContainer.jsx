import React, { useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Box,
  Backdrop,
  Fab,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
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



const DocumentWindowsContainer = () => {
  const dispatch = useDispatch();
  const windows = useSelector(selectAllWindows);
  const activeWindowId = useSelector(selectActiveWindowId);
  const isLimitPromptOpen = useSelector(selectIsLimitPromptOpen);

  const documentWindows = useMemo(() => {
    return windows
      .filter(w => !w.contentType || w.contentType === 'document')
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [windows]);

  const quoteWindows = useMemo(() => {
    return windows
      .filter(w => w.contentType === 'quote')
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [windows]);

  const activeDocumentWindowId = useMemo(() => {
    const active = windows.find((w) => w.id === activeWindowId);
    if (!active) return null;
    if (active.contentType && active.contentType !== 'document') return null;
    if (active.minimized) return null;
    return active.id;
  }, [activeWindowId, windows]);

  const activeQuoteWindowId = useMemo(() => {
    const active = windows.find((w) => w.id === activeWindowId);
    if (!active) return null;
    if (active.contentType !== 'quote') return null;
    if (active.minimized) return null;
    return active.id;
  }, [activeWindowId, windows]);

  const minimizeAllDocumentWindows = () => {
    documentWindows.forEach((w) => {
      if (w.minimized) return;
      dispatch(minimizeWindow(w.id));
    });
  };

  const minimizeAllQuoteWindows = () => {
    quoteWindows.forEach((w) => {
      if (w.minimized) return;
      dispatch(minimizeWindow(w.id));
    });
  };
  
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
          if (activeDocumentWindowId) return null;
          if (!activeQuoteWindowId || window.id !== activeQuoteWindowId) return null;
          return (
            <QuoteWindow
              key={window.id}
              windowData={window}
              isActive={window.id === activeWindowId}
              onClose={() => dispatch(closeWindow(window.id))}
              onMinimize={minimizeAllQuoteWindows}
              onActivate={() => dispatch(activateWindow(window.id))}
              onUpdatePosition={(position) => dispatch(setWindowPosition({ windowId: window.id, position }))}
              onUpdateSize={(size) => dispatch(setWindowSize({ windowId: window.id, size }))}
              onPrevQuote={handleActivatePrevQuoteWindow}
              onNextQuote={handleActivateNextQuoteWindow}
              canNavigateQuotes={quoteWindows.length > 1}
              onSave={handleSaveQuote}
              onDelete={handleDeleteQuote}
              onSaveReferences={handleSaveQuoteReferences}
              onSaveAttachmentReferences={handleSaveQuoteAttachmentReferences}
              onSaveQuoteReferences={handleSaveQuoteQuoteReferences}
              onViewDocument={handleViewDocument}
            />
          );
        case 'attachment':
          if (activeDocumentWindowId || activeQuoteWindowId) return null;
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
          if (!activeDocumentWindowId || window.id !== activeDocumentWindowId) return null;
          return (
            <DocumentWindow
              key={window.id}
              windowData={window}
              isActive={window.id === activeWindowId}
              onClose={() => dispatch(closeWindow(window.id))}
              onMinimize={minimizeAllDocumentWindows}
              onActivate={() => dispatch(activateWindow(window.id))}
              onUpdatePosition={(position) => dispatch(setWindowPosition({ windowId: window.id, position }))}
              onUpdateSize={(size) => dispatch(setWindowSize({ windowId: window.id, size }))}
              onPrevDocument={handleActivatePrevDocumentWindow}
              onNextDocument={handleActivateNextDocumentWindow}
              canNavigateDocuments={documentWindows.length > 1}
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
  
  const handleActivatePrevDocumentWindow = () => {
    if (documentWindows.length <= 1) return;

    const currentIndex = documentWindows.findIndex((w) => w.id === activeDocumentWindowId);
    const targetIndex = currentIndex === -1
      ? documentWindows.length - 1
      : (currentIndex - 1 + documentWindows.length) % documentWindows.length;

    dispatch(activateWindow(documentWindows[targetIndex].id));
  };

  const handleActivateNextDocumentWindow = () => {
    if (documentWindows.length <= 1) return;

    const currentIndex = documentWindows.findIndex((w) => w.id === activeDocumentWindowId);
    const targetIndex = currentIndex === -1
      ? 0
      : (currentIndex + 1) % documentWindows.length;

    dispatch(activateWindow(documentWindows[targetIndex].id));
  };

  const handleActivatePrevQuoteWindow = () => {
    if (quoteWindows.length <= 1) return;

    const currentIndex = quoteWindows.findIndex((w) => w.id === activeQuoteWindowId);
    const targetIndex = currentIndex === -1
      ? quoteWindows.length - 1
      : (currentIndex - 1 + quoteWindows.length) % quoteWindows.length;

    dispatch(activateWindow(quoteWindows[targetIndex].id));
  };

  const handleActivateNextQuoteWindow = () => {
    if (quoteWindows.length <= 1) return;

    const currentIndex = quoteWindows.findIndex((w) => w.id === activeQuoteWindowId);
    const targetIndex = currentIndex === -1
      ? 0
      : (currentIndex + 1) % quoteWindows.length;

    dispatch(activateWindow(quoteWindows[targetIndex].id));
  };
  
  return (
    <>
      <Backdrop
        open={!!activeDocumentWindowId || !!activeQuoteWindowId}
        sx={(theme) => ({
          // Backdrop 只遮内容区，不允许遮挡顶部栏
          zIndex: theme.zIndex.drawer,
          backgroundColor: 'rgba(0, 0, 0, 0.35)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
        })}
        aria-hidden
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (activeQuoteWindowId) {
            minimizeAllQuoteWindows();
            return;
          }
          minimizeAllDocumentWindows();
        }}
      />

      <WindowsContainer>
        {renderWindows()}
      </WindowsContainer>
      
      {!activeDocumentWindowId && !activeQuoteWindowId && (
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
      )}
      
      <WindowsLimitPrompt
        open={isLimitPromptOpen}
        onClose={() => dispatch(closeLimitPrompt())}
        onContinue={handleLimitPromptContinue}
      />
    </>
  );
};

export default DocumentWindowsContainer;
