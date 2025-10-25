import React, { createContext, useState, useContext, useMemo, useEffect } from 'react';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { GlobalStyles } from '@mui/material';
import { lightTheme, darkTheme } from '../theme';
import { useSelector, useDispatch } from 'react-redux';
import { selectCurrentWallpaper, fetchCurrentWallpaper } from '../store/wallpaperSlice';

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

  // 根据模式选择主题
  const theme = useMemo(() =>
    mode === 'light' ? lightTheme : darkTheme,
    [mode]
  );

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

  // 组件挂载时获取当前壁纸
  useEffect(() => {
    dispatch(fetchCurrentWallpaper());
  }, [dispatch]);

  const value = {
    mode,
    theme,
    toggleColorMode,
    setColorMode,
    isLight: mode === 'light',
    isDark: mode === 'dark',
    currentWallpaper,
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