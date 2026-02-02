import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  CollectionsBookmark as CollectionsBookmarkIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  OpenInNew as OpenInNewIcon,
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  clearError,
  createPage,
  deletePage,
  selectAllPages,
  selectError,
  selectSaving,
} from '../../../store/customPagesSlice';
import {
  selectCustomPagesEnabled,
  selectCustomPagesVisibility,
  toggleCustomPageVisibility,
  toggleCustomPages,
} from '../../../store/settingsSlice';
import { SettingsCard } from '../components/SettingsShell';

const CustomPagesSettingsCard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const customPages = useSelector(selectAllPages);
  const saving = useSelector(selectSaving);
  const error = useSelector(selectError);
  const customPagesEnabled = useSelector(selectCustomPagesEnabled);
  const customPagesVisibility = useSelector(selectCustomPagesVisibility);

  const [newPageName, setNewPageName] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [pageToDelete, setPageToDelete] = useState(null);

  const handleCreatePage = () => {
    if (!newPageName.trim()) return;
    dispatch(createPage({ name: newPageName.trim() })).then((action) => {
      if (!action.error) {
        setNewPageName('');
        const createdPage = action.payload.data;
        if (window.confirm(`页面 "${createdPage.name}" 创建成功！是否立即打开页面？`)) {
          navigate(`/自定义/${encodeURIComponent(createdPage.name)}`);
        }
      }
    });
  };

  const openDeleteConfirm = (page) => {
    setPageToDelete(page);
    setDeleteConfirmOpen(true);
  };

  const closeDeleteConfirm = () => {
    setDeleteConfirmOpen(false);
    setPageToDelete(null);
  };

  const handleDeletePage = () => {
    if (!pageToDelete) return;
    dispatch(deletePage(pageToDelete._id)).then((action) => {
      if (!action.error) closeDeleteConfirm();
    });
  };

  return (
    <>
      <SettingsCard>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            功能开关
          </Typography>
          <List sx={{ p: 0 }}>
            <ListItem>
              <ListItemIcon>
                <CollectionsBookmarkIcon />
              </ListItemIcon>
              <ListItemText primary="自定义页面" secondary="在侧边栏显示或隐藏所有自定义页面" />
              <Switch
                checked={customPagesEnabled}
                onChange={() => dispatch(toggleCustomPages())}
                color="primary"
              />
            </ListItem>
          </List>
        </CardContent>
      </SettingsCard>

      <SettingsCard>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            自定义页面管理
          </Typography>

          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              创建新的自定义页面，用于组织和管理您的笔记、收藏夹和附件
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                placeholder="输入页面名称"
                value={newPageName}
                onChange={(e) => setNewPageName(e.target.value)}
                size="small"
                fullWidth
                onKeyPress={(e) => e.key === 'Enter' && handleCreatePage()}
              />
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleCreatePage}
                disabled={!newPageName.trim() || saving}
              >
                新建页面
              </Button>
            </Box>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => dispatch(clearError())}>
              {error}
            </Alert>
          )}

          {customPages.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 3, color: 'text.secondary' }}>
              <CollectionsBookmarkIcon sx={{ fontSize: 48, mb: 1 }} />
              <Typography variant="body2">暂无自定义页面，创建您的第一个页面开始组织内容</Typography>
            </Box>
          ) : (
            <List sx={{ p: 0 }}>
              {customPages.map((page) => {
                const visibility = customPagesVisibility || {};
                const isVisible = visibility[page._id] !== false;
                return (
                  <ListItem
                    key={page._id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      p: 1,
                      borderRadius: 1,
                      mb: 1,
                      border: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <ListItemIcon>
                      <CollectionsBookmarkIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary={page.name}
                      secondary={
                        <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                          <Chip label={`笔记: ${page.counts?.documents || 0}`} size="small" variant="outlined" />
                          <Chip label={`收藏夹: ${page.counts?.quotes || 0}`} size="small" variant="outlined" />
                          <Chip label={`附件: ${page.counts?.attachments || 0}`} size="small" variant="outlined" />
                        </Box>
                      }
                    />
                    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                      <Tooltip title="显示在侧栏">
                        <Switch
                          size="small"
                          checked={isVisible}
                          onChange={() => dispatch(toggleCustomPageVisibility(page._id))}
                          color="primary"
                        />
                      </Tooltip>
                      <Tooltip title="打开页面">
                        <IconButton size="small" onClick={() => navigate(`/自定义/${encodeURIComponent(page.name)}`)}>
                          <OpenInNewIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="重命名">
                        <IconButton size="small">
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="删除">
                        <IconButton size="small" color="error" onClick={() => openDeleteConfirm(page)}>
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </ListItem>
                );
              })}
            </List>
          )}
        </CardContent>
      </SettingsCard>

      <Dialog open={deleteConfirmOpen} onClose={closeDeleteConfirm}>
        <DialogTitle>确认删除自定义页面</DialogTitle>
        <DialogContent>
          {pageToDelete && (
            <Box>
              <Typography variant="body1" sx={{ mb: 2 }}>
                确定要删除自定义页面 "<strong>{pageToDelete.name}</strong>" 吗？
              </Typography>

              {(pageToDelete.counts?.documents > 0 ||
                pageToDelete.counts?.quotes > 0 ||
                pageToDelete.counts?.attachments > 0) && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  <Typography variant="body2" component="div">
                    此页面包含以下内容，删除后这些关联关系将被移除：
                    <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                      {pageToDelete.counts?.documents > 0 && <li>{pageToDelete.counts.documents} 个笔记</li>}
                      {pageToDelete.counts?.quotes > 0 && <li>{pageToDelete.counts.quotes} 个收藏夹</li>}
                      {pageToDelete.counts?.attachments > 0 && <li>{pageToDelete.counts.attachments} 个附件</li>}
                    </ul>
                    笔记、收藏夹和附件本身不会被删除，只是从此页面中移除。
                  </Typography>
                </Alert>
              )}

              <Typography variant="body2" color="text.secondary">
                此操作不可撤销。
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDeleteConfirm} disabled={saving}>
            取消
          </Button>
          <Button onClick={handleDeletePage} color="error" variant="contained" disabled={saving}>
            {saving ? '删除中...' : '确认删除'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default CustomPagesSettingsCard;

