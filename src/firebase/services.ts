import { firestoreService } from './firestore';
import { User, WeekPlan, ExecutionPlan, TaskCategory, TaskItem, NewTaskItem, DayPlan } from '../types';
import { v4 as uuidv4 } from 'uuid';

// Utility function to check if TaskItem can be assigned
const isAssignableItem = (taskItem: TaskItem): boolean => taskItem.type === 'task';
const usersCollection = firestoreService.collection('users');
const templatesCollection = firestoreService.collection('templates');
const executionPlansCollection = firestoreService.collection('executionPlans');
const categoriesCollection = firestoreService.collection('categories');


// Helper: Choose correct collection
const getPlanCollection = (isTemplate: boolean) =>
  isTemplate ? templatesCollection : executionPlansCollection;

// Helper: Fetch plan and its days - now only used for read-only operations
// For write operations, use transactions directly inside each function instead
const fetchPlan = async (planId: string, isTemplate: boolean) => {
  const collection = getPlanCollection(isTemplate);
  const ref = firestoreService.doc(collection, planId);
  const snap = await firestoreService.getDoc(ref);

  if (!snap.exists()) throw new Error(`Plan not found`);

  const plan = snap.data() as WeekPlan | ExecutionPlan;
  return { ref, plan, days: { ...(plan.days || {}) } };
};
// User Services
export const createUser = async (user: User) => {
  await firestoreService.setDoc(firestoreService.doc(usersCollection, user.uid), user);
  return user;
};

export const getUser = async (userId: string) => {
  const userDoc = await firestoreService.getDoc(firestoreService.doc(usersCollection, userId));
  return userDoc.exists() ? userDoc.data() as User : null;
};

// Template Services
export const createTemplate = async (template: Omit<WeekPlan, 'id'>) => {
  const templateId = uuidv4();
  const newTemplate: WeekPlan = {
    ...template,
    id: templateId,
    isTemplate: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  
  await firestoreService.setDoc(firestoreService.doc(templatesCollection, templateId), newTemplate);
  return newTemplate;
};

export const updateTemplate = async (templateId: string, updates: Partial<WeekPlan>) => {
  const templateRef = firestoreService.doc(templatesCollection, templateId);
  await firestoreService.updateDoc(templateRef, { ...updates, updatedAt: Date.now() });
};

export const deleteTemplate = async (templateId: string) => {
  await firestoreService.deleteDoc(firestoreService.doc(templatesCollection, templateId));
};

export const getTemplate = async (templateId: string) => {
  const templateDoc = await firestoreService.getDoc(firestoreService.doc(templatesCollection, templateId));
  if (!templateDoc.exists()) return null;
  
  const template = templateDoc.data() as WeekPlan;
  return sortTasksByOrder(template);
};

export const getPartnershipTemplates = async (partnershipId: string) => {
  const q = firestoreService.query(templatesCollection, firestoreService.where('partnershipId', '==', partnershipId));
  const querySnapshot = await firestoreService.getDocs(q);
  
  const templates: WeekPlan[] = [];
  querySnapshot.forEach((doc: any) => {
    const template = doc.data() as WeekPlan;
    templates.push(sortTasksByOrder(template));
  });
  
  return templates;
};

// These functions are kept for backward compatibility but should be phased out
export const getUserTemplates = async (userId: string) => {
  console.warn('getUserTemplates is deprecated. Use getPartnershipTemplates instead.');
  const q = firestoreService.query(templatesCollection, firestoreService.where('createdBy', '==', userId));
  const querySnapshot = await firestoreService.getDocs(q);
  
  const templates: WeekPlan[] = [];
  querySnapshot.forEach((doc: any) => {
    const template = doc.data() as WeekPlan;
    templates.push(sortTasksByOrder(template));
  });
  
  return templates;
};

export const getCollaborativeTemplates = async (userId: string) => {
  console.warn('getCollaborativeTemplates is deprecated. Use getPartnershipTemplates instead.');
  const q = firestoreService.query(templatesCollection, firestoreService.where('partnershipId', '!=', null));
  const querySnapshot = await firestoreService.getDocs(q);
  
  const templates: WeekPlan[] = [];
  querySnapshot.forEach((doc: any) => {
    const template = doc.data() as WeekPlan;
    templates.push(sortTasksByOrder(template));
  });
  
  return templates;
};

// Execution Plan Services
export const createExecutionPlan = async (templateId: string, weekStartDate: string, userId: string) => {
  // Get the template
  const template = await getTemplate(templateId);
  if (!template) throw new Error('Template not found');
  
  // Create a new execution plan based on the template
  const executionPlanId = uuidv4();
  const executionPlan: ExecutionPlan = {
    ...template,
    id: executionPlanId,
    isTemplate: false,
    templateId,
    weekStartDate,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    createdBy: userId,
    // Inherit collaborators from the template, if any
    collaborators: template.collaborators || [userId],
  };
  
  await firestoreService.setDoc(firestoreService.doc(executionPlansCollection, executionPlanId), executionPlan);
  return executionPlan;
};

// Create a template from an execution plan
export const createTemplateFromPlan = async (executionPlanId: string, name: string) => {
  // Get the execution plan
  const plan = await getExecutionPlan(executionPlanId);
  if (!plan) throw new Error('Execution plan not found');
  
  // Create a new template based on the execution plan
  const templateId = uuidv4();
  
  // Use type casting to handle templateId and weekStartDate properly
  const planData = { ...plan } as any;
  delete planData.templateId;
  delete planData.weekStartDate;
  
  const template: WeekPlan = {
    ...planData,
    id: templateId,
    name,
    isTemplate: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  
  await firestoreService.setDoc(firestoreService.doc(templatesCollection, templateId), template);
  return template;
};

// Clone an execution plan
export const cloneExecutionPlan = async (executionPlanId: string, weekStartDate: string) => {
  // Get the original execution plan
  const sourcePlan = await getExecutionPlan(executionPlanId);
  if (!sourcePlan) throw new Error('Execution plan not found');
  
  // Create a new execution plan with the same data but new ID
  const newPlanId = uuidv4();
  const clonedPlan: ExecutionPlan = {
    ...sourcePlan,
    id: newPlanId,
    name: `${sourcePlan.name} (Copy)`,
    weekStartDate,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  
  await firestoreService.setDoc(firestoreService.doc(executionPlansCollection, newPlanId), clonedPlan);
  return clonedPlan;
};

export const updateExecutionPlan = async (planId: string, updates: Partial<ExecutionPlan>) => {
  const planRef = firestoreService.doc(executionPlansCollection, planId);
  await firestoreService.updateDoc(planRef, { ...updates, updatedAt: Date.now() });
};

export const deleteExecutionPlan = async (planId: string) => {
  await firestoreService.deleteDoc(firestoreService.doc(executionPlansCollection, planId));
};

export const getExecutionPlan = async (planId: string) => {
  const planDoc = await firestoreService.getDoc(firestoreService.doc(executionPlansCollection, planId));
  if (!planDoc.exists()) return null;
  
  const plan = planDoc.data() as ExecutionPlan;
  return sortTasksByOrder(plan);
};

export const getPartnershipExecutionPlans = async (partnershipId: string) => {
  const q = firestoreService.query(
    executionPlansCollection,
    firestoreService.where('partnershipId', '==', partnershipId),
    firestoreService.where('isTemplate', '==', false)
  );
  
  const querySnapshot = await firestoreService.getDocs(q);
  
  const plans: ExecutionPlan[] = [];
  querySnapshot.forEach((doc: any) => {
    const plan = doc.data() as ExecutionPlan;
    plans.push(sortTasksByOrder(plan));
  });
  
  return plans;
};

// Kept for backward compatibility but should be phased out
export const getUserExecutionPlans = async (userId: string) => {
  console.warn('getUserExecutionPlans is deprecated. Use getPartnershipExecutionPlans instead.');
  const q = firestoreService.query(
    executionPlansCollection,
    firestoreService.where('createdBy', '==', userId),
    firestoreService.where('isTemplate', '==', false)
  );
  
  const querySnapshot = await firestoreService.getDocs(q);
  
  const plans: ExecutionPlan[] = [];
  querySnapshot.forEach((doc: any) => {
    const plan = doc.data() as ExecutionPlan;
    plans.push(sortTasksByOrder(plan));
  });
  
  return plans;
};

// Helper function to sort tasks by order in plans
export const sortTasksByOrder = <T extends WeekPlan>(plan: T): T => {
  if (plan.days) {
    Object.keys(plan.days).forEach(dayKey => {
      const day = plan.days[parseInt(dayKey)];
      if (day && day.tasks) {
        const taskArray: TaskItem[] = Object.values(day.tasks as Record<string, TaskItem>);
        
        // Sort by order if present, or keep original order
        taskArray.sort((a, b) => {
          // If both have order property, sort by it
          if (a.item.order !== undefined && b.item.order !== undefined) {
            return a.item.order - b.item.order;
          }
          // If only one has order, put the one with order first
          if (a.item.order !== undefined) return -1;
          if (b.item.order !== undefined) return 1;
          // If neither has order, maintain original order (stable sort)
          return 0;
        });
        
        // Update any missing order values to match their position
        const orderedTasks: Record<string, TaskItem> = {};
        taskArray.forEach((task: TaskItem, index: number) => {
          const updatedTask: TaskItem = task.item.order === undefined ? {
            ...task,
            item: {
              ...task.item,
              order: index,
            }
          } : task;
          orderedTasks[task.item.id] = updatedTask;
        });
        
        // Replace the original tasks object with the ordered TaskItems
        day.tasks = orderedTasks;
      }
    });
  }
  
  return plan;
};

// Retry utility for transactions
const runWithRetry = async (fn: () => Promise<any>, maxRetries = 5, delay = 1000) => {
  let lastError;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      console.warn(`Transaction attempt ${attempt + 1} failed:`, error);
      lastError = error;
      // Only delay if we're not on the last attempt
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
};

// Add Task to Day
export const addTaskToDay = async (
  planId: string,
  dayOfWeek: number,
  task: NewTaskItem,
  isTemplate: boolean,
  insertIndex?: number
) => {
  const collection = getPlanCollection(isTemplate);
  const ref = firestoreService.doc(collection, planId);
  const taskId = uuidv4();
  let newTask: TaskItem;
  let updatedDays: Record<number, DayPlan> = {};

  await runWithRetry(() => firestoreService.runTransaction(async (transaction: any) => {
    // Get latest plan data within transaction
    const planDoc = await transaction.get(ref);
    if (!planDoc.exists()) {
      throw new Error(`Plan not found`);
    }

    // Extract data
    const plan = planDoc.data() as WeekPlan | ExecutionPlan;
    const days = { ...(plan.days || {}) };

    // Prepare day structure
    const day: DayPlan = {
      ...(days[dayOfWeek] || {
        id: `${planId}-${dayOfWeek}`,
        dayOfWeek,
        tasks: {},
      }),
    };

    // Get existing tasks as array, sorted by order
    const existingTasks = Object.values(day.tasks).sort((a, b) => (a.item.order ?? 0) - (b.item.order ?? 0));
    
    // Determine insertion position
    const targetIndex = insertIndex ?? existingTasks.length;
    
    // Create the new task
    newTask = {
      ...task,
      item: {
        ...task.item,
        id: taskId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        order: targetIndex,
      }
    };
    
    // Insert new task and reorder all tasks
    existingTasks.splice(targetIndex, 0, newTask);
    
    // Update order for all tasks and rebuild tasks object
    const reorderedTasks: Record<string, TaskItem> = {};
    existingTasks.forEach((taskItem, index) => {
      const updatedTask = {
        ...taskItem,
        item: {
          ...taskItem.item,
          order: index,
        }
      };
      reorderedTasks[taskItem.item.id] = updatedTask;
    });

    day.tasks = reorderedTasks;
    days[dayOfWeek] = day;
    updatedDays = days;

    // Update within transaction
    transaction.update(ref, { days, updatedAt: Date.now() });
  }));

  // Return both the new task and updated days
  return { newTask: newTask!, updatedDays };
};

// Update Task
export const updateTask = async (
  planId: string,
  dayOfWeek: number,
  taskId: string,
  updates: Partial<TaskItem>,
  isTemplate: boolean
) => {
  const collection = getPlanCollection(isTemplate);
  const ref = firestoreService.doc(collection, planId);

  await runWithRetry(() => firestoreService.runTransaction(async (transaction: any) => {
    // Get latest plan data within transaction
    const planDoc = await transaction.get(ref);
    if (!planDoc.exists()) {
      throw new Error(`Plan not found`);
    }

    // Extract data
    const plan = planDoc.data() as WeekPlan | ExecutionPlan;
    const days = { ...(plan.days || {}) };
    const day = days[dayOfWeek];

    if (!day || !day.tasks[taskId]) {
      throw new Error(`Task not found`);
    }

    // Apply updates to the TaskItem
    const currentTask: TaskItem = day.tasks[taskId];
    const updatedTask: TaskItem = {
      ...currentTask,
      ...updates,
      item: {
        ...currentTask.item,
        ...(updates.item || {}),
        updatedAt: Date.now(),
      }
    };

    day.tasks[taskId] = updatedTask;
    days[dayOfWeek] = { ...day };

    // Update within transaction
    transaction.update(ref, { days, updatedAt: Date.now() });
  }));
};

// Delete Task
export const deleteTask = async (
  planId: string,
  dayOfWeek: number,
  taskId: string,
  isTemplate: boolean
) => {
  const collection = getPlanCollection(isTemplate);
  const ref = firestoreService.doc(collection, planId);

  await runWithRetry(() => firestoreService.runTransaction(async (transaction: any) => {
    // Get latest plan data within transaction
    const planDoc = await transaction.get(ref);
    if (!planDoc.exists()) {
      throw new Error(`Plan not found`);
    }

    // Extract data
    const plan = planDoc.data() as WeekPlan | ExecutionPlan;
    const days = { ...(plan.days || {}) };
    const day = days[dayOfWeek];

    if (!day || !day.tasks[taskId]) {
      throw new Error(`Task not found`);
    }

    // Delete task
    delete day.tasks[taskId];

    // Remove day if empty, otherwise update it
    if (Object.keys(day.tasks).length === 0) {
      delete days[dayOfWeek];
    } else {
      days[dayOfWeek] = { ...day };
    }

    // Update within transaction
    transaction.update(ref, { days, updatedAt: Date.now() });
  }));
};

// Move Task (within or across days)
export const moveTask = async (
  planId: string,
  sourceDayOfWeek: number,
  targetDayOfWeek: number,
  taskId: string,
  isTemplate: boolean,
  assignToUser?: string | null,
  sourceIndex?: number,
  targetIndex?: number
) => {
  const collection = getPlanCollection(isTemplate);
  const ref = firestoreService.doc(collection, planId);

  await runWithRetry(() => firestoreService.runTransaction(async (transaction: any) => {
    // Get latest plan data within transaction
    const planDoc = await transaction.get(ref);
    if (!planDoc.exists()) {
      throw new Error(`Plan not found`);
    }

    // Extract data
    const plan = planDoc.data() as WeekPlan | ExecutionPlan;
    const days = { ...(plan.days || {}) };
    const sourceDay = days[sourceDayOfWeek];

    if (!sourceDay || !sourceDay.tasks[taskId]) {
      throw new Error(`Task not found`);
    }

    // Work with TaskItems directly
    const sourceTasks: Record<string, TaskItem> = sourceDay.tasks as Record<string, TaskItem>;
    let task: TaskItem = { ...sourceTasks[taskId] };

    if (assignToUser !== undefined && isAssignableItem(task)) {
      task.item = {
        ...task.item,
        assignedTo: assignToUser,
        updatedAt: Date.now(),
      } as any;
    }

    // Reordering within the same day
    if (
      sourceDayOfWeek === targetDayOfWeek &&
      sourceIndex !== undefined &&
      targetIndex !== undefined
    ) {
      const taskList: TaskItem[] = Object.values(sourceTasks).sort((a, b) => (a.item.order ?? 0) - (b.item.order ?? 0));

      taskList.splice(sourceIndex, 1);
      taskList.splice(targetIndex, 0, task);

      const reordered: Record<string, TaskItem> = {};
      taskList.forEach((t: TaskItem, idx: number) => {
        const updatedTask: TaskItem = {
          ...t,
          item: {
            ...t.item,
            order: idx,
            updatedAt: t.item.id === taskId ? Date.now() : t.item.updatedAt,
          }
        };
        reordered[t.item.id] = updatedTask;
      });

      days[sourceDayOfWeek] = { ...sourceDay, tasks: reordered };
    } else {
      // Move between days
      delete sourceDay.tasks[taskId];

      const targetDay = {
        ...(days[targetDayOfWeek] || {
          id: `${planId}-${targetDayOfWeek}`,
          dayOfWeek: targetDayOfWeek,
          tasks: {},
        }),
      };

      const targetTasks: Record<string, TaskItem> = targetDay.tasks as Record<string, TaskItem>;

      if (targetIndex !== undefined) {
        const taskList: TaskItem[] = Object.values(targetTasks).sort((a, b) => (a.item.order ?? 0) - (b.item.order ?? 0));
        taskList.splice(targetIndex, 0, task);

        const reordered: Record<string, TaskItem> = {};
        taskList.forEach((t: TaskItem, idx: number) => {
          const updatedTask: TaskItem = {
            ...t,
            item: {
              ...t.item,
              order: idx,
              updatedAt: t.item.id === taskId ? Date.now() : t.item.updatedAt,
            }
          };
          reordered[t.item.id] = updatedTask;
        });

        targetDay.tasks = reordered;
      } else {
        task.item = {
          ...task.item,
          order: Object.keys(targetDay.tasks).length,
        };
        targetDay.tasks[taskId] = task;
      }

      days[sourceDayOfWeek] = { ...sourceDay };
      days[targetDayOfWeek] = targetDay;
    }

    // Update within transaction
    transaction.update(ref, { days, updatedAt: Date.now() });
  }));
};

// Action History Services
// Category Services
export const createCategory = async (category: Omit<TaskCategory, 'id'>, partnershipId: string) => {
  const categoryId = uuidv4();
  const newCategory: TaskCategory & { partnershipId: string } = {
    ...category,
    id: categoryId,
    partnershipId,
  };
  
  await firestoreService.setDoc(firestoreService.doc(categoriesCollection, categoryId), newCategory);
  return { id: categoryId, name: category.name, color: category.color };
};

export const getPartnershipCategories = async (partnershipId: string) => {
  const q = firestoreService.query(categoriesCollection, firestoreService.where('partnershipId', '==', partnershipId));
  const querySnapshot = await firestoreService.getDocs(q);
  
  const categories: TaskCategory[] = [];
  querySnapshot.forEach((doc: any) => {
    const data = doc.data();
    categories.push({
      id: data.id,
      name: data.name,
      color: data.color,
    });
  });
  
  return categories.sort((a, b) => a.name.localeCompare(b.name));
};