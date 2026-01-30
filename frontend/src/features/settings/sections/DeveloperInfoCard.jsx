import React from 'react';
import { CardContent, Typography } from '@mui/material';
import { SettingsCard } from '../components/SettingsShell';

const DeveloperInfoCard = () => {
  return (
    <SettingsCard>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          开发者信息
        </Typography>
        <Typography variant="body2" color="text.secondary">
          这是一个全栈学习笔记管理系统，采用前后端分离架构，主要用于展示和管理学习笔记数据。系统提供直观的卡片式界面，支持笔记的增删改查、标签管理、搜索等功能。
        </Typography>
      </CardContent>
    </SettingsCard>
  );
};

export default DeveloperInfoCard;

