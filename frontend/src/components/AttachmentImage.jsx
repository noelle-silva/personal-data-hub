import React, { useState, useEffect, useRef } from 'react';
import { Box, CircularProgress, IconButton, Tooltip, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import { 
  Refresh as RefreshIcon,
  BrokenImage as BrokenImageIcon,
  Image as ImageIcon
} from '@mui/icons-material';
import { getSignedUrlCached } from '../services/attachmentUrlCache';
import { getPlaceholderImage } from '../services/attachments';

// 样式化的容器
const ImageContainer = styled(Box)(({ theme }) => ({
  position: 'relative',
  display: 'inline-flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: 100,
  minHeight: 100,
  backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
  borderRadius: theme.shape.borderRadius,
  overflow: 'hidden',
}));

// 样式化的图片
const StyledImage = styled('img')(({ theme }) => ({
  maxWidth: '100%',
  maxHeight: '100%',
  objectFit: 'contain',
  transition: 'opacity 0.3s ease',
}));

// 样式化的加载状态
const LoadingOverlay = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.5)' : 'rgba(255, 255, 255, 0.8)',
  zIndex: 1,
}));

// 样式化的错误状态
const ErrorOverlay = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.9)',
  color: theme.palette.text.secondary,
  zIndex: 1,
  padding: theme.spacing(2),
  textAlign: 'center',
}));

// 样式化的重试按钮
const RetryButton = styled(IconButton)(({ theme }) => ({
  marginTop: theme.spacing(1),
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  '&:hover': {
    backgroundColor: theme.palette.primary.dark,
  },
}));

/**
 * 附件图片组件
 * 支持通过 attach:// 引用加载并显示附件图片
 */
const AttachmentImage = ({
  id,
  alt = '',
  title = '',
  width,
  height,
  style = {},
  ttl, // 允许外部传入 TTL
  onError,
  onLoad,
  placeholderWidth = 200,
  placeholderHeight = 150,
  maxRetries = 3,
  showRetryButton = true,
  ...props
}) => {
  const [signedUrl, setSignedUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const imageRef = useRef(null);

  // 加载签名URL
  const loadSignedUrl = async () => {
    if (!id) return;

    setLoading(true);
    setError(null);

    try {
      const url = await getSignedUrlCached(id, ttl);
      setSignedUrl(url);
    } catch (err) {
      console.error(`[AttachmentImage] 获取签名URL失败: ${id}`, err);
      setError(err);
      setLoading(false);
      
      // 调用外部错误回调
      if (onError) {
        onError(err);
      }
    }
  };

  // 处理图片加载成功
  const handleImageLoad = (event) => {
    setLoading(false);
    setError(null);
    setRetryCount(0);
    
    // 调用外部加载回调
    if (onLoad) {
      onLoad(event);
    }
  };

  // 处理图片加载失败
  const handleImageError = (event) => {
    console.error(`[AttachmentImage] 图片加载失败: ${id}`, event);
    
    // 如果还有重试次数，则重试
    if (retryCount < maxRetries) {
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
        loadSignedUrl();
      }, 1000 * Math.pow(2, retryCount)); // 指数退避
    } else {
      // 重试次数用完，显示错误状态
      setLoading(false);
      setError(new Error('图片加载失败'));
      
      // 设置占位图
      if (imageRef.current) {
        imageRef.current.src = getPlaceholderImage(placeholderWidth, placeholderHeight, alt || '图片加载失败');
      }
      
      // 调用外部错误回调
      if (onError) {
        onError(new Error('图片加载失败'));
      }
    }
  };

  // 手动重试
  const handleRetry = () => {
    setRetryCount(0);
    loadSignedUrl();
  };

  // 组件挂载时加载签名URL
  useEffect(() => {
    loadSignedUrl();
  }, [id, ttl]);

  // 当URL变化时重置状态
  useEffect(() => {
    if (signedUrl) {
      setLoading(true);
      setError(null);
    }
  }, [signedUrl]);

  // 构建样式对象
  const containerStyle = {
    width: width || 'auto',
    height: height || 'auto',
    ...style,
  };

  const imageStyle = {
    width: '100%',
    height: '100%',
    opacity: loading ? 0.7 : 1,
  };

  return (
    <ImageContainer style={containerStyle}>
      {/* 加载状态 */}
      {loading && (
        <LoadingOverlay>
          <CircularProgress size={24} />
          <Typography variant="caption" sx={{ mt: 1 }}>
            加载中...
          </Typography>
        </LoadingOverlay>
      )}

      {/* 错误状态 */}
      {error && (
        <ErrorOverlay>
          <BrokenImageIcon sx={{ fontSize: 32, mb: 1 }} />
          <Typography variant="body2" gutterBottom>
            图片加载失败
          </Typography>
          
          {showRetryButton && (
            <Tooltip title="重试">
              <RetryButton size="small" onClick={handleRetry}>
                <RefreshIcon />
              </RetryButton>
            </Tooltip>
          )}
        </ErrorOverlay>
      )}

      {/* 实际图片 */}
      {signedUrl && (
        <StyledImage
          ref={imageRef}
          src={signedUrl}
          alt={alt}
          title={title}
          style={imageStyle}
          onLoad={handleImageLoad}
          onError={handleImageError}
          {...props}
        />
      )}

      {/* 无URL时的占位图标 */}
      {!signedUrl && !loading && !error && (
        <ErrorOverlay>
          <ImageIcon sx={{ fontSize: 32, mb: 1 }} />
          <Typography variant="body2">
            无效的附件引用
          </Typography>
        </ErrorOverlay>
      )}
    </ImageContainer>
  );
};

export default AttachmentImage;