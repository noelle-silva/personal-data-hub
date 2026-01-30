import React from 'react';
import { CardContent, Divider, List, ListItem, ListItemIcon, ListItemText, Typography } from '@mui/material';
import { Info as InfoIcon } from '@mui/icons-material';
import { SettingsCard } from '../components/SettingsShell';

const AboutAppCard = () => {
  return (
    <SettingsCard>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          关于应用
        </Typography>
        <List sx={{ p: 0 }}>
          <ListItem>
            <ListItemIcon>
              <InfoIcon />
            </ListItemIcon>
            <ListItemText primary="学习笔记管理系统" secondary="版本：v0.1.0" />
          </ListItem>
          <Divider />
          <ListItem>
            <ListItemText
              primary="技术栈"
              secondary="前端：React 19.2.0 + Material-UI 7.3.3 + Redux Toolkit 9.2.0 | 后端：Express.js 5.1.0 + MongoDB + Mongoose 8.18.3"
            />
          </ListItem>
          <Divider />
          <ListItem>
            <ListItemText
              primary="功能特性"
              secondary="• 笔记的创建、编辑、删除和查看\n• 标签管理和分类\n• 全文搜索功能\n• 深色/浅色主题切换\n• 响应式设计"
            />
          </ListItem>
        </List>
      </CardContent>
    </SettingsCard>
  );
};

export default AboutAppCard;

