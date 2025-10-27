import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Box,
  Typography,
  IconButton,
  Paper,
  Chip,
  Divider,
  CircularProgress,
  List,
  ListItem,
  ToggleButton,
  ToggleButtonGroup,
  useTheme
} from '@mui/material';
import {
  Close as CloseIcon,
  Check as CheckIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { Task, TaskCategory } from '../../types';
import CategorySelector from './CategorySelector';

type TaskToAdd = {
  title: string;
  minutes: number;
  categoryId?: string;
  selectedDays: number[];
  status?: 'pending' | 'adding' | 'success' | 'error';
  error?: string;
};

type BulkTaskDialogProps = {
  open: boolean;
  onClose: () => void;
  onAddTasks: (tasks: TaskToAdd[]) => Promise<void>;
  onRetryTask: (taskIndex: number) => Promise<void>;
  isWeekView: boolean;
  currentDayIndex: number;
  categories?: TaskCategory[];
  onCreateCategory: (category: Omit<TaskCategory, 'id'>) => void;
};

const BulkTaskDialog: React.FC<BulkTaskDialogProps> = ({
  open,
  onClose,
  onAddTasks,
  onRetryTask,
  isWeekView,
  currentDayIndex,
  categories = [],
  onCreateCategory,
}) => {
  const theme = useTheme();
  const [tasks, setTasks] = useState<TaskToAdd[]>([{
    title: '',
    minutes: 30,
    categoryId: '',
    selectedDays: [currentDayIndex],
    status: 'pending'
  }]);
  const [isAdding, setIsAdding] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [hasErrors, setHasErrors] = useState(false);
  
  const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  useEffect(() => {
    if (open) {
      // Reset state when dialog opens
      setTasks([{
        title: '',
        minutes: 30,
        categoryId: '',
        selectedDays: [currentDayIndex],
        status: 'pending'
      }]);
      setIsAdding(false);
      setIsComplete(false);
      setHasErrors(false);
    }
  }, [open, currentDayIndex]);
  
  const addNewTaskInput = () => {
    setTasks([...tasks, {
      title: '',
      minutes: 30,
      categoryId: '',
      selectedDays: [currentDayIndex],
      status: 'pending'
    }]);
  };
  
  const handleTaskTitleChange = (index: number, value: string) => {
    const updatedTasks = [...tasks];
    updatedTasks[index].title = value;
    setTasks(updatedTasks);
  };
  
  const handleMinutesChange = (index: number, value: string) => {
    const updatedTasks = [...tasks];
    updatedTasks[index].minutes = parseInt(value) || 0;
    setTasks(updatedTasks);
  };
  
  const handleCategoryChange = (index: number, categoryId: string) => {
    const updatedTasks = [...tasks];
    updatedTasks[index].categoryId = categoryId;
    setTasks(updatedTasks);
  };
  
  const handleDaysChange = (index: number, newSelectedDays: number[]) => {
    const updatedTasks = [...tasks];
    updatedTasks[index].selectedDays = newSelectedDays.length ? newSelectedDays : [currentDayIndex];
    setTasks(updatedTasks);
  };
  
  const removeTask = (index: number) => {
    if (tasks.length === 1) {
      // If it's the last task, just clear it rather than remove
      setTasks([{
        title: '',
        minutes: 30,
        categoryId: '',
        selectedDays: [currentDayIndex],
        status: 'pending'
      }]);
    } else {
      const updatedTasks = tasks.filter((_, i) => i !== index);
      setTasks(updatedTasks);
    }
  };
  
  const validateTasks = (): boolean => {
    let valid = true;
    // Check for empty titles or invalid minutes
    tasks.forEach(task => {
      if (!task.title.trim() || task.minutes <= 0) {
        valid = false;
      }
    });
    return valid;
  };
  
  const handleAddTasks = async () => {
    if (!validateTasks()) {
      alert('Please ensure all tasks have a title and valid time.');
      return;
    }
    
    setIsAdding(true);
    try {
      // Create a copy with pending status for the UI
      const tasksWithStatus = tasks.map(task => ({ 
        ...task, 
        status: 'pending' as const 
      }));
      setTasks(tasksWithStatus);
      
      await onAddTasks(tasks);
      
      // Check for any errors
      const hasAnyErrors = tasks.some(task => task.status === 'error');
      setHasErrors(hasAnyErrors);
    } catch (error) {
      console.error('Error adding tasks:', error);
      setHasErrors(true);
    } finally {
      setIsComplete(true);
      setIsAdding(false);
    }
  };
  
  const handleRetryTask = async (taskIndex: number) => {
    try {
      // Update task status to adding
      const updatedTasks = [...tasks];
      updatedTasks[taskIndex] = { ...updatedTasks[taskIndex], status: 'adding' };
      setTasks(updatedTasks);
      
      await onRetryTask(taskIndex);
      
      // Update status after retry
      updatedTasks[taskIndex] = { ...updatedTasks[taskIndex], status: 'success' };
      setTasks(updatedTasks);
    } catch (error) {
      console.error('Error retrying task:', error);
      const updatedTasks = [...tasks];
      updatedTasks[taskIndex] = { 
        ...updatedTasks[taskIndex], 
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      setTasks(updatedTasks);
    }
  };
  
  return (
    <Dialog open={open} onClose={isAdding ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6" sx={{ fontSize: '1.1rem' }}>Bulk Add Tasks</Typography>
          {!isAdding && (
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          )}
        </Box>
      </DialogTitle>
      
      <DialogContent dividers sx={{ p: 2 }}>
        {!isComplete ? (
          <>
            {tasks.map((task, index) => (
              <Paper 
                key={index} 
                variant="outlined" 
                sx={{
                  p: 1.5,
                  mb: index < tasks.length - 1 ? 1 : 0,
                  position: 'relative'
                }}
              >
                <IconButton 
                  size="small" 
                  sx={{ 
                    position: 'absolute', 
                    top: 2, 
                    right: 2,
                    width: 20, 
                    height: 20 
                  }}
                  onClick={() => removeTask(index)}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <TextField
                    fullWidth
                    label="Task Title"
                    variant="outlined"
                    size="small"
                    value={task.title}
                    onChange={(e) => handleTaskTitleChange(index, e.target.value)}
                    inputProps={{ style: { fontSize: '0.9rem' } }}
                    sx={{ mb: 0.5 }}
                  />
                  
                  <Box sx={{ mb: 0.5 }}>
                    <CategorySelector
                      categories={categories}
                      selectedCategoryId={task.categoryId || ''}
                      onCategoryChange={(categoryId) => handleCategoryChange(index, categoryId)}
                      onCreateCategory={onCreateCategory}
                    />
                  </Box>
                  
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'start' }}>
                    <TextField
                      label="Minutes"
                      variant="outlined"
                      size="small"
                      type="number"
                      value={task.minutes}
                      onChange={(e) => handleMinutesChange(index, e.target.value)}
                      inputProps={{ min: 1, style: { fontSize: '0.9rem' } }}
                      sx={{ width: '100px' }}
                    />
                  
                    <Box sx={{ ml: 1 }}>
                      <Typography variant="caption" sx={{ mb: 0.5, display: 'block' }}>Days:</Typography>
                      <ToggleButtonGroup
                        value={task.selectedDays}
                        onChange={(_, newDays) => handleDaysChange(index, newDays)}
                        size="small"
                        aria-label="selected days"
                        sx={{ 
                          '& .MuiToggleButtonGroup-grouped': { 
                            px: 0.8, 
                            py: 0.3,
                            fontSize: '0.7rem'
                          } 
                        }}
                        // @ts-ignore - multiple exists but TypeScript definition might be outdated
                        multiple
                      >
                        {weekDays.map((day, idx) => (
                          <ToggleButton key={idx} value={idx} aria-label={day}>
                            {day.charAt(0)}
                          </ToggleButton>
                        ))}
                      </ToggleButtonGroup>
                    </Box>
                  </Box>
                </Box>
              </Paper>
            ))}
            
            <Button 
              onClick={addNewTaskInput} 
              variant="outlined" 
              fullWidth 
              size="small" 
              sx={{ mt: 1, fontSize: '0.8rem' }}
            >
              + Add Another Task
            </Button>
          </>
        ) : (
          <List sx={{ p: 0 }}>
            {tasks.map((task, index) => (
              <ListItem 
                key={index}
                data-bulk-task-index={index}
                data-status={task.status}
                data-task={JSON.stringify(task)}
                data-error={task.error}
                sx={{
                  borderLeft: '4px solid',
                  borderColor: 
                    task.status === 'success' ? 'success.main' : 
                    task.status === 'error' ? 'error.main' : 
                    task.status === 'adding' ? 'primary.main' : 
                    'grey.400',
                  mb: 0.5,
                  bgcolor: 'background.paper',
                  py: 1
                }}
              >
                <Box sx={{ display: 'flex', width: '100%', alignItems: 'center' }}>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {task.title} ({task.minutes} min)
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {task.selectedDays.length > 1 
                        ? `${task.selectedDays.length} days` 
                        : weekDays[task.selectedDays[0] || 0]
                      }
                    </Typography>
                  </Box>
                  
                  <Box>
                    {task.status === 'adding' && <CircularProgress size={20} />}
                    {task.status === 'success' && <CheckIcon color="success" fontSize="small" />}
                    {task.status === 'error' && (
                      <IconButton 
                        size="small" 
                        color="error"
                        onClick={() => handleRetryTask(index)}
                      >
                        <RefreshIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                </Box>
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
      
      <DialogActions sx={{ p: 2, justifyContent: isComplete ? 'space-between' : 'flex-end' }}>
        {isComplete ? (
          <>
            {hasErrors && (
              <Button 
                onClick={() => {
                  // Find all tasks with error status
                  const errorIndices = tasks
                    .map((task, index) => task.status === 'error' ? index : -1)
                    .filter(index => index !== -1);
                  
                  // Retry all failed tasks
                  errorIndices.forEach(index => handleRetryTask(index));
                }}
                startIcon={<RefreshIcon />}
                color="error"
                variant="outlined"
              >
                Retry Failed
              </Button>
            )}
            
            <Button onClick={onClose} color="primary" variant="contained">
              Close
            </Button>
          </>
        ) : (
          <>
            <Button onClick={onClose} disabled={isAdding}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddTasks} 
              variant="contained" 
              color="primary"
              disabled={isAdding || !validateTasks()}
            >
              {isAdding ? 'Adding...' : 'Add Tasks'}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default BulkTaskDialog;