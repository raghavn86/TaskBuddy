import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { usePartnership } from './PartnershipContext';
import {
  WellnessTask,
  WellnessTaskInstance,
  DisplayWellnessTask,
  FeelingEntry,
  WellnessCategory,
  RecurrenceType,
  FeelingType,
  BodyStateType,
} from '../types/wellness';
import {
  createWellnessTask,
  updateWellnessTask,
  deleteWellnessTask,
  getUserWellnessTasks,
  createWellnessInstance,
  updateWellnessInstance,
  deleteWellnessInstance,
  getTasksForDate,
  updateInstancesOrder,
  createFeelingEntry,
  getFeelingEntries,
  getLatestFeelingEntry,
  createWellnessCategory,
  updateWellnessCategory,
  deleteWellnessCategory,
  getWellnessCategories,
} from '../firebase/wellnessServices';
import {
  convertToDisplayTask,
  sortDisplayTasks,
  getTodayISO,
} from '../utils/wellnessHelpers';

type WellnessContextType = {
  // State
  currentDate: string;
  tasks: DisplayWellnessTask[];
  categories: WellnessCategory[];
  feelingEntries: FeelingEntry[];
  latestFeeling: FeelingEntry | null;
  isLoading: boolean;
  error: string | null;

  // Date Navigation
  setCurrentDate: (date: string) => void;
  goToToday: () => void;
  goToPreviousDay: () => void;
  goToNextDay: () => void;

  // Task Actions
  addTask: (
    title: string,
    recurrence: RecurrenceType,
    categoryId?: string
  ) => Promise<WellnessTask>;
  editTaskSeries: (
    seriesId: string,
    updates: Partial<WellnessTask>
  ) => Promise<void>;
  deleteTaskSeries: (seriesId: string) => Promise<void>;
  toggleTaskCompletion: (
    displayTask: DisplayWellnessTask
  ) => Promise<void>;
  editTaskInstance: (
    displayTask: DisplayWellnessTask,
    updates: Partial<WellnessTaskInstance>
  ) => Promise<void>;
  reorderTasks: (reorderedTasks: DisplayWellnessTask[]) => Promise<void>;

  // Category Actions
  loadCategories: () => Promise<void>;
  addCategory: (name: string, color: string) => Promise<WellnessCategory>;
  editCategory: (categoryId: string, name: string, color: string) => Promise<void>;
  removeCategory: (categoryId: string) => Promise<void>;

  // Feeling/State Actions
  addFeelingEntry: (
    feeling: FeelingType,
    bodyState: BodyStateType,
    notes?: string
  ) => Promise<FeelingEntry>;
  loadFeelingEntries: (startDate?: string, endDate?: string) => Promise<void>;
  refreshLatestFeeling: () => Promise<void>;

  // Refresh
  refreshTasks: () => Promise<void>;
};

const WellnessContext = createContext<WellnessContextType | null>(null);

export const useWellness = () => {
  const context = useContext(WellnessContext);
  if (!context) {
    throw new Error('useWellness must be used within a WellnessProvider');
  }
  return context;
};

type WellnessProviderProps = {
  children: React.ReactNode;
};

export const WellnessProvider: React.FC<WellnessProviderProps> = ({ children }) => {
  const { currentUser } = useAuth();
  const { activePartnership } = usePartnership();

  const [currentDate, setCurrentDate] = useState<string>(getTodayISO());
  const [tasks, setTasks] = useState<DisplayWellnessTask[]>([]);
  const [categories, setCategories] = useState<WellnessCategory[]>([]);
  const [feelingEntries, setFeelingEntries] = useState<FeelingEntry[]>([]);
  const [latestFeeling, setLatestFeeling] = useState<FeelingEntry | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load tasks for current date
  const loadTasksForDate = useCallback(async (date: string, showLoading: boolean = true) => {
    if (!currentUser || !activePartnership) return;

    try {
      if (showLoading) {
        setIsLoading(true);
      }
      setError(null);

      const tasksWithInstances = await getTasksForDate(
        currentUser.uid,
        activePartnership.id,
        date
      );

      const displayTasks = tasksWithInstances.map(({ task, instance }) =>
        convertToDisplayTask(task, instance, date)
      );

      setTasks(sortDisplayTasks(displayTasks));
    } catch (err) {
      console.error('Error loading tasks:', err);
      setError('Failed to load tasks');
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  }, [currentUser, activePartnership]);

  // Refresh tasks for current date (without showing loading state)
  const refreshTasks = useCallback(async () => {
    await loadTasksForDate(currentDate, false);
  }, [currentDate, loadTasksForDate]);

  // Load tasks when date changes
  useEffect(() => {
    loadTasksForDate(currentDate);
  }, [currentDate, loadTasksForDate]);

  // Date Navigation
  const goToToday = useCallback(() => {
    setCurrentDate(getTodayISO());
  }, []);

  const goToPreviousDay = useCallback(() => {
    const date = new Date(currentDate + 'T00:00:00');
    date.setDate(date.getDate() - 1);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    setCurrentDate(`${year}-${month}-${day}`);
  }, [currentDate]);

  const goToNextDay = useCallback(() => {
    const date = new Date(currentDate + 'T00:00:00');
    date.setDate(date.getDate() + 1);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    setCurrentDate(`${year}-${month}-${day}`);
  }, [currentDate]);

  // Task Actions
  const addTask = useCallback(
    async (
      title: string,
      recurrence: RecurrenceType,
      categoryId?: string
    ): Promise<WellnessTask> => {
      if (!currentUser || !activePartnership) {
        throw new Error('User or partnership not available');
      }

      const newTask = await createWellnessTask({
        title,
        recurrence,
        startDate: currentDate,
        categoryId,
        userId: currentUser.uid,
        partnershipId: activePartnership.id,
        order: tasks.length,
      });

      await refreshTasks();
      return newTask;
    },
    [currentUser, activePartnership, currentDate, tasks.length, refreshTasks]
  );

  const editTaskSeries = useCallback(
    async (seriesId: string, updates: Partial<WellnessTask>) => {
      await updateWellnessTask(seriesId, updates);
      await refreshTasks();
    },
    [refreshTasks]
  );

  const deleteTaskSeries = useCallback(
    async (seriesId: string) => {
      await deleteWellnessTask(seriesId);
      await refreshTasks();
    },
    [refreshTasks]
  );

  const toggleTaskCompletion = useCallback(
    async (displayTask: DisplayWellnessTask) => {
      if (!currentUser || !activePartnership) return;

      if (displayTask.isInstance) {
        // Update existing instance
        await updateWellnessInstance(displayTask.id, {
          completed: !displayTask.completed,
        });
      } else {
        // Create new instance
        await createWellnessInstance({
          seriesId: displayTask.seriesId,
          date: currentDate,
          completed: !displayTask.completed,
          userId: currentUser.uid,
          partnershipId: activePartnership.id,
        });
      }

      await refreshTasks();
    },
    [currentUser, activePartnership, currentDate, refreshTasks]
  );

  const editTaskInstance = useCallback(
    async (
      displayTask: DisplayWellnessTask,
      updates: Partial<WellnessTaskInstance>
    ) => {
      if (!currentUser || !activePartnership) return;

      if (displayTask.isInstance) {
        // Update existing instance
        await updateWellnessInstance(displayTask.id, updates);
      } else {
        // Create new instance with updates
        await createWellnessInstance({
          seriesId: displayTask.seriesId,
          date: currentDate,
          completed: displayTask.completed,
          userId: currentUser.uid,
          partnershipId: activePartnership.id,
          ...updates,
        });
      }

      await refreshTasks();
    },
    [currentUser, activePartnership, currentDate, refreshTasks]
  );

  const reorderTasks = useCallback(
    async (reorderedTasks: DisplayWellnessTask[]) => {
      if (!currentUser || !activePartnership) return;

      // Update order for all tasks
      const updates: { id: string; order: number }[] = [];

      for (let i = 0; i < reorderedTasks.length; i++) {
        const task = reorderedTasks[i];
        if (task.order !== i) {
          if (task.isInstance) {
            // Update existing instance
            updates.push({ id: task.id, order: i });
          } else {
            // Create new instance with new order
            const newInstance = await createWellnessInstance({
              seriesId: task.seriesId,
              date: currentDate,
              completed: task.completed,
              order: i,
              userId: currentUser.uid,
              partnershipId: activePartnership.id,
            });
            updates.push({ id: newInstance.id, order: i });
          }
        }
      }

      if (updates.length > 0) {
        await updateInstancesOrder(updates);
      }

      await refreshTasks();
    },
    [currentUser, activePartnership, currentDate, refreshTasks]
  );

  // Category Actions
  const loadCategories = useCallback(async () => {
    if (!activePartnership) return;

    try {
      const cats = await getWellnessCategories(activePartnership.id);
      setCategories(cats);
    } catch (err) {
      console.error('Error loading categories:', err);
      setError('Failed to load categories');
    }
  }, [activePartnership]);

  const addCategory = useCallback(
    async (name: string, color: string): Promise<WellnessCategory> => {
      if (!currentUser || !activePartnership) {
        throw new Error('User or partnership not available');
      }

      const newCategory = await createWellnessCategory({
        name,
        color,
        partnershipId: activePartnership.id,
        userId: currentUser.uid,
      });

      await loadCategories();
      return newCategory;
    },
    [currentUser, activePartnership, loadCategories]
  );

  const editCategory = useCallback(
    async (categoryId: string, name: string, color: string) => {
      await updateWellnessCategory(categoryId, { name, color });
      await loadCategories();
    },
    [loadCategories]
  );

  const removeCategory = useCallback(
    async (categoryId: string) => {
      // Delete category
      await deleteWellnessCategory(categoryId);

      // Clear category from all tasks
      // This will be handled when tasks are reloaded
      // (the category will simply not be found)

      await loadCategories();
      await refreshTasks();
    },
    [loadCategories, refreshTasks]
  );

  // Feeling/State Actions
  const loadFeelingEntries = useCallback(
    async (startDate?: string, endDate?: string) => {
      if (!currentUser || !activePartnership) return;

      try {
        const entries = await getFeelingEntries(
          currentUser.uid,
          activePartnership.id,
          startDate,
          endDate
        );
        setFeelingEntries(entries);
      } catch (err) {
        console.error('Error loading feeling entries:', err);
        setError('Failed to load feeling entries');
      }
    },
    [currentUser, activePartnership]
  );

  const addFeelingEntry = useCallback(
    async (
      feeling: FeelingType,
      bodyState: BodyStateType,
      notes?: string
    ): Promise<FeelingEntry> => {
      if (!currentUser || !activePartnership) {
        throw new Error('User or partnership not available');
      }

      const newEntry = await createFeelingEntry({
        userId: currentUser.uid,
        partnershipId: activePartnership.id,
        feeling,
        bodyState,
        date: currentDate,
        notes,
      });

      setLatestFeeling(newEntry);

      // Auto-reload feeling entries to update the graph
      await loadFeelingEntries();

      return newEntry;
    },
    [currentUser, activePartnership, currentDate, loadFeelingEntries]
  );

  const refreshLatestFeeling = useCallback(async () => {
    if (!currentUser || !activePartnership) return;

    try {
      const latest = await getLatestFeelingEntry(
        currentUser.uid,
        activePartnership.id
      );
      setLatestFeeling(latest);
    } catch (err) {
      console.error('Error loading latest feeling:', err);
    }
  }, [currentUser, activePartnership]);

  // Load categories and latest feeling on mount
  useEffect(() => {
    if (currentUser && activePartnership) {
      loadCategories();
      refreshLatestFeeling();
    }
  }, [currentUser, activePartnership, loadCategories, refreshLatestFeeling]);

  const value: WellnessContextType = {
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
    loadCategories,
    addCategory,
    editCategory,
    removeCategory,
    addFeelingEntry,
    loadFeelingEntries,
    refreshLatestFeeling,
    refreshTasks,
  };

  return <WellnessContext.Provider value={value}>{children}</WellnessContext.Provider>;
};
