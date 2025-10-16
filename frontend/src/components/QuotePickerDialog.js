import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box,
  Checkbox,
  Button,
  TextField,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Autocomplete,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  Close as CloseIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  FormatQuote as QuoteIcon,
} from '@mui/icons-material';
import apiClient from '../services/apiClient';

// 样式化的对话框
const StyledDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiDialog-paper': {
    borderRadius: 20, // 20px 圆角，符合主要容器规范
    minWidth: '600px',
    maxWidth: '90vw',
    maxHeight: '85vh',
  },
}));

// 样式化的对话框内容
const StyledDialogContent = styled(DialogContent)(({ theme }) => ({
  padding: theme.spacing(2),
  display: 'flex',
  flexDirection: 'column',
  minHeight: '400px',
}));

// 样式化的搜索框容器
const SearchContainer = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  position: 'relative',
}));

// 样式化的标签选择器容器
const TagsContainer = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(2),
}));

// 样式化的引用体列表
const QuoteList = styled(List)(({ theme }) => ({
  flexGrow: 1,
  overflowY: 'auto',
  '&::-webkit-scrollbar': {
    width: 8,
  },
  '&::-webkit-scrollbar-track': {
    background: theme.palette.background.default,
  },
  '&::-webkit-scrollbar-thumb': {
    background: theme.palette.primary.main,
    borderRadius: 4,
  },
}));

// 样式化的引用体项
const QuoteItem = styled(ListItem)(({ theme }) => ({
  borderRadius: 16,
  marginBottom: theme.spacing(1),
  padding: theme.spacing(2),
  backgroundColor: theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
}));

// 样式化的加载容器
const LoadingContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  padding: theme.spacing(4),
}));

// 样式化的空状态容器
const EmptyContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(4),
  color: theme.palette.text.secondary,
}));

// 格式化相对时间
const formatRelativeTime = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return '今天';
  if (diffDays === 1) return '昨天';
  if (diffDays <= 7) return `${diffDays}天前`;
  if (diffDays <= 30) return `${Math.floor(diffDays / 7)}周前`;
  if (diffDays <= 365) return `${Math.floor(diffDays / 30)}个月前`;
  return `${Math.floor(diffDays / 365)}年前`;
};

const QuotePickerDialog = ({ 
  open, 
  handleClose, 
  onConfirm, 
  excludeIds = [], 
  initialSelectedIds = [] 
}) => {
  // 状态管理
  const [quotes, setQuotes] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedQuoteIds, setSelectedQuoteIds] = useState(initialSelectedIds);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  
  // Refs
  const abortControllerRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const listRef = useRef(null);
  
  // 获取可用标签
  const fetchAvailableTags = useCallback(async () => {
    try {
      const response = await apiClient.get('/quotes/stats');
      
      const data = response.data;
      const tags = data.data.tagStats.map(tag => ({
        name: tag._id,
        count: tag.count
      }));
      
      setAvailableTags(tags);
    } catch (err) {
      console.error('获取标签失败:', err);
    }
  }, []);
  
  // 获取引用体列表
  const fetchQuotes = useCallback(async (isSearch = false, resetPage = false) => {
    if (loading) return;
    
    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // 创建新的AbortController
    const controller = new AbortController();
    abortControllerRef.current = controller;
    
    setLoading(true);
    setError('');
    
    try {
      const currentPage = resetPage ? 1 : page;
      const params = {
        page: currentPage,
        limit: 20,
        sort: '-updatedAt'
      };
      
      let endpoint;
      if (isSearch && searchQuery.trim()) {
        params.q = searchQuery.trim();
        endpoint = '/quotes/search';
      } else if (selectedTags.length > 0 && !searchQuery.trim()) {
        // 仅标签筛选
        params.tags = selectedTags.join(',');
        params.mode = 'all';
        endpoint = '/quotes/tags';
      } else {
        // 默认加载所有引用体
        endpoint = '/quotes';
      }
      
      const response = await apiClient.get(endpoint, {
        params,
        signal: controller.signal
      });
      
      const data = response.data;
      const newQuotes = data.data || data.items || [];
      
      if (resetPage) {
        setQuotes(newQuotes);
        setPage(1);
      } else {
        setQuotes(prev => [...prev, ...newQuotes]);
      }
      
      setTotal(data.pagination?.total || newQuotes.length);
      setHasMore(data.pagination?.hasMore || newQuotes.length === 20);
      
    } catch (err) {
      if (err.name !== 'AbortError' && err.name !== 'CanceledError' && err.code !== 'ERR_CANCELED') {
        setError(err.response?.data?.message || err.message || '获取引用体失败');
      }
    } finally {
      setLoading(false);
    }
  }, [loading, page, searchQuery, selectedTags]);
  
  // 处理搜索（防抖）
  const handleSearch = useCallback((query) => {
    setSearchQuery(query);
    
    // 清除之前的定时器
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // 设置新的定时器
    debounceTimerRef.current = setTimeout(() => {
      setPage(1);
      setHasMore(true);
      fetchQuotes(query.trim().length > 0, true);
    }, 300); // 300ms防抖
  }, [fetchQuotes]);
  
  // 处理标签选择
  const handleTagsChange = useCallback((event, newValue) => {
    const tagNames = newValue.map(tag => typeof tag === 'string' ? tag : tag.name);
    setSelectedTags(tagNames);
    setPage(1);
    setHasMore(true);
  }, []);
  
  // 处理引用体选择
  const handleQuoteToggle = useCallback((quoteId) => {
    setSelectedQuoteIds(prev => {
      if (prev.includes(quoteId)) {
        return prev.filter(id => id !== quoteId);
      } else {
        return [...prev, quoteId];
      }
    });
  }, []);
  
  // 处理滚动加载更多
  const handleScroll = useCallback(() => {
    if (!listRef.current || !hasMore || loading) return;
    
    const { scrollTop, scrollHeight, clientHeight } = listRef.current;
    
    // 当滚动到接近底部时加载更多
    if (scrollTop + clientHeight >= scrollHeight - 100) {
      setPage(prev => prev + 1);
    }
  }, [hasMore, loading]);
  
  // 处理确认
  const handleConfirm = useCallback(() => {
    onConfirm(selectedQuoteIds);
    handleClose();
  }, [selectedQuoteIds, onConfirm, handleClose]);
  
  // 处理关闭
  const handleCloseDialog = useCallback(() => {
    // 重置状态
    setSearchQuery('');
    setSelectedTags([]);
    setSelectedQuoteIds(initialSelectedIds);
    setPage(1);
    setHasMore(true);
    setError('');
    
    handleClose();
  }, [initialSelectedIds, handleClose]);
  
  // 初始化加载
  useEffect(() => {
    if (open) {
      fetchAvailableTags();
      fetchQuotes(false, true);
    }
  }, [open, fetchAvailableTags, fetchQuotes]);
  
  // 搜索变化时重新加载
  useEffect(() => {
    if (open) {
      fetchQuotes(searchQuery.trim().length > 0, true);
    }
  }, [selectedTags, open, fetchQuotes, searchQuery]);
  
  // 页面变化时加载更多
  useEffect(() => {
    if (open && page > 1) {
      fetchQuotes(searchQuery.trim().length > 0);
    }
  }, [page, open, fetchQuotes, searchQuery]);
  
  // 清理
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);
  
  // 过滤引用体（客户端交集过滤）
  const filteredQuotes = React.useMemo(() => {
    let result = quotes;
    
    // 如果同时有搜索和标签，做客户端交集过滤
    if (searchQuery.trim() && selectedTags.length > 0) {
      result = quotes.filter(quote => {
        // 检查引用体是否包含所有选中的标签
        return selectedTags.every(tag => 
          quote.tags && quote.tags.includes(tag)
        );
      });
    }
    
    return result;
  }, [quotes, searchQuery, selectedTags]);
  
  // 渲染引用体项
  const renderQuoteItem = (quote) => {
    const isSelected = selectedQuoteIds.includes(quote._id);
    const isExcluded = excludeIds.includes(quote._id);
    
    return (
      <QuoteItem key={quote._id}>
        <ListItemIcon>
          <Checkbox
            checked={isSelected || isExcluded}
            disabled={isExcluded}
            onChange={() => handleQuoteToggle(quote._id)}
            aria-label={`选择引用体: ${quote.title}`}
          />
        </ListItemIcon>
        <ListItemText
          primary={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <QuoteIcon color="primary" fontSize="small" />
              <Typography variant="subtitle2" fontWeight="medium">
                {quote.title}
              </Typography>
              {isExcluded && (
                <Chip 
                  label="已引用" 
                  size="small" 
                  color="primary" 
                  variant="outlined"
                />
              )}
            </Box>
          }
          secondary={
            <Box sx={{ mt: 1 }}>
              {quote.tags && quote.tags.length > 0 && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                  {quote.tags.slice(0, 3).map((tag, index) => (
                    <Chip
                      key={index}
                      label={tag}
                      size="small"
                      variant="outlined"
                      sx={{
                        borderRadius: 8,
                        fontSize: '0.7rem',
                        height: 20,
                      }}
                    />
                  ))}
                  {quote.tags.length > 3 && (
                    <Chip
                      label={`+${quote.tags.length - 3}`}
                      size="small"
                      variant="outlined"
                      sx={{
                        borderRadius: 8,
                        fontSize: '0.7rem',
                        height: 20,
                      }}
                    />
                  )}
                </Box>
              )}
              <Typography variant="caption" color="text.secondary">
                更新于 {formatRelativeTime(quote.updatedAt)}
              </Typography>
            </Box>
          }
        />
      </QuoteItem>
    );
  };
  
  return (
    <StyledDialog
      open={open}
      onClose={handleCloseDialog}
      maxWidth="md"
      fullWidth
      aria-labelledby="quote-picker-dialog-title"
    >
      <DialogTitle id="quote-picker-dialog-title">
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" component="h2">
            选择引用引用体
          </Typography>
          <IconButton onClick={handleCloseDialog} aria-label="关闭">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <StyledDialogContent>
        {/* 搜索框 */}
        <SearchContainer>
          <TextField
            fullWidth
            placeholder="搜索引用体..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />,
              endAdornment: searchQuery && (
                <IconButton size="small" onClick={() => handleSearch('')}>
                  <ClearIcon />
                </IconButton>
              ),
            }}
            aria-label="搜索引用体"
          />
        </SearchContainer>
        
        {/* 标签选择器 */}
        <TagsContainer>
          <Autocomplete
            multiple
            options={availableTags}
            value={selectedTags}
            onChange={handleTagsChange}
            getOptionLabel={(option) => typeof option === 'string' ? option : option.name}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip
                  key={option}
                  label={option}
                  {...getTagProps({ index })}
                  sx={{
                    borderRadius: 12,
                    fontSize: '0.8rem',
                  }}
                />
              ))
            }
            renderInput={(params) => (
              <TextField
                {...params}
                variant="outlined"
                label="按标签筛选"
                placeholder="选择标签..."
              />
            )}
            renderOption={(props, option) => (
              <Box component="li" {...props}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                  <Typography variant="body2">{option.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    ({option.count})
                  </Typography>
                </Box>
              </Box>
            )}
            noOptionsText="暂无可用标签"
          />
        </TagsContainer>
        
        {/* 引用体列表 */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {loading && quotes.length === 0 ? (
          <LoadingContainer>
            <CircularProgress />
            <Typography variant="body2" sx={{ mt: 2 }}>
              正在加载引用体...
            </Typography>
          </LoadingContainer>
        ) : filteredQuotes.length === 0 ? (
          <EmptyContainer>
            <Typography variant="body2">
              {searchQuery || selectedTags.length > 0
                ? '未找到匹配的引用体'
                : '暂无可用引用体'
              }
            </Typography>
          </EmptyContainer>
        ) : (
          <QuoteList ref={listRef} onScroll={handleScroll}>
            {filteredQuotes.map(renderQuoteItem)}
            
            {loading && (
              <LoadingContainer>
                <CircularProgress size={24} />
              </LoadingContainer>
            )}
          </QuoteList>
        )}
      </StyledDialogContent>
      
      <DialogActions>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', px: 2, pb: 1 }}>
          <Typography variant="body2" color="text.secondary">
            已选择 {selectedQuoteIds.length} 个引用体
            {total > 0 && ` / 共 ${total} 个`}
          </Typography>
          <Box>
            <Button onClick={handleCloseDialog} sx={{ mr: 1 }}>
              取消
            </Button>
            <Button 
              onClick={handleConfirm} 
              variant="contained"
              disabled={selectedQuoteIds.length === 0}
            >
              确认添加
            </Button>
          </Box>
        </Box>
      </DialogActions>
    </StyledDialog>
  );
};

export default QuotePickerDialog;