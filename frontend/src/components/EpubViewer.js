import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Box, CircularProgress, Typography, Fab } from '@mui/material';
import { styled } from '@mui/material/styles';
import { ChevronLeft as ChevronLeftIcon, ChevronRight as ChevronRightIcon } from '@mui/icons-material';
import ePub from 'epubjs';

// 全局注册 epub.js 的 worker，避免重复加载
// epubjs.config('workerSrc', '/epub.worker.js'); // 如果需要，可以手动指定 worker

// 样式化EPUB容器
const EpubContainer = styled(Box)(({ theme }) => ({
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: theme.palette.grey[100],
  height: '60vh', // Default height, will be overridden by sx prop
  minHeight: 300,
}));

// 样式化EPUB渲染区域
const EpubViewerArea = styled(Box)(({ theme }) => ({
  flex: 1, // Make this area flexible to take up remaining space
  width: '100%',
  height: '100%', // 确保占据父容器的全部高度
  overflow: 'hidden', // The rendition inside will handle its own scrolling
  display: 'flex',
  justifyContent: 'center',
  minHeight: 0, // Crucial for flexbox to allow shrinking
}));

/**
 * EPUB 文件渲染组件
 *
 * @param {string|ArrayBuffer} src - EPUB 文件源（URL 或 ArrayBuffer）
 * @param {string|number} height - 容器高度（默认 '60vh'）
 * @param {function} onError - 错误回调函数
 * @param {string} className - 自定义类名
 */
const EpubViewer = ({
  src,
  height = '60vh',
  onError,
  className
}) => {
  const viewerRef = useRef(null);
  const [renditionReady, setRenditionReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const eventHandlersRef = useRef({});
  const bookRef = useRef(null);
  const renditionRef = useRef(null);
  
  // 组件挂载状态引用，避免卸载后setState
  const isMountedRef = useRef(true);

  // 统一的 EPUB 清理函数
  const cleanupEpub = useCallback(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[EpubViewer] 开始清理 EPUB 资源');
    }
    
    try {
      // 1. 先隐藏容器，避免 ResizeObserver 继续观测
      if (viewerRef.current) {
        viewerRef.current.style.display = 'none';
      }
      
      // 2. 移除所有事件监听器
      if (renditionRef.current) {
        Object.entries(eventHandlersRef.current).forEach(([event, handler]) => {
          if (renditionRef.current.off && handler) {
            try {
              renditionRef.current.off(event, handler);
            } catch (err) {
              if (process.env.NODE_ENV === 'development') {
                console.warn(`[EpubViewer] 移除事件监听器 ${event} 失败:`, err);
              }
            }
          }
        });
        eventHandlersRef.current = {};
      }

      // 3. 异步销毁 rendition - 使用双 requestAnimationFrame 彻底规避 ResizeObserver 循环
      if (renditionRef.current) {
        const renditionToDestroy = renditionRef.current;
        renditionRef.current = null; // 立即置空引用
        
        // 双 requestAnimationFrame 确保在下一个渲染周期后执行，彻底避免 ResizeObserver 循环
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            try {
              // 强制停止所有 ResizeObserver
              if (renditionToDestroy.manager && renditionToDestroy.manager.container) {
                const container = renditionToDestroy.manager.container;
                
                // 移除所有子节点，这会触发 ResizeObserver 的断开
                while (container.firstChild) {
                  container.removeChild(container.firstChild);
                }
                
                if (process.env.NODE_ENV === 'development') {
                  console.log('[EpubViewer] 已清空 EPUB 容器子节点');
                }
              }
              
              // 销毁 rendition
              renditionToDestroy.destroy();
              
              if (process.env.NODE_ENV === 'development') {
                console.log('[EpubViewer] EPUB rendition 已销毁');
              }
            } catch (error) {
              // 捕获并忽略 ResizeObserver 错误
              if (error.message && error.message.includes('ResizeObserver')) {
                if (process.env.NODE_ENV === 'development') {
                  console.log('[EpubViewer] ResizeObserver 错误已被捕获并忽略');
                }
              } else if (process.env.NODE_ENV === 'development') {
                console.warn('[EpubViewer] EPUB rendition 销毁时出现错误:', error);
              }
            }
          });
        });
      }

      // 4. 同步销毁 book
      if (bookRef.current) {
        try {
          bookRef.current.destroy();
          if (process.env.NODE_ENV === 'development') {
            console.log('[EpubViewer] EPUB book 已销毁');
          }
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.warn('[EpubViewer] EPUB book 销毁时出现错误:', error);
          }
        }
        bookRef.current = null;
      }

      // 5. 最后清空容器，彻底移除DOM
      if (viewerRef.current) {
        viewerRef.current.innerHTML = '';
        viewerRef.current.style.display = ''; // 恢复显示
        if (process.env.NODE_ENV === 'development') {
          console.log('[EpubViewer] EPUB 容器已清空');
        }
      }
      
      // 6. 重置状态
      if (isMountedRef.current) {
        setIsLoading(true);
        setError(null);
        setRenditionReady(false);
      }
    } catch (error) {
      // 捕获并忽略 ResizeObserver 错误
      if (error.message && error.message.includes('ResizeObserver')) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[EpubViewer] ResizeObserver 错误已被捕获并忽略');
        }
      } else if (process.env.NODE_ENV === 'development') {
        console.warn('[EpubViewer] EPUB 清理时出现错误:', error);
      }
    }
  }, []);

  useEffect(() => {
    // 确保 ref 和 viewerRef.current 都存在，且 src 已提供
    if (!viewerRef.current || !src) return;

    // 先清理之前的实例
    cleanupEpub();
    
    setIsLoading(true);
    setError(null);

    console.log('[EpubViewer] 初始化 EPUB，src 类型:', typeof src);

    // 等待容器布局完成，避免尺寸为0导致加载卡死
    const waitForContainerLayout = () => {
      if (viewerRef.current && viewerRef.current.offsetWidth > 0 && viewerRef.current.offsetHeight > 0) {
        // 容器已有实际尺寸，开始初始化
        initEpub();
      } else {
        // 容器尺寸为0，等待下一帧
        requestAnimationFrame(waitForContainerLayout);
      }
    };

    // 启动布局等待
    requestAnimationFrame(waitForContainerLayout);

    // 处理 src：如果是 string 则 fetch，如果是 ArrayBuffer 则直接使用
    const initEpub = async () => {
      try {
        let arrayBuffer;
        
        if (typeof src === 'string') {
          console.log('[EpubViewer] 从 URL 获取 EPUB:', src);
          const response = await fetch(src);
          if (!response.ok) {
            throw new Error(`Failed to fetch EPUB: ${response.status} ${response.statusText}`);
          }
          arrayBuffer = await response.arrayBuffer();
        } else if (src instanceof ArrayBuffer) {
          console.log('[EpubViewer] 直接使用 ArrayBuffer');
          arrayBuffer = src;
        } else {
          throw new Error('Invalid src type: expected string URL or ArrayBuffer');
        }

        console.log('[EpubViewer] EPUB 数据获取完成，初始化 epubjs...');
        // 将 ArrayBuffer 传递给 epubjs
        const book = ePub(arrayBuffer);
        bookRef.current = book;
        
        // 分页流配置，确保翻页按钮生效
        const renditionInstance = book.renderTo(viewerRef.current, {
          flow: 'paginated', // 分页流，确保翻页按钮生效
          spread: 'none', // 禁用跨页跨栏
          manager: 'default', // 默认分页管理器
          width: viewerRef.current.clientWidth, // 使用实际像素宽度
          height: viewerRef.current.clientHeight, // 使用实际像素高度
          resizeOnOrientationChange: true,
          allowScriptedContent: false, // 禁用内容脚本，降低尺寸抖动
        });
        
        // 保存 rendition 引用
        renditionRef.current = renditionInstance;

        const displayedHandler = (section) => {
          if (process.env.NODE_ENV === 'development') {
            console.log('[EpubViewer] EPUB displayed:', section);
          }
          if (isMountedRef.current) {
            setIsLoading(false);
            setRenditionReady(true);
          }
        };

        const renderedHandler = (section) => {
          if (process.env.NODE_ENV === 'development') {
            console.log('[EpubViewer] EPUB rendered:', section);
          }
          if (isMountedRef.current) {
            setIsLoading(false);
            setRenditionReady(true);
          }
        };
        
        const errorHandler = (error) => {
          if (process.env.NODE_ENV === 'development') {
            console.error('[EpubViewer] EPUB 渲染错误:', error);
          }
          if (isMountedRef.current) {
            setIsLoading(false);
            const errorMsg = 'EPUB 渲染失败: ' + (error.message || '未知错误');
            setError(new Error(errorMsg));
            if (onError) {
              onError(error);
            }
          }
        };
        
        // 注册事件监听器
        renditionInstance.on('displayed', displayedHandler);
        renditionInstance.on('rendered', renderedHandler);
        renditionInstance.on('error', errorHandler);
        
        eventHandlersRef.current = {
          displayed: displayedHandler,
          rendered: renderedHandler,
          error: errorHandler
        };

        // 渲染并显示
        renditionInstance.display().then(() => {
          // 检查组件是否仍然挂载
          if (isMountedRef.current) {
            console.log('[EpubViewer] Rendition displayed successfully.');
            setRenditionReady(true);
            setIsLoading(false); // 确保加载遮罩移除
          }
        }).catch(err => {
          // 检查组件是否仍然挂载
          if (isMountedRef.current) {
            console.error('[EpubViewer] Error displaying rendition:', err);
            setError(err);
            setIsLoading(false);
            if (onError) {
              onError(err);
            }
          }
        });
      } catch (err) {
        // 检查组件是否仍然挂载
        if (isMountedRef.current) {
          console.error('[EpubViewer] Error initializing EPUB:', err);
          setError(err);
          setIsLoading(false);
          if (onError) {
            onError(err);
          }
        }
      }
    };

      
    // 返回清理函数，确保在组件卸载时正确清理
    return cleanupEpub;
  }, [src, cleanupEpub, onError]);

  // 当组件卸载时，清理状态
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      // 调用统一清理函数
      cleanupEpub();
    };
  }, [cleanupEpub]);

  const handlePrev = useCallback(() => {
    if (renditionRef.current) {
      renditionRef.current.prev();
    }
  }, []);

  const handleNext = useCallback(() => {
    if (renditionRef.current) {
      renditionRef.current.next();
    }
  }, []);

  return (
    <EpubContainer
      className={className}
      sx={{
        height: typeof height === 'number' ? `${height}px` : height
      }}
    >
      {/* 核心 EPUB 渲染区域，始终渲染 */}
      <EpubViewerArea ref={viewerRef} />
      
      {/* 加载状态覆盖层 */}
      {isLoading && (
        <Box sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          zIndex: 1,
        }}>
          <CircularProgress />
          <Typography variant="body2" sx={{ mt: 2 }}>
            正在加载EPUB文档...
          </Typography>
        </Box>
      )}
      
      {/* 错误状态覆盖层 */}
      {error && (
        <Box sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          zIndex: 1,
        }}>
          <Typography variant="h6" color="error">
            EPUB 加载失败
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {error.message || '渲染 EPUB 文件时出错。'}
          </Typography>
        </Box>
      )}

      {/* 翻页控件，仅在就绪状态下显示 */}
      {renditionReady && !error && (
        <Box sx={{
          position: 'absolute',
          bottom: 16,
          right: 16,
          display: 'flex',
          gap: 1,
          zIndex: 2
        }}>
          <Fab
            size="small"
            color="primary"
            onClick={handlePrev}
            sx={{
              boxShadow: 2,
              '&:hover': {
                boxShadow: 4,
              }
            }}
            title="上一页"
          >
            <ChevronLeftIcon />
          </Fab>
          <Fab
            size="small"
            color="primary"
            onClick={handleNext}
            sx={{
              boxShadow: 2,
              '&:hover': {
                boxShadow: 4,
              }
            }}
            title="下一页"
          >
            <ChevronRightIcon />
          </Fab>
        </Box>
      )}
    </EpubContainer>
  );
};

export default EpubViewer;
