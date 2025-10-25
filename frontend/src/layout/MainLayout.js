import React, { useState, useEffect } from 'react';
import {
  AppBar,
  Box,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { Outlet } from 'react-router-dom';
import { styled } from '@mui/material/styles';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Note as NoteIcon,
  LocalOffer as LocalOfferIcon,
  FormatQuote as FormatQuoteIcon,
  AttachFile as AttachFileIcon,
  VideoLibrary as VideoIcon,
  BugReport as BugReportIcon,
  Settings as SettingsIcon,
  CollectionsBookmark as CollectionsBookmarkIcon,
  SmartToy as SmartToyIcon,
} from '@mui/icons-material';
import { NavLink, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import ThemeToggle from '../components/ThemeToggle';
import GlobalSearch from '../components/GlobalSearch';
import DocumentWindowsContainer from '../components/DocumentWindowsContainer';
import { closeDropdown } from '../store/searchSlice';
import {
  openDocumentModal,
  fetchDocumentById
} from '../store/documentsSlice';
import {
  openWindowAndFetch,
  openQuoteWindowAndFetch
} from '../store/windowsSlice';
import { selectAllPages } from '../store/customPagesSlice';
import {
  selectVideoTestEnabled,
  selectInteractiveTestEnabled,
  selectCustomPagesEnabled,
  selectCustomPagesVisibility,
} from '../store/settingsSlice';

// 样式化的应用栏
const StyledAppBar = styled(AppBar)(({ theme }) => ({
  background: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  zIndex: theme.zIndex.drawer + 1,
  transition: theme.transitions.create(['width', 'margin'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
}));

// 样式化的工具栏
const StyledToolbar = styled(Toolbar)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
}));

// 样式化的主容器
const MainContainer = styled(Box)(({ theme }) => ({
  backgroundColor: 'transparent',
  transition: 'background-color 0.3s ease',
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
}));

// 版本信息样式
const VersionText = styled(Typography)(({ theme }) => ({
  opacity: 0.8,
  fontSize: '0.875rem',
  [theme.breakpoints.down('sm')]: {
    display: 'none',
  },
}));

// 固定导航项数据
const fixedNavigationItems = [
  {
    text: '首页',
    path: '/',
    icon: <DashboardIcon />,
  },
  {
    text: '笔记管理',
    path: '/笔记',
    icon: <NoteIcon />,
  },
  {
    text: '标签筛选',
    path: '/标签筛选',
    icon: <LocalOfferIcon />,
  },
  {
    text: '引用体',
    path: '/引用体',
    icon: <FormatQuoteIcon />,
  },
  {
    text: '附件',
    path: '/附件',
    icon: <AttachFileIcon />,
  },
  {
    text: '视频测试',
    path: '/视频测试',
    icon: <VideoIcon />,
  },
  {
    text: '交互测试',
    path: '/交互测试',
    icon: <BugReportIcon />,
  },
  {
    text: 'AI Chat',
    path: '/AI-Chat',
    icon: <SmartToyIcon />,
  },
  {
    text: '设置',
    path: '/设置',
    icon: <SettingsIcon />,
  },
];

// 抽屉宽度
const drawerWidth = 240;

const MainLayout = () => {
  const theme = useTheme();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const dispatch = useDispatch();
  const customPages = useSelector(selectAllPages);
  const videoTestEnabled = useSelector(selectVideoTestEnabled);
  const interactiveTestEnabled = useSelector(selectInteractiveTestEnabled);
  const customPagesEnabled = useSelector(selectCustomPagesEnabled);
  const customPagesVisibility = useSelector(selectCustomPagesVisibility);

  // 处理抽屉开关
  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  // 处理ESC键关闭抽屉
  useEffect(() => {
    const handleEsc = (event) => {
      if (event.keyCode === 27 && mobileOpen && isMobile) {
        setMobileOpen(false);
      }
    };

    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [mobileOpen, isMobile]);

  // 处理断点切换时关闭搜索下拉
  useEffect(() => {
    dispatch(closeDropdown());
  }, [isMobile, dispatch]);

  // 处理来自 iframe 的 tab-action 事件
  useEffect(() => {
    const handleTabAction = (event) => {
      // 增加 origin 校验，只接受同源消息
      const allowedOrigins = [
        window.location.origin,
        // 如果需要，可以添加其他允许的源
      ];
      
      // 对于 HTML 沙盒，允许 null origin（srcdoc 场景）
      const isHtmlSandboxMessage = event.data &&
                                  event.data.source === 'html-sandbox' &&
                                  event.data.id &&
                                  event.data.id.startsWith('html-sandbox-');
      
      if (!allowedOrigins.includes(event.origin) && !isHtmlSandboxMessage) {
        console.warn('MainLayout: 收到来自未知源的消息，已忽略', event.origin);
        return;
      }
      
      // 验证消息来源和格式 - 处理 open-document 动作
      if (event.data &&
          event.data.type === 'tab-action' &&
          event.data.action === 'open-document' &&
          event.data.docId) {
        
        console.debug('MainLayout: 收到 tab-action 事件', {
          source: event.source,
          origin: event.origin,
          data: event.data
        });

        // 使用多窗口系统打开文档
        const handleOpenDocument = async (docId, label, source) => {
          try {
            console.debug('MainLayout: 开始打开文档窗口', { docId, label, source });
            
            // 使用新的 openWindowAndFetch thunk，原子化创建窗口和获取文档
            await dispatch(openWindowAndFetch({
              docId,
              label: label || '加载中...',
              source: source || 'tab-action'
            })).unwrap();
            
            console.debug('MainLayout: 文档窗口打开成功', { docId });
          } catch (error) {
            console.error('MainLayout: 打开文档失败', {
              docId,
              error: error.message,
              stack: error.stack
            });
            
            // 如果是网络或服务器错误，提供更友好的错误提示
            if (error.message?.includes('404') || error.message?.includes('500')) {
              alert('打开文档失败，请稍后重试');
            }
          }
        };

        handleOpenDocument(event.data.docId, event.data.label, event.data.source);
      }
      
      // 验证消息来源和格式 - 处理 open-quote 动作
      else if (event.data &&
               event.data.type === 'tab-action' &&
               event.data.action === 'open-quote' &&
               event.data.quoteId) {
        
        console.debug('MainLayout: 收到 tab-action 事件（open-quote）', {
          source: event.source,
          origin: event.origin,
          data: event.data
        });

        // 使用多窗口系统打开引用体
        const handleOpenQuote = async (quoteId, label, source) => {
          try {
            console.debug('MainLayout: 开始打开引用体窗口', { quoteId, label, source });
            
            // 使用 openQuoteWindowAndFetch thunk，原子化创建窗口和获取引用体
            await dispatch(openQuoteWindowAndFetch({
              quoteId,
              label: label || '加载中...',
              source: source || 'tab-action'
            })).unwrap();
            
            console.debug('MainLayout: 引用体窗口打开成功', { quoteId });
          } catch (error) {
            console.error('MainLayout: 打开引用体失败', {
              quoteId,
              error: error.message,
              stack: error.stack
            });
            
            // 如果是网络或服务器错误，提供更友好的错误提示
            if (error.message?.includes('404') || error.message?.includes('500')) {
              alert('打开引用体失败，请稍后重试');
            }
          }
        };

        handleOpenQuote(event.data.quoteId, event.data.label, event.data.source);
      }
      
      else if (event.data && event.data.type === 'tab-action') {
        // 记录无效的 tab-action 消息，便于调试
        console.warn('MainLayout: 收到格式不正确的 tab-action 消息', {
          data: event.data,
          requiredFields: ['action', 'docId 或 quoteId'],
          providedFields: {
            action: event.data.action,
            docId: event.data.docId,
            quoteId: event.data.quoteId
          }
        });
      }
    };

    // 注册消息监听器
    window.addEventListener('message', handleTabAction);

    // 清理函数
    return () => {
      window.removeEventListener('message', handleTabAction);
    };
  }, [dispatch]);

  // 生成动态导航项
  const navigationItems = React.useMemo(() => {
    // 根据功能开关状态过滤固定导航项
    const filteredFixedItems = fixedNavigationItems.filter(item => {
      if (item.text === '视频测试' && !videoTestEnabled) {
        return false;
      }
      if (item.text === '交互测试' && !interactiveTestEnabled) {
        return false;
      }
      return true;
    });

    // 只有在自定义页面功能开启时才生成自定义页面项
    const visibility = customPagesVisibility || {}; // 防御性编程，防止 undefined
    const customPageItems = customPagesEnabled ? customPages.filter(page => {
      // 检查逐页开关状态，未映射的默认为 true
      return visibility[page._id] !== false;
    }).map(page => ({
      text: page.name,
      path: `/自定义/${encodeURIComponent(page.name)}`,
      icon: <CollectionsBookmarkIcon />,
    })) : [];
    
    // 找到"设置"项的位置
    const settingsIndex = filteredFixedItems.findIndex(item => item.text === '设置');
    
    // 如果找到"设置"项，在其前面插入自定义页面
    if (settingsIndex !== -1) {
      const newItems = [...filteredFixedItems];
      newItems.splice(settingsIndex, 0, ...customPageItems);
      return newItems;
    }
    
    // 如果没找到"设置"项，直接追加到末尾
    return [...filteredFixedItems, ...customPageItems];
  }, [customPages, videoTestEnabled, interactiveTestEnabled, customPagesEnabled, customPagesVisibility]);

  // 获取当前页面标题
  const getPageTitle = React.useCallback(() => {
    const currentPath = location.pathname;
    
    // 检查是否是自定义页面路径
    if (currentPath.startsWith('/自定义/')) {
      const pageName = decodeURIComponent(currentPath.replace('/自定义/', ''));
      const customPage = customPages.find(page => page.name === pageName);
      if (customPage) {
        return customPage.name;
      }
    }
    
    // 检查固定导航项
    const currentItem = fixedNavigationItems.find(item => item.path === currentPath);
    return currentItem ? currentItem.text : '学习笔记管理系统';
  }, [location.pathname, customPages]);

  // 抽屉内容
  const drawerContent = (
    <Box>
      <Toolbar />
      <List sx={{ px: 1 }}>
        {navigationItems.map((item) => (
          <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              component={NavLink}
              to={item.path}
              aria-label={`导航到${item.text}页面`}
              sx={{
                borderRadius: 16,
                '&.active': {
                  backgroundColor: theme.palette.primaryContainer.main,
                  color: theme.palette.primaryContainer.contrastText,
                  '& .MuiListItemIcon-root': {
                    color: theme.palette.primaryContainer.contrastText,
                  },
                },
                '&:hover': {
                  backgroundColor: theme.palette.action.hover,
                },
              }}
              onClick={() => {
                if (isMobile) {
                  setMobileOpen(false);
                }
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 40,
                  color: 'inherit',
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.text}
                primaryTypographyProps={{
                  fontWeight: 'medium',
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  // 设置页面标题
  useEffect(() => {
    document.title = getPageTitle();
  }, [getPageTitle]);

  return (
    <MainContainer>
      {/* 顶部导航栏 */}
      <StyledAppBar position="fixed" elevation={2}>
        <StyledToolbar>
          {/* 左侧区域 */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* 移动端菜单按钮 */}
            {isMobile && (
              <IconButton
                color="inherit"
                aria-label={mobileOpen ? "关闭导航菜单" : "打开导航菜单"}
                aria-expanded={mobileOpen}
                onClick={handleDrawerToggle}
                edge="start"
                sx={{
                  borderRadius: 16,
                }}
              >
                <MenuIcon />
              </IconButton>
            )}
            
            {/* 页面标题 */}
            <Typography
              variant="h5"
              component="div"
              sx={{
                fontWeight: 'bold',
                letterSpacing: '0.5px',
              }}
            >
              {getPageTitle()}
            </Typography>
            
            {/* 版本信息 - 在大屏显示 */}
            <VersionText variant="body2" sx={{ display: { xs: 'none', sm: 'block' } }}>
              v0.1.0
            </VersionText>
          </Box>
          
          {/* 中间区域 - 搜索框 */}
          {!isMobile && (
            <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', mx: 2 }}>
              <GlobalSearch />
            </Box>
          )}
          
          {/* 右侧区域 */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ThemeToggle />
          </Box>
        </StyledToolbar>
      </StyledAppBar>

      {/* 顶部导航栏占位符 */}
      <Toolbar />

      {/* 侧边导航栏 */}
      <Box sx={{ display: 'flex', flexGrow: 1 }}>
        {/* 移动端临时抽屉 */}
        {isMobile && (
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={handleDrawerToggle}
            ModalProps={{
              keepMounted: true, // 更好的移动端性能
            }}
            sx={{
              '& .MuiDrawer-paper': {
                boxSizing: 'border-box',
                width: drawerWidth,
                borderRight: `1px solid ${theme.palette.border}`,
              },
            }}
          >
            <Box
              role="navigation"
              aria-label="主导航菜单"
              sx={{ height: '100%' }}
            >
              {drawerContent}
            </Box>
          </Drawer>
        )}

        {/* 桌面端永久抽屉 */}
        {!isMobile && (
          <Drawer
            variant="permanent"
            sx={{
              width: drawerWidth,
              flexShrink: 0,
              '& .MuiDrawer-paper': {
                width: drawerWidth,
                boxSizing: 'border-box',
                borderRight: `1px solid ${theme.palette.border}`,
              },
            }}
            open
          >
            <Box
              role="navigation"
              aria-label="主导航菜单"
              sx={{ height: '100%' }}
            >
              {drawerContent}
            </Box>
          </Drawer>
        )}

        {/* 主内容区域 */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 3,
            width: { md: `calc(100% - ${drawerWidth}px)` },
            minHeight: '100vh',
          }}
        >
          {/* 移动端搜索框 - 在小屏显示 */}
          {isMobile && <Box sx={{ mb: 2 }}><GlobalSearch /></Box>}
          
          <Outlet />
        </Box>
      </Box>
      
      {/* 多窗口容器 */}
      <DocumentWindowsContainer />
    </MainContainer>
  );
};

export default MainLayout;