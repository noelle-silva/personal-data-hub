import { Box } from '@mui/material';
import { styled } from '@mui/material/styles';

export const ContentBox = styled(Box)(() => ({
  display: 'flex',
  flexDirection: 'row',
  flexGrow: 1,
  overflow: 'hidden',
  minWidth: 0,
}));

export const RelationsBox = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'isCollapsed' && prop !== 'borderColor',
})(({ theme, isCollapsed, borderColor }) => ({
  width: isCollapsed ? 0 : '40%',
  minWidth: isCollapsed ? 0 : 300,
  padding: isCollapsed ? 0 : theme.spacing(2),
  borderRight: isCollapsed ? 'none' : `1px solid ${borderColor || theme.palette.divider}`,
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
  overflowY: 'auto',
  overscrollBehavior: 'contain',
  transition: 'width 0.3s ease, padding 0.3s ease, border-right 0.3s ease',
  '&::-webkit-scrollbar': {
    width: 8,
  },
  '&::-webkit-scrollbar-track': {
    background: theme.palette.background.default,
  },
  '&::-webkit-scrollbar-thumb': {
    background: theme.palette.primary.main,
    borderRadius: 4,
  },
}));

export const RightContentBox = styled(Box)(({ theme }) => ({
  width: '100%',
  padding: theme.spacing(3),
  overflowY: 'auto',
  overscrollBehavior: 'contain',
  flexGrow: 1,
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
}));

export const VerticalListContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(1),
}));

export const ClickableListItem = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(1),
  backgroundColor: theme.palette.surfaceVariant.main,
  borderRadius: 12,
  cursor: 'pointer',
  transition: 'background-color 0.2s ease',
  '&:hover': {
    backgroundColor: theme.palette.surfaceVariant.dark,
  },
}));

export const EmptyStateContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(2),
  color: theme.palette.text.secondary,
  fontStyle: 'italic',
}));

export const TagsContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  gap: theme.spacing(1),
  marginTop: theme.spacing(2),
}));

