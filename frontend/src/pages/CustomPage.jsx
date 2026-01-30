/**
 * 自定义页面组件
 * 显示和编辑自定义页面的内容
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Menu,
  MenuItem
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  Edit as EditIcon,
  Close as CloseIcon,
  Save as SaveIcon,
  Note as NoteIcon,
  FormatQuote as QuoteIcon,
  AttachFile as AttachmentIcon,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import {
  updatePage,
} from '../store/customPagesSlice';
import { useCustomPageByName } from '../features/customPages/hooks/useCustomPageByName';
import AttachmentPickerDialog from '../components/AttachmentPickerDialog';
import DocumentPickerDialog from '../components/DocumentPickerDialog';
import QuotePickerDialog from '../components/QuotePickerDialog';
import DocumentCard from '../components/DocumentCard';
import QuoteCard from '../components/QuoteCard';
import AttachmentCard from '../components/AttachmentCard';
import SortableCardItem from '../features/customPages/components/SortableCardItem';
import { buildMixedItems } from '../features/customPages/utils/buildMixedItems';
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
} from '@dnd-kit/sortable';

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

const CustomPage = () => {
  const { name } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const { currentPage, loading, error } = useCustomPageByName(name);
  
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

  const mixedItems = useMemo(() => buildMixedItems(currentPage), [currentPage]);
  
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

  // 编辑模式状态管理
  useEffect(() => {
    if (isEditLayout && currentPage) {
      setMixedItemsLocal(mixedItems);
      setOriginalMixedItems([...mixedItems]);
      setIsLayoutDirty(false);
    }
  }, [isEditLayout, currentPage, mixedItems]);
  
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
