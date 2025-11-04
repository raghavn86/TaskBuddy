import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Paper,
  Fab,
  Alert,
} from '@mui/material';
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Today as TodayIcon,
  Add as AddIcon,
  Category as CategoryIcon,
  CalendarToday as CalendarIcon,
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
import FeelingTracker from '../components/wellness/FeelingTracker';
import FeelingGraph from '../components/wellness/FeelingGraph';
import {
  formatDateDisplay,
  isToday,
  getWeekday,
} from '../utils/wellnessHelpers';
import { DisplayWellnessTask } from '../types/wellness';

const Wellness: React.FC = () => {
  const {
    currentDate,
    tasks,
    categories,
    feelingEntries,
    latestFeeling,
    isLoading,
    error,
    setCurrentDate,
    goToToday,
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
  const [datePickerOpen, setDatePickerOpen] = useState(false);

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
        // Create a "deleted" instance by marking completed as false and hiding it
        // Or we can add a deleted flag to the instance
        // For now, we'll just not create an instance if it doesn't exist
        // If it exists, we delete it
        if (task.isInstance) {
          // We would need a deleteInstance method in the context
          // For now, let's just mark it as completed and invisible
          // This is a limitation - we'll handle it properly
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
        // Edit series
        await editTaskSeries(editingTask.seriesId, {
          title: data.title,
          recurrence: data.recurrence,
          categoryId: data.categoryId,
        });
      } else {
        // Edit instance
        await editTaskInstance(editingTask, {
          title: data.title,
          categoryId: data.categoryId,
        });
      }
    } else {
      // Add new task
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

  const handleBackToTaskDialog = () => {
    setCategoryDialogOpen(false);
    setTaskDialogOpen(true);
  };

  // Drag and drop
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = tasks.findIndex(t => t.id === active.id);
    const newIndex = tasks.findIndex(t => t.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const reordered = arrayMove(tasks, oldIndex, newIndex);
      reorderTasks(reordered);
    }
  };

  // Date picker (simple version)
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

      {/* Date Navigation */}
      <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <IconButton onClick={goToPreviousDay} size="small">
            <ChevronLeftIcon />
          </IconButton>

          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
            <Typography variant="h6">
              {formatDateDisplay(currentDate)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {isToday(currentDate) ? 'Today' : getWeekday(currentDate)}
            </Typography>
          </Box>

          <IconButton onClick={goToNextDay} size="small">
            <ChevronRightIcon />
          </IconButton>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
          <Button
            variant="outlined"
            startIcon={<TodayIcon />}
            onClick={goToToday}
            fullWidth
            size="small"
          >
            Today
          </Button>
          <Button
            variant="outlined"
            startIcon={<CalendarIcon />}
            onClick={() => setDatePickerOpen(!datePickerOpen)}
            fullWidth
            size="small"
          >
            Pick Date
          </Button>
        </Box>

        {datePickerOpen && (
          <Box sx={{ mt: 2 }}>
            <input
              type="date"
              value={currentDate}
              onChange={handleDateChange}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #ccc',
              }}
            />
          </Box>
        )}
      </Paper>

      {/* Feeling Tracker */}
      <FeelingTracker
        latestFeeling={latestFeeling}
        onAddEntry={addFeelingEntry}
      />

      {/* Tasks Section */}
      <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Tasks for {isToday(currentDate) ? 'Today' : 'This Day'}</Typography>
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
                  onToggleComplete={() => toggleTaskCompletion(task)}
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

      {/* Graph */}
      <FeelingGraph
        entries={feelingEntries}
        onLoadMore={loadFeelingEntries}
      />

      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="add task"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
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
