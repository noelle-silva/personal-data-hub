import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Paper,
  IconButton,
  Typography,
  Box,
  CircularProgress,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import MinimizeIcon from '@mui/icons-material/Minimize';
import CropSquareIcon from '@mui/icons-material/CropSquare';
import FilterNoneIcon from '@mui/icons-material/FilterNone';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import AttachmentDetailContent from './AttachmentDetailContent';
import { useSelector } from 'react-redux';
import { selectAttachmentById } from '../store/attachmentsSlice';
import { getMaximizedWindowRect, getViewportSnapshot } from '../utils/windowSizing';

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
  flexDirection: 'column',
  overflow: 'hidden',
  borderBottomLeftRadius: 20,
  borderBottomRightRadius: 20,
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

const AttachmentWindow = ({
  windowData,
  isActive,
  onClose,
  onMinimize,
  onActivate,
  onUpdatePosition,
  onUpdateSize,
  onDelete,
}) => {
  // 从Redux状态获取最新的附件数据，确保标题实时更新
  const attachmentId = windowData.attachment?._id || windowData.resourceId;
  const latestAttachment = useSelector(state =>
    attachmentId ? selectAttachmentById(attachmentId)(state) : null
  );
  const [isMaximized, setIsMaximized] = useState(false);
  const [restoreRect, setRestoreRect] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [windowStart, setWindowStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  
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
        const viewport = getViewportSnapshot();
        const minY = viewport.appBarHeight; // 顶部栏区域不允许被窗口覆盖
        const maxY = window.innerHeight - 100; // 最小高度
        
        newPosition.x = Math.max(0, Math.min(newPosition.x, maxX));
        newPosition.y = Math.max(minY, Math.min(newPosition.y, maxY));
        
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
      if (restoreRect) {
        onUpdatePosition(restoreRect.position);
        onUpdateSize(restoreRect.size);
      }
      setIsMaximized(false);
    } else {
      // 最大化窗口
      setRestoreRect({ position: windowData.position, size: windowData.size });
      const rect = getMaximizedWindowRect(getViewportSnapshot());
      onUpdatePosition(rect.position);
      onUpdateSize(rect.size);
      setIsMaximized(true);
    }
  }, [isMaximized, onUpdatePosition, onUpdateSize, restoreRect, windowData.position, windowData.size]);
  
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
  
  // 渲染加载状态
  const renderLoading = () => (
    <LoadingContainer>
      <CircularProgress size={40} />
      <Typography variant="body1" color="text.secondary">
        正在加载附件内容...
      </Typography>
    </LoadingContainer>
  );
  
  // 渲染错误状态
  const renderError = () => {
    return (
      <ErrorContainer>
        <Typography variant="h6" color="error">
          加载失败
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {windowData.error || '无法加载附件内容，请稍后重试。'}
        </Typography>
      </ErrorContainer>
    );
  };
  
  // 渲染内容
  const renderContent = () => {
    switch (windowData.status) {
      case 'loading':
        return renderLoading();
      case 'error':
        return renderError();
      case 'loaded':
        return (
          <AttachmentDetailContent
            attachment={windowData.attachment}
            onDelete={onDelete}
            initialData={windowData.attachment}
          />
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
          <WindowTitle variant="body1">
            {latestAttachment?.originalName || windowData.attachment?.originalName || windowData.title}
          </WindowTitle>
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

export default AttachmentWindow;
