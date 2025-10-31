import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Alert,
  Divider,
  Tooltip,
  IconButton,
  Menu,
  MenuItem,
  Chip,
  Snackbar,
} from '@mui/material';
import {
  Save as SaveIcon,
  Restore as RestoreIcon,
  FileDownload as DownloadIcon,
  FileUpload as UploadIcon,
  Keyboard as KeyboardIcon,
  Info as InfoIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useSelector, useDispatch } from 'react-redux';
import KeyCaptureInput from './KeyCaptureInput';
import { normalizeComboString } from '../shortcuts/normalize';
import {
  selectShortcuts,
  selectEnabled,
  selectConflicts,
  selectPlatform,
  selectIsDirty,
  selectActionMetadata,
  selectReservedKeys,
  setShortcut,
  toggleShortcut,
  setShortcutScope,
  resetShortcut,
  resetAllShortcuts,
  toggleGlobalEnabled,
  markAsSaved,
  WINDOWS_CONFLICTING_COMBOS,
} from '../store/shortcutsSlice';
import { saveShortcutSettings, loadShortcutSettings, exportShortcuts, importShortcuts } from '../shortcuts/Persistence';
import KeybindingManager from '../shortcuts/KeybindingManager';
import { getPlatform } from '../shortcuts/Persistence';

/**
 * 快捷键设置面板组件
 */
const ShortcutSettingsPanel = () => {
  const dispatch = useDispatch();
  const shortcuts = useSelector(selectShortcuts);
  const enabled = useSelector(selectEnabled);
  const conflicts = useSelector(selectConflicts);
  const platform = useSelector(selectPlatform);
  const isDirty = useSelector(selectIsDirty);
  const actionMetadata = useSelector(selectActionMetadata);
  const reservedKeys = useSelector(selectReservedKeys);

  // 本地状态
  const [editingActionId, setEditingActionId] = useState<string | null>(null);
  const [editingCombo, setEditingCombo] = useState('');
  const [importExportAnchor, setImportExportAnchor] = useState(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [conflictWarning, setConflictWarning] = useState('');

  // 键盘管理器实例
  const keybindingManager = KeybindingManager.getInstance();

  // 组件挂载时加载设置
  useEffect(() => {
    const settings = loadShortcutSettings();
    dispatch({ type: 'shortcuts/loadSettings', payload: settings });
  }, [dispatch]);

  // 处理快捷键编辑
  const handleEditShortcut = (actionId: string, combo: string) => {
    setEditingActionId(actionId);
    setEditingCombo(combo);
  };

  // 处理快捷键保存
  const handleSaveShortcut = () => {
    if (editingActionId && editingCombo) {
      // 规范化快捷键字符串
      const normalizedCombo = normalizeComboString(editingCombo);
      
      // 检查是否为保留键
      if (reservedKeys.includes(normalizedCombo.toLowerCase())) {
        setSnackbarMessage('该快捷键为系统保留键，无法设置');
        setSnackbarOpen(true);
        return;
      }

      // 检查 Windows 下的潜在冲突
      const platform = getPlatform();
      if (platform === 'windows') {
        const hasWindowsConflict = WINDOWS_CONFLICTING_COMBOS.some(combo =>
          normalizedCombo.toLowerCase().startsWith(combo.toLowerCase())
        );
        
        if (hasWindowsConflict) {
          setConflictWarning(`在 Windows 系统下，${normalizedCombo} 可能与系统功能（如输入法切换）冲突。建议使用 Ctrl+Shift 替代 Ctrl+Alt。`);
        } else {
          setConflictWarning('');
        }
      }

      // 检查冲突
      const hasConflict = Object.entries(shortcuts).some(([id, entry]) => {
        return id !== editingActionId && entry.primary === normalizedCombo;
      });

      if (hasConflict) {
        setSnackbarMessage('快捷键冲突，请选择其他组合键');
        setSnackbarOpen(true);
        return;
      }

      // 保存快捷键
      dispatch(setShortcut({ actionId: editingActionId as any, combo: normalizedCombo }));
      setEditingActionId(null);
      setEditingCombo('');
      setConflictWarning('');
    }
  };

  // 处理快捷键重置
  const handleResetShortcut = (actionId: string) => {
    dispatch(resetShortcut(actionId as any));
  };

  // 处理所有快捷键重置
  const handleResetAll = () => {
    if (window.confirm('确定要重置所有快捷键为默认值吗？')) {
      dispatch(resetAllShortcuts());
    }
  };

  // 处理导出设置
  const handleExport = () => {
    try {
      const data = exportShortcuts();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `shortcuts-${platform}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setSnackbarMessage('快捷键设置已导出');
      setSnackbarOpen(true);
    } catch (error) {
      console.error('导出失败:', error);
      setSnackbarMessage('导出失败，请重试');
      setSnackbarOpen(true);
    }
  };

  // 处理导入设置
  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse((e.target as any).result);
        if (importShortcuts(data)) {
          dispatch({ type: 'shortcuts/loadSettings', payload: data });
          setSnackbarMessage('快捷键设置已导入');
          setSnackbarOpen(true);
        } else {
          setSnackbarMessage('导入失败，文件格式不正确');
          setSnackbarOpen(true);
        }
      } catch (error) {
        console.error('导入失败:', error);
        setSnackbarMessage('导入失败，文件格式不正确');
        setSnackbarOpen(true);
      }
    };
    reader.readAsText(file);
    
    // 清理文件输入
    event.target.value = '';
  };

  // 处理保存所有设置
  const handleSaveAll = () => {
    // 如果有正在编辑的快捷键，先保存它
    if (editingActionId && editingCombo) {
      // 规范化快捷键字符串
      const normalizedCombo = normalizeComboString(editingCombo);
      
      // 检查是否为保留键
      if (reservedKeys.includes(normalizedCombo.toLowerCase())) {
        setSnackbarMessage('该快捷键为系统保留键，无法设置');
        setSnackbarOpen(true);
        return;
      }

      // 检查 Windows 下的潜在冲突
      const platform = getPlatform();
      if (platform === 'windows') {
        const hasWindowsConflict = WINDOWS_CONFLICTING_COMBOS.some(combo =>
          normalizedCombo.toLowerCase().startsWith(combo.toLowerCase())
        );
        
        if (hasWindowsConflict) {
          setConflictWarning(`在 Windows 系统下，${normalizedCombo} 可能与系统功能（如输入法切换）冲突。建议使用 Ctrl+Shift 替代 Ctrl+Alt。`);
        } else {
          setConflictWarning('');
        }
      }

      // 检查冲突
      const hasConflict = Object.entries(shortcuts).some(([id, entry]) => {
        return id !== editingActionId && entry.primary === normalizedCombo;
      });

      if (hasConflict) {
        setSnackbarMessage('快捷键冲突，请选择其他组合键');
        setSnackbarOpen(true);
        return;
      }

      // 保存快捷键
      dispatch(setShortcut({ actionId: editingActionId as any, combo: normalizedCombo }));
      setEditingActionId(null);
      setEditingCombo('');
      setConflictWarning('');
    }

    const settings = {
      enabled,
      shortcuts,
      scopePolicy: {
        global: true,
        modal: true,
        'editor-safe': true,
        'input-safe': true,
      },
    };
    
    saveShortcutSettings(settings);
    dispatch(markAsSaved());
    setSnackbarMessage('设置已保存');
    setSnackbarOpen(true);
  };

  // 关闭编辑
  const handleCancelEdit = () => {
    setEditingActionId(null);
    setEditingCombo('');
  };

  // 关闭提示
  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  // 获取平台显示文本
  const getPlatformText = () => {
    switch (platform) {
      case 'windows':
        return 'Windows';
      case 'mac':
        return 'macOS';
      case 'linux':
        return 'Linux';
      default:
        return '未知';
    }
  };

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <KeyboardIcon sx={{ mr: 1 }} />
                快捷键设置
                <Tooltip title={`当前平台: ${getPlatformText()}`}>
                  <InfoIcon sx={{ fontSize: 16, color: 'action.disabled' }} />
                </Tooltip>
              </Typography>

        {/* 使用说明 */}
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            <strong>使用说明：</strong>
            <br />
            • 点击输入框右侧的键盘图标开始录制快捷键
            <br />
            • 录制完成后会自动保存，也可点击"保存设置"统一保存所有更改
            <br />
            • 某些系统保留键（如 Ctrl+C、Ctrl+V 等）无法被覆盖
            <br />
            • Windows 系统下，Ctrl+Alt 可能与输入法切换冲突，建议使用 Ctrl+Shift
          </Typography>
        </Alert>

        {/* 全局开关 */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={enabled}
                      onChange={(e) => dispatch(toggleGlobalEnabled())}
                      color="primary"
                    />
                  }
                  label="启用快捷键系统"
                  labelPlacement="start"
                  sx={{ mr: 2 }}
                />
        </Box>

        {/* 冲突提示 */}
        {conflicts.length > 0 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2">
              检测到快捷键冲突：
              {conflicts.map((conflict, index) => (
                <div key={index}>
                  <strong>{actionMetadata[conflict.actionId]?.description}</strong> 与{' '}
                  <strong>{actionMetadata[conflict.conflictingActionId]?.description}</strong> 冲突
                  <br />
                  组合键: {conflict.combo}
                </div>
              ))}
            </Typography>
          </Alert>
        )}

        {/* 快捷键列表 */}
        <Divider sx={{ my: 2 }} />
        <Typography variant="h6" gutterBottom>
          快捷键配置
        </Typography>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          {Object.entries(shortcuts).map(([actionId, entry]) => {
            const metadata = actionMetadata[actionId];
            const isEditing = editingActionId === actionId;
            
            return (
              <Box key={actionId} sx={{ flex: '1 1 300px', maxWidth: 'calc(50% - 16px)' }}>
                <Box sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 2, height: '100%' }}>
                  <Typography variant="subtitle2" gutterBottom>
                    {metadata?.description}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <KeyCaptureInput
                      value={isEditing ? editingCombo : entry.primary}
                      onChange={(combo) => setEditingCombo(combo)}
                      disabled={!enabled}
                      size="small"
                      label="快捷键"
                      helperText={keybindingManager?.getDisplayText(entry.primary)}
                      placeholder="点击录制快捷键"
                      onStartRecording={() => handleEditShortcut(actionId, entry.primary)}
                      onCancelRecording={handleCancelEdit}
                    />
                    
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {isEditing ? (
                        <>
                          <Button
                            size="small"
                            onClick={handleSaveShortcut}
                            variant="contained"
                            color="primary"
                          >
                            保存
                          </Button>
                          <Button
                            size="small"
                            onClick={handleCancelEdit}
                          >
                            取消
                          </Button>
                        </>
                      ) : (
                        <>
                          <Switch
                            checked={entry.enabled}
                            onChange={() => dispatch(toggleShortcut(actionId as any))}
                            disabled={!enabled}
                            size="small"
                          />
                          
                          <Button
                            size="small"
                            onClick={() => handleResetShortcut(actionId)}
                            disabled={!enabled}
                            color="error"
                          >
                            重置
                          </Button>
                        </>
                      )}
                    </Box>
                  </Box>
                  
                  {entry.scope !== 'global' && (
                    <Chip
                      label={`作用域: ${entry.scope}`}
                      size="small"
                      variant="outlined"
                      sx={{ mt: 1 }}
                    />
                  )}
                </Box>
              </Box>
            );
          })}
        </Box>

        {/* 操作按钮 */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 3 }}>
          <Box>
            <Button
              variant="outlined"
              startIcon={<RestoreIcon />}
              onClick={handleResetAll}
              disabled={!enabled}
            >
              重置为默认
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<SaveIcon />}
              onClick={handleSaveAll}
              disabled={!enabled}
              color="primary"
            >
              保存设置
            </Button>
          </Box>
          
          <Box>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleExport}
            >
              导出
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<UploadIcon />}
              onClick={() => setImportExportAnchor(document.getElementById('import-input'))}
            >
              导入
            </Button>
            
            <input
              id="import-input"
              type="file"
              accept=".json"
              style={{ display: 'none' }}
              onChange={handleImport}
            />
          </Box>
        </Box>

        {/* 保存提示 */}
        {isDirty && (
          <Alert 
            severity="info" 
            sx={{ mt: 2 }}
            action={
              <Button 
                size="small" 
                onClick={handleSaveAll}
                color="primary"
              >
                立即保存
              </Button>
            }
          >
            设置已修改，请保存更改
          </Alert>
        )}
      </CardContent>

      {/* 冲突警告 */}
      {conflictWarning && (
        <Alert
          severity="warning"
          sx={{ mb: 2 }}
          action={
            <Button
              size="small"
              color="inherit"
              onClick={() => setConflictWarning('')}
            >
              忽略
            </Button>
          }
        >
          {conflictWarning}
        </Alert>
      )}

      {/* 提示消息 */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        message={snackbarMessage}
      />
    </Card>
  );
};

export default ShortcutSettingsPanel;