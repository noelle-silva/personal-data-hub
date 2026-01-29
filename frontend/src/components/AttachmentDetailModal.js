/**
 * @deprecated 此组件已被新的窗口系统替代
 * 请使用 AttachmentWindow 和 AttachmentDetailContent 组件
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Box,
  Typography,
  Chip,
  Button,
  Menu,
  MenuItem,
  CircularProgress,
  Tooltip,
  Slider,
  TextField
} from '@mui/material';
import {
  Close as CloseIcon,
  GetApp as DownloadIcon,
  ContentCopy as CopyIcon,
  Delete as DeleteIcon,
  OpenInNew as OpenInNewIcon,
  MoreVert as MoreVertIcon,
  Description as DocumentIcon,
  NavigateBefore as NavigateBeforeIcon,
  NavigateNext as NavigateNextIcon
} from '@mui/icons-material';
import { styled, useTheme } from '@mui/material/styles';
import { Document, Page, pdfjs } from 'react-pdf';
import { renderAsync } from 'docx-preview';
import ePub from 'epubjs';
import { useSelector, useDispatch } from 'react-redux';
import {
  selectSelectedAttachment,
  selectModalOpen,
  selectAttachmentUrlCache,
  selectInflightUrlRequests,
  setModalOpen,
  ensureAttachmentUrl,
  deleteAttachmentById,
  fetchAttachmentMetadata
} from '../store/attachmentsSlice';
import { getPlaceholderImage } from '../services/attachments';

// 配置 react-pdf 的 worker，使用本地文件
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

// 样式化对话框内容
const StyledDialogContent = styled(DialogContent)(({ theme }) => ({
  padding: 0,
  minWidth: 600,
  maxWidth: '90vw',
  maxHeight: '90vh',
  display: 'flex',
  flexDirection: 'column',
}));

// 样式化图片容器
const ImageContainer = styled(Box)(({ theme }) => ({
  position: 'relative',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: theme.palette.grey[100],
  minHeight: 300,
  maxHeight: '60vh',
  overflow: 'hidden',
}));

// 样式化图片
const StyledImage = styled('img')(({ theme }) => ({
  maxWidth: '100%',
  maxHeight: '60vh',
  objectFit: 'contain',
}));

// 样式化视频容器
const VideoContainer = styled(Box)(({ theme }) => ({
  position: 'relative',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: theme.palette.grey[100],
  minHeight: 300,
  maxHeight: '60vh',
  overflow: 'hidden',
}));

// 样式化视频
const StyledVideo = styled('video')(({ theme }) => ({
  maxWidth: '100%',
  maxHeight: '60vh',
  objectFit: 'contain',
}));

// 样式化文档容器
const DocumentContainer = styled(Box)(({ theme }) => ({
  position: 'relative',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: theme.palette.grey[100],
  minHeight: 300,
  maxHeight: '60vh',
  overflow: 'hidden',
}));


// 样式化文档占位符
const DocumentPlaceholder = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(4),
  color: theme.palette.text.secondary,
}));


// 样式化元数据容器
const MetadataContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  borderTop: `1px solid ${theme.palette.divider}`,
}));

// 样式化元数据项
const MetadataItem = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: theme.spacing(1.5),
}));

// 样式化元数据标签
const MetadataLabel = styled(Typography)(({ theme }) => ({
  fontWeight: 600,
  color: theme.palette.text.secondary,
}));

// 样式化元数据值
const MetadataValue = styled(Typography)(({ theme }) => ({
  wordBreak: 'break-all',
  maxWidth: '60%',
}));

// 样式化操作按钮容器
const ActionButtons = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginTop: theme.spacing(2),
}));

// 样式化左侧按钮组
const LeftButtons = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(1),
}));

// 样式化右侧按钮组
const RightButtons = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(1),
}));

/**
 * DOCX 文件渲染组件
 */
const DocxViewer = ({ url }) => {
  const [containerNode, setContainerNode] = useState(null);

  useEffect(() => {
    if (!url || !containerNode) return;
    
    // 清空容器
    containerNode.innerHTML = '';

    // 1. 显示加载状态
    const loadingContainer = document.createElement('div');
    loadingContainer.style.display = 'flex';
    loadingContainer.style.flexDirection = 'column';
    loadingContainer.style.alignItems = 'center';
    loadingContainer.style.justifyContent = 'center';
    loadingContainer.style.height = '60vh';
    loadingContainer.innerHTML = '<div style="margin-bottom: 16px;"><svg class="MuiCircularProgress-root MuiCircularProgress-indeterminate MuiCircularProgress-colorPrimary css-1idz90c-MuiCircularProgress-root" viewBox="22 22 44 44" style="width: 40px; height: 40px;"><circle class="MuiCircularProgress-circle MuiCircularProgress-circleIndeterminate css-pspby3-MuiCircularProgress-circle" cx="44" cy="44" r="20.2" fill="none" stroke-width="3.6"></circle></svg></div><p>正在加载DOCX文档...</p>';
    containerNode.appendChild(loadingContainer);

    fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Network response was not ok: ${response.status} ${response.statusText}`);
        }
        return response.blob();
      })
      .then((blob) => {
        // 2. 渲染成功，清空容器并渲染 DOCX
        containerNode.innerHTML = ''; // Clear previous content
        return renderAsync(
          blob,
          containerNode,
          null,
          {
            className: 'docx-preview-modal',
            inWrapper: true,
            ignoreWidth: false,
            ignoreHeight: false,
            ignoreFonts: false,
            breakPages: true,
          }
        );
      })
      .catch((err) => {
        console.error('[DocxViewer] Error rendering DOCX:', err);
        // 3. 渲染失败，清空容器并显示错误信息
        containerNode.innerHTML = '';
        const errorContainer = document.createElement('div');
        errorContainer.style.display = 'flex';
        errorContainer.style.flexDirection = 'column';
        errorContainer.style.alignItems = 'center';
        errorContainer.style.justifyContent = 'center';
        errorContainer.style.height = '60vh';

        const icon = document.createElement('div');
        icon.style.fontSize = '64px';
        icon.style.marginBottom = '16px';
        icon.innerHTML = '<svg class="MuiSvgIcon-root MuiSvgIcon-fontSizeMedium MuiSvgIcon-colorError css-1d4aw79-MuiSvgIcon-root" focusable="false" aria-hidden="true" viewBox="0 0 24 24" data-testid="DescriptionIcon"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.89 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6h4v16H6V4h7V2zm4 .5V8H8.5l4.5-4.5z"></path></svg>';

        const title = document.createElement('h6');
        title.textContent = 'DOCX 加载失败';

        const message = document.createElement('p');
        message.textContent = '渲染 DOCX 文件时出错。';

        errorContainer.appendChild(icon);
        errorContainer.appendChild(title);
        errorContainer.appendChild(message);
        containerNode.appendChild(errorContainer);
      });
  }, [url, containerNode]);

  return <Box ref={setContainerNode} sx={{ height: '60vh', overflow: 'auto', width: '100%' }} />;
};

/**
 * 附件详情模态框组件
 */
const AttachmentDetailModal = () => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const selectedAttachment = useSelector(selectSelectedAttachment);
  const modalOpen = useSelector(selectModalOpen);
  const attachmentUrlCache = useSelector(selectAttachmentUrlCache);
  const inflightUrlRequests = useSelector(selectInflightUrlRequests);
  
  const [imageError, setImageError] = useState(false);
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [pdfPageCount, setPdfPageCount] = useState(null);
  const [pdfError, setPdfError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [inputPage, setInputPage] = useState('1');

  // EPUB 相关状态
  const epubViewerRef = useRef(null);
  const [epubRendition, setEpubRendition] = useState(null);
  const [isEpubLoading, setIsEpubLoading] = useState(true);
  const [epubError, setEpubError] = useState(null);
  
  // 组件挂载状态引用，避免卸载后setState
  const isMountedRef = useRef(true);

  
  // 提取附件ID，避免依赖整个对象
  const selectedAttachmentId = selectedAttachment?._id;
  
  // 获取当前附件的URL（本机网关转发）
  const imageUrl = selectedAttachmentId ? attachmentUrlCache[selectedAttachmentId]?.url : null;

  // PDF 翻页处理
  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(pdfPageCount, prev + 1));
  };

  // EPUB 翻页处理
  const handleEpubPrev = useCallback(() => {
    if (epubRenditionRef.current) {
      epubRenditionRef.current.prev();
    }
  }, []);

  const handleEpubNext = useCallback(() => {
    if (epubRenditionRef.current) {
      epubRenditionRef.current.next();
    }
  }, []);


  // 关闭模态框
  const handleClose = useCallback(() => {
    dispatch(setModalOpen(false));
  }, [dispatch]);

  // 处理键盘事件
  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Escape') {
      handleClose();
    }
  }, [handleClose]);

  // 获取附件URL
  const fetchAttachmentUrl = useCallback(async () => {
    if (!selectedAttachmentId) return;
    
    const cached = attachmentUrlCache[selectedAttachmentId];
    if (cached && cached.url) return;
    
    // 检查是否已有正在进行的请求
    if (inflightUrlRequests[selectedAttachmentId]) return;
    
    try {
      await dispatch(ensureAttachmentUrl({ id: selectedAttachmentId })).unwrap();
    } catch (error) {
      console.error('获取附件URL失败:', error);
      setImageError(true);
    }
  }, [selectedAttachmentId, attachmentUrlCache, inflightUrlRequests, dispatch]);

  // 获取元数据
  const fetchMetadata = useCallback(async () => {
    if (!selectedAttachmentId) return;
    
    try {
      const result = await dispatch(fetchAttachmentMetadata(selectedAttachmentId)).unwrap();
      setMetadata(result.metadata);
    } catch (error) {
      console.error('获取元数据失败:', error);
    }
  }, [selectedAttachmentId, dispatch]);

  // 处理菜单打开
  const handleMenuOpen = (event) => {
    setMenuAnchorEl(event.currentTarget);
  };

  // 处理菜单关闭
  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };

  // 处理下载
  const handleDownload = () => {
    handleMenuClose();
    if (imageUrl) {
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = selectedAttachment?.originalName || 'attachment';
      link.click();
    }
  };

  // 处理新窗口打开
  const handleOpenInNew = () => {
    handleMenuClose();
    if (imageUrl) {
      window.open(imageUrl, '_blank');
    }
  };

  // 处理复制ID
  const handleCopyId = () => {
    handleMenuClose();
    if (selectedAttachment) {
      navigator.clipboard.writeText(selectedAttachment._id)
        .then(() => {
          alert('ID已复制到剪贴板');
        })
        .catch(err => {
          console.error('复制失败:', err);
          alert('复制失败');
        });
    }
  };

  // 处理复制URL
  const handleCopyUrl = () => {
    handleMenuClose();
    if (imageUrl) {
      navigator.clipboard.writeText(window.location.origin + imageUrl)
        .then(() => {
          alert('URL已复制到剪贴板');
        })
        .catch(err => {
          console.error('复制失败:', err);
          alert('复制失败');
        });
    }
  };

  // 处理删除
  const handleDelete = () => {
    handleMenuClose();
    if (selectedAttachment && window.confirm(`确定要删除附件 "${selectedAttachment.originalName}" 吗？此操作不可撤销。`)) {
      dispatch(deleteAttachmentById(selectedAttachment._id))
        .unwrap()
        .then(() => {
          handleClose();
        })
        .catch(error => {
          console.error('删除失败:', error);
          alert(`删除失败: ${error.message}`);
        });
    }
  };

  // 格式化文件大小
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  // 格式化日期
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN');
  };

  // 监听键盘事件
  useEffect(() => {
    if (modalOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [modalOpen, handleKeyDown]);

  // 当选中的附件ID或模态框打开状态变化时，获取附件URL和元数据
  // 使用 selectedAttachmentId 而不是整个 selectedAttachment 对象，
  // 避免因元数据更新导致不必要的重复请求
  useEffect(() => {
    if (selectedAttachmentId && modalOpen) {
      fetchAttachmentUrl();
      fetchMetadata();
    }
  }, [selectedAttachmentId, modalOpen, fetchAttachmentUrl, fetchMetadata]);

  // 当模态框关闭时，清理状态
  useEffect(() => {
    if (!modalOpen) {
      setImageError(false);
      setMetadata(null);
      setMenuAnchorEl(null);
      // 清理 EPUB 状态
      if (epubRendition) {
        epubRendition.destroy();
      }
      setEpubRendition(null);
      setIsEpubLoading(true);
      setEpubError(null);
    }
  }, [modalOpen]); // 移除 epubRendition 依赖，避免在 rendition 变化时重复执行清理

  // EPUB 实例引用
  const epubBookRef = useRef(null);
  const epubEventHandlersRef = useRef({});
  const epubRenditionRef = useRef(null);

  // 统一的 EPUB 清理函数
  const cleanupEpub = useCallback(() => {
    try {
      // 移除所有事件监听器
      if (epubRenditionRef.current) {
        Object.entries(epubEventHandlersRef.current).forEach(([event, handler]) => {
          if (epubRenditionRef.current.off && handler) {
            epubRenditionRef.current.off(event, handler);
          }
        });
        epubEventHandlersRef.current = {};
      }

      // 同步销毁 rendition
      if (epubRenditionRef.current) {
        try {
          epubRenditionRef.current.destroy();
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.warn('[EpubModal] EPUB rendition 销毁时出现错误:', error);
          }
        }
        epubRenditionRef.current = null;
      }

      // 同步销毁 book
      if (epubBookRef.current) {
        try {
          epubBookRef.current.destroy();
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.warn('[EpubModal] EPUB book 销毁时出现错误:', error);
          }
        }
        epubBookRef.current = null;
      }

      // 关键：销毁后清空容器，彻底移除DOM
      if (epubViewerRef.current) {
        epubViewerRef.current.innerHTML = '';
      }
    } catch (error) {
      // 忽略清理过程中的错误，避免控制台报错
      if (process.env.NODE_ENV === 'development') {
        console.warn('[EpubModal] EPUB 清理时出现错误:', error);
      }
    }
  }, []);

  // 当组件卸载时，清理状态
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      // 调用统一清理函数
      cleanupEpub();
    };
  }, [cleanupEpub]);

  // EPUB 加载逻辑
  useEffect(() => {
    if (
      modalOpen &&
      selectedAttachment?.category === 'document' &&
      (selectedAttachment.mimeType === 'application/epub+zip' || selectedAttachment.mimeType === 'application/epub') &&
      epubViewerRef.current &&
      imageUrl // 确保 imageUrl 已准备好
    ) {
      // 先清理之前的实例
      cleanupEpub();
      
      setIsEpubLoading(true);
      setEpubError(null);

      // const bookUrl = '/sample.epub'; // 第一阶段：使用本地样本
      const bookUrl = imageUrl; // 第二阶段：使用后端 URL

      console.log('[EpubModal] Fetching book with URL:', bookUrl);

      // 使用 fetch 预加载文件
      fetch(bookUrl)
        .then(response => {
          if (!response.ok) {
            throw new Error(`Failed to fetch EPUB: ${response.status} ${response.statusText}`);
          }
          return response.arrayBuffer();
        })
        .then(arrayBuffer => {
          console.log('[EpubModal] Book fetched, initializing epubjs...');
          const book = ePub(arrayBuffer);
          epubBookRef.current = book;
          
          // 分页流配置，确保翻页按钮生效
          const rendition = book.renderTo(epubViewerRef.current, {
            width: '100%',
            height: '100%',
            flow: 'paginated', // 分页流，确保翻页按钮生效
            spread: 'none', // 禁用跨页跨栏
            manager: 'default', // 默认分页管理器
            resizeOnOrientationChange: true, // 移动端容错
            allowScriptedContent: false, // 禁用内容脚本，降低尺寸抖动
          });
          
          // 保存 rendition 引用
          epubRenditionRef.current = rendition;

          const displayedHandler = (section) => {
            if (process.env.NODE_ENV === 'development') {
              console.log('EPUB displayed:', section);
            }
            if (isMountedRef.current) {
              setIsEpubLoading(false);
            }
          };
          
          const renderedHandler = (section) => {
            if (process.env.NODE_ENV === 'development') {
              console.log('EPUB rendered:', section);
            }
            if (isMountedRef.current) {
              setIsEpubLoading(false);
            }
          };

          // 注册事件监听器
          rendition.on('displayed', displayedHandler);
          rendition.on('rendered', renderedHandler);
          
          epubEventHandlersRef.current = {
            displayed: displayedHandler,
            rendered: renderedHandler
          };

          rendition.display().then(() => {
            // 检查组件是否仍然挂载
            if (isMountedRef.current) {
              console.log('[EpubModal] Rendition displayed successfully.');
              setEpubRendition(rendition);
              // setIsEpubLoading(false); // 交由 displayed 事件处理
            }
          });
        })
        .catch(err => {
          // 检查组件是否仍然挂载
          if (isMountedRef.current) {
            console.error('[EpubModal] Error loading EPUB:', err);
            setEpubError(err);
            setIsEpubLoading(false);
          }
        });
      
      // 返回清理函数，确保在依赖变更时先销毁旧实例
      return cleanupEpub;
    }
  }, [modalOpen, selectedAttachment, imageUrl, cleanupEpub]); // 移除 epubRendition 依赖，打破无限循环

  return (
    <Dialog
      open={modalOpen}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 4,
        }
      }}
    >
      {selectedAttachment && (
        <>
          <DialogTitle sx={{ m: 0, p: 2, pb: 1 }}>
            <Typography variant="h6" noWrap component="span">
              {selectedAttachment.originalName}
            </Typography>
            <IconButton
              aria-label="close"
              onClick={handleClose}
              sx={{
                position: 'absolute',
                right: 8,
                top: 8,
                color: (theme) => theme.palette.grey[500],
              }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          
          <StyledDialogContent>
            {selectedAttachment.category === 'image' && (
              <ImageContainer>
                {imageError ? (
                  <Box
                    component="img"
                    sx={{
                      maxWidth: '100%',
                      maxHeight: '60vh',
                      objectFit: 'contain',
                    }}
                    src={getPlaceholderImage(600, 400, '图片加载失败')}
                    alt="加载失败"
                  />
                ) : imageUrl ? (
                  <StyledImage
                    src={imageUrl}
                    alt={selectedAttachment.originalName}
                    onError={() => setImageError(true)}
                    onLoad={() => setImageError(false)}
                  />
                ) : (
                  <CircularProgress />
                )}
              </ImageContainer>
            )}
            
            {selectedAttachment.category === 'video' && (
              <VideoContainer>
                {imageError ? (
                  <Box
                    component="img"
                    sx={{
                      maxWidth: '100%',
                      maxHeight: '60vh',
                      objectFit: 'contain',
                    }}
                    src={getPlaceholderImage(600, 400, '视频加载失败')}
                    alt="加载失败"
                  />
                ) : imageUrl ? (
                  <StyledVideo
                    src={imageUrl}
                    controls
                    preload="metadata"
                    onError={(e) => {
                      const videoElement = e.target;
                      console.error('[AttachmentDetailModal] 视频加载错误:', {
                        src: videoElement.src,
                        networkState: videoElement.networkState,
                        readyState: videoElement.readyState,
                        currentTime: videoElement.currentTime,
                        duration: videoElement.duration,
                        error: videoElement.error ? {
                          code: videoElement.error.code,
                          message: videoElement.error.message
                        } : null
                      });
                      
                      // 尝试获取更多网络信息
                      console.log('[AttachmentDetailModal] 视频网络状态:', {
                        NETWORK_EMPTY: videoElement.NETWORK_EMPTY,
                        NETWORK_IDLE: videoElement.NETWORK_IDLE,
                        NETWORK_LOADING: videoElement.NETWORK_LOADING,
                        NETWORK_NO_SOURCE: videoElement.NETWORK_NO_SOURCE,
                        currentNetworkState: videoElement.networkState
                      });
                      
                      setImageError(true);
                    }}
                    onLoadedMetadata={() => {
                      console.log('[AttachmentDetailModal] 视频元数据加载完成');
                      setImageError(false);
                    }}
                    onLoadedData={() => {
                      console.log('[AttachmentDetailModal] 视频数据加载完成');
                      setImageError(false);
                    }}
                    onStalled={() => {
                      console.warn('[AttachmentDetailModal] 视频加载停滞');
                    }}
                    onSuspend={() => {
                      console.warn('[AttachmentDetailModal] 视频加载暂停');
                    }}
                    onAbort={() => {
                      console.warn('[AttachmentDetailModal] 视频加载中止');
                    }}
                    onLoadStart={() => {
                      console.log('[AttachmentDetailModal] 视频开始加载');
                    }}
                    onCanPlay={() => {
                      console.log('[AttachmentDetailModal] 视频可以播放');
                    }}
                    onCanPlayThrough={() => {
                      console.log('[AttachmentDetailModal] 视频可以流畅播放');
                    }}
                  />
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <CircularProgress />
                    <Typography variant="body2">
                      正在加载视频...
                    </Typography>
                  </Box>
                )}
              </VideoContainer>
            )}
            
            {selectedAttachment.category === 'document' && (
              <DocumentContainer>
                {selectedAttachment.mimeType === 'application/pdf' ? (
                  <Box sx={{ height: '60vh', overflow: 'auto', width: '100%' }}>
                    {pdfError ? (
                      <DocumentPlaceholder>
                        <DocumentIcon sx={{ fontSize: 64, mb: 2, color: 'error.main' }} />
                        <Typography variant="h6" gutterBottom color="error">
                          PDF 加载失败
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {pdfError.message || '请检查文件是否损坏或网络连接。'}
                        </Typography>
                      </DocumentPlaceholder>
                    ) : imageUrl ? (
                      <Document
                        file={imageUrl}
                        onLoadSuccess={({ numPages }) => {
                          setPdfPageCount(numPages);
                          setCurrentPage(1); // Reset to the first page when a new PDF loads
                        }}
                        onLoadError={(error) => setPdfError(error)}
                        loading={
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
                            <CircularProgress />
                            <Typography variant="body2" sx={{ mt: 2 }}>
                              正在加载PDF文档...
                            </Typography>
                          </Box>
                        }
                      >
                        {pdfPageCount > 0 && <Page pageNumber={currentPage} />}
                      </Document>
                    ) : (
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
                        <CircularProgress />
                        <Typography variant="body2" sx={{ mt: 2 }}>
                          正在获取文档链接...
                        </Typography>
                      </Box>
                    )}
                  </Box>
                ) : selectedAttachment.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ? (
                  imageUrl ? (
                    <DocxViewer url={imageUrl} />
                  ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
                      <CircularProgress />
                      <Typography variant="body2" sx={{ mt: 2 }}>
                        正在获取文档链接...
                      </Typography>
                    </Box>
                  )
                ) : (selectedAttachment.mimeType === 'application/epub+zip' || selectedAttachment.mimeType === 'application/epub') ? (
                  <Box sx={{ position: 'relative', width: '100%', height: '60vh' }}>
                    <Box ref={epubViewerRef} sx={{ width: '100%', height: '100%' }} />
                    {isEpubLoading && (
                      <Box sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255, 255, 255, 0.8)' }}>
                        <CircularProgress />
                        <Typography variant="body2" sx={{ mt: 2 }}>正在加载EPUB文档...</Typography>
                      </Box>
                    )}
                    {epubError && (
                      <Box sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255, 255, 255, 0.9)' }}>
                        <Typography variant="h6" color="error">EPUB 加载失败</Typography>
                        <Typography variant="body2" color="textSecondary">渲染 EPUB 文件时出错。</Typography>
                      </Box>
                    )}
                  </Box>
                ) : (
                  <DocumentPlaceholder>
                    <DocumentIcon sx={{ fontSize: 64, mb: 2 }} />
                    <Typography variant="h6" gutterBottom>
                      文档预览不可用
                    </Typography>
                    <Typography variant="body2" align="center">
                      此文件类型不支持在线预览，请下载后查看
                    </Typography>
                    <Typography variant="caption" sx={{ mt: 1 }}>
                      文件类型: {selectedAttachment.mimeType}
                    </Typography>
                  </DocumentPlaceholder>
                )}
              </DocumentContainer>
            )}

            {/* PDF 分页控件工具栏 */}
            {selectedAttachment.mimeType === 'application/pdf' && pdfPageCount > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, p: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
                <IconButton onClick={handlePreviousPage} disabled={currentPage === 1} aria-label="上一页">
                  <NavigateBeforeIcon />
                </IconButton>
                <TextField
                  variant="outlined"
                  type="number"
                  value={inputPage}
                  onChange={(e) => setInputPage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const newPage = parseInt(e.target.value, 10);
                      if (!isNaN(newPage) && newPage >= 1 && newPage <= pdfPageCount) {
                        setCurrentPage(newPage);
                      }
                      // Reset input to the current valid page after an attempt
                      setInputPage(currentPage.toString());
                    }
                  }}
                  inputProps={{ min: 1, max: pdfPageCount, style: { textAlign: 'center', padding: '4px' } }}
                  sx={{ width: '60px', '& .MuiOutlinedInput-input': { padding: '4px' } }}
                />
                <Typography variant="caption" color="text.secondary">
                  / {pdfPageCount}
                </Typography>
                <IconButton onClick={handleNextPage} disabled={currentPage === pdfPageCount} aria-label="下一页">
                  <NavigateNextIcon />
                </IconButton>
              </Box>
            )}

            {/* EPUB 分页控件工具栏 */}
            {(selectedAttachment.mimeType === 'application/epub+zip' || selectedAttachment.mimeType === 'application/epub') && epubRendition && (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, p: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
                <IconButton onClick={handleEpubPrev} aria-label="上一章">
                  <NavigateBeforeIcon />
                </IconButton>
                <Typography variant="caption" color="text.secondary">
                  翻页
                </Typography>
                <IconButton onClick={handleEpubNext} aria-label="下一章">
                  <NavigateNextIcon />
                </IconButton>
              </Box>
            )}


            {/* PDF 页码滑动条 */}
            {pdfPageCount > 1 && (
              <Box sx={{ px: 4, py: 1 }}>
                <Slider
                  min={1}
                  max={pdfPageCount}
                  value={currentPage}
                  onChangeCommitted={(_, value) => {
                    setCurrentPage(value);
                  }}
                  aria-label="PDF 页码滑动条"
                  size="small"
                />
              </Box>
            )}
            
            <MetadataContainer>
              {metadata && (
                <>
                  <MetadataItem>
                    <MetadataLabel variant="body2">ID:</MetadataLabel>
                    <MetadataValue variant="body2">
                      <Tooltip title={selectedAttachment._id}>
                        <span>{selectedAttachment._id.substring(0, 20)}...</span>
                      </Tooltip>
                    </MetadataValue>
                  </MetadataItem>
                  
                  <MetadataItem>
                    <MetadataLabel variant="body2">文件名:</MetadataLabel>
                    <MetadataValue variant="body2">
                      {selectedAttachment.originalName}
                    </MetadataValue>
                  </MetadataItem>
                  
                  <MetadataItem>
                    <MetadataLabel variant="body2">大小:</MetadataLabel>
                    <MetadataValue variant="body2">
                      {formatFileSize(selectedAttachment.size)}
                    </MetadataValue>
                  </MetadataItem>
                  
                  <MetadataItem>
                    <MetadataLabel variant="body2">类型:</MetadataLabel>
                    <MetadataValue variant="body2">
                      {selectedAttachment.mimeType}
                    </MetadataValue>
                  </MetadataItem>
                  
                  <MetadataItem>
                    <MetadataLabel variant="body2">扩展名:</MetadataLabel>
                    <MetadataValue variant="body2">
                      {selectedAttachment.extension}
                    </MetadataValue>
                  </MetadataItem>
                  
                  <MetadataItem>
                    <MetadataLabel variant="body2">哈希值:</MetadataLabel>
                    <MetadataValue variant="body2">
                      <Tooltip title={selectedAttachment.hash}>
                        <span>{selectedAttachment.hash.substring(0, 20)}...</span>
                      </Tooltip>
                    </MetadataValue>
                  </MetadataItem>
                  
                  <MetadataItem>
                    <MetadataLabel variant="body2">创建时间:</MetadataLabel>
                    <MetadataValue variant="body2">
                      {formatDate(selectedAttachment.createdAt)}
                    </MetadataValue>
                  </MetadataItem>
                  
                  <MetadataItem>
                    <MetadataLabel variant="body2">更新时间:</MetadataLabel>
                    <MetadataValue variant="body2">
                      {formatDate(selectedAttachment.updatedAt)}
                    </MetadataValue>
                  </MetadataItem>
                  
                  <MetadataItem>
                    <MetadataLabel variant="body2">状态:</MetadataLabel>
                    <MetadataValue variant="body2" component="div">
                      <Chip
                        label={selectedAttachment.status}
                        size="small"
                        color={selectedAttachment.status === 'active' ? 'success' : 'default'}
                      />
                    </MetadataValue>
                  </MetadataItem>
                </>
              )}
              
              <ActionButtons>
                <LeftButtons>
                  {imageUrl && (
                    <Button
                      variant="outlined"
                      startIcon={<DownloadIcon />}
                      onClick={handleDownload}
                      size="small"
                    >
                      下载
                    </Button>
                  )}
                </LeftButtons>
                
                <RightButtons>
                  <Tooltip title="更多操作">
                    <IconButton
                      size="small"
                      onClick={handleMenuOpen}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </Tooltip>
                </RightButtons>
              </ActionButtons>
            </MetadataContainer>
          </StyledDialogContent>
        </>
      )}
      
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
      >
        {imageUrl && (
          <MenuItem onClick={handleDownload}>
            <DownloadIcon fontSize="small" sx={{ mr: 1 }} />
            下载
          </MenuItem>
        )}
        
        {imageUrl && (
          <MenuItem onClick={handleOpenInNew}>
            <OpenInNewIcon fontSize="small" sx={{ mr: 1 }} />
            新窗口打开
          </MenuItem>
        )}
        
        <MenuItem onClick={handleCopyId}>
          <CopyIcon fontSize="small" sx={{ mr: 1 }} />
          复制ID
        </MenuItem>
        
        {imageUrl && (
          <MenuItem onClick={handleCopyUrl}>
            <CopyIcon fontSize="small" sx={{ mr: 1 }} />
            复制URL
          </MenuItem>
        )}
        
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          删除
        </MenuItem>
      </Menu>
    </Dialog>
  );
};

export default AttachmentDetailModal;
