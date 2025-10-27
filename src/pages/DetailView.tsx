import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  DndContext,
  closestCenter,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Grid,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  useTheme,
  useMediaQuery,
  Badge,
  Fab
} from '@mui/material';
import { 
  Edit as EditIcon,
  CalendarToday as CalendarTodayIcon,
  Add as AddIcon,
  FormatListBulleted as ListIcon
} from '@mui/icons-material';
import SpeedDial from '@mui/material/SpeedDial';
import SpeedDialIcon from '@mui/material/SpeedDialIcon';
import SpeedDialAction from '@mui/material/SpeedDialAction';
import { format, parseISO } from 'date-fns';
import { useTaskManager } from '../context/TaskContext';
import { useAuth } from '../context/AuthContext';
import Loading from '../components/common/Loading';
import DayTaskList from '../components/tasks/DayTaskList';
import TaskDialog from '../components/tasks/TaskDialog';
import BulkTaskDialog from '../components/tasks/BulkTaskDialog';
import TaskCard from '../components/tasks/TaskCard';
import SectionDialog from '../components/sections/SectionDialog';
import { Task, TaskItem, Section } from '../types';

const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

type DetailViewProps = {
  mode: 'template' | 'plan';
};

const DetailView: React.FC<DetailViewProps> = ({ mode }) => {
  // Background color for template pages
  const templateBgColor = mode === 'template' ? 'rgba(173, 216, 230, 0.1)' : 'transparent';
  // Extract the appropriate ID parameter
  const params = useParams<{ planId?: string; templateId?: string }>();
  const itemId = mode === 'plan' ? params.planId : params.templateId;
  
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // Move the sensor setup outside of conditional rendering to follow React hooks rules
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 10 }
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 125, tolerance: 5 }
    })
  );
  
  const {
    executionPlans,
    templates,
    categories,
    loadExecutionPlans,
    loadTemplates,
    selectExecutionPlan,
    selectTemplate,
    activeExecutionPlan,
    activeTemplate,
    updateCurrentExecutionPlan,
    updateCurrentTemplate,
    addTask,
    updateTaskDetails,
    removeTask,
    moveTaskBetweenDays,
    isLoading,
    taskService,
    createNewCategory,
  } = useTaskManager();
  
  const { currentUser } = useAuth();
  
  // Get the active item based on mode
  const activeItem = mode === 'plan' ? activeExecutionPlan : activeTemplate;
  
  const [currentDayTab, setCurrentDayTab] = useState(0);
  const [editNameDialogOpen, setEditNameDialogOpen] = useState(false);
  const [itemName, setItemName] = useState('');
  const [nameError, setNameError] = useState('');
  const [weekView, setWeekView] = useState(!isMobile); // Week view by default on desktop, day view by default on mobile
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [bulkTaskDialogOpen, setBulkTaskDialogOpen] = useState(false);
  const [sectionDialogOpen, setSectionDialogOpen] = useState(false);
  const [currentTask, setCurrentTask] = useState<TaskItem | undefined>(undefined);
  const [editingSection, setEditingSection] = useState<Section | undefined>(undefined);
  const [addingSectionIndex, setAddingSectionIndex] = useState<number | undefined>(undefined);
  const [addingSectionDay, setAddingSectionDay] = useState<number | undefined>(undefined);
  
  // Add state for tracking active drag item
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [activeDragTask, setActiveDragTask] = useState<TaskItem | null>(null);
  
  // Load appropriate data based on mode
  useEffect(() => {
    if (mode === 'plan') {
      loadExecutionPlans();
    } else {
      loadTemplates();
    }
  }, [mode, loadExecutionPlans, loadTemplates]);
  
  // Select the appropriate item when data is loaded
  useEffect(() => {
    if (itemId) {
      if (mode === 'plan' && executionPlans.length > 0) {
        selectExecutionPlan(itemId);
      } else if (mode === 'template' && templates.length > 0) {
        selectTemplate(itemId);
      }
    }
  }, [mode, itemId, executionPlans, templates, selectExecutionPlan, selectTemplate]);
  
  // Set initial values when active item changes
  useEffect(() => {
    if (activeItem) {
      setItemName(activeItem.name);
      
      // Set initial day tab based on mode
      if (!itemName) {
        if (mode === 'plan') {
          const jsToday = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
          if (activeItem.days[jsToday]) {
            setCurrentDayTab(jsToday);
          }
        } else {
          setCurrentDayTab(0); // Default to first day for templates
        }
      }
    }
  }, [activeItem, itemName, mode]);
  
  const handleDayTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setCurrentDayTab(newValue);
  };
  
  const handleEditName = () => {
    setEditNameDialogOpen(true);
  };
  
  const handleNameDialogClose = () => {
    setEditNameDialogOpen(false);
  };
  
  // Update name based on mode
  const handleNameUpdate = async () => {
    if (!itemName.trim()) {
      setNameError(`${mode === 'plan' ? 'Plan' : 'Template'} name is required`);
      return;
    }
    
    try {
      if (activeItem) {
        if (mode === 'plan') {
          await updateCurrentExecutionPlan({ name: itemName.trim() });
        } else {
          await updateCurrentTemplate({ name: itemName.trim() });
        }
        setEditNameDialogOpen(false);
      }
    } catch (err) {
      console.error(`Error updating ${mode} name:`, err);
    }
  };
  
  const handleAddTask = async (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!activeItem) return;
    
    try {
      // Create NewTaskItem format
      const newTaskItem = {
        type: 'task' as const,
        item: {
          ...taskData,
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      };
      await addTask(currentDayTab, newTaskItem);
    } catch (err) {
      console.error('Error adding task:', err);
    }
  };
  
  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    if (!activeItem) return;
    
    try {
      await updateTaskDetails(currentDayTab, taskId, { item: updates });
    } catch (err) {
      console.error('Error updating task:', err);
    }
  };

  const handleAddSection = async (dayIndex: number, sectionName: string, insertIndex: number) => {
    if (!activeItem) return;
    
    try {
      const newSectionItem = {
        type: 'section' as const,
        item: {
          title: sectionName,
        }
      };
      
      await addTask(dayIndex, newSectionItem, insertIndex);
    } catch (err) {
      console.error('Error adding section:', err);
    }
  };
  
  const handleDeleteTask = async (taskId: string) => {
    if (!activeItem) return;
    
    try {
      await removeTask(currentDayTab, taskId);
    } catch (err) {
      console.error('Error deleting task:', err);
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (!activeItem) return;
    
    try {
      // Find which day contains this section
      let sectionDayOfWeek = -1;
      for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
        const dayTasks = activeItem.days[dayIndex]?.tasks || {};
        if (dayTasks[sectionId]) {
          sectionDayOfWeek = dayIndex;
          break;
        }
      }
      
      if (sectionDayOfWeek !== -1) {
        await removeTask(sectionDayOfWeek, sectionId);
      }
      
      setSectionDialogOpen(false);
      setEditingSection(undefined);
    } catch (err) {
      console.error('Error deleting section:', err);
    }
  };

  const handleEditSection = (sectionId: string) => {
    if (!activeItem) return;
    
    // Find the section in the current day
    const dayTasks = activeItem.days[currentDayTab]?.tasks || {};
    const sectionTaskItem = Object.values(dayTasks).find(
      (taskItem: any) => taskItem.type === 'section' && taskItem.item.id === sectionId
    );
    
    if (sectionTaskItem) {
      setEditingSection(sectionTaskItem.item as Section);
      setSectionDialogOpen(true);
    }
  };

  const handleSaveSection = async (sectionData: Omit<Section, 'id' | 'createdAt' | 'updatedAt'>, selectedDays?: number[]) => {
    if (!activeItem) return;
    
    try {
      if (editingSection) {
        // Editing existing section
        let sectionDayOfWeek = -1;
        for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
          const dayTasks = activeItem.days[dayIndex]?.tasks || {};
          if (dayTasks[editingSection.id]) {
            sectionDayOfWeek = dayIndex;
            break;
          }
        }
        
        if (sectionDayOfWeek === -1) {
          throw new Error('Section not found in any day');
        }
        
        await updateTaskDetails(sectionDayOfWeek, editingSection.id, {
          item: {
            ...editingSection,
            ...sectionData,
            updatedAt: Date.now()
          }
        });
      } else if (addingSectionIndex !== undefined) {
        // Adding new section above a task
        const daysToAddTo = selectedDays && selectedDays.length > 0 ? selectedDays : [currentDayTab];
        
        for (const dayIndex of daysToAddTo) {
          const newSectionItem = {
            type: 'section' as const,
            item: {
              title: sectionData.title,
              color: sectionData.color,
            } as Omit<Section, 'id' | 'createdAt' | 'updatedAt'>
          };
          await addTask(dayIndex, newSectionItem, addingSectionIndex);
        }
      }
      
      setSectionDialogOpen(false);
      setEditingSection(undefined);
      setAddingSectionIndex(undefined);
      setAddingSectionDay(undefined);
    } catch (err) {
      console.error('Error saving section:', err);
    }
  };
  
  // This function handles moving tasks within the same day
  const handleMoveTask = useCallback(async (
    taskId: string,
    sourceIndex: number,
    destinationIndex: number,
    newAssignedTo?: string | null, // Match DayTaskList interface
  ) => {
    
    console.log(`handleMoveTask called: task=${taskId}, source=${sourceIndex}, dest=${destinationIndex}`);
    
    if (!activeItem) {
      console.error('No active item');
      return;
    }
    
    try {
      // Only proceed if the indices are different
      if (sourceIndex !== destinationIndex) {
        const actualDayId = Object.entries(activeItem.days)
          .map(([key, value]) => ({ dayId: parseInt(key), tasks: value.tasks }))
          .find(({ tasks }) => tasks && tasks[taskId])
          ?.dayId ?? -1;
      
        if (actualDayId < 0) {
          console.error(`Task ${taskId} not found in day ${actualDayId}`);
          return;
        }

        console.log(`Moving task from ${sourceIndex} to ${destinationIndex} in day ${actualDayId}`);

        // Use moveTask with same source and target day to handle reordering
        await moveTaskBetweenDays(
          actualDayId, // Source day
          actualDayId, // Target day (same as source for reordering)
          taskId,
          sourceIndex,
          destinationIndex,
          undefined
        );
      }
    } catch (err) {
      console.error('Error moving task:', err);
    }
  }, [activeItem, currentDayTab, moveTaskBetweenDays]);
  
  // This function handles moving tasks between different days
  const handleMoveTaskBetweenDays = useCallback(async (
    sourceDayOfWeek: number,
    targetDayOfWeek: number,
    oldIndex: number,
    newIndex: number,
    taskId: string,
    newAssignedTo?: string | null
  ) => {
    console.log(`handleMoveTaskBetweenDays: task=${taskId}, sourceDay=${sourceDayOfWeek}, targetDay=${targetDayOfWeek}`);
    
    if (!activeItem) {
      console.error('No active item');
      return;
    }
    
    try {
      // Verify the task exists in the source day
      const sourceDay = activeItem.days[sourceDayOfWeek];
      if (!sourceDay || !sourceDay.tasks || !sourceDay.tasks[taskId]) {
        console.error(`Task ${taskId} not found in source day ${sourceDayOfWeek}`);
        return;
      }
      
      // Move the task between days using the TaskContext function
      await moveTaskBetweenDays(sourceDayOfWeek, targetDayOfWeek, taskId, oldIndex, newIndex, newAssignedTo);
      
    } catch (err) {
      console.error('Error moving task between days:', err);
    }
  }, [activeItem, moveTaskBetweenDays]);
  
  
  // Generate day tasks for rendering early to use in callbacks
  const dayTasks = activeItem ? weekDays.map((_day, index) => {
    const dayData = activeItem.days[index] || { tasks: {} };
    return Object.values(dayData.tasks || {}).sort((a, b) => (a.item.order ?? 0) - (b.item.order ?? 0));
  }) : [];

  // Memoized drag handlers to prevent useLayoutEffect warnings
  const handleDragStart = useCallback((event: any) => {
    console.log('PARENT: Drag started:', event.active.id);
    console.log('PARENT: Active container:', event.active.data.current?.sortable?.containerId);
    
    // Set the active drag item ID
    setActiveDragId(event.active.id);
    
    // Find the task from all days
    const allDayTasks = dayTasks.flat();
    const dragId = String(event.active.id);
    const actualId = dragId.startsWith('section-') ? dragId.replace('section-', '') : dragId;
    const taskItem = allDayTasks.find((taskItem: TaskItem) => taskItem.item.id === actualId);
    if (taskItem) {
      setActiveDragTask(taskItem);
    }
  }, [dayTasks]);
  
  const handleDayViewDragEnd = useCallback((event: any) => {
    console.log('PARENT: Day view drag end called!', event);
    const { active, over } = event;
    
    // Reset the drag state
    setActiveDragId(null);
    setActiveDragTask(null);
    
    if (!over || active.id === over.id) {
      return;
    }
    
    // Extract the task ID from the active drag item
    const dragId = String(active.id);
    const taskId = dragId.startsWith('section-') ? dragId.replace('section-', '') : dragId;
    const tasks = dayTasks[currentDayTab] || [];
    
    const oldIndex = tasks.findIndex(taskItem => taskItem.item.id === taskId);
    const newIndex = tasks.findIndex(taskItem => taskItem.item.id === String(over.id).replace('section-', ''));
    
    if (oldIndex !== -1 && newIndex !== -1) {
      console.log(`Day view: Reordering task ${taskId} from ${oldIndex} to ${newIndex}`);
      // Use the actual current day tab index
      handleMoveTask(taskId, oldIndex, newIndex, currentDayTab.toString());
    }
  }, [dayTasks, currentDayTab, handleMoveTask]);
  
  const handleWeekViewDragEnd = useCallback((event: any) => {
    // Allow cross-day drag in both plan and template modes
    console.log('PARENT: Week view drag end called!');
    const { active, over } = event;
    
    // Reset the drag state
    setActiveDragId(null);
    setActiveDragTask(null);
    
    if (!over) {
      console.log('No over target detected, cancelling drop');
      return;
    }
    
    // Log only the important parts of the event data to avoid circular references
    const safeLogData = {
      activeId: active.id,
      overId: over.id,
      activeContainerId: active.data.current?.sortable?.containerId,
      overContainerId: over.data.current?.sortable?.containerId
    };
    console.log('Drag event data:', safeLogData);
    
    if (active.id === over.id) {
      console.log('Dropped onto self, ignoring');
      return;
    }
    
    // Extract the task ID from the active drag item
    const dragId = String(active.id);
    const taskId = dragId.startsWith('section-') ? dragId.replace('section-', '') : dragId;
    
    // Extract the container IDs, handling both item drops and container drops
    let activeContainer = active.data.current?.sortable?.containerId;
    
    // Handle drops on containers vs drops on items
    let overContainer;
    let isContainerDrop = false;
    
    // Check if we're dropping onto a container directly (over.id is the container ID)
    if (over.id && String(over.id).startsWith('day-')) {
      overContainer = String(over.id);
      isContainerDrop = true;
      console.log('Dropping directly onto a day container:', overContainer);
    } 
    // Or if we're dropping onto an item within a container
    else {
      overContainer = over.data.current?.sortable?.containerId;
      console.log('Dropping onto an item within container:', overContainer);
    }
    
    console.log('Week drag end:', {
      taskId,
      activeContainer,
      overContainer,
      isContainerDrop
    });
    
    // If we have valid source and target container IDs, and they're different
    if (activeContainer && overContainer && activeContainer !== overContainer) {
      // Prevent sections from being moved between days
      if (dragId.startsWith('section-')) {
        console.log('Sections cannot be moved between days, ignoring cross-day drag');
        return;
      }
      
      // Moving between days - container IDs are formatted as "day-{dayIndex}"
      const sourceDayOfWeek = parseInt(activeContainer.split('-')[1]);
      const targetDayOfWeek = parseInt(overContainer.split('-')[1]);
      const oldTasks = dayTasks[sourceDayOfWeek] || [];
      const newTasks = dayTasks[targetDayOfWeek] || [];
      
      // Find the task's index in the source day
      const oldIndex = oldTasks.findIndex(taskItem => taskItem.item.id === taskId);
      
      if (oldIndex === -1) {
        console.error(`Task ${taskId} not found in source day ${sourceDayOfWeek}`);
        return;
      }
      
      // Handle container drop vs item drop
      if (isContainerDrop) {
        // Container drop - add at the beginning (index 0)
        console.log(`Moving task ${taskId} from day ${sourceDayOfWeek} to empty day ${targetDayOfWeek} (container drop)`);
        handleMoveTaskBetweenDays(sourceDayOfWeek, targetDayOfWeek, oldIndex, 0, taskId);
      } 
      else {
        // Item drop - find the target index
        const newIndex = newTasks.findIndex(taskItem => taskItem.item.id === String(over.id));
        
        if (newIndex !== -1) {
          console.log(`Moving task ${taskId} from day ${sourceDayOfWeek} to day ${targetDayOfWeek} at index ${newIndex}`);
          handleMoveTaskBetweenDays(sourceDayOfWeek, targetDayOfWeek, oldIndex, newIndex, taskId);
        } else {
          // Fallback - add to the beginning if target index can't be determined
          console.log(`Moving task ${taskId} from day ${sourceDayOfWeek} to day ${targetDayOfWeek} (fallback to index 0)`);
          handleMoveTaskBetweenDays(sourceDayOfWeek, targetDayOfWeek, oldIndex, 0, taskId);
        }
      }
    } else {
      // Moving within the same day
      const dayOfWeek = activeContainer ? parseInt(activeContainer.split('-')[1]) : currentDayTab;
      const tasks = dayTasks[dayOfWeek] || [];
      
      const oldIndex = tasks.findIndex(taskItem => taskItem.item.id === taskId);
      const newIndex = tasks.findIndex(taskItem => taskItem.item.id === String(over.id));
      
      if (oldIndex !== -1 && newIndex !== -1) {
        console.log(`Reordering task ${taskId} within day ${dayOfWeek} from ${oldIndex} to ${newIndex}`);
        handleMoveTask(taskId, oldIndex, newIndex, dayOfWeek.toString()); // Pass dayOfWeek explicitly
      }
    }
  }, [dayTasks, currentDayTab, handleMoveTask, handleMoveTaskBetweenDays, mode]);
  
  const handleViewToggle = () => {
    setWeekView(!weekView);
  };
  
  if (isLoading && !activeItem) {
    return <Loading message={`Loading ${mode === 'plan' ? 'execution plan' : 'template'}...`} />;
  }
  
  if (!activeItem && itemId) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h6" color="error" gutterBottom>
          {mode === 'plan' ? 'Execution plan' : 'Template'} not found
        </Typography>
        <Button variant="outlined" onClick={() => navigate(mode === 'plan' ? '/plans' : '/templates')}>
          Back to {mode === 'plan' ? 'Plans' : 'Templates'}
        </Button>
      </Box>
    );
  }
  
  // Note: dayTasks is now defined earlier at the top level for use in callbacks
  
  // Get metrics for the view
  const defaultMetrics = {
    user: { totalMinutes: 0, remainingMinutes: 0, hoursTotal: 0, hoursRemaining: 0 },
    partner: { totalMinutes: 0, remainingMinutes: 0, hoursTotal: 0, hoursRemaining: 0 },
    unassigned: { totalMinutes: 0, remainingMinutes: 0, hoursTotal: 0, hoursRemaining: 0 }
  };
  
  // Calculate metrics based on mode
  const metrics = mode === 'plan'
    ? (activeExecutionPlan ? taskService.calculatePlanMetrics(activeExecutionPlan) : defaultMetrics)
    : (activeTemplate ? taskService.calculatePlanMetrics(activeTemplate) : defaultMetrics); // Use plan metrics for template too to show total metrics
  
  return (
    <Box sx={{ backgroundColor: templateBgColor, pt: 2, pb: 4, minHeight: '100vh' }}>
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ width: '100%' }}>
            {mode === 'plan' && activeExecutionPlan ? (
              // Execution Plan Header
              <React.Fragment>
                <Typography variant="h5" component="h1">
                  Week of {format(parseISO(activeExecutionPlan.weekStartDate), 'MMM d, yyyy')}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Plan: {activeExecutionPlan.name || 'Unnamed'}
                  </Typography>
                  <IconButton 
                    size="small" 
                    onClick={handleEditName} 
                    color="primary"
                    sx={{ ml: 0.5, p: 0.5 }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Box>
              </React.Fragment>
            ) : activeTemplate ? (
              // Template Header
              <React.Fragment>
                <Typography variant="h5" component="h1">
                  Template: {activeTemplate.name || 'Unnamed'}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Created: {format(new Date(activeTemplate.createdAt), 'MMM d, yyyy')}
                  </Typography>
                  <IconButton 
                    size="small" 
                    onClick={handleEditName} 
                    color="primary"
                    sx={{ ml: 0.5, p: 0.5 }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Box>
              </React.Fragment>
            ) : null}
          </Box>
          
          <Box>
            <IconButton 
              size="small" 
              onClick={handleViewToggle}
              color={weekView ? 'primary' : 'default'}
            >
              <CalendarTodayIcon />
            </IconButton>
          </Box>
        </Box>
        
        {/* Task Category Indicators */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mb: 1 }}>
          {/* My Tasks Summary */}
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            bgcolor: 'primary.50', 
            px: 1.5,
            py: 0.5,
            borderRadius: 1,
            borderLeft: '4px solid #1976d2'
          }}>
            <Typography variant="caption" sx={{ fontWeight: 'medium' }}>
              {metrics.user.hoursRemaining?.toFixed(1) || '0.0'} / {metrics.user.hoursTotal.toFixed(1)} hrs (Me)
            </Typography>
          </Box>
          
          {/* Partner Tasks Summary */}
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center',
            bgcolor: 'secondary.50',
            px: 1.5,
            py: 0.5, 
            borderRadius: 1,
            borderLeft: `4px solid ${taskService.getPartnerColor(taskService.partnerId)}`
          }}>
            <Typography variant="caption" sx={{ fontWeight: 'medium' }}>
              {metrics.partner.hoursRemaining?.toFixed(1) || '0.0'} / {metrics.partner.hoursTotal.toFixed(1)} hrs ({taskService.getPartnerNickname(taskService.partnerId)})
            </Typography>
          </Box>
          
          {/* Unassigned Tasks Summary */}
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center',
            bgcolor: 'grey.100',
            px: 1.5,
            py: 0.5,
            borderRadius: 1,
            borderLeft: '4px solid #9e9e9e'
          }}>
            <Typography variant="caption" sx={{ fontWeight: 'medium' }}>
              {metrics.unassigned.hoursRemaining?.toFixed(1) || '0.0'} / {metrics.unassigned.hoursTotal.toFixed(1)} hrs
            </Typography>
          </Box>
        </Box>
      </Box>
      
      {weekView ? (
        // Week view - all days displayed in grid
        // Import necessary components for cross-day drag and drop
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleWeekViewDragEnd}
        >
          <Grid container spacing={2} sx={{ overflow: 'visible', height: 'auto' }}>
            {weekDays.map((day, index) => (
              <Grid item xs={12} md={6} lg={4} key={index}>
                <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'visible' }}>
                  <DayTaskList
                    dayOfWeek={index}
                    dayName={day}
                    taskItems={dayTasks[index]}
                    categories={categories}
                    onCreateCategory={createNewCategory}
                    isTemplate={mode === 'template'}
                    onAddTask={(task) => {
                      const newTaskItem = {
                        type: 'task' as const,
                        item: {
                          ...task,
                          createdAt: Date.now(),
                          updatedAt: Date.now()
                        }
                      };
                      return addTask(index, newTaskItem);
                    }}
                    onUpdateTask={(taskId, updates) => updateTaskDetails(index, taskId, { item: updates })}
                    onAddSection={(sectionName, insertIndex) => handleAddSection(index, sectionName, insertIndex)}
                    onDeleteTask={(taskId) => removeTask(index, taskId)}
                    onEditSection={(sectionId) => {
                      const dayTasks = activeItem?.days[index]?.tasks || {};
                      const sectionTaskItem = Object.values(dayTasks).find(
                        (taskItem: any) => taskItem.type === 'section' && taskItem.item.id === sectionId
                      );
                      if (sectionTaskItem) {
                        setEditingSection(sectionTaskItem.item as Section);
                        setSectionDialogOpen(true);
                      }
                    }}
                    onOpenSectionDialog={(insertIndex) => {
                      setAddingSectionIndex(insertIndex);
                      setAddingSectionDay(index);
                      setSectionDialogOpen(true);
                    }}
                    onMoveTask={(taskId, sourceIndex, destinationIndex) =>
                      handleMoveTask(taskId, sourceIndex, destinationIndex, index.toString())}
                    onMoveTaskBetweenDays={handleMoveTaskBetweenDays}
                    dragContextId={`day-${index}`}
                    showDayHeader={true}
                  />
                </Box>
              </Grid>
            ))}
          </Grid>
          
          {/* Add DragOverlay for smooth cross-container dragging */}
          <DragOverlay>
            {activeDragTask && (
              <div style={{ 
                boxShadow: '0px 5px 15px rgba(0,0,0,0.3)',
                pointerEvents: 'none',
                maxWidth: '300px',
                zIndex: 1000
              }}>
                <TaskCard
                  task={activeDragTask.item as Task}
                  isTemplate={mode === 'template'}
                  onEdit={() => {}}
                  onDelete={() => {}}
                  onToggleComplete={() => {}}
                  onAssign={() => {}}
                  isDragging={true}
                />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      ) : (
        // Day view - one day at a time with tabs
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDayViewDragEnd}
        >
          <Paper sx={{ mb: 2 }}>
            <Tabs 
              value={currentDayTab} 
              onChange={handleDayTabChange}
              variant="scrollable"
              scrollButtons="auto"
              sx={{ borderBottom: 1, borderColor: 'divider' }}
            >
              {weekDays.map((day, index) => {
                const taskCount = dayTasks[index]?.length || 0;
                const jsToday = new Date().getDay(); // JS format: 0 = Sunday, 1 = Monday, etc.
                const isToday = index === jsToday;
                
                return (
                  <Tab 
                    key={index} 
                    label={
                      <Badge badgeContent={taskCount} color="primary">
                        <Box 
                          sx={{ 
                            pr: taskCount ? 1 : 0,
                            fontWeight: isToday ? 'bold' : 'normal',
                            color: isToday ? 'primary.main' : 'inherit'
                          }}
                        >
                          {isMobile ? day.substring(0, 3) : day}
                          {isToday && mode === 'plan' && ' (Today)'}
                        </Box>
                      </Badge>
                    } 
                  />
                );
              })}
            </Tabs>
          </Paper>
          
          <Box sx={{  }}>
            {weekDays.map((day, index) => (
              <Box
                key={index}
                role="tabpanel"
                hidden={currentDayTab !== index}
                sx={{ height: '100%', display: currentDayTab === index ? 'block' : 'none' }}
              >
                {currentDayTab === index && (
                  <DayTaskList
                    dayOfWeek={index}
                    dayName={day}
                    taskItems={dayTasks[index]}
                    categories={categories}
                    onCreateCategory={createNewCategory}
                    isTemplate={mode === 'template'}
                    onAddTask={handleAddTask}
                    onAddSection={(sectionName, insertIndex) => handleAddSection(currentDayTab, sectionName, insertIndex)}
                    onUpdateTask={handleUpdateTask}
                    onDeleteTask={handleDeleteTask}
                    onEditSection={handleEditSection}
                    onOpenSectionDialog={(insertIndex) => {
                      setAddingSectionIndex(insertIndex);
                      setAddingSectionDay(currentDayTab);
                      setSectionDialogOpen(true);
                    }}
                    onMoveTask={handleMoveTask}
                    onMoveTaskBetweenDays={handleMoveTaskBetweenDays}
                    dragContextId={`day-view-${itemId}`}
                  />
                )}
              </Box>
            ))}
          </Box>
          
          {/* Add DragOverlay for smooth dragging animations */}
          <DragOverlay>
            {activeDragTask && (
              <div style={{ 
                boxShadow: '0px 5px 15px rgba(0,0,0,0.3)',
                pointerEvents: 'none',
                maxWidth: '300px',
                zIndex: 1000
              }}>
                <TaskCard
                  task={activeDragTask.item as Task}
                  isTemplate={mode === 'template'}
                  onEdit={() => {}}
                  onDelete={() => {}}
                  onToggleComplete={() => {}}
                  onAssign={() => {}}
                  isDragging={true}
                />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}
      
      {/* Speed dial for adding tasks */}
      <SpeedDial
        ariaLabel="Task actions"
        sx={{ position: 'fixed', bottom: 72, right: 16 }}
        icon={<SpeedDialIcon />}
      >
        <SpeedDialAction
          key="add-task"
          icon={<AddIcon />}
          tooltipTitle="Add Task"
          onClick={() => {
            setCurrentTask(undefined);
            setTaskDialogOpen(true);
          }}
        />
        <SpeedDialAction
          key="bulk-add"
          icon={<ListIcon />}
          tooltipTitle="Bulk Add"
          onClick={() => {
            setBulkTaskDialogOpen(true);
          }}
        />
      </SpeedDial>
      
      {/* Task Dialog */}
      <TaskDialog
        open={taskDialogOpen}
        onClose={() => setTaskDialogOpen(false)}
        task={currentTask?.item as Task}
        categories={categories}
        onCreateCategory={createNewCategory}
        onAddTask={(taskData, selectedDays) => {
          const daysToAddTo = selectedDays || [currentDayTab];
          daysToAddTo.forEach((dayIndex, i) => {
            const uniqueTaskWithTimestamps = {
              ...taskData,
              createdAt: Date.now() + i,
              updatedAt: Date.now() + i,
            };
            addTask(dayIndex, {
              type: 'task',
              item: uniqueTaskWithTimestamps
            });
          });
        }}
        onUpdateTask={handleUpdateTask}
        onMoveTaskBetweenDays={handleMoveTaskBetweenDays}
        isWeekView={weekView}
        currentDayIndex={currentDayTab}
        dialogTitle={currentTask ? 'Edit Task' : 'Add Task'}
        tasks={dayTasks[currentDayTab].map(taskItem => taskItem.item as Task)}
      />
      
      {/* Bulk Task Dialog */}
      <BulkTaskDialog 
        open={bulkTaskDialogOpen}
        onClose={() => setBulkTaskDialogOpen(false)}
        categories={categories}
        onCreateCategory={createNewCategory}
        isWeekView={weekView}
        currentDayIndex={currentDayTab}
        onAddTasks={async (tasks) => {
          if (!activeItem) return;
          
          let hasErrors = false;
          const processTasks = async () => {
            for (let i = 0; i < tasks.length; i++) {
              const task = tasks[i];
              
              // Update task status to adding
              tasks[i] = { ...task, status: 'adding' };
              
              try {
                // Add to each selected day
                const daysToAddTo = task.selectedDays.length ? task.selectedDays : [currentDayTab];
                
                await Promise.all(daysToAddTo.map(async (dayIndex, dayCounter) => {
                  const uniqueTaskWithTimestamps = {
                    title: task.title,
                    minutes: task.minutes,
                    categoryId: task.categoryId,
                    assignedTo: null,
                    completed: false,
                    createdAt: Date.now() + dayIndex + (i * 100),  // Ensure unique timestamps
                    updatedAt: Date.now() + dayIndex + (i * 100)
                  };
                  await addTask(dayIndex, {
                    type: 'task',
                    item: uniqueTaskWithTimestamps
                  });
                }));
                
                // Mark as success
                tasks[i] = { ...task, status: 'success' };
                
              } catch (error) {
                console.error('Error adding task:', error);
                tasks[i] = { 
                  ...task, 
                  status: 'error', 
                  error: error instanceof Error ? error.message : 'Unknown error' 
                };
                hasErrors = true;
              }
              
              // Force rerender to update the task status in the UI
              setBulkTaskDialogOpen(true);
              
              // Small delay for visual indication
              await new Promise(resolve => setTimeout(resolve, 300));
            }
          };
          
          await processTasks();
          return Promise.resolve();
        }}
        onRetryTask={async (taskIndex) => {
          if (!activeItem) return;
          
          try {
            // Get the task data from the dialog component
            const dialogElement = document.querySelector('div[role="dialog"]');
            const taskElements = dialogElement?.querySelectorAll('[data-bulk-task-index]');
            const taskElement = taskElements?.[taskIndex];
            
            if (!taskElement?.getAttribute('data-task')) throw new Error('Task data not found');
            
            const parsedTask = JSON.parse(taskElement.getAttribute('data-task') || '{}');
            
            // Add to each selected day
            const daysToAddTo = parsedTask.selectedDays?.length ? parsedTask.selectedDays : [currentDayTab];
            
            await Promise.all(daysToAddTo.map(async (dayIndex: number, dayCounter: number) => {
              const uniqueTaskWithTimestamps = {
                title: parsedTask.title,
                minutes: parsedTask.minutes,
                assignedTo: null,
                completed: false,
                createdAt: Date.now() + dayIndex + dayCounter,  // Ensure unique timestamps
                updatedAt: Date.now() + dayIndex + dayCounter,
              };
              await addTask(dayIndex, {
                type: 'task',
                item: uniqueTaskWithTimestamps
              });
            }));
            
            // Successfully added - the BulkTaskDialog component will handle updating the UI
            return Promise.resolve();
            
          } catch (error) {
            console.error('Error retrying task:', error);
            return Promise.reject(error);
          }
        }}
      />
      
      {/* Edit name dialog */}
      <Dialog open={editNameDialogOpen} onClose={handleNameDialogClose}>
        <DialogTitle>Edit {mode === 'plan' ? 'Plan' : 'Template'} Name</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label={`${mode === 'plan' ? 'Plan' : 'Template'} Name`}
            type="text"
            fullWidth
            variant="outlined"
            value={itemName}
            onChange={(e) => {
              setItemName(e.target.value);
              if (e.target.value.trim()) {
                setNameError('');
              }
            }}
            error={!!nameError}
            helperText={nameError}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleNameDialogClose}>Cancel</Button>
          <Button onClick={handleNameUpdate} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Section Dialog */}
      <SectionDialog
        open={sectionDialogOpen}
        onClose={() => {
          setSectionDialogOpen(false);
          setEditingSection(undefined);
          setAddingSectionIndex(undefined);
          setAddingSectionDay(undefined);
        }}
        onSave={handleSaveSection}
        onDelete={editingSection ? handleDeleteSection : undefined}
        section={editingSection}
        defaultDay={addingSectionDay}
      />
    </Box>
  );
};

export default DetailView;