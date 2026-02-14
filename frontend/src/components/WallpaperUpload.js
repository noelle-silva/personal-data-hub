/**
 * 壁纸上传组件
 * 提供壁纸上传功能，支持拖拽和点击上传
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  CircularProgress,
  Alert,
  useTheme,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Image as ImageIcon,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { useDispatch, useSelector } from 'react-redux';
import { uploadWallpaper, selectWallpaperLoading, selectWallpaperError } from '../store/wallpaperSlice';

// 样式化的上传区域
const UploadArea = styled(Paper)(({ theme, isDragOver }) => ({
  border: `2px dashed ${isDragOver ? theme.palette.primary.main : theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(4),
  textAlign: 'center',
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  backgroundColor: isDragOver ? theme.palette.action.hover : theme.palette.background.paper,
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
    borderColor: theme.palette.primary.main,
  },
}));

// 隐藏的文件输入
const HiddenInput = styled('input')({
  display: 'none',
});

const WallpaperUpload = ({ onUploadSuccess }) => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const fileInputRef = useRef(null);
  
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [description, setDescription] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  
  const uploadLoading = useSelector((state) => selectWallpaperLoading(state).upload);
  const uploadError = useSelector((state) => selectWallpaperError(state).upload);

  // 验证文件类型和大小
  const validateFile = (file) => {
    // 检查文件类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return '不支持的文件格式，请选择 JPEG、PNG 或 WebP 格式的图片';
    }

    return null;
  };

  const revokePreviewUrl = (url) => {
    if (url && typeof url === 'string' && url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  };

  // 处理文件选择
  const handleFileSelect = useCallback((file) => {
    const error = validateFile(file);
    if (error) {
      alert(error);
      return;
    }

    setSelectedFile(file);
    
    // 创建预览URL（避免 base64）
    setPreviewUrl((prev) => {
      revokePreviewUrl(prev);
      return URL.createObjectURL(file);
    });
  }, []);

  // 处理文件输入变化
  const handleFileInputChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  // 处理拖拽进入
  const handleDragEnter = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(true);
  }, []);

  // 处理拖拽悬停
  const handleDragOver = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  // 处理拖拽离开
  const handleDragLeave = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
  }, []);

  // 处理文件拖放
  const handleDrop = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);

    const files = event.dataTransfer.files;
    if (files && files[0]) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  // 处理上传
  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      const result = await dispatch(uploadWallpaper({
        file: selectedFile,
        description: description.trim()
      })).unwrap();
      
      // 重置表单
      setSelectedFile(null);
      setDescription('');
      setPreviewUrl((prev) => {
        revokePreviewUrl(prev);
        return '';
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // 通知父组件
      if (onUploadSuccess) {
        onUploadSuccess(result);
      }
    } catch (error) {
      console.error('上传失败:', error);
    }
  };

  // 重置表单
  const handleReset = () => {
    setSelectedFile(null);
    setDescription('');
    setPreviewUrl((prev) => {
      revokePreviewUrl(prev);
      return '';
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" gutterBottom>
        上传壁纸
      </Typography>
      
      {uploadError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {uploadError}
        </Alert>
      )}

      {!selectedFile ? (
        <UploadArea
          isDragOver={isDragOver}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <CloudUploadIcon
            sx={{
              fontSize: 48,
              color: theme.palette.text.secondary,
              mb: 2
            }}
          />
          <Typography variant="h6" gutterBottom>
            拖拽壁纸文件到此处或点击选择
          </Typography>
          <Typography variant="body2" color="text.secondary">
            支持 JPEG、PNG、WebP 格式，不限制大小
          </Typography>
          <HiddenInput
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileInputChange}
          />
        </UploadArea>
      ) : (
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            {/* 预览区域 */}
            <Box
              sx={{
                width: 200,
                height: 120,
                borderRadius: 1,
                overflow: 'hidden',
                bgcolor: 'grey.100',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="壁纸预览"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              ) : (
                <ImageIcon
                  sx={{
                    fontSize: 40,
                    color: 'text.secondary',
                  }}
                />
              )}
            </Box>

            {/* 文件信息和描述 */}
            <Box sx={{ flex: 1, minWidth: 250 }}>
              <Typography variant="subtitle2" gutterBottom>
                文件信息
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                文件名: {selectedFile.name}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                大小: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                类型: {selectedFile.type}
              </Typography>

              <TextField
                label="描述（可选）"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                fullWidth
                margin="normal"
                size="small"
                multiline
                rows={2}
                maxRows={3}
                inputProps={{ maxLength: 500 }}
              />
            </Box>
          </Box>

          {/* 操作按钮 */}
          <Box sx={{ mt: 2, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              onClick={handleReset}
              disabled={uploadLoading}
            >
              重新选择
            </Button>
            <Button
              variant="contained"
              onClick={handleUpload}
              disabled={uploadLoading}
              startIcon={uploadLoading ? <CircularProgress size={20} /> : null}
            >
              {uploadLoading ? '上传中...' : '上传壁纸'}
            </Button>
          </Box>
        </Paper>
      )}
    </Box>
  );
};

export default WallpaperUpload;
