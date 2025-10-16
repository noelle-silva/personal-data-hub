import { createTheme } from '@mui/material/styles';

// 浅色模式主题配置
export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    // Primary 主色系 - 柔和蓝色
    primary: {
      main: '#a2baedff',           // 柔和蓝
      light: '#6872c2ff',          // 浅蓝色
      dark: '#626ac2ff',           // 深蓝色
      contrastText: '#FFFFFF',   // On Primary
    },
    // Primary Container
    primaryContainer: {
      main: '#E1E5FF',           // 极浅蓝色容器
      contrastText: '#1A237E',   // On Primary Container
    },
    
    // Secondary 辅色系 - 柔和绿色
    secondary: {
      main: '#66BB6A',           // 柔和绿
      light: '#98EE99',          // 浅绿色
      dark: '#43A047',           // 深绿色
      contrastText: '#FFFFFF',   // On Secondary
    },
    // Secondary Container
    secondaryContainer: {
      main: '#E8F5E9',           // 极浅绿色容器
      contrastText: '#2E7D32',   // On Secondary Container
    },
    
    // Tertiary 三次色系 - 柔和紫色
    tertiary: {
      main: '#AB47BC',           // 柔和紫
      light: '#DE77D8',          // 浅紫色
      dark: '#7E57C2',           // 深紫色
      contrastText: '#FFFFFF',   // On Tertiary
    },
    // Tertiary Container
    tertiaryContainer: {
      main: '#F3E5F5',           // 极浅紫色容器
      contrastText: '#6A1B9A',   // On Tertiary Container
    },
    
    // Error 错误色系 - 柔和红色
    error: {
      main: '#EF5350',           // 柔和红
      light: '#FF867F',          // 浅红色
      dark: '#E53935',           // 深红色
      contrastText: '#FFFFFF',   // On Error
    },
    // Error Container
    errorContainer: {
      main: '#FFEBEE',           // 极浅红色容器
      contrastText: '#C62828',   // On Error Container
    },
    
    // Surface 表面色系
    surface: {
      main: '#F5F5F5',           // 浅中性灰
      contrastText: '#212121',   // On Surface
    },
    surfaceVariant: {
      main: '#E8EAF6',           // 变体表面色
      contrastText: '#424242',   // On Surface Variant
    },
    
    // Background 背景色系
    background: {
      default: '#FAFAFA',        // 极浅灰背景
      paper: '#FFFFFF',          // 纸白色
    },
    
    // 文本色系
    text: {
      primary: '#212121',        // 主要文本色 (On Background)
      secondary: '#757575',      // 次要文本色
      disabled: '#BDBDBD',       // 禁用文本色
    },
    
    // 分割线颜色
    divider: 'rgba(0, 0, 0, 0.12)',
    
    // 边框颜色
    border: 'rgba(0, 0, 0, 0.23)',
  },
  // 自定义色彩调色板
  customColors: {
    onPrimary: '#FFFFFF',
    onSecondary: '#FFFFFF',
    onTertiary: '#FFFFFF',
    onError: '#FFFFFF',
    onSurface: '#212121',
    onSurfaceVariant: '#424242',
    onBackground: '#212121',
    onPrimaryContainer: '#1A237E',
    onSecondaryContainer: '#2E7D32',
    onTertiaryContainer: '#6A1B9A',
    onErrorContainer: '#C62828',
  },
  // 组件样式自定义
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          backgroundColor: '#FFFFFF',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          textTransform: 'none',
          fontWeight: 500,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        },
      },
    },
    MuiModal: {
      styleOverrides: {
        root: {
          backdropFilter: 'blur(4px)',
        },
      },
    },
  },
});

// 深色模式主题配置
export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    // Primary 主色系 - 深色模式柔和蓝色
    primary: {
      main: '#7C8FDB',           // 提高明度的柔和蓝
      light: '#A6B8FF',          // 更浅的蓝色
      dark: '#5C6BC0',           // 原始蓝色
      contrastText: '#1A237E',   // On Primary (深色)
    },
    // Primary Container
    primaryContainer: {
      main: '#2E3A5C',           // 深蓝色容器
      contrastText: '#E1E5FF',   // On Primary Container
    },
    
    // Secondary 辅色系 - 深色模式柔和绿色
    secondary: {
      main: '#81C784',           // 提高明度的柔和绿
      light: '#A5D6A7',          // 更浅的绿色
      dark: '#66BB6A',           // 原始绿色
      contrastText: '#1B5E20',   // On Secondary (深色)
    },
    // Secondary Container
    secondaryContainer: {
      main: '#2E4231',           // 深绿色容器
      contrastText: '#E8F5E9',   // On Secondary Container
    },
    
    // Tertiary 三次色系 - 深色模式柔和紫色
    tertiary: {
      main: '#BA68C8',           // 提高明度的柔和紫
      light: '#CE93D8',          // 更浅的紫色
      dark: '#AB47BC',           // 原始紫色
      contrastText: '#4A148C',   // On Tertiary (深色)
    },
    // Tertiary Container
    tertiaryContainer: {
      main: '#4A2C4C',           // 深紫色容器
      contrastText: '#F3E5F5',   // On Tertiary Container
    },
    
    // Error 错误色系 - 深色模式柔和红色
    error: {
      main: '#FF6B6B',           // 提高明度的柔和红
      light: '#FF8A80',          // 更浅的红色
      dark: '#EF5350',           // 原始红色
      contrastText: '#B71C1C',   // On Error (深色)
    },
    // Error Container
    errorContainer: {
      main: '#5C2E2E',           // 深红色容器
      contrastText: '#FFEBEE',   // On Error Container
    },
    
    // Surface 表面色系 - 深色模式
    surface: {
      main: '#1E1E1E',           // 深中性灰
      contrastText: '#E0E0E0',   // On Surface
    },
    surfaceVariant: {
      main: '#2A2A2A',           // 变体表面色
      contrastText: '#BDBDBD',   // On Surface Variant
    },
    
    // Background 背景色系 - 深色模式
    background: {
      default: '#121212',        // 深色背景
      paper: '#1E1E1E',          // 深色纸面
    },
    
    // 文本色系 - 深色模式
    text: {
      primary: '#E0E0E0',        // 主要文本色
      secondary: '#BDBDBD',      // 次要文本色
      disabled: '#616161',       // 禁用文本色
    },
    
    // 分割线颜色 - 深色模式
    divider: 'rgba(255, 255, 255, 0.12)',
    
    // 边框颜色 - 深色模式
    border: 'rgba(255, 255, 255, 0.23)',
  },
  // 自定义色彩调色板 - 深色模式
  customColors: {
    onPrimary: '#1A237E',
    onSecondary: '#1B5E20',
    onTertiary: '#4A148C',
    onError: '#B71C1C',
    onSurface: '#E0E0E0',
    onSurfaceVariant: '#BDBDBD',
    onBackground: '#E0E0E0',
    onPrimaryContainer: '#E1E5FF',
    onSecondaryContainer: '#E8F5E9',
    onTertiaryContainer: '#F3E5F5',
    onErrorContainer: '#FFEBEE',
  },
  // 组件样式自定义 - 深色模式
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          backgroundColor: '#1E1E1E',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          textTransform: 'none',
          fontWeight: 500,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        },
      },
    },
    MuiModal: {
      styleOverrides: {
        root: {
          backdropFilter: 'blur(4px)',
        },
      },
    },
  },
});