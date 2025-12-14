import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  Box,
} from '@mui/material';

type TaskNotesDialogProps = {
  open: boolean;
  taskTitle: string;
  initialNotes?: string;
  onClose: () => void;
  onSave: (notes: string) => Promise<void> | void;
};

const TaskNotesDialog: React.FC<TaskNotesDialogProps> = ({
  open,
  taskTitle,
  initialNotes = '',
  onClose,
  onSave,
}) => {
  const [notes, setNotes] = useState(initialNotes);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setNotes(initialNotes || '');
      setError(null);
    }
  }, [initialNotes, open]);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await onSave(notes.trim());
      onClose();
    } catch (err) {
      console.error('Failed to save notes', err);
      setError(err instanceof Error ? err.message : 'Unable to save notes right now.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Task Notes</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {taskTitle}
        </Typography>
        <TextField
          autoFocus
          fullWidth
          multiline
          minRows={4}
          maxRows={12}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add or update task notes..."
        />
        {error && (
          <Box sx={{ mt: 2 }}>
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={isSaving}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={isSaving}
          startIcon={isSaving ? <CircularProgress size={18} color="inherit" /> : null}
        >
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TaskNotesDialog;
