import React, { useState, useEffect } from 'react';
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
  FormControlLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
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
  SmartToy as BotIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Person as PersonIcon,
  Cloud as CloudIcon,
  Key as KeyIcon,
  Language as LanguageIcon,
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
import aiService from '../services/ai';

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
  
  // AI角色相关状态
  const [roles, setRoles] = useState([]);
  const [models, setModels] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [rolesError, setRolesError] = useState(null);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [roleEditMode, setRoleEditMode] = useState(false); // true=编辑, false=新建
  const [currentRole, setCurrentRole] = useState({
    name: '',
    systemPrompt: '',
    defaultModel: '',
    defaultTemperature: 0.7,
    contextTokenLimit: 8192,
    maxOutputTokens: 4096,
    topP: 1.0,
    topK: 0,
    isDefault: false
  });
  const [deleteRoleConfirmOpen, setDeleteRoleConfirmOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState(null);
  
  // AI配置相关状态
  const [aiConfig, setAiConfig] = useState({
    enabled: false,
    current: null,
    providers: {}
  });
  const [aiConfigLoading, setAiConfigLoading] = useState(false);
  const [aiConfigError, setAiConfigError] = useState(null);
  const [providerDialogOpen, setProviderDialogOpen] = useState(false);
  const [providerEditMode, setProviderEditMode] = useState(false); // true=编辑, false=新建
  const [currentProvider, setCurrentProvider] = useState({
    key: '',
    AI_BASE_URL: '',
    AI_API_KEY: '',
    AI_ALLOWED_MODELS: []
  });
  const [deleteProviderConfirmOpen, setDeleteProviderConfirmOpen] = useState(false);
  const [providerToDelete, setProviderToDelete] = useState(null);
  
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

  // 加载AI角色列表
  const loadRoles = async () => {
    setRolesLoading(true);
    setRolesError(null);
    try {
      const response = await aiService.listRoles();
      if (response.success) {
        setRoles(response.data);
      }
    } catch (error) {
      console.error('加载AI角色失败:', error);
      setRolesError('加载AI角色失败');
    } finally {
      setRolesLoading(false);
    }
  };

  // 加载模型列表
  const loadModels = async () => {
    try {
      const response = await aiService.getModels();
      if (response.success) {
        setModels(response.data);
      }
    } catch (error) {
      console.error('加载AI模型列表失败:', error);
    }
  };

  // 组件挂载时加载角色和模型
  useEffect(() => {
    loadRoles();
    loadModels();
  }, []);

  // 打开新建角色对话框
  const openCreateRoleDialog = () => {
    setRoleEditMode(false);
    setCurrentRole({
      name: '',
      systemPrompt: '',
      defaultModel: models.length > 0 ? models[0].id : '',
      defaultTemperature: 0.7,
      contextTokenLimit: 8192,
      maxOutputTokens: 4096,
      topP: 1.0,
      topK: 0,
      isDefault: false
    });
    setRoleDialogOpen(true);
  };

  // 打开编辑角色对话框
  const openEditRoleDialog = (role) => {
    setRoleEditMode(true);
    setCurrentRole({ ...role });
    setRoleDialogOpen(true);
  };

  // 关闭角色对话框
  const closeRoleDialog = () => {
    setRoleDialogOpen(false);
    setCurrentRole({
      name: '',
      systemPrompt: '',
      defaultModel: '',
      defaultTemperature: 0.7,
      contextTokenLimit: 8192,
      maxOutputTokens: 4096,
      topP: 1.0,
      topK: 0,
      isDefault: false
    });
  };

  // 保存角色
  const handleSaveRole = async () => {
    if (!currentRole.name.trim() || !currentRole.systemPrompt.trim()) {
      setRolesError('角色名称和系统提示词不能为空');
      return;
    }

    if (currentRole.defaultTemperature < 0 || currentRole.defaultTemperature > 2) {
      setRolesError('温度值必须在0到2之间');
      return;
    }

    if (currentRole.contextTokenLimit < 1 || currentRole.contextTokenLimit > 2000000) {
      setRolesError('上下文Token上限必须在1到2000000之间');
      return;
    }

    if (currentRole.maxOutputTokens < 1 || currentRole.maxOutputTokens > 8192) {
      setRolesError('最大输出Token上限必须在1到8192之间');
      return;
    }

    if (currentRole.topP < 0 || currentRole.topP > 1) {
      setRolesError('Top P值必须在0到1之间');
      return;
    }

    if (currentRole.topK < 0 || currentRole.topK > 64) {
      setRolesError('Top K值必须在0到64之间');
      return;
    }

    try {
      let response;
      if (roleEditMode) {
        response = await aiService.updateRole(currentRole._id, {
          name: currentRole.name.trim(),
          systemPrompt: currentRole.systemPrompt.trim(),
          defaultModel: currentRole.defaultModel,
          defaultTemperature: currentRole.defaultTemperature,
          contextTokenLimit: currentRole.contextTokenLimit,
          maxOutputTokens: currentRole.maxOutputTokens,
          topP: currentRole.topP,
          topK: currentRole.topK,
          isDefault: currentRole.isDefault
        });
      } else {
        response = await aiService.createRole({
          name: currentRole.name.trim(),
          systemPrompt: currentRole.systemPrompt.trim(),
          defaultModel: currentRole.defaultModel,
          defaultTemperature: currentRole.defaultTemperature,
          contextTokenLimit: currentRole.contextTokenLimit,
          maxOutputTokens: currentRole.maxOutputTokens,
          topP: currentRole.topP,
          topK: currentRole.topK,
          isDefault: currentRole.isDefault
        });
      }

      if (response.success) {
        closeRoleDialog();
        loadRoles();
      } else {
        setRolesError(response.message || '保存失败');
      }
    } catch (error) {
      console.error('保存AI角色失败:', error);
      setRolesError(error.response?.data?.message || '保存失败');
    }
  };

  // 打开删除角色确认对话框
  const openDeleteRoleConfirm = (role) => {
    setRoleToDelete(role);
    setDeleteRoleConfirmOpen(true);
  };

  // 关闭删除角色确认对话框
  const closeDeleteRoleConfirm = () => {
    setDeleteRoleConfirmOpen(false);
    setRoleToDelete(null);
  };

  // 处理删除角色
  const handleDeleteRole = async () => {
    if (!roleToDelete) return;

    try {
      const response = await aiService.deleteRole(roleToDelete._id);
      if (response.success) {
        closeDeleteRoleConfirm();
        loadRoles();
      } else {
        setRolesError(response.message || '删除失败');
      }
    } catch (error) {
      console.error('删除AI角色失败:', error);
      setRolesError(error.response?.data?.message || '删除失败');
    }
  };

  // 设置默认角色
  const handleSetDefaultRole = async (roleId) => {
    try {
      const response = await aiService.setDefaultRole(roleId);
      if (response.success) {
        loadRoles();
      } else {
        setRolesError(response.message || '设置默认失败');
      }
    } catch (error) {
      console.error('设置默认AI角色失败:', error);
      setRolesError(error.response?.data?.message || '设置默认失败');
    }
  };

  // 加载AI配置
  const loadAIConfig = async () => {
    setAiConfigLoading(true);
    setAiConfigError(null);
    try {
      const response = await aiService.getConfig();
      if (response.success) {
        setAiConfig(response.data);
      }
    } catch (error) {
      console.error('加载AI配置失败:', error);
      setAiConfigError('加载AI配置失败');
    } finally {
      setAiConfigLoading(false);
    }
  };

  // 切换AI启用状态
  const handleToggleAI = async (enabled) => {
    try {
      const response = await aiService.toggleEnabled(enabled);
      if (response.success) {
        setAiConfig(response.data);
        // 如果启用了AI，也触发供应商切换事件以刷新模型列表
        if (enabled) {
          window.dispatchEvent(new CustomEvent('ai-provider-switched', {
            detail: { provider: aiConfig.current }
          }));
        }
      } else {
        setAiConfigError(response.message || '操作失败');
      }
    } catch (error) {
      console.error('切换AI状态失败:', error);
      setAiConfigError(error.response?.data?.message || '操作失败');
    }
  };

  // 切换当前供应商
  const handleSelectProvider = async (providerKey) => {
    try {
      const response = await aiService.selectProvider(providerKey);
      if (response.success) {
        setAiConfig(response.data);
        // 触发自定义事件，通知其他页面供应商已切换
        window.dispatchEvent(new CustomEvent('ai-provider-switched', {
          detail: { provider: providerKey }
        }));
      } else {
        setAiConfigError(response.message || '切换供应商失败');
      }
    } catch (error) {
      console.error('切换供应商失败:', error);
      setAiConfigError(error.response?.data?.message || '切换供应商失败');
    }
  };

  // 打开新建供应商对话框
  const openCreateProviderDialog = () => {
    setProviderEditMode(false);
    setCurrentProvider({
      key: '',
      AI_BASE_URL: '',
      AI_API_KEY: '',
      AI_ALLOWED_MODELS: []
    });
    setProviderDialogOpen(true);
  };

  // 打开编辑供应商对话框
  const openEditProviderDialog = (key) => {
    setProviderEditMode(true);
    const provider = aiConfig.providers[key];
    setCurrentProvider({
      key,
      AI_BASE_URL: provider.AI_BASE_URL,
      AI_API_KEY: provider.AI_API_KEY,
      AI_ALLOWED_MODELS: provider.AI_ALLOWED_MODELS ? [...provider.AI_ALLOWED_MODELS] : []
    });
    setProviderDialogOpen(true);
  };

  // 关闭供应商对话框
  const closeProviderDialog = () => {
    setProviderDialogOpen(false);
    setCurrentProvider({
      key: '',
      AI_BASE_URL: '',
      AI_API_KEY: '',
      AI_ALLOWED_MODELS: []
    });
  };

  // 保存供应商
  const handleSaveProvider = async () => {
    if (!currentProvider.key.trim() || !currentProvider.AI_BASE_URL.trim() || !currentProvider.AI_API_KEY.trim()) {
      setAiConfigError('供应商名称、API Base URL 和 API Key 不能为空');
      return;
    }

    try {
      let response;
      const providerData = {
        AI_BASE_URL: currentProvider.AI_BASE_URL.trim(),
        AI_API_KEY: currentProvider.AI_API_KEY.trim(),
        AI_ALLOWED_MODELS: currentProvider.AI_ALLOWED_MODELS
      };

      if (providerEditMode) {
        response = await aiService.updateProvider(currentProvider.key, providerData);
      } else {
        response = await aiService.upsertProvider(currentProvider.key, providerData);
      }

      if (response.success) {
        closeProviderDialog();
        loadAIConfig();
      } else {
        setAiConfigError(response.message || '保存失败');
      }
    } catch (error) {
      console.error('保存供应商失败:', error);
      setAiConfigError(error.response?.data?.message || '保存失败');
    }
  };

  // 打开删除供应商确认对话框
  const openDeleteProviderConfirm = (key) => {
    setProviderToDelete(key);
    setDeleteProviderConfirmOpen(true);
  };

  // 关闭删除供应商确认对话框
  const closeDeleteProviderConfirm = () => {
    setDeleteProviderConfirmOpen(false);
    setProviderToDelete(null);
  };

  // 处理删除供应商
  const handleDeleteProvider = async () => {
    if (!providerToDelete) return;

    try {
      const response = await aiService.deleteProvider(providerToDelete);
      if (response.success) {
        closeDeleteProviderConfirm();
        loadAIConfig();
      } else {
        setAiConfigError(response.message || '删除失败');
      }
    } catch (error) {
      console.error('删除供应商失败:', error);
      setAiConfigError(error.response?.data?.message || '删除失败');
    }
  };

  // 处理模型列表变化
  const handleModelsChange = (event) => {
    const { value } = event.target;
    // 将字符串分割为数组，过滤空字符串
    const models = value.split(',').map(model => model.trim()).filter(model => model);
    setCurrentProvider(prev => ({
      ...prev,
      AI_ALLOWED_MODELS: models
    }));
  };

  // 组件挂载时加载AI配置
  useEffect(() => {
    loadAIConfig();
  }, []);

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

      {/* AI设置 */}
      <SettingsCard>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            AI设置
          </Typography>
          
          {/* AI功能开关 */}
          <List sx={{ p: 0 }}>
            <ListItem>
              <ListItemIcon>
                <BotIcon />
              </ListItemIcon>
              <ListItemText
                primary="AI功能"
                secondary="启用或禁用AI聊天功能"
              />
              <Switch
                checked={aiConfig.enabled}
                onChange={(e) => handleToggleAI(e.target.checked)}
                color="primary"
                disabled={aiConfigLoading}
              />
            </ListItem>
            <Divider />
            
            {/* 当前供应商选择 */}
            <ListItem>
              <ListItemIcon>
                <CloudIcon />
              </ListItemIcon>
              <ListItemText
                primary="当前供应商"
                secondary={aiConfig.current ? `已选择: ${aiConfig.current}` : '未选择供应商'}
              />
              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel>供应商</InputLabel>
                <Select
                  value={aiConfig.current || ''}
                  label="供应商"
                  onChange={(e) => handleSelectProvider(e.target.value)}
                  disabled={!aiConfig.enabled || aiConfigLoading || Object.keys(aiConfig.providers).length === 0}
                  size="small"
                >
                  {Object.keys(aiConfig.providers).map((key) => (
                    <MenuItem key={key} value={key}>
                      {key}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </ListItem>
            <Divider />
            
            {/* 供应商管理 */}
            <ListItem>
              <ListItemIcon>
                <LanguageIcon />
              </ListItemIcon>
              <ListItemText
                primary="供应商管理"
                secondary={`已配置 ${Object.keys(aiConfig.providers).length} 个供应商`}
              />
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={openCreateProviderDialog}
                disabled={aiConfigLoading}
              >
                添加供应商
              </Button>
            </ListItem>
          </List>

          {/* 供应商列表 */}
          {Object.keys(aiConfig.providers).length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                已配置的供应商
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {Object.entries(aiConfig.providers).map(([key, provider]) => (
                  <Box
                    key={key}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      p: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      backgroundColor: aiConfig.current === key ? 'action.selected' : 'background.paper'
                    }}
                  >
                    <Box>
                      <Typography variant="subtitle2" fontWeight="bold">
                        {key}
                        {aiConfig.current === key && (
                          <Chip label="当前" size="small" sx={{ ml: 1 }} />
                        )}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {provider.AI_BASE_URL}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        模型数量: {provider.AI_ALLOWED_MODELS?.length || 0}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <IconButton
                        size="small"
                        onClick={() => openEditProviderDialog(key)}
                        title="编辑"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => openDeleteProviderConfirm(key)}
                        title="删除"
                        disabled={aiConfig.current === key}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          {/* AI配置错误提示 */}
          {aiConfigError && (
            <Alert severity="error" sx={{ mt: 2 }} onClose={() => setAiConfigError(null)}>
              {aiConfigError}
            </Alert>
          )}
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

      {/* AI角色管理 */}
      <SettingsCard>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            AI角色管理
          </Typography>
          
          {/* 新建角色 */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              创建和管理AI角色，每个角色包含系统提示词、默认模型和温度设置
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={openCreateRoleDialog}
              disabled={rolesLoading}
            >
              新建角色
            </Button>
          </Box>
          
          {/* 错误提示 */}
          {rolesError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setRolesError(null)}>
              {rolesError}
            </Alert>
          )}
          
          {/* 角色列表 */}
          {roles.length === 0 && !rolesLoading ? (
            <Box sx={{ textAlign: 'center', py: 3, color: 'text.secondary' }}>
              <PersonIcon sx={{ fontSize: 48, mb: 1 }} />
              <Typography variant="body2">
                暂无AI角色，创建您的第一个角色开始配置AI行为
              </Typography>
            </Box>
          ) : (
            <List sx={{ p: 0 }}>
              {roles.map((role) => (
                <ListItem
                  key={role._id}
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
                    <PersonIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {role.name}
                        {role.isDefault && (
                          <Chip
                            icon={<StarIcon sx={{ fontSize: 16 }} />}
                            label="默认"
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                        <Chip
                          label={`${role.systemPrompt.length} 字符`}
                          size="small"
                          variant="outlined"
                        />
                        {role.defaultModel && (
                          <Chip
                            label={`模型: ${role.defaultModel}`}
                            size="small"
                            variant="outlined"
                          />
                        )}
                        <Chip
                          label={`温度: ${role.defaultTemperature}`}
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                    }
                  />
                  <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                    {!role.isDefault && (
                      <Tooltip title="设为默认">
                        <IconButton
                          size="small"
                          onClick={() => handleSetDefaultRole(role._id)}
                          disabled={rolesLoading}
                        >
                          <StarBorderIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="编辑">
                      <IconButton
                        size="small"
                        onClick={() => openEditRoleDialog(role)}
                        disabled={rolesLoading}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="删除">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => openDeleteRoleConfirm(role)}
                        disabled={rolesLoading}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </ListItem>
              ))}
            </List>
          )}
          
          {/* 加载状态 */}
          {rolesLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <Typography variant="body2" color="text.secondary">
                加载中...
              </Typography>
            </Box>
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

      {/* 角色编辑对话框 */}
      <Dialog open={roleDialogOpen} onClose={closeRoleDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {roleEditMode ? '编辑AI角色' : '新建AI角色'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              label="角色名称"
              value={currentRole.name}
              onChange={(e) => setCurrentRole({ ...currentRole, name: e.target.value })}
              fullWidth
              margin="normal"
              variant="outlined"
              placeholder="例如：专业助手"
            />
            <TextField
              label="系统提示词"
              value={currentRole.systemPrompt}
              onChange={(e) => setCurrentRole({ ...currentRole, systemPrompt: e.target.value })}
              fullWidth
              margin="normal"
              variant="outlined"
              multiline
              rows={6}
              placeholder="输入系统提示词内容，定义AI助手的角色和行为..."
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>默认模型</InputLabel>
              <Select
                value={currentRole.defaultModel}
                label="默认模型"
                onChange={(e) => setCurrentRole({ ...currentRole, defaultModel: e.target.value })}
              >
                {models.map((model) => (
                  <MenuItem key={model.id} value={model.id}>
                    {model.id}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Box sx={{ mt: 2, mb: 1 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                默认温度: {currentRole.defaultTemperature.toFixed(1)}
              </Typography>
              <Slider
                value={currentRole.defaultTemperature}
                onChange={(e, newValue) => setCurrentRole({ ...currentRole, defaultTemperature: newValue })}
                min={0}
                max={2}
                step={0.1}
                marks={[
                  { value: 0, label: '0' },
                  { value: 0.7, label: '0.7' },
                  { value: 1.5, label: '1.5' },
                  { value: 2, label: '2' }
                ]}
                valueLabelDisplay="auto"
              />
            </Box>
            
            {/* 新增的高级参数字段 */}
            <Box sx={{ mt: 2, mb: 1 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                上下文Token上限: {currentRole.contextTokenLimit}
              </Typography>
              <Slider
                value={currentRole.contextTokenLimit}
                onChange={(e, newValue) => setCurrentRole({ ...currentRole, contextTokenLimit: newValue })}
                min={1024}
                max={2000000}
                step={1024}
                marks={[
                  { value: 1024, label: '1K' },
                  { value: 16384, label: '16K' },
                  { value: 65536, label: '64K' },
                  { value: 262144, label: '256K' },
                  { value: 1048576, label: '1M' },
                  { value: 2000000, label: '2M' }
                ]}
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => {
                  if (value >= 1000000) {
                    return `${(value / 1000000).toFixed(1)}M`;
                  }
                  return `${Math.round(value / 1024)}K`;
                }}
              />
            </Box>
            
            <Box sx={{ mt: 2, mb: 1 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                最大输出Token上限: {currentRole.maxOutputTokens}
              </Typography>
              <Slider
                value={currentRole.maxOutputTokens}
                onChange={(e, newValue) => setCurrentRole({ ...currentRole, maxOutputTokens: newValue })}
                min={256}
                max={8192}
                step={256}
                marks={[
                  { value: 256, label: '256' },
                  { value: 1024, label: '1K' },
                  { value: 2048, label: '2K' },
                  { value: 4096, label: '4K' },
                  { value: 8192, label: '8K' }
                ]}
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => `${Math.round(value / 1024)}K`}
              />
            </Box>
            
            <Box sx={{ mt: 2, mb: 1 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Top P: {currentRole.topP.toFixed(2)}
              </Typography>
              <Slider
                value={currentRole.topP}
                onChange={(e, newValue) => setCurrentRole({ ...currentRole, topP: newValue })}
                min={0}
                max={1}
                step={0.05}
                marks={[
                  { value: 0, label: '0' },
                  { value: 0.5, label: '0.5' },
                  { value: 0.8, label: '0.8' },
                  { value: 0.9, label: '0.9' },
                  { value: 1, label: '1' }
                ]}
                valueLabelDisplay="auto"
              />
            </Box>
            
            <Box sx={{ mt: 2, mb: 1 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Top K: {currentRole.topK}
              </Typography>
              <Slider
                value={currentRole.topK}
                onChange={(e, newValue) => setCurrentRole({ ...currentRole, topK: newValue })}
                min={0}
                max={64}
                step={1}
                marks={[
                  { value: 0, label: '0' },
                  { value: 10, label: '10' },
                  { value: 20, label: '20' },
                  { value: 40, label: '40' },
                  { value: 64, label: '64' }
                ]}
                valueLabelDisplay="auto"
              />
            </Box>
            
            <FormControlLabel
              control={
                <Switch
                  checked={currentRole.isDefault}
                  onChange={(e) => setCurrentRole({ ...currentRole, isDefault: e.target.checked })}
                />
              }
              label="设为默认角色"
              sx={{ mt: 1 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeRoleDialog} disabled={rolesLoading}>
            取消
          </Button>
          <Button
            onClick={handleSaveRole}
            variant="contained"
            disabled={rolesLoading || !currentRole.name.trim() || !currentRole.systemPrompt.trim()}
          >
            {rolesLoading ? '保存中...' : '保存'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 删除角色确认对话框 */}
      <Dialog open={deleteRoleConfirmOpen} onClose={closeDeleteRoleConfirm}>
        <DialogTitle>确认删除AI角色</DialogTitle>
        <DialogContent>
          {roleToDelete && (
            <Box>
              <Typography variant="body1" sx={{ mb: 2 }}>
                确定要删除AI角色 "<strong>{roleToDelete.name}</strong>" 吗？
              </Typography>
              
              {roleToDelete.isDefault && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    这是默认角色，删除后系统将自动选择其他角色作为默认。
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
          <Button onClick={closeDeleteRoleConfirm} disabled={rolesLoading}>
            取消
          </Button>
          <Button
            onClick={handleDeleteRole}
            color="error"
            variant="contained"
            disabled={rolesLoading}
          >
            {rolesLoading ? '删除中...' : '确认删除'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 供应商编辑对话框 */}
      <Dialog open={providerDialogOpen} onClose={closeProviderDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {providerEditMode ? '编辑供应商' : '新建供应商'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              label="供应商名称"
              value={currentProvider.key}
              onChange={(e) => setCurrentProvider({ ...currentProvider, key: e.target.value })}
              fullWidth
              margin="normal"
              variant="outlined"
              placeholder="例如：OpenAI"
              disabled={providerEditMode}
            />
            <TextField
              label="API Base URL"
              value={currentProvider.AI_BASE_URL}
              onChange={(e) => setCurrentProvider({ ...currentProvider, AI_BASE_URL: e.target.value })}
              fullWidth
              margin="normal"
              variant="outlined"
              placeholder="https://api.openai.com/v1"
            />
            <TextField
              label="API Key"
              value={currentProvider.AI_API_KEY}
              onChange={(e) => setCurrentProvider({ ...currentProvider, AI_API_KEY: e.target.value })}
              fullWidth
              margin="normal"
              variant="outlined"
              type="password"
              placeholder="sk-..."
            />
            <TextField
              label="允许的模型列表"
              value={currentProvider.AI_ALLOWED_MODELS.join(', ')}
              onChange={handleModelsChange}
              fullWidth
              margin="normal"
              variant="outlined"
              multiline
              rows={2}
              placeholder="gpt-4o-mini, gpt-4o, gpt-3.5-turbo"
              helperText="用逗号分隔多个模型名称，留空则允许使用所有可用模型"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeProviderDialog} disabled={aiConfigLoading}>
            取消
          </Button>
          <Button
            onClick={handleSaveProvider}
            variant="contained"
            disabled={aiConfigLoading || !currentProvider.key.trim() || !currentProvider.AI_BASE_URL.trim() || !currentProvider.AI_API_KEY.trim()}
          >
            {aiConfigLoading ? '保存中...' : '保存'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 删除供应商确认对话框 */}
      <Dialog open={deleteProviderConfirmOpen} onClose={closeDeleteProviderConfirm}>
        <DialogTitle>确认删除供应商</DialogTitle>
        <DialogContent>
          {providerToDelete && (
            <Box>
              <Typography variant="body1" sx={{ mb: 2 }}>
                确定要删除供应商 "<strong>{providerToDelete}</strong>" 吗？
              </Typography>
              
              {aiConfig.current === providerToDelete && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    这是当前使用的供应商，删除后需要重新选择其他供应商。
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
          <Button onClick={closeDeleteProviderConfirm} disabled={aiConfigLoading}>
            取消
          </Button>
          <Button
            onClick={handleDeleteProvider}
            color="error"
            variant="contained"
            disabled={aiConfigLoading}
          >
            {aiConfigLoading ? '删除中...' : '确认删除'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Settings;