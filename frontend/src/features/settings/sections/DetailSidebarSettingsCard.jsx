import React from 'react';
import {
  Box,
  CardContent,
  Divider,
  List,
  ListItem,
  ListItemText,
  Slider,
  Switch,
  Typography,
} from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { SettingsCard } from '../components/SettingsShell';
import {
  selectAiSidebarDefaultWidth,
  selectAutoExpandAiSidebar,
  selectAutoExpandReferencesSidebar,
  setAiSidebarDefaultWidth,
  setAutoExpandAiSidebar,
  setAutoExpandReferencesSidebar,
} from '../../../store/settingsSlice';

const DetailSidebarSettingsCard = () => {
  const dispatch = useDispatch();
  const autoExpandReferencesSidebar = useSelector(selectAutoExpandReferencesSidebar);
  const autoExpandAiSidebar = useSelector(selectAutoExpandAiSidebar);
  const aiSidebarDefaultWidth = useSelector(selectAiSidebarDefaultWidth);

  return (
    <SettingsCard>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          详情页侧边栏
        </Typography>
        <List sx={{ p: 0 }}>
          <ListItem>
            <ListItemText
              primary="默认展开引用侧栏"
              secondary="打开笔记/收藏夹详情页时自动展开引用区域"
            />
            <Switch
              checked={!!autoExpandReferencesSidebar}
              onChange={(e) => dispatch(setAutoExpandReferencesSidebar(e.target.checked))}
              color="primary"
            />
          </ListItem>
          <Divider />
          <ListItem>
            <ListItemText primary="默认展开 AI 侧栏" secondary="打开详情页时自动打开 AI 聊天侧栏" />
            <Switch
              checked={!!autoExpandAiSidebar}
              onChange={(e) => dispatch(setAutoExpandAiSidebar(e.target.checked))}
              color="primary"
            />
          </ListItem>
          <Divider />
          <ListItem sx={{ alignItems: 'flex-start' }}>
            <ListItemText
              primary="AI 侧栏默认宽度"
              secondary={`用于首次打开 AI 侧栏的宽度：${aiSidebarDefaultWidth}px`}
              secondaryTypographyProps={{ component: 'div' }}
            />
            <Box sx={{ minWidth: 220, pl: 2, pt: 0.5 }}>
              <Slider
                value={aiSidebarDefaultWidth}
                onChange={(_, value) => {
                  const next = Array.isArray(value) ? value[0] : value;
                  dispatch(setAiSidebarDefaultWidth(next));
                }}
                min={320}
                max={960}
                step={10}
                size="small"
                valueLabelDisplay="auto"
              />
            </Box>
          </ListItem>
        </List>
      </CardContent>
    </SettingsCard>
  );
};

export default DetailSidebarSettingsCard;

