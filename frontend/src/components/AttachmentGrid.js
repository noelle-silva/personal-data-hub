import React, { useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Pagination
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { useSelector, useDispatch } from 'react-redux';
import AttachmentCard from './AttachmentCard';
import {
  fetchAttachments,
  selectAttachments,
  selectAttachmentsStatus,
  selectAttachmentsError,
  selectAttachmentsPagination,
  setSelectedAttachment,
  setModalOpen
} from '../store/attachmentsSlice';

// 样式化容器
const Container = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  minHeight: '100vh',
}));

// 样式化加载容器
const LoadingContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  padding: theme.spacing(4),
}));

// 样式化错误容器
const ErrorContainer = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(2),
}));

// 样式化空状态容器
const EmptyContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(8),
  textAlign: 'center',
}));

// 分页容器
const PaginationContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  marginTop: theme.spacing(2),
  marginBottom: theme.spacing(4),
}));

// 样式化附件卡片网格：固定列宽，避免“最后一行拉伸/内容撑开”导致的宽度不一致
const CardsGrid = styled(Box)(({ theme }) => ({
  display: 'grid',
  gap: theme.spacing(3),
  gridTemplateColumns: '1fr',
  alignItems: 'stretch',
  width: '100%',
  [theme.breakpoints.up('sm')]: {
    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 280px))',
    justifyContent: 'start',
  },
}));

/**
 * 附件网格组件
 * @param {Object} props - 组件属性
 * @param {Function} props.onViewAttachment - 查看附件回调
 * @param {Function} props.onDeleteAttachment - 删除附件回调
 * @param {String} props.category - 附件类别 (image/video/document)
 */
const AttachmentGrid = ({ onViewAttachment, onDeleteAttachment, category = 'image' }) => {
  const dispatch = useDispatch();
  const attachments = useSelector(selectAttachments);
  const status = useSelector(selectAttachmentsStatus);
  const error = useSelector(selectAttachmentsError);
  const pagination = useSelector(selectAttachmentsPagination);
  
  const statusRef = useRef(status);

  // 处理查看附件
  const handleViewAttachment = useCallback((attachment) => {
    if (onViewAttachment) {
      onViewAttachment(attachment);
    } else {
      dispatch(setSelectedAttachment(attachment._id));
      dispatch(setModalOpen(true));
    }
  }, [dispatch, onViewAttachment]);

  // 处理删除附件
  const handleDeleteAttachment = useCallback((attachmentId) => {
    if (onDeleteAttachment) {
      onDeleteAttachment(attachmentId);
    }
  }, [onDeleteAttachment]);

  // 加载附件列表
  const loadAttachments = useCallback((page = 1) => {
    // 使用 ref 获取最新状态，避免将 status 加入依赖
    if (statusRef.current === 'loading') return;
    
    dispatch(fetchAttachments({
      page,
      limit: 20,
      sort: '-createdAt',
      category,
      append: false
    }));
  }, [dispatch, category]);

  // 重试加载
  const handleRetry = useCallback(() => {
    loadAttachments(1);
  }, [loadAttachments]);

  // 同步 status 到 ref
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // 初始加载和类别变化监听合并为一个 effect
  useEffect(() => {
    // 当组件初始化或类别变化时，加载数据
    // 使用 ref 检查当前状态，避免将 status 加入依赖
    if (statusRef.current === 'idle' || statusRef.current === 'succeeded') {
      loadAttachments(1);
    }
  }, [category, loadAttachments]);

  // 渲染加载状态
  const renderLoading = () => {
    if (status === 'loading' && attachments.length === 0) {
      return (
        <LoadingContainer>
          <CircularProgress size={40} />
          <Typography variant="body2" sx={{ mt: 2 }}>
            正在加载附件...
          </Typography>
        </LoadingContainer>
      );
    }
    return null;
  };

  // 渲染错误状态
  const renderError = () => {
    if (error) {
      return (
        <ErrorContainer>
          <Alert 
            severity="error" 
            action={
              <Button color="inherit" size="small" onClick={handleRetry}>
                重试
              </Button>
            }
          >
            {error}
          </Alert>
        </ErrorContainer>
      );
    }
    return null;
  };

  // 渲染空状态
  const renderEmpty = () => {
    if (status === 'succeeded' && attachments.length === 0) {
      return (
        <EmptyContainer>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            暂无附件
          </Typography>
          <Typography variant="body2" color="text.secondary">
            点击上传按钮添加您的第一个图片附件
          </Typography>
        </EmptyContainer>
      );
    }
    return null;
  };

  const handlePageChange = (_, nextPage) => {
    if (!nextPage || nextPage === pagination.page) return;
    loadAttachments(nextPage);
  };

  const renderPagination = () => {
    if (status !== 'succeeded') return null;
    if (!pagination?.pages || pagination.pages <= 1) return null;

    return (
      <PaginationContainer>
        <Pagination
          count={pagination.pages}
          page={pagination.page || 1}
          onChange={handlePageChange}
          disabled={status === 'loading'}
          color="primary"
          showFirstButton
          showLastButton
        />
      </PaginationContainer>
    );
  };

  return (
    <Container>
      {renderError()}
      
      {attachments.length > 0 && (
        <CardsGrid>
          {attachments.map((attachment) => (
            <Box key={attachment._id} sx={{ minWidth: 0 }}>
              <AttachmentCard
                attachment={attachment}
                onView={handleViewAttachment}
                onDelete={handleDeleteAttachment}
              />
            </Box>
          ))}
        </CardsGrid>
      )}
      
      {renderLoading()}
      {renderEmpty()}
      {renderPagination()}
    </Container>
  );
};

export default AttachmentGrid;
