import React from 'react';
import { IconButton, Tooltip } from '@mui/material';
import { useThemeContext } from '../contexts/ThemeContext';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';

const ThemeToggle = () => {
  const { mode, toggleColorMode } = useThemeContext();

  return (
    <Tooltip title={`切换到${mode === 'light' ? '深色' : '浅色'}模式`}>
      <IconButton
        color="inherit"
        onClick={toggleColorMode}
        sx={{
          borderRadius: 16,
          backgroundColor: mode === 'light' 
            ? 'rgba(0, 0, 0, 0.04)' 
            : 'rgba(255, 255, 255, 0.08)',
          '&:hover': {
            backgroundColor: mode === 'light' 
              ? 'rgba(0, 0, 0, 0.08)' 
              : 'rgba(255, 255, 255, 0.12)',
          },
        }}
      >
        {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
      </IconButton>
    </Tooltip>
  );
};

export default ThemeToggle;