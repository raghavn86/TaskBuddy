import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { usePartnership } from './PartnershipContext';
import { Task, WeekPlan, ExecutionPlan, TaskCategory, TaskItem, Section, Item, NewTaskItem, PartialTaskItem } from '../types';
import TaskService from '../services/TaskService';
import { activityService } from '../firebase/activityService';
import {
  createTemplate,
  getPartnershipTemplates,
  getUserTemplates,
  getCollaborativeTemplates,
  createExecutionPlan,
  getPartnershipExecutionPlans,
  getUserExecutionPlans,
  updateTemplate,
  updateExecutionPlan,
  addTaskToDay,
  updateTask,
  deleteTask,
  moveTask,
  deleteTemplate as firebaseDeleteTemplate,
  deleteExecutionPlan as firebaseDeleteExecutionPlan,
  createTemplateFromPlan,
  cloneExecutionPlan,
  createCategory,
  getPartnershipCategories
} from '../firebase/services';

type TaskContextType = {
  templates: WeekPlan[];
  executionPlans: ExecutionPlan[];
  categories: TaskCategory[];
  activeTemplate: WeekPlan | null;
  activeExecutionPlan: ExecutionPlan | null;
  activeMode: 'template' | 'plan' | null;
  isLoading: boolean;
  error: string | null;
  
  // Task Service
  taskService: TaskService;
  
  // Template Actions
  loadTemplates: () => Promise<void>;
  createNewTemplate: (name: string) => Promise<WeekPlan>;
  selectTemplate: (templateId: string) => void;
  updateCurrentTemplate: (updates: Partial<WeekPlan>) => Promise<void>;
  deleteTemplate: (templateId: string) => Promise<void>;
  createTemplateFromPlan: (planId: string, name: string) => Promise<WeekPlan>;
  
  // Execution Plan Actions
  loadExecutionPlans: () => Promise<void>;
  createNewExecutionPlan: (templateId: string, weekStartDate: string) => Promise<ExecutionPlan>;
  selectExecutionPlan: (planId: string) => void;
  updateCurrentExecutionPlan: (updates: Partial<ExecutionPlan>) => Promise<void>;
  deleteExecutionPlan: (planId: string) => Promise<void>;
  cloneExecutionPlan: (planId: string, weekStartDate: string) => Promise<ExecutionPlan>;
  
  // Unified Item Actions
  selectItem: (itemId: string, mode: 'template' | 'plan') => void;
  getActiveItem: () => WeekPlan | ExecutionPlan | null;
  isTemplateMode: () => boolean;
  
  // Task Actions
  addTask: (dayOfWeek: number, taskItem: NewTaskItem, insertIndex?: number) => Promise<TaskItem>;
  updateTaskDetails: (dayOfWeek: number, itemId: string, updates: PartialTaskItem) => Promise<void>;
  removeTask: (dayOfWeek: number, itemId: string) => Promise<void>;
  moveTaskBetweenDays: (sourceDayOfWeek: number, targetDayOfWeek: number, itemId: string, sourceIndex: number, targetIndex: number, assignToUser?: string | null) => Promise<void>;
  assignTask: (dayOfWeek: number, taskId: string, userId: string | null) => Promise<void>;
  toggleTaskCompletion: (dayOfWeek: number, taskId: string, completed: boolean) => Promise<void>;
  
  // Category Actions
  loadCategories: () => Promise<void>;
  createNewCategory: (category: Omit<TaskCategory, 'id'>) => Promise<TaskCategory>;
};

const TaskContext = createContext<TaskContextType | null>(null);

export const useTaskManager = () => {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTaskManager must be used within a TaskProvider');
  }
  return context;
};

type TaskProviderProps = {
  children: React.ReactNode;
};

export const TaskProvider: React.FC<TaskProviderProps> = ({ children }) => {
  const { currentUser } = useAuth();
  const { activePartnership } = usePartnership();
  
  const [templates, setTemplates] = useState<WeekPlan[]>([]);
  const [executionPlans, setExecutionPlans] = useState<ExecutionPlan[]>([]);
  const [categories, setCategories] = useState<TaskCategory[]>([]);
  const [activeTemplate, setActiveTemplate] = useState<WeekPlan | null>(null);
  const [activeExecutionPlan, setActiveExecutionPlan] = useState<ExecutionPlan | null>(null);
  const [activeMode, setActiveMode] = useState<'template' | 'plan' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const logTaskActivity = useCallback(async (
    action: string,
    taskItem: TaskItem,
    dayOfWeek: number,
    planId: string,
    details: any = {},
  ) => {
    if (!currentUser) return;
    if (taskItem.type !== 'task') return;
    
    const task = taskItem.item as Task;

    const category = categories.find(c => c.id === task.categoryId);
    await activityService.logActivity(
      currentUser.uid,
      currentUser.displayName || currentUser.email || 'Unknown User',
      action as any,
      task.id,
      task.title,
      getDayName(dayOfWeek),
      planId,
      details,
      category?.id,
      category?.name,
      category?.color
    );
  }, [currentUser, categories]);
  
  // Create TaskService instance - this pattern ensures we have a valid reference even before currentUser is available
  const [taskService] = useState<TaskService>(() => new TaskService(
    currentUser?.uid || '',
    '' // Partner ID will be updated when partnership is available
  ));
  
  // Update taskService when the user or partnership changes
  useEffect(() => {
    if (currentUser) {
      taskService.userId = currentUser.uid;
    }
    
    // Update partner ID when partnership changes
    if (activePartnership && currentUser) {
      // Find the partner (not the current user)
      const partnerEntry = Object.entries(activePartnership.partners).find(
        ([userId]) => userId !== currentUser.uid
      );
      
      if (partnerEntry) {
        const [partnerId] = partnerEntry;
        taskService.partnerId = partnerId;
      }
      
      // Set up the color and nickname getter functions from the partnership
      taskService.getPartnerColor = (userId) => {
        if (!userId || !activePartnership) return '#9e9e9e'; // Default gray
        
        const partner = activePartnership.partners[userId];
        return partner ? partner.color : '#9e9e9e';
      };
      
      taskService.getUserColor = (userId) => {
        if (!userId || !activePartnership || !currentUser) return '#1976d2'; // Default blue
        
        if (userId === currentUser.uid) {
          // Find the current user's partner entry
          const userPartner = activePartnership.partners[userId];
          return userPartner?.color || '#1976d2'; // Return user color or default blue
        }
        
        return '#1976d2'; // Default blue for any other case
      };
      
      taskService.getPartnerNickname = (userId) => {
        if (!userId || !activePartnership) return 'Partner';
        
        if (currentUser && userId === currentUser.uid) return 'You';
        
        const partner = activePartnership.partners[userId];
        return partner ? partner.nickname : 'Partner';
      };
    }
  }, [currentUser, activePartnership, taskService]);
  
  // Template Actions
  const loadTemplates = useCallback(async () => {
    if (!currentUser || !activePartnership) return;
    
    setIsLoading(true);
    try {
      // Get templates for the active partnership
      const templates = await getPartnershipTemplates(activePartnership.id);
      setTemplates(templates);
    } catch (err) {
      console.error('Error loading templates:', err);
      setError('Failed to load templates');
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, activePartnership]);

  // Execution Plan Actions
  const loadExecutionPlans = useCallback(async () => {
    if (!currentUser || !activePartnership) return;
    
    setIsLoading(true);
    try {
      const plans = await getPartnershipExecutionPlans(activePartnership.id);
      setExecutionPlans(plans);
    } catch (err) {
      console.error('Error loading execution plans:', err);
      setError('Failed to load execution plans');
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, activePartnership]);
  
  // Category functions
  const loadCategories = useCallback(async () => {
    if (!activePartnership) return;
    
    setIsLoading(true);
    try {
      const partnershipCategories = await getPartnershipCategories(activePartnership.id);
      setCategories(partnershipCategories);
    } catch (err) {
      console.error('Error loading categories:', err);
      setError('Failed to load categories');
    } finally {
      setIsLoading(false);
    }
  }, [activePartnership]);

  // Load templates when user or partnership changes
  useEffect(() => {
    if (currentUser && activePartnership) {
      loadTemplates();
      loadExecutionPlans();
      loadCategories();
    } else {
      setTemplates([]);
      setExecutionPlans([]);
      setCategories([]);
      setActiveTemplate(null);
      setActiveExecutionPlan(null);
      setActiveMode(null);
    }

    // Fix CSS issue with padding on main element
    const fixMainElementPadding = () => {
      const mainElements = document.querySelectorAll('main');
      const mobileNavHeight = 56; // Define bottom nav height constant
      mainElements.forEach((main) => {
        if (window.innerWidth <= 600) { // Mobile viewport
          main.style.paddingBottom = `${mobileNavHeight + 24}px`; // Increased padding
          main.style.paddingTop = '64px';
          main.style.flex = '1 1 auto';
          main.style.overflowY = 'auto';
          main.style.marginBottom = '0';
          main.style.position = 'relative'; // Ensure proper positioning context
        }
      });
    };

    // Run once on mount and then on resize
    fixMainElementPadding();
    window.addEventListener('resize', fixMainElementPadding);

    return () => window.removeEventListener('resize', fixMainElementPadding);
  }, [currentUser, loadTemplates, loadExecutionPlans, loadCategories]);
  
  const createNewTemplate = async (name: string) => {
    if (!currentUser) throw new Error('User not authenticated');
    
    setIsLoading(true);
    try {
      // Create empty template with a week structure
      const emptyDays: Record<number, any> = {};
      for (let i = 0; i < 7; i++) {
        emptyDays[i] = {
          dayOfWeek: i,
          tasks: {},
        };
      }
      
      if (!activePartnership) throw new Error('No active partnership selected');
      
      // Add both partners as collaborators automatically
      const collaborators = [currentUser.uid];
      
      // Find the partner ID (not the current user)
      const partnerEntries = Object.entries(activePartnership.partners);
      const partnerEntry = partnerEntries.find(([userId]) => userId !== currentUser.uid);
      
      // Add partner ID to collaborators if found
      if (partnerEntry && partnerEntry[0]) {
        collaborators.push(partnerEntry[0]);
      }

      const newTemplate = await createTemplate({
        name,
        isTemplate: true,
        days: emptyDays,
        createdBy: currentUser.uid,
        collaborators: collaborators,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        partnershipId: activePartnership.id,
      } as Omit<WeekPlan, 'id'>);
      
      setTemplates(prev => [...prev, newTemplate]);
      setActiveTemplate(newTemplate);
      
      return newTemplate;
    } catch (err) {
      console.error('Error creating template:', err);
      setError('Failed to create template');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };
  
  const selectTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId) || null;
    setActiveTemplate(template);
    setActiveExecutionPlan(null); // Clear the other type
    setActiveMode('template');
  };
  
  // Helper functions for unified access
  const getActiveItem = () => {
    return activeMode === 'template' ? activeTemplate : activeExecutionPlan;
  };
  
  const isTemplateMode = () => activeMode === 'template';
  
  const selectItem = (itemId: string, mode: 'template' | 'plan') => {
    if (mode === 'template') {
      selectTemplate(itemId);
    } else {
      selectExecutionPlan(itemId);
    }
  };
  
  const updateCurrentTemplate = async (updates: Partial<WeekPlan>) => {
    if (!activeTemplate) throw new Error('No active template selected');
    
    setIsLoading(true);
    try {
      await updateTemplate(activeTemplate.id, updates);
      
      // Update local state
      const updatedTemplate = { ...activeTemplate, ...updates };
      setActiveTemplate(updatedTemplate);
      setTemplates(prev => prev.map(t => t.id === activeTemplate.id ? updatedTemplate : t));
      
    } catch (err) {
      console.error('Error updating template:', err);
      setError('Failed to update template');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };
  
  const createNewExecutionPlan = async (templateId: string, weekStartDate: string) => {
    if (!currentUser) throw new Error('User not authenticated');
    if (!activePartnership) throw new Error('No active partnership selected');
    
    setIsLoading(true);
    try {
      // Create the execution plan
      const newPlan = await createExecutionPlan(templateId, weekStartDate, currentUser.uid);
      
      // Add both partners as collaborators automatically
      const collaborators = [currentUser.uid];
      
      // Find the partner ID (not the current user)
      const partnerEntries = Object.entries(activePartnership.partners);
      const partnerEntry = partnerEntries.find(([userId]) => userId !== currentUser.uid);
      
      // Add partner ID to collaborators if found
      if (partnerEntry && partnerEntry[0]) {
        collaborators.push(partnerEntry[0]);
      }
      
      // Add the partnership ID and collaborators
      await updateExecutionPlan(newPlan.id, { 
        partnershipId: activePartnership.id,
        collaborators: collaborators
      });
      
      // Update the local copy with collaborators
      newPlan.collaborators = collaborators;
      
      setExecutionPlans(prev => [...prev, newPlan]);
      setActiveExecutionPlan(newPlan);
      
      return newPlan;
    } catch (err) {
      console.error('Error creating execution plan:', err);
      setError('Failed to create execution plan');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };
  
  const selectExecutionPlan = (planId: string) => {
    const plan = executionPlans.find(p => p.id === planId) || null;
    setActiveExecutionPlan(plan);
    setActiveTemplate(null); // Clear the other type
    setActiveMode('plan');
  };
  
  const updateCurrentExecutionPlan = async (updates: Partial<ExecutionPlan>) => {
    if (!activeExecutionPlan) throw new Error('No active execution plan selected');
    
    setIsLoading(true);
    try {
      await updateExecutionPlan(activeExecutionPlan.id, updates);
      
      // Update local state
      const updatedPlan = { ...activeExecutionPlan, ...updates };
      setActiveExecutionPlan(updatedPlan);
      setExecutionPlans(prev => prev.map(p => p.id === activeExecutionPlan.id ? updatedPlan as ExecutionPlan : p));
      
      
    } catch (err) {
      console.error('Error updating execution plan:', err);
      setError('Failed to update execution plan');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Helper method to get user email from userId
  const getUserEmail = (userId: string | null): string => {
    if (!userId) return 'Unassigned';
    if (userId === currentUser?.uid) return currentUser.email || 'Unknown';
    if (activePartnership?.partners[userId]) {
      return activePartnership.partners[userId].email || 'Partner';
    }
    return 'Unknown User';
  };

  // Helper method to get day name from dayOfWeek number
  const getDayName = (dayOfWeek: number): string => {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return dayNames[dayOfWeek] || 'Unknown Day';
  };

  // Helper method to log activity
  // Task Actions
  const addTask = async (dayOfWeek: number, taskItem: NewTaskItem, insertIndex?: number) => {
    const activePlan = activeTemplate || activeExecutionPlan;
    if (!activePlan) throw new Error('No active plan selected');
    if (!currentUser) throw new Error('User not authenticated');
    
    setIsLoading(true);
    try {
      const isTemplate = !!activeTemplate;
      
      const { newTask, updatedDays } = await addTaskToDay(activePlan.id, dayOfWeek, taskItem, isTemplate, insertIndex);
      
      // Use the updated days from the service
      const updatedPlan = { ...activePlan, days: updatedDays };
      
      if (isTemplate) {
        setActiveTemplate(updatedPlan as WeekPlan);
        setTemplates(prev => prev.map(t => t.id === activePlan.id ? updatedPlan : t));
      } else {
        setActiveExecutionPlan(updatedPlan as ExecutionPlan);
        setExecutionPlans(prev => prev.map(p => p.id === activePlan.id ? updatedPlan as ExecutionPlan : p));
        
        await logTaskActivity('task_added', newTask, dayOfWeek, activePlan.id, { toDay: getDayName(dayOfWeek) });
      }
      
      return newTask;
    } catch (err) {
      console.error('Error adding item:', err);
      setError('Failed to add item');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };
  
  const updateTaskDetails = async (dayOfWeek: number, itemId: string, updates: PartialTaskItem) => {
    const activePlan = activeTemplate || activeExecutionPlan;
    if (!activePlan) throw new Error('No active plan selected');
    if (!currentUser) throw new Error('User not authenticated');
    
    setIsLoading(true);
    try {
      const isTemplate = !!activeTemplate;
      
      const currentTaskItem = activePlan.days[dayOfWeek]?.tasks[itemId];
      if (!currentTaskItem) throw new Error('Item not found');
      
      await updateTask(activePlan.id, dayOfWeek, itemId, updates as Partial<TaskItem>, isTemplate);
      
      // Update local state
      const updatedDays = { ...activePlan.days };
      const updatedTaskItem = { 
        ...currentTaskItem, 
        ...updates,
        item: { ...currentTaskItem.item, ...updates.item }
      };
      updatedDays[dayOfWeek].tasks[itemId] = updatedTaskItem;
      
      const updatedPlan = { ...activePlan, days: updatedDays };
      
      if (isTemplate) {
        setActiveTemplate(updatedPlan as WeekPlan);
        setTemplates(prev => prev.map(t => t.id === activePlan.id ? updatedPlan : t));
      } else {
        setActiveExecutionPlan(updatedPlan as ExecutionPlan);
        setExecutionPlans(prev => prev.map(p => p.id === activePlan.id ? updatedPlan as ExecutionPlan : p));
        
        // Log activity for execution plans only (tasks only)
        if (currentTaskItem.type === 'task' && updates.item && ('title' in updates.item || 'minutes' in updates.item || 'assignedTo' in updates.item || 'completed' in updates.item)) {
          let action = 'task_updated';
          const details: any = {};
          const currentTask = currentTaskItem.item as Task;
          const updatedTask = updatedTaskItem.item as Task;
          
          if ('title' in updates.item && updates.item.title) {
            action = 'task_updated';
            details.from = currentTask.title;
            details.to = updatedTask.title;
          }
          
          if ('minutes' in updates.item && updates.item.minutes) {
            action = 'task_updated';
            details.from = `${currentTask.minutes}min`;
            details.to = `${updatedTask.minutes}min`;
          }
          
          if ('assignedTo' in updates.item && updates.item.assignedTo !== undefined) {
            action = 'task_assigned';
            details.from = getUserEmail(currentTask.assignedTo);
            details.to = getUserEmail(updatedTask.assignedTo);
          }
          
          if ('completed' in updates.item && updates.item.completed !== undefined) {
            action = updatedTask.completed ? 'task_completed' : 'task_uncompleted';
          }
          
          await logTaskActivity(action, updatedTaskItem, dayOfWeek, activePlan.id, details);
        }
      }
      
    } catch (err) {
      console.error('Error updating item:', err);
      setError('Failed to update item');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };
  
  const removeTask = async (dayOfWeek: number, itemId: string) => {
    const activePlan = activeTemplate || activeExecutionPlan;
    if (!activePlan) throw new Error('No active plan selected');
    if (!currentUser) throw new Error('User not authenticated');
    
    setIsLoading(true);
    try {
      const isTemplate = !!activeTemplate;
      
      const currentTaskItem = activePlan.days[dayOfWeek]?.tasks[itemId];
      if (!currentTaskItem) throw new Error('Item not found');
      
      // Delete from Firebase for both tasks and sections
      await deleteTask(activePlan.id, dayOfWeek, itemId, isTemplate);
      
      // Update local state
      const updatedDays = { ...activePlan.days };
      delete updatedDays[dayOfWeek].tasks[itemId];
      
      const updatedPlan = { ...activePlan, days: updatedDays };
      
      if (isTemplate) {
        setActiveTemplate(updatedPlan as WeekPlan);
        setTemplates(prev => prev.map(t => t.id === activePlan.id ? updatedPlan : t));
      } else {
        setActiveExecutionPlan(updatedPlan as ExecutionPlan);
        setExecutionPlans(prev => prev.map(p => p.id === activePlan.id ? updatedPlan as ExecutionPlan : p));
        
        // Log activity for execution plans only
        await logTaskActivity(
          'task_deleted',
          currentTaskItem,
          dayOfWeek,
          activePlan.id,
          { fromDay: getDayName(dayOfWeek) }
        );
      }
      
    } catch (err) {
      console.error('Error removing item:', err);
      setError('Failed to remove item');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };
  
  const moveTaskBetweenDays = async (
    sourceDayOfWeek: number,
    targetDayOfWeek: number,
    itemId: string,
    sourceIndex: number,
    targetIndex: number,
    assignToUser?: string | null,
  ) => {
    const activePlan = activeTemplate || activeExecutionPlan;
    if (!activePlan) throw new Error('No active plan selected');
    if (!currentUser) throw new Error('User not authenticated');

    const currentTaskItem = activePlan.days[sourceDayOfWeek]?.tasks[itemId];
    if (!currentTaskItem) throw new Error('Item not found');
    
    // Sections cannot move between different days
    if (currentTaskItem.type === 'section' && sourceDayOfWeek !== targetDayOfWeek) {
      throw new Error('Sections cannot be moved between different days');
    }
  
    setIsLoading(true);
    try {
      const isTemplate = !!activeTemplate;
      const updatedDays = { ...activePlan.days };
      const itemToMove = { ...currentTaskItem };
  
      if (assignToUser !== undefined && currentTaskItem.type === 'task') {
        (itemToMove.item as Task).assignedTo = assignToUser;
      }
  
      // Case 1: Moving within the same day — reorder only
      if (sourceDayOfWeek === targetDayOfWeek) {
        const tasks = Object.entries(updatedDays[sourceDayOfWeek].tasks);
        const reordered = tasks.filter(([id]) => id !== itemId);
  
        reordered.splice(targetIndex, 0, [itemId, itemToMove]);
  
        // Rebuild task list with updated order
        updatedDays[sourceDayOfWeek].tasks = Object.fromEntries(
          reordered.map(([id, taskItem], index) => [
            id,
            { ...taskItem, item: { ...taskItem.item, order: index } },
          ])
        );
      } else {
        // Case 2: Moving to a different day (tasks only)
  
        // Remove from source day
        const sourceTasks = Object.entries(updatedDays[sourceDayOfWeek].tasks)
          .filter(([id]) => id !== itemId);
  
        updatedDays[sourceDayOfWeek].tasks = Object.fromEntries(
          sourceTasks.map(([id, taskItem], index) => [
            id,
            { ...taskItem, item: { ...taskItem.item, order: index } },
          ])
        );
  
        // Prepare target day if it doesn't exist
        if (!updatedDays[targetDayOfWeek]) {
          updatedDays[targetDayOfWeek] = {
            id: `${activePlan.id}-${targetDayOfWeek}`,
            dayOfWeek: targetDayOfWeek,
            tasks: {},
          };
        }
  
        // Add to target day at correct index
        const targetTasks = Object.entries(updatedDays[targetDayOfWeek].tasks);
        targetTasks.splice(targetIndex, 0, [itemId, itemToMove]);
  
        updatedDays[targetDayOfWeek].tasks = Object.fromEntries(
          targetTasks.map(([id, taskItem], index) => [
            id,
            { ...taskItem, item: { ...taskItem.item, order: index } },
          ])
        );
      }
  
      const updatedPlan = { ...activePlan, days: updatedDays };
  
      if (isTemplate) {
        setActiveTemplate(updatedPlan as WeekPlan);
        setTemplates(prev => prev.map(t => t.id === activePlan.id ? updatedPlan : t));
      } else {
        setActiveExecutionPlan(updatedPlan as ExecutionPlan);
        setExecutionPlans(prev => prev.map(p => p.id === activePlan.id ? updatedPlan as ExecutionPlan : p));
        
        // Log activity for execution plans only if moving between different days
        if (sourceDayOfWeek !== targetDayOfWeek) {
          await logTaskActivity(
            'task_moved',
            currentTaskItem,
            targetDayOfWeek,
            activePlan.id,
            { 
              fromDay: getDayName(sourceDayOfWeek), 
              toDay: getDayName(targetDayOfWeek) 
            }
          );
        }
      }
  
      // Remote update for both tasks and sections
      await moveTask(
        activePlan.id,
        sourceDayOfWeek,
        targetDayOfWeek,
        itemId,
        isTemplate,
        assignToUser,
        sourceIndex,
        targetIndex
      );
  
      await loadExecutionPlans();
  
    } catch (err) {
      console.error('Error moving item:', err);
      setError('Failed to move item');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };
  
  
  
  const assignTask = async (dayOfWeek: number, taskId: string, userId: string | null) => {
    const activePlan = activeTemplate || activeExecutionPlan;
    if (!activePlan) throw new Error('No active plan selected');
    
    const currentTaskItem = activePlan.days[dayOfWeek]?.tasks[taskId];
    if (!currentTaskItem) throw new Error('Item not found');
    
    if (currentTaskItem.type !== 'task') {
      throw new Error('Sections cannot be assigned to users');
    }
    
    await updateTaskDetails(dayOfWeek, taskId, { item: { assignedTo: userId } as Partial<Task> });
  };
  
  const toggleTaskCompletion = async (dayOfWeek: number, taskId: string, completed: boolean) => {
    const activePlan = activeTemplate || activeExecutionPlan;
    if (!activePlan) throw new Error('No active plan selected');
    
    const currentTaskItem = activePlan.days[dayOfWeek]?.tasks[taskId];
    if (!currentTaskItem) throw new Error('Item not found');
    
    if (currentTaskItem.type !== 'task') {
      throw new Error('Sections cannot be marked as completed');
    }
    
    await updateTaskDetails(dayOfWeek, taskId, { item: { completed } as Partial<Task> });
  };
  
  const deleteTemplate = async (templateId: string) => {
    if (!currentUser) throw new Error('User not authenticated');
    
    setIsLoading(true);
    try {
      await firebaseDeleteTemplate(templateId);
      
      // Update local state
      setTemplates(prev => prev.filter(t => t.id !== templateId));
      
      // If the deleted template was active, clear it
      if (activeTemplate?.id === templateId) {
        setActiveTemplate(null);
        setActiveMode(null);
      }
    } catch (err) {
      console.error('Error deleting template:', err);
      setError('Failed to delete template');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };
  
  const deleteExecutionPlan = async (planId: string) => {
    if (!currentUser) throw new Error('User not authenticated');
    
    setIsLoading(true);
    try {
      await firebaseDeleteExecutionPlan(planId);
      
      // Update local state
      setExecutionPlans(prev => prev.filter(p => p.id !== planId));
      
      // If the deleted plan was active, clear it
      if (activeExecutionPlan?.id === planId) {
        setActiveExecutionPlan(null);
        setActiveMode(null);
      }
    } catch (err) {
      console.error('Error deleting execution plan:', err);
      setError('Failed to delete execution plan');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Create a template from an execution plan
  const createTemplateFromExecPlan = async (planId: string, name: string) => {
    if (!currentUser) throw new Error('User not authenticated');
    
    setIsLoading(true);
    try {
      const template = await createTemplateFromPlan(planId, name);
      setTemplates(prev => [...prev, template]);
      return template;
    } catch (err) {
      console.error('Error creating template from plan:', err);
      setError('Failed to create template from plan');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Clone an execution plan
  const cloneExistingPlan = async (planId: string, weekStartDate: string) => {
    if (!currentUser) throw new Error('User not authenticated');
    
    setIsLoading(true);
    try {
      const clonedPlan = await cloneExecutionPlan(planId, weekStartDate);
      setExecutionPlans(prev => [...prev, clonedPlan]);
      return clonedPlan;
    } catch (err) {
      console.error('Error cloning execution plan:', err);
      setError('Failed to clone execution plan');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const createNewCategory = async (categoryData: Omit<TaskCategory, 'id'>) => {
    if (!activePartnership) throw new Error('No active partnership');
    
    setIsLoading(true);
    try {
      const newCategory = await createCategory(categoryData, activePartnership.id);
      setCategories(prev => [...prev, newCategory].sort((a, b) => a.name.localeCompare(b.name)));
      return newCategory;
    } catch (err) {
      console.error('Error creating category:', err);
      setError('Failed to create category');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const value: TaskContextType = {
    templates,
    executionPlans,
    categories,
    activeTemplate,
    activeExecutionPlan,
    activeMode,
    isLoading,
    error,
    
    // Expose the TaskService
    taskService,
    
    loadTemplates,
    createNewTemplate,
    selectTemplate,
    updateCurrentTemplate,
    deleteTemplate,
    createTemplateFromPlan: createTemplateFromExecPlan,
    
    loadExecutionPlans,
    createNewExecutionPlan,
    selectExecutionPlan,
    updateCurrentExecutionPlan,
    deleteExecutionPlan,
    cloneExecutionPlan: cloneExistingPlan,
    
    // Unified Item Actions
    selectItem,
    getActiveItem,
    isTemplateMode,
    
    addTask,
    updateTaskDetails,
    removeTask,
    moveTaskBetweenDays,
    assignTask,
    toggleTaskCompletion,
    
    // Category Actions
    loadCategories,
    createNewCategory,
  };
  
  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
};