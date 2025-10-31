import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  TextField,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Keyboard as KeyboardIcon,
  Clear as ClearIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import { normalizeKeyEventToCombo, comboToDisplayText } from '../shortcuts/normalize';

interface KeyCaptureInputProps {
  value?: string;
  onChange?: (combo: string) => void;
  placeholder?: string;
  disabled?: boolean;
  size?: 'small' | 'medium';
  label?: string;
  helperText?: string;
  onStartRecording?: () => void;
  onCancelRecording?: () => void;
}

/**
 * 快捷键录制输入组件
 * 支持键盘事件捕获和快捷键组合规范化
 */
const KeyCaptureInput: React.FC<KeyCaptureInputProps> = ({
  value = '',
  onChange,
  placeholder = '点击录制快捷键',
  disabled = false,
  size = 'medium',
  label,
  helperText,
  onStartRecording,
  onCancelRecording,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [currentCombo, setCurrentCombo] = useState('');
  const [displayText, setDisplayText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const recordingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 初始化显示文本
  useEffect(() => {
    if (value && !isRecording) {
      setDisplayText(comboToDisplayText(value));
    }
  }, [value, isRecording]);

  // 清理录制状态
  const stopRecording = () => {
    setIsRecording(false);
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }
  };

  // 开始录制
  const startRecording = () => {
    if (disabled) return;
    
    setIsRecording(true);
    setCurrentCombo('');
    setDisplayText('按下快捷键组合...');
    
    // 通知父组件开始录制
    onStartRecording?.();
    
    // 设置录制超时（5秒后自动停止）
    recordingTimeoutRef.current = setTimeout(() => {
      stopRecording();
      setCurrentCombo('');
      setDisplayText('录制超时，请重试');
      onCancelRecording?.();
    }, 5000);
  };

  // 处理键盘事件
  const handleKeyDown = (event: KeyboardEvent) => {
    if (!isRecording) return;

    // 阻止默认行为和冒泡
    event.preventDefault();
    event.stopPropagation();

    // 特殊键处理
    if (event.key === 'Escape') {
      stopRecording();
      setCurrentCombo('');
      setDisplayText('已取消录制');
      onCancelRecording?.();
      return;
    }

    if (event.key === 'Backspace') {
      stopRecording();
      setCurrentCombo('');
      setDisplayText('已清空快捷键');
      onCancelRecording?.();
      return;
    }

    if (event.key === 'Enter') {
      if (currentCombo) {
        stopRecording();
        onChange?.(currentCombo);
        setDisplayText(comboToDisplayText(currentCombo));
      }
      return;
    }

    // 忽略单独的修饰键
    if (['Control', 'Alt', 'Shift', 'Meta'].includes(event.key)) {
      return;
    }

    // 规范化并更新当前组合
    const combo = normalizeKeyEventToCombo(event);
    setCurrentCombo(combo);
    setDisplayText(comboToDisplayText(combo));
    
    // 实时回传给父组件，确保父组件的 editingCombo 始终与最新录制同步
    onChange?.(combo);
  };

  // 添加/移除键盘事件监听
  useEffect(() => {
    if (isRecording) {
      window.addEventListener('keydown', handleKeyDown, true);
      return () => {
        window.removeEventListener('keydown', handleKeyDown, true);
        // 不在这里调用 stopRecording，避免录制过程中被意外清理
      };
    }
  }, [isRecording]); // 移除 currentCombo 依赖，避免每次按键都重新绑定

  // 清空快捷键
  const handleClear = () => {
    onChange?.('');
    setDisplayText('');
    setCurrentCombo('');
  };

  // 确认当前快捷键
  const handleConfirm = () => {
    if (currentCombo) {
      onChange?.(currentCombo);
      setDisplayText(comboToDisplayText(currentCombo));
      stopRecording();
    }
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <TextField
        ref={inputRef}
        value={displayText}
        placeholder={placeholder}
        disabled={disabled}
        size={size}
        label={label}
        helperText={helperText}
        onClick={startRecording}
        onFocus={startRecording}
        InputProps={{
          readOnly: true,
          style: { 
            cursor: isRecording ? 'pointer' : 'default',
            backgroundColor: isRecording ? 'rgba(25, 118, 210, 0.08)' : 'transparent',
          },
          endAdornment: (
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              {isRecording && (
                <Typography variant="caption" color="primary">
                  录制中...
                </Typography>
              )}
              {displayText && !isRecording && (
                <Tooltip title="清空快捷键">
                  <IconButton
                    size="small"
                    onClick={handleClear}
                    disabled={disabled}
                  >
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
              {isRecording && currentCombo && (
                <Tooltip title="确认快捷键">
                  <IconButton
                    size="small"
                    onClick={handleConfirm}
                    color="primary"
                  >
                    <CheckIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          ),
        }}
      />
      {!isRecording && (
        <Tooltip title="点击录制新的快捷键">
          <IconButton
            size="small"
            onClick={startRecording}
            disabled={disabled}
            color="primary"
          >
            <KeyboardIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
};

export default KeyCaptureInput;