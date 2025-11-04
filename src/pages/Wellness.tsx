import React, { useState, useRef } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Paper,
  Fab,
  Alert,
  useMediaQuery,
  useTheme,
  Button,
} from '@mui/material';
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Add as AddIcon,
  Category as CategoryIcon,
} from '@mui/icons-material';
import {
  DndContext,
  DragEndEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { useWellness } from '../context/WellnessContext';
import SortableWellnessTaskCard from '../components/wellness/SortableWellnessTaskCard';
import WellnessTaskDialog from '../components/wellness/WellnessTaskDialog';
import CategoryManagementDialog from '../components/wellness/CategoryManagementDialog';
import FeelingTrackerCompact from '../components/wellness/FeelingTrackerCompact';
import FeelingGraph from '../components/wellness/FeelingGraph';
import {
  formatDateShort,
  isToday,
  getWeekday,
} from '../utils/wellnessHelpers';
import { DisplayWellnessTask } from '../types/wellness';

const Wellness: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const {
    currentDate,
    tasks,
    categories,
    feelingEntries,
    latestFeeling,
    isLoading,
    error,
    setCurrentDate,
    goToPreviousDay,
    goToNextDay,
    addTask,
    editTaskSeries,
    deleteTaskSeries,
    toggleTaskCompletion,
    editTaskInstance,
    reorderTasks,
    addCategory,
    editCategory,
    removeCategory,
    addFeelingEntry,
    loadFeelingEntries,
  } = useWellness();

  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<DisplayWellnessTask | null>(null);
  const [editSeries, setEditSeries] = useState(false);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const [loadingTaskIds, setLoadingTaskIds] = useState<Set<string>>(new Set());
  const [isDragging, setIsDragging] = useState(false);

  // Drag and drop sensors
  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 10,
    },
  });
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 250,
      tolerance: 5,
    },
  });
  const sensors = useSensors(mouseSensor, touchSensor);

  // Task actions
  const handleAddTask = () => {
    setEditingTask(null);
    setEditSeries(false);
    setTaskDialogOpen(true);
  };

  const handleEditTask = (task: DisplayWellnessTask, editSeriesMode: boolean) => {
    setEditingTask(task);
    setEditSeries(editSeriesMode);
    setTaskDialogOpen(true);
  };

  const handleDeleteTask = async (task: DisplayWellnessTask, deleteSeries: boolean) => {
    if (deleteSeries) {
      if (window.confirm('Delete this entire task series?')) {
        await deleteTaskSeries(task.seriesId);
      }
    } else {
      if (window.confirm('Delete this task instance?')) {
        if (task.isInstance) {
          alert('To delete an instance, edit the task and mark it as complete or use the series delete.');
        }
      }
    }
  };

  const handleSaveTask = async (data: {
    title: string;
    recurrence: any;
    categoryId?: string;
  }) => {
    if (editingTask) {
      if (editSeries) {
        await editTaskSeries(editingTask.seriesId, {
          title: data.title,
          recurrence: data.recurrence,
          categoryId: data.categoryId,
        });
      } else {
        await editTaskInstance(editingTask, {
          title: data.title,
          categoryId: data.categoryId,
        });
      }
    } else {
      await addTask(data.title, data.recurrence, data.categoryId);
    }

    setTaskDialogOpen(false);
    setEditingTask(null);
  };

  // Category actions
  const handleManageCategories = () => {
    setCategoryDialogOpen(true);
    setTaskDialogOpen(false);
  };

  // Helper function to add a task to loading state
  const addLoadingTask = (taskId: string) => {
    setLoadingTaskIds(prev => new Set(prev).add(taskId));
  };

  // Helper function to remove a task from loading state
  const removeLoadingTask = (taskId: string) => {
    setLoadingTaskIds(prev => {
      const next = new Set(prev);
      next.delete(taskId);
      return next;
    });
  };

  // Handle task completion toggle with localized loading
  const handleToggleComplete = async (task: DisplayWellnessTask) => {
    addLoadingTask(task.id);
    try {
      await toggleTaskCompletion(task);
    } finally {
      removeLoadingTask(task.id);
    }
  };

  // Drag and drop
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    setIsDragging(false);

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = tasks.findIndex(t => t.id === active.id);
    const newIndex = tasks.findIndex(t => t.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const reordered = arrayMove(tasks, oldIndex, newIndex);
      const draggedTaskId = active.id as string;

      // Show loading state on the dragged task
      addLoadingTask(draggedTaskId);
      try {
        await reorderTasks(reordered);
      } finally {
        removeLoadingTask(draggedTaskId);
      }
    }
  };

  const handleDragStart = () => {
    setIsDragging(true);
  };

  // Date picker - clicking on date opens the native date picker
  const handleDateClick = () => {
    dateInputRef.current?.showPicker?.();
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentDate(e.target.value);
  };

  return (
    <Box sx={{ pb: 3 }}>
      <Typography variant="h4" gutterBottom>
        Wellness & Habits
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => {}}>
          {error}
        </Alert>
      )}

      {/* Date Navigation - Compact */}
      <Paper elevation={1} sx={{ p: 1.5, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <IconButton onClick={goToPreviousDay} size="small">
            <ChevronLeftIcon />
          </IconButton>

          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              flex: 1,
              cursor: 'pointer',
              '&:hover': {
                opacity: 0.7,
              }
            }}
            onClick={handleDateClick}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
              {formatDateShort(currentDate)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {isToday(currentDate) ? 'Today' : getWeekday(currentDate)}
            </Typography>
          </Box>

          <IconButton onClick={goToNextDay} size="small">
            <ChevronRightIcon />
          </IconButton>

          {/* Hidden date input for picker */}
          <input
            ref={dateInputRef}
            type="date"
            value={currentDate}
            onChange={handleDateChange}
            style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
          />
        </Box>
      </Paper>

      {/* Tasks Section - Moved up */}
      <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Tasks</Typography>
          <Button
            variant="outlined"
            startIcon={<CategoryIcon />}
            onClick={handleManageCategories}
            size="small"
          >
            Categories
          </Button>
        </Box>

        {isLoading ? (
          <Typography variant="body2" color="text.secondary">
            Loading tasks...
          </Typography>
        ) : tasks.length > 0 ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
            onDragStart={handleDragStart}
          >
            <SortableContext
              items={tasks.map(t => t.id)}
              strategy={verticalListSortingStrategy}
            >
              {tasks.map((task) => (
                <SortableWellnessTaskCard
                  key={task.id}
                  task={task}
                  categories={categories}
                  onEdit={(editSeriesMode) => handleEditTask(task, editSeriesMode)}
                  onDelete={(deleteSeries) => handleDeleteTask(task, deleteSeries)}
                  onToggleComplete={() => handleToggleComplete(task)}
                  isLoading={loadingTaskIds.has(task.id)}
                  isAnyTaskLoading={loadingTaskIds.size > 0 || isDragging}
                />
              ))}
            </SortableContext>
          </DndContext>
        ) : (
          <Typography variant="body2" color="text.secondary" textAlign="center" py={3}>
            No tasks for this day. Add a task to get started!
          </Typography>
        )}
      </Paper>

      {/* Feeling Tracker - Moved down, compact version */}
      <FeelingTrackerCompact
        latestFeeling={latestFeeling}
        onAddEntry={addFeelingEntry}
      />

      {/* Graph */}
      <FeelingGraph
        entries={feelingEntries}
        onLoadMore={loadFeelingEntries}
      />

      {/* Floating Action Button - Fixed positioning for mobile */}
      <Fab
        color="primary"
        aria-label="add task"
        sx={{
          position: 'fixed',
          bottom: isMobile ? 72 : 16, // 72px to account for bottom nav on mobile (56px + 16px margin)
          right: 16,
          zIndex: 1000,
        }}
        onClick={handleAddTask}
      >
        <AddIcon />
      </Fab>

      {/* Dialogs */}
      <WellnessTaskDialog
        open={taskDialogOpen}
        task={editingTask || undefined}
        editSeries={editSeries}
        categories={categories}
        onClose={() => {
          setTaskDialogOpen(false);
          setEditingTask(null);
        }}
        onSave={handleSaveTask}
        onManageCategories={handleManageCategories}
      />

      <CategoryManagementDialog
        open={categoryDialogOpen}
        categories={categories}
        onClose={() => setCategoryDialogOpen(false)}
        onAdd={addCategory}
        onEdit={editCategory}
        onDelete={removeCategory}
      />
    </Box>
  );
};

export default Wellness;
