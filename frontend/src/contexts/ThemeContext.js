import React, { createContext, useState, useContext, useMemo, useEffect, useCallback } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme, alpha } from '@mui/material/styles';
import { GlobalStyles } from '@mui/material';
import { lightTheme, darkTheme } from '../theme';
import { useSelector, useDispatch } from 'react-redux';
import { selectCurrentWallpaper, fetchCurrentWallpaper } from '../store/wallpaperSlice';
import themesService from '../services/themes';
import { getThemePresetById } from '../services/themePresets';
import { mdToMuiPalette } from '../utils/mdToMuiPalette';
import { buildComponentsOverrides, buildCustomColors } from '../themeOverrides';

// 创建主题上下文
const ThemeContext = createContext();

const SCROLLBARS_VISIBLE_CLASS = 'pdh-scrollbars-visible';
const APPLIED_THEME_PRESET_ID_KEY = 'pdh_applied_theme_preset_id';

const GlobalScrollbarStyles = ({ theme, currentWallpaper }) => {
  const thumbColor = alpha(theme.palette.primary.main, 0.55);
  const thumbHoverColor = alpha(theme.palette.primary.dark, 0.75);

  return (
    <GlobalStyles
      styles={{
        '::-webkit-scrollbar': {
          width: '8px',
          height: '8px',
        },
        '::-webkit-scrollbar-track': {
          background: 'transparent',
        },
        '::-webkit-scrollbar-thumb': {
          background: 'transparent',
          borderRadius: '4px',
        },
        '::-webkit-scrollbar-thumb:hover': {
          background: 'transparent',
        },
        '::-webkit-scrollbar-corner': {
          background: 'transparent',
        },

        // hover / focus-within 显示滚动条（所有可滚动容器）
        '*:hover::-webkit-scrollbar-thumb': {
          background: thumbColor,
        },
        '*:hover::-webkit-scrollbar-thumb:hover': {
          background: thumbHoverColor,
        },
        '*:focus-within::-webkit-scrollbar-thumb': {
          background: thumbColor,
        },
        '*:focus-within::-webkit-scrollbar-thumb:hover': {
          background: thumbHoverColor,
        },

        // 滚动时显示滚动条（通过 JS 给 html 加 class）
        [`html.${SCROLLBARS_VISIBLE_CLASS} *::-webkit-scrollbar-thumb`]: {
          background: thumbColor,
        },
        [`html.${SCROLLBARS_VISIBLE_CLASS} *::-webkit-scrollbar-thumb:hover`]: {
          background: thumbHoverColor,
        },

        // Firefox：默认隐藏（透明），hover / 滚动时显示（所有可滚动容器）
        '*': {
          scrollbarWidth: 'thin',
          scrollbarColor: 'transparent transparent',
        },
        '*:hover': {
          scrollbarColor: `${thumbColor} transparent`,
        },
        '*:focus-within': {
          scrollbarColor: `${thumbColor} transparent`,
        },
        [`html.${SCROLLBARS_VISIBLE_CLASS} *`]: {
          scrollbarColor: `${thumbColor} transparent`,
        },

        'body': {
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
};

// 自定义主题提供者组件
export const ThemeProvider = ({ children }) => {
  const dispatch = useDispatch();
  const currentWallpaper = useSelector(selectCurrentWallpaper);

  // 仅做 UI 表现：滚动时短暂显示滚动条（全局所有可滚动容器）
  useEffect(() => {
    let timeoutId = null;
    let rafId = null;

    const showScrollbarsTemporarily = () => {
      const root = document.documentElement;
      root.classList.add(SCROLLBARS_VISIBLE_CLASS);

      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }

      timeoutId = window.setTimeout(() => {
        root.classList.remove(SCROLLBARS_VISIBLE_CLASS);
        timeoutId = null;
      }, 700);
    };

    const handleScroll = () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }

      rafId = requestAnimationFrame(() => {
        rafId = null;
        showScrollbarsTemporarily();
      });
    };

    document.addEventListener('scroll', handleScroll, { capture: true, passive: true });

    return () => {
      document.removeEventListener('scroll', handleScroll, true);
      if (timeoutId) window.clearTimeout(timeoutId);
      if (rafId) cancelAnimationFrame(rafId);
      document.documentElement.classList.remove(SCROLLBARS_VISIBLE_CLASS);
    };
  }, []);
  
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

  // 本地配色预设（可脱离后端使用）
  const [appliedThemePresetId, setAppliedThemePresetId] = useState(() => {
    try {
      return (localStorage.getItem(APPLIED_THEME_PRESET_ID_KEY) || '').trim();
    } catch {
      return '';
    }
  });
  const [appliedThemePreset, setAppliedThemePreset] = useState(null);

  // 当前主题颜色数据
  const [themeColors, setThemeColors] = useState(null);
  const [themeLoading, setThemeLoading] = useState(false);

  const clearThemePreset = useCallback(() => {
    setAppliedThemePresetId('');
    setAppliedThemePreset(null);
    try {
      localStorage.removeItem(APPLIED_THEME_PRESET_ID_KEY);
    } catch {
      // ignore
    }
  }, []);

  const applyThemePreset = useCallback((preset) => {
    const id = typeof preset?.id === 'string' ? preset.id.trim() : '';
    const payload = preset?.payload;
    if (!id || !payload?.themeColors) return;

    setAppliedThemePresetId(id);
    setAppliedThemePreset(preset);

    try {
      localStorage.setItem(APPLIED_THEME_PRESET_ID_KEY, id);
    } catch {
      // ignore
    }
  }, []);

  // 根据模式选择主题
  const theme = useMemo(() => {
    // 如果启用了动态主题且有主题颜色数据，使用动态主题
    const hasDynamicThemeData = themeColors && themeColors.schemes && themeColors.schemes[selectedVariant];
    const shouldUseDynamicTheme = hasDynamicThemeData && (dynamicColorsEnabled || !!appliedThemePresetId);
    if (shouldUseDynamicTheme) {
      try {
        const mdTokens = themeColors.schemes[selectedVariant][mode];
        
        // 检查 mdTokens 的有效性，防止全黑问题
        const isValidTokens = validateMdTokens(mdTokens);
        if (!isValidTokens) {
          console.warn(`动态主题 tokens 无效，回退到静态主题。变体: ${selectedVariant}, 模式: ${mode}`, mdTokens);
        } else {
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
        }
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
  }, [mode, dynamicColorsEnabled, themeColors, selectedVariant, appliedThemePresetId]);

  // 加载主题颜色数据
  const loadThemeColors = useCallback(async () => {
    if (!dynamicColorsEnabled) {
      setThemeColors(null);
      return;
    }

    if (appliedThemePresetId) {
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
  }, [dynamicColorsEnabled, appliedThemePresetId]);

  // 重新生成主题颜色
  const regenerateThemeColors = async (wallpaperId) => {
    clearThemePreset();
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

  // 组件挂载时获取当前壁纸和主题颜色（仅在已认证时）
  useEffect(() => {
    dispatch(fetchCurrentWallpaper());
  }, [dispatch]);

  // 当动态主题开关或当前壁纸变化时，重新加载主题颜色（仅在已认证时）
  useEffect(() => {
    if (appliedThemePresetId) return;
    if (currentWallpaper) {
      loadThemeColors();
    }
  }, [dynamicColorsEnabled, currentWallpaper, loadThemeColors, appliedThemePresetId]);

  // 应用本地配色预设：加载 preset 并覆盖当前动态主题颜色
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const id = (appliedThemePresetId || '').trim();
      if (!id) {
        setAppliedThemePreset(null);
        return;
      }

      if (appliedThemePreset?.id === id) return;

      try {
        const preset = await getThemePresetById(id);
        if (cancelled) return;

        if (!preset) {
          clearThemePreset();
          return;
        }

        setAppliedThemePreset(preset);
      } catch (e) {
        console.warn('加载本地配色预设失败：', e);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [appliedThemePresetId, appliedThemePreset, clearThemePreset]);

  useEffect(() => {
    if (!appliedThemePresetId) return;

    const payload = appliedThemePreset?.payload;
    const presetColors = payload?.themeColors;
    if (!presetColors) return;

    // 确保动态主题开启，且变体保持一致
    const presetVariant = typeof payload.selectedVariant === 'string' ? payload.selectedVariant : '';
    if (presetVariant) {
      setSelectedVariant(presetVariant);
      try {
        localStorage.setItem('selectedVariant', presetVariant);
      } catch {
        // ignore
      }
    }

    setThemeColors(presetColors);
  }, [appliedThemePresetId, appliedThemePreset]);

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
    getVariantDisplayName: themesService.getVariantDisplayName,
    // 本地配色预设
    appliedThemePresetId,
    applyThemePreset,
    clearThemePreset,
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

/**
 * 验证 mdTokens 的有效性
 * @param {Object} mdTokens - Material Design 系统颜色 tokens
 * @returns {Boolean} 是否有效
 */
function validateMdTokens(mdTokens) {
  if (!mdTokens || typeof mdTokens !== 'object') {
    return false;
  }
  
  // 检查关键颜色是否全为黑色或缺失
  const criticalColors = ['primary', 'background', 'surface', 'onBackground', 'onSurface'];
  const blackCount = criticalColors.filter(color =>
    !mdTokens[color] || mdTokens[color] === '#000000'
  ).length;
  
  // 如果超过一半的关键颜色是黑色或缺失，认为无效
  if (blackCount > criticalColors.length / 2) {
    console.warn(`检测到 ${blackCount}/${criticalColors.length} 个关键颜色为黑色或缺失:`,
      criticalColors.map(color => `${color}: ${mdTokens[color] || 'missing'}`));
    return false;
  }
  
  // 检查是否所有颜色都是黑色（全黑问题）
  const allColors = Object.values(mdTokens);
  const blackColorsCount = allColors.filter(color => color === '#000000').length;
  
  if (blackColorsCount > allColors.length * 0.8) { // 80%以上是黑色
    console.warn(`检测到可能的颜色全黑问题: ${blackColorsCount}/${allColors.length} 个颜色为黑色`);
    return false;
  }
  
  return true;
}

export default ThemeContext;
