import React, { useState } from 'react';
import {
  Button,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material';
import { Logout as LogoutIcon, Person as PersonIcon } from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { logout, selectAuthLoading, selectIsAuthenticated, selectUser } from '../../../store/authSlice';
import { SettingsCard } from '../components/SettingsShell';
import { getServerUrl } from '../../../services/serverConfig';

const AccountManagementCard = () => {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const authLoading = useSelector(selectAuthLoading);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  const openLogoutConfirm = () => setLogoutConfirmOpen(true);
  const closeLogoutConfirm = () => setLogoutConfirmOpen(false);

  const handleLogout = () => {
    dispatch(logout()).then((action) => {
      // 登录页已移除：这里仅做“清除当前服务器登录态”
    });
    closeLogoutConfirm();
  };

  const serverUrl = getServerUrl();
  const who = user?.username || '未登录';
  const statusText = serverUrl ? `${isAuthenticated ? '已登录' : '未登录'}：${who} @ ${serverUrl}` : '未配置服务器';

  return (
    <>
      <SettingsCard>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            账户管理
          </Typography>
          <List sx={{ p: 0 }}>
            <ListItem>
              <ListItemIcon>
                <PersonIcon />
              </ListItemIcon>
              <ListItemText primary="当前状态" secondary={statusText} />
            </ListItem>
            <Divider />
            <ListItem>
              <ListItemIcon>
                <LogoutIcon />
              </ListItemIcon>
              <ListItemText primary="清除登录" secondary="清除当前服务器的登录态（不会影响本地数据）" />
              <Button
                variant="outlined"
                color="error"
                startIcon={<LogoutIcon />}
                onClick={openLogoutConfirm}
                disabled={authLoading}
              >
                清除
              </Button>
            </ListItem>
          </List>
        </CardContent>
      </SettingsCard>

      <Dialog open={logoutConfirmOpen} onClose={closeLogoutConfirm}>
        <DialogTitle>确认清除登录</DialogTitle>
        <DialogContent>
          <Typography variant="body1">确定要清除当前服务器的登录态吗？</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeLogoutConfirm} disabled={authLoading}>
            取消
          </Button>
          <Button
            onClick={handleLogout}
            color="error"
            variant="contained"
            disabled={authLoading}
            startIcon={authLoading ? <CircularProgress size={20} color="inherit" /> : <LogoutIcon />}
          >
            清除
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AccountManagementCard;
