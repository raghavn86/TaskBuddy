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
  FormHelperText,
  SelectChangeEvent,
  Box,
  Typography,
  IconButton,
  Checkbox,
  FormControlLabel,
  ToggleButton,
  ToggleButtonGroup,
  Snackbar,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { Task, TaskCategory } from '../../types';
import { useTaskManager } from '../../context/TaskContext';
import CategorySelector from './CategorySelector';

type TaskDialogProps = {
  open: boolean;
  onClose: () => void;
  task?: Task;
  onAddTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>, selectedDays?: number[]) => void | Promise<void>;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void | Promise<void>;
  onMoveTaskBetweenDays?: (sourceDayOfWeek: number, targetDayOfWeek: number, oldIndex: number, newIndex: number, taskId: string, newAssignedTo?: string | null) => void | Promise<void>;
  dialogTitle?: string;
  isWeekView?: boolean;
  currentDayIndex?: number;
  categories?: TaskCategory[];
  onCreateCategory: (category: Omit<TaskCategory, 'id'>) => void;
  tasks?: Task[]; // Current day's tasks to find task index
};

const TaskDialog: React.FC<TaskDialogProps> = ({
  open,
  onClose,
  task,
  onAddTask,
  onUpdateTask,
  onMoveTaskBetweenDays,
  dialogTitle = 'Add Task',
  isWeekView = false,
  currentDayIndex = 0,
  categories = [],
  onCreateCategory,
  tasks = [],
}) => {
  const { taskService } = useTaskManager();
  const [title, setTitle] = useState('');
  const [minutes, setMinutes] = useState<string>('30');
  const [assignedTo, setAssignedTo] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string>('');
  const [errors, setErrors] = useState<{ title?: string; minutes?: string }>({});
  const [selectedDays, setSelectedDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]); // Default to all days selected
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [notes, setNotes] = useState('');
  
  const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setMinutes(task.minutes.toString());
      setAssignedTo(task.assignedTo);
      setCategoryId(task.categoryId || '');
      setSelectedDays([currentDayIndex]); // Start with current day selected
      setNotes(task.notes || '');
    } else {
      setTitle('');
      setMinutes('30');
      setAssignedTo(null);
      setCategoryId('');
      setSelectedDays([currentDayIndex]); // Default to current day
      setNotes('');
    }
    setErrors({});
    setSaveError(null);
    setIsSaving(false);
    setShowSuccess(false);
  }, [task, open, currentDayIndex]);
  
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    if (e.target.value.trim()) {
      setErrors((prev) => ({ ...prev, title: undefined }));
    }
  };
  
  const handleMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMinutes(value);
    
    const numValue = parseInt(value);
    if (!isNaN(numValue) && numValue > 0) {
      setErrors((prev) => ({ ...prev, minutes: undefined }));
    }
  };
  
  const handleAssigneeChange = (e: SelectChangeEvent<string>) => {
    setAssignedTo(e.target.value || null);
  };
  
  const handleDaysChange = (event: React.MouseEvent<HTMLElement>, newSelectedDays: number[]) => {
    if (task) {
      // For editing existing tasks, only allow single day selection
      setSelectedDays(newSelectedDays.length ? [newSelectedDays[newSelectedDays.length - 1]] : [currentDayIndex]);
    } else {
      // For new tasks, allow multiple days
      setSelectedDays(newSelectedDays.length ? newSelectedDays : [currentDayIndex]);
    }
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setNotes(e.target.value);
  };
  
  const handleSave = async () => {
    // Validate inputs
    const newErrors: { title?: string; minutes?: string } = {};

    if (!title.trim()) {
      newErrors.title = 'Title is required';
    }

    const minutesNum = parseInt(minutes);
    if (isNaN(minutesNum) || minutesNum <= 0) {
      newErrors.minutes = 'Minutes must be a positive number';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const taskData = {
      title: title.trim(),
      minutes: minutesNum,
      assignedTo,
      categoryId,
      completed: task?.completed || false,
      notes: notes.trim(),
    };

    setIsSaving(true);
    setSaveError(null);

    try {
      if (task) {
        // Editing existing task
        const newDay = selectedDays[0];

        // If day changed and we have the move function, move the task
        if (newDay !== currentDayIndex && onMoveTaskBetweenDays) {
          const taskIndex = tasks.findIndex(t => t.id === task.id);
          await onMoveTaskBetweenDays(currentDayIndex, newDay, taskIndex, 0, task.id);
        }

        // Update task data
        await onUpdateTask(task.id, taskData);
      } else {
        // Adding new task
        await onAddTask(taskData, selectedDays);
      }

      // Show success message briefly
      setShowSuccess(true);

      // Close dialog after a short delay to show success
      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (error) {
      console.error('Error saving task:', error);
      setSaveError(error instanceof Error ? error.message : 'Failed to save task. Please try again.');
      setIsSaving(false);
    }
  };
  
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">{dialogTitle}</Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent dividers>
        <TextField
          autoFocus
          margin="dense"
          id="task-title"
          label="Task Title"
          type="text"
          fullWidth
          value={title}
          onChange={handleTitleChange}
          error={!!errors.title}
          helperText={errors.title}
          sx={{ mb: 3 }}
        />
        
        <TextField
          margin="dense"
          id="task-minutes"
          label="Duration (minutes)"
          type="number"
          fullWidth
          value={minutes}
          onChange={handleMinutesChange}
          error={!!errors.minutes}
          helperText={errors.minutes}
          inputProps={{ min: 1 }}
          sx={{ mb: 3 }}
        />
        
        <CategorySelector
          categories={categories}
          selectedCategoryId={categoryId}
          onCategoryChange={setCategoryId}
          onCreateCategory={onCreateCategory}
        />

        <TextField
          margin="dense"
          id="task-notes"
          label="Notes"
          type="text"
          multiline
          minRows={3}
          fullWidth
          value={notes}
          onChange={handleNotesChange}
          placeholder="Add extra context or instructions"
          sx={{ mb: 3 }}
        />
        
        <FormControl fullWidth sx={{ mb: isWeekView ? 3 : 0 }}>
          <InputLabel id="assignee-label">Assigned To</InputLabel>
          <Select
            labelId="assignee-label"
            id="assignee-select"
            value={assignedTo || ''}
            label="Assigned To"
            onChange={handleAssigneeChange}
          >
            <MenuItem value="">
              <em>Unassigned</em>
            </MenuItem>
            <MenuItem value={taskService.userId}>Me</MenuItem>
            <MenuItem value={taskService.partnerId}>{taskService.partnerName}</MenuItem>
          </Select>
          <FormHelperText>Who should work on this task?</FormHelperText>
        </FormControl>
        
        {(isWeekView || task) && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              {task ? 'Move to Day:' : 'Add to Days:'}
            </Typography>
            <ToggleButtonGroup
              value={selectedDays}
              onChange={handleDaysChange}
              aria-label="selected days"
              sx={{ display: 'flex', flexWrap: 'wrap' }}
              // @ts-ignore - multiple exists but TypeScript definition might be outdated
              multiple={!task} // Single selection when editing existing task
            >
              {weekDays.map((day, idx) => (
                <ToggleButton 
                  key={idx} 
                  value={idx} 
                  aria-label={day}
                  sx={{ minWidth: '3rem', flex: '1 0 auto' }}
                >
                  {day.charAt(0)}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            <FormHelperText>
              {task ? 'Select which day to move this task to' : 'Select which days to add this task to'}
            </FormHelperText>
          </Box>
        )}
      </DialogContent>
      
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={isSaving}>Cancel</Button>
        <Button
          onClick={handleSave}
          variant="contained"
          color="primary"
          disabled={isSaving}
          startIcon={isSaving ? <CircularProgress size={20} color="inherit" /> : null}
        >
          {isSaving ? 'Saving...' : task ? 'Update' : 'Add'} {!isSaving && 'Task'}
        </Button>
      </DialogActions>

      {/* Error Snackbar */}
      <Snackbar
        open={!!saveError}
        autoHideDuration={6000}
        onClose={() => setSaveError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSaveError(null)} severity="error" sx={{ width: '100%' }}>
          {saveError}
        </Alert>
      </Snackbar>

      {/* Success Snackbar */}
      <Snackbar
        open={showSuccess}
        autoHideDuration={2000}
        onClose={() => setShowSuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setShowSuccess(false)} severity="success" sx={{ width: '100%' }}>
          Task {task ? 'updated' : 'added'} successfully!
        </Alert>
      </Snackbar>
    </Dialog>
  );
};

export default TaskDialog;
