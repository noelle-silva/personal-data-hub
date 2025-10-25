import React from 'react';
import {
  Box,
  Typography,
  Slider,
  FormControl,
  FormLabel,
  FormHelperText
} from '@mui/material';
import { styled } from '@mui/material/styles';

// 样式化的滑块容器
const SliderContainer = styled(Box)(({ theme }) => ({
  width: '100%',
  padding: theme.spacing(2),
  borderRadius: 12,
  backgroundColor: theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
  transition: 'all 0.2s ease-in-out',
  '&:hover': {
    boxShadow: theme.shadows[2],
  },
}));

// 样式化的滑块
const StyledSlider = styled(Slider)(({ theme }) => ({
  '& .MuiSlider-thumb': {
    width: 20,
    height: 20,
  },
  '& .MuiSlider-track': {
    height: 6,
    borderRadius: 3,
  },
  '& .MuiSlider-rail': {
    height: 6,
    borderRadius: 3,
  },
}));

/**
 * 透明度滑动条组件
 * @param {Object} props - 组件属性
 * @param {string} props.label - 标签文本
 * @param {number} props.value - 当前值 (0-100)
 * @param {Function} props.onChange - 值变化回调
 * @param {Function} props.onChangeCommitted - 值确认回调
 * @param {string} props.helperText - 帮助文本
 * @param {boolean} props.disabled - 是否禁用
 * @param {Array} props.marks - 刻度标记
 * @param {string} props.color - 主题颜色
 */
const TransparencySlider = ({
  label,
  value = 100,
  onChange,
  onChangeCommitted,
  helperText,
  disabled = false,
  marks = [
    { value: 0, label: '0%' },
    { value: 25, label: '25%' },
    { value: 50, label: '50%' },
    { value: 75, label: '75%' },
    { value: 100, label: '100%' }
  ],
  color = 'primary'
}) => {
  // 处理值变化
  const handleChange = (event, newValue) => {
    if (onChange) {
      onChange(newValue);
    }
  };

  // 处理值确认
  const handleChangeCommitted = (event, newValue) => {
    if (onChangeCommitted) {
      onChangeCommitted(newValue);
    }
  };

  // 格式化值显示
  const formatValue = (value) => {
    return `${value}%`;
  };

  return (
    <SliderContainer>
      <FormControl component="fieldset" disabled={disabled} fullWidth>
        <FormLabel component="legend" sx={{ 
          fontWeight: 'medium', 
          marginBottom: 1,
          color: `${color}.main`
        }}>
          {label}
        </FormLabel>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ flexGrow: 1 }}>
            <StyledSlider
              value={value}
              onChange={handleChange}
              onChangeCommitted={handleChangeCommitted}
              min={0}
              max={100}
              step={1}
              marks={marks}
              valueLabelDisplay="auto"
              valueLabelFormat={formatValue}
              color={color}
              disabled={disabled}
            />
          </Box>
          
          <Typography
            variant="body2"
            sx={{
              minWidth: 45,
              textAlign: 'center',
              fontWeight: 'bold',
              color: `${color}.main`,
              backgroundColor: `${color}.light`,
              padding: 0.5,
              borderRadius: 1
            }}
          >
            {formatValue(value)}
          </Typography>
        </Box>
        
        {helperText && (
          <FormHelperText sx={{ marginTop: 1 }}>
            {helperText}
          </FormHelperText>
        )}
      </FormControl>
    </SliderContainer>
  );
};

export default TransparencySlider;