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
import { useNavigate } from 'react-router-dom';
import { logout, selectAuthLoading, selectUser } from '../../../store/authSlice';
import { SettingsCard } from '../components/SettingsShell';

const AccountManagementCard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector(selectUser);
  const authLoading = useSelector(selectAuthLoading);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  const openLogoutConfirm = () => setLogoutConfirmOpen(true);
  const closeLogoutConfirm = () => setLogoutConfirmOpen(false);

  const handleLogout = () => {
    dispatch(logout()).then((action) => {
      if (!action.error) {
        navigate('/登录');
      }
    });
    closeLogoutConfirm();
  };

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
              <ListItemText primary="当前用户" secondary={user ? user.username : '未知用户'} />
            </ListItem>
            <Divider />
            <ListItem>
              <ListItemIcon>
                <LogoutIcon />
              </ListItemIcon>
              <ListItemText primary="退出登录" secondary="退出当前账户并返回登录页面" />
              <Button
                variant="outlined"
                color="error"
                startIcon={<LogoutIcon />}
                onClick={openLogoutConfirm}
                disabled={authLoading}
              >
                退出登录
              </Button>
            </ListItem>
          </List>
        </CardContent>
      </SettingsCard>

      <Dialog open={logoutConfirmOpen} onClose={closeLogoutConfirm}>
        <DialogTitle>确认退出登录</DialogTitle>
        <DialogContent>
          <Typography variant="body1">确定要退出登录吗？</Typography>
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
            退出登录
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AccountManagementCard;

