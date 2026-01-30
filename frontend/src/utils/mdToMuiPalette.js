/**
 * Material Design 系统颜色到 MUI 调色板的映射工具
 * 将后端返回的 md-sys tokens 转换为 MUI 可用的 palette 格式
 */

/**
 * 将 md-sys tokens 映射为 MUI palette
 * @param {Object} mdTokens - Material Design 系统颜色 tokens
 * @param {String} mode - 主题模式 ('light' | 'dark')
 * @returns {Object} MUI palette 对象
 */
export function mdToMuiPalette(mdTokens, mode = 'light') {
  if (!mdTokens) {
    console.warn('mdTokens 为空，返回默认调色板');
    return getDefaultPalette(mode);
  }

  try {
    // 主色系
    const primary = {
      main: mdTokens.primary || '#1976d2',
      light: adjustColor(mdTokens.primary, 0.2),
      dark: adjustColor(mdTokens.primary, -0.2),
      contrastText: mdTokens.onPrimary || '#ffffff'
    };

    // 主色容器
    const primaryContainer = {
      main: mdTokens.primaryContainer || adjustColor(mdTokens.primary, 0.8),
      contrastText: mdTokens.onPrimaryContainer || '#000000'
    };

    // 辅色系
    const secondary = {
      main: mdTokens.secondary || '#9c27b0',
      light: adjustColor(mdTokens.secondary, 0.2),
      dark: adjustColor(mdTokens.secondary, -0.2),
      contrastText: mdTokens.onSecondary || '#ffffff'
    };

    // 辅色容器
    const secondaryContainer = {
      main: mdTokens.secondaryContainer || adjustColor(mdTokens.secondary, 0.8),
      contrastText: mdTokens.onSecondaryContainer || '#000000'
    };

    // 第三色系
    const tertiary = {
      main: mdTokens.tertiary || '#2196f3',
      light: adjustColor(mdTokens.tertiary, 0.2),
      dark: adjustColor(mdTokens.tertiary, -0.2),
      contrastText: mdTokens.onTertiary || '#ffffff'
    };

    // 第三色容器
    const tertiaryContainer = {
      main: mdTokens.tertiaryContainer || adjustColor(mdTokens.tertiary, 0.8),
      contrastText: mdTokens.onTertiaryContainer || '#000000'
    };

    // 错误色系
    const error = {
      main: mdTokens.error || '#f44336',
      light: adjustColor(mdTokens.error, 0.2),
      dark: adjustColor(mdTokens.error, -0.2),
      contrastText: mdTokens.onError || '#ffffff'
    };

    // 错误容器
    const errorContainer = {
      main: mdTokens.errorContainer || adjustColor(mdTokens.error, 0.8),
      contrastText: mdTokens.onErrorContainer || '#000000'
    };

    // 背景色系
    const background = {
      default: mdTokens.background || (mode === 'dark' ? '#121212' : '#ffffff'),
      paper: mdTokens.surface || (mode === 'dark' ? '#1e1e1e' : '#ffffff')
    };

    // 表面色系
    const surface = {
      main: mdTokens.surface || (mode === 'dark' ? '#1e1e1e' : '#ffffff'),
      contrastText: mdTokens.onSurface || (mode === 'dark' ? '#ffffff' : '#000000')
    };

    // 表面变体
    const surfaceVariant = {
      main: mdTokens.surfaceVariant || (mode === 'dark' ? '#2a2a2a' : '#f5f5f5'),
      contrastText: mdTokens.onSurfaceVariant || (mode === 'dark' ? '#bdbdbd' : '#424242')
    };

    // 文本色系
    const text = {
      primary: mdTokens.onBackground || (mode === 'dark' ? '#ffffff' : '#000000'),
      secondary: mdTokens.onSurfaceVariant || (mode === 'dark' ? '#bdbdbd' : '#424242'),
      disabled: adjustColor(mdTokens.onBackground || (mode === 'dark' ? '#ffffff' : '#000000'), 0.6)
    };

    // 分割线颜色
    const divider = mdTokens.outline || (mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)');

    // 边框颜色
    const border = mdTokens.outlineVariant || (mode === 'dark' ? 'rgba(255, 255, 255, 0.23)' : 'rgba(0, 0, 0, 0.23)');

    // 构建完整的 MUI palette
    const palette = {
      mode,
      primary,
      secondary,
      tertiary,
      error,
      background,
      surface,
      surfaceVariant,
      text,
      divider,
      border,
      // 自定义容器颜色
      primaryContainer,
      secondaryContainer,
      tertiaryContainer,
      errorContainer,
      // 自定义颜色
      customColors: {
        onPrimary: mdTokens.onPrimary || '#ffffff',
        onSecondary: mdTokens.onSecondary || '#ffffff',
        onTertiary: mdTokens.onTertiary || '#ffffff',
        onError: mdTokens.onError || '#ffffff',
        onSurface: mdTokens.onSurface || (mode === 'dark' ? '#ffffff' : '#000000'),
        onSurfaceVariant: mdTokens.onSurfaceVariant || (mode === 'dark' ? '#bdbdbd' : '#424242'),
        onBackground: mdTokens.onBackground || (mode === 'dark' ? '#ffffff' : '#000000'),
        onPrimaryContainer: mdTokens.onPrimaryContainer || '#000000',
        onSecondaryContainer: mdTokens.onSecondaryContainer || '#000000',
        onTertiaryContainer: mdTokens.onTertiaryContainer || '#000000',
        onErrorContainer: mdTokens.onErrorContainer || '#000000'
      }
    };

    return palette;
  } catch (error) {
    console.error('映射 md-sys tokens 到 MUI palette 失败:', error);
    return getDefaultPalette(mode);
  }
}

/**
 * 调整颜色明度
 * @param {String} color - 十六进制颜色
 * @param {Number} amount - 调整量 (-1 到 1)
 * @returns {String} 调整后的颜色
 */
function adjustColor(color, amount) {
  if (!color) {
    console.warn('adjustColor: 颜色值为空，返回输入而非默认黑色');
    return color; // 返回原始输入而不是默认黑色
  }
  
  try {
    // 移除 # 前缀
    const hex = color.replace('#', '');
    
    // 转换为 RGB
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // 调整明度
    const adjust = amount > 0 ? 255 * amount : -255 * Math.abs(amount);
    const newR = Math.max(0, Math.min(255, r + adjust));
    const newG = Math.max(0, Math.min(255, g + adjust));
    const newB = Math.max(0, Math.min(255, b + adjust));
    
    // 转换回十六进制
    const toHex = (n) => {
      const hex = Math.round(n).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    
    return `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`;
  } catch (error) {
    console.warn('调整颜色失败:', color, amount, error);
    return color;
  }
}

/**
 * 获取默认调色板
 * @param {String} mode - 主题模式
 * @returns {Object} 默认 MUI palette
 */
function getDefaultPalette(mode) {
  if (mode === 'dark') {
    return {
      mode: 'dark',
      primary: {
        main: '#90caf9',
        light: '#bbdefb',
        dark: '#64b5f6',
        contrastText: '#000000'
      },
      secondary: {
        main: '#ce93d8',
        light: '#f3e5f5',
        dark: '#ba68c8',
        contrastText: '#000000'
      },
      tertiary: {
        main: '#80deea',
        light: '#b2ebf2',
        dark: '#4dd0e1',
        contrastText: '#000000'
      },
      error: {
        main: '#ef5350',
        light: '#ff8a80',
        dark: '#e53935',
        contrastText: '#000000'
      },
      background: {
        default: '#121212',
        paper: '#1e1e1e'
      },
      surface: {
        main: '#1e1e1e',
        contrastText: '#ffffff'
      },
      surfaceVariant: {
        main: '#2a2a2a',
        contrastText: '#bdbdbd'
      },
      text: {
        primary: '#ffffff',
        secondary: '#bdbdbd',
        disabled: '#616161'
      },
      divider: 'rgba(255, 255, 255, 0.12)',
      border: 'rgba(255, 255, 255, 0.23)'
    };
  } else {
    return {
      mode: 'light',
      primary: {
        main: '#1976d2',
        light: '#42a5f5',
        dark: '#1565c0',
        contrastText: '#ffffff'
      },
      secondary: {
        main: '#9c27b0',
        light: '#ba68c8',
        dark: '#7b1fa2',
        contrastText: '#ffffff'
      },
      tertiary: {
        main: '#2196f3',
        light: '#64b5f6',
        dark: '#1976d2',
        contrastText: '#ffffff'
      },
      error: {
        main: '#f44336',
        light: '#e57373',
        dark: '#d32f2f',
        contrastText: '#ffffff'
      },
      background: {
        default: '#ffffff',
        paper: '#ffffff'
      },
      surface: {
        main: '#ffffff',
        contrastText: '#000000'
      },
      surfaceVariant: {
        main: '#f5f5f5',
        contrastText: '#424242'
      },
      text: {
        primary: '#000000',
        secondary: '#424242',
        disabled: '#bdbdbd'
      },
      divider: 'rgba(0, 0, 0, 0.12)',
      border: 'rgba(0, 0, 0, 0.23)'
    };
  }
}

const mdToMuiPaletteUtils = {
  mdToMuiPalette,
  adjustColor,
  getDefaultPalette,
};

export default mdToMuiPaletteUtils;
