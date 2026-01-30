/**
 * 混合内容网格组件
 * 用于自定义页面，支持混合显示文档、引用体和附件卡片，并提供拖拽排序功能
 */

import React from 'react';
import {
  Box,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Typography,
  Button
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  DragIndicator as DragIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// 导入现有卡片组件
import DocumentCard from './DocumentCard';
import QuoteCard from './QuoteCard';
import AttachmentCard from './AttachmentCard';


// 样式化的卡片包装器
const CardWrapper = styled(Box)(({ theme }) => ({
  position: 'relative',
  height: '100%',
  '&:hover .card-actions': {
    opacity: 1,
  },
}));

// 样式化的卡片操作按钮容器
const CardActions = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: 8,
  left: 8,
  right: 8,
  display: 'flex',
  justifyContent: 'space-between',
  opacity: 0,
  transition: 'opacity 0.2s ease',
  zIndex: 10,
  pointerEvents: 'none',
  '& .MuiIconButton-root': {
    pointerEvents: 'auto',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    '&:hover': {
      backgroundColor: 'rgba(255, 255, 255, 1)',
    },
  },
}));

// 样式化的网格容器，用于拖拽排序
const SortableGridContainer = styled(Box)(({ theme }) => ({
  display: 'grid',
  gap: theme.spacing(3),
  gridTemplateColumns: '1fr',
  alignItems: 'stretch',
  width: '100%',
  
  // 小屏及以上 (≥600px): 2列
  [theme.breakpoints.up('sm')]: {
    gridTemplateColumns: 'repeat(2, 1fr)',
  },
  
  // 中等屏及以上 (≥900px): 3列
  [theme.breakpoints.up('md')]: {
    gridTemplateColumns: 'repeat(3, 1fr)',
  },
  
  // 大屏及以上 (≥1400px): 4列
  '@media (min-width: 1400px)': {
    gridTemplateColumns: 'repeat(4, 1fr)',
  },
}));

// 样式化的空状态容器
const EmptyState = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(4),
  color: theme.palette.text.secondary,
  minHeight: 200,
}));

// 可排序的卡片项组件
const SortableCardItem = ({ id, children, onRemove }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <CardWrapper>
        <CardActions className="card-actions">
          <Tooltip title="拖拽排序">
            <IconButton
              size="small"
              {...listeners}
              sx={{ cursor: 'grab' }}
            >
              <DragIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="移除">
            <IconButton
              size="small"
              onClick={() => onRemove(id)}
              color="error"
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </CardActions>
        {children}
      </CardWrapper>
    </div>
  );
};

/**
 * 混合内容网格组件
 * @param {Object} props - 组件属性
 * @param {Array} props.items - 混合内容项数组
 * @param {Function} props.onItemClick - 卡片点击回调
 * @param {Function} props.onItemRemove - 卡片移除回调
 * @param {Function} props.onReorder - 卡片重排序回调
 * @param {Function} props.onAddContent - 添加内容回调
 * @param {Boolean} props.loading - 加载状态
 * @param {String} props.error - 错误信息
 */
const MixedContentGrid = ({
  items = [],
  onItemClick,
  onItemRemove,
  onReorder,
  onAddContent,
  loading = false,
  error = null
}) => {
  // 拖拽排序传感器
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );

  // 处理拖拽结束
  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex(item => item.id === active.id);
      const newIndex = items.findIndex(item => item.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newItems = arrayMove(items, oldIndex, newIndex);
        onReorder && onReorder(newItems);
      }
    }
  };

  // 渲染单个内容项
  const renderItem = (item) => {
    const { kind, data } = item;

    if (!data) return null;

    switch (kind) {
      case 'Document':
        return (
          <DocumentCard
            document={data}
            onViewDetail={() => onItemClick && onItemClick(item)}
          />
        );
      case 'Quote':
        return (
          <QuoteCard
            quote={data}
            onViewDetail={() => onItemClick && onItemClick(item)}
          />
        );
      case 'Attachment':
        return (
          <AttachmentCard
            attachment={data}
            onView={() => onItemClick && onItemClick(item)}
          />
        );
      default:
        return null;
    }
  };

  // 渲染加载状态
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>
          正在加载内容...
        </Typography>
      </Box>
    );
  }

  // 渲染错误状态
  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  // 渲染空状态
  if (items.length === 0) {
    return (
      <EmptyState>
        <Typography variant="body1" gutterBottom>
          暂无内容
        </Typography>
        {onAddContent && (
          <Button
            variant="outlined"
            onClick={onAddContent}
            sx={{ mt: 2 }}
          >
            添加内容
          </Button>
        )}
      </EmptyState>
    );
  }

  // 渲染内容网格
  return (
    <Box>
      {onAddContent && (
        <Box display="flex" justifyContent="flex-end" mb={2}>
          <Button
            variant="outlined"
            onClick={onAddContent}
          >
            添加内容
          </Button>
        </Box>
      )}
      
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={items.map(item => item.id)}
          strategy={rectSortingStrategy}
        >
          <SortableGridContainer>
            {items.map((item) => (
              <SortableCardItem
                key={item.id}
                id={item.id}
                onRemove={onItemRemove}
              >
                {renderItem(item)}
              </SortableCardItem>
            ))}
          </SortableGridContainer>
        </SortableContext>
      </DndContext>
    </Box>
  );
};

export default MixedContentGrid;
