import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Box, IconButton, useTheme, useMediaQuery, Backdrop } from '@mui/material';
import { styled } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import AIChatPanel from './AIChatPanel';

// 侧边栏容器
const SidebarContainer = styled(Box, {
  shouldForwardProp: (prop) =>
    prop !== 'isMobile' && prop !== 'width' && prop !== 'isOpen' && prop !== 'isOverlay' && prop !== 'isResizing'
})(({ theme, isMobile, width, isOpen, isOverlay, isResizing }) => ({
  position: isMobile ? 'fixed' : (isOverlay ? 'absolute' : 'relative'),
  top: (isMobile || isOverlay) ? 0 : 'auto',
  right: isMobile ? 0 : (isOverlay ? 0 : 'auto'),
  bottom: (isMobile || isOverlay) ? 0 : 'auto',
  left: isMobile ? 0 : 'auto',
  width: isMobile ? '100%' : `${width}px`,
  // 作为 flex 子项时禁止被压缩：主内容加载/布局抖动不应挤压 AI 侧边栏宽度
  flexShrink: 0,
  height: isMobile ? '100vh' : '100%',
  backgroundColor: theme.palette.background.paper,
  borderLeft: isMobile ? 'none' : `1px solid ${theme.palette.divider}`,
  boxShadow: isMobile ? theme.shadows[8] : (isOverlay ? theme.shadows[8] : 'none'),
  zIndex: theme.zIndex.modal + (isOverlay ? 1 : 0),
  transform: isMobile
    ? (isOpen ? 'translateX(0)' : 'translateX(100%)')
    : 'translateX(0)',
  transition: isResizing ? 'transform 0.3s ease' : 'transform 0.3s ease, width 0.2s ease',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  willChange: isMobile ? 'transform' : 'width',
}));

// 拖拽手柄
const DragHandle = styled(Box)(({ theme }) => ({
  position: 'absolute',
  left: -6, // 让拖拽热区跨过分界线，避免“看不见/抓不到”
  top: 0,
  bottom: 0,
  width: 12, // 增加拖拽热区宽度
  cursor: 'col-resize',
  backgroundColor: 'transparent',
  zIndex: 2,
  touchAction: 'none',
  userSelect: 'none',
  '&::after': {
    content: '""',
    position: 'absolute',
    left: '50%',
    top: theme.spacing(2),
    bottom: theme.spacing(2),
    width: 2,
    transform: 'translateX(-50%)',
    backgroundColor: theme.palette.divider,
    opacity: 0.6,
    borderRadius: 1,
  },
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
  const [isOverlay, setIsOverlay] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef(null);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(0);
  const isDraggingRef = useRef(false);
  const rafIdRef = useRef(0);
  const pendingWidthRef = useRef(defaultWidth);
  const activeCleanupRef = useRef(null);

  // 检查是否应该进入叠加模式
  const checkOverlayMode = useCallback((currentWidth) => {
    if (isMobile) return false;
    if (overlayThreshold === Infinity) return false;
    
    const parentElement = sidebarRef.current?.parentElement;
    if (!parentElement) return false;
    
    const parentWidth = parentElement.clientWidth;
    const threshold = parentWidth * overlayThreshold;
    
    return currentWidth >= threshold;
  }, [isMobile, overlayThreshold]);

  const clampWidth = useCallback((nextWidth) => {
    const clampedMin = Math.max(minWidth, nextWidth);

    if (overlayThreshold === Infinity) {
      if (typeof maxWidth === 'number') return Math.min(maxWidth, clampedMin);
      return clampedMin;
    }

    const parentElement = sidebarRef.current?.parentElement;
    if (!parentElement) return clampedMin;

    const dynamicMaxWidth = parentElement.clientWidth - overlayGap;
    return Math.min(dynamicMaxWidth, clampedMin);
  }, [minWidth, maxWidth, overlayGap, overlayThreshold]);

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

  const scheduleApplyWidthStyle = useCallback((nextWidth) => {
    pendingWidthRef.current = nextWidth;
    if (rafIdRef.current) return;

    rafIdRef.current = window.requestAnimationFrame(() => {
      rafIdRef.current = 0;
      if (!sidebarRef.current || isMobile) return;
      sidebarRef.current.style.width = `${pendingWidthRef.current}px`;
    });
  }, [isMobile]);

  const cleanupResizeSideEffects = useCallback(() => {
    if (rafIdRef.current) {
      window.cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = 0;
    }

    document.body.style.userSelect = '';
    document.body.style.cursor = '';
  }, []);

  // 处理拖拽开始（Pointer Events）
  const handlePointerDown = useCallback((e) => {
    if (isMobile) return;
    if (e.button !== 0) return;

    isDraggingRef.current = true;
    setIsResizing(true);

    dragStartX.current = e.clientX;
    const measuredWidth = sidebarRef.current?.getBoundingClientRect?.().width;
    dragStartWidth.current = (typeof measuredWidth === 'number' && measuredWidth > 0) ? measuredWidth : width;
    pendingWidthRef.current = dragStartWidth.current;

    e.preventDefault();
    e.currentTarget?.setPointerCapture?.(e.pointerId);

    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

    const handlePointerMove = (moveEvent) => {
      if (!isDraggingRef.current) return;
      if (typeof moveEvent?.pointerId === 'number' && typeof e.pointerId === 'number' && moveEvent.pointerId !== e.pointerId) return;

      const deltaX = moveEvent.clientX - dragStartX.current;
      const nextWidth = clampWidth(dragStartWidth.current - deltaX);
      scheduleApplyWidthStyle(nextWidth);
    };

    const handlePointerUp = (upEvent) => {
      if (typeof upEvent?.pointerId === 'number' && upEvent.pointerId !== e.pointerId) return;

      isDraggingRef.current = false;
      activeCleanupRef.current?.();

      const committedWidth = pendingWidthRef.current;
      setWidth(committedWidth);
      setIsOverlay(checkOverlayMode(committedWidth));
      setIsResizing(false);

      activeCleanupRef.current = null;
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerup', handlePointerUp, { passive: true });
    window.addEventListener('pointercancel', handlePointerUp, { passive: true });
    window.addEventListener('blur', handlePointerUp);

    activeCleanupRef.current = () => {
      isDraggingRef.current = false;
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
      window.removeEventListener('blur', handlePointerUp);

      cleanupResizeSideEffects();
    };
  }, [checkOverlayMode, clampWidth, cleanupResizeSideEffects, isMobile, scheduleApplyWidthStyle, width]);

  const handleHandleKeyDown = useCallback((e) => {
    if (isMobile) return;

    const step = e.shiftKey ? 64 : 16;
    let nextWidth = null;

    if (e.key === 'ArrowLeft') nextWidth = clampWidth(width + step);
    if (e.key === 'ArrowRight') nextWidth = clampWidth(width - step);

    if (typeof nextWidth !== 'number') return;

    e.preventDefault();
    setWidth(nextWidth);
    setIsOverlay(checkOverlayMode(nextWidth));
  }, [checkOverlayMode, clampWidth, isMobile, width]);

  useEffect(() => {
    return () => {
      if (activeCleanupRef.current) activeCleanupRef.current();
    };
  }, []);

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
      isResizing={isResizing}
    >
      <DragHandle
        onPointerDown={handlePointerDown}
        onKeyDown={handleHandleKeyDown}
        role="separator"
        tabIndex={0}
        aria-label="调整 AI 侧边栏宽度"
        aria-orientation="vertical"
        aria-valuenow={Math.round(width)}
        aria-valuemin={minWidth}
        aria-valuemax={typeof maxWidth === 'number' ? maxWidth : undefined}
      />
      {children || <AIChatPanel onClose={onClose} injectionSource={injectionSource} />}
    </SidebarContainer>
  );
};

export default AIChatSidebar;
