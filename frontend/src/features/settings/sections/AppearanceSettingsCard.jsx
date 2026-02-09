import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Select,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import {
  Check as CheckIcon,
  Colorize as ColorizeIcon,
  DarkMode as DarkModeIcon,
  Delete as DeleteIcon,
  LightMode as LightModeIcon,
  Palette as PaletteIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { useThemeContext } from '../../../contexts/ThemeContext';
import { deleteThemePreset, listThemePresets, saveThemePreset } from '../../../services/themePresets';
import { SettingsCard } from '../components/SettingsShell';

const AppearanceSettingsCard = () => {
  const {
    mode,
    toggleColorMode,
    dynamicColorsEnabled,
    toggleDynamicColors,
    selectedVariant,
    setThemeVariant,
    availableVariants,
    getVariantDisplayName,
    themeColors,
    appliedThemePresetId,
    applyThemePreset,
    clearThemePreset,
  } = useThemeContext();

  const [presets, setPresets] = useState([]);
  const [presetsLoading, setPresetsLoading] = useState(false);
  const [error, setError] = useState('');
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [presetName, setPresetName] = useState('');

  const reloadPresets = async () => {
    setPresetsLoading(true);
    setError('');
    try {
      const list = await listThemePresets();
      setPresets(list);
    } catch (e) {
      setError(e?.message || '加载配色预设失败');
    } finally {
      setPresetsLoading(false);
    }
  };

  useEffect(() => {
    reloadPresets();
  }, []);

  const activePreset = useMemo(
    () => presets.find((item) => item.id === appliedThemePresetId) || null,
    [presets, appliedThemePresetId]
  );

  const canSaveCurrent = !!(dynamicColorsEnabled && themeColors && themeColors.schemes);

  const openSaveDialog = () => {
    setError('');
    setPresetName('');
    setSaveDialogOpen(true);
  };

  const closeSaveDialog = () => {
    setSaveDialogOpen(false);
    setPresetName('');
  };

  const handleSavePreset = async () => {
    if (!canSaveCurrent) {
      setError('当前没有可保存的动态配色，请先应用一个动态主题预设');
      return;
    }

    try {
      setPresetsLoading(true);
      setError('');
      await saveThemePreset({
        name: presetName,
        payload: {
          selectedVariant,
          themeColors,
        },
      });
      await reloadPresets();
      closeSaveDialog();
    } catch (e) {
      setError(e?.message || '保存配色预设失败');
    } finally {
      setPresetsLoading(false);
    }
  };

  const handleDeletePreset = async (id) => {
    const target = String(id || '').trim();
    if (!target) return;

    try {
      setPresetsLoading(true);
      setError('');
      await deleteThemePreset(target);
      if (target === appliedThemePresetId) {
        clearThemePreset();
      }
      await reloadPresets();
    } catch (e) {
      setError(e?.message || '删除配色预设失败');
    } finally {
      setPresetsLoading(false);
    }
  };

  return (
    <SettingsCard>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          外观设置
        </Typography>

        {error ? (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        ) : null}

        <List sx={{ p: 0 }}>
          <ListItem>
            <ListItemIcon>{mode === 'dark' ? <DarkModeIcon /> : <LightModeIcon />}</ListItemIcon>
            <ListItemText primary="深色模式" secondary="切换应用主题明暗模式" />
            <Switch checked={mode === 'dark'} onChange={toggleColorMode} color="primary" />
          </ListItem>

          <Divider />

          <ListItem>
            <ListItemIcon>
              <PaletteIcon />
            </ListItemIcon>
            <ListItemText primary="动态主题" secondary="开启后可应用本地配色预设" />
            <Switch checked={dynamicColorsEnabled} onChange={toggleDynamicColors} color="primary" />
          </ListItem>

          {dynamicColorsEnabled ? (
            <>
              <Divider />
              <ListItem>
                <ListItemIcon>
                  <ColorizeIcon />
                </ListItemIcon>
                <ListItemText primary="主题变体" secondary="选择动态主题色风格" />
                <FormControl sx={{ minWidth: 150 }} size="small">
                  <Select
                    value={selectedVariant}
                    label="主题变体"
                    onChange={(e) => setThemeVariant(e.target.value)}
                  >
                    {availableVariants.map((variant) => (
                      <MenuItem key={variant} value={variant}>
                        {getVariantDisplayName(variant)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemIcon>
                  <ColorizeIcon />
                </ListItemIcon>
                <ListItemText primary="主题说明" secondary="服务器主题色已移除，请使用下方本地配色预设" />
              </ListItem>
            </>
          ) : null}

          <Divider />

          <ListItem>
            <ListItemIcon>
              <SaveIcon />
            </ListItemIcon>
            <ListItemText
              primary="配色预设"
              secondary={activePreset ? `当前：${activePreset.name}` : '保存/切换你喜欢的配色'}
            />
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              {appliedThemePresetId ? (
                <Button variant="text" size="small" onClick={clearThemePreset} disabled={presetsLoading}>
                  切回默认主题
                </Button>
              ) : null}
              <Button
                variant="outlined"
                size="small"
                startIcon={presetsLoading ? <CircularProgress size={16} /> : <SaveIcon />}
                onClick={openSaveDialog}
                disabled={!canSaveCurrent || presetsLoading}
                sx={{ minWidth: 120 }}
              >
                保存当前配色
              </Button>
            </Box>
          </ListItem>

          {!canSaveCurrent ? (
            <ListItem sx={{ pt: 0 }}>
              <ListItemText secondary="提示：先应用一个本地配色预设后，才能保存当前配色快照。" />
            </ListItem>
          ) : null}

          {presets.length ? (
            presets.map((preset) => {
              const isActive = preset.id === appliedThemePresetId;
              return (
                <React.Fragment key={preset.id}>
                  <Divider />
                  <ListItem
                    secondaryAction={
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Button
                          variant={isActive ? 'contained' : 'outlined'}
                          size="small"
                          startIcon={isActive ? <CheckIcon /> : null}
                          onClick={() => applyThemePreset(preset)}
                          disabled={isActive || presetsLoading}
                        >
                          {isActive ? '已应用' : '应用'}
                        </Button>
                        <IconButton
                          size="small"
                          aria-label="删除配色预设"
                          title="删除"
                          onClick={() => handleDeletePreset(preset.id)}
                          disabled={presetsLoading}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    }
                  >
                    <ListItemIcon>
                      <PaletteIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary={preset.name}
                      secondary={preset.createdAt ? `创建于：${preset.createdAt}` : ''}
                    />
                  </ListItem>
                </React.Fragment>
              );
            })
          ) : (
            <>
              <Divider />
              <ListItem>
                <ListItemText secondary="暂无已保存的配色预设" />
              </ListItem>
            </>
          )}
        </List>

        <Dialog open={saveDialogOpen} onClose={closeSaveDialog} fullWidth maxWidth="sm">
          <DialogTitle>保存当前配色</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="配色名称"
              fullWidth
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder="例如：柔和蓝 / 夜间阅读"
              inputProps={{ maxLength: 48 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={closeSaveDialog} disabled={presetsLoading}>
              取消
            </Button>
            <Button variant="contained" onClick={handleSavePreset} disabled={presetsLoading}>
              保存
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </SettingsCard>
  );
};

export default AppearanceSettingsCard;

