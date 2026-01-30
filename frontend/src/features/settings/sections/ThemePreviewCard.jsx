import React from 'react';
import { CardContent } from '@mui/material';
import ThemePreviewBar from '../../../components/ThemePreviewBar';
import { SettingsCard } from '../components/SettingsShell';

const ThemePreviewCard = () => {
  return (
    <SettingsCard>
      <CardContent>
        <ThemePreviewBar />
      </CardContent>
    </SettingsCard>
  );
};

export default ThemePreviewCard;

