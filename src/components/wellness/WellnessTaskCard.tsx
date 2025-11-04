import React, { useState } from 'react';
import {
  Box,
  Checkbox,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  Paper,
  Typography,
  Chip,
  Divider,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Repeat as RepeatIcon,
} from '@mui/icons-material';
import { DisplayWellnessTask, WellnessCategory } from '../../types/wellness';
import { getRecurrenceLabel, getRecurrenceIcon, getCategoryColor } from '../../utils/wellnessHelpers';

type WellnessTaskCardProps = {
  task: DisplayWellnessTask;
  categories: WellnessCategory[];
  onEdit: (editSeries: boolean) => void;
  onDelete: (deleteSeries: boolean) => void;
  onToggleComplete: () => void;
  isDragging?: boolean;
};

const WellnessTaskCard: React.FC<WellnessTaskCardProps> = ({
  task,
  categories,
  onEdit,
  onDelete,
  onToggleComplete,
  isDragging = false,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const category = categories.find(c => c.id === task.categoryId);
  const categoryColor = getCategoryColor(task.categoryId, categories);

  const handleMenuOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    event.preventDefault();
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEditInstance = () => {
    handleMenuClose();
    onEdit(false);
  };

  const handleEditSeries = () => {
    handleMenuClose();
    onEdit(true);
  };

  const handleDeleteInstance = () => {
    handleMenuClose();
    onDelete(false);
  };

  const handleDeleteSeries = () => {
    handleMenuClose();
    onDelete(true);
  };

  const handleToggleComplete = (event: React.ChangeEvent<HTMLInputElement>) => {
    event.stopPropagation();
    onToggleComplete();
  };

  return (
    <Paper
      elevation={1}
      sx={{
        display: 'flex',
        alignItems: 'center',
        borderRadius: '24px',
        mb: 1,
        px: 1,
        py: 0.5,
        bgcolor: task.completed ? 'action.hover' : 'background.paper',
        borderLeft: `4px solid ${categoryColor}`,
        opacity: isDragging ? 0.5 : (task.completed ? 0.5 : 1),
        '&:hover': {
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        },
        minHeight: '36px',
        cursor: 'grab',
        '&:active': {
          cursor: 'grabbing',
        },
      }}
    >
      {/* Checkbox for completion */}
      <Box onClick={(e) => e.stopPropagation()}>
        <Checkbox
          size="small"
          checked={task.completed}
          onChange={handleToggleComplete}
          onClick={(e) => e.stopPropagation()}
          sx={{ p: 0.5 }}
        />
      </Box>

      {/* Task title and info */}
      <Box sx={{ flexGrow: 1, mx: 1, minWidth: 0, overflow: 'hidden' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography
            variant="caption"
            sx={{
              fontWeight: 'medium',
              textDecoration: task.completed ? 'line-through' : 'none',
              display: 'block',
              wordWrap: 'break-word',
              lineHeight: 1.2,
            }}
          >
            {task.title}
          </Typography>
          {task.recurrence !== 'one_time' && (
            <Typography
              variant="caption"
              sx={{ color: 'text.secondary', fontSize: '0.7rem' }}
            >
              {getRecurrenceIcon(task.recurrence)}
            </Typography>
          )}
        </Box>
        {category && (
          <Chip
            label={category.name}
            size="small"
            sx={{
              height: '16px',
              fontSize: '0.65rem',
              mt: 0.25,
              bgcolor: category.color,
              color: 'white',
            }}
          />
        )}
      </Box>

      {/* Instance indicator */}
      {task.isInstance && (
        <Chip
          label="Modified"
          size="small"
          sx={{
            height: '18px',
            fontSize: '0.6rem',
            mr: 0.5,
            bgcolor: 'info.light',
            color: 'white',
          }}
        />
      )}

      {/* Menu button */}
      <Box onClick={(e) => e.stopPropagation()}>
        <IconButton
          size="small"
          onClick={e => {
            e.preventDefault();
            e.stopPropagation();
            handleMenuOpen(e);
          }}
          sx={{ p: 0.5 }}
        >
          <MoreVertIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Context menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        onClick={(e) => e.stopPropagation()}
      >
        <MenuItem onClick={handleEditInstance}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          Edit This Instance
        </MenuItem>

        {task.recurrence !== 'one_time' && (
          <MenuItem onClick={handleEditSeries}>
            <ListItemIcon>
              <RepeatIcon fontSize="small" />
            </ListItemIcon>
            Edit Series
          </MenuItem>
        )}

        <Divider />

        <MenuItem onClick={handleDeleteInstance}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          Delete This Instance
        </MenuItem>

        {task.recurrence !== 'one_time' && (
          <MenuItem onClick={handleDeleteSeries}>
            <ListItemIcon>
              <DeleteIcon fontSize="small" color="error" />
            </ListItemIcon>
            Delete Series
          </MenuItem>
        )}
      </Menu>
    </Paper>
  );
};

export default WellnessTaskCard;
