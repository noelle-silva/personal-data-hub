import React from 'react';
import { Box, CardContent, Typography } from '@mui/material';
import TransparencyConfigPanel from '../../../components/TransparencyConfigPanel';
import { SettingsCard } from '../components/SettingsShell';

const TransparencySettingsCard = () => {
  return (
    <SettingsCard>
      <CardContent>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box component="span" sx={{ opacity: 0.7 }}>
            🎨
          </Box>
          透明度配置
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          调整卡片、侧边栏和顶部导航栏的透明度，创建个性化的视觉体验
        </Typography>
        <TransparencyConfigPanel />
      </CardContent>
    </SettingsCard>
  );
};

export default TransparencySettingsCard;

