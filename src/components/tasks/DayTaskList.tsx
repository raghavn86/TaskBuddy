import React, { useState, memo } from 'react';
import {
  Paper,
  Typography,
  Box,
  Divider,
} from '@mui/material';
import {
  DndContext,
  closestCenter,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { Task, TaskCategory, TaskItem, taskToTaskItem, taskItemsToTasks, Section } from '../../types';
import { useTaskManager } from '../../context/TaskContext';
import TaskCard from './TaskCard';
import SortableTaskCard from './SortableTaskCard';
import TaskDialog from './TaskDialog';
import DraggableSectionItem from '../sections/DraggableSectionItem';
import TaskNotesDialog from './TaskNotesDialog';

// Helper function to convert hex color to rgba
const getUserColorAsRgba = (taskService: any, opacity = 0.08) => {
  const hexColor = taskService.getUserColor(taskService.userId);
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  return `${r}, ${g}, ${b}, ${opacity}`;
};

// Helper function to calculate all section durations in one pass
const calculateSectionDurations = (taskItems: TaskItem[]): Map<string, string> => {
  const durations = new Map<string, string>();
  let currentSectionId: string | null = null;
  let currentMinutes = 0;
  
  const saveSectionDuration = () => {
    if (currentSectionId && currentMinutes > 0) {
      const hours = Math.floor(currentMinutes / 60);
      const minutes = currentMinutes % 60;
      const durationText = hours > 0 
        ? `${hours}h${minutes > 0 ? ` ${minutes}m` : ''}`
        : `${minutes}m`;
      durations.set(currentSectionId, durationText);
    }
  };
  
  for (const item of taskItems) {
    if (item.type === 'section') {
      saveSectionDuration();
      currentSectionId = item.item.id;
      currentMinutes = 0;
    } else if (item.type === 'task' && currentSectionId) {
      currentMinutes += (item.item as Task).minutes;
    }
  }
  
  saveSectionDuration();
  return durations;
};

type DayTaskListProps = {
  dayName: string;
  dayOfWeek: number;
  taskItems: TaskItem[];
  categories?: TaskCategory[];
  onCreateCategory: (category: Omit<TaskCategory, 'id'>) => void;
  isTemplate: boolean;
  onAddTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onAddSection?: (sectionName: string, insertIndex: number) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onDeleteTask: (taskId: string) => void;
  onEditSection?: (sectionId: string) => void;
  onOpenSectionDialog?: (insertIndex: number) => void;
  onMoveTask: (taskId: string, sourceIndex: number, destinationIndex: number, newAssignedTo?: string | null) => void;
  onMoveTaskBetweenDays?: (sourceDayOfWeek: number, targetDayOfWeek: number, oldIndex: number, newIndex: number, taskId: string, newAssignedTo?: string | null) => void;
  dragContextId?: string;
  showDayHeader?: boolean;
};

const DayTaskList: React.FC<DayTaskListProps> = ({
  dayName,
  dayOfWeek,
  taskItems = [],
  categories = [],
  onCreateCategory,
  isTemplate,
  onAddTask,
  onAddSection,
  onUpdateTask,
  onDeleteTask,
  onEditSection,
  onOpenSectionDialog,
  onMoveTask,
  onMoveTaskBetweenDays,
  showDayHeader = false,
  dragContextId,
}) => {
  const { taskService } = useTaskManager();
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [currentTask, setCurrentTask] = useState<Task | undefined>(undefined);
  const [notesTask, setNotesTask] = useState<Task | null>(null);
  
  // Using simpler mouse and touch sensors with minimal configuration
  const sensors = useSensors(
    useSensor(MouseSensor, {
      // Larger activationConstraint to make it easier to start dragging
      activationConstraint: {
        distance: 10, // Need to move 10px to start dragging
      },
    }),
    useSensor(TouchSensor, {
      // For touch devices
      activationConstraint: {
        delay: 250, // Delay before drag starts on touch
        tolerance: 5, // Tolerance for movement during delay
      },
    })
  );

  
  // Calculate all section durations in one pass
  const sectionDurations = calculateSectionDurations(taskItems);
  
  // Convert back to Task[] for metrics and display
  const displayTasks = taskItemsToTasks(taskItems);
  
  // Use TaskService to calculate metrics
  const metrics = taskService.calculateTaskMetricsByOwner(displayTasks);
  
  const handleTaskEdit = (taskItem: TaskItem) => {
    if (taskItem.type !== 'task') {
      throw new Error('Cannot edit non-task item');
    }
    setCurrentTask(taskItem.item as Task);
    setTaskDialogOpen(true);
  };
  
  const handleTaskDelete = (taskItem: TaskItem) => {
    if (taskItem.type !== 'task') {
      throw new Error('Cannot delete non-task item');
    }
    onDeleteTask(taskItem.item.id);
  };
  
  const handleToggleComplete = (taskItem: TaskItem, completed: boolean) => {
    if (taskItem.type !== 'task') {
      throw new Error('Cannot toggle completion for non-task item');
    }
    onUpdateTask(taskItem.item.id, { completed });
  };
  
  const handleTaskAssign = (taskItem: TaskItem, assignedTo: string | null) => {
    if (taskItem.type !== 'task') {
      throw new Error('Cannot assign non-task item');
    }
    onUpdateTask(taskItem.item.id, { assignedTo });
  };

  const handleAddSectionAbove = (taskItem: TaskItem) => {
    if (!onOpenSectionDialog) return;
    
    const taskIndex = taskItems.findIndex(item => item.item.id === taskItem.item.id);
    if (taskIndex !== -1) {
      onOpenSectionDialog(taskIndex);
    }
  };

  const handleNotesClick = (taskItem: TaskItem) => {
    if (taskItem.type !== 'task') return;
    const targetTask = taskItem.item as Task;
    if (targetTask.notes && targetTask.notes.trim().length > 0) {
      setNotesTask(targetTask);
    }
  };

  // Set up the droppable area for this day container
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: dragContextId || 'day-default',
  });
  
  // Generate task metrics component using TaskService metrics
  const TaskMetrics = () => (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
      {/* My Tasks Summary */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        bgcolor: 'primary.50', 
        px: 1.5,
        py: 0.5,
        borderRadius: 1,
        borderLeft: `4px solid ${taskService.getUserColor(taskService.userId)}`
      }}>
        <Typography variant="caption" sx={{ fontWeight: 'medium' }}>
          {metrics.user.hoursRemaining.toFixed(1)} / {metrics.user.hoursTotal.toFixed(1)} hrs (Me)
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
          {metrics.partner.hoursRemaining.toFixed(1)} / {metrics.partner.hoursTotal.toFixed(1)} hrs ({taskService.getPartnerNickname(taskService.partnerId)})
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
          {metrics.unassigned.hoursRemaining.toFixed(1)} / {metrics.unassigned.hoursTotal.toFixed(1)} hrs
        </Typography>
      </Box>
    </Box>
  );

  const EmptyTasksNotice = () => (
    <Typography 
      variant="body2" 
      sx={{ 
        color: 'text.secondary', 
        fontStyle: 'italic',
        textAlign: 'center', 
        py: 2 
      }}
    >
      No tasks assigned
    </Typography>
  );
  
  return (
    <Paper elevation={10} sx={{ 
      p: 2, 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      pb: { xs: '72px', sm: 2 } // Add extra bottom padding on mobile devices
    }}>
      {showDayHeader && (
        <Box sx={{ mb: 1, borderBottom: '1px solid', borderColor: 'divider', pb: 0.5 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
            {dayName}
          </Typography>
        </Box>
      )}
      
      <Box sx={{ 
        flexGrow: 1,
        mb: { xs: 5, sm: 0 }
      }}>
        <Paper 
          variant="outlined"
          ref={setDroppableRef}
          sx={{
            p: 1.5,
            bgcolor: isOver ? `rgba(${getUserColorAsRgba(taskService)})` : 'background.paper',
            transition: 'background-color 0.2s ease',
            position: 'relative'
          }}
        >
          <Box sx={{ mb: 1 }}>
            <TaskMetrics />
          </Box>
          
          <Divider sx={{ mb: 1 }} />
          
          <Box sx={{ minHeight: 50, userSelect: 'none' as const }}>
            {taskItems.length === 0 ? (
              <div>
                <EmptyTasksNotice />
                {isOver && (
                  <Box sx={{ 
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    border: `2px dashed ${taskService.getUserColor(taskService.userId)}`,
                    borderRadius: 1,
                    pointerEvents: 'none',
                    zIndex: 2
                  }} />
                )}
              </div>
            ) : (
              <SortableContext 
                items={taskItems.map(item => item.type === 'task' ? item.item.id : `section-${item.item.id}`)} 
                strategy={verticalListSortingStrategy}
              >
                {taskItems.map((taskItem, index) => (
                  taskItem.type === 'task' ? (
                    <SortableTaskCard
                      key={taskItem.item.id}
                      task={taskItem.item as Task}
                      categories={categories}
                      isTemplate={isTemplate}
                      onEdit={() => handleTaskEdit(taskItem)}
                      onDelete={() => handleTaskDelete(taskItem)}
                      onToggleComplete={(completed) => handleToggleComplete(taskItem, completed)}
                      onAssign={(assignedTo) => handleTaskAssign(taskItem, assignedTo)}
                      onAddSectionAbove={onOpenSectionDialog ? () => handleAddSectionAbove(taskItem) : undefined}
                      dragContextId={dragContextId || 'default'}
                      onNotesClick={() => handleNotesClick(taskItem)}
                    />
                  ) : (
                    <DraggableSectionItem
                      key={`section-${taskItem.item.id}`}
                      section={taskItem.item as Section}
                      dragContextId={dragContextId || 'default'}
                      duration={sectionDurations.get(taskItem.item.id)}
                      onEdit={onEditSection}
                    />
                  )
                ))}
              </SortableContext>
            )}
          </Box>
        </Paper>
      </Box>
      
      <TaskDialog
        open={taskDialogOpen}
        onClose={() => setTaskDialogOpen(false)}
        task={currentTask}
        categories={categories}
        onCreateCategory={onCreateCategory}
        onAddTask={onAddTask}
        onUpdateTask={onUpdateTask}
        onMoveTaskBetweenDays={onMoveTaskBetweenDays}
        dialogTitle={currentTask ? 'Edit Task' : 'Add Task'}
        currentDayIndex={dayOfWeek}
        tasks={displayTasks}
      />

      <TaskNotesDialog
        open={!!notesTask}
        taskTitle={notesTask?.title || ''}
        initialNotes={notesTask?.notes || ''}
        onClose={() => setNotesTask(null)}
        onSave={(value) => {
          if (!notesTask) return Promise.resolve();
          return Promise.resolve(onUpdateTask(notesTask.id, { notes: value }));
        }}
      />
    </Paper>
  );
};

// Memoize the component to avoid unnecessary re-renders
export default memo(DayTaskList);
