import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import { Section } from '../../types';

const SECTION_COLORS = [
  '#1976d2', '#d32f2f', '#388e3c', '#f57c00',
  '#7b1fa2', '#00796b', '#5d4037', '#616161'
];

const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

type SectionDialogProps = {
  open: boolean;
  onClose: () => void;
  onSave: (sectionData: Omit<Section, 'id' | 'createdAt' | 'updatedAt'>, selectedDays?: number[]) => void;
  onDelete?: (sectionId: string) => void;
  section?: Section; // Optional section for editing
  defaultDay?: number; // Default day for new sections
};

const SectionDialog: React.FC<SectionDialogProps> = ({
  open,
  onClose,
  onSave,
  onDelete,
  section,
  defaultDay,
}) => {
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(SECTION_COLORS[0]);
  const [nameError, setNameError] = useState('');
  const [selectedDays, setSelectedDays] = useState<number[]>([]);

  useEffect(() => {
    if (open) {
      if (section) {
        // Editing existing section
        setName(section.title || '');
        setSelectedColor(section.color || SECTION_COLORS[0]);
        setSelectedDays([]); // Don't show day selection for editing
      } else {
        // Creating new section
        setName('');
        setSelectedColor(SECTION_COLORS[Math.floor(Math.random() * SECTION_COLORS.length)]);
        setSelectedDays(defaultDay !== undefined ? [defaultDay] : []);
      }
      setNameError('');
    }
  }, [open, section, defaultDay]);

  const handleSave = () => {
    if (!name.trim()) {
      setNameError('Section name is required');
      return;
    }

    onSave({
      title: name.trim(),
      color: selectedColor,
      order: section?.order ?? 0,
    }, section ? undefined : selectedDays);

    onClose();
  };

  const handleDaysChange = (_: React.MouseEvent<HTMLElement>, newSelectedDays: number[]) => {
    setSelectedDays(newSelectedDays);
  };

  const handleDelete = () => {
    if (section && onDelete) {
      onDelete(section.id);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{section ? 'Edit Section' : 'Add Section'}</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Section Name"
          type="text"
          fullWidth
          variant="outlined"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (e.target.value.trim()) {
              setNameError('');
            }
          }}
          error={!!nameError}
          helperText={nameError}
          sx={{ mb: 3 }}
        />

        <Typography variant="subtitle2" gutterBottom>
          Color
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {SECTION_COLORS.map((color) => (
            <Box
              key={color}
              onClick={() => setSelectedColor(color)}
              sx={{
                width: 40,
                height: 40,
                backgroundColor: color,
                borderRadius: 1,
                cursor: 'pointer',
                border: selectedColor === color ? '3px solid #000' : '2px solid transparent',
                '&:hover': {
                  opacity: 0.8,
                },
              }}
            />
          ))}
        </Box>

        {!section && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Add to Days:
            </Typography>
            <ToggleButtonGroup
              value={selectedDays}
              onChange={handleDaysChange}
              aria-label="selected days"
              sx={{ display: 'flex', flexWrap: 'wrap' }}
              // @ts-ignore - multiple exists but TypeScript definition might be outdated
              multiple
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
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        {section && onDelete && (
          <Button onClick={handleDelete} color="error">
            Delete
          </Button>
        )}
        <Button onClick={handleSave} variant="contained">
          {section ? 'Save' : 'Add Section'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SectionDialog;
