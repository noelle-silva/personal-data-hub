import React from 'react';
import { Box, IconButton, Tooltip, useTheme } from '@mui/material';
import RemoveIcon from '@mui/icons-material/Remove';
import CropSquareIcon from '@mui/icons-material/CropSquare';
import CloseIcon from '@mui/icons-material/Close';
import { isTauri } from '../services/tauriBridge';
import { closeWindow, minimizeWindow, toggleMaximizeWindow } from '../services/tauriWindow';

const baseButtonSx = {
  borderRadius: 1,
  width: 40,
  height: 40,
};

const WindowControls = () => {
  const theme = useTheme();

  if (!isTauri()) return null;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
      }}
    >
      <Tooltip title="最小化">
        <IconButton
          aria-label="最小化窗口"
          color="inherit"
          onClick={minimizeWindow}
          sx={{
            ...baseButtonSx,
            backgroundColor: theme.palette.mode === 'light'
              ? 'rgba(0, 0, 0, 0.04)'
              : 'rgba(255, 255, 255, 0.08)',
            '&:hover': {
              backgroundColor: theme.palette.mode === 'light'
                ? 'rgba(0, 0, 0, 0.08)'
                : 'rgba(255, 255, 255, 0.12)',
            },
          }}
        >
          <RemoveIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      <Tooltip title="最大化 / 还原">
        <IconButton
          aria-label="最大化或还原窗口"
          color="inherit"
          onClick={toggleMaximizeWindow}
          sx={{
            ...baseButtonSx,
            backgroundColor: theme.palette.mode === 'light'
              ? 'rgba(0, 0, 0, 0.04)'
              : 'rgba(255, 255, 255, 0.08)',
            '&:hover': {
              backgroundColor: theme.palette.mode === 'light'
                ? 'rgba(0, 0, 0, 0.08)'
                : 'rgba(255, 255, 255, 0.12)',
            },
          }}
        >
          <CropSquareIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      <Tooltip title="关闭">
        <IconButton
          aria-label="关闭窗口"
          color="inherit"
          onClick={closeWindow}
          sx={{
            ...baseButtonSx,
            backgroundColor: theme.palette.mode === 'light'
              ? 'rgba(0, 0, 0, 0.04)'
              : 'rgba(255, 255, 255, 0.08)',
            '&:hover': {
              backgroundColor: theme.palette.error.main,
            },
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  );
};

export default WindowControls;
