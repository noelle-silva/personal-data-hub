import React from 'react';
import { Container } from '@mui/material';
import ShortcutSettingsPanel from '../../components/ShortcutSettingsPanel';
import { PageTitle } from './components/SettingsShell';
import BackendServerSettingsCard from './sections/BackendServerSettingsCard';
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

const SettingsPage = () => {
  return (
    <Container maxWidth="md">
      <PageTitle variant="h3" component="h1">
        系统设置
      </PageTitle>

      <BackendServerSettingsCard />
      <CustomPagesSettingsCard />
      <AppearanceSettingsCard />
      <ThemePreviewCard />
      <WallpaperManagementCard />
      <TransparencySettingsCard />
      <ShortcutSettingsPanel />
      <AiSettingsSection />
      <DataManagementCard />
      <AboutAppCard />
      <AccountManagementCard />
      <DeveloperInfoCard />
    </Container>
  );
};

export default SettingsPage;

