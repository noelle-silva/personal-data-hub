import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Card,
  CardMedia,
  CardContent,
  Typography,
  IconButton,
  Box,
  Tooltip,
  Menu,
  MenuItem
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Visibility as VisibilityIcon,
  GetApp as DownloadIcon,
  Delete as DeleteIcon,
  ContentCopy as CopyIcon,
  VideoLibrary as VideoIcon,
  Description as DocumentIcon,
  Code as CodeIcon,
  PlayArrow as RunIcon
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { useDispatch, useSelector } from 'react-redux';
import {
  setSelectedAttachment,
  setModalOpen,
  ensureAttachmentUrl,
  deleteAttachmentById
} from '../store/attachmentsSlice';
import { getPlaceholderImage } from '../services/attachments';
import AttachmentCopyButton from './AttachmentCopyButton';

// 样式化卡片
const StyledCard = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  borderRadius: 20,
  transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
  cursor: 'pointer',
  opacity: 'var(--transparency-cards, 1)',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.shadows[8],
  },
}));

// 样式化卡片媒体
const StyledCardMedia = styled(CardMedia)(({ theme }) => ({
  height: 180,
  position: 'relative',
  overflow: 'hidden',
}));

// 样式化加载占位符
const LoadingPlaceholder = styled(Box)(({ theme }) => ({
  height: 180,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: theme.palette.grey[200],
  color: theme.palette.text.secondary,
}));

// 样式化操作按钮容器
const ActionButtons = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: 8,
  right: 8,
  display: 'flex',
  gap: 4,
}));

// 样式化文件信息容器
const FileInfo = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  flexGrow: 1,
}));

// 样式化文件名
const FileName = styled(Typography)(({ theme }) => ({
  fontWeight: 600,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}));


// 样式化视频占位符
const VideoPlaceholder = styled(Box)(({ theme }) => ({
  height: 180,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: theme.palette.grey[200],
  color: theme.palette.text.secondary,
}));

// 样式化文档占位符
const DocumentPlaceholder = styled(Box)(({ theme }) => ({
  height: 180,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: theme.palette.grey[200],
  color: theme.palette.text.secondary,
}));

// 样式化文件详情
const FileDetails = styled(Typography)(({ theme }) => ({
  fontSize: '0.75rem',
  color: theme.palette.text.secondary,
}));

/**
 * 附件卡片组件
 * @param {Object} props - 组件属性
 * @param {Object} props.attachment - 附件对象
 * @param {Function} props.onView - 查看回调
 * @param {Function} props.onDelete - 删除回调
 */
const AttachmentCard = ({ attachment, onView, onDelete }) => {
  const dispatch = useDispatch();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  
  const attachmentUrlCache = useSelector(state => state.attachments.attachmentUrlCache);
  const inflightUrlRequests = useSelector(state => state.attachments.inflightUrlRequests);
  
  const cardRef = useRef(null);
  const imageRef = useRef(null);
  const observerRef = useRef(null);
  const requestedRef = useRef(false); // 防止重复请求

  // 处理卡片点击
  const handleCardClick = () => {
    if (onView) {
      onView(attachment);
    } else {
      dispatch(setSelectedAttachment(attachment._id));
      dispatch(setModalOpen(true));
    }
  };

  // 处理菜单打开
  const handleMenuOpen = (event) => {
    event.stopPropagation();
    setMenuAnchorEl(event.currentTarget);
  };

  // 处理菜单关闭
  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };

  // 处理查看
  const handleView = () => {
    handleMenuClose();
    handleCardClick();
  };

  // 处理下载
  const handleDownload = () => {
    handleMenuClose();
    if (imageUrl) {
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = attachment.originalName;
      link.click();
    }
  };

  // 处理复制ID
  const handleCopyId = () => {
    handleMenuClose();
    navigator.clipboard.writeText(attachment._id)
      .then(() => {
        // 可以添加一个提示，这里简化处理
        console.log('ID已复制到剪贴板');
      })
      .catch(err => {
        console.error('复制失败:', err);
      });
  };

  // 处理复制URL
  const handleCopyUrl = () => {
    handleMenuClose();
    if (imageUrl) {
      navigator.clipboard.writeText(window.location.origin + imageUrl)
        .then(() => {
          // 可以添加一个提示，这里简化处理
          console.log('URL已复制到剪贴板');
        })
        .catch(err => {
          console.error('复制失败:', err);
        });
    }
  };

  // 处理删除
  const handleDelete = () => {
    handleMenuClose();
    if (window.confirm(`确定要删除附件 "${attachment.originalName}" 吗？此操作不可撤销。`)) {
      dispatch(deleteAttachmentById(attachment._id))
        .unwrap()
        .then(() => {
          if (onDelete) {
            onDelete(attachment._id);
          }
        })
        .catch(error => {
          console.error('删除失败:', error);
          alert(`删除失败: ${error.message}`);
        });
    }
  };

  // 获取附件URL（本机网关转发）
  const fetchAttachmentUrl = useCallback(async () => {
    // 防止重复请求
    if (requestedRef.current) {
      console.log(`[AttachmentCard] 已请求过，跳过: ${attachment._id}`);
      return;
    }
    
    console.log(`[AttachmentCard] 开始获取附件URL: ${attachment._id}`);
    
    // 检查缓存
    const cached = attachmentUrlCache[attachment._id];
    if (cached && cached.url) {
      setImageUrl(cached.url);
      return;
    }

    // 检查是否已有正在进行的请求
    if (inflightUrlRequests[attachment._id]) {
      console.log(`[AttachmentCard] 请求已在进行中: ${attachment._id}`);
      return;
    }

    // 标记为已请求
    requestedRef.current = true;

    try {
      const result = await dispatch(ensureAttachmentUrl({ id: attachment._id })).unwrap();
      setImageUrl(result.url);
    } catch (error) {
      console.error(`[AttachmentCard] 获取附件URL失败: ${attachment._id}`, error);
      setImageError(true);
      // 请求失败时重置标记，允许重试
      requestedRef.current = false;
    }
  }, [attachment._id, attachmentUrlCache, inflightUrlRequests, dispatch]);

  // 处理图片加载完成
  const handleImageLoad = () => {
    setImageLoaded(true);
    setImageError(false);
  };

  // 处理图片加载错误
  const handleImageError = () => {
    setImageLoaded(false);
    setImageError(true);
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
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 设置 IntersectionObserver
  useEffect(() => {
    if (!cardRef.current) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !imageUrl && !imageError) {
            fetchAttachmentUrl();
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
      }
    );

    observerRef.current.observe(cardRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [attachment._id, imageUrl, imageError, fetchAttachmentUrl]);

  // 监听 attachmentUrlCache 更新，确保当缓存中有有效URL时能够显示
  useEffect(() => {
    // 如果本地已有 imageUrl 或已发生错误，则不需要处理
    if (imageUrl || imageError) return;
    
    const cached = attachmentUrlCache[attachment._id];
    if (cached && cached.url) {
      setImageUrl(cached.url);
      // 标记为已请求，防止重复请求
      requestedRef.current = true;
    }
  }, [attachmentUrlCache, attachment._id, imageUrl, imageError, fetchAttachmentUrl]);

  // 兜底方案：为不支持 IntersectionObserver 的环境添加一次性获取
  // 以及处理首屏元素已在视口的情况
  useEffect(() => {
    // 如果已有 imageUrl 或已发生错误，则不需要处理
    if (imageUrl || imageError) return;
    
    // 检查是否支持 IntersectionObserver
    if (!window.IntersectionObserver) {
      fetchAttachmentUrl();
      return;
    }
    
    // 支持 IntersectionObserver，检查元素是否已在视口内
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
      
      // 修改视口判断逻辑：只要元素顶部进入视口或左侧进入视口就触发
      const isInViewport = rect.top < viewportHeight && rect.left < viewportWidth;
      
      console.log(`[AttachmentCard] 视口检查 ${attachment._id}:`, {
        rect: { top: rect.top, left: rect.left, bottom: rect.bottom, right: rect.right },
        viewport: { height: viewportHeight, width: viewportWidth },
        isInViewport
      });
      
      // 如果元素已在视口内，直接获取附件URL
      if (isInViewport) {
        fetchAttachmentUrl();
      }
    }
  }, [attachment._id, imageUrl, imageError, fetchAttachmentUrl]);

  // 清理
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      // 组件卸载时重置请求标记
      requestedRef.current = false;
    };
  }, []);

  // 渲染图片类型的卡片
  const renderImageCard = () => (
    <StyledCardMedia onClick={handleCardClick}>
      {!imageLoaded && !imageError && (
        <LoadingPlaceholder>
          <Typography>加载中...</Typography>
        </LoadingPlaceholder>
      )}
      
      {imageError ? (
        <Box
          component="img"
          sx={{
            height: 180,
            width: '100%',
            objectFit: 'cover',
          }}
          src={getPlaceholderImage(300, 180, '图片加载失败')}
          alt="加载失败"
        />
      ) : (
        imageUrl && (
          <Box
            component="img"
            ref={imageRef}
            sx={{
              height: 180,
              width: '100%',
              objectFit: 'cover',
              opacity: imageLoaded ? 1 : 0,
              transition: 'opacity 0.3s ease',
            }}
            src={imageUrl}
            alt={attachment.originalName}
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        )
      )}
      
      <ActionButtons>
        <Tooltip title="更多操作">
          <IconButton
            size="small"
            onClick={handleMenuOpen}
            sx={{
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 1)',
              },
            }}
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </ActionButtons>
    </StyledCardMedia>
  );

  // 渲染视频类型的卡片
  const renderVideoCard = () => (
    <StyledCardMedia onClick={handleCardClick}>
      <VideoPlaceholder>
        <VideoIcon sx={{ fontSize: 48, mb: 1 }} />
        <Typography variant="body2">视频文件</Typography>
        <Typography variant="caption">{formatFileSize(attachment.size)}</Typography>
      </VideoPlaceholder>
      
      <ActionButtons>
        <Tooltip title="更多操作">
          <IconButton
            size="small"
            onClick={handleMenuOpen}
            sx={{
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 1)',
              },
            }}
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </ActionButtons>
    </StyledCardMedia>
  );

  // 渲染文档类型的卡片
  const renderDocumentCard = () => {
    // 根据扩展名选择图标
    let DocumentTypeIcon = DocumentIcon;
    if (attachment.extension === 'pdf') {
      // PDF 可以使用相同的图标，但可以添加特殊样式
    }
    
    return (
      <StyledCardMedia onClick={handleCardClick}>
        <DocumentPlaceholder>
          <DocumentTypeIcon sx={{ fontSize: 48, mb: 1 }} />
          <Typography variant="body2">文档文件</Typography>
          <Typography variant="caption">{attachment.extension?.toUpperCase()}</Typography>
          <Typography variant="caption">{formatFileSize(attachment.size)}</Typography>
        </DocumentPlaceholder>
        
        <ActionButtons>
          <Tooltip title="更多操作">
            <IconButton
              size="small"
              onClick={handleMenuOpen}
              sx={{
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 1)',
                },
              }}
            >
              <MoreVertIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </ActionButtons>
      </StyledCardMedia>
    );
  };

  // 渲染程序与脚本类型的卡片
  const renderScriptCard = () => (
    <StyledCardMedia onClick={handleCardClick}>
      <DocumentPlaceholder>
        <CodeIcon sx={{ fontSize: 48, mb: 1 }} />
        <Typography variant="body2">程序与脚本</Typography>
        <Typography variant="caption">{attachment.extension?.toUpperCase()}</Typography>
        <Typography variant="caption">{formatFileSize(attachment.size)}</Typography>
      </DocumentPlaceholder>
      
      <ActionButtons>
        {/* 预留的运行按钮，目前仅作展示 */}
        <Tooltip title="在沙盒中运行 (未来功能)">
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              alert('沙盒运行功能正在开发中...');
            }}
            sx={{
              backgroundColor: 'rgba(76, 175, 80, 0.8)',
              color: 'white',
              '&:hover': {
                backgroundColor: 'rgba(76, 175, 80, 1)',
              },
            }}
          >
            <RunIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="更多操作">
          <IconButton
            size="small"
            onClick={handleMenuOpen}
            sx={{
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 1)',
              },
            }}
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </ActionButtons>
    </StyledCardMedia>
  );

  // 根据附件类别渲染不同的卡片媒体
  const renderCardMedia = () => {
    switch (attachment.category) {
      case 'image':
        return renderImageCard();
      case 'video':
        return renderVideoCard();
      case 'document':
        return renderDocumentCard();
      case 'script':
        return renderScriptCard();
      default:
        return renderImageCard();
    }
  };

  return (
    <StyledCard ref={cardRef}>
      {renderCardMedia()}
      
      <CardContent onClick={handleCardClick} sx={{ flexGrow: 1, pb: 2 }}>
        <FileInfo>
          <FileName variant="body2" title={attachment.originalName}>
            {attachment.originalName}
          </FileName>
          
          <FileDetails variant="caption">
            大小: {formatFileSize(attachment.size)}
          </FileDetails>
          
          <FileDetails variant="caption">
            类型: {attachment.mimeType}
          </FileDetails>
          
          <FileDetails variant="caption">
            上传时间: {formatDate(attachment.createdAt)}
          </FileDetails>
        </FileInfo>
      </CardContent>
      
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
        onClick={(e) => e.stopPropagation()}
      >
        <MenuItem onClick={handleView}>
          <VisibilityIcon fontSize="small" sx={{ mr: 1 }} />
          查看
        </MenuItem>
        
        {(attachment.category === 'image' || imageUrl) && (
          <MenuItem onClick={handleDownload}>
            <DownloadIcon fontSize="small" sx={{ mr: 1 }} />
            下载
          </MenuItem>
        )}
        
        <MenuItem onClick={handleCopyId}>
          <CopyIcon fontSize="small" sx={{ mr: 1 }} />
          复制ID
        </MenuItem>
        
        {(attachment.category === 'image' || imageUrl) && (
          <MenuItem onClick={handleCopyUrl}>
            <CopyIcon fontSize="small" sx={{ mr: 1 }} />
            复制URL
          </MenuItem>
        )}
        
        {/* 复制引用菜单项 */}
        {attachment.category === 'image' && (
          <MenuItem onClick={(e) => {
            e.stopPropagation();
            handleMenuClose();
            // 生成图片HTML表达式
            const expression = `<img src="attach://${attachment._id}" alt="${attachment.originalName}" title="${attachment.originalName}" />`;
            navigator.clipboard.writeText(expression)
              .then(() => {
                console.log('图片引用已复制到剪贴板');
              })
              .catch(err => {
                console.error('复制失败:', err);
              });
          }}>
            <CopyIcon fontSize="small" sx={{ mr: 1 }} />
            复制图片引用
          </MenuItem>
        )}
        
        {attachment.category === 'video' && (
          <MenuItem onClick={(e) => {
            e.stopPropagation();
            handleMenuClose();
            // 生成视频HTML表达式
            const expression = `<video src="attach://${attachment._id}" title="${attachment.originalName}" controls></video>`;
            navigator.clipboard.writeText(expression)
              .then(() => {
                console.log('视频引用已复制到剪贴板');
              })
              .catch(err => {
                console.error('复制失败:', err);
              });
          }}>
            <CopyIcon fontSize="small" sx={{ mr: 1 }} />
            复制视频引用
          </MenuItem>
        )}
        
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          删除
        </MenuItem>
      </Menu>
    </StyledCard>
  );
};

export default AttachmentCard;
