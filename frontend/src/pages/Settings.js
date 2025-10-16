import React, { useState } from 'react';
import {
  Container,
  Typography,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Switch,
  Divider,
  TextField,
  Button,
  Box,
  Chip,
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  Storage as StorageIcon,
  Info as InfoIcon,
  CollectionsBookmark as CollectionsBookmarkIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  OpenInNew as OpenInNewIcon,
  VideoLibrary as VideoIcon,
  BugReport as BugReportIcon,
} from '@mui/icons-material';
import { useThemeContext } from '../contexts/ThemeContext';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  selectAllPages,
  selectSaving,
  selectError,
  createPage,
  deletePage,
  clearError
} from '../store/customPagesSlice';
import {
  selectVideoTestEnabled,
  selectInteractiveTestEnabled,
  selectCustomPagesEnabled,
  selectCustomPagesVisibility,
  toggleVideoTest,
  toggleInteractiveTest,
  toggleCustomPages,
  toggleCustomPageVisibility,
} from '../store/settingsSlice';

// 样式化的页面标题
const PageTitle = styled(Typography)(({ theme }) => ({
  marginBottom: theme.spacing(4),
  fontWeight: 'bold',
  color: theme.palette.primary.main,
  textAlign: 'center',
}));

// 样式化的设置卡片
const SettingsCard = styled(Card)(({ theme }) => ({
  marginBottom: theme.spacing(3),
  borderRadius: 20,
}));

const Settings = () => {
  const { mode, toggleColorMode } = useThemeContext();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  // Redux状态
  const customPages = useSelector(selectAllPages);
  const saving = useSelector(selectSaving);
  const error = useSelector(selectError);
  const videoTestEnabled = useSelector(selectVideoTestEnabled);
  const interactiveTestEnabled = useSelector(selectInteractiveTestEnabled);
  const customPagesEnabled = useSelector(selectCustomPagesEnabled);
  const customPagesVisibility = useSelector(selectCustomPagesVisibility);
  
  // 本地状态
  const [newPageName, setNewPageName] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [pageToDelete, setPageToDelete] = useState(null);
  
  // 处理创建页面
  const handleCreatePage = () => {
    if (newPageName.trim()) {
      dispatch(createPage({ name: newPageName.trim() })).then((action) => {
        if (!action.error) {
          setNewPageName('');
          // 创建成功后可以选择跳转到新页面
          const createdPage = action.payload.data;
          if (window.confirm(`页面 "${createdPage.name}" 创建成功！是否立即打开页面？`)) {
            navigate(`/自定义/${encodeURIComponent(createdPage.name)}`);
          }
        }
      });
    }
  };
  
  // 打开删除确认对话框
  const openDeleteConfirm = (page) => {
    setPageToDelete(page);
    setDeleteConfirmOpen(true);
  };
  
  // 关闭删除确认对话框
  const closeDeleteConfirm = () => {
    setDeleteConfirmOpen(false);
    setPageToDelete(null);
  };
  
  // 处理删除页面
  const handleDeletePage = () => {
    if (pageToDelete) {
      dispatch(deletePage(pageToDelete._id)).then((action) => {
        if (!action.error) {
          closeDeleteConfirm();
        }
      });
    }
  };

  return (
    <Container maxWidth="md">
      <PageTitle variant="h3" component="h1">
        系统设置
      </PageTitle>
      
      {/* 功能开关 */}
      <SettingsCard>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            功能开关
          </Typography>
          <List sx={{ p: 0 }}>
            <ListItem>
              <ListItemIcon>
                <VideoIcon />
              </ListItemIcon>
              <ListItemText
                primary="视频测试"
                secondary="在侧边栏显示或隐藏视频测试功能"
              />
              <Switch
                checked={videoTestEnabled}
                onChange={() => dispatch(toggleVideoTest())}
                color="primary"
              />
            </ListItem>
            <Divider />
            <ListItem>
              <ListItemIcon>
                <BugReportIcon />
              </ListItemIcon>
              <ListItemText
                primary="交互测试"
                secondary="在侧边栏显示或隐藏交互测试功能"
              />
              <Switch
                checked={interactiveTestEnabled}
                onChange={() => dispatch(toggleInteractiveTest())}
                color="primary"
              />
            </ListItem>
            <Divider />
            <ListItem>
              <ListItemIcon>
                <CollectionsBookmarkIcon />
              </ListItemIcon>
              <ListItemText
                primary="自定义页面"
                secondary="在侧边栏显示或隐藏所有自定义页面"
              />
              <Switch
                checked={customPagesEnabled}
                onChange={() => dispatch(toggleCustomPages())}
                color="primary"
              />
            </ListItem>
          </List>
        </CardContent>
      </SettingsCard>

      {/* 外观设置 */}
      <SettingsCard>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            外观设置
          </Typography>
          <List sx={{ p: 0 }}>
            <ListItem>
              <ListItemIcon>
                {mode === 'dark' ? <DarkModeIcon /> : <LightModeIcon />}
              </ListItemIcon>
              <ListItemText
                primary="深色模式"
                secondary="切换应用的主题颜色模式"
              />
              <Switch
                checked={mode === 'dark'}
                onChange={toggleColorMode}
                color="primary"
              />
            </ListItem>
          </List>
        </CardContent>
      </SettingsCard>

      {/* 数据管理 */}
      <SettingsCard>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            数据管理
          </Typography>
          <List sx={{ p: 0 }}>
            <ListItem>
              <ListItemIcon>
                <StorageIcon />
              </ListItemIcon>
              <ListItemText
                primary="数据存储"
                secondary="您的笔记数据存储在本地MongoDB数据库中"
              />
            </ListItem>
          </List>
        </CardContent>
      </SettingsCard>

      {/* 自定义页面管理 */}
      <SettingsCard>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            自定义页面管理
          </Typography>
          
          {/* 新建页面 */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              创建新的自定义页面，用于组织和管理您的笔记、引用体和附件
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
          
          {/* 错误提示 */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => dispatch(clearError())}>
              {error}
            </Alert>
          )}
          
          {/* 页面列表 */}
          {customPages.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 3, color: 'text.secondary' }}>
              <CollectionsBookmarkIcon sx={{ fontSize: 48, mb: 1 }} />
              <Typography variant="body2">
                暂无自定义页面，创建您的第一个页面开始组织内容
              </Typography>
            </Box>
          ) : (
            <List sx={{ p: 0 }}>
              {customPages.map((page) => {
                const visibility = customPagesVisibility || {}; // 防御性编程，防止 undefined
                const isVisible = visibility[page._id] !== false; // 默认为 true
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
                        <Chip
                          label={`笔记: ${page.counts?.documents || 0}`}
                          size="small"
                          variant="outlined"
                        />
                        <Chip
                          label={`引用体: ${page.counts?.quotes || 0}`}
                          size="small"
                          variant="outlined"
                        />
                        <Chip
                          label={`附件: ${page.counts?.attachments || 0}`}
                          size="small"
                          variant="outlined"
                        />
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
                      <IconButton
                        size="small"
                        onClick={() => navigate(`/自定义/${encodeURIComponent(page.name)}`)}
                      >
                        <OpenInNewIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="重命名">
                      <IconButton size="small">
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="删除">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => openDeleteConfirm(page)}
                      >
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

      {/* 关于应用 */}
      <SettingsCard>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            关于应用
          </Typography>
          <List sx={{ p: 0 }}>
            <ListItem>
              <ListItemIcon>
                <InfoIcon />
              </ListItemIcon>
              <ListItemText
                primary="学习笔记管理系统"
                secondary="版本：v0.1.0"
              />
            </ListItem>
            <Divider />
            <ListItem>
              <ListItemText
                primary="技术栈"
                secondary="前端：React 19.2.0 + Material-UI 7.3.3 + Redux Toolkit 9.2.0 | 后端：Express.js 5.1.0 + MongoDB + Mongoose 8.18.3"
              />
            </ListItem>
            <Divider />
            <ListItem>
              <ListItemText
                primary="功能特性"
                secondary="• 笔记的创建、编辑、删除和查看\n• 标签管理和分类\n• 全文搜索功能\n• 深色/浅色主题切换\n• 响应式设计"
              />
            </ListItem>
          </List>
        </CardContent>
      </SettingsCard>

      {/* 开发者信息 */}
      <SettingsCard>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            开发者信息
          </Typography>
          <Typography variant="body2" color="text.secondary">
            这是一个全栈学习笔记管理系统，采用前后端分离架构，主要用于展示和管理学习笔记数据。
            系统提供直观的卡片式界面，支持笔记的增删改查、标签管理、搜索等功能。
          </Typography>
        </CardContent>
      </SettingsCard>
      
      {/* 删除确认对话框 */}
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
                      {pageToDelete.counts?.documents > 0 && (
                        <li>{pageToDelete.counts.documents} 个笔记</li>
                      )}
                      {pageToDelete.counts?.quotes > 0 && (
                        <li>{pageToDelete.counts.quotes} 个引用体</li>
                      )}
                      {pageToDelete.counts?.attachments > 0 && (
                        <li>{pageToDelete.counts.attachments} 个附件</li>
                      )}
                    </ul>
                    笔记、引用体和附件本身不会被删除，只是从此页面中移除。
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
          <Button
            onClick={handleDeletePage}
            color="error"
            variant="contained"
            disabled={saving}
          >
            {saving ? '删除中...' : '确认删除'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Settings;