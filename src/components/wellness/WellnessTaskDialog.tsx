import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Chip,
} from '@mui/material';
import { DisplayWellnessTask, RecurrenceType, WellnessCategory } from '../../types/wellness';
import { getRecurrenceLabel } from '../../utils/wellnessHelpers';

type WellnessTaskDialogProps = {
  open: boolean;
  task?: DisplayWellnessTask;
  editSeries?: boolean;
  categories: WellnessCategory[];
  onClose: () => void;
  onSave: (data: {
    title: string;
    recurrence: RecurrenceType;
    categoryId?: string;
  }) => void;
  onManageCategories?: () => void;
};

const recurrenceOptions: RecurrenceType[] = [
  'one_time',
  'weekly',
  'weekdays',
  'weekends',
  'monthly',
];

const WellnessTaskDialog: React.FC<WellnessTaskDialogProps> = ({
  open,
  task,
  editSeries = false,
  categories,
  onClose,
  onSave,
  onManageCategories,
}) => {
  const [title, setTitle] = useState('');
  const [recurrence, setRecurrence] = useState<RecurrenceType>('weekly');
  const [categoryId, setCategoryId] = useState<string>('');

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setRecurrence(task.recurrence);
      setCategoryId(task.categoryId || '');
    } else {
      setTitle('');
      setRecurrence('weekly');
      setCategoryId('');
    }
  }, [task, open]);

  const handleSave = () => {
    if (!title.trim()) return;

    onSave({
      title: title.trim(),
      recurrence,
      categoryId: categoryId || undefined,
    });

    handleClose();
  };

  const handleClose = () => {
    setTitle('');
    setRecurrence('weekly');
    setCategoryId('');
    onClose();
  };

  const isEditMode = !!task;
  const dialogTitle = isEditMode
    ? editSeries
      ? 'Edit Task Series'
      : 'Edit Task Instance'
    : 'Add New Task';

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {dialogTitle}
        {isEditMode && task && (
          <Box mt={1}>
            {task.isInstance && !editSeries && (
              <Chip
                label="Editing this instance only"
                size="small"
                color="info"
                sx={{ mr: 1 }}
              />
            )}
            {task.recurrence !== 'one_time' && editSeries && (
              <Chip
                label="Editing entire series"
                size="small"
                color="warning"
              />
            )}
          </Box>
        )}
      </DialogTitle>

      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            label="Task Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            fullWidth
            required
            autoFocus
          />

          <FormControl fullWidth disabled={isEditMode && !editSeries}>
            <InputLabel>Recurrence</InputLabel>
            <Select
              value={recurrence}
              onChange={(e) => setRecurrence(e.target.value as RecurrenceType)}
              label="Recurrence"
            >
              {recurrenceOptions.map((option) => (
                <MenuItem key={option} value={option}>
                  {getRecurrenceLabel(option)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {isEditMode && !editSeries && (
            <Typography variant="caption" color="text.secondary">
              To change recurrence, edit the series instead.
            </Typography>
          )}

          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <InputLabel>Category (Optional)</InputLabel>
              {onManageCategories && (
                <Button size="small" onClick={onManageCategories}>
                  Manage Categories
                </Button>
              )}
            </Box>
            <FormControl fullWidth>
              <Select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                displayEmpty
              >
                <MenuItem value="">
                  <em>No Category</em>
                </MenuItem>
                {categories.map((category) => (
                  <MenuItem key={category.id} value={category.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box
                        sx={{
                          width: 16,
                          height: 16,
                          borderRadius: '50%',
                          bgcolor: category.color,
                        }}
                      />
                      {category.name}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={!title.trim()}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default WellnessTaskDialog;
