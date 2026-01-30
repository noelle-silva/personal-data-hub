import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import { 
  Refresh as RefreshIcon,
  BrokenImage as BrokenImageIcon,
  PlayArrow as PlayArrowIcon,
  Videocam as VideocamIcon
} from '@mui/icons-material';
import { getAttachmentUrlCached } from '../services/attachmentUrlCache';

// 样式化的容器
const VideoContainer = styled(Box)(({ theme }) => ({
  position: 'relative',
  display: 'inline-flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: 200,
  minHeight: 150,
  backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
  borderRadius: theme.shape.borderRadius,
  overflow: 'hidden',
}));

// 样式化的视频
const StyledVideo = styled('video')(({ theme }) => ({
  width: '100%',
  height: '100%',
  objectFit: 'contain',
  transition: 'opacity 0.3s ease',
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

// 样式化的播放按钮
const PlayButton = styled(IconButton)(({ theme }) => ({
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  backgroundColor: 'rgba(0, 0, 0, 0.6)',
  color: 'white',
  '&:hover': {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
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
 * 附件视频组件
 * 支持通过 attach:// 引用加载并显示附件视频
 */
const AttachmentVideo = ({
  id,
  title = '',
  width,
  height,
  style = {},
  ttl,
  controls = true,
  autoplay = false,
  muted = false,
  loop = false,
  poster,
  onError,
  onLoad,
  placeholderWidth = 200,
  placeholderHeight = 150,
  maxRetries = 3,
  showRetryButton = true,
  ...props
}) => {
  const [attachmentUrl, setAttachmentUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const videoRef = useRef(null);

  // 加载附件URL（本机网关转发）
  const loadAttachmentUrl = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    setError(null);

    try {
      const url = await getAttachmentUrlCached(id);
      setAttachmentUrl(url);
    } catch (err) {
      console.error(`[AttachmentVideo] 获取附件URL失败: ${id}`, err);
      setError(err);
      setLoading(false);
      
      // 调用外部错误回调
      if (onError) {
        onError(err);
      }
    }
  }, [id, onError]);

  // 处理视频加载成功
  const handleVideoLoad = useCallback((event) => {
    setLoading(false);
    setError(null);
    setRetryCount(0);
    setVideoLoaded(true);
    
    // 调用外部加载回调
    if (onLoad) {
      onLoad(event);
    }
  }, [onLoad]);

  // 处理视频加载失败
  const handleVideoError = (event) => {
    console.error(`[AttachmentVideo] 视频加载失败: ${id}`, event);
    
    // 如果还有重试次数，则重试
    if (retryCount < maxRetries) {
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
        loadAttachmentUrl();
      }, 1000 * Math.pow(2, retryCount)); // 指数退避
    } else {
      // 重试次数用完，显示错误状态
      setLoading(false);
      setError(new Error('视频加载失败'));
      setVideoLoaded(false);
      
      // 调用外部错误回调
      if (onError) {
        onError(new Error('视频加载失败'));
      }
    }
  };

  // 处理播放按钮点击
  const handlePlayClick = () => {
    if (videoRef.current) {
      videoRef.current.play();
    }
  };

  // 手动重试
  const handleRetry = () => {
    setRetryCount(0);
    loadAttachmentUrl();
  };

  // 组件挂载时加载附件URL
  useEffect(() => {
    loadAttachmentUrl();
  }, [loadAttachmentUrl, ttl]);

  // 当URL变化时重置状态
  useEffect(() => {
    if (attachmentUrl) {
      setLoading(true);
      setError(null);
      setVideoLoaded(false);
      
      // 缓存就绪兜底：如果视频已经有足够数据，立即清除loading状态
      if (videoRef.current && videoRef.current.readyState >= 2) { // HAVE_CURRENT_DATA
        handleVideoLoad();
      }
    }
  }, [attachmentUrl, handleVideoLoad]);

  // 构建样式对象
  const containerStyle = {
    width: width || 'auto',
    height: height || 'auto',
    ...style,
  };

  const videoStyle = {
    width: '100%',
    height: '100%',
  };

  return (
    <VideoContainer style={containerStyle}>

      {/* 错误状态 */}
      {error && (
        <ErrorOverlay>
          <BrokenImageIcon sx={{ fontSize: 32, mb: 1 }} />
          <Typography variant="body2" gutterBottom>
            视频加载失败
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

      {/* 视频未加载时的播放按钮 */}
      {!loading && !error && !videoLoaded && attachmentUrl && (
        <PlayButton onClick={handlePlayClick}>
          <PlayArrowIcon fontSize="large" />
        </PlayButton>
      )}

      {/* 实际视频 */}
      {attachmentUrl && (
        <StyledVideo
          ref={videoRef}
          src={attachmentUrl}
          title={title}
          style={videoStyle}
          controls={controls}
          autoplay={autoplay}
          muted={muted}
          loop={loop}
          poster={poster}
          onLoad={handleVideoLoad}
          onError={handleVideoError}
          onLoadedMetadata={handleVideoLoad}
          onCanPlay={handleVideoLoad}
          {...props}
        />
      )}

      {/* 无URL时的占位图标 */}
      {!attachmentUrl && !loading && !error && (
        <ErrorOverlay>
          <VideocamIcon sx={{ fontSize: 32, mb: 1 }} />
          <Typography variant="body2">
            无效的附件引用
          </Typography>
        </ErrorOverlay>
      )}
    </VideoContainer>
  );
};

export default AttachmentVideo;
