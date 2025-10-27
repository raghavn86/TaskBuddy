import React, { useState } from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip,
  SelectChangeEvent,
} from '@mui/material';
import { Add as AddIcon, Close as CloseIcon } from '@mui/icons-material';
import { TaskCategory } from '../../types';

const DEFAULT_COLORS = [
  '#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5',
  '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4caf50',
  '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107', '#ff9800',
  '#ff5722', '#795548', '#9e9e9e', '#607d8b'
];

type CategorySelectorProps = {
  categories: TaskCategory[];
  selectedCategoryId?: string;
  onCategoryChange: (categoryId: string) => void;
  onCreateCategory: (category: Omit<TaskCategory, 'id'>) => void;
};

const CategorySelector: React.FC<CategorySelectorProps> = ({
  categories,
  selectedCategoryId = '',
  onCategoryChange,
  onCreateCategory,
}) => {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState(DEFAULT_COLORS[0]);

  const handleCategoryChange = (event: SelectChangeEvent) => {
    const value = event.target.value;
    if (value === 'create-new') {
      setShowCreateDialog(true);
    } else {
      onCategoryChange(value);
    }
  };

  const handleCreateCategory = () => {
    if (newCategoryName.trim()) {
      onCreateCategory({
        name: newCategoryName.trim(),
        color: newCategoryColor,
      });
      setNewCategoryName('');
      setNewCategoryColor(DEFAULT_COLORS[0]);
      setShowCreateDialog(false);
    }
  };

  const selectedCategory = categories.find(c => c.id === selectedCategoryId);

  return (
    <>
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>Category</InputLabel>
        <Select
          value={selectedCategoryId}
          onChange={handleCategoryChange}
          label="Category"
          renderValue={(value) => {
            if (!value) return 'No Category';
            const category = categories.find(c => c.id === value);
            return category ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    backgroundColor: category.color,
                  }}
                />
                {category.name}
              </Box>
            ) : 'No Category';
          }}
        >
          <MenuItem value="">
            <em>No Category</em>
          </MenuItem>
          {categories.map((category) => (
            <MenuItem key={category.id} value={category.id}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    backgroundColor: category.color,
                  }}
                />
                {category.name}
              </Box>
            </MenuItem>
          ))}
          <MenuItem value="create-new">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AddIcon fontSize="small" />
              Create New Category
            </Box>
          </MenuItem>
        </Select>
      </FormControl>

      <Dialog open={showCreateDialog} onClose={() => setShowCreateDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            Create New Category
            <IconButton onClick={() => setShowCreateDialog(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Category Name"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            sx={{ mb: 2 }}
          />
          <Box>
            <InputLabel sx={{ mb: 1 }}>Color</InputLabel>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {DEFAULT_COLORS.map((color) => (
                <Box
                  key={color}
                  onClick={() => setNewCategoryColor(color)}
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    backgroundColor: color,
                    cursor: 'pointer',
                    border: newCategoryColor === color ? '3px solid #000' : '2px solid transparent',
                    '&:hover': {
                      transform: 'scale(1.1)',
                    },
                  }}
                />
              ))}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCreateDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateCategory} variant="contained" disabled={!newCategoryName.trim()}>
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default CategorySelector;
