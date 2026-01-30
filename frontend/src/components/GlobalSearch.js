import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  TextField,
  InputAdornment,
  Popper,
  Paper,
  List,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Chip,
  Box,
  CircularProgress,
  Typography,
  IconButton,
  ClickAwayListener
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  Note as NoteIcon
} from '@mui/icons-material';
import { useSelector, useDispatch } from 'react-redux';
import {
  searchDocuments,
  setQuery,
  clearResults,
  openDropdown,
  closeDropdown,
  setHighlightedIndex,
  selectSearchQuery,
  selectSearchItems,
  selectSearchPage,
  selectSearchHasMore,
  selectSearchStatus,
  selectSearchError,
  selectSearchOpen,
  selectHighlightedIndex
} from '../store/searchSlice';
import {
  openWindowAndFetch
} from '../store/windowsSlice';

// 样式化的搜索结果容器
const SearchResultsContainer = styled(Paper)(({ theme }) => ({
  borderRadius: 20, // 20px 圆角，符合主要容器规范
  border: `1px solid ${theme.palette.border}`,
  boxShadow: theme.shadows[4],
  overflow: 'hidden',
  maxHeight: '60vh',
  width: '100%',
  maxWidth: 500,
  zIndex: 1300, // 低于DocumentDetailModal的zIndex(1400)
}));

// 样式化的结果列表
const ResultsList = styled(List)(({ theme }) => ({
  padding: 0,
  maxHeight: '60vh',
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

// 样式化的结果项
const ResultItem = styled(ListItemButton, {
  shouldForwardProp: (prop) => prop !== 'highlighted'
})(({ theme, highlighted }) => ({
  borderRadius: 0,
  padding: theme.spacing(2),
  backgroundColor: highlighted ? theme.palette.action.selected : 'transparent',
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
}));

// 样式化的标签容器
const TagsContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  gap: theme.spacing(0.5),
  marginTop: theme.spacing(0.5),
}));

// 样式化的加载容器
const LoadingContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  padding: theme.spacing(2),
}));

// 样式化的错误容器
const ErrorContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  color: theme.palette.error.main,
}));

// 样式化的空结果容器
const EmptyContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  color: theme.palette.text.secondary,
  textAlign: 'center',
}));

// 高亮文本的工具函数
const highlightText = (text, query) => {
  if (!text || !query) return text;
  
  // 转义特殊字符
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedQuery})`, 'gi');
  
  // 分割文本并高亮匹配部分
  const parts = text.split(regex);
  
  return parts.map((part, index) => 
    regex.test(part) ? 
      <mark key={index} style={{ 
        backgroundColor: theme => theme.palette.primary.light,
        color: theme => theme.palette.primary.contrastText,
        padding: '0 2px',
        borderRadius: 2
      }}>{part}</mark> : 
      part
  );
};

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

const GlobalSearch = () => {
  const dispatch = useDispatch();
  
  // Redux状态
  const query = useSelector(selectSearchQuery);
  const items = useSelector(selectSearchItems);
  const page = useSelector(selectSearchPage);
  const hasMore = useSelector(selectSearchHasMore);
  const status = useSelector(selectSearchStatus);
  const error = useSelector(selectSearchError);
  const open = useSelector(selectSearchOpen);
  const highlightedIndex = useSelector(selectHighlightedIndex);
  
  // 本地状态
  const [inputValue, setInputValue] = useState('');
  const [isComposing, setIsComposing] = useState(false); // 处理中文输入法
  const [abortController, setAbortController] = useState(null);
  
  // Refs
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const popperRef = useRef(null);
  const listRef = useRef(null);
  const debounceTimerRef = useRef(null);
  
  // 防抖搜索
  const debouncedSearch = useCallback((searchQuery) => {
    // 清除之前的定时器
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // 如果查询太短，清空结果并返回
    if (searchQuery.length < 2) {
      dispatch(clearResults());
      dispatch(closeDropdown());
      return;
    }
    
    // 设置新的定时器
    debounceTimerRef.current = setTimeout(() => {
      // 取消之前的请求
      if (abortController) {
        abortController.abort();
      }
      
      // 创建新的AbortController
      const controller = new AbortController();
      setAbortController(controller);
      
      // 执行搜索
      dispatch(searchDocuments({ 
        q: searchQuery, 
        page: 1, 
        limit: 20 
      }));
      
      // 打开下拉
      dispatch(openDropdown());
    }, 300); // 300ms防抖
  }, [dispatch, abortController]);
  
  // 处理输入变化
  const handleInputChange = (event) => {
    const value = event.target.value;
    setInputValue(value);
    dispatch(setQuery(value));
    
    // 如果不是在输入法组合中，执行搜索
    if (!isComposing) {
      debouncedSearch(value);
    }
  };
  
  // 处理输入法组合开始
  const handleCompositionStart = () => {
    setIsComposing(true);
  };
  
  // 处理输入法组合结束
  const handleCompositionEnd = (event) => {
    setIsComposing(false);
    // 组合结束后，执行搜索
    debouncedSearch(event.target.value);
  };
  
  // 处理清除
  const handleClear = () => {
    setInputValue('');
    dispatch(setQuery(''));
    dispatch(clearResults());
    dispatch(closeDropdown());
    inputRef.current?.focus();
  };
  
  // 处理键盘事件
  const handleKeyDown = (event) => {
    if (!open || items.length === 0) return;
    
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        dispatch(setHighlightedIndex(
          highlightedIndex < items.length - 1 ? highlightedIndex + 1 : 0
        ));
        break;
      case 'ArrowUp':
        event.preventDefault();
        dispatch(setHighlightedIndex(
          highlightedIndex > 0 ? highlightedIndex - 1 : items.length - 1
        ));
        break;
      case 'Enter':
        event.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < items.length) {
          // 使用异步方式处理，但不等待结果
          handleItemClick(items[highlightedIndex]).catch(error => {
            console.error('处理键盘选择失败:', error);
          });
        }
        break;
      case 'Escape':
        event.preventDefault();
        dispatch(closeDropdown());
        break;
      default:
        // 对于其他按键，不执行任何操作
        break;
    }
  };
  
  // 处理结果项点击
  const handleItemClick = async (item) => {
    try {
      // 使用新的 openWindowAndFetch thunk，原子化创建窗口和获取文档
      await dispatch(openWindowAndFetch({
        docId: item._id,
        label: item.title || '加载中...',
        source: 'global-search'
      })).unwrap();
    } catch (error) {
      console.error('获取文档详情失败:', error);
    }
    
    // 关闭搜索下拉
    dispatch(closeDropdown());
  };
  
  // 处理滚动加载更多
  const handleScroll = () => {
    if (!listRef.current || !hasMore || status === 'loading') return;
    
    const { scrollTop, scrollHeight, clientHeight } = listRef.current;
    
    // 当滚动到接近底部时加载更多
    if (scrollTop + clientHeight >= scrollHeight - 100) {
      // 取消之前的请求
      if (abortController) {
        abortController.abort();
      }
      
      // 创建新的AbortController
      const controller = new AbortController();
      setAbortController(controller);
      
      // 加载更多
      dispatch(searchDocuments({ 
        q: query, 
        page: page + 1, 
        limit: 20 
      }));
    }
  };
  
  // 处理点击外部关闭
  const handleClickAway = () => {
    dispatch(closeDropdown());
  };
  
  // 清理定时器和请求
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (abortController) {
        abortController.abort();
      }
    };
  }, [abortController]);
  
  // 渲染加载状态
  const renderLoading = () => (
    <LoadingContainer>
      <CircularProgress size={24} />
    </LoadingContainer>
  );
  
  // 渲染错误状态
  const renderError = () => (
    <ErrorContainer>
      <Typography variant="body2">
        {error || '搜索出错，请重试'}
      </Typography>
    </ErrorContainer>
  );
  
  // 渲染空结果
  const renderEmpty = () => (
    <EmptyContainer>
      <Typography variant="body2">
        未找到匹配笔记
      </Typography>
    </EmptyContainer>
  );
  
  // 渲染结果项
  const renderItem = (item, index) => (
    <ResultItem
      key={item._id}
      highlighted={index === highlightedIndex}
      onClick={() => {
        // 使用异步方式处理，但不等待结果
        handleItemClick(item).catch(error => {
          console.error('处理点击失败:', error);
        });
      }}
    >
      <ListItemIcon>
        <NoteIcon color="primary" />
      </ListItemIcon>
      <ListItemText
        primary={highlightText(item.title, query)}
        primaryTypographyProps={{
          variant: 'subtitle1',
          fontWeight: 'medium',
          noWrap: true,
          component: 'div'
        }}
        secondary={
          <Box>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                mb: 1
              }}
            >
              {highlightText(item.summary || '', query)}
            </Typography>
            
            {item.tags && item.tags.length > 0 && (
              <TagsContainer>
                {item.tags.slice(0, 3).map((tag, tagIndex) => (
                  <Chip
                    key={tagIndex}
                    label={highlightText(tag, query)}
                    size="small"
                    sx={{
                      fontSize: '0.7rem',
                      height: 20,
                      borderRadius: 12, // 12px 圆角，符合辅助组件规范
                      backgroundColor: 'primaryContainer.main',
                      color: 'primaryContainer.contrastText',
                    }}
                  />
                ))}
                {item.tags.length > 3 && (
                  <Chip
                    label={`+${item.tags.length - 3}`}
                    size="small"
                    variant="outlined"
                    sx={{
                      fontSize: '0.7rem',
                      height: 20,
                      borderRadius: 12,
                    }}
                  />
                )}
              </TagsContainer>
            )}
            
            <Typography variant="caption" color="text.secondary">
              {formatRelativeTime(item.updatedAt)}
            </Typography>
          </Box>
        }
        secondaryTypographyProps={{
          component: 'div'
        }}
      />
    </ResultItem>
  );
  
  return (
    <ClickAwayListener onClickAway={handleClickAway}>
      <Box ref={containerRef} sx={{ position: 'relative', width: '100%', maxWidth: 600 }}>
        <TextField
          fullWidth
          placeholder="搜索笔记..."
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          onFocus={() => query && query.length >= 2 && dispatch(openDropdown())}
          inputRef={inputRef}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
            endAdornment: inputValue && (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  onClick={handleClear}
                  sx={{
                    borderRadius: 16, // 16px 圆角，符合交互组件规范
                  }}
                >
                  <ClearIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ),
            sx: {
              borderRadius: 16, // 16px 圆角，符合交互组件规范
            }
          }}
          aria-label="搜索笔记"
          role="searchbox"
        />
        
        <Popper
          open={open}
          anchorEl={containerRef.current}
          placement="bottom-start"
          ref={popperRef}
          style={{
            width: containerRef.current?.clientWidth || '100%',
            zIndex: 1300
          }}
          role="listbox"
        >
          <SearchResultsContainer>
            {status === 'loading' && page === 1 && renderLoading()}
            {status === 'failed' && renderError()}
            {status === 'succeeded' && items.length === 0 && renderEmpty()}
            {status === 'succeeded' && items.length > 0 && (
              <ResultsList
                ref={listRef}
                onScroll={handleScroll}
                role="list"
              >
                {items.map((item, index) => renderItem(item, index))}
                {status === 'loading' && page > 1 && renderLoading()}
              </ResultsList>
            )}
          </SearchResultsContainer>
        </Popper>
      </Box>
    </ClickAwayListener>
  );
};

export default GlobalSearch;
