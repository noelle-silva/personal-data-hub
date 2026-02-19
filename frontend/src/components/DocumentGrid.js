import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Container,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Pagination,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import DocumentCard from './DocumentCard';
import DocumentDetailModal from './legacy/DocumentDetailModal';
import {
  selectSelectedDocument,
  selectIsModalOpen,
  openDocumentModal,
  closeDocumentModal,
} from '../store/documentsSlice';
import {
  openWindowAndFetch
} from '../store/windowsSlice';
import apiClient from '../services/apiClient';

// 样式化的卡片容器
const CardsWrapper = styled(Box)(({ theme }) => ({
  display: 'grid',
  gap: theme.spacing(3),
  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
  alignItems: 'stretch',
  width: '100%',
}));

// 加载状态容器
const LoadingContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: '400px',
  flexDirection: 'column',
  gap: theme.spacing(2),
  backgroundColor: theme.palette.background.default,
  borderRadius: 20,
  padding: theme.spacing(4),
}));

// 空状态容器
const EmptyContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '400px',
  textAlign: 'center',
  backgroundColor: theme.palette.surfaceVariant.main,
  borderRadius: 20,
  padding: (theme) => theme.spacing(4),
}));

// 分页容器
const PaginationContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  marginTop: theme.spacing(3),
}));

const DocumentGrid = ({
  items,
  status,
  error,
  emptyMessage = '暂无匹配的笔记',
  pagination,
  onPageChange,
  onRefresh,
}) => {
  const dispatch = useDispatch();
  const selectedDocument = useSelector(selectSelectedDocument);
  const isModalOpen = useSelector(selectIsModalOpen);

  // 处理查看详情
  const handleViewDetail = async (document) => {
    try {
      // 使用新的 openWindowAndFetch thunk，原子化创建窗口和获取文档
      await dispatch(openWindowAndFetch({
        docId: document._id,
        label: document.title || '加载中...',
        source: 'document-grid'
      })).unwrap();
    } catch (error) {
      console.error('获取文档详情失败:', error);
    }
  };

  // 处理关闭弹窗
  const handleCloseModal = () => {
    dispatch(closeDocumentModal());
  };

  // 处理保存文档
  const handleSaveDocument = async (id, documentData) => {
    try {
      const response = await apiClient.put(`/documents/${id}`, documentData);
      const result = response.data;
      console.log('文档更新成功:', result);
      
      // 更新选中的文档
      dispatch(openDocumentModal(result.data));
      
      // 通知父组件刷新数据
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('更新文档失败:', error);
      const errorMessage = error.response?.data?.message || error.message || '更新文档失败，请重试';
      alert(errorMessage);
    }
  };

  // 处理保存引用关系
  const handleSaveReferences = async (id, referencedDocumentIds) => {
    try {
      const response = await apiClient.put(`/documents/${id}`, { referencedDocumentIds }, {
        params: {
          populate: 'full',
          include: 'referencingQuotes',
          quotesLimit: 20
        }
      });

      const result = response.data;
      console.log('引用关系更新成功:', result);
      
      // 更新选中的文档
      dispatch(openDocumentModal(result.data));
      
      return result.data;
    } catch (error) {
      console.error('更新引用关系失败:', error);
      alert('更新引用关系失败，请重试');
      throw error;
    }
  };

  // 处理删除文档
  const handleDeleteDocument = async (id) => {
    try {
      const response = await apiClient.delete(`/documents/${id}`);
      const result = response.data;
      console.log('文档删除成功:', result);
      
      // 关闭弹窗
      dispatch(closeDocumentModal());
      
      // 通知父组件刷新数据
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('删除文档失败:', error);
      const errorMessage = error.response?.data?.message || error.message || '删除文档失败，请重试';
      alert(errorMessage);
    }
  };

  // 渲染加载状态
  const renderLoading = () => (
    <LoadingContainer>
      <CircularProgress
        size={60}
        thickness={4}
        sx={{
          color: 'primary.main',
        }}
      />
      <Typography
        variant="h6"
        color="text.secondary"
        sx={{
          mt: 2,
        }}
      >
        正在加载笔记...
      </Typography>
    </LoadingContainer>
  );

  // 渲染错误状态
  const renderError = () => (
    <Container maxWidth="md">
      <Alert
        severity="error"
        sx={{
          mt: 4,
          borderRadius: 16,
          backgroundColor: 'errorContainer.main',
          color: 'errorContainer.contrastText',
        }}
      >
        <Typography variant="h6">加载失败</Typography>
        <Typography variant="body2">
          {error || '无法加载笔记，请稍后重试。'}
        </Typography>
      </Alert>
    </Container>
  );

  // 渲染空状态
  const renderEmpty = () => (
    <Container maxWidth="md">
      <EmptyContainer>
        <Typography
          variant="h6"
          color="text.secondary"
          gutterBottom
          sx={{
            mb: 2,
          }}
        >
          {emptyMessage}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            maxWidth: '80%',
          }}
        >
          尝试调整筛选条件或选择其他标签
        </Typography>
      </EmptyContainer>
    </Container>
  );

  const renderPagination = () => {
    if (!pagination?.pages || pagination.pages <= 1) return null;
    if (status !== 'succeeded' && status !== 'idle') return null;

    return (
      <PaginationContainer>
        <Pagination
          count={pagination.pages}
          page={pagination.page || 1}
          onChange={onPageChange}
          disabled={status === 'loading'}
          color="primary"
          showFirstButton
          showLastButton
        />
      </PaginationContainer>
    );
  };

  // 渲染文档卡片
  const renderDocuments = () => {
    if (items.length === 0) {
      return (
        <>
          {renderEmpty()}
          {renderPagination()}
        </>
      );
    }

    return (
      <>
        <CardsWrapper>
          {items.map((document) => (
            <DocumentCard
              key={document._id}
              document={document}
              onViewDetail={handleViewDetail}
            />
          ))}
        </CardsWrapper>
        {renderPagination()}
      </>
    );
  };

  // 根据状态渲染不同内容
  const renderContent = () => {
    switch (status) {
      case 'loading':
        return renderLoading();
      case 'failed':
        return renderError();
      case 'succeeded':
      case 'idle':
      default:
        return renderDocuments();
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      {renderContent()}
      
      {/* 详情弹窗 */}
      <DocumentDetailModal
        open={isModalOpen}
        handleClose={handleCloseModal}
        document={selectedDocument}
        onSave={handleSaveDocument}
        onDelete={handleDeleteDocument}
        onSaveReferences={handleSaveReferences}
      />
    </Box>
  );
};

export default DocumentGrid;
