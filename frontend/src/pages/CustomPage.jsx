/**
 * 自定义页面组件
 * 显示和编辑自定义页面的内容
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Grid,
  Card,
  CardContent,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Chip,
  Tooltip,
  Menu,
  MenuItem
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  Edit as EditIcon,
  Add as AddIcon,
  Close as CloseIcon,
  Save as SaveIcon,
  Note as NoteIcon,
  FormatQuote as QuoteIcon,
  AttachFile as AttachmentIcon,
  ArrowDropDown as ArrowDropDownIcon,
  DragIndicator as DragIcon
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  fetchPageByName,
  updatePage,
  selectCurrentPage,
  selectLoading,
  selectError,
  clearError
} from '../store/customPagesSlice';
import AttachmentPickerDialog from '../components/AttachmentPickerDialog';
import DocumentPickerDialog from '../components/DocumentPickerDialog';
import QuotePickerDialog from '../components/QuotePickerDialog';
import DocumentCard from '../components/DocumentCard';
import QuoteCard from '../components/QuoteCard';
import AttachmentCard from '../components/AttachmentCard';
import {
  openWindowAndFetch,
  openQuoteWindowAndFetch,
  openAttachmentWindowAndFetch
} from '../store/windowsSlice';
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

// 样式化的容器
const StyledContainer = styled(Container)(({ theme }) => ({
  paddingTop: theme.spacing(3),
  paddingBottom: theme.spacing(3),
}));

// 样式化的页面标题区域
const PageHeader = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(3),
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: theme.spacing(2),
}));


// 样式化的网格容器，用于拖拽排序
const SortableGridContainer = styled(Box)(({ theme }) => ({
  display: 'grid',
  gap: theme.spacing(3),
  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
  alignItems: 'stretch',
  width: '100%',
  overflow: 'visible',
}));

// 样式化的卡片包装器
const CardWrapper = styled(Box)(({ theme }) => ({
  position: 'relative',
  height: '100%',
  overflow: 'visible',
  minWidth: 0,
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
  '&.edit-mode': {
    opacity: 1,
  },
  '&:hover .edit-mode': {
    opacity: 1,
  },
  '& .MuiIconButton-root': {
    pointerEvents: 'auto',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    '&:hover': {
      backgroundColor: 'rgba(255, 255, 255, 1)',
    },
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

// 附件类别映射
const CATEGORY_MAP = {
  image: '图片',
  video: '视频',
  document: '文档',
  script: '程序与脚本'
};



// 格式化文件大小
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};


// 可排序的卡片项组件
const SortableCardItem = ({ id, children, onRemove, isEditLayout }) => {
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
        <CardActions className={`card-actions ${isEditLayout ? 'edit-mode' : ''}`}>
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

const CustomPage = () => {
  const { name } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  // Redux状态
  const currentPage = useSelector(selectCurrentPage);
  const loading = useSelector(selectLoading);
  const error = useSelector(selectError);
  
  // 本地状态
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [attachmentPickerOpen, setAttachmentPickerOpen] = useState(false);
  const [documentPickerOpen, setDocumentPickerOpen] = useState(false);
  const [quotePickerOpen, setQuotePickerOpen] = useState(false);
  const [isEditLayout, setIsEditLayout] = useState(false);
  
  // 本地布局状态
  const [mixedItemsLocal, setMixedItemsLocal] = useState([]);
  const [originalMixedItems, setOriginalMixedItems] = useState([]);
  const [isLayoutDirty, setIsLayoutDirty] = useState(false);
  
  // 添加内容下拉菜单状态
  const [addMenuAnchorEl, setAddMenuAnchorEl] = useState(null);
  const addMenuOpen = Boolean(addMenuAnchorEl);
  
  
  // 防抖更新定时器
  const updateTimeoutRef = useRef(null);
  
  // 拖拽排序传感器
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 移动8px后才触发拖拽，避免误触点击
      },
    }),
    useSensor(KeyboardSensor)
  );
  
  // 处理添加内容菜单打开
  const handleAddMenuOpen = (event) => {
    setAddMenuAnchorEl(event.currentTarget);
  };
  
  // 处理添加内容菜单关闭
  const handleAddMenuClose = () => {
    setAddMenuAnchorEl(null);
  };
  
  // 生成混合内容项数据
  const generateMixedItems = () => {
    if (!currentPage) return [];
    
    // 优先使用 contentItems
    if (currentPage.contentItems && currentPage.contentItems.length > 0) {
      return currentPage.contentItems.map(item => {
        let data = null;
        
        // 根据类型查找对应的数据
        switch (item.kind) {
          case 'Document':
            data = currentPage.referencedDocumentIds?.find(doc => doc._id === item.refId);
            break;
          case 'Quote':
            data = currentPage.referencedQuoteIds?.find(quote => quote._id === item.refId);
            break;
          case 'Attachment':
            data = currentPage.referencedAttachmentIds?.find(att => att._id === item.refId);
            break;
        }
        
        return {
          id: `${item.kind}:${item.refId}`,
          kind: item.kind,
          data
        };
      });
    }
    
    // 如果没有 contentItems，使用默认排序逻辑
    const mixedItems = [];
    
    // 添加文档
    if (currentPage.referencedDocumentIds) {
      currentPage.referencedDocumentIds.forEach(doc => {
        mixedItems.push({
          id: `Document:${doc._id}`,
          kind: 'Document',
          data: doc,
          updatedAt: doc.updatedAt
        });
      });
    }
    
    // 添加引用体
    if (currentPage.referencedQuoteIds) {
      currentPage.referencedQuoteIds.forEach(quote => {
        mixedItems.push({
          id: `Quote:${quote._id}`,
          kind: 'Quote',
          data: quote,
          updatedAt: quote.updatedAt
        });
      });
    }
    
    // 添加附件
    if (currentPage.referencedAttachmentIds) {
      currentPage.referencedAttachmentIds.forEach(attachment => {
        mixedItems.push({
          id: `Attachment:${attachment._id}`,
          kind: 'Attachment',
          data: attachment,
          updatedAt: attachment.updatedAt
        });
      });
    }
    
    // 按更新时间降序排序
    mixedItems.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    
    return mixedItems;
  };
  
  
  // 处理卡片点击
  const handleItemClick = async (item) => {
    const { kind, data } = item;
    
    if (!data) return;
    
    try {
      switch (kind) {
        case 'Document':
          // 使用窗口系统打开文档
          await dispatch(openWindowAndFetch({
            docId: data._id,
            label: data.title || '加载中...',
            source: 'custom-page'
          })).unwrap();
          break;
        case 'Quote':
          // 使用窗口系统打开引用体
          await dispatch(openQuoteWindowAndFetch({
            quoteId: data._id,
            label: data.title || '加载中...',
            source: 'custom-page'
          })).unwrap();
          break;
        case 'Attachment':
          // 使用窗口系统打开附件
          await dispatch(openAttachmentWindowAndFetch({
            attachmentId: data._id,
            label: data.originalName || '加载中...',
            source: 'custom-page',
            initialData: data
          })).unwrap();
          break;
        default:
          break;
      }
    } catch (error) {
      console.error('打开内容失败:', error);
    }
  };
  
  // 处理卡片移除
  const handleItemRemove = (itemId) => {
    if (isEditLayout) {
      // 编辑态：仅本地移除并标记为脏
      setMixedItemsLocal(prev => prev.filter(item => item.id !== itemId));
      setIsLayoutDirty(true);
    } else {
      // 非编辑态：使用原有逻辑立即持久化删除
      const [kind, refId] = itemId.split(':');
      
      switch (kind) {
        case 'Document':
          handleRemoveDocument(refId);
          break;
        case 'Quote':
          handleRemoveQuote(refId);
          break;
        case 'Attachment':
          handleRemoveAttachment(refId);
          break;
        default:
          break;
      }
    }
  };
  
  // 处理拖拽结束
  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (over && active.id !== over.id && isEditLayout) {
      // 编辑态：仅本地重排并标记为脏
      const oldIndex = mixedItemsLocal.findIndex(item => item.id === active.id);
      const newIndex = mixedItemsLocal.findIndex(item => item.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newItems = arrayMove(mixedItemsLocal, oldIndex, newIndex);
        setMixedItemsLocal(newItems);
        setIsLayoutDirty(true);
      }
    }
  };

  // 保存布局
  const handleSaveLayout = async () => {
    if (!isLayoutDirty || !currentPage) return;

    try {
      // 转换为 contentItems 格式
      const newContentItems = mixedItemsLocal.map(item => {
        const [kind, refId] = item.id.split(':');
        return { kind, refId };
      });

      // 更新页面
      await dispatch(updatePage({
        id: currentPage._id,
        updateData: {
          contentItems: newContentItems
        },
        options: { populate: 'full', include: 'counts,previews' }
      })).unwrap();

      // 更新原始快照并清除脏标记
      setOriginalMixedItems([...mixedItemsLocal]);
      setIsLayoutDirty(false);
    } catch (error) {
      console.error('保存布局失败:', error);
    }
  };

  // 重置布局
  const handleResetLayout = () => {
    setMixedItemsLocal([...originalMixedItems]);
    setIsLayoutDirty(false);
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
            onViewDetail={() => handleItemClick && handleItemClick(item)}
          />
        );
      case 'Quote':
        return (
          <QuoteCard
            quote={data}
            onViewDetail={() => handleItemClick && handleItemClick(item)}
          />
        );
      case 'Attachment':
        return (
          <AttachmentCard
            attachment={data}
            onView={() => handleItemClick && handleItemClick(item)}
          />
        );
      default:
        return null;
    }
  };

  // 渲染混合内容网格
  const renderMixedContentGrid = () => {
    const mixedItems = generateMixedItems();
    
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
    if (mixedItems.length === 0) {
      return (
        <EmptyState>
          <Typography variant="body1" gutterBottom>
            暂无内容
          </Typography>
          <Button
            variant="outlined"
            onClick={handleAddMenuOpen}
            sx={{ mt: 2 }}
          >
            添加内容
          </Button>
        </EmptyState>
      );
    }

    // 渲染内容网格
    return (
      <Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box>
            {isEditLayout && (
              <Typography variant="body2" color="text.secondary">
                拖拽卡片可调整顺序，点击右上角 × 可移除
              </Typography>
            )}
          </Box>
          <Box display="flex" gap={1}>
            {isEditLayout && (
              <>
                <Button
                  variant="outlined"
                  onClick={handleResetLayout}
                  disabled={!isLayoutDirty}
                  startIcon={<CloseIcon />}
                >
                  重置布局
                </Button>
                <Button
                  variant="contained"
                  onClick={handleSaveLayout}
                  disabled={!isLayoutDirty}
                  startIcon={<SaveIcon />}
                >
                  保存布局
                </Button>
              </>
            )}
            <Button
              variant={isEditLayout ? "outlined" : "contained"}
              onClick={() => setIsEditLayout(!isEditLayout)}
              startIcon={<EditIcon />}
            >
              {isEditLayout ? '完成编辑' : '编辑布局'}
            </Button>
            <Button
              variant="outlined"
              onClick={handleAddMenuOpen}
            >
              添加内容
            </Button>
          </Box>
        </Box>
        
        {isEditLayout ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={mixedItemsLocal.map(item => item.id)}
              strategy={rectSortingStrategy}
            >
              <SortableGridContainer>
                {mixedItemsLocal.map((item) => (
                  <SortableCardItem
                    key={item.id}
                    id={item.id}
                    onRemove={handleItemRemove}
                    isEditLayout={isEditLayout}
                  >
                    {renderItem(item)}
                  </SortableCardItem>
                ))}
              </SortableGridContainer>
            </SortableContext>
          </DndContext>
        ) : (
          <SortableGridContainer>
            {mixedItems.map((item) => (
              <Box
                key={item.id}
                sx={{
                  display: 'flex',
                  width: '100%',
                }}
              >
                {renderItem(item)}
              </Box>
            ))}
          </SortableGridContainer>
        )}
      </Box>
    );
  };
  
  
  // 处理附件拖拽排序
  const handleAttachmentDragEnd = (event) => {
    const { active, over } = event;
    
    if (active.id !== over.id && currentPage) {
      const oldIndex = currentPage.referencedAttachmentIds.findIndex(
        item => item._id === active.id
      );
      const newIndex = currentPage.referencedAttachmentIds.findIndex(
        item => item._id === over.id
      );
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newAttachments = arrayMove(
          currentPage.referencedAttachmentIds,
          oldIndex,
          newIndex
        );
        
        // 防抖更新
        if (updateTimeoutRef.current) {
          clearTimeout(updateTimeoutRef.current);
        }
        
        updateTimeoutRef.current = setTimeout(() => {
          dispatch(updatePage({
            id: currentPage._id,
            updateData: {
              referencedAttachmentIds: newAttachments.map(item => item._id)
            },
            options: { populate: 'full', include: 'counts,previews' }
          }));
        }, 300);
      }
    }
  };
  
  // 处理文档拖拽排序
  const handleDocumentDragEnd = (event) => {
    const { active, over } = event;
    
    if (active.id !== over.id && currentPage) {
      const oldIndex = currentPage.referencedDocumentIds.findIndex(
        item => item._id === active.id
      );
      const newIndex = currentPage.referencedDocumentIds.findIndex(
        item => item._id === over.id
      );
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newDocuments = arrayMove(
          currentPage.referencedDocumentIds,
          oldIndex,
          newIndex
        );
        
        // 防抖更新
        if (updateTimeoutRef.current) {
          clearTimeout(updateTimeoutRef.current);
        }
        
        updateTimeoutRef.current = setTimeout(() => {
          dispatch(updatePage({
            id: currentPage._id,
            updateData: {
              referencedDocumentIds: newDocuments.map(item => item._id)
            },
            options: { populate: 'full', include: 'counts,previews' }
          }));
        }, 300);
      }
    }
  };
  
  // 处理引用体拖拽排序
  const handleQuoteDragEnd = (event) => {
    const { active, over } = event;
    
    if (active.id !== over.id && currentPage) {
      const oldIndex = currentPage.referencedQuoteIds.findIndex(
        item => item._id === active.id
      );
      const newIndex = currentPage.referencedQuoteIds.findIndex(
        item => item._id === over.id
      );
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newQuotes = arrayMove(
          currentPage.referencedQuoteIds,
          oldIndex,
          newIndex
        );
        
        // 防抖更新
        if (updateTimeoutRef.current) {
          clearTimeout(updateTimeoutRef.current);
        }
        
        updateTimeoutRef.current = setTimeout(() => {
          dispatch(updatePage({
            id: currentPage._id,
            updateData: {
              referencedQuoteIds: newQuotes.map(item => item._id)
            },
            options: { populate: 'full', include: 'counts,previews' }
          }));
        }, 300);
      }
    }
  };
  
  // 加载页面数据
  useEffect(() => {
    if (name) {
      dispatch(fetchPageByName({
        name: decodeURIComponent(name),
        options: { populate: 'full', include: 'counts,previews' }
      }));
    }
    
    return () => {
      dispatch(clearError());
    };
  }, [dispatch, name]);

  // 编辑模式状态管理
  useEffect(() => {
    if (isEditLayout && currentPage) {
      const items = generateMixedItems();
      setMixedItemsLocal(items);
      setOriginalMixedItems([...items]);
      setIsLayoutDirty(false);
    }
  }, [isEditLayout, currentPage]);
  
  // 处理重命名
  const handleRename = () => {
    if (currentPage && newName.trim() && newName.trim() !== currentPage.name) {
      dispatch(updatePage({
        id: currentPage._id,
        updateData: { name: newName.trim() },
        options: { populate: 'full', include: 'counts,previews' }
      })).then((action) => {
        if (!action.error) {
          const updatedName = action.payload.data.name;
          setRenameDialogOpen(false);
          // 导航到新的URL
          navigate(`/自定义/${encodeURIComponent(updatedName)}`, { replace: true });
        }
      });
    }
  };
  
  // 打开重命名对话框
  const openRenameDialog = () => {
    if (currentPage) {
      setNewName(currentPage.name);
      setRenameDialogOpen(true);
    }
  };
  
  // 关闭重命名对话框
  const closeRenameDialog = () => {
    setRenameDialogOpen(false);
    setNewName('');
  };
  
  // 添加附件
  const handleAddAttachments = (selectedIds) => {
    if (currentPage) {
      const currentIds = currentPage.referencedAttachmentIds.map(item => item._id);
      const newIds = [...new Set([...currentIds, ...selectedIds])];
      
      dispatch(updatePage({
        id: currentPage._id,
        updateData: { referencedAttachmentIds: newIds },
        options: { populate: 'full', include: 'counts,previews' }
      }));
    }
  };
  
  // 添加文档
  const handleAddDocuments = (selectedIds) => {
    if (currentPage) {
      const currentIds = currentPage.referencedDocumentIds.map(item => item._id);
      const newIds = [...new Set([...currentIds, ...selectedIds])];
      
      dispatch(updatePage({
        id: currentPage._id,
        updateData: { referencedDocumentIds: newIds },
        options: { populate: 'full', include: 'counts,previews' }
      }));
    }
  };
  
  // 添加引用体
  const handleAddQuotes = (selectedIds) => {
    if (currentPage) {
      const currentIds = currentPage.referencedQuoteIds.map(item => item._id);
      const newIds = [...new Set([...currentIds, ...selectedIds])];
      
      dispatch(updatePage({
        id: currentPage._id,
        updateData: { referencedQuoteIds: newIds },
        options: { populate: 'full', include: 'counts,previews' }
      }));
    }
  };
  
  // 移除附件
  const handleRemoveAttachment = (attachmentId) => {
    if (currentPage) {
      // 从引用数组中移除
      const newAttachmentIds = currentPage.referencedAttachmentIds
        .map(item => item._id)
        .filter(id => id !== attachmentId);
      
      // 从 contentItems 中移除
      const newContentItems = (currentPage.contentItems || [])
        .filter(item => !(item.kind === 'Attachment' && item.refId === attachmentId));
      
      dispatch(updatePage({
        id: currentPage._id,
        updateData: {
          referencedAttachmentIds: newAttachmentIds,
          contentItems: newContentItems
        },
        options: { populate: 'full', include: 'counts,previews' }
      }));
    }
  };
  
  // 移除文档
  const handleRemoveDocument = (documentId) => {
    if (currentPage) {
      // 从引用数组中移除
      const newDocumentIds = currentPage.referencedDocumentIds
        .map(item => item._id)
        .filter(id => id !== documentId);
      
      // 从 contentItems 中移除
      const newContentItems = (currentPage.contentItems || [])
        .filter(item => !(item.kind === 'Document' && item.refId === documentId));
      
      dispatch(updatePage({
        id: currentPage._id,
        updateData: {
          referencedDocumentIds: newDocumentIds,
          contentItems: newContentItems
        },
        options: { populate: 'full', include: 'counts,previews' }
      }));
    }
  };
  
  // 移除引用体
  const handleRemoveQuote = (quoteId) => {
    if (currentPage) {
      // 从引用数组中移除
      const newQuoteIds = currentPage.referencedQuoteIds
        .map(item => item._id)
        .filter(id => id !== quoteId);
      
      // 从 contentItems 中移除
      const newContentItems = (currentPage.contentItems || [])
        .filter(item => !(item.kind === 'Quote' && item.refId === quoteId));
      
      dispatch(updatePage({
        id: currentPage._id,
        updateData: {
          referencedQuoteIds: newQuoteIds,
          contentItems: newContentItems
        },
        options: { populate: 'full', include: 'counts,previews' }
      }));
    }
  };
  
  
  
  // 加载状态
  if (loading) {
    return (
      <StyledContainer>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      </StyledContainer>
    );
  }
  
  // 错误状态
  if (error) {
    return (
      <StyledContainer>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      </StyledContainer>
    );
  }
  
  // 页面不存在
  if (!currentPage) {
    return (
      <StyledContainer>
        <Alert severity="info">
          自定义页面不存在
        </Alert>
      </StyledContainer>
    );
  }
  
  return (
    <StyledContainer maxWidth="xl">
      {/* 页面标题区域 */}
      <PageHeader>
        <Typography variant="h4" component="h1">
          {currentPage.name}
        </Typography>
        <Button
          variant="outlined"
          startIcon={<EditIcon />}
          onClick={openRenameDialog}
        >
          重命名
        </Button>
      </PageHeader>
      
      {/* 内容区域 */}
      {renderMixedContentGrid()}
      
      {/* 重命名对话框 */}
      <Dialog open={renameDialogOpen} onClose={closeRenameDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">重命名页面</Typography>
            <IconButton onClick={closeRenameDialog} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="页面名称"
            fullWidth
            variant="outlined"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleRename()}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeRenameDialog}>取消</Button>
          <Button onClick={handleRename} variant="contained" disabled={!newName.trim()}>
            确定
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* 添加内容下拉菜单 */}
      <Menu
        anchorEl={addMenuAnchorEl}
        open={addMenuOpen}
        onClose={handleAddMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
      >
        <MenuItem onClick={() => {
          handleAddMenuClose();
          setAttachmentPickerOpen(true);
        }}>
          <AttachmentIcon sx={{ mr: 1 }} />
          添加附件
        </MenuItem>
        <MenuItem onClick={() => {
          handleAddMenuClose();
          setDocumentPickerOpen(true);
        }}>
          <NoteIcon sx={{ mr: 1 }} />
          添加笔记
        </MenuItem>
        <MenuItem onClick={() => {
          handleAddMenuClose();
          setQuotePickerOpen(true);
        }}>
          <QuoteIcon sx={{ mr: 1 }} />
          添加引用体
        </MenuItem>
      </Menu>
      
      {/* 附件选择对话框 */}
      <AttachmentPickerDialog
        open={attachmentPickerOpen}
        onClose={() => setAttachmentPickerOpen(false)}
        onConfirm={handleAddAttachments}
        excludeIds={currentPage?.referencedAttachmentIds?.map(item => item._id) || []}
      />
      
      {/* 文档选择对话框 */}
      <DocumentPickerDialog
        open={documentPickerOpen}
        handleClose={() => setDocumentPickerOpen(false)}
        onConfirm={handleAddDocuments}
        excludeIds={currentPage?.referencedDocumentIds?.map(item => item._id) || []}
      />
      
      {/* 引用体选择对话框 */}
      <QuotePickerDialog
        open={quotePickerOpen}
        handleClose={() => setQuotePickerOpen(false)}
        onConfirm={handleAddQuotes}
        excludeIds={currentPage?.referencedQuoteIds?.map(item => item._id) || []}
      />
    </StyledContainer>
  );
};

export default CustomPage;