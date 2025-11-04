import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Paper,
  Typography,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { WellnessCategory } from '../../types/wellness';
import { getRandomColor } from '../../utils/wellnessHelpers';

type CategoryManagementDialogProps = {
  open: boolean;
  categories: WellnessCategory[];
  onClose: () => void;
  onAdd: (name: string, color: string) => void;
  onEdit: (categoryId: string, name: string, color: string) => void;
  onDelete: (categoryId: string) => void;
};

const CategoryManagementDialog: React.FC<CategoryManagementDialogProps> = ({
  open,
  categories,
  onClose,
  onAdd,
  onEdit,
  onDelete,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(getRandomColor());
  const [isAdding, setIsAdding] = useState(false);

  const handleStartAdd = () => {
    setIsAdding(true);
    setNewName('');
    setNewColor(getRandomColor());
  };

  const handleCancelAdd = () => {
    setIsAdding(false);
    setNewName('');
  };

  const handleAdd = () => {
    if (!newName.trim()) return;

    onAdd(newName.trim(), newColor);
    setIsAdding(false);
    setNewName('');
    setNewColor(getRandomColor());
  };

  const handleStartEdit = (category: WellnessCategory) => {
    setEditingId(category.id);
    setNewName(category.name);
    setNewColor(category.color);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setNewName('');
  };

  const handleSaveEdit = () => {
    if (!editingId || !newName.trim()) return;

    onEdit(editingId, newName.trim(), newColor);
    setEditingId(null);
    setNewName('');
  };

  const handleDelete = (categoryId: string) => {
    if (window.confirm('Are you sure? Tasks with this category will have no category.')) {
      onDelete(categoryId);
    }
  };

  const predefinedColors = [
    '#1976d2', '#9c27b0', '#f50057', '#ff5722',
    '#4caf50', '#ff9800', '#00bcd4', '#ffeb3b',
    '#795548', '#607d8b',
  ];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Manage Categories</DialogTitle>

      <DialogContent>
        <List>
          {categories.map((category) => (
            <ListItem
              key={category.id}
              sx={{
                mb: 1,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
              }}
            >
              {editingId === category.id ? (
                <Box sx={{ width: '100%', display: 'flex', gap: 1, alignItems: 'center' }}>
                  <TextField
                    size="small"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    fullWidth
                  />
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {predefinedColors.map((color) => (
                      <Box
                        key={color}
                        onClick={() => setNewColor(color)}
                        sx={{
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          bgcolor: color,
                          cursor: 'pointer',
                          border: newColor === color ? '2px solid black' : 'none',
                        }}
                      />
                    ))}
                  </Box>
                  <Button size="small" onClick={handleSaveEdit}>
                    Save
                  </Button>
                  <Button size="small" onClick={handleCancelEdit}>
                    Cancel
                  </Button>
                </Box>
              ) : (
                <>
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      bgcolor: category.color,
                      mr: 2,
                    }}
                  />
                  <ListItemText primary={category.name} />
                  <IconButton
                    size="small"
                    onClick={() => handleStartEdit(category)}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleDelete(category.id)}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </>
              )}
            </ListItem>
          ))}

          {isAdding ? (
            <ListItem
              sx={{
                mb: 1,
                border: '1px solid',
                borderColor: 'primary.main',
                borderRadius: 1,
              }}
            >
              <Box sx={{ width: '100%', display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                <TextField
                  size="small"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Category name"
                  fullWidth
                  autoFocus
                />
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                  {predefinedColors.map((color) => (
                    <Box
                      key={color}
                      onClick={() => setNewColor(color)}
                      sx={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        bgcolor: color,
                        cursor: 'pointer',
                        border: newColor === color ? '2px solid black' : 'none',
                      }}
                    />
                  ))}
                </Box>
                <Button size="small" onClick={handleAdd} disabled={!newName.trim()}>
                  Add
                </Button>
                <Button size="small" onClick={handleCancelAdd}>
                  Cancel
                </Button>
              </Box>
            </ListItem>
          ) : (
            <Button
              startIcon={<AddIcon />}
              onClick={handleStartAdd}
              fullWidth
              variant="outlined"
            >
              Add Category
            </Button>
          )}
        </List>

        {categories.length === 0 && !isAdding && (
          <Typography variant="body2" color="text.secondary" textAlign="center" py={3}>
            No categories yet. Add one to organize your tasks!
          </Typography>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default CategoryManagementDialog;
