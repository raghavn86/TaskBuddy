import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  CardActionArea,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  FormHelperText,
  Menu,
  ListItemIcon,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Close as CloseIcon,
  CalendarToday as CalendarIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  ContentCopy as ContentCopyIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { format, parseISO, startOfWeek } from 'date-fns';
import { useTaskManager } from '../context/TaskContext';
import { useAuth } from '../context/AuthContext';
import Loading from '../components/common/Loading';

const ExecutionPlans: React.FC = () => {
  const {
    templates,
    executionPlans,
    loadTemplates,
    loadExecutionPlans,
    createNewExecutionPlan,
    deleteExecutionPlan,
    cloneExecutionPlan,
    createTemplateFromPlan,
    isLoading,
    error,
  } = useTaskManager();
  const { } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [searchTerm, setSearchTerm] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [cloneDialogOpen, setCloneDialogOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<string | null>(null);
  const [planToClone, setPlanToClone] = useState<string | null>(null);
  const [planToTemplate, setPlanToTemplate] = useState<string | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [templateName, setTemplateName] = useState('');
  // Always ensure the selected date is a Monday
  const [weekStartDate, setWeekStartDate] = useState(format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')); // Monday as week start (1)
  
  // Function to check if a date is a Monday
  const isMonday = (dateString: string): boolean => {
    const date = new Date(dateString);
    return date.getDay() === 1; // 1 is Monday in JS Date
  };
  
  // Function to handle date changes and ensure Monday
  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedDate = event.target.value;
    if (isMonday(selectedDate)) {
      setWeekStartDate(selectedDate);
    } else {
      // If not Monday, snap to the next Monday
      const date = new Date(selectedDate);
      const daysUntilMonday = (8 - date.getDay()) % 7;
      date.setDate(date.getDate() + daysUntilMonday);
      setWeekStartDate(format(date, 'yyyy-MM-dd'));
    }
  };

  // Get template ID from query params if available
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const templateId = params.get('templateId');
    if (templateId) {
      setSelectedTemplateId(templateId);
      setCreateDialogOpen(true);
    }
  }, [location]);

  useEffect(() => {
    loadTemplates();
    loadExecutionPlans();
  }, []);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const clearSearch = () => {
    setSearchTerm('');
  };

  const handleDialogOpen = () => {
    setCreateDialogOpen(true);
  };

  const handleDialogClose = () => {
    setCreateDialogOpen(false);
    // Clear template from URL params
    navigate('/plans', { replace: true });
  };
  
  const handleDeleteDialogOpen = (planId: string) => {
    setPlanToDelete(planId);
    setDeleteDialogOpen(true);
  };
  
  const handleDeleteDialogClose = () => {
    setDeleteDialogOpen(false);
    setPlanToDelete(null);
  };
  
  const handleMenuOpen = (event: React.MouseEvent<HTMLButtonElement>, planId: string) => {
    setAnchorEl(event.currentTarget);
    // Store the current plan ID for future actions
    setPlanToDelete(planId);
    setPlanToClone(planId);
    setPlanToTemplate(planId);
  };
  
  const handleMenuClose = () => {
    setAnchorEl(null);
  };
  
  const handleCloneClick = () => {
    handleMenuClose();
    setCloneDialogOpen(true);
  };
  
  const handleCloneDialogClose = () => {
    setCloneDialogOpen(false);
    setPlanToClone(null);
  };
  
  const handleClonePlan = async () => {
    if (!planToClone) return;
    
    try {
      const newPlan = await cloneExecutionPlan(planToClone, weekStartDate);
      setCloneDialogOpen(false);
      setPlanToClone(null);
      navigate(`/plans/${newPlan.id}`);
    } catch (err) {
      console.error('Failed to clone execution plan:', err);
    }
  };
  
  const handleCreateTemplateClick = () => {
    handleMenuClose();
    // Find the current plan to pre-fill the template name
    const plan = executionPlans.find(p => p.id === planToTemplate);
    setTemplateName(plan ? plan.name : '');
    setTemplateDialogOpen(true);
  };
  
  const handleTemplateDialogClose = () => {
    setTemplateDialogOpen(false);
    setPlanToTemplate(null);
  };
  
  const handleCreateTemplate = async () => {
    if (!planToTemplate || !templateName.trim()) return;
    
    try {
      const newTemplate = await createTemplateFromPlan(planToTemplate, templateName);
      setTemplateDialogOpen(false);
      setPlanToTemplate(null);
      navigate(`/templates/${newTemplate.id}`);
    } catch (err) {
      console.error('Failed to create template from plan:', err);
    }
  };
  
  const handlePlanDelete = async () => {
    if (!planToDelete) return;
    
    try {
      await deleteExecutionPlan(planToDelete);
      setDeleteDialogOpen(false);
      setPlanToDelete(null);
    } catch (err) {
      console.error('Failed to delete execution plan:', err);
      // Error will be shown by the TaskContext
    }
  };

  const handlePlanCreate = async () => {
    if (!selectedTemplateId) return;

    try {
      const newPlan = await createNewExecutionPlan(selectedTemplateId, weekStartDate);
      setCreateDialogOpen(false);
      navigate(`/plans/${newPlan.id}`);
    } catch (err) {
      console.error('Failed to create execution plan:', err);
    }
  };

  const filteredPlans = executionPlans
    .filter((plan) => {
      const weekDateString = format(parseISO(plan.weekStartDate), 'MMM d, yyyy').toLowerCase();
      return plan.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
             weekDateString.includes(searchTerm.toLowerCase());
    })
    .sort((a, b) => new Date(b.weekStartDate).getTime() - new Date(a.weekStartDate).getTime()); // Sort by date descending (newest first)

  if (isLoading && executionPlans.length === 0) {
    return <Loading message="Loading plans..." />;
  }

  return (
    <>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" component="h1" gutterBottom>
          Execution Plans
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Manage your weekly task plans
        </Typography>
      </Box>

      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
        <TextField
          fullWidth
          placeholder="Search by plan name or week..."
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
            New Plan
          </Button>
        )}
      </Box>

      {error && (
        <Box sx={{ mb: 3 }}>
          <Typography color="error">{error}</Typography>
        </Box>
      )}

      {filteredPlans.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography color="text.secondary" paragraph>
            No execution plans found
          </Typography>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={handleDialogOpen}
          >
            Create your first plan
          </Button>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {filteredPlans.map((plan) => {
            
            return (
              <Grid item xs={12} sm={6} md={4} key={plan.id}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  {/* Split into clickable header and non-clickable action area */}
                  <Box 
                    onClick={() => navigate(`/plans/${plan.id}`)}
                    sx={{ 
                      flexGrow: 1, 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'flex-start',
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'action.hover' }
                    }}
                  >
                    <CardContent sx={{ width: '100%', py: 1.5, px: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <CalendarIcon fontSize="small" sx={{ color: 'text.primary', mr: 1 }} />
                        <Typography variant="h6" component="h2" sx={{ mb: 0 }} noWrap>
                          Week of {format(parseISO(plan.weekStartDate), 'MMM d, yyyy')}
                        </Typography>
                      </Box>
                      
                      <Typography variant="body2" color="text.secondary" noWrap sx={{ mb: 1 }}>
                        Plan: {plan.name}
                      </Typography>
                    </CardContent>
                  </Box>
                  
                  {/* Simplified actions area */}
                  <CardContent sx={{ pt: 0, pb: 1.5, px: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 0.5 }}>
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuOpen(e, plan.id)}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
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

      {/* Create Plan Dialog */}
      <Dialog open={createDialogOpen} onClose={handleDialogClose} fullWidth maxWidth="sm">
        <DialogTitle>Create New Execution Plan</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <FormControl fullWidth margin="normal">
              <InputLabel id="template-select-label">Template</InputLabel>
              <Select
                labelId="template-select-label"
                id="template-select"
                value={selectedTemplateId}
                label="Template"
                onChange={(e) => setSelectedTemplateId(e.target.value)}
              >
                {templates.length === 0 ? (
                  <MenuItem value="">
                    <em>No templates available</em>
                  </MenuItem>
                ) : (
                  templates.map((template) => (
                    <MenuItem key={template.id} value={template.id}>
                      {template.name}
                    </MenuItem>
                  ))
                )}
              </Select>
              <FormHelperText>Select a template to create your execution plan</FormHelperText>
            </FormControl>
            
            <TextField
              margin="normal"
              label="Week Start Date (Monday)"
              type="date"
              fullWidth
              value={weekStartDate}
              onChange={handleDateChange}
              InputLabelProps={{
                shrink: true,
              }}
              helperText="Must be a Monday. Non-Monday dates will be adjusted to the next Monday."
              onBlur={(e) => {
                // Double check on blur to ensure we have a Monday
                if (!isMonday(e.target.value)) {
                  handleDateChange(e as React.ChangeEvent<HTMLInputElement>);
                }
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>Cancel</Button>
          <Button onClick={handlePlanCreate} variant="contained" disabled={!selectedTemplateId}>
            Create
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => {
          handleMenuClose();
          if (planToDelete) navigate(`/plans/${planToDelete}`);
        }}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          Edit
        </MenuItem>
        <MenuItem onClick={handleCloneClick}>
          <ListItemIcon>
            <ContentCopyIcon fontSize="small" />
          </ListItemIcon>
          Clone
        </MenuItem>
        <MenuItem onClick={handleCreateTemplateClick}>
          <ListItemIcon>
            <SaveIcon fontSize="small" />
          </ListItemIcon>
          Create Template
        </MenuItem>
        <MenuItem onClick={() => {
          handleMenuClose();
          setDeleteDialogOpen(true);
        }} sx={{ color: theme.palette.error.main }}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          Delete
        </MenuItem>
      </Menu>
      
      {/* Delete Plan Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleDeleteDialogClose} maxWidth="sm">
        <DialogTitle>Delete Execution Plan</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this execution plan? This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteDialogClose}>Cancel</Button>
          <Button onClick={handlePlanDelete} variant="contained" color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Clone Plan Dialog */}
      <Dialog open={cloneDialogOpen} onClose={handleCloneDialogClose} maxWidth="sm">
        <DialogTitle>Clone Execution Plan</DialogTitle>
        <DialogContent>
          <Typography paragraph>Create a copy of this execution plan for a different week.</Typography>
          <TextField
            margin="normal"
            label="Week Start Date (Monday)"
            type="date"
            fullWidth
            value={weekStartDate}
            onChange={handleDateChange}
            InputLabelProps={{
              shrink: true,
            }}
            helperText="Must be a Monday. Non-Monday dates will be adjusted to the next Monday."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloneDialogClose}>Cancel</Button>
          <Button onClick={handleClonePlan} variant="contained">
            Clone Plan
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Create Template from Plan Dialog */}
      <Dialog open={templateDialogOpen} onClose={handleTemplateDialogClose} maxWidth="sm">
        <DialogTitle>Create Template from Plan</DialogTitle>
        <DialogContent>
          <Typography paragraph>Create a reusable template from this execution plan.</Typography>
          <TextField
            margin="normal"
            label="Template Name"
            type="text"
            fullWidth
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder="Enter template name"
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleTemplateDialogClose}>Cancel</Button>
          <Button 
            onClick={handleCreateTemplate} 
            variant="contained" 
            disabled={!templateName.trim()}
          >
            Create Template
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ExecutionPlans;