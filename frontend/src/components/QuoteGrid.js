import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Container,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Button,
} from '@mui/material';
import apiClient from '../services/apiClient';
import { styled } from '@mui/material/styles';
import QuoteCard from './QuoteCard';
import QuoteDetailModal from './legacy/QuoteDetailModal';
import DocumentDetailModal from './legacy/DocumentDetailModal';
import {
  selectSelectedQuote,
  selectIsQuoteModalOpen,
  openQuoteModal,
  closeQuoteModal,
  fetchQuoteById,
} from '../store/quotesSlice';
import {
  selectSelectedDocument as selectDoc,
  selectIsModalOpen as selectIsDocModalOpen,
  closeDocumentModal,
  openDocumentModal,
} from '../store/documentsSlice';
import {
  openQuoteWindowAndFetch,
} from '../store/windowsSlice';

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

// 加载更多按钮容器
const LoadMoreContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  marginTop: theme.spacing(3),
}));

const QuoteGrid = ({ 
  items, 
  status, 
  error, 
  hasMore, 
  onLoadMore, 
  emptyMessage = '暂无匹配的收藏夹',
  showLoadMore = true 
}) => {
  const dispatch = useDispatch();
  const selectedQuote = useSelector(selectSelectedQuote);
  const isModalOpen = useSelector(selectIsQuoteModalOpen);
  
  // 文档详情弹窗相关状态
  const selectedDoc = useSelector(selectDoc);
  const isDocModalOpen = useSelector(selectIsDocModalOpen);

  // 处理查看详情
  const handleViewDetail = async (quote) => {
    try {
      // 使用新的收藏夹窗口系统
      await dispatch(openQuoteWindowAndFetch({
        quoteId: quote._id,
        label: quote.title || '查看详情',
        source: 'quote-grid'
      })).unwrap();
    } catch (error) {
      console.error('打开收藏夹窗口失败:', error);
      // 如果新窗口系统失败，使用旧的模态框作为后备
      dispatch(openQuoteModal(quote));
      
      // 如果没有完整内容，则在后台获取
      if (!quote.content) {
        dispatch(fetchQuoteById(quote._id)).catch(error => {
          console.error('获取收藏夹详情失败:', error);
        });
      }
    }
  };

  // 处理关闭弹窗
  const handleCloseModal = () => {
    dispatch(closeQuoteModal());
  };

  // 处理保存收藏夹
  const handleSaveQuote = async (id, quoteData) => {
    try {
      const response = await apiClient.put(`/quotes/${id}`, quoteData);
      console.log('收藏夹更新成功:', response.data);
      
      // 更新选中的收藏夹
      dispatch(openQuoteModal(response.data));
      
      // 通知父组件刷新数据
      if (onLoadMore) {
        onLoadMore({ refresh: true });
      }
    } catch (error) {
      console.error('更新收藏夹失败:', error);
      alert('更新收藏夹失败，请重试');
    }
  };

  // 处理删除收藏夹
  const handleDeleteQuote = async (id) => {
    try {
      const response = await apiClient.delete(`/quotes/${id}`);
      const result = response.data;
      console.log('收藏夹删除成功:', result);
      
      // 关闭弹窗
      dispatch(closeQuoteModal());
      
      // 通知父组件刷新数据
      if (onLoadMore) {
        onLoadMore({ refresh: true });
      }
    } catch (error) {
      console.error('删除收藏夹失败:', error);
      const errorMessage = error.response?.data?.message || error.message || '删除收藏夹失败，请重试';
      alert(errorMessage);
    }
  };

  // 处理保存引用列表
  const handleSaveReferences = async (id, referencedDocumentIds) => {
    try {
      const response = await apiClient.put(`/quotes/${id}`, { referencedDocumentIds });

      const result = response.data;
      console.log('引用列表更新成功:', result);
      
      // 更新选中的收藏夹
      dispatch(openQuoteModal(result.data));
      
      // 通知父组件刷新数据
      if (onLoadMore) {
        onLoadMore({ refresh: true });
      }
      
      return result.data;
    } catch (error) {
      console.error('更新引用列表失败:', error);
      alert('更新引用列表失败，请重试');
      throw error;
    }
  };

  // 处理关闭文档弹窗
  const handleCloseDocument = () => {
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
      if (onLoadMore) {
        onLoadMore({ refresh: true });
      }
    } catch (error) {
      console.error('更新文档失败:', error);
      const errorMessage = error.response?.data?.message || error.message || '更新文档失败，请重试';
      alert(errorMessage);
    }
  };

  // 处理删除文档
  const handleDeleteDocument = async (id) => {
    try {
      const response = await apiClient.delete(`/documents/${id}`);
      const result = response.data;
      console.log('文档删除成功:', result);
      
      // 关闭文档弹窗
      dispatch(closeDocumentModal());
      
      // 如果存在选中的收藏夹，刷新收藏夹数据以更新引用列表
      if (selectedQuote) {
        dispatch(fetchQuoteById(selectedQuote._id)).catch(error => {
          console.error('刷新收藏夹数据失败:', error);
        });
      }
      
      // 通知父组件刷新数据
      if (onLoadMore) {
        onLoadMore({ refresh: true });
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
        正在加载收藏夹...
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
          {error || '无法加载收藏夹，请稍后重试。'}
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

  // 渲染收藏夹卡片
  const renderQuotes = () => {
    if (items.length === 0) {
      return renderEmpty();
    }

    return (
        <>
          <CardsWrapper>
            {items.map((quote) => (
              <QuoteCard
                key={quote._id}
                quote={quote}
                onViewDetail={handleViewDetail}
              />
            ))}
          </CardsWrapper>
          
          {showLoadMore && hasMore && (
            <LoadMoreContainer>
              <Button
              variant="outlined"
              onClick={() => onLoadMore && onLoadMore()}
              sx={{
                borderRadius: 16,
                px: 3,
                py: 1,
              }}
            >
              加载更多
            </Button>
          </LoadMoreContainer>
        )}
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
        return renderQuotes();
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      {renderContent()}
      
      {/* 详情弹窗 */}
      <QuoteDetailModal
        open={isModalOpen}
        handleClose={handleCloseModal}
        quote={selectedQuote}
        onSave={handleSaveQuote}
        onDelete={handleDeleteQuote}
        onSaveReferences={handleSaveReferences}
      />
      
      {/* 文档详情弹窗 */}
      <DocumentDetailModal
        open={isDocModalOpen}
        handleClose={handleCloseDocument}
        document={selectedDoc}
        onSave={handleSaveDocument}
        onDelete={handleDeleteDocument}
      />
    </Box>
  );
};

export default QuoteGrid;
