import React, { useEffect } from 'react';
import { Alert, Container } from '@mui/material';
import { useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import ShortcutSettingsPanel from '../../components/ShortcutSettingsPanel';
import { PageTitle } from './components/SettingsShell';
import BackendServerSettingsCard from './sections/BackendServerSettingsCard';
import AttachmentServerSettingsCard from './sections/AttachmentServerSettingsCard';
import CustomPagesSettingsCard from './sections/CustomPagesSettingsCard';
import AppearanceSettingsCard from './sections/AppearanceSettingsCard';
import ThemePreviewCard from './sections/ThemePreviewCard';
import WallpaperManagementCard from './sections/WallpaperManagementCard';
import TransparencySettingsCard from './sections/TransparencySettingsCard';
import AiSettingsSection from './sections/AiSettingsSection';
import DataManagementCard from './sections/DataManagementCard';
import AboutAppCard from './sections/AboutAppCard';
import AccountManagementCard from './sections/AccountManagementCard';
import DeveloperInfoCard from './sections/DeveloperInfoCard';
import { selectIsAuthenticated } from '../../store/authSlice';

const SettingsPage = () => {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const from = location?.state?.from;
    const reason = location?.state?.reason;
    if (!isAuthenticated) return;
    if (!from || !reason) return;
    // 仅在“被引导到设置页”时，登录成功后自动回到原页面
    navigate(from.pathname || '/', { replace: true });
  }, [isAuthenticated, location?.state, navigate]);

  return (
    <Container maxWidth="md">
      <PageTitle variant="h3" component="h1">
        系统设置
      </PageTitle>

      <BackendServerSettingsCard />
      <AccountManagementCard />

      {!isAuthenticated && (
        <Alert severity="info" sx={{ mb: 2 }}>
          当前未连接服务器或未登录。请先在“服务器管理”中添加/切换服务器并登录；需要后端权限的设置项会在登录后显示。
        </Alert>
      )}

      <AppearanceSettingsCard />
      <ThemePreviewCard />
      <TransparencySettingsCard />
      <ShortcutSettingsPanel />

      {isAuthenticated && (
        <>
          <AttachmentServerSettingsCard />
          <CustomPagesSettingsCard />
          <WallpaperManagementCard />
          <AiSettingsSection />
          <DataManagementCard />
        </>
      )}

      <AboutAppCard />
      <DeveloperInfoCard />
    </Container>
  );
};

export default SettingsPage;
