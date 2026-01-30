/**
 * 壁纸列表组件
 * 显示用户上传的壁纸列表，支持预览、设置当前壁纸和删除操作
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Typography,
  Button,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Alert,
  Chip,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Visibility as VisibilityIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchWallpapers,
  setCurrentWallpaper,
  deleteWallpaper,
  updateWallpaperDescription,
  selectWallpapers,
  selectCurrentWallpaper,
  selectWallpaperLoading,
  selectWallpaperError,
  clearError,
} from '../store/wallpaperSlice';

// 样式化的壁纸卡片
const WallpaperCard = styled(Card)(({ theme, isCurrent }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  position: 'relative',
  border: isCurrent ? `2px solid ${theme.palette.primary.main}` : 'none',
  boxShadow: isCurrent ? theme.shadows[8] : theme.shadows[2],
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: isCurrent ? theme.shadows[12] : theme.shadows[6],
  },
}));

// 当前壁纸标识
const CurrentWallpaperBadge = styled(Chip)(({ theme }) => ({
  position: 'absolute',
  top: 8,
  right: 8,
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  fontWeight: 'bold',
  zIndex: 1,
}));

// 壁纸预览对话框
const WallpaperPreviewDialog = ({ open, wallpaper, onClose }) => {
  if (!wallpaper) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        壁纸预览
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Box
          component="img"
          src={wallpaper.url}
          alt={wallpaper.originalName}
          sx={{
            width: '100%',
            height: 'auto',
            maxHeight: '70vh',
            objectFit: 'contain',
            borderRadius: 1,
          }}
        />
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            {wallpaper.originalName}
          </Typography>
          {wallpaper.description && (
            <Typography variant="body2" color="text.secondary">
              {wallpaper.description}
            </Typography>
          )}
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            上传时间: {new Date(wallpaper.createdAt).toLocaleString()}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            文件大小: {(wallpaper.size / 1024 / 1024).toFixed(2)} MB
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>关闭</Button>
      </DialogActions>
    </Dialog>
  );
};

// 编辑描述对话框
const EditDescriptionDialog = ({ open, wallpaper, onClose, onSave }) => {
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (wallpaper) {
      setDescription(wallpaper.description || '');
    }
  }, [wallpaper]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await onSave(wallpaper._id, description);
      onClose();
    } catch (error) {
      console.error('更新描述失败:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>编辑壁纸描述</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="描述"
          type="text"
          fullWidth
          multiline
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          inputProps={{ maxLength: 500 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          取消
        </Button>
        <Button onClick={handleSave} disabled={loading}>
          {loading ? <CircularProgress size={20} /> : '保存'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const WallpaperList = () => {
  const dispatch = useDispatch();
  
  const wallpapers = useSelector(selectWallpapers);
  const currentWallpaper = useSelector(selectCurrentWallpaper);
  const loading = useSelector((state) => selectWallpaperLoading(state).wallpapers);
  const setCurrentLoading = useSelector((state) => selectWallpaperLoading(state).setCurrent);
  const deleteLoading = useSelector((state) => selectWallpaperLoading(state).delete);
  const error = useSelector((state) => selectWallpaperError(state).wallpapers);
  
  const [previewWallpaper, setPreviewWallpaper] = useState(null);
  const [editWallpaper, setEditWallpaper] = useState(null);

  // 组件挂载时获取壁纸列表
  useEffect(() => {
    dispatch(fetchWallpapers());
  }, [dispatch]);

  // 处理设置当前壁纸
  const handleSetCurrent = (wallpaperId) => {
    dispatch(setCurrentWallpaper(wallpaperId));
  };

  // 处理删除壁纸
  const handleDelete = (wallpaperId, wallpaperName) => {
    if (window.confirm(`确定要删除壁纸 "${wallpaperName}" 吗？此操作不可撤销。`)) {
      dispatch(deleteWallpaper(wallpaperId));
    }
  };

  // 处理更新描述
  const handleUpdateDescription = (wallpaperId, description) => {
    return dispatch(updateWallpaperDescription({ wallpaperId, description })).unwrap();
  };

  // 清除错误
  const handleClearError = () => {
    dispatch(clearError('wallpapers'));
  };

  if (loading && wallpapers.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        我的壁纸
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={handleClearError}>
          {error}
        </Alert>
      )}

      {wallpapers.length === 0 && !loading ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body1" color="text.secondary">
            还没有上传任何壁纸
          </Typography>
          <Typography variant="body2" color="text.secondary">
            上传第一张壁纸来个性化你的应用界面
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {wallpapers.map((wallpaper) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={wallpaper._id}>
              <WallpaperCard isCurrent={currentWallpaper?._id === wallpaper._id}>
                {currentWallpaper?._id === wallpaper._id && (
                  <CurrentWallpaperBadge
                    icon={<CheckCircleIcon />}
                    label="当前壁纸"
                    size="small"
                  />
                )}
                
                <CardMedia
                  component="img"
                  height="160"
                  image={wallpaper.url}
                  alt={wallpaper.originalName}
                  sx={{ objectFit: 'cover' }}
                />
                
                <CardContent sx={{ flexGrow: 1, pb: 1 }}>
                  <Typography variant="subtitle2" noWrap title={wallpaper.originalName}>
                    {wallpaper.originalName}
                  </Typography>
                  {wallpaper.description && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}
                    >
                      {wallpaper.description}
                    </Typography>
                  )}
                  <Typography variant="caption" color="text.secondary">
                    {(wallpaper.size / 1024 / 1024).toFixed(2)} MB
                  </Typography>
                </CardContent>
                
                <CardActions sx={{ justifyContent: 'space-between', px: 1, pb: 1 }}>
                  <Box>
                    <Tooltip title="预览">
                      <IconButton
                        size="small"
                        onClick={() => setPreviewWallpaper(wallpaper)}
                      >
                        <VisibilityIcon />
                      </IconButton>
                    </Tooltip>
                    
                    <Tooltip title="编辑描述">
                      <IconButton
                        size="small"
                        onClick={() => setEditWallpaper(wallpaper)}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  
                  <Box>
                    {currentWallpaper?._id !== wallpaper._id && (
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => handleSetCurrent(wallpaper._id)}
                        disabled={setCurrentLoading}
                      >
                        {setCurrentLoading ? <CircularProgress size={16} /> : '设为壁纸'}
                      </Button>
                    )}
                    
                    <Tooltip title="删除">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDelete(wallpaper._id, wallpaper.originalName)}
                        disabled={deleteLoading || currentWallpaper?._id === wallpaper._id}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </CardActions>
              </WallpaperCard>
            </Grid>
          ))}
        </Grid>
      )}

      {/* 预览对话框 */}
      <WallpaperPreviewDialog
        open={!!previewWallpaper}
        wallpaper={previewWallpaper}
        onClose={() => setPreviewWallpaper(null)}
      />

      {/* 编辑描述对话框 */}
      <EditDescriptionDialog
        open={!!editWallpaper}
        wallpaper={editWallpaper}
        onClose={() => setEditWallpaper(null)}
        onSave={handleUpdateDescription}
      />
    </Box>
  );
};

export default WallpaperList;
