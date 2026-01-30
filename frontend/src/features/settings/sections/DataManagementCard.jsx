import React from 'react';
import { CardContent, List, ListItem, ListItemIcon, ListItemText, Typography } from '@mui/material';
import { Storage as StorageIcon } from '@mui/icons-material';
import { SettingsCard } from '../components/SettingsShell';

const DataManagementCard = () => {
  return (
    <SettingsCard>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          数据管理
        </Typography>
        <List sx={{ p: 0 }}>
          <ListItem>
            <ListItemIcon>
              <StorageIcon />
            </ListItemIcon>
            <ListItemText primary="数据存储" secondary="您的笔记数据存储在本地MongoDB数据库中" />
          </ListItem>
        </List>
      </CardContent>
    </SettingsCard>
  );
};

export default DataManagementCard;

