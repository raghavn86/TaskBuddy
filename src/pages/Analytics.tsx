import React, { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  SelectChangeEvent,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  useTheme,
  useMediaQuery,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  LinearProgress,
  Alert,
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon, Edit as EditIcon } from '@mui/icons-material';
import { format, parseISO } from 'date-fns';
import { useTaskManager } from '../context/TaskContext';
import { usePartnership } from '../context/PartnershipContext';
import { useAuth } from '../context/AuthContext';
import Loading from '../components/common/Loading';
import { DayPlan, Task, TaskCategory, TaskItem, WeekPlan, ExecutionPlan } from '../types';
import { PartnerProfile } from '../types/partnership';
import { updateTask } from '../firebase/services';

interface CategoryDistribution {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  totalMinutes: number;
  tasks: TaskDistribution[];
}

interface TaskDistribution {
  taskName: string;
  minutes: number;
  assignedTo: string[];
}

const Analytics: React.FC = () => {
  const { executionPlans, templates, isLoading, categories = [], updateTaskDetails, createNewCategory, selectExecutionPlan, loadExecutionPlans, activeExecutionPlan } = useTaskManager();
  const { activePartnership } = usePartnership();
  const { currentUser } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [categoryDistribution, setCategoryDistribution] = useState<CategoryDistribution[]>([]);
  const [bulkEditDialog, setBulkEditDialog] = useState(false);
  const [selectedTaskName, setSelectedTaskName] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [updateProgress, setUpdateProgress] = useState(0);
  const [templateProgress, setTemplateProgress] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateComplete, setUpdateComplete] = useState(false);
  const [tasksToUpdate, setTasksToUpdate] = useState(0);
  const [templateTasksToUpdate, setTemplateTasksToUpdate] = useState(0);
  const [selectedPeople, setSelectedPeople] = useState<(string | null)[]>([]);

  const calculateTaskDistribution = () => {
    const plan = executionPlans.find(p => p.id === selectedPlanId);
    if (!plan) return;

    const categoryMap = new Map<string, Map<string, TaskDistribution>>();

    Object.values(plan.days).forEach((day: DayPlan) => {
      Object.values(day.tasks).forEach((taskItem: TaskItem) => {
        if (taskItem.type !== 'task') return;
        
        const task = taskItem.item as Task;
        const shouldInclude = selectedPeople.length === 0 || 
          selectedPeople.some(personId => 
            (personId === null && !task.assignedTo) ||
            task.assignedTo === personId
          );

        if (shouldInclude) {
          const categoryId = task.categoryId || '';
          const taskKey = task.title;
          
          if (!categoryMap.has(categoryId)) {
            categoryMap.set(categoryId, new Map());
          }
          
          const categoryTasks = categoryMap.get(categoryId)!;
          
          if (categoryTasks.has(taskKey)) {
            const existing = categoryTasks.get(taskKey)!;
            existing.minutes += task.minutes;
            if (task.assignedTo && !existing.assignedTo.includes(task.assignedTo)) {
              existing.assignedTo.push(task.assignedTo);
            }
          } else {
            categoryTasks.set(taskKey, {
              taskName: task.title,
              minutes: task.minutes,
              assignedTo: task.assignedTo ? [task.assignedTo] : []
            });
          }
        }
      });
    });

    const distribution = Array.from(categoryMap.entries()).map(([categoryId, categoryTasks]) => {
      const category = categories.find(c => c.id === categoryId);
      const tasks = Array.from(categoryTasks.values());
      const categoryMinutes = tasks.reduce((sum, task) => sum + task.minutes, 0);
      
      return {
        categoryId,
        categoryName: category?.name || 'No Category',
        categoryColor: category?.color || '#9e9e9e',
        totalMinutes: categoryMinutes,
        tasks: tasks
      };
    }).sort((a, b) => b.totalMinutes - a.totalMinutes);
    
    setCategoryDistribution(distribution);
  };

  // Initialize selectedPlanId with activeExecutionPlan
  useEffect(() => {
    if (activeExecutionPlan && !selectedPlanId) {
      setSelectedPlanId(activeExecutionPlan.id);
    } else if (executionPlans.length > 0 && !selectedPlanId) {
      // Find plan that contains today's date
      const today = new Date();
      const currentWeekPlan = executionPlans.find(plan => {
        const weekStart = new Date(plan.weekStartDate);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        return today >= weekStart && today <= weekEnd;
      });
      
      let planId = '';
      if (currentWeekPlan) {
        planId = currentWeekPlan.id;
      } else {
        // Fallback to most recent plan
        const sorted = [...executionPlans].sort((a, b) => 
          new Date(b.weekStartDate).getTime() - new Date(a.weekStartDate).getTime()
        );
        planId = sorted[0]?.id || '';
      }
      
      setSelectedPlanId(planId);
      if (planId) {
        selectExecutionPlan(planId);
      }
    }
  }, [executionPlans, selectedPlanId, activeExecutionPlan]);

  // Initialize selectedPeople
  useEffect(() => {
    if (activePartnership) {
      const availablePeople = Object.values(activePartnership.partners).map((partner: any) => partner.userId);
      setSelectedPeople(availablePeople);
    }
  }, [activePartnership]);

  // Calculate distribution when dependencies change
  useEffect(() => {
    if (selectedPlanId && activePartnership) {
      calculateTaskDistribution();
    }
  }, [selectedPlanId, selectedPeople, executionPlans, categories]);

  if (isLoading) return <Loading />;
  
  if (!activePartnership) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" color="text.secondary">
          Please select a partnership to view analytics.
        </Typography>
      </Box>
    );
  }

  const getDisplayName = (userId: string | null): string => {
    if (!userId) return 'Unassigned';
    if (userId === currentUser?.uid) return 'Me';
    const partner = Object.values(activePartnership.partners).find((p: PartnerProfile) => p.userId === userId);
    return partner ? partner.nickname : 'Unknown';
  };

  const availablePeople = [
    ...Object.values(activePartnership.partners).map((partner: PartnerProfile) => ({
      userId: partner.userId,
      nickname: getDisplayName(partner.userId)
    })),
    { userId: null, nickname: 'Unassigned' }
  ];

  const sortedPlans = [...executionPlans].sort((a, b) => 
    new Date(b.weekStartDate).getTime() - new Date(a.weekStartDate).getTime()
  );

  const handlePersonChange = (userId: string | null) => {
    setSelectedPeople(prev => 
      prev.includes(userId) 
        ? prev.filter(p => p !== userId)
        : [...prev, userId]
    );
  };

  const handlePlanChange = (event: SelectChangeEvent) => {
    setSelectedPlanId(event.target.value);
  };

  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const getTotalMinutes = () => {
    return categoryDistribution.reduce((sum, category) => sum + category.totalMinutes, 0);
  };

  const getPercentage = (minutes: number) => {
    const total = getTotalMinutes();
    return total > 0 ? Math.round((minutes / total) * 100) : 0;
  };

  const handleEditTask = (taskName: string) => {
    setSelectedTaskName(taskName);
    setSelectedCategoryId('');
    setUpdateProgress(0);
    setTemplateProgress(0);
    setIsUpdating(false);
    setUpdateComplete(false);
    
    const plan = executionPlans.find(p => p.id === selectedPlanId);
    let planCount = 0;
    if (plan) {
      Object.values(plan.days).forEach((day: DayPlan) => {
        Object.values(day.tasks).forEach((taskItem: TaskItem) => {
          if (taskItem.type === 'task' && (taskItem.item as Task).title === taskName) planCount++;
        });
      });
    }
    
    // Count template tasks
    let templateCount = 0;
    if (activePartnership) {
      const partnershipTemplates = templates.filter(t => t.partnershipId === activePartnership.id);
      for (const template of partnershipTemplates) {
        Object.values(template.days).forEach((day: DayPlan) => {
          Object.values(day.tasks).forEach((taskItem: TaskItem) => {
            if (taskItem.type === 'task' && (taskItem.item as Task).title === taskName) templateCount++;
          });
        });
      }
    }
    
    setTasksToUpdate(planCount);
    setTemplateTasksToUpdate(templateCount);
    setBulkEditDialog(true);
  };

  const handleCategoryChange = async (value: string) => {
    if (value === '__create_new__') {
      const name = prompt('Enter category name:');
      if (name && name.trim()) {
        try {
          const newCategory = await createNewCategory({
            name: name.trim(),
            color: '#' + Math.floor(Math.random()*16777215).toString(16)
          });
          setSelectedCategoryId(newCategory.id);
        } catch (error) {
          console.error('Error creating category:', error);
        }
      }
    } else {
      setSelectedCategoryId(value);
    }
  };

  const handleBulkUpdate = async () => {
    if (!selectedCategoryId || !activePartnership) return;
    
    setIsUpdating(true);
    setUpdateProgress(0);
    setTemplateProgress(0);
    
    try {
      let planUpdated = 0;
      let templateUpdated = 0;
      
      // Update tasks in current execution plan
      const plan = executionPlans.find(p => p.id === selectedPlanId);
      if (plan) {
        const tasksToUpdate: { dayIndex: number; taskId: string }[] = [];
        Object.entries(plan.days).forEach(([dayIndex, day]: [string, DayPlan]) => {
          Object.entries(day.tasks).forEach(([taskId, taskItem]: [string, TaskItem]) => {
            if (taskItem.type === 'task' && (taskItem.item as Task).title === selectedTaskName) {
              tasksToUpdate.push({ dayIndex: parseInt(dayIndex), taskId });
            }
          });
        });
        
        for (const { dayIndex, taskId } of tasksToUpdate) {
          await updateTask(plan.id, dayIndex, taskId, { item: { categoryId: selectedCategoryId } as Partial<Task>} as Partial<TaskItem>, false);
          planUpdated++;
          setUpdateProgress((planUpdated / tasksToUpdate.length) * 100);
        }
      }
      
      // Update tasks in all templates for this partnership
      const partnershipTemplates = templates.filter(t => t.partnershipId === activePartnership.id);
      const allTemplateTasks: { templateId: string; dayIndex: number; taskId: string }[] = [];
      
      for (const template of partnershipTemplates) {
        Object.entries(template.days).forEach(([dayIndex, day]: [string, DayPlan]) => {
          Object.entries(day.tasks).forEach(([taskId, taskItem]: [string, TaskItem]) => {
            if (taskItem.type === 'task' && (taskItem.item as Task).title === selectedTaskName) {
              allTemplateTasks.push({ templateId: template.id, dayIndex: parseInt(dayIndex), taskId });
            }
          });
        });
      }
      
      // Update template tasks using the task service directly
      for (const { templateId, dayIndex, taskId } of allTemplateTasks) {
        await updateTask(templateId, dayIndex, taskId, { item: { categoryId: selectedCategoryId } as Partial<Task>} as Partial<TaskItem>, true);
        templateUpdated++;
        setTemplateProgress((templateUpdated / allTemplateTasks.length) * 100);
      }
      
      setUpdateComplete(true);
      // Refresh execution plans and templates data, then recalculate
      await loadExecutionPlans();
      calculateTaskDistribution();
      
    } catch (error) {
      console.error('Error updating tasks:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Box sx={{ p: 0 }}>
      <Typography variant="h4" gutterBottom sx={{ px: 2 }}>
        Task Analytics
      </Typography>

      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap', px: 2 }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Select Week</InputLabel>
          <Select
            value={selectedPlanId}
            onChange={handlePlanChange}
            label="Select Week"
          >
            {sortedPlans.map((plan) => (
              <MenuItem key={plan.id} value={plan.id}>
                <Box>
                  <Typography variant="body2">
                    Week of {format(parseISO(plan.weekStartDate), 'MMM d, yyyy')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {plan.name}
                  </Typography>
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 200 }}>
          <Typography variant="subtitle2" gutterBottom>
            Filter by People
          </Typography>
          <FormGroup row>
            {availablePeople.map((person) => (
              <FormControlLabel
                key={person.userId || 'unassigned'}
                control={
                  <Checkbox
                    checked={selectedPeople.includes(person.userId)}
                    onChange={() => handlePersonChange(person.userId)}
                  />
                }
                label={person.nickname}
              />
            ))}
          </FormGroup>
        </FormControl>
      </Box>

      {selectedPlanId && (
        <Card sx={{ mx: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Time Distribution by Category
            </Typography>
            {categoryDistribution.length > 0 ? (
              <Box>
                {categoryDistribution.map((category, index) => (
                  <Accordion key={category.categoryId || 'no-category'} defaultExpanded={index === 0}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                        <Box
                          sx={{
                            width: 16,
                            height: 16,
                            borderRadius: '50%',
                            backgroundColor: category.categoryColor,
                          }}
                        />
                        <Typography sx={{ flexGrow: 1 }}>
                          {category.categoryName}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {formatMinutes(category.totalMinutes)} ({getPercentage(category.totalMinutes)}%)
                        </Typography>
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Task Name</TableCell>
                              <TableCell align="right">Time</TableCell>
                              <TableCell align="right">Actions</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {category.tasks.map((task, taskIndex) => (
                              <TableRow key={taskIndex}>
                                <TableCell>{task.taskName}</TableCell>
                                <TableCell align="right">{formatMinutes(task.minutes)}</TableCell>
                                <TableCell align="right">
                                  <IconButton 
                                    size="small" 
                                    onClick={() => handleEditTask(task.taskName)}
                                    title="Edit category for all tasks with this name"
                                  >
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Box>
            ) : (
              <Typography color="text.secondary">
                No tasks found for the selected criteria.
              </Typography>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog 
        open={bulkEditDialog} 
        onClose={() => !isUpdating && setBulkEditDialog(false)} 
        maxWidth="sm" 
        fullWidth
        disableEscapeKeyDown={isUpdating}
      >
        <DialogTitle>
          Bulk Edit Task Category
        </DialogTitle>
        <DialogContent>
          {!isUpdating && !updateComplete && (
            <>
              <Typography variant="body1" gutterBottom>
                Change category for all tasks named "{selectedTaskName}"
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                This will update {tasksToUpdate} tasks in the current week and {templateTasksToUpdate} tasks in templates.
              </Typography>
              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel>New Category</InputLabel>
                <Select
                  value={selectedCategoryId}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  label="New Category"
                >
                  <MenuItem value="">No Category</MenuItem>
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
                  <MenuItem 
                    value="__create_new__"
                    sx={{ fontStyle: 'italic', color: 'primary.main' }}
                  >
                    + Add New Category
                  </MenuItem>
                </Select>
              </FormControl>
            </>
          )}
          
          {isUpdating && (
            <>
              <Typography variant="body1" gutterBottom>
                Updating tasks...
              </Typography>
              
              <Typography variant="body2" sx={{ mt: 2, mb: 1 }}>
                Current Week Tasks ({Math.round(updateProgress)}%)
              </Typography>
              <LinearProgress variant="determinate" value={updateProgress} />
              
              <Typography variant="body2" sx={{ mt: 2, mb: 1 }}>
                Template Tasks ({Math.round(templateProgress)}%)
              </Typography>
              <LinearProgress variant="determinate" value={templateProgress} />
            </>
          )}
          
          {updateComplete && (
            <Alert severity="success">
              Successfully updated {tasksToUpdate} execution plan tasks and {templateTasksToUpdate} template tasks!
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkEditDialog(false)} disabled={isUpdating}>
            {updateComplete ? 'Ok' : 'Cancel'}
          </Button>
          {!updateComplete && (
            <Button 
              onClick={handleBulkUpdate} 
              variant="contained" 
              disabled={!selectedCategoryId || isUpdating}
            >
              Update Tasks
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Analytics;
