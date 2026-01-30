import { Card, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';

export const PageTitle = styled(Typography)(({ theme }) => ({
  marginBottom: theme.spacing(4),
  fontWeight: 'bold',
  color: theme.palette.primary.main,
  textAlign: 'center',
}));

export const SettingsCard = styled(Card)(({ theme }) => ({
  marginBottom: theme.spacing(3),
  borderRadius: 20,
}));

