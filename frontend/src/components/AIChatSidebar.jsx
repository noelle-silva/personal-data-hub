import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Box, IconButton, useTheme, useMediaQuery, Backdrop } from '@mui/material';
import { styled } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import AIChatPanel from './AIChatPanel';

// 侧边栏容器
const SidebarContainer = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'isMobile' && prop !== 'width' && prop !== 'isOpen' && prop !== 'isOverlay'
})(({ theme, isMobile, width, isOpen, isOverlay }) => ({
  position: isMobile ? 'fixed' : (isOverlay ? 'absolute' : 'relative'),
  top: isMobile ? 0 : (isOverlay ? 0 : 'auto'),
  left: isMobile ? 'auto' : (isOverlay ? 0 : 0),
  right: isMobile ? 'auto' : (isOverlay ? 0 : 0),
  bottom: isMobile ? 0 : (isOverlay ? 0 : 0),
  width: isMobile ? '100%' : `${width}px`,
  height: isMobile ? '100vh' : (isOverlay ? '100%' : '100%'),
  backgroundColor: theme.palette.background.paper,
  borderLeft: isMobile ? 'none' : `1px solid ${theme.palette.divider}`,
  boxShadow: isMobile ? theme.shadows[8] : (isOverlay ? theme.shadows[8] : 'none'),
  zIndex: theme.zIndex.modal + (isOverlay ? 1 : 0),
  transform: isMobile
    ? (isOpen ? 'translateX(0)' : 'translateX(100%)')
    : 'translateX(0)',
  transition: 'transform 0.3s ease, width 0.2s ease',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
}));

// 拖拽手柄
const DragHandle = styled(Box)(({ theme }) => ({
  position: 'absolute',
  left: 0,
  top: 0,
  bottom: 0,
  width: 8, // 增加拖拽热区宽度
  cursor: 'col-resize',
  backgroundColor: 'transparent',
  '&:hover': {
    backgroundColor: theme.palette.primary.main,
    opacity: 0.5,
  },
  '&:active': {
    backgroundColor: theme.palette.primary.main,
    opacity: 0.8,
  },
}));

// 浮层模式下的关闭按钮
const FloatingCloseButton = styled(IconButton)(({ theme }) => ({
  position: 'absolute',
  top: theme.spacing(2),
  right: theme.spacing(2),
  zIndex: theme.zIndex.modal + 1,
  backgroundColor: theme.palette.background.paper,
  boxShadow: theme.shadows[4],
}));

const AIChatSidebar = ({
  isOpen,
  onClose,
  defaultWidth = 420,
  minWidth = 320,
  maxWidth, // 移除默认值，改为动态计算
  children,
  injectionSource,
  overlayThreshold = 0.96, // 叠加模式阈值
  overlayGap = 0 // 叠加模式间隙
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [width, setWidth] = useState(defaultWidth);
  const [isDragging, setIsDragging] = useState(false);
  const [isOverlay, setIsOverlay] = useState(false);
  const sidebarRef = useRef(null);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(0);
  const isDraggingRef = useRef(false);

  // 检查是否应该进入叠加模式
  const checkOverlayMode = useCallback((currentWidth) => {
    if (isMobile) return false;
    
    const parentElement = sidebarRef.current?.parentElement;
    if (!parentElement) return false;
    
    const parentWidth = parentElement.clientWidth;
    const threshold = parentWidth * overlayThreshold;
    
    return currentWidth >= threshold;
  }, [isMobile, overlayThreshold]);

  // 重置宽度为默认值（当窗口大小变化时）
  useEffect(() => {
    if (!isMobile) {
      setWidth(defaultWidth);
    }
  }, [isMobile, defaultWidth]);

  // 监听宽度变化，检查是否需要进入叠加模式
  useEffect(() => {
    if (!isMobile) {
      setIsOverlay(checkOverlayMode(width));
    }
  }, [width, isMobile, checkOverlayMode]);

  // 处理拖拽开始
  const handleMouseDown = useCallback((e) => {
    if (isMobile) return; // 移动端不支持拖拽
    
    setIsDragging(true);
    isDraggingRef.current = true;
    dragStartX.current = e.clientX;
    dragStartWidth.current = width;
    
    // 防止选中文本
    e.preventDefault();
    
    // 内联定义鼠标移动处理函数，避免闭包问题
    const handleMouseMove = (e) => {
      if (!isDraggingRef.current) return;
      
      const deltaX = e.clientX - dragStartX.current;
      const newWidth = dragStartWidth.current - deltaX; // 向左拖拽增加宽度
      
      // 获取父容器宽度作为动态上限
      const parentElement = sidebarRef.current?.parentElement;
      let dynamicMaxWidth = maxWidth;
      
      // 只有在非无限阈值时才应用宽度限制
      if (overlayThreshold !== Infinity && parentElement) {
        dynamicMaxWidth = parentElement.clientWidth - overlayGap;
      }
      
      // 限制宽度范围
      const clampedWidth = Math.max(minWidth, Math.min(dynamicMaxWidth || Infinity, newWidth));
      setWidth(clampedWidth);
      
      // 检查是否需要进入叠加模式
      setIsOverlay(checkOverlayMode(clampedWidth));
    };
    
    // 内联定义鼠标释放处理函数
    const handleMouseUp = () => {
      isDraggingRef.current = false;
      setIsDragging(false);
      
      // 移除全局鼠标事件监听
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      
      // 恢复文本选择
      document.body.style.userSelect = '';
    };
    
    // 添加全局鼠标事件监听
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    // 禁用文本选择
    document.body.style.userSelect = 'none';
  }, [width, isMobile, minWidth, maxWidth, overlayGap, checkOverlayMode]);

  // 处理背景点击（仅移动端）
  const handleBackdropClick = useCallback(() => {
    if (isMobile) {
      onClose();
    }
  }, [isMobile, onClose]);


  // 如果未打开，不渲染任何内容
  if (!isOpen) {
    return null;
  }

  // 移动端使用浮层模式
  if (isMobile) {
    return (
      <>
        <Backdrop
          open={isOpen}
          onClick={handleBackdropClick}
          sx={{ zIndex: theme.zIndex.modal - 1 }}
        />
        <SidebarContainer isMobile={isMobile} isOpen={isOpen}>
          <FloatingCloseButton onClick={onClose}>
            <CloseIcon />
          </FloatingCloseButton>
          {children || <AIChatPanel onClose={onClose} injectionSource={injectionSource} />}
        </SidebarContainer>
      </>
    );
  }

  // 桌面端使用内嵌侧边栏
  return (
    <SidebarContainer
      ref={sidebarRef}
      isMobile={isMobile}
      width={width}
      isOpen={isOpen}
      isOverlay={isOverlay}
    >
      <DragHandle onMouseDown={handleMouseDown} />
      {children || <AIChatPanel onClose={onClose} injectionSource={injectionSource} />}
    </SidebarContainer>
  );
};

export default AIChatSidebar;