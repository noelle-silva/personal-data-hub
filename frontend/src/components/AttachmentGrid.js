import React, { useEffect, useRef, useCallback } from 'react';
import {
  Grid,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Button
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

// 样式化加载更多按钮
const LoadMoreButton = styled(Button)(({ theme }) => ({
  marginTop: theme.spacing(2),
  marginBottom: theme.spacing(4),
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
  
  const loadMoreRef = useRef(null);
  const observerRef = useRef(null);
  const loadingMoreRef = useRef(false);
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
  const loadAttachments = useCallback((page = 1, append = false) => {
    // 使用 ref 获取最新状态，避免将 status 加入依赖
    if (statusRef.current === 'loading') return;
    
    dispatch(fetchAttachments({
      page,
      limit: 20,
      sort: '-createdAt',
      category,
      append
    }));
  }, [dispatch, category]);

  // 加载更多
  const loadMore = useCallback(() => {
    if (
      status !== 'loading' &&
      pagination.hasNext &&
      !loadingMoreRef.current
    ) {
      loadingMoreRef.current = true;
      loadAttachments(pagination.page + 1, true);
      
      // 重置加载更多标志
      setTimeout(() => {
        loadingMoreRef.current = false;
      }, 1000);
    }
  }, [status, pagination, loadAttachments]);

  // 重试加载
  const handleRetry = useCallback(() => {
    loadAttachments(1, false);
  }, [loadAttachments]);

  // 设置 IntersectionObserver 监听滚动到底部
  useEffect(() => {
    if (!loadMoreRef.current) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && pagination.hasNext && status !== 'loading') {
          loadMore();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '100px',
      }
    );

    observerRef.current.observe(loadMoreRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [loadMore, pagination.hasNext, status]);

  // 同步 status 到 ref
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // 初始加载和类别变化监听合并为一个 effect
  useEffect(() => {
    // 当组件初始化或类别变化时，加载数据
    // 使用 ref 检查当前状态，避免将 status 加入依赖
    if (statusRef.current === 'idle' || statusRef.current === 'succeeded') {
      loadAttachments(1, false);
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

  // 渲染加载更多
  const renderLoadMore = () => {
    if (
      status === 'succeeded' &&
      attachments.length > 0 &&
      pagination.hasNext
    ) {
      return (
        <Box display="flex" justifyContent="center" mt={2} mb={4}>
          {status === 'loading' ? (
            <CircularProgress size={24} />
          ) : (
            <LoadMoreButton
              variant="outlined"
              onClick={loadMore}
              disabled={status === 'loading'}
            >
              加载更多
            </LoadMoreButton>
          )}
        </Box>
      );
    }
    return null;
  };

  return (
    <Container>
      {renderError()}
      
      {attachments.length > 0 && (
        <Grid container spacing={3}>
          {attachments.map((attachment) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={attachment._id}>
              <AttachmentCard
                attachment={attachment}
                onView={handleViewAttachment}
                onDelete={handleDeleteAttachment}
              />
            </Grid>
          ))}
        </Grid>
      )}
      
      {renderLoading()}
      {renderEmpty()}
      {renderLoadMore()}
      
      {/* 用于 IntersectionObserver 的隐藏元素 */}
      <Box ref={loadMoreRef} sx={{ height: 1 }} />
    </Container>
  );
};

export default AttachmentGrid;