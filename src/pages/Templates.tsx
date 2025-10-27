import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Box,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Fab,
  useTheme,
  useMediaQuery,
  Divider,
  CardActionArea,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Close as CloseIcon,
  CalendarToday as CalendarIcon,
  Edit as EditIcon,
  FileCopy as FileCopyIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useTaskManager } from '../context/TaskContext';
import { useAuth } from '../context/AuthContext';
import Loading from '../components/common/Loading';

const Templates: React.FC = () => {
  const {
    templates,
    loadTemplates,
    createNewTemplate,
    deleteTemplate,
    isLoading,
    error,
  } = useTaskManager();
  const { } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [searchTerm, setSearchTerm] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [nameError, setNameError] = useState('');

  useEffect(() => {
    loadTemplates();
  }, []);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const clearSearch = () => {
    setSearchTerm('');
  };

  const handleDialogOpen = () => {
    setCreateDialogOpen(true);
    setNewTemplateName('');
    setNameError('');
  };

  const handleDialogClose = () => {
    setCreateDialogOpen(false);
  };
  
  const handleDeleteDialogOpen = (templateId: string) => {
    setTemplateToDelete(templateId);
    setDeleteDialogOpen(true);
  };
  
  const handleDeleteDialogClose = () => {
    setDeleteDialogOpen(false);
    setTemplateToDelete(null);
  };
  
  const handleTemplateDelete = async () => {
    if (!templateToDelete) return;
    
    try {
      await deleteTemplate(templateToDelete);
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    } catch (err) {
      console.error('Failed to delete template:', err);
      // Error will be shown by the TaskContext
    }
  };

  const handleTemplateCreate = async () => {
    if (!newTemplateName.trim()) {
      setNameError('Template name is required');
      return;
    }

    try {
      const newTemplate = await createNewTemplate(newTemplateName.trim());
      setCreateDialogOpen(false);
      navigate(`/templates/${newTemplate.id}`);
    } catch (err) {
      console.error('Failed to create template:', err);
      // Error will be shown by the TaskContext
    }
  };

  const filteredTemplates = templates.filter((template) =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading && templates.length === 0) {
    return <Loading message="Loading templates..." />;
  }

  return (
    <Box sx={{ backgroundColor: 'rgba(173, 216, 230, 0.1)', pt: 2, pb: 4, minHeight: '100vh' }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" component="h1" gutterBottom>
          Templates
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Create and manage your task templates
        </Typography>
      </Box>

      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
        <TextField
          fullWidth
          placeholder="Search templates..."
          variant="outlined"
          value={searchTerm}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
            endAdornment: searchTerm && (
              <InputAdornment position="end">
                <IconButton size="small" onClick={clearSearch}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ),
          }}
          size={isMobile ? "small" : "medium"}
        />

        {!isMobile && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleDialogOpen}
            sx={{ whiteSpace: 'nowrap', minWidth: 'auto', py: 1 }}
          >
            New Template
          </Button>
        )}
      </Box>

      {error && (
        <Box sx={{ mb: 3 }}>
          <Typography color="error">{error}</Typography>
        </Box>
      )}

      {filteredTemplates.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography color="text.secondary" paragraph>
            No templates found
          </Typography>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={handleDialogOpen}
          >
            Create your first template
          </Button>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {filteredTemplates.map((template) => (
            <Grid item xs={12} sm={6} md={4} key={template.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                {/* Split card into clickable and non-clickable areas */}
                <Box 
                  onClick={() => navigate(`/templates/${template.id}`)}
                  sx={{ 
                    flexGrow: 1, 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'flex-start',
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' }
                  }}
                >
                  <CardContent sx={{ width: '100%', flexGrow: 1 }}>
                    <Typography variant="h6" component="h2" gutterBottom noWrap>
                      Template: {template.name}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <CalendarIcon fontSize="small" sx={{ color: 'text.secondary', mr: 1 }} />
                      <Typography variant="body2" color="text.secondary">
                        Last updated: {format(new Date(template.updatedAt), 'MMM d, yyyy')}
                      </Typography>
                    </Box>
                  </CardContent>
                </Box>
                
                {/* Separate actions area that isn't wrapped in a button */}
                <CardContent sx={{ pt: 0 }}>
                  <Divider sx={{ my: 1 }} />
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2, flexWrap: 'wrap', gap: 1 }}>
                    <Button
                      size="small"
                      startIcon={<EditIcon />}
                      onClick={() => navigate(`/templates/${template.id}`)}
                    >
                      Edit
                    </Button>
                    
                    <Button
                      size="small"
                      startIcon={<FileCopyIcon />}
                      onClick={() => navigate(`/plans/new?templateId=${template.id}`)}
                    >
                      Create Plan
                    </Button>
                    
                    <Button
                      size="small"
                      color="error"
                      startIcon={<DeleteIcon />}
                      onClick={() => handleDeleteDialogOpen(template.id)}
                    >
                      Delete
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Mobile FAB */}
      {isMobile && (
        <Fab
          color="primary"
          aria-label="add"
          onClick={handleDialogOpen}
          sx={{
            position: 'fixed',
            bottom: 72, // Position above bottom navigation
            right: 16,
          }}
        >
          <AddIcon />
        </Fab>
      )}

      {/* Create Template Dialog */}
      <Dialog open={createDialogOpen} onClose={handleDialogClose} fullWidth maxWidth="sm">
        <DialogTitle>Create New Template</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            id="template-name"
            label="Template Name"
            type="text"
            fullWidth
            variant="outlined"
            value={newTemplateName}
            onChange={(e) => {
              setNewTemplateName(e.target.value);
              if (e.target.value.trim()) {
                setNameError('');
              }
            }}
            error={!!nameError}
            helperText={nameError}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>Cancel</Button>
          <Button onClick={handleTemplateCreate} variant="contained">
            Create
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete Template Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleDeleteDialogClose} maxWidth="sm">
        <DialogTitle>Delete Template</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this template? This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteDialogClose}>Cancel</Button>
          <Button onClick={handleTemplateDelete} variant="contained" color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Templates;