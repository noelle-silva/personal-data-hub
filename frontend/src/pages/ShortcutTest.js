import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Alert,
  Box,
} from '@mui/material';
import { useSelector } from 'react-redux';
import { selectShortcuts, selectEnabled } from '../store/shortcutsSlice';

const ShortcutTest = () => {
  const shortcuts = useSelector(selectShortcuts);
  const enabled = useSelector(selectEnabled);
  const [triggeredShortcuts, setTriggeredShortcuts] = useState([]);
  const [registeredShortcuts, setRegisteredShortcuts] = useState([]);
  const [unregisteredShortcuts, setUnregisteredShortcuts] = useState([]);

  // 监听快捷键触发事件
  useEffect(() => {
    const handleShortcutTriggered = (event) => {
      console.log('ShortcutTest: 收到快捷键触发事件', event.detail);
      setTriggeredShortcuts(prev => [...prev, {
        actionId: event.detail.actionId,
        timestamp: new Date().toLocaleTimeString(),
      }]);
    };

    window.addEventListener('shortcut-triggered', handleShortcutTriggered);
    
    return () => {
      window.removeEventListener('shortcut-triggered', handleShortcutTriggered);
    };
  }, []);

  const clearTriggeredShortcuts = () => {
    setTriggeredShortcuts([]);
  };

  const clearRegisteredShortcuts = () => {
    setRegisteredShortcuts([]);
  };

  const clearUnregisteredShortcuts = () => {
    setUnregisteredShortcuts([]);
  };

  const clearAllLogs = () => {
    setTriggeredShortcuts([]);
    setRegisteredShortcuts([]);
    setUnregisteredShortcuts([]);
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        快捷键测试页面
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          此页面用于测试快捷键系统是否正常工作。请尝试按下以下快捷键：
          <br />
          • Windows/Linux: Ctrl+Alt+N (创建笔记)
          <br />
          • macOS: Command+Alt+N (创建笔记)
          <br />
          • Windows/Linux: Ctrl+Alt+Q (创建引用体)
          <br />
          • macOS: Command+Alt+Q (创建引用体)
        </Typography>
      </Alert>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            快捷键系统状态
          </Typography>
          <List>
            <ListItem>
              <ListItemText 
                primary="系统启用状态" 
                secondary={enabled ? "已启用" : "已禁用"} 
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="已注册快捷键数量" 
                secondary={Object.keys(shortcuts).length} 
              />
            </ListItem>
          </List>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              已注册的快捷键
            </Typography>
          </Box>
          <List>
            {Object.entries(shortcuts).map(([actionId, entry]) => (
              <ListItem key={actionId}>
                <ListItemText 
                  primary={entry.description}
                  secondary={`${entry.primary} (${entry.enabled ? '启用' : '禁用'}) - 作用域: ${entry.scope}`}
                />
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              触发的快捷键记录
            </Typography>
            <button onClick={clearTriggeredShortcuts} style={{ padding: '4px 8px' }}>
              清空记录
            </button>
          </Box>
          {triggeredShortcuts.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              尚未触发任何快捷键
            </Typography>
          ) : (
            <List>
              {triggeredShortcuts.map((item, index) => (
                <ListItem key={index}>
                  <ListItemText 
                    primary={item.actionId}
                    secondary={item.timestamp}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </CardContent>
      </Card>
    </Container>
  );
};

export default ShortcutTest;