import React from 'react';
import { Box, IconButton, Tooltip } from '@mui/material';
import { styled } from '@mui/material/styles';
import { Close as CloseIcon, DragIndicator as DragIcon } from '@mui/icons-material';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const CardWrapper = styled(Box)(({ theme }) => ({
  position: 'relative',
  height: '100%',
  overflow: 'visible',
  minWidth: 0,
  '&:hover .card-actions': {
    opacity: 1,
  },
}));

const CardActions = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: 8,
  left: 8,
  right: 8,
  display: 'flex',
  justifyContent: 'space-between',
  opacity: 0,
  transition: 'opacity 0.2s ease',
  zIndex: 10,

  '&.edit-mode': {
    opacity: 1,
  },
}));

const SortableCardItem = ({ id, children, onRemove, isEditLayout }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <CardWrapper>
        <CardActions className={`card-actions ${isEditLayout ? 'edit-mode' : ''}`}>
          <Tooltip title="拖拽排序">
            <IconButton size="small" {...listeners} sx={{ cursor: 'grab' }}>
              <DragIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="移除">
            <IconButton size="small" onClick={() => onRemove(id)} color="error">
              <CloseIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </CardActions>
        {children}
      </CardWrapper>
    </div>
  );
};

export default SortableCardItem;

