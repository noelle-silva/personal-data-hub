import React from 'react';
import {
  Button,
  CardContent,
  CircularProgress,
  Divider,
  FormControl,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Select,
  Switch,
  Typography,
} from '@mui/material';
import {
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  Palette as PaletteIcon,
  Refresh as RefreshIcon,
  Colorize as ColorizeIcon,
} from '@mui/icons-material';
import { useThemeContext } from '../../../contexts/ThemeContext';
import { SettingsCard } from '../components/SettingsShell';

const AppearanceSettingsCard = () => {
  const {
    mode,
    toggleColorMode,
    dynamicColorsEnabled,
    toggleDynamicColors,
    selectedVariant,
    setThemeVariant,
    themeLoading,
    regenerateThemeColors,
    availableVariants,
    getVariantDisplayName,
    currentWallpaper,
  } = useThemeContext();

  return (
    <SettingsCard>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          外观设置
        </Typography>
        <List sx={{ p: 0 }}>
          <ListItem>
            <ListItemIcon>{mode === 'dark' ? <DarkModeIcon /> : <LightModeIcon />}</ListItemIcon>
            <ListItemText primary="深色模式" secondary="切换应用的主题颜色模式" />
            <Switch checked={mode === 'dark'} onChange={toggleColorMode} color="primary" />
          </ListItem>
          <Divider />
          <ListItem>
            <ListItemIcon>
              <PaletteIcon />
            </ListItemIcon>
            <ListItemText primary="莫奈取色" secondary="根据当前壁纸自动生成动态主题颜色" />
            <Switch checked={dynamicColorsEnabled} onChange={toggleDynamicColors} color="primary" />
          </ListItem>

          {dynamicColorsEnabled && (
            <>
              <Divider />
              <ListItem>
                <ListItemIcon>
                  <ColorizeIcon />
                </ListItemIcon>
                <ListItemText primary="主题变体" secondary="选择动态主题的颜色风格" />
                <FormControl sx={{ minWidth: 150 }} size="small">
                  <Select
                    value={selectedVariant}
                    label="主题变体"
                    onChange={(e) => setThemeVariant(e.target.value)}
                  >
                    {availableVariants.map((variant) => (
                      <MenuItem key={variant} value={variant}>
                        {getVariantDisplayName(variant)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemIcon>
                  <RefreshIcon />
                </ListItemIcon>
                <ListItemText
                  primary="重新生成主题"
                  secondary={
                    currentWallpaper ? `基于 "${currentWallpaper.originalName}" 重新生成` : '请先设置壁纸'
                  }
                  secondaryTypographyProps={{
                    component: 'div',
                    sx: { display: 'flex', flexDirection: 'column', gap: 0.5 },
                  }}
                />
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={themeLoading ? <CircularProgress size={16} /> : <RefreshIcon />}
                  onClick={() => regenerateThemeColors(currentWallpaper?._id)}
                  disabled={!currentWallpaper || themeLoading}
                  sx={{ minWidth: 120 }}
                >
                  {themeLoading ? '生成中...' : '重新生成'}
                </Button>
              </ListItem>
            </>
          )}
        </List>
      </CardContent>
    </SettingsCard>
  );
};

export default AppearanceSettingsCard;

