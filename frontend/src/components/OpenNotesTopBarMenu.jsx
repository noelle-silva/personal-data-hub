import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  ClickAwayListener,
  Divider,
  Grow,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Popper,
  Typography,
  useMediaQuery,
  useTheme
} from '@mui/material';
import NoteIcon from '@mui/icons-material/Note';
import CloseIcon from '@mui/icons-material/Close';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import { useDispatch, useSelector } from 'react-redux';
import { activateWindow, closeWindow, selectActiveWindowId, selectAllWindows } from '../store/windowsSlice';

const OpenNotesTopBarMenu = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const dispatch = useDispatch();

  const windows = useSelector(selectAllWindows);
  const activeWindowId = useSelector(selectActiveWindowId);

  const documentWindows = useMemo(() => {
    return windows.filter((w) => !w?.contentType || w?.contentType === 'document');
  }, [windows]);

  const anchorRef = useRef(null);
  const closeTimerRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [dockSide, setDockSide] = useState('left'); // 'left' | 'right'

  const handleOpen = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const scheduleClose = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
    }
    closeTimerRef.current = setTimeout(() => {
      setOpen(false);
      closeTimerRef.current = null;
    }, 120);
  };

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  if (documentWindows.length === 0) {
    return (
      <span data-no-drag>
        <Button
          size="small"
          color="inherit"
          startIcon={<NoteIcon fontSize="small" />}
          disabled
          sx={{ borderRadius: 999, textTransform: 'none' }}
        >
          {!isMobile ? '已打开' : null}
        </Button>
      </span>
    );
  }

  const popperPlacement = dockSide === 'left' ? 'bottom-start' : 'bottom-end';

  return (
    <ClickAwayListener
      onClickAway={(event) => {
        if (!open) return;
        if (anchorRef.current && anchorRef.current.contains(event.target)) return;
        handleClose();
      }}
    >
      <Box
        data-no-drag
        onMouseEnter={() => {
          setHovering(true);
          if (!isMobile) handleOpen();
        }}
        onMouseLeave={() => {
          setHovering(false);
          if (!isMobile) scheduleClose();
        }}
        sx={{ display: 'inline-flex' }}
      >
        <Button
          ref={anchorRef}
          size="small"
          color="inherit"
          onClick={() => {
            if (!isMobile) return;
            setOpen((v) => !v);
          }}
          aria-label="已打开笔记"
          aria-haspopup="listbox"
          aria-expanded={open}
          startIcon={
            <Badge
              color="secondary"
              badgeContent={documentWindows.length}
              sx={{ '& .MuiBadge-badge': { fontSize: 10, height: 16, minWidth: 16 } }}
            >
              <NoteIcon fontSize="small" />
            </Badge>
          }
          sx={{
            borderRadius: 999,
            textTransform: 'none',
            px: 1.25,
            minWidth: 0
          }}
        >
          {!isMobile ? '已打开笔记' : null}
        </Button>

        {/* 左右切换按钮：只在悬停/展开时出现，避免突兀 */}
        <IconButton
          size="small"
          onClick={() => setDockSide((side) => (side === 'left' ? 'right' : 'left'))}
          aria-label={dockSide === 'left' ? '将已打开笔记切换到右侧展开' : '将已打开笔记切换到左侧展开'}
          sx={{
            ml: 0.25,
            color: 'inherit',
            opacity: hovering || open ? 1 : 0,
            pointerEvents: hovering || open ? 'auto' : 'none',
            transform: hovering || open ? 'translateX(0)' : 'translateX(-4px)',
            transition: 'opacity 0.15s ease, transform 0.15s ease',
            borderRadius: 999
          }}
        >
          <SwapHorizIcon fontSize="small" />
        </IconButton>

        <Popper
          open={open}
          anchorEl={anchorRef.current}
          placement={popperPlacement}
          modifiers={[{ name: 'offset', options: { offset: [0, 8] } }]}
          transition
          sx={{ zIndex: theme.zIndex.modal + 1100 }}
        >
          {({ TransitionProps }) => (
            <Grow
              {...TransitionProps}
              style={{
                transformOrigin: dockSide === 'left' ? 'top left' : 'top right'
              }}
            >
              <Paper
                elevation={8}
                onMouseEnter={() => {
                  if (!isMobile) handleOpen();
                }}
                onMouseLeave={() => {
                  if (!isMobile) scheduleClose();
                }}
                sx={{
                  width: 360,
                  maxWidth: 'min(360px, calc(100vw - 24px))',
                  borderRadius: 2,
                  overflow: 'hidden'
                }}
                aria-label="已打开笔记列表"
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    px: 1.25,
                    py: 0.75,
                    backgroundColor: 'background.default'
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                    <NoteIcon fontSize="small" />
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }} noWrap>
                      已打开笔记
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {documentWindows.length}
                    </Typography>
                  </Box>
                </Box>

                <Divider />

                <List dense disablePadding>
                  {documentWindows.map((w) => (
                    <ListItemButton
                      key={w.id}
                      selected={w.id === activeWindowId}
                      onClick={() => {
                        dispatch(activateWindow(w.id));
                        handleClose();
                      }}
                      sx={{
                        px: 1.25,
                        py: 0.75,
                        gap: 1,
                        alignItems: 'center',
                        '&.Mui-selected': {
                          backgroundColor: 'action.selected'
                        }
                      }}
                      aria-label={`切换到笔记：${w.title}`}
                    >
                      <NoteIcon fontSize="small" sx={{ color: 'primary.main' }} />
                      <ListItemText
                        primary={w.title || '未命名'}
                        secondary={w.minimized ? '已最小化' : undefined}
                        primaryTypographyProps={{
                          variant: 'body2',
                          sx: { fontWeight: w.id === activeWindowId ? 700 : 500 },
                          noWrap: true
                        }}
                        secondaryTypographyProps={{ variant: 'caption', noWrap: true }}
                      />
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          dispatch(closeWindow(w.id));
                        }}
                        aria-label={`关闭笔记：${w.title}`}
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </ListItemButton>
                  ))}
                </List>
              </Paper>
            </Grow>
          )}
        </Popper>
      </Box>
    </ClickAwayListener>
  );
};

export default OpenNotesTopBarMenu;
