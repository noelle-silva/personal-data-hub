/**
 * 组件样式构建器
 * 基于主题调色板动态生成 MUI 组件样式覆盖
 * 确保所有颜色都引用 theme.palette，而非硬编码值
 */

/**
 * 构建组件样式覆盖
 * @param {Object} theme - MUI 主题对象
 * @returns {Object} 组件样式覆盖对象
 */
export const buildComponentsOverrides = (theme) => {
  const isDark = theme.palette.mode === 'dark';
  
  return {
    // 卡片组件
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          boxShadow: isDark 
            ? '0 2px 8px rgba(0,0,0,0.3)' 
            : '0 2px 8px rgba(0,0,0,0.1)',
          backgroundColor: theme.palette.background.paper,
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            boxShadow: isDark 
              ? '0 4px 16px rgba(0,0,0,0.4)' 
              : '0 4px 16px rgba(0,0,0,0.15)',
            transform: 'translateY(-2px)',
          },
        },
      },
    },
    
    // 按钮组件
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          textTransform: 'none',
          fontWeight: 500,
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            transform: 'translateY(-1px)',
          },
        },
        contained: {
          boxShadow: isDark 
            ? `0 2px 8px ${theme.palette.primary.main}40` 
            : `0 2px 8px ${theme.palette.primary.main}20`,
          '&:hover': {
            boxShadow: isDark 
              ? `0 4px 16px ${theme.palette.primary.main}60` 
              : `0 4px 16px ${theme.palette.primary.main}40`,
          },
        },
      },
    },
    
    // 芯片组件
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          fontWeight: 500,
          '&:hover': {
            transform: 'scale(1.05)',
          },
        },
      },
    },
    
    // 应用栏组件
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: isDark 
            ? '0 2px 8px rgba(0,0,0,0.3)' 
            : '0 2px 8px rgba(0,0,0,0.1)',
          backgroundColor: theme.palette.background.paper,
          color: theme.palette.text.primary,
        },
      },
    },
    
    // 模态框组件
    MuiModal: {
      styleOverrides: {
        root: {
          backdropFilter: 'blur(4px)',
        },
        backdrop: {
          backgroundColor: isDark 
            ? 'rgba(0, 0, 0, 0.7)' 
            : 'rgba(0, 0, 0, 0.5)',
        },
      },
    },
    
    // 抽屉组件
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: theme.palette.background.paper,
          borderRight: `1px solid ${theme.palette.divider}`,
        },
      },
    },
    
    // 工具提示组件
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: theme.palette.background.default,
          color: theme.palette.text.primary,
          border: `1px solid ${theme.palette.divider}`,
          fontSize: '14px',
          borderRadius: 8,
        },
        arrow: {
          color: theme.palette.divider,
        },
      },
    },
    
    // 纸张组件
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: theme.palette.background.paper,
          backgroundImage: 'none', // 移除默认的渐变背景
        },
        elevation1: {
          boxShadow: isDark 
            ? '0 1px 3px rgba(0,0,0,0.2)' 
            : '0 1px 3px rgba(0,0,0,0.1)',
        },
        elevation2: {
          boxShadow: isDark 
            ? '0 2px 6px rgba(0,0,0,0.25)' 
            : '0 2px 6px rgba(0,0,0,0.15)',
        },
        elevation3: {
          boxShadow: isDark 
            ? '0 3px 9px rgba(0,0,0,0.3)' 
            : '0 3px 9px rgba(0,0,0,0.2)',
        },
      },
    },
    
    // 输入框组件
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            '& fieldset': {
              borderColor: theme.palette.divider,
            },
            '&:hover fieldset': {
              borderColor: theme.palette.primary.main,
            },
            '&.Mui-focused fieldset': {
              borderColor: theme.palette.primary.main,
              borderWidth: 2,
            },
          },
        },
      },
    },
    
    // 选择框组件
    MuiSelect: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: theme.palette.divider,
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: theme.palette.primary.main,
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: theme.palette.primary.main,
            borderWidth: 2,
          },
        },
      },
    },
    
    // 分隔线组件
    MuiDivider: {
      styleOverrides: {
        root: {
          backgroundColor: theme.palette.divider,
        },
      },
    },
    
    // 列表组件
    MuiList: {
      styleOverrides: {
        root: {
          backgroundColor: 'transparent',
        },
      },
    },
    
    // 列表项组件
    MuiListItem: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: isDark 
              ? 'rgba(255, 255, 255, 0.05)' 
              : 'rgba(0, 0, 0, 0.04)',
          },
        },
        selected: {
          backgroundColor: isDark 
            ? `${theme.palette.primary.main}20` 
            : `${theme.palette.primary.main}10`,
          '&:hover': {
            backgroundColor: isDark 
              ? `${theme.palette.primary.main}30` 
              : `${theme.palette.primary.main}20`,
          },
        },
      },
    },
    
    // 标签页组件
    MuiTab: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: isDark 
              ? 'rgba(255, 255, 255, 0.05)' 
              : 'rgba(0, 0, 0, 0.04)',
          },
          '&.Mui-selected': {
            color: theme.palette.primary.main,
          },
        },
      },
    },
    
    // 进度条组件
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          backgroundColor: theme.palette.background.default,
        },
        bar: {
          backgroundColor: theme.palette.primary.main,
        },
      },
    },
    
    // 滑块组件
    MuiSlider: {
      styleOverrides: {
        root: {
          '& .MuiSlider-track': {
            backgroundColor: theme.palette.primary.main,
          },
          '& .MuiSlider-rail': {
            backgroundColor: theme.palette.divider,
          },
          '& .MuiSlider-thumb': {
            backgroundColor: theme.palette.primary.main,
            border: `2px solid ${theme.palette.background.paper}`,
          },
        },
      },
    },
    
    // 开关组件
    MuiSwitch: {
      styleOverrides: {
        root: {
          '& .MuiSwitch-switchBase': {
            '&.Mui-checked': {
              color: theme.palette.primary.main,
            },
          },
          '& .MuiSwitch-track': {
            backgroundColor: theme.palette.divider,
          },
          '& .MuiSwitch-thumb': {
            backgroundColor: theme.palette.background.paper,
          },
        },
      },
    },
    
    // 复选框组件
    MuiCheckbox: {
      styleOverrides: {
        root: {
          '&.Mui-checked': {
            color: theme.palette.primary.main,
          },
        },
      },
    },
    
    // 单选框组件
    MuiRadio: {
      styleOverrides: {
        root: {
          '&.Mui-checked': {
            color: theme.palette.primary.main,
          },
        },
      },
    },
    
    // 菜单组件
    MuiMenu: {
      styleOverrides: {
        paper: {
          backgroundColor: theme.palette.background.paper,
          border: `1px solid ${theme.palette.divider}`,
          boxShadow: isDark 
            ? '0 4px 16px rgba(0,0,0,0.4)' 
            : '0 4px 16px rgba(0,0,0,0.15)',
        },
      },
    },
    
    // 菜单项组件
    MuiMenuItem: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: isDark 
              ? 'rgba(255, 255, 255, 0.05)' 
              : 'rgba(0, 0, 0, 0.04)',
          },
          '&.Mui-selected': {
            backgroundColor: isDark 
              ? `${theme.palette.primary.main}20` 
              : `${theme.palette.primary.main}10`,
          },
        },
      },
    },
  };
};

/**
 * 构建自定义颜色覆盖
 * @param {Object} theme - MUI 主题对象
 * @returns {Object} 自定义颜色覆盖对象
 */
export const buildCustomColors = (theme) => {
  const isDark = theme.palette.mode === 'dark';
  return {
    // 确保所有自定义颜色都引用 palette
    onPrimary: theme.palette.primary.contrastText,
    onSecondary: theme.palette.secondary.contrastText,
    onTertiary: theme.palette.tertiary.contrastText,
    onError: theme.palette.error.contrastText,
    onSurface: theme.palette.surface.contrastText,
    onSurfaceVariant: theme.palette.surfaceVariant.contrastText,
    onBackground: theme.palette.text.primary,
    onPrimaryContainer: theme.palette.primaryContainer.contrastText,
    onSecondaryContainer: theme.palette.secondaryContainer.contrastText,
    onTertiaryContainer: theme.palette.tertiaryContainer.contrastText,
    onErrorContainer: theme.palette.errorContainer.contrastText,
    shadow: isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.2)',
    scrim: isDark ? 'rgba(0, 0, 0, 0.6)' : 'rgba(0, 0, 0, 0.1)',
    inverseSurface: isDark ? '#ffffff' : '#000000',
    inverseOnSurface: isDark ? '#000000' : '#ffffff',
    inversePrimary: isDark ? theme.palette.primary.dark : theme.palette.primary.light,
  };
};

const themeOverrides = {
  buildComponentsOverrides,
  buildCustomColors,
};

export default themeOverrides;
