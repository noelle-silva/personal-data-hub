import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Button,
  Menu,
  MenuItem,
  CircularProgress,
  TextField,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  GetApp as DownloadIcon,
  ContentCopy as CopyIcon,
  Delete as DeleteIcon,
  OpenInNew as OpenInNewIcon,
  MoreVert as MoreVertIcon,
  Description as DocumentIcon,
  NavigateBefore as NavigateBeforeIcon,
  NavigateNext as NavigateNextIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { styled, useTheme } from '@mui/material/styles';
import { Document, Page, pdfjs } from 'react-pdf';
import { renderAsync } from 'docx-preview';
import EpubViewer from './EpubViewer';
import MarkdownInlineRenderer from './MarkdownInlineRenderer';
import AttachmentCopyButton from './AttachmentCopyButton';
import { useSelector, useDispatch } from 'react-redux';
import {
  selectAttachmentById,
  selectAttachmentUrlCache,
  selectInflightUrlRequests,
  selectUpdateStatus,
  selectUpdateError,
  ensureAttachmentUrl,
  deleteAttachmentById,
  fetchAttachmentMetadata,
  updateAttachmentMetadataById,
  resetUpdateStatus
} from '../store/attachmentsSlice';
import { getPlaceholderImage } from '../services/attachments';

// 配置 react-pdf 的 worker，使用本地文件
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

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

// 内容根容器
const ContentRoot = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minHeight: 0,
  height: '100%',
}));

// 滚动区域容器
const ScrollArea = styled(Box)(({ theme }) => ({
  flexGrow: 1,
  overflowY: 'auto',
  '&::-webkit-scrollbar': {
    width: 8,
  },
  '&::-webkit-scrollbar-track': {
    background: theme.palette.background.default,
  },
  '&::-webkit-scrollbar-thumb': {
    background: theme.palette.primary.main,
    borderRadius: 4,
  },
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
 * 附件详情内容组件
 */
const AttachmentDetailContent = ({
  attachment: propAttachment,
  onDelete,
  initialData
}) => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const attachmentUrlCache = useSelector(selectAttachmentUrlCache);
  const inflightUrlRequests = useSelector(selectInflightUrlRequests);
  const updateStatus = useSelector(selectUpdateStatus);
  const updateError = useSelector(selectUpdateError);
  
  // 优先使用传入的 props 数据，Redux 无数据时回退到 props
  const selectedAttachmentId = propAttachment?._id || initialData?._id;
  const reduxAttachment = useSelector(state =>
    selectedAttachmentId ? selectAttachmentById(selectedAttachmentId)(state) : null
  );
  
  // 合并数据：优先使用 props 数据，Redux 数据作为补充
  const attachment = propAttachment || reduxAttachment || initialData;
  
  const [imageError, setImageError] = useState(false);
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [pdfPageCount, setPdfPageCount] = useState(null);
  const [pdfError, setPdfError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [inputPage, setInputPage] = useState('1');
  
  // 编辑模式相关状态
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    originalName: '',
    description: ''
  });
  const [formErrors, setFormErrors] = useState({
    originalName: '',
    description: ''
  });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // 组件挂载状态引用，避免卸载后setState
  const isMountedRef = useRef(true);
  
  // 获取当前附件的URL（本机网关转发）
  const imageUrl = selectedAttachmentId ? attachmentUrlCache[selectedAttachmentId]?.url : null;

  // PDF 翻页处理
  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(pdfPageCount, prev + 1));
  };

  // EPUB 错误处理
  const handleEpubError = useCallback((error) => {
    if (process.env.NODE_ENV === 'development') {
      console.error('[AttachmentDetailContent] EPUB 错误:', error);
    }
  }, []);

  // 获取附件URL
  const fetchAttachmentUrl = useCallback(async () => {
    if (!selectedAttachmentId) return;
    
    const cached = attachmentUrlCache[selectedAttachmentId];
    if (cached && cached.url) return;
    
    // 检查是否已有正在进行的请求
    if (inflightUrlRequests[selectedAttachmentId]) {
      return;
    }
    
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
      link.download = attachment?.originalName || 'attachment';
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
    if (attachment) {
      navigator.clipboard.writeText(attachment._id)
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
    if (attachment && window.confirm(`确定要删除附件 "${attachment.originalName}" 吗？此操作不可撤销。`)) {
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

  // 格式化文件大小
  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '未知大小';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  // 格式化日期
  const formatDate = (dateString) => {
    if (!dateString) return '未知时间';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '未知时间';
    return date.toLocaleString('zh-CN');
  };
  
  // 编辑模式相关处理函数
  const handleToggleEditMode = useCallback(() => {
    if (isEditing) {
      // 切换回浏览模式，如果有未保存的更改则提示
      if (hasUnsavedChanges) {
        if (window.confirm('您有未保存的更改，确定要退出编辑模式吗？')) {
          setIsEditing(false);
          setHasUnsavedChanges(false);
          setFormErrors({ originalName: '', description: '' });
          dispatch(resetUpdateStatus());
        }
      } else {
        setIsEditing(false);
        dispatch(resetUpdateStatus());
      }
    } else {
      // 切换到编辑模式，初始化表单数据
      setEditForm({
        originalName: attachment?.originalName || '',
        description: attachment?.description || metadata?.description || ''
      });
      setFormErrors({ originalName: '', description: '' });
      setHasUnsavedChanges(false);
      setIsEditing(true);
    }
  }, [isEditing, hasUnsavedChanges, attachment, metadata, dispatch]);
  
  const handleFieldChange = useCallback((field, value) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
    
    // 清除该字段的错误
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  }, [formErrors]);
  
  const validateForm = useCallback(() => {
    const errors = {};
    
    // 验证文件名
    if (!editForm.originalName.trim()) {
      errors.originalName = '文件名不能为空';
    } else if (editForm.originalName.length > 255) {
      errors.originalName = '文件名不能超过255个字符';
    }
    
    // 验证描述
    if (editForm.description.length > 20000) {
      errors.description = '内容描述不能超过20000个字符';
    }
    
    return errors;
  }, [editForm]);
  
  const handleSave = useCallback(async () => {
    const errors = validateForm();
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    
    try {
      await dispatch(updateAttachmentMetadataById({
        id: selectedAttachmentId,
        metadata: editForm
      })).unwrap();
      
      setIsEditing(false);
      setHasUnsavedChanges(false);
      dispatch(resetUpdateStatus());
      
      // 刷新元数据
      fetchMetadata();
    } catch (error) {
      console.error('保存失败:', error);
    }
  }, [selectedAttachmentId, editForm, validateForm, dispatch, fetchMetadata]);
  
  const handleCancelEdit = useCallback(() => {
    if (hasUnsavedChanges) {
      if (window.confirm('您有未保存的更改，确定要取消吗？')) {
        setIsEditing(false);
        setHasUnsavedChanges(false);
        setFormErrors({ originalName: '', description: '' });
        dispatch(resetUpdateStatus());
      }
    } else {
      setIsEditing(false);
      dispatch(resetUpdateStatus());
    }
  }, [hasUnsavedChanges, dispatch]);

  // 当附件ID变化时，获取附件URL和元数据
  useEffect(() => {
    if (selectedAttachmentId) {
      fetchAttachmentUrl();
      fetchMetadata();
    }
  }, [selectedAttachmentId, fetchAttachmentUrl, fetchMetadata]);

  // 当组件卸载时，清理状态
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // 渲染图片类型
  const renderImage = () => (
    <ImageContainer>
      {imageError ? (
        <Box
          component="img"
          sx={{
            height: '60vh',
            width: '100%',
            objectFit: 'cover',
          }}
          src={getPlaceholderImage(600, 400, '图片加载失败')}
          alt="加载失败"
        />
      ) : (
        imageUrl && (
          <StyledImage
            src={imageUrl}
            alt={attachment?.originalName}
            onError={() => setImageError(true)}
          />
        )
      )}
    </ImageContainer>
  );

  // 渲染视频类型
  const renderVideo = () => (
    <VideoContainer>
      {imageUrl ? (
        <StyledVideo
          controls
          src={imageUrl}
          preload="metadata"
        >
          您的浏览器不支持视频播放。
        </StyledVideo>
      ) : (
        <DocumentPlaceholder>
          <Typography variant="body2">正在加载视频...</Typography>
        </DocumentPlaceholder>
      )}
    </VideoContainer>
  );

  // 渲染PDF类型
  const renderPdf = () => (
    <DocumentContainer>
      {imageUrl ? (
        <Box sx={{ height: '60vh', overflow: 'auto', width: '100%' }}>
          <Document
            file={imageUrl}
            onLoadSuccess={({ numPages }) => setPdfPageCount(numPages)}
            onLoadError={(error) => {
              if (process.env.NODE_ENV === 'development') {
                console.error('[AttachmentDetailContent] PDF加载错误:', error);
              }
              setPdfError('PDF 加载失败');
            }}
          >
            <Page pageNumber={currentPage} />
          </Document>
          
          {pdfPageCount > 1 && (
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              gap: 2, 
              mt: 2,
              p: 2
            }}>
              <IconButton 
                onClick={handlePreviousPage} 
                disabled={currentPage <= 1}
              >
                <NavigateBeforeIcon />
              </IconButton>
              
              <TextField
                size="small"
                type="number"
                value={inputPage}
                onChange={(e) => setInputPage(e.target.value)}
                onBlur={() => {
                  const page = parseInt(inputPage);
                  if (page >= 1 && page <= pdfPageCount) {
                    setCurrentPage(page);
                  } else {
                    setInputPage(currentPage.toString());
                  }
                }}
                inputProps={{ 
                  min: 1, 
                  max: pdfPageCount, 
                  style: { width: 60, textAlign: 'center' } 
                }}
                sx={{ mx: 1 }}
              />
              
              <Typography variant="body2">
                / {pdfPageCount}
              </Typography>
              
              <IconButton 
                onClick={handleNextPage} 
                disabled={currentPage >= pdfPageCount}
              >
                <NavigateNextIcon />
              </IconButton>
            </Box>
          )}
        </Box>
      ) : (
        <DocumentPlaceholder>
          <Typography variant="body2">正在加载PDF...</Typography>
        </DocumentPlaceholder>
      )}
      
      {pdfError && (
        <Box sx={{ mt: 2, p: 2, bgcolor: 'error.light', borderRadius: 1 }}>
          <Typography variant="body2" color="error">
            {pdfError}
          </Typography>
        </Box>
      )}
    </DocumentContainer>
  );

  // 渲染DOCX类型
  const renderDocx = () => (
    <DocumentContainer>
      {imageUrl ? (
        <DocxViewer url={imageUrl} />
      ) : (
        <DocumentPlaceholder>
          <Typography variant="body2">正在加载DOCX...</Typography>
        </DocumentPlaceholder>
      )}
    </DocumentContainer>
  );

  // 渲染EPUB类型
  const renderEpub = () => (
    <DocumentContainer>
      <EpubViewer
        src={imageUrl}
        height="60vh"
        onError={handleEpubError}
      />
    </DocumentContainer>
  );

  // 渲染其他文档类型
  const renderOtherDocument = () => (
    <DocumentContainer>
      <DocumentPlaceholder>
        <DocumentIcon sx={{ fontSize: 48, mb: 2 }} />
        <Typography variant="body2">
          此文件类型暂不支持预览
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {attachment?.mimeType}
        </Typography>
      </DocumentPlaceholder>
    </DocumentContainer>
  );

  // 从 MIME 类型推断类别的辅助函数
  const deriveCategoryFromMimeType = (mimeType) => {
    if (!mimeType) return 'other';
    
    if (mimeType.startsWith('image/')) {
      return 'image';
    } else if (mimeType.startsWith('video/')) {
      return 'video';
    } else if (mimeType === 'application/pdf') {
      return 'document';
    } else if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimeType === 'application/msword' ||
      mimeType === 'application/vnd.ms-word' ||
      mimeType === 'application/msword.document.12'
    ) {
      return 'document';
    } else if (
      mimeType === 'application/epub+zip' ||
      mimeType === 'application/epub'
    ) {
      return 'document';
    } else {
      return 'other';
    }
  };

  // 根据附件类型渲染内容
  const renderContent = () => {
    if (!attachment) return null;
    
    // 如果没有 category，尝试从 mimeType 推断
    const effectiveCategory = attachment.category || deriveCategoryFromMimeType(attachment.mimeType);
    
    switch (effectiveCategory) {
      case 'image':
        return renderImage();
      case 'video':
        return renderVideo();
      case 'document':
        if (attachment.mimeType === 'application/pdf') {
          return renderPdf();
        } else if (
          attachment.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
          attachment.mimeType === 'application/msword'
        ) {
          return renderDocx();
        } else if (
          attachment.mimeType === 'application/epub+zip' ||
          attachment.mimeType === 'application/epub'
        ) {
          return renderEpub();
        } else {
          return renderOtherDocument();
        }
      default:
        return renderOtherDocument();
    }
  };

  return (
    <ContentRoot>
      {/* 操作按钮 */}
      <ActionButtons>
        <LeftButtons>
          {imageUrl && (
            <>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={handleDownload}
                sx={{ borderRadius: 12 }}
              >
                下载
              </Button>
              <Button
                variant="outlined"
                startIcon={<OpenInNewIcon />}
                onClick={handleOpenInNew}
                sx={{ borderRadius: 12 }}
              >
                新窗口打开
              </Button>
            </>
          )}
          
          {/* 附件引用复制按钮 */}
          {!isEditing && attachment && (
            <>
              {attachment.category === 'image' && (
                <AttachmentCopyButton
                  attachment={attachment}
                  type="image"
                  tooltip="复制图片HTML引用"
                  size="medium"
                />
              )}
              {attachment.category === 'video' && (
                <AttachmentCopyButton
                  attachment={attachment}
                  type="video"
                  tooltip="复制视频HTML引用"
                  size="medium"
                />
              )}
            </>
          )}
          
          {/* 编辑按钮 */}
          <Button
            variant={isEditing ? "contained" : "outlined"}
            startIcon={isEditing ? <SaveIcon /> : <EditIcon />}
            onClick={isEditing ? handleSave : handleToggleEditMode}
            disabled={updateStatus === 'updating'}
            sx={{ borderRadius: 12 }}
          >
            {isEditing ? '保存' : '编辑'}
          </Button>
          
          {/* 取消编辑按钮 */}
          {isEditing && (
            <Button
              variant="outlined"
              startIcon={<CancelIcon />}
              onClick={handleCancelEdit}
              sx={{ borderRadius: 12 }}
            >
              取消
            </Button>
          )}
        </LeftButtons>
        
        <RightButtons>
          <IconButton
            onClick={handleMenuOpen}
            title="更多操作"
          >
            <MoreVertIcon />
          </IconButton>
        </RightButtons>
      </ActionButtons>

      {/* 滚动区域 */}
      <ScrollArea>
        {/* 内容区域 */}
        {renderContent()}

        {/* 元数据 */}
        <MetadataContainer>
          <Typography variant="h6" gutterBottom>
            文件信息
          </Typography>
          
          <MetadataItem>
            <MetadataLabel>文件名:</MetadataLabel>
            {isEditing ? (
              <TextField
                fullWidth
                size="small"
                value={editForm.originalName}
                onChange={(e) => handleFieldChange('originalName', e.target.value)}
                error={!!formErrors.originalName}
                helperText={formErrors.originalName}
                inputProps={{ maxLength: 255 }}
              />
            ) : (
              <MetadataValue>{attachment?.originalName || '未知文件名'}</MetadataValue>
            )}
          </MetadataItem>
          
          <MetadataItem>
            <MetadataLabel>文件大小:</MetadataLabel>
            <MetadataValue>{formatFileSize(attachment?.size)}</MetadataValue>
          </MetadataItem>
          
          <MetadataItem>
            <MetadataLabel>文件类型:</MetadataLabel>
            <MetadataValue>{attachment?.mimeType || '未知类型'}</MetadataValue>
          </MetadataItem>
          
          <MetadataItem>
            <MetadataLabel>上传时间:</MetadataLabel>
            <MetadataValue>{formatDate(attachment?.createdAt)}</MetadataValue>
          </MetadataItem>
          
          {/* 内容描述区块 */}
          <MetadataItem sx={{ flexDirection: 'column', alignItems: 'flex-start' }}>
            <MetadataLabel>内容描述:</MetadataLabel>
            {isEditing ? (
              <Box sx={{ width: '100%' }}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  value={editForm.description}
                  onChange={(e) => handleFieldChange('description', e.target.value)}
                  error={!!formErrors.description}
                  helperText={
                    formErrors.description ||
                    `${editForm.description.length}/20000 字符`
                  }
                  inputProps={{ maxLength: 20000 }}
                  sx={{ mt: 1 }}
                />
                
                {/* 预览区域 */}
                {editForm.description && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      预览:
                    </Typography>
                    <Box sx={{
                      border: `1px solid ${theme.palette.divider}`,
                      borderRadius: 1,
                      p: 2,
                      maxHeight: 300,
                      overflow: 'auto'
                    }}>
                      <MarkdownInlineRenderer content={editForm.description} />
                    </Box>
                  </Box>
                )}
              </Box>
            ) : (
              <Box sx={{ width: '100%' }}>
                {(attachment?.description || metadata?.description) ? (
                  <Box sx={{
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: 1,
                    p: 2,
                    maxHeight: 300,
                    overflow: 'auto'
                  }}>
                    <MarkdownInlineRenderer content={attachment?.description || metadata?.description} />
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                    暂无内容描述
                  </Typography>
                )}
              </Box>
            )}
          </MetadataItem>
          
          {metadata && (
            <>
              <MetadataItem>
                <MetadataLabel>原始文件名:</MetadataLabel>
                <MetadataValue>{metadata.originalName || '未知文件名'}</MetadataValue>
              </MetadataItem>
               
              <MetadataItem>
                <MetadataLabel>MIME类型:</MetadataLabel>
                <MetadataValue>{metadata.mimeType || '未知类型'}</MetadataValue>
              </MetadataItem>
               
              {metadata.dimensions && (
                <MetadataItem>
                  <MetadataLabel>图片尺寸:</MetadataLabel>
                  <MetadataValue>{metadata.dimensions.width} × {metadata.dimensions.height}</MetadataValue>
                </MetadataItem>
              )}
              
              {metadata.duration && (
                <MetadataItem>
                  <MetadataLabel>视频时长:</MetadataLabel>
                  <MetadataValue>{metadata.duration}秒</MetadataValue>
                </MetadataItem>
              )}
            </>
          )}
        </MetadataContainer>
      </ScrollArea>

      {/* 操作菜单 */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleCopyId}>
          <ListItemIcon>
            <CopyIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>复制ID</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleCopyUrl}>
          <ListItemIcon>
            <CopyIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>复制URL</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDelete}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText sx={{ color: 'error.main' }}>删除附件</ListItemText>
        </MenuItem>
      </Menu>
      
      {/* 更新状态提示 */}
      {updateStatus === 'updating' && (
        <Box sx={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          bgcolor: 'info.main',
          color: 'white',
          p: 2,
          borderRadius: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          zIndex: 1000
        }}>
          <CircularProgress size={16} color="inherit" />
          <Typography variant="body2">正在保存...</Typography>
        </Box>
      )}
      
      {/* 更新错误提示 */}
      {updateError && (
        <Box sx={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          bgcolor: 'error.main',
          color: 'white',
          p: 2,
          borderRadius: 1,
          maxWidth: 300,
          zIndex: 1000
        }}>
          <Typography variant="body2">{updateError}</Typography>
        </Box>
      )}
    </ContentRoot>
  );
};

export default AttachmentDetailContent;
