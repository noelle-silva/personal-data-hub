import React from 'react';
import { CardContent, Typography } from '@mui/material';
import WallpaperUpload from '../../../components/WallpaperUpload';
import WallpaperList from '../../../components/WallpaperList';
import { SettingsCard } from '../components/SettingsShell';

const WallpaperManagementCard = () => {
  return (
    <SettingsCard>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          壁纸管理
        </Typography>
        <WallpaperUpload />
        <WallpaperList />
      </CardContent>
    </SettingsCard>
  );
};

export default WallpaperManagementCard;

