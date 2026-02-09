import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Container, Tab, Tabs } from '@mui/material';
import { useSelector } from 'react-redux';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import ShortcutSettingsPanel from '../../components/ShortcutSettingsPanel';
import { PageTitle } from './components/SettingsShell';
import BackendServerSettingsCard from './sections/BackendServerSettingsCard';
import AttachmentServerSettingsCard from './sections/AttachmentServerSettingsCard';
import CustomPagesSettingsCard from './sections/CustomPagesSettingsCard';
import AppearanceSettingsCard from './sections/AppearanceSettingsCard';
import ThemePreviewCard from './sections/ThemePreviewCard';
import WallpaperManagementCard from './sections/WallpaperManagementCard';
import TransparencySettingsCard from './sections/TransparencySettingsCard';
import ClipboardSettingsCard from './sections/ClipboardSettingsCard';
import DetailSidebarSettingsCard from './sections/DetailSidebarSettingsCard';
import AiSettingsSection from './sections/AiSettingsSection';
import DataManagementCard from './sections/DataManagementCard';
import LocalDataSettingsCard from './sections/LocalDataSettingsCard';
import AboutAppCard from './sections/AboutAppCard';
import AccountManagementCard from './sections/AccountManagementCard';
import DeveloperInfoCard from './sections/DeveloperInfoCard';
import { selectIsAuthenticated } from '../../store/authSlice';

const SETTINGS_TAB_STORAGE_KEY = 'pdh-settings-tab';

const TabPanel = ({ activeKey, tabKey, children }) => {
  const hidden = activeKey !== tabKey;
  return (
    <Box
      role="tabpanel"
      hidden={hidden}
      id={`settings-tabpanel-${tabKey}`}
      aria-labelledby={`settings-tab-${tabKey}`}
      sx={{ pt: 2 }}
    >
      {hidden ? null : children}
    </Box>
  );
};

const SettingsPage = () => {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabs = useMemo(
    () => [
      { key: 'server', label: '服务器管理' },
      { key: 'ui', label: '界面' },
      { key: 'shortcuts', label: '快捷键' },
      { key: 'ai', label: 'AI 设置' },
      { key: 'productivity', label: '效率' },
      { key: 'features', label: '功能' },
      { key: 'data', label: '数据' },
      { key: 'about', label: '关于' },
    ],
    []
  );

  const [activeTabKey, setActiveTabKey] = useState(() => {
    const fromUrl = searchParams.get('tab');
    if (fromUrl) return fromUrl;
    const fromStorage = localStorage.getItem(SETTINGS_TAB_STORAGE_KEY);
    return fromStorage || 'server';
  });

  const normalizedActiveTabKey = useMemo(() => {
    if (tabs.some((t) => t.key === activeTabKey)) return activeTabKey;
    return tabs[0]?.key || 'server';
  }, [activeTabKey, tabs]);

  const activeTabIndex = useMemo(() => {
    const idx = tabs.findIndex((t) => t.key === normalizedActiveTabKey);
    return idx >= 0 ? idx : 0;
  }, [normalizedActiveTabKey, tabs]);

  useEffect(() => {
    const from = location?.state?.from;
    const reason = location?.state?.reason;
    if (!isAuthenticated) return;
    if (!from || !reason) return;
    // 仅在“被引导到设置页”时，登录成功后自动回到原页面
    navigate(from.pathname || '/', { replace: true });
  }, [isAuthenticated, location?.state, navigate]);

  useEffect(() => {
    const fromUrl = searchParams.get('tab');
    if (!fromUrl) return;

    const nextKey = tabs.some((t) => t.key === fromUrl) ? fromUrl : (tabs[0]?.key || 'server');
    setActiveTabKey((prev) => (prev === nextKey ? prev : nextKey));
  }, [searchParams, tabs]);

  useEffect(() => {
    if (normalizedActiveTabKey !== activeTabKey) {
      setActiveTabKey(normalizedActiveTabKey);
      return;
    }

    localStorage.setItem(SETTINGS_TAB_STORAGE_KEY, normalizedActiveTabKey);

    const nextParams = new URLSearchParams(searchParams);
    if (nextParams.get('tab') === normalizedActiveTabKey) return;
    nextParams.set('tab', normalizedActiveTabKey);
    setSearchParams(nextParams, { replace: true });
  }, [activeTabKey, normalizedActiveTabKey, searchParams, setSearchParams]);

  return (
    <Container maxWidth="md">
      <PageTitle variant="h3" component="h1">
        系统设置
      </PageTitle>

      {!isAuthenticated && (
        <Alert severity="info" sx={{ mb: 2 }}>
          当前未连接服务器或未登录。请先在“服务器管理”中添加/切换服务器并登录；需要后端权限的设置项会在登录后显示。
        </Alert>
      )}

      <Box
        sx={(theme) => ({
          position: 'sticky',
          top: 0,
          zIndex: theme.zIndex.appBar,
          pt: 1,
          pb: 1,
        })}
      >
        <Box
          sx={(theme) => ({
            borderRadius: 999,
            border: `1px solid ${theme.palette.divider}`,
            bgcolor: theme.palette.background.paper,
            overflow: 'hidden',
          })}
        >
          <Tabs
            value={activeTabIndex}
            onChange={(_, nextIndex) => setActiveTabKey(tabs[nextIndex]?.key || 'server')}
            variant="scrollable"
            allowScrollButtonsMobile
            aria-label="设置栏目切换"
            sx={{
              minHeight: 44,
              '& .MuiTab-root': { minHeight: 44 },
            }}
            TabIndicatorProps={{
              sx: { height: 3, borderRadius: 999 },
            }}
          >
            {tabs.map((t) => (
              <Tab
                key={t.key}
                label={t.label}
                id={`settings-tab-${t.key}`}
                aria-controls={`settings-tabpanel-${t.key}`}
              />
            ))}
          </Tabs>
        </Box>
      </Box>

      <TabPanel activeKey={normalizedActiveTabKey} tabKey="server">
        <BackendServerSettingsCard />
        <AccountManagementCard />
        {isAuthenticated ? <AttachmentServerSettingsCard /> : null}
      </TabPanel>

      <TabPanel activeKey={normalizedActiveTabKey} tabKey="ui">
        <WallpaperManagementCard />
        <AppearanceSettingsCard />
        <ThemePreviewCard />
        <TransparencySettingsCard />
        <DetailSidebarSettingsCard />
      </TabPanel>

      <TabPanel activeKey={normalizedActiveTabKey} tabKey="shortcuts">
        <ShortcutSettingsPanel />
      </TabPanel>

      <TabPanel activeKey={normalizedActiveTabKey} tabKey="ai">
        {isAuthenticated ? (
          <AiSettingsSection />
        ) : (
          <Alert severity="info" sx={{ mb: 2 }}>
            登录后可使用 AI 相关设置。
          </Alert>
        )}
      </TabPanel>

      <TabPanel activeKey={normalizedActiveTabKey} tabKey="productivity">
        <ClipboardSettingsCard />
      </TabPanel>

      <TabPanel activeKey={normalizedActiveTabKey} tabKey="features">
        {isAuthenticated ? (
          <CustomPagesSettingsCard />
        ) : (
          <Alert severity="info" sx={{ mb: 2 }}>
            登录后可使用“自定义页面”等需要后端权限的功能项。
          </Alert>
        )}
      </TabPanel>

      <TabPanel activeKey={normalizedActiveTabKey} tabKey="data">
        <LocalDataSettingsCard />
        {isAuthenticated ? (
          <DataManagementCard />
        ) : (
          <Alert severity="info" sx={{ mb: 2 }}>
            登录后可访问服务端数据管理相关设置。
          </Alert>
        )}
      </TabPanel>

      <TabPanel activeKey={normalizedActiveTabKey} tabKey="about">
        <AboutAppCard />
        <DeveloperInfoCard />
      </TabPanel>
    </Container>
  );
};

export default SettingsPage;
