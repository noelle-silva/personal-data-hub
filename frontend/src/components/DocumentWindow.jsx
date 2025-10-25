import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import {
  Paper,
  IconButton,
  Typography,
  Box,
  CircularProgress,
  TextField,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import MinimizeIcon from '@mui/icons-material/Minimize';
import CropSquareIcon from '@mui/icons-material/CropSquare';
import FilterNoneIcon from '@mui/icons-material/FilterNone';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import DocumentDetailContent from './DocumentDetailContent';
import AIChatSidebar from './AIChatSidebar';
import { saveDocumentReferences, saveAttachmentReferences } from '../store/windowsSlice';

// 窗口容器
const WindowContainer = styled(Paper, {
  shouldForwardProp: (prop) => prop !== 'isActive' && prop !== 'minimized'
})(({ theme, isActive, minimized }) => ({
  position: 'fixed',
  display: minimized ? 'none' : 'flex',
  flexDirection: 'column',
  backgroundColor: theme.palette.background.paper,
  boxShadow: isActive 
    ? theme.shadows[24] 
    : theme.shadows[8],
  borderRadius: 20,
  border: `1px solid ${theme.palette.border}`,
  overflow: 'hidden',
  zIndex: theme.zIndex.modal + 1, // 基础 zIndex，动态调整
  transition: 'box-shadow 0.2s ease, transform 0.1s ease',
  transform: minimized ? 'scale(0.95)' : 'scale(1)',
  opacity: minimized ? 0 : 1,
  pointerEvents: minimized ? 'none' : 'auto',
}));

// 窗口标题栏
const WindowHeader = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'isActive'
})(({ theme, isActive }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: theme.spacing(1.5),
  backgroundColor: isActive 
    ? theme.palette.primary.main 
    : theme.palette.grey[300],
  color: isActive 
    ? theme.palette.primary.contrastText 
    : theme.palette.text.primary,
  cursor: 'move',
  userSelect: 'none',
  borderTopLeftRadius: 20,
  borderTopRightRadius: 20,
  minHeight: 48,
  transition: 'background-color 0.2s ease, color 0.2s ease',
}));

// 窗口标题
const WindowTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 'bold',
  fontSize: '1rem',
  flexGrow: 1,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  marginLeft: theme.spacing(1),
}));

// 可编辑标题输入框
const EditableTitleInput = styled(TextField)(({ theme, isActive }) => ({
  flexGrow: 1,
  marginLeft: theme.spacing(1),
  '& .MuiOutlinedInput-root': {
    backgroundColor: 'transparent',
    padding: theme.spacing(0.5, 0.75),
    '& fieldset': {
      border: 'none',
    },
    '&:hover fieldset': {
      border: 'none',
    },
    '&.Mui-focused fieldset': {
      border: 'none',
    },
  },
  '& .MuiOutlinedInput-input': {
    color: isActive
      ? theme.palette.primary.contrastText
      : theme.palette.text.primary,
    fontWeight: 'bold',
    fontSize: '1rem',
    padding: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
}));

// 窗口控制按钮组
const WindowControls = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.5),
}));

// 窗口控制按钮
const WindowControlButton = styled(IconButton)(({ theme }) => ({
  borderRadius: 8,
  padding: theme.spacing(0.5),
  color: 'inherit',
  backgroundColor: 'transparent',
  '&:hover': {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
}));

// 窗口内容区域
const WindowContent = styled(Box)(({ theme }) => ({
  flexGrow: 1,
  display: 'flex',
  flexDirection: 'row',
  overflow: 'hidden',
  borderBottomLeftRadius: 20,
  borderBottomRightRadius: 20,
}));

// 主内容区域
const MainContent = styled(Box)(({ theme }) => ({
  flexGrow: 1,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  minWidth: 0, // 允许flex子项收缩
}));

// 加载容器
const LoadingContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  flexGrow: 1,
  padding: theme.spacing(4),
  gap: theme.spacing(2),
}));

// 错误容器
const ErrorContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  flexGrow: 1,
  padding: theme.spacing(4),
  gap: theme.spacing(2),
  color: theme.palette.error.main,
}));

const DocumentWindow = ({
  windowData,
  isActive,
  onClose,
  onMinimize,
  onActivate,
  onUpdatePosition,
  onUpdateSize,
  onSave,
  onDelete,
  onSaveReferences,
  onSaveAttachmentReferences,
  onSaveQuoteReferences,
  onViewDocument,
}) => {
  const dispatch = useDispatch();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isAISidebarOpen, setIsAISidebarOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [windowStart, setWindowStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  
  // 注入源状态
  const [injectionSource, setInjectionSource] = useState({
    type: 'document',
    subtype: 'text',
    content: '',
    available: false
  });
  
  // 标题编辑相关状态
  const [headerIsEditing, setHeaderIsEditing] = useState(false);
  const [editableTitle, setEditableTitle] = useState(windowData.title || '');
  
  const windowRef = useRef(null);
  const headerRef = useRef(null);
  const resizeHandleRef = useRef(null);
  
  // 处理窗口激活
  const handleWindowClick = useCallback(() => {
    if (!isActive) {
      onActivate();
    }
  }, [isActive, onActivate]);
  
  // 处理拖拽开始
  const handleDragStart = useCallback((e) => {
    if (isMaximized) return;
    
    setIsDragging(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY
    });
    setWindowStart({
      x: windowData.position.x,
      y: windowData.position.y
    });
    
    e.preventDefault();
  }, [isMaximized, windowData.position]);
  
  // 处理调整大小开始
  const handleResizeStart = useCallback((e) => {
    if (isMaximized) return;
    
    setIsResizing(true);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: windowData.size.width,
      height: windowData.size.height
    });
    
    e.preventDefault();
    e.stopPropagation();
  }, [isMaximized, windowData.size]);
  
  // 处理鼠标移动
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging) {
        const deltaX = e.clientX - dragStart.x;
        const deltaY = e.clientY - dragStart.y;
        
        const newPosition = {
          x: windowStart.x + deltaX,
          y: windowStart.y + deltaY
        };
        
        // 确保窗口不会拖出屏幕
        const maxX = window.innerWidth - 200; // 最小宽度
        const maxY = window.innerHeight - 100; // 最小高度
        
        newPosition.x = Math.max(0, Math.min(newPosition.x, maxX));
        newPosition.y = Math.max(0, Math.min(newPosition.y, maxY));
        
        onUpdatePosition(newPosition);
      } else if (isResizing) {
        const deltaX = e.clientX - resizeStart.x;
        const deltaY = e.clientY - resizeStart.y;
        
        const newSize = {
          width: Math.max(400, resizeStart.width + deltaX),
          height: Math.max(300, resizeStart.height + deltaY)
        };
        
        onUpdateSize(newSize);
      }
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };
    
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, dragStart, windowStart, resizeStart, onUpdatePosition, onUpdateSize]);
  
  // 处理最大化/还原
  const handleMaximize = useCallback(() => {
    if (isMaximized) {
      // 还原窗口 - 增加宽度15%
      onUpdateSize({ width: 1380, height: '90vh' });
      onUpdatePosition({ x: 100, y: 100 });
      setIsMaximized(false);
    } else {
      // 最大化窗口
      onUpdateSize({ width: window.innerWidth - 40, height: window.innerHeight - 40 });
      onUpdatePosition({ x: 20, y: 20 });
      setIsMaximized(true);
    }
  }, [isMaximized, onUpdatePosition, onUpdateSize]);
  
  // 处理键盘事件
  useEffect(() => {
    const handleKeyDown = (e) => {
      // ESC 键关闭窗口
      if (e.key === 'Escape' && isActive) {
        onClose();
      }
    };
    
    if (isActive) {
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isActive, onClose]);
  
  // 同步 windowData.title 到 editableTitle（非编辑模式时）
  useEffect(() => {
    if (!headerIsEditing && windowData.title !== editableTitle) {
      setEditableTitle(windowData.title || '');
    }
  }, [windowData.title, headerIsEditing, editableTitle]);
  
  // 包装 onSave 函数，合并编辑的标题
  const handleSave = useCallback(async (id, documentData) => {
    // 合并编辑的标题，并做 trim 处理
    const trimmedTitle = editableTitle.trim();
    
    // 空标题校验
    if (!trimmedTitle) {
      alert('标题不能为空');
      return Promise.reject(new Error('标题不能为空'));
    }
    
    // 合并标题到保存数据
    const updatedData = {
      ...documentData,
      title: trimmedTitle,
    };
    
    // 调用原始 onSave
    return onSave(id, updatedData);
  }, [editableTitle, onSave]);
  
  // 处理编辑模式变化
  const handleEditModeChange = useCallback((isEditing) => {
    setHeaderIsEditing(isEditing);
    // 进入编辑模式时，确保 editableTitle 与当前标题同步
    if (isEditing) {
      setEditableTitle(windowData.title || '');
    }
  }, [windowData.title]);
  
  // 处理标题输入框变化
  const handleTitleChange = useCallback((e) => {
    setEditableTitle(e.target.value);
  }, []);
  
  // 处理标题输入框回车（仅失焦，不保存）
  const handleTitleKeyPress = useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.target.blur();
    }
  }, []);
  
  // 阻止输入框的鼠标事件冒泡，避免触发拖拽
  const handleInputMouseDown = useCallback((e) => {
    e.stopPropagation();
  }, []);
  
  // 处理视图显示变化（用于注入功能）
  const handleViewDisplayChange = useCallback((displayInfo) => {
    setInjectionSource({
      type: 'document',
      subtype: displayInfo.subtype || 'text',
      content: displayInfo.content || '',
      available: !!(displayInfo.content && displayInfo.content.trim())
    });
  }, []);
  
  // 渲染加载状态
  const renderLoading = () => (
    <LoadingContainer>
      <CircularProgress size={40} />
      <Typography variant="body1" color="text.secondary">
        正在加载笔记内容...
      </Typography>
    </LoadingContainer>
  );
  
  // 渲染错误状态
  const renderError = () => (
    <ErrorContainer>
      <Typography variant="h6" color="error">
        加载失败
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {windowData.error || '无法加载笔记内容，请稍后重试。'}
      </Typography>
    </ErrorContainer>
  );
  
  // 渲染内容
  const renderContent = () => {
    switch (windowData.status) {
      case 'loading':
        return renderLoading();
      case 'error':
        return renderError();
      case 'loaded':
        // 实现保存引用的回调
        const handleSaveReferences = async (documentId, referencedIds) => {
          const result = await dispatch(saveDocumentReferences({
            documentId,
            referencedDocumentIds: referencedIds
          })).unwrap();
          return result.document;
        };

        // 实现保存附件引用的回调
        const handleSaveAttachmentReferences = async (documentId, referencedIds) => {
          const result = await dispatch(saveAttachmentReferences({
            documentId,
            referencedAttachmentIds: referencedIds
          })).unwrap();
          return result.document;
        };

        return (
          <>
            <MainContent>
              <DocumentDetailContent
                document={windowData.document}
                onSave={handleSave}
                onDelete={onDelete}
                onSaveReferences={onSaveReferences || handleSaveReferences}
                onSaveAttachmentReferences={onSaveAttachmentReferences || handleSaveAttachmentReferences}
                onSaveQuoteReferences={onSaveQuoteReferences}
                onViewDocument={onViewDocument}
                selectedDocumentStatus="loaded"
                isSidebarCollapsed={isSidebarCollapsed}
                onEditModeChange={handleEditModeChange}
                externalTitle={headerIsEditing ? editableTitle : undefined}
                onViewDisplayChange={handleViewDisplayChange}
              />
            </MainContent>
            
            {/* AI 聊天侧边栏 */}
            <AIChatSidebar
              isOpen={isAISidebarOpen}
              onClose={() => setIsAISidebarOpen(false)}
              injectionSource={injectionSource}
            />
          </>
        );
      default:
        return renderLoading();
    }
  };
  
  return (
    <WindowContainer
      ref={windowRef}
      isActive={isActive}
      minimized={windowData.minimized}
      sx={{
        left: windowData.position.x,
        top: windowData.position.y,
        width: windowData.size.width,
        height: windowData.size.height,
        zIndex: windowData.zIndex,
      }}
      onClick={handleWindowClick}
    >
      {/* 窗口标题栏 */}
      <WindowHeader
        ref={headerRef}
        isActive={isActive}
        onMouseDown={handleDragStart}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <DragIndicatorIcon sx={{ fontSize: 16, opacity: 0.7 }} />
          {headerIsEditing ? (
            <EditableTitleInput
              value={editableTitle}
              onChange={handleTitleChange}
              onKeyPress={handleTitleKeyPress}
              onMouseDown={handleInputMouseDown}
              onClick={handleInputMouseDown}
              variant="outlined"
              size="small"
              isActive={isActive}
              aria-label="编辑笔记标题"
              placeholder="输入标题..."
            />
          ) : (
            <WindowTitle variant="body1">
              {windowData.title}
            </WindowTitle>
          )}
          <WindowControlButton
            size="small"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            title={isSidebarCollapsed ? "展开引用区" : "收起引用区"}
          >
            {isSidebarCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </WindowControlButton>
          <WindowControlButton
            size="small"
            onClick={() => setIsAISidebarOpen(!isAISidebarOpen)}
            title={isAISidebarOpen ? "关闭 AI 助手" : "打开 AI 助手"}
            sx={{
              backgroundColor: isAISidebarOpen ? 'rgba(255, 255, 255, 0.3)' : 'transparent',
            }}
          >
            <SmartToyIcon />
          </WindowControlButton>
        </Box>
        
        <WindowControls>
          <WindowControlButton
            size="small"
            onClick={handleMaximize}
            title={isMaximized ? "还原" : "最大化"}
          >
            {isMaximized ? <FilterNoneIcon /> : <CropSquareIcon />}
          </WindowControlButton>
          <WindowControlButton
            size="small"
            onClick={onMinimize}
            title="最小化"
          >
            <MinimizeIcon />
          </WindowControlButton>
          <WindowControlButton
            size="small"
            onClick={onClose}
            title="关闭"
          >
            <CloseIcon />
          </WindowControlButton>
        </WindowControls>
      </WindowHeader>
      
      {/* 窗口内容 */}
      <WindowContent>
        {renderContent()}
      </WindowContent>
      
      {/* 调整大小手柄 */}
      {!isMaximized && (
        <Box
          ref={resizeHandleRef}
          sx={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: 16,
            height: 16,
            cursor: 'nwse-resize',
            zIndex: 1,
            '&::before': {
              content: '""',
              position: 'absolute',
              bottom: 2,
              right: 2,
              width: 0,
              height: 0,
              borderStyle: 'solid',
              borderWidth: '0 0 8px 8px',
              borderColor: 'transparent transparent transparent rgba(0, 0, 0, 0.3)',
            },
          }}
          onMouseDown={handleResizeStart}
        />
      )}
    </WindowContainer>
  );
};

export default DocumentWindow;