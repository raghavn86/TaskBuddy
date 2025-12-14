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
  Tooltip,
  Divider,
} from '@mui/material';
import { 
  MoreVert as MoreVertIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  AccessTime as TimeIcon,
  PersonOutline as PersonOutlineIcon,
  Person as PersonIcon,
  ViewHeadline as SectionIcon,
  StickyNote2Outlined as NotesIcon,
} from '@mui/icons-material';
import { Task, TaskCategory } from '../../types';
import { useTaskManager } from '../../context/TaskContext';

type TaskCardProps = {
  task: Task;
  isTemplate: boolean;
  categories?: TaskCategory[];
  onEdit: () => void;
  onDelete: () => void;
  onToggleComplete: (completed: boolean) => void;
  onAssign: (userId: string | null) => void;
  onAddSectionAbove?: () => void;
  dragHandleProps?: any;
  isDragging?: boolean;
  onNotesClick?: () => void;
};

const TaskCard: React.FC<TaskCardProps> = ({
  task,
  isTemplate,
  categories = [],
  onEdit,
  onDelete,
  onToggleComplete,
  onAssign,
  onAddSectionAbove,
  onNotesClick,
}) => {
  const { taskService } = useTaskManager();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  
  const category = categories.find(c => c.id === task.categoryId);
  const hasNotes = Boolean(task.notes && task.notes.trim().length > 0);
  
  const handleMenuOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    event.preventDefault(); // Prevent card click event
    setAnchorEl(event.currentTarget);
  };
  
  const handleMenuClose = () => {
    setAnchorEl(null);
  };
  
  const handleEdit = () => {
    handleMenuClose();
    onEdit();
  };
  
  const handleDelete = () => {
    handleMenuClose();
    onDelete();
  };
  
  const handleToggleComplete = (event: React.ChangeEvent<HTMLInputElement>) => {
    // Important: Stop propagation to prevent drag start
    event.stopPropagation();
    onToggleComplete(event.target.checked);
  };
  
  const handleAssignToMe = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent card click from opening dialog
    e.stopPropagation(); // Prevent drag start
    handleMenuClose();
    onAssign(taskService.userId);
  };
  
  const handleAssignToPartner = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent card click from opening dialog
    e.stopPropagation(); // Prevent drag start
    handleMenuClose();
    onAssign(taskService.partnerId);
  };
  
  const handleRemoveAssignment = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent card click from opening dialog
    e.stopPropagation(); // Prevent drag start
    handleMenuClose();
    onAssign(null);
  };

  const handleAddSectionAbove = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleMenuClose();
    onAddSectionAbove?.();
  };
  
  // Use TaskService to get colors
  const getAssignmentColor = () => {
    return taskService.getTaskAssignmentColor(task);
  };
  
  // Get background color based on assignment for better visual differentiation
  const getBackgroundColor = () => {
    return taskService.getTaskBackgroundColor(task);
  };
  
  const handleCardClick = () => {
    if (hasNotes && onNotesClick) {
      onNotesClick();
    }
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
        bgcolor: getBackgroundColor(),
        borderLeft: `4px solid ${getAssignmentColor()}`,
        opacity: task.completed ? 0.5 : 1,
        '&:hover': {
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        },
        minHeight: '36px',
        cursor: hasNotes && onNotesClick ? 'pointer' : 'inherit' // Visual cue only when notes are available
      }}
      onClick={handleCardClick}
    >
      {/* Stop propagation to prevent drag from starting on interactive elements */}
      <Box onClick={(e) => e.stopPropagation()}>
        {!isTemplate && (
          <Checkbox 
            size="small"
            checked={task.completed} 
            onChange={handleToggleComplete}
            onClick={(e) => e.stopPropagation()}
            sx={{ p: 0.5 }}
          />
        )}
      </Box>
      
      <Box sx={{ flexGrow: 1, mx: 1, minWidth: 0, overflow: 'hidden' }}>
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
      </Box>
      
      <Box sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary', mr: 0.5 }}>
        <TimeIcon sx={{ fontSize: 14, mr: 0.5 }} />
        <Typography variant="caption">{task.minutes}</Typography>
      </Box>

      {hasNotes && (
        <Tooltip title="Task has notes">
          <IconButton
            size="small"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onNotesClick?.();
            }}
            sx={{ p: 0.5, color: 'text.secondary' }}
          >
            <NotesIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
      
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
      
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        onClick={(e) => e.stopPropagation()} // Prevent closing menu from triggering drag
      >
        <MenuItem onClick={handleEdit}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          Edit Task
        </MenuItem>
        
        <MenuItem onClick={handleDelete}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          Delete Task
        </MenuItem>
        
        {onAddSectionAbove && (
          <MenuItem onClick={handleAddSectionAbove}>
            <ListItemIcon>
              <SectionIcon fontSize="small" />
            </ListItemIcon>
            Add Section Above
          </MenuItem>
        )}
        
        <Divider />
        
        <MenuItem onClick={(e) => handleAssignToMe(e)}>
          <ListItemIcon>
            <PersonIcon fontSize="small" color="primary" />
          </ListItemIcon>
          Assign to me
        </MenuItem>
        
        <MenuItem onClick={(e) => handleAssignToPartner(e)}>
          <ListItemIcon>
            <PersonIcon 
              fontSize="small" 
              sx={{ color: taskService.getPartnerColor(taskService.partnerId) }}
            />
          </ListItemIcon>
          Assign to {taskService.getPartnerNickname(taskService.partnerId)}
        </MenuItem>
        
        <MenuItem onClick={(e) => handleRemoveAssignment(e)}>
          <ListItemIcon>
            <PersonOutlineIcon fontSize="small" />
          </ListItemIcon>
          Unassign
        </MenuItem>
      </Menu>
    </Paper>
  );
};

export default TaskCard;
