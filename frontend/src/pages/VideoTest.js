import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Alert,
  CircularProgress,
  Paper,
  Divider,
  Chip
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { getAttachments } from '../services/attachments';
import { getAttachmentUrlCached } from '../services/attachmentUrlCache';

const Container = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  maxWidth: 1200,
  margin: '0 auto'
}));

const VideoContainer = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(2),
  marginBottom: theme.spacing(2)
}));

const StyledVideo = styled('video')(({ theme }) => ({
  width: '100%',
  maxWidth: 800,
  height: 'auto',
  maxHeight: 450,
  backgroundColor: '#000',
  borderRadius: theme.shape.borderRadius
}));

const InfoPanel = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  marginTop: theme.spacing(2),
  marginBottom: theme.spacing(2)
}));

/**
 * 视频测试页面
 * 用于调试视频播放问题
 */
const VideoTestPage = () => {
  const [attachments, setAttachments] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [videoInfo, setVideoInfo] = useState({});
  const [networkLogs, setNetworkLogs] = useState([]);

  // 加载视频附件列表
  const loadVideos = async () => {
    try {
      setLoading(true);
      const response = await getAttachments({ category: 'video' });
      setAttachments(response.data || []);
      setError('');
    } catch (err) {
      setError(`加载视频列表失败: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 获取视频URL（本机网关转发）
  const getVideoUrl = async (video) => {
    try {
      setLoading(true);
      const url = await getAttachmentUrlCached(video._id);
      setVideoUrl(url);
      setSelectedVideo(video);
      setError('');
      
      // 添加网络日志
      addNetworkLog('获取视频URL', 'success', `URL: ${url}`);
    } catch (err) {
      setError(`获取视频URL失败: ${err.message}`);
      addNetworkLog('获取视频URL', 'error', err.message);
    } finally {
      setLoading(false);
    }
  };

  // 添加网络日志
  const addNetworkLog = (action, status, details) => {
    setNetworkLogs(prev => [
      ...prev,
      {
        timestamp: new Date().toLocaleTimeString(),
        action,
        status,
        details
      }
    ]);
  };

  // 视频事件处理
  const handleVideoError = (e) => {
    const video = e.target;
    const errorInfo = {
      networkState: video.networkState,
      readyState: video.readyState,
      error: video.error ? {
        code: video.error.code,
        message: video.error.message
      } : null
    };
    
    setVideoInfo(prev => ({ ...prev, error: errorInfo }));
    addNetworkLog('视频加载错误', 'error', JSON.stringify(errorInfo, null, 2));
  };

  const handleVideoLoadStart = () => {
    addNetworkLog('视频开始加载', 'info', '');
  };

  const handleVideoCanPlay = () => {
    addNetworkLog('视频可以播放', 'success', '');
  };

  const handleVideoLoadedMetadata = (e) => {
    const video = e.target;
    const metadata = {
      duration: video.duration,
      videoWidth: video.videoWidth,
      videoHeight: video.videoHeight,
      readyState: video.readyState
    };
    
    setVideoInfo(prev => ({ ...prev, metadata }));
    addNetworkLog('视频元数据加载完成', 'success', JSON.stringify(metadata, null, 2));
  };

  // 初始加载
  useEffect(() => {
    loadVideos();
  }, []);

  return (
    <Container>
      <Typography variant="h4" gutterBottom>
        视频播放测试
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* 视频列表 */}
      <InfoPanel>
        <Typography variant="h6" gutterBottom>
          视频附件列表 ({attachments.length})
        </Typography>
        
        {loading ? (
          <Box display="flex" justifyContent="center" p={2}>
            <CircularProgress />
          </Box>
        ) : (
          <Box>
            {attachments.length === 0 ? (
              <Typography color="text.secondary">
                没有找到视频附件
              </Typography>
            ) : (
              attachments.map((video) => (
                <Box
                  key={video._id}
                  sx={{
                    p: 2,
                    mb: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: 'action.hover'
                    }
                  }}
                  onClick={() => getVideoUrl(video)}
                >
                  <Typography variant="subtitle1">
                    {video.originalName}
                  </Typography>
                  <Box display="flex" gap={1} mt={1}>
                    <Chip label={`${(video.size / 1024 / 1024).toFixed(2)} MB`} size="small" />
                    <Chip label={video.mimeType} size="small" />
                    <Chip label={video.extension?.toUpperCase()} size="small" />
                  </Box>
                </Box>
              ))
            )}
          </Box>
        )}
        
        <Button
          variant="outlined"
          onClick={loadVideos}
          sx={{ mt: 2 }}
          disabled={loading}
        >
          刷新列表
        </Button>
      </InfoPanel>

      {/* 视频播放器 */}
      {selectedVideo && (
        <VideoContainer>
          <Typography variant="h6" gutterBottom>
            正在播放: {selectedVideo.originalName}
          </Typography>
          
          <StyledVideo
            src={videoUrl}
            controls
            preload="metadata"
            onError={handleVideoError}
            onLoadStart={handleVideoLoadStart}
            onCanPlay={handleVideoCanPlay}
            onLoadedMetadata={handleVideoLoadedMetadata}
          />
          
          <TextField
            label="视频URL"
            value={videoUrl}
            fullWidth
            multiline
            rows={2}
            sx={{ mt: 2 }}
            InputProps={{
              readOnly: true
            }}
          />
        </VideoContainer>
      )}

      {/* 视频信息 */}
      {Object.keys(videoInfo).length > 0 && (
        <InfoPanel>
          <Typography variant="h6" gutterBottom>
            视频信息
          </Typography>
          <pre style={{ fontSize: '12px', overflow: 'auto' }}>
            {JSON.stringify(videoInfo, null, 2)}
          </pre>
        </InfoPanel>
      )}

      {/* 网络日志 */}
      {networkLogs.length > 0 && (
        <InfoPanel>
          <Typography variant="h6" gutterBottom>
            网络日志
          </Typography>
          <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
            {networkLogs.map((log, index) => (
              <Box key={index} sx={{ mb: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  {log.timestamp}
                </Typography>
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="body2">
                    {log.action}
                  </Typography>
                  <Chip
                    label={log.status}
                    size="small"
                    color={log.status === 'error' ? 'error' : log.status === 'success' ? 'success' : 'default'}
                  />
                </Box>
                {log.details && (
                  <Typography variant="caption" component="pre" sx={{ ml: 2 }}>
                    {log.details}
                  </Typography>
                )}
                {index < networkLogs.length - 1 && <Divider sx={{ mt: 1 }} />}
              </Box>
            ))}
          </Box>
        </InfoPanel>
      )}
    </Container>
  );
};

export default VideoTestPage;
