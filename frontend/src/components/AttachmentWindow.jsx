import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Paper,
  IconButton,
  Typography,
  Box,
  CircularProgress,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import MinimizeIcon from '@mui/icons-material/Minimize';
import CropSquareIcon from '@mui/icons-material/CropSquare';
import FilterNoneIcon from '@mui/icons-material/FilterNone';
import AttachmentDetailContent from './AttachmentDetailContent';
import { useSelector } from 'react-redux';
import { selectAttachmentById } from '../store/attachmentsSlice';
import { getMaximizedWindowRect, getViewportSnapshot } from '../utils/windowSizing';

const WindowContainer = styled(Paper, {
  shouldForwardProp: (prop) => prop !== 'isActive' && prop !== 'minimized'
})(({ theme, isActive, minimized }) => ({
  position: 'fixed',
  display: minimized ? 'none' : 'flex',
  flexDirection: 'column',
  backgroundColor: theme.palette.background.paper,
  boxShadow: isActive
    ? theme.shadows[24]
    : theme.shadows[8],
  borderRadius: 20,
  border: `1px solid ${theme.palette.border}`,
  overflow: 'hidden',
  zIndex: theme.zIndex.modal + 1,
  transition: 'box-shadow 0.2s ease',
  pointerEvents: minimized ? 'none' : 'auto',
}));

const WindowHeader = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'isActive'
})(({ theme, isActive }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: theme.spacing(1.5),
  backgroundColor: isActive
    ? theme.palette.primary.main
    : theme.palette.grey[300],
  color: isActive
    ? theme.palette.primary.contrastText
    : theme.palette.text.primary,
  cursor: 'default',
  userSelect: 'none',
  borderTopLeftRadius: 20,
  borderTopRightRadius: 20,
  minHeight: 48,
  transition: 'background-color 0.2s ease, color 0.2s ease',
}));

const WindowTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 'bold',
  fontSize: '1rem',
  flexGrow: 1,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  marginLeft: theme.spacing(1),
}));

const WindowControls = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.5),
}));

const WindowControlButton = styled(IconButton)(({ theme }) => ({
  borderRadius: 8,
  padding: theme.spacing(0.5),
  color: 'inherit',
  backgroundColor: 'transparent',
  '&:hover': {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
}));

const WindowContent = styled(Box)(({ theme }) => ({
  position: 'relative',
  flexGrow: 1,
  display: 'flex',
  flexDirection: 'row',
  overflow: 'hidden',
  borderBottomLeftRadius: 20,
  borderBottomRightRadius: 20,
}));

const MainContent = styled(Box)(({ theme }) => ({
  flexGrow: 1,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  minWidth: 0,
}));

const LoadingContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  flexGrow: 1,
  padding: theme.spacing(4),
  gap: theme.spacing(2),
}));

const ErrorContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  flexGrow: 1,
  padding: theme.spacing(4),
  gap: theme.spacing(2),
  color: theme.palette.error.main,
}));

const AttachmentWindow = ({
  windowData,
  isActive,
  onClose,
  onMinimize,
  onActivate,
  onUpdatePosition,
  onUpdateSize,
  onDelete,
}) => {
  const attachmentId = windowData.attachment?._id || windowData.resourceId;
  const latestAttachment = useSelector((state) =>
    attachmentId ? selectAttachmentById(attachmentId)(state) : null
  );

  const [isMaximized, setIsMaximized] = useState(false);
  const [restoreRect, setRestoreRect] = useState(null);
  const windowRef = useRef(null);

  const handleWindowClick = useCallback(() => {
    if (!isActive) {
      onActivate();
    }
  }, [isActive, onActivate]);

  const handleMaximize = useCallback(() => {
    if (isMaximized) {
      if (restoreRect) {
        onUpdatePosition(restoreRect.position);
        onUpdateSize(restoreRect.size);
      }
      setIsMaximized(false);
    } else {
      setRestoreRect({ position: windowData.position, size: windowData.size });
      const rect = getMaximizedWindowRect(getViewportSnapshot());
      onUpdatePosition(rect.position);
      onUpdateSize(rect.size);
      setIsMaximized(true);
    }
  }, [isMaximized, onUpdatePosition, onUpdateSize, restoreRect, windowData.position, windowData.size]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isActive) {
        onClose();
      }
    };

    if (isActive) {
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isActive, onClose]);

  const renderLoading = () => (
    <LoadingContainer>
      <CircularProgress size={40} />
      <Typography variant="body1" color="text.secondary">
        正在加载附件内容...
      </Typography>
    </LoadingContainer>
  );

  const renderError = () => (
    <ErrorContainer>
      <Typography variant="h6" color="error">
        加载失败
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {windowData.error || '无法加载附件内容，请稍后重试。'}
      </Typography>
    </ErrorContainer>
  );

  const renderContent = () => {
    switch (windowData.status) {
      case 'loading':
        return renderLoading();
      case 'error':
        return renderError();
      case 'loaded':
        return (
          <MainContent>
            <AttachmentDetailContent
              attachment={windowData.attachment}
              onDelete={onDelete}
              initialData={windowData.attachment}
            />
          </MainContent>
        );
      default:
        return renderLoading();
    }
  };

  return (
    <WindowContainer
      ref={windowRef}
      isActive={isActive}
      minimized={windowData.minimized}
      sx={{
        left: isMaximized ? (windowData.position?.x ?? 20) : '50%',
        top: isMaximized ? (windowData.position?.y ?? 20) : '50%',
        width: windowData.size.width,
        height: windowData.size.height,
        zIndex: windowData.zIndex,
        transform: isMaximized ? 'none' : 'translate(-50%, -50%)',
      }}
      onClick={handleWindowClick}
    >
      <WindowHeader isActive={isActive}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <WindowTitle variant="body1">
            {latestAttachment?.originalName || windowData.attachment?.originalName || windowData.title}
          </WindowTitle>
        </Box>

        <WindowControls>
          <WindowControlButton
            size="small"
            onClick={handleMaximize}
            title={isMaximized ? '还原' : '最大化'}
          >
            {isMaximized ? <FilterNoneIcon /> : <CropSquareIcon />}
          </WindowControlButton>
          <WindowControlButton
            size="small"
            onClick={onMinimize}
            title="最小化"
          >
            <MinimizeIcon />
          </WindowControlButton>
          <WindowControlButton
            size="small"
            onClick={onClose}
            title="关闭"
          >
            <CloseIcon />
          </WindowControlButton>
        </WindowControls>
      </WindowHeader>

      <WindowContent>
        {renderContent()}
      </WindowContent>
    </WindowContainer>
  );
};

export default AttachmentWindow;
