import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Chip,
  Box,
  Tooltip
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  Note as NoteIcon,
  Launch as LaunchIcon
} from '@mui/icons-material';
import { useDispatch } from 'react-redux';
import {
  fetchDocumentById,
  openDocumentModal
} from '../store/documentsSlice';

// 样式化的卡片容器
const StyledCard = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  borderRadius: 20, // 20px 圆角，符合主要容器规范
  transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
  cursor: 'pointer',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.shadows[8],
  },
}));

// 样式化的卡片内容
const StyledCardContent = styled(CardContent)(({ theme }) => ({
  flexGrow: 1,
  display: 'flex',
  flexDirection: 'column',
  padding: theme.spacing(3),
  '&:last-child': {
    paddingBottom: theme.spacing(3),
  },
}));

// 样式化的标题
const Title = styled(Typography)(({ theme }) => ({
  fontWeight: 'bold',
  marginBottom: theme.spacing(1),
  color: theme.palette.primary.main,
  lineHeight: 1.3,
}));

// 样式化的描述
const Description = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.secondary,
  marginBottom: theme.spacing(2),
  fontSize: '0.9rem',
  lineHeight: 1.4,
}));

// 样式化的标签容器
const TagsContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  gap: theme.spacing(0.5),
  marginTop: 'auto',
  marginBottom: theme.spacing(2),
}));

// 样式化的引用文档容器
const ReferencedDocsContainer = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(2),
  paddingTop: theme.spacing(1),
  borderTop: `1px solid ${theme.palette.divider}`,
}));

// 样式化的引用文档标题
const ReferencedDocsTitle = styled(Typography)(({ theme }) => ({
  fontSize: '0.85rem',
  fontWeight: 'medium',
  color: theme.palette.text.secondary,
  marginBottom: theme.spacing(1),
}));

// 样式化的引用文档列表
const ReferencedDocsList = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  gap: theme.spacing(0.5),
}));

// 样式化的引用文档项
const ReferencedDocItem = styled(Chip)(({ theme }) => ({
  fontSize: '0.8rem',
  height: 24,
  borderRadius: 12, // 12px 圆角，符合辅助组件规范
  backgroundColor: theme.palette.primaryContainer.main,
  color: theme.palette.primaryContainer.contrastText,
  '&:hover': {
    backgroundColor: theme.palette.primaryContainer.dark,
  },
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

const QuoteCard = ({ quote, onViewDetail }) => {
  const dispatch = useDispatch();
  
  // 处理查看详情
  const handleViewDetail = () => {
    onViewDetail(quote);
  };

  // 处理查看引用的文档
  const handleViewReferencedDoc = async (event, docId) => {
    event.stopPropagation(); // 阻止事件冒泡
    
    try {
      // 先显示一个加载中的弹窗，提供即时反馈
      dispatch(openDocumentModal({
        _id: docId,
        title: '加载中...',
        content: '加载中...',
        tags: [],
        source: ''
      }));
      
      // 然后获取完整数据
      await dispatch(fetchDocumentById(docId)).unwrap();
      
      // 数据加载完成后，再次打开弹窗，此时会使用 store 中的完整数据
      dispatch(openDocumentModal());
    } catch (error) {
      console.error('获取文档详情失败:', error);
      alert('获取文档详情失败，请重试');
    }
  };

  return (
    <StyledCard onClick={handleViewDetail}>
      <StyledCardContent>
        {/* 标题 */}
        <Title variant="h6" component="h2">
          {quote.title}
        </Title>

        {/* 描述 */}
        {quote.description && (
          <Description variant="body2">
            {quote.description.length > 100 
              ? `${quote.description.substring(0, 100)}...` 
              : quote.description
            }
          </Description>
        )}

        {/* 标签 */}
        {quote.tags && quote.tags.length > 0 && (
          <TagsContainer>
            {quote.tags.slice(0, 3).map((tag, index) => (
              <Chip
                key={index}
                label={tag}
                size="small"
                variant="outlined"
                sx={{
                  borderRadius: 12, // 12px 圆角，符合辅助组件规范
                  fontSize: '0.75rem',
                }}
              />
            ))}
            {quote.tags.length > 3 && (
              <Chip
                label={`+${quote.tags.length - 3}`}
                size="small"
                variant="outlined"
                sx={{
                  borderRadius: 12,
                  fontSize: '0.75rem',
                }}
              />
            )}
          </TagsContainer>
        )}

        {/* 引用的文档 */}
        {quote.referencedDocumentIds && quote.referencedDocumentIds.length > 0 && (
          <ReferencedDocsContainer>
            <ReferencedDocsTitle variant="caption">
              引用笔记 ({quote.referencedDocumentIds.length})
            </ReferencedDocsTitle>
            <ReferencedDocsList>
              {quote.referencedDocumentIds.slice(0, 2).map((docId, index) => (
                <Tooltip key={index} title="点击查看笔记详情">
                  <ReferencedDocItem
                    icon={<NoteIcon fontSize="small" />}
                    label={typeof docId === 'object' ? (docId.title || '未知笔记') : '加载中...'}
                    onClick={(event) => handleViewReferencedDoc(event, typeof docId === 'object' ? docId._id : docId)}
                    deleteIcon={<LaunchIcon fontSize="small" />}
                  />
                </Tooltip>
              ))}
              {quote.referencedDocumentIds.length > 2 && (
                <Chip
                  label={`+${quote.referencedDocumentIds.length - 2}`}
                  size="small"
                  variant="outlined"
                  sx={{
                    borderRadius: 12,
                    fontSize: '0.75rem',
                  }}
                />
              )}
            </ReferencedDocsList>
          </ReferencedDocsContainer>
        )}

        {/* 更新时间 */}
        <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-between' }}>
          <Typography variant="caption" color="text.secondary">
            更新于 {formatRelativeTime(quote.updatedAt)}
          </Typography>
        </Box>
      </StyledCardContent>
    </StyledCard>
  );
};

export default QuoteCard;