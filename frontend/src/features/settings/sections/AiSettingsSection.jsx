import React, { useEffect, useMemo, useState } from 'react';
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
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Select,
  Slider,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  Cloud as CloudIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Language as LanguageIcon,
  Person as PersonIcon,
  SmartToy as BotIcon,
} from '@mui/icons-material';
import aiService from '../../../services/ai';
import { SettingsCard } from '../components/SettingsShell';

const defaultRole = {
  name: '',
  systemPrompt: '',
  defaultModel: '',
  defaultTemperature: 0.7,
  contextTokenLimit: 8192,
  maxOutputTokens: 4096,
  topP: 1.0,
  topK: 0,
};

const defaultProvider = {
  key: '',
  AI_BASE_URL: '',
  AI_API_KEY: '',
  AI_ALLOWED_MODELS: [],
};

const AiSettingsSection = () => {
  const [roles, setRoles] = useState([]);
  const [models, setModels] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [rolesError, setRolesError] = useState(null);

  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [roleEditMode, setRoleEditMode] = useState(false);
  const [currentRole, setCurrentRole] = useState(defaultRole);
  const [deleteRoleConfirmOpen, setDeleteRoleConfirmOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState(null);

  const [aiConfig, setAiConfig] = useState({ enabled: false, current: null, providers: {} });
  const [aiConfigLoading, setAiConfigLoading] = useState(false);
  const [aiConfigError, setAiConfigError] = useState(null);

  const [providerDialogOpen, setProviderDialogOpen] = useState(false);
  const [providerEditMode, setProviderEditMode] = useState(false);
  const [currentProvider, setCurrentProvider] = useState(defaultProvider);
  const [deleteProviderConfirmOpen, setDeleteProviderConfirmOpen] = useState(false);
  const [providerToDelete, setProviderToDelete] = useState(null);

  const providerKeys = useMemo(() => Object.keys(aiConfig.providers || {}), [aiConfig.providers]);

  const loadRoles = async () => {
    setRolesLoading(true);
    setRolesError(null);
    try {
      const response = await aiService.listRoles();
      if (response.success) setRoles(response.data || []);
    } catch (error) {
      console.error('加载AI角色失败:', error);
      setRolesError('加载AI角色失败');
    } finally {
      setRolesLoading(false);
    }
  };

  const loadModels = async () => {
    try {
      const response = await aiService.getModels();
      if (response.success) setModels(response.data || []);
    } catch (error) {
      console.error('加载AI模型列表失败:', error);
    }
  };

  const loadAIConfig = async () => {
    setAiConfigLoading(true);
    setAiConfigError(null);
    try {
      const response = await aiService.getConfig();
      if (response.success) {
        setAiConfig(response.data || { enabled: false, current: null, providers: {} });

        if (response.data?.enabled && response.data?.current) {
          window.dispatchEvent(
            new CustomEvent('ai-provider-switched', { detail: { provider: response.data.current } })
          );
        }
      }
    } catch (error) {
      console.error('加载AI配置失败:', error);
      setAiConfigError('加载AI配置失败');
    } finally {
      setAiConfigLoading(false);
    }
  };

  useEffect(() => {
    loadRoles();
    loadModels();
    loadAIConfig();
  }, []);

  const handleToggleAI = async (enabled) => {
    setAiConfigLoading(true);
    setAiConfigError(null);
    try {
      const response = await aiService.toggleEnabled(enabled);
      if (response.success) {
        await loadAIConfig();
      } else {
        setAiConfigError(response.message || '切换失败');
      }
    } catch (error) {
      console.error('切换AI启用状态失败:', error);
      setAiConfigError(error.response?.data?.message || '切换失败');
    } finally {
      setAiConfigLoading(false);
    }
  };

  const handleSelectProvider = async (providerKey) => {
    if (!providerKey) return;
    setAiConfigLoading(true);
    setAiConfigError(null);
    try {
      const response = await aiService.selectProvider(providerKey);
      if (response.success) {
        window.dispatchEvent(new CustomEvent('ai-provider-switched', { detail: { provider: providerKey } }));
        await loadAIConfig();
      } else {
        setAiConfigError(response.message || '切换失败');
      }
    } catch (error) {
      console.error('选择供应商失败:', error);
      setAiConfigError(error.response?.data?.message || '切换失败');
    } finally {
      setAiConfigLoading(false);
    }
  };

  const openCreateProviderDialog = () => {
    setProviderEditMode(false);
    setCurrentProvider(defaultProvider);
    setProviderDialogOpen(true);
  };

  const openEditProviderDialog = (key) => {
    setProviderEditMode(true);
    const provider = aiConfig.providers?.[key];
    if (!provider) return;
    setCurrentProvider({
      key,
      AI_BASE_URL: provider.AI_BASE_URL,
      AI_API_KEY: provider.AI_API_KEY,
      AI_ALLOWED_MODELS: provider.AI_ALLOWED_MODELS ? [...provider.AI_ALLOWED_MODELS] : [],
    });
    setProviderDialogOpen(true);
  };

  const closeProviderDialog = () => {
    setProviderDialogOpen(false);
    setCurrentProvider(defaultProvider);
  };

  const handleModelsChange = (event) => {
    const { value } = event.target;
    const next = value
      .split(',')
      .map((m) => m.trim())
      .filter(Boolean);
    setCurrentProvider((prev) => ({ ...prev, AI_ALLOWED_MODELS: next }));
  };

  const handleSaveProvider = async () => {
    if (
      !currentProvider.key.trim() ||
      !currentProvider.AI_BASE_URL.trim() ||
      !currentProvider.AI_API_KEY.trim()
    ) {
      setAiConfigError('供应商名称、API Base URL 和 API Key 不能为空');
      return;
    }

    setAiConfigLoading(true);
    setAiConfigError(null);
    try {
      const providerData = {
        AI_BASE_URL: currentProvider.AI_BASE_URL.trim(),
        AI_API_KEY: currentProvider.AI_API_KEY.trim(),
        AI_ALLOWED_MODELS: currentProvider.AI_ALLOWED_MODELS,
      };

      const response = providerEditMode
        ? await aiService.updateProvider(currentProvider.key, providerData)
        : await aiService.upsertProvider(currentProvider.key, providerData);

      if (response.success) {
        closeProviderDialog();
        await loadAIConfig();
      } else {
        setAiConfigError(response.message || '保存失败');
      }
    } catch (error) {
      console.error('保存供应商失败:', error);
      setAiConfigError(error.response?.data?.message || '保存失败');
    } finally {
      setAiConfigLoading(false);
    }
  };

  const openDeleteProviderConfirm = (key) => {
    setProviderToDelete(key);
    setDeleteProviderConfirmOpen(true);
  };

  const closeDeleteProviderConfirm = () => {
    setDeleteProviderConfirmOpen(false);
    setProviderToDelete(null);
  };

  const handleDeleteProvider = async () => {
    if (!providerToDelete) return;
    setAiConfigLoading(true);
    setAiConfigError(null);
    try {
      const response = await aiService.deleteProvider(providerToDelete);
      if (response.success) {
        closeDeleteProviderConfirm();
        await loadAIConfig();
      } else {
        setAiConfigError(response.message || '删除失败');
      }
    } catch (error) {
      console.error('删除供应商失败:', error);
      setAiConfigError(error.response?.data?.message || '删除失败');
    } finally {
      setAiConfigLoading(false);
    }
  };

  const openCreateRoleDialog = () => {
    setRoleEditMode(false);
    setCurrentRole(defaultRole);
    setRoleDialogOpen(true);
  };

  const openEditRoleDialog = (role) => {
    setRoleEditMode(true);
    setCurrentRole({
      name: role.name || '',
      systemPrompt: role.systemPrompt || '',
      defaultModel: role.defaultModel || '',
      defaultTemperature: role.defaultTemperature ?? 0.7,
      contextTokenLimit: role.contextTokenLimit ?? 8192,
      maxOutputTokens: role.maxOutputTokens ?? 4096,
      topP: role.topP ?? 1.0,
      topK: role.topK ?? 0,
      _id: role._id,
    });
    setRoleDialogOpen(true);
  };

  const closeRoleDialog = () => {
    setRoleDialogOpen(false);
    setCurrentRole(defaultRole);
  };

  const handleSaveRole = async () => {
    if (!currentRole.name.trim() || !currentRole.systemPrompt.trim()) {
      setRolesError('角色名称和系统提示词不能为空');
      return;
    }

    setRolesLoading(true);
    setRolesError(null);
    try {
      const payload = {
        name: currentRole.name.trim(),
        systemPrompt: currentRole.systemPrompt,
        defaultModel: currentRole.defaultModel || '',
        defaultTemperature: currentRole.defaultTemperature,
        contextTokenLimit: currentRole.contextTokenLimit,
        maxOutputTokens: currentRole.maxOutputTokens,
        topP: currentRole.topP,
        topK: currentRole.topK,
      };

      const response = roleEditMode
        ? await aiService.updateRole(currentRole._id, payload)
        : await aiService.createRole(payload);

      if (response.success) {
        closeRoleDialog();
        await loadRoles();
      } else {
        setRolesError(response.message || '保存失败');
      }
    } catch (error) {
      console.error('保存AI角色失败:', error);
      setRolesError(error.response?.data?.message || '保存失败');
    } finally {
      setRolesLoading(false);
    }
  };

  const openDeleteRoleConfirm = (role) => {
    setRoleToDelete(role);
    setDeleteRoleConfirmOpen(true);
  };

  const closeDeleteRoleConfirm = () => {
    setDeleteRoleConfirmOpen(false);
    setRoleToDelete(null);
  };

  const handleDeleteRole = async () => {
    if (!roleToDelete?._id) return;
    setRolesLoading(true);
    setRolesError(null);
    try {
      const response = await aiService.deleteRole(roleToDelete._id);
      if (response.success) {
        closeDeleteRoleConfirm();
        await loadRoles();
      } else {
        setRolesError(response.message || '删除失败');
      }
    } catch (error) {
      console.error('删除AI角色失败:', error);
      setRolesError(error.response?.data?.message || '删除失败');
    } finally {
      setRolesLoading(false);
    }
  };

  return (
    <>
      <SettingsCard>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            AI设置
          </Typography>

          <List sx={{ p: 0 }}>
            <ListItem>
              <ListItemIcon>
                <BotIcon />
              </ListItemIcon>
              <ListItemText primary="AI功能" secondary="启用或禁用AI聊天功能" />
              <Switch
                checked={aiConfig.enabled}
                onChange={(e) => handleToggleAI(e.target.checked)}
                color="primary"
                disabled={aiConfigLoading}
              />
            </ListItem>
            <Divider />

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
                  disabled={!aiConfig.enabled || aiConfigLoading || providerKeys.length === 0}
                  size="small"
                >
                  {providerKeys.map((key) => (
                    <MenuItem key={key} value={key}>
                      {key}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </ListItem>
            <Divider />

            <ListItem>
              <ListItemIcon>
                <LanguageIcon />
              </ListItemIcon>
              <ListItemText primary="供应商管理" secondary={`已配置 ${providerKeys.length} 个供应商`} />
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

          {providerKeys.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                已配置的供应商
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {providerKeys.map((key) => {
                  const provider = aiConfig.providers[key];
                  return (
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
                        backgroundColor: aiConfig.current === key ? 'action.selected' : 'background.paper',
                      }}
                    >
                      <Box>
                        <Typography variant="subtitle2" fontWeight="bold">
                          {key}
                          {aiConfig.current === key && <Chip label="当前" size="small" sx={{ ml: 1 }} />}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {provider.AI_BASE_URL}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          模型数量: {provider.AI_ALLOWED_MODELS?.length || 0}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <IconButton size="small" onClick={() => openEditProviderDialog(key)} title="编辑">
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
                  );
                })}
              </Box>
            </Box>
          )}

          {aiConfigError && (
            <Alert severity="error" sx={{ mt: 2 }} onClose={() => setAiConfigError(null)}>
              {aiConfigError}
            </Alert>
          )}
        </CardContent>
      </SettingsCard>

      <SettingsCard>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            AI角色管理
          </Typography>

          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              创建和管理AI角色，每个角色包含系统提示词、默认模型和温度设置
            </Typography>
            <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateRoleDialog} disabled={rolesLoading}>
              新建角色
            </Button>
          </Box>

          {rolesError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setRolesError(null)}>
              {rolesError}
            </Alert>
          )}

          {roles.length === 0 && !rolesLoading ? (
            <Box sx={{ textAlign: 'center', py: 3, color: 'text.secondary' }}>
              <PersonIcon sx={{ fontSize: 48, mb: 1 }} />
              <Typography variant="body2">暂无AI角色，创建您的第一个角色开始配置AI行为</Typography>
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
                    primary={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>{role.name}</Box>}
                    secondary={
                      <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                        <Chip label={`${(role.systemPrompt || '').length} 字符`} size="small" variant="outlined" />
                        {role.defaultModel && (
                          <Chip label={`模型: ${role.defaultModel}`} size="small" variant="outlined" />
                        )}
                        <Chip label={`温度: ${role.defaultTemperature}`} size="small" variant="outlined" />
                      </Box>
                    }
                  />
                  <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                    <Tooltip title="编辑">
                      <IconButton size="small" onClick={() => openEditRoleDialog(role)} disabled={rolesLoading}>
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
        </CardContent>
      </SettingsCard>

      <Dialog open={roleDialogOpen} onClose={closeRoleDialog} maxWidth="md" fullWidth>
        <DialogTitle>{roleEditMode ? '编辑AI角色' : '新建AI角色'}</DialogTitle>
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
                默认温度: {Number(currentRole.defaultTemperature).toFixed(1)}
              </Typography>
              <Slider
                value={currentRole.defaultTemperature}
                onChange={(_, newValue) => setCurrentRole({ ...currentRole, defaultTemperature: newValue })}
                min={0}
                max={2}
                step={0.1}
                marks={[
                  { value: 0, label: '0' },
                  { value: 0.7, label: '0.7' },
                  { value: 1.5, label: '1.5' },
                  { value: 2, label: '2' },
                ]}
                valueLabelDisplay="auto"
              />
            </Box>

            <TextField
              label="上下文Token上限"
              type="number"
              value={currentRole.contextTokenLimit}
              onChange={(e) =>
                setCurrentRole({ ...currentRole, contextTokenLimit: parseInt(e.target.value || '0', 10) })
              }
              fullWidth
              margin="normal"
            />
            <TextField
              label="最大输出Token上限"
              type="number"
              value={currentRole.maxOutputTokens}
              onChange={(e) =>
                setCurrentRole({ ...currentRole, maxOutputTokens: parseInt(e.target.value || '0', 10) })
              }
              fullWidth
              margin="normal"
            />
            <TextField
              label="Top P"
              type="number"
              value={currentRole.topP}
              onChange={(e) => setCurrentRole({ ...currentRole, topP: parseFloat(e.target.value || '0') })}
              fullWidth
              margin="normal"
            />
            <TextField
              label="Top K"
              type="number"
              value={currentRole.topK}
              onChange={(e) => setCurrentRole({ ...currentRole, topK: parseInt(e.target.value || '0', 10) })}
              fullWidth
              margin="normal"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeRoleDialog} disabled={rolesLoading}>
            取消
          </Button>
          <Button onClick={handleSaveRole} variant="contained" disabled={rolesLoading}>
            保存
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteRoleConfirmOpen} onClose={closeDeleteRoleConfirm}>
        <DialogTitle>确认删除AI角色</DialogTitle>
        <DialogContent>
          {roleToDelete && (
            <Typography variant="body1">
              确定要删除AI角色 "<strong>{roleToDelete.name}</strong>" 吗？此操作不可撤销。
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDeleteRoleConfirm} disabled={rolesLoading}>
            取消
          </Button>
          <Button onClick={handleDeleteRole} color="error" variant="contained" disabled={rolesLoading}>
            删除
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={providerDialogOpen} onClose={closeProviderDialog} maxWidth="md" fullWidth>
        <DialogTitle>{providerEditMode ? '编辑供应商' : '添加供应商'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              label="供应商名称（Key）"
              value={currentProvider.key}
              onChange={(e) => setCurrentProvider({ ...currentProvider, key: e.target.value })}
              fullWidth
              margin="normal"
              disabled={providerEditMode}
            />
            <TextField
              label="API Base URL"
              value={currentProvider.AI_BASE_URL}
              onChange={(e) => setCurrentProvider({ ...currentProvider, AI_BASE_URL: e.target.value })}
              fullWidth
              margin="normal"
              placeholder="例如：https://api.openai.com/v1"
            />
            <TextField
              label="API Key"
              value={currentProvider.AI_API_KEY}
              onChange={(e) => setCurrentProvider({ ...currentProvider, AI_API_KEY: e.target.value })}
              fullWidth
              margin="normal"
              placeholder="sk-..."
            />
            <TextField
              label="允许模型列表（逗号分隔，可选）"
              value={(currentProvider.AI_ALLOWED_MODELS || []).join(', ')}
              onChange={handleModelsChange}
              fullWidth
              margin="normal"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeProviderDialog} disabled={aiConfigLoading}>
            取消
          </Button>
          <Button onClick={handleSaveProvider} variant="contained" disabled={aiConfigLoading}>
            保存
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteProviderConfirmOpen} onClose={closeDeleteProviderConfirm}>
        <DialogTitle>确认删除供应商</DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            确定要删除供应商 "<strong>{providerToDelete}</strong>" 吗？此操作不可撤销。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDeleteProviderConfirm} disabled={aiConfigLoading}>
            取消
          </Button>
          <Button onClick={handleDeleteProvider} color="error" variant="contained" disabled={aiConfigLoading}>
            删除
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AiSettingsSection;

