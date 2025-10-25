import React from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Chip,
  Box,
  Tooltip,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import HtmlIcon from '@mui/icons-material/Html';

// 样式化的卡片容器
const StyledCard = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out, background-color 0.3s ease',
  borderRadius: 20, // 设置为 20px 圆角，创造现代设计风格
  backgroundColor: theme.palette.background.paper,
  border: `1px solid ${theme.palette.border}`,
  cursor: 'pointer',
  opacity: 'var(--transparency-cards, 1)',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.shadows[8],
    backgroundColor: theme.palette.surfaceVariant,
  },
}));

// 标签容器
const TagsContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  gap: theme.spacing(0.5),
  marginTop: theme.spacing(1),
}));

// 内容容器，限制高度并添加滚动条
const ContentContainer = styled(Box)(({ theme }) => ({
  maxHeight: 120,
  overflow: 'hidden',
  position: 'relative',
  flexGrow: 1,
  '&::after': {
    content: '""',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 20,
    background: `linear-gradient(transparent, ${theme.palette.background.paper})`,
  },
}));

const DocumentCard = ({ document, onViewDetail }) => {
  // 格式化日期
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleViewDetail = () => {
    onViewDetail(document);
  };

  return (
    <StyledCard onClick={handleViewDetail}>
      <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        {/* 标题 */}
        <Typography
          variant="h6"
          component="h2"
          gutterBottom
          sx={{
            fontWeight: 'bold',
            color: 'primary.main',
            lineHeight: 1.2,
            maxHeight: 60,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {document.title}
        </Typography>

        {/* 内容预览 */}
        <ContentContainer>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              lineHeight: 1.5,
              fontSize: '0.875rem',
            }}
          >
            {document.content}
          </Typography>
        </ContentContainer>

        {/* 标签 */}
        <TagsContainer>
          {/* HTML 标记 - 仅当 content 和 htmlContent 均存在时显示 */}
          {document.content && document.htmlContent && (
            <Chip
              icon={<HtmlIcon sx={{ fontSize: 14 }} />}
              label="HTML"
              size="small"
              variant="filled"
              sx={{
                fontSize: '0.7rem',
                height: 24,
                backgroundColor: 'secondary.main',
                color: 'secondary.contrastText',
                '&:hover': {
                  backgroundColor: 'secondary.dark',
                },
              }}
            />
          )}
          
          {document.tags.map((tag, index) => (
            <Chip
              key={index}
              label={tag}
              size="small"
              variant="outlined"
              sx={{
                fontSize: '0.7rem',
                height: 24,
                borderColor: 'primary.main',
                color: 'primary.main',
                '&:hover': {
                  backgroundColor: 'primaryContainer.main',
                  color: 'primaryContainer.contrastText',
                },
              }}
            />
          ))}
        </TagsContainer>
      </CardContent>

      <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
        {/* 来源信息 */}
        <Tooltip title={`来源: ${document.source}`}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              fontSize: '0.7rem',
              maxWidth: '40%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {document.source}
          </Typography>
        </Tooltip>

        {/* 日期信息 */}
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            fontSize: '0.7rem',
          }}
        >
          {formatDate(document.updatedAt)}
        </Typography>
      </CardActions>
    </StyledCard>
  );
};

export default DocumentCard;