import React, { useRef, useState, useEffect } from 'react';
import {
  Button,
  Box,
  Typography,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Snackbar
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Image as ImageIcon,
  VideoLibrary as VideoIcon,
  Description as DocumentIcon,
  Code as CodeIcon,
  ArrowDropDown as ArrowDropDownIcon
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { useDispatch, useSelector } from 'react-redux';
import {
  uploadAttachmentImage,
  uploadAttachmentVideo,
  uploadAttachmentDocument,
  uploadAttachmentScript,
  selectUploadStatus,
  resetUploadStatus,
  selectAttachmentConfig,
  selectAttachmentConfigStatus,
  fetchAttachmentConfig
} from '../store/attachmentsSlice';
import { selectIsAuthenticated } from '../store/authSlice';

// 样式化上传按钮
const UploadButton = styled(Button)(({ theme }) => ({
  borderRadius: 16,
  padding: theme.spacing(1.5, 3),
  fontWeight: 600,
}));


/**
 * 附件上传按钮组件
 * @param {Object} props - 组件属性
 * @param {String} props.category - 附件类别 (image/video/document)
 * @param {Function} props.onUploadSuccess - 上传成功回调
 * @param {Function} props.onUploadError - 上传错误回调
 */
const AttachmentUploadButton = ({ category = 'image', onUploadSuccess, onUploadError }) => {
  const dispatch = useDispatch();
  const uploadStatus = useSelector(selectUploadStatus);
  const attachmentConfig = useSelector(selectAttachmentConfig);
  const configStatus = useSelector(selectAttachmentConfigStatus);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  
  const fileInputRef = useRef(null);
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(category);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // 加载附件配置
  useEffect(() => {
    if (configStatus === 'idle') {
      dispatch(fetchAttachmentConfig());
    }
  }, [configStatus, dispatch]);

  // 获取当前类别的最大文件数
  const getMaxFilesForCategory = (category) => {
    if (attachmentConfig && attachmentConfig[category]) {
      return attachmentConfig[category].maxFiles || 1;
    }
    // 默认值
    switch (category) {
      case 'image': return 10;
      case 'video': return 3;
      case 'document': return 10;
      case 'script': return 10;
      default: return 1;
    }
  };

  // 处理文件选择
  const handleFileSelect = async (files) => {
    if (files && files.length > 0) {
      const maxFiles = getMaxFilesForCategory(selectedCategory);
      const filesArray = Array.from(files);
      
      // 如果选择的文件数量超过限制，只取前 maxFiles 个
      if (filesArray.length > maxFiles) {
        setSnackbarMessage(`一次最多只能上传 ${maxFiles} 个文件，已自动选择前 ${maxFiles} 个`);
        setSnackbarOpen(true);
      }
      
      const filesToUpload = filesArray.slice(0, maxFiles);
      
      // 串行上传文件
      for (const file of filesToUpload) {
        try {
          await handleUpload(file, selectedCategory);
        } catch (error) {
          console.error('上传文件失败:', error);
          // 可以在这里添加错误提示
        }
      }
    }
  };

  // 处理上传
  const handleUpload = (file, fileCategory) => {
    // 确定有效的文件类别
    const effectiveCategory =
      fileCategory ||
      selectedCategory ||
      (file?.type?.startsWith('video/') ? 'video' :
       file?.type?.startsWith('application/') ? 'document' : 'image');

    let uploadAction;
    switch (effectiveCategory) {
      case 'video':
        uploadAction = uploadAttachmentVideo;
        break;
      case 'document':
        uploadAction = uploadAttachmentDocument;
        break;
      case 'script':
        uploadAction = uploadAttachmentScript;
        break;
      default:
        uploadAction = uploadAttachmentImage;
    }

    dispatch(uploadAction({ file }))
      .unwrap()
      .then((result) => {
        if (onUploadSuccess) {
          onUploadSuccess(result);
        }
        // 重置上传状态
        dispatch(resetUploadStatus());
      })
      .catch((error) => {
        if (onUploadError) {
          onUploadError(error);
        }
      });
  };

  // 处理文件输入变化
  const handleFileInputChange = (event) => {
    handleFileSelect(event.target.files);
    // 清空文件输入，允许重复选择同一文件
    event.target.value = '';
  };

  // 处理按钮点击
  const handleButtonClick = (event) => {
    setMenuAnchorEl(event.currentTarget);
  };

  // 处理菜单关闭
  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };

  // 处理类别选择
  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    setMenuAnchorEl(null);
    
    // 设置文件输入的accept属性
    if (fileInputRef.current) {
      let accept;
      switch (category) {
        case 'video':
          accept = 'video/mp4,video/webm,video/ogg,video/quicktime';
          break;
        case 'document':
          accept = 'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          break;
        case 'script':
          accept = 'text/x-python,application/x-msdos-program,text/x-shellscript,application/javascript,text/x-c++src,application/x-msdownload';
          break;
        default:
          accept = 'image/png,image/jpeg,image/webp,image/gif';
      }
      fileInputRef.current.accept = accept;
    }
    
    // 触发文件选择
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 100);
  };


  // 获取类别显示文本
  const getCategoryText = () => {
    switch (selectedCategory) {
      case 'video':
        return '上传视频';
      case 'document':
        return '上传文档';
      case 'script':
        return '上传程序与脚本';
      default:
        return '上传图片';
    }
  };

  // 获取类别图标
  const getCategoryIcon = () => {
    switch (selectedCategory) {
      case 'video':
        return <VideoIcon />;
      case 'document':
        return <DocumentIcon />;
      case 'script':
        return <CodeIcon />;
      default:
        return <ImageIcon />;
    }
  };

  // 根据类别获取accept属性
  const getAcceptByCategory = (category) => {
    if (attachmentConfig && attachmentConfig[category]) {
      return attachmentConfig[category].acceptString;
    }
    
    // 回退到硬编码值
    switch (category) {
      case 'video':
        return 'video/mp4,video/webm,video/ogg,video/quicktime,video/x-msvideo,video/x-matroska,video/x-flv';
      case 'document':
        return 'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      case 'script':
        return 'text/x-python,application/x-msdos-program,text/x-shellscript,application/javascript,text/x-c++src,application/x-msdownload';
      default:
        return 'image/png,image/jpeg,image/webp,image/gif';
    }
  };

  return (
    <Box>
      <UploadButton
        variant="contained"
        startIcon={getCategoryIcon()}
        endIcon={<ArrowDropDownIcon />}
        onClick={handleButtonClick}
        disabled={uploadStatus === 'uploading'}
      >
        {uploadStatus === 'uploading' ? '上传中...' : getCategoryText()}
      </UploadButton>
      
      {/* 类别选择菜单 */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => handleCategorySelect('image')}>
          <ListItemIcon>
            <ImageIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>上传图片</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleCategorySelect('video')}>
          <ListItemIcon>
            <VideoIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>上传视频</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleCategorySelect('document')}>
          <ListItemIcon>
            <DocumentIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>上传文档</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleCategorySelect('script')}>
          <ListItemIcon>
            <CodeIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>上传程序与脚本</ListItemText>
        </MenuItem>
      </Menu>
      
      {/* 隐藏的文件输入框 */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        accept={getAcceptByCategory(selectedCategory)}
        multiple
        style={{ display: 'none' }}
        disabled={uploadStatus === 'uploading'}
      />
      
      {/* 提示消息 */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
      />
    </Box>
  );
};

export default AttachmentUploadButton;