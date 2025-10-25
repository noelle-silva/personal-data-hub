import React, { createContext, useState, useContext, useMemo, useEffect } from 'react';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { GlobalStyles } from '@mui/material';
import { lightTheme, darkTheme } from '../theme';
import { useSelector, useDispatch } from 'react-redux';
import { selectCurrentWallpaper, fetchCurrentWallpaper } from '../store/wallpaperSlice';
import themesService from '../services/themes';
import { mdToMuiPalette } from '../utils/mdToMuiPalette';
import { createTheme } from '@mui/material/styles';
import { buildComponentsOverrides, buildCustomColors } from '../themeOverrides';

// 创建主题上下文
const ThemeContext = createContext();

const GlobalScrollbarStyles = ({ theme, currentWallpaper }) => (
  <GlobalStyles
    styles={{
      '::-webkit-scrollbar': {
        width: '8px',
        height: '8px',
      },
      '::-webkit-scrollbar-track': {
        background: theme.palette.background.default,
      },
      '::-webkit-scrollbar-thumb': {
        background: theme.palette.primary.main,
        borderRadius: '4px',
      },
      '::-webkit-scrollbar-thumb:hover': {
        background: theme.palette.primary.dark,
      },
      'body': {
        scrollbarWidth: 'thin',
        scrollbarColor: `${theme.palette.primary.main} ${theme.palette.background.default}`,
        // 设置背景壁纸
        ...(currentWallpaper && {
          backgroundImage: `url(${currentWallpaper.url})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed',
        }),
      },
      // 确保背景壁纸覆盖整个应用
      '#root': {
        minHeight: '100vh',
        ...(currentWallpaper && {
          backgroundImage: 'inherit',
          backgroundSize: 'inherit',
          backgroundPosition: 'inherit',
          backgroundRepeat: 'inherit',
          backgroundAttachment: 'inherit',
        }),
        // 注入 Material Design 系统颜色 CSS 变量
        ...(theme.palette.customColors && {
          '--md-sys-color-primary': theme.palette.primary.main,
          '--md-sys-color-on-primary': theme.palette.customColors.onPrimary,
          '--md-sys-color-primary-container': theme.palette.primaryContainer.main,
          '--md-sys-color-on-primary-container': theme.palette.customColors.onPrimaryContainer,
          '--md-sys-color-secondary': theme.palette.secondary.main,
          '--md-sys-color-on-secondary': theme.palette.customColors.onSecondary,
          '--md-sys-color-secondary-container': theme.palette.secondaryContainer.main,
          '--md-sys-color-on-secondary-container': theme.palette.customColors.onSecondaryContainer,
          '--md-sys-color-tertiary': theme.palette.tertiary.main,
          '--md-sys-color-on-tertiary': theme.palette.customColors.onTertiary,
          '--md-sys-color-tertiary-container': theme.palette.tertiaryContainer.main,
          '--md-sys-color-on-tertiary-container': theme.palette.customColors.onTertiaryContainer,
          '--md-sys-color-error': theme.palette.error.main,
          '--md-sys-color-on-error': theme.palette.customColors.onError,
          '--md-sys-color-error-container': theme.palette.errorContainer.main,
          '--md-sys-color-on-error-container': theme.palette.customColors.onErrorContainer,
          '--md-sys-color-background': theme.palette.background.default,
          '--md-sys-color-on-background': theme.palette.customColors.onBackground,
          '--md-sys-color-surface': theme.palette.surface.main,
          '--md-sys-color-on-surface': theme.palette.customColors.onSurface,
          '--md-sys-color-surface-variant': theme.palette.surfaceVariant.main,
          '--md-sys-color-on-surface-variant': theme.palette.customColors.onSurfaceVariant,
          '--md-sys-color-outline': theme.palette.divider,
          '--md-sys-color-outline-variant': theme.palette.border,
          '--md-sys-color-shadow': theme.palette.customColors.shadow || '#000000',
          '--md-sys-color-scrim': theme.palette.customColors.scrim || '#000000',
          '--md-sys-color-inverse-surface': theme.palette.customColors.inverseSurface || '#ffffff',
          '--md-sys-color-inverse-on-surface': theme.palette.customColors.inverseOnSurface || '#000000',
          '--md-sys-color-inverse-primary': theme.palette.customColors.inversePrimary || '#000000',
        }),
      },
    }}
  />
);

// 自定义主题提供者组件
export const ThemeProvider = ({ children }) => {
  const dispatch = useDispatch();
  const currentWallpaper = useSelector(selectCurrentWallpaper);
  
  // 从localStorage获取保存的主题模式，默认为light
  const [mode, setMode] = useState(() => {
    const savedMode = localStorage.getItem('themeMode');
    return savedMode || 'light';
  });

  // 动态主题开关状态，默认开启
  const [dynamicColorsEnabled, setDynamicColorsEnabled] = useState(() => {
    const saved = localStorage.getItem('dynamicColorsEnabled');
    return saved !== null ? JSON.parse(saved) : true;
  });

  // 选中的主题变体，默认为tonalSpot
  const [selectedVariant, setSelectedVariant] = useState(() => {
    const saved = localStorage.getItem('selectedVariant');
    return saved || 'tonalSpot';
  });

  // 当前主题颜色数据
  const [themeColors, setThemeColors] = useState(null);
  const [themeLoading, setThemeLoading] = useState(false);

  // 根据模式选择主题
  const theme = useMemo(() => {
    // 如果启用了动态主题且有主题颜色数据，使用动态主题
    if (dynamicColorsEnabled && themeColors && themeColors.schemes && themeColors.schemes[selectedVariant]) {
      try {
        const mdTokens = themeColors.schemes[selectedVariant][mode];
        console.log(`创建动态主题，变体: ${selectedVariant}, 模式: ${mode}`, mdTokens);
        const dynamicPalette = mdToMuiPalette(mdTokens, mode);
        
        // 创建基础动态主题
        const dynamicTheme = createTheme({
          palette: dynamicPalette,
          // 使用基于 palette 的组件样式覆盖
          components: buildComponentsOverrides({ palette: dynamicPalette, mode }),
          // 添加自定义颜色
          customColors: buildCustomColors({ palette: dynamicPalette, mode })
        });
        
        console.log('动态主题创建成功');
        return dynamicTheme;
      } catch (error) {
        console.error('创建动态主题失败:', error);
        // 失败时回退到静态主题
      }
    }
    
    // 回退到静态主题，但也要应用组件样式构建器
    console.log('使用静态主题，模式:', mode);
    const baseTheme = mode === 'light' ? lightTheme : darkTheme;
    return createTheme({
      ...baseTheme,
      // 使用基于 palette 的组件样式覆盖替换静态覆盖
      components: buildComponentsOverrides(baseTheme),
      // 确保自定义颜色也正确设置
      customColors: buildCustomColors(baseTheme)
    });
  }, [mode, dynamicColorsEnabled, themeColors, selectedVariant]);

  // 加载主题颜色数据
  const loadThemeColors = async () => {
    if (!dynamicColorsEnabled) {
      setThemeColors(null);
      return;
    }

    try {
      setThemeLoading(true);
      const colors = await themesService.getCurrentColors();
      console.log('加载到的主题颜色数据:', colors);
      
      if (themesService.isValidThemeData(colors)) {
        setThemeColors(colors);
        console.log('主题颜色数据验证通过，已应用');
      } else {
        console.warn('主题颜色数据无效:', colors);
        setThemeColors(null);
      }
    } catch (error) {
      console.error('加载主题颜色失败:', error);
      setThemeColors(null);
    } finally {
      setThemeLoading(false);
    }
  };

  // 重新生成主题颜色
  const regenerateThemeColors = async (wallpaperId) => {
    try {
      setThemeLoading(true);
      console.log('开始重新生成主题颜色，壁纸ID:', wallpaperId);
      const colors = await themesService.regenerateColors(wallpaperId);
      console.log('重新生成的主题颜色数据:', colors);
      
      if (themesService.isValidThemeData(colors)) {
        setThemeColors(colors);
        console.log('重新生成的主题颜色数据验证通过，已应用');
      } else {
        console.warn('重新生成的主题颜色数据无效:', colors);
      }
    } catch (error) {
      console.error('重新生成主题颜色失败:', error);
    } finally {
      setThemeLoading(false);
    }
  };

  // 切换主题模式
  const toggleColorMode = () => {
    const newMode = mode === 'light' ? 'dark' : 'light';
    setMode(newMode);
    localStorage.setItem('themeMode', newMode);
  };

  // 设置特定主题模式
  const setColorMode = (newMode) => {
    if (newMode === 'light' || newMode === 'dark') {
      setMode(newMode);
      localStorage.setItem('themeMode', newMode);
    }
  };

  // 切换动态主题开关
  const toggleDynamicColors = () => {
    const newEnabled = !dynamicColorsEnabled;
    setDynamicColorsEnabled(newEnabled);
    localStorage.setItem('dynamicColorsEnabled', JSON.stringify(newEnabled));
  };

  // 设置动态主题开关
  const setDynamicColors = (enabled) => {
    setDynamicColorsEnabled(enabled);
    localStorage.setItem('dynamicColorsEnabled', JSON.stringify(enabled));
  };

  // 设置主题变体
  const setThemeVariant = (variant) => {
    setSelectedVariant(variant);
    localStorage.setItem('selectedVariant', variant);
  };

  // 组件挂载时获取当前壁纸和主题颜色
  useEffect(() => {
    dispatch(fetchCurrentWallpaper());
  }, [dispatch]);

  // 当动态主题开关或当前壁纸变化时，重新加载主题颜色
  useEffect(() => {
    if (currentWallpaper) {
      loadThemeColors();
    }
  }, [dynamicColorsEnabled, currentWallpaper]);

  const value = {
    mode,
    theme,
    toggleColorMode,
    setColorMode,
    isLight: mode === 'light',
    isDark: mode === 'dark',
    currentWallpaper,
    // 动态主题相关
    dynamicColorsEnabled,
    setDynamicColors,
    toggleDynamicColors,
    selectedVariant,
    setThemeVariant,
    themeColors,
    themeLoading,
    regenerateThemeColors,
    loadThemeColors,
    availableVariants: themesService.getAvailableVariants(),
    getVariantDisplayName: themesService.getVariantDisplayName
  };

  return (
    <ThemeContext.Provider value={value}>
      <MuiThemeProvider theme={theme}>
        <GlobalScrollbarStyles theme={theme} currentWallpaper={currentWallpaper} />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

// 自定义hook用于使用主题上下文
export const useThemeContext = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext;