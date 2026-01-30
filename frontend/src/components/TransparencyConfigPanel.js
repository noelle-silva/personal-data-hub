import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  Grid,
  Stack
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  Save as SaveIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import TransparencySlider from './TransparencySlider';
import { useTransparency } from '../contexts/TransparencyContext';

// 样式化的配置卡片
const ConfigCard = styled(Card)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  borderRadius: 16,
  transition: 'all 0.2s ease-in-out',
  '&:hover': {
    boxShadow: theme.shadows[4],
  },
}));

// 样式化的配置项
const ConfigItem = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: theme.spacing(1),
  borderRadius: 8,
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
}));

/**
 * 透明度配置面板组件
 */
const TransparencyConfigPanel = () => {
  const {
    currentTransparency,
    currentConfig,
    allConfigs,
    loading,
    saving,
    error,
    loadAllConfigs,
    applyTransparency,
    applyConfig,
    saveConfig,
    deleteConfig,
    resetToDefault,
    clearTransparencyError,
    hasChanges
  } = useTransparency();

  // 本地状态
  const [tempTransparency, setTempTransparency] = useState(currentTransparency);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveFormData, setSaveFormData] = useState({
    name: '',
    description: ''
  });
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [configToDelete, setConfigToDelete] = useState(null);

  // 初始化时加载所有配置
  useEffect(() => {
    loadAllConfigs();
  }, [loadAllConfigs]);

  // 同步当前透明度到临时状态
  useEffect(() => {
    setTempTransparency(currentTransparency);
  }, [currentTransparency]);

  // 处理透明度值变化
  const handleTransparencyChange = (component, value) => {
    const newTransparency = {
      ...tempTransparency,
      [component]: value
    };
    setTempTransparency(newTransparency);
    // 实时应用透明度变化
    applyTransparency(newTransparency);
  };

  // 打开保存对话框
  const openSaveDialog = () => {
    setSaveFormData({
      name: '',
      description: ''
    });
    setSaveDialogOpen(true);
  };

  // 关闭保存对话框
  const closeSaveDialog = () => {
    setSaveDialogOpen(false);
  };

  // 保存配置
  const handleSaveConfig = async () => {
    if (!saveFormData.name.trim()) {
      return;
    }

    try {
      await saveConfig(saveFormData.name, {
        name: saveFormData.name,
        description: saveFormData.description,
        transparency: tempTransparency
      });
      closeSaveDialog();
    } catch (error) {
      console.error('保存透明度配置失败:', error);
    }
  };

  // 应用配置
  const handleApplyConfig = (config) => {
    applyConfig(config);
  };

  // 打开删除确认对话框
  const openDeleteConfirm = (config) => {
    setConfigToDelete(config);
    setDeleteConfirmOpen(true);
  };

  // 关闭删除确认对话框
  const closeDeleteConfirm = () => {
    setDeleteConfirmOpen(false);
    setConfigToDelete(null);
  };

  // 确认删除配置
  const handleDeleteConfig = async () => {
    if (!configToDelete) return;

    try {
      await deleteConfig(configToDelete.name);
      closeDeleteConfirm();
    } catch (error) {
      console.error('删除透明度配置失败:', error);
    }
  };

  // 重置到默认值
  const handleResetToDefault = () => {
    resetToDefault();
  };

  // 检查当前设置是否有变化
  const hasCurrentChanges = currentConfig ? hasChanges(currentConfig) : (
    tempTransparency.cards !== 100 ||
    tempTransparency.sidebar !== 100 ||
    tempTransparency.appBar !== 100
  );

  return (
    <Box>
      {/* 错误提示 */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={clearTransparencyError}>
          {error}
        </Alert>
      )}

      {/* 当前透明度设置 */}
      <ConfigCard>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            当前透明度设置
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <TransparencySlider
                label="卡片透明度"
                value={tempTransparency.cards}
                onChange={(value) => handleTransparencyChange('cards', value)}
                helperText="调整文档卡片、引用卡片和附件卡片的透明度"
                color="primary"
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TransparencySlider
                label="侧边栏透明度"
                value={tempTransparency.sidebar}
                onChange={(value) => handleTransparencyChange('sidebar', value)}
                helperText="调整左侧导航侧边栏的透明度"
                color="secondary"
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TransparencySlider
                label="顶部导航栏透明度"
                value={tempTransparency.appBar}
                onChange={(value) => handleTransparencyChange('appBar', value)}
                helperText="调整顶部导航栏的透明度"
                color="info"
              />
            </Grid>
          </Grid>

          {/* 操作按钮 */}
          <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={handleResetToDefault}
            >
              重置默认
            </Button>
            
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={openSaveDialog}
              disabled={!hasCurrentChanges || saving}
            >
              保存配置
            </Button>
          </Box>
        </CardContent>
      </ConfigCard>

      {/* 已保存的配置 */}
      <ConfigCard>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            已保存的配置
          </Typography>

          {loading ? (
            <Typography>加载中...</Typography>
          ) : allConfigs.length === 0 ? (
            <Typography color="text.secondary">
              暂无保存的配置
            </Typography>
          ) : (
            <Stack spacing={1}>
              {allConfigs.map((config) => (
                <ConfigItem key={config.name}>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="subtitle1" fontWeight="medium">
                      {config.name}
                    </Typography>
                    {config.description && (
                      <Typography variant="body2" color="text.secondary">
                        {config.description}
                      </Typography>
                    )}
                    <Box sx={{ mt: 1 }}>
                      <Chip 
                        label={`卡片: ${config.transparency.cards}%`} 
                        size="small" 
                        sx={{ mr: 1 }}
                      />
                      <Chip 
                        label={`侧边栏: ${config.transparency.sidebar}%`} 
                        size="small" 
                        sx={{ mr: 1 }}
                      />
                      <Chip 
                        label={`导航栏: ${config.transparency.appBar}%`} 
                        size="small" 
                      />
                    </Box>
                  </Box>
                  
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title="应用此配置">
                      <IconButton
                        color="primary"
                        onClick={() => handleApplyConfig(config)}
                        disabled={currentConfig?.name === config.name}
                      >
                        <VisibilityIcon />
                      </IconButton>
                    </Tooltip>
                    
                    <Tooltip title="删除配置">
                      <IconButton
                        color="error"
                        onClick={() => openDeleteConfirm(config)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </ConfigItem>
              ))}
            </Stack>
          )}
        </CardContent>
      </ConfigCard>

      {/* 保存配置对话框 */}
      <Dialog open={saveDialogOpen} onClose={closeSaveDialog} maxWidth="sm" fullWidth>
        <DialogTitle>保存透明度配置</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="配置名称"
            fullWidth
            variant="outlined"
            value={saveFormData.name}
            onChange={(e) => setSaveFormData({
              ...saveFormData,
              name: e.target.value
            })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="配置描述（可选）"
            fullWidth
            variant="outlined"
            multiline
            rows={3}
            value={saveFormData.description}
            onChange={(e) => setSaveFormData({
              ...saveFormData,
              description: e.target.value
            })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeSaveDialog}>取消</Button>
          <Button 
            onClick={handleSaveConfig} 
            variant="contained"
            disabled={!saveFormData.name.trim() || saving}
          >
            保存
          </Button>
        </DialogActions>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={deleteConfirmOpen} onClose={closeDeleteConfirm}>
        <DialogTitle>确认删除</DialogTitle>
        <DialogContent>
          <Typography>
            确定要删除配置 "{configToDelete?.name}" 吗？此操作不可撤销。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDeleteConfirm}>取消</Button>
          <Button 
            onClick={handleDeleteConfig} 
            color="error" 
            variant="contained"
          >
            删除
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TransparencyConfigPanel;
