import { firestoreService } from './firestore';
import {
  WellnessTask,
  WellnessTaskInstance,
  FeelingEntry,
  WellnessCategory,
  RecurrenceType,
  FeelingType,
  BodyStateType
} from '../types/wellness';
import { v4 as uuidv4 } from 'uuid';

// Collections
const wellnessTasksCollection = firestoreService.collection('wellnessTasks');
const wellnessInstancesCollection = firestoreService.collection('wellnessInstances');
const feelingEntriesCollection = firestoreService.collection('feelingEntries');
const wellnessCategoriesCollection = firestoreService.collection('wellnessCategories');

// ========== Wellness Task Services ==========

export const createWellnessTask = async (
  task: Omit<WellnessTask, 'id' | 'createdAt' | 'updatedAt'>
): Promise<WellnessTask> => {
  const taskId = uuidv4();
  const newTask: WellnessTask = {
    ...task,
    id: taskId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await firestoreService.setDoc(
    firestoreService.doc(wellnessTasksCollection, taskId),
    newTask
  );
  return newTask;
};

export const updateWellnessTask = async (
  taskId: string,
  updates: Partial<WellnessTask>
): Promise<void> => {
  const taskRef = firestoreService.doc(wellnessTasksCollection, taskId);
  await firestoreService.updateDoc(taskRef, {
    ...updates,
    updatedAt: Date.now(),
  });
};

export const deleteWellnessTask = async (taskId: string): Promise<void> => {
  // Delete the task
  await firestoreService.deleteDoc(
    firestoreService.doc(wellnessTasksCollection, taskId)
  );

  // Delete all instances of this task
  const instancesQuery = firestoreService.query(
    wellnessInstancesCollection,
    firestoreService.where('seriesId', '==', taskId)
  );
  const instances = await firestoreService.getDocs(instancesQuery);

  const deletePromises = instances.docs.map((doc: any) =>
    firestoreService.deleteDoc(doc.ref)
  );
  await Promise.all(deletePromises);
};

export const getWellnessTask = async (taskId: string): Promise<WellnessTask | null> => {
  const taskDoc = await firestoreService.getDoc(
    firestoreService.doc(wellnessTasksCollection, taskId)
  );
  return taskDoc.exists() ? (taskDoc.data() as WellnessTask) : null;
};

export const getUserWellnessTasks = async (
  userId: string,
  partnershipId: string
): Promise<WellnessTask[]> => {
  const q = firestoreService.query(
    wellnessTasksCollection,
    firestoreService.where('userId', '==', userId),
    firestoreService.where('partnershipId', '==', partnershipId)
  );
  const querySnapshot = await firestoreService.getDocs(q);

  const tasks: WellnessTask[] = [];
  querySnapshot.forEach((doc: any) => {
    tasks.push(doc.data() as WellnessTask);
  });

  return tasks;
};

// ========== Wellness Task Instance Services ==========

export const createWellnessInstance = async (
  instance: Omit<WellnessTaskInstance, 'id' | 'createdAt' | 'updatedAt'>
): Promise<WellnessTaskInstance> => {
  const instanceId = uuidv4();
  const newInstance: WellnessTaskInstance = {
    ...instance,
    id: instanceId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await firestoreService.setDoc(
    firestoreService.doc(wellnessInstancesCollection, instanceId),
    newInstance
  );
  return newInstance;
};

export const updateWellnessInstance = async (
  instanceId: string,
  updates: Partial<WellnessTaskInstance>
): Promise<void> => {
  const instanceRef = firestoreService.doc(wellnessInstancesCollection, instanceId);
  await firestoreService.updateDoc(instanceRef, {
    ...updates,
    updatedAt: Date.now(),
  });
};

export const deleteWellnessInstance = async (instanceId: string): Promise<void> => {
  await firestoreService.deleteDoc(
    firestoreService.doc(wellnessInstancesCollection, instanceId)
  );
};

export const getWellnessInstance = async (
  seriesId: string,
  date: string
): Promise<WellnessTaskInstance | null> => {
  const q = firestoreService.query(
    wellnessInstancesCollection,
    firestoreService.where('seriesId', '==', seriesId),
    firestoreService.where('date', '==', date)
  );
  const querySnapshot = await firestoreService.getDocs(q);

  if (querySnapshot.empty) return null;

  return querySnapshot.docs[0].data() as WellnessTaskInstance;
};

export const getInstancesForDate = async (
  userId: string,
  partnershipId: string,
  date: string
): Promise<WellnessTaskInstance[]> => {
  const q = firestoreService.query(
    wellnessInstancesCollection,
    firestoreService.where('userId', '==', userId),
    firestoreService.where('partnershipId', '==', partnershipId),
    firestoreService.where('date', '==', date)
  );
  const querySnapshot = await firestoreService.getDocs(q);

  const instances: WellnessTaskInstance[] = [];
  querySnapshot.forEach((doc: any) => {
    instances.push(doc.data() as WellnessTaskInstance);
  });

  return instances;
};

// Bulk update order for instances
export const updateInstancesOrder = async (
  instances: { id: string; order: number }[]
): Promise<void> => {
  const updatePromises = instances.map(({ id, order }) =>
    firestoreService.updateDoc(
      firestoreService.doc(wellnessInstancesCollection, id),
      { order, updatedAt: Date.now() }
    )
  );
  await Promise.all(updatePromises);
};

// ========== Feeling Entry Services ==========

export const createFeelingEntry = async (
  entry: Omit<FeelingEntry, 'id' | 'timestamp'>
): Promise<FeelingEntry> => {
  const entryId = uuidv4();
  const newEntry: FeelingEntry = {
    ...entry,
    id: entryId,
    timestamp: Date.now(),
  };

  await firestoreService.setDoc(
    firestoreService.doc(feelingEntriesCollection, entryId),
    newEntry
  );
  return newEntry;
};

export const getFeelingEntries = async (
  userId: string,
  partnershipId: string,
  startDate?: string,
  endDate?: string
): Promise<FeelingEntry[]> => {
  let q = firestoreService.query(
    feelingEntriesCollection,
    firestoreService.where('userId', '==', userId),
    firestoreService.where('partnershipId', '==', partnershipId)
  );

  const querySnapshot = await firestoreService.getDocs(q);

  let entries: FeelingEntry[] = [];
  querySnapshot.forEach((doc: any) => {
    entries.push(doc.data() as FeelingEntry);
  });

  // Filter by date range if provided
  if (startDate || endDate) {
    entries = entries.filter(entry => {
      if (startDate && entry.date < startDate) return false;
      if (endDate && entry.date > endDate) return false;
      return true;
    });
  }

  // Sort by timestamp descending (newest first)
  entries.sort((a, b) => b.timestamp - a.timestamp);

  return entries;
};

export const getLatestFeelingEntry = async (
  userId: string,
  partnershipId: string
): Promise<FeelingEntry | null> => {
  const entries = await getFeelingEntries(userId, partnershipId);
  return entries.length > 0 ? entries[0] : null;
};

// ========== Category Services ==========

export const createWellnessCategory = async (
  category: Omit<WellnessCategory, 'id' | 'createdAt'>
): Promise<WellnessCategory> => {
  const categoryId = uuidv4();
  const newCategory: WellnessCategory = {
    ...category,
    id: categoryId,
    createdAt: Date.now(),
  };

  await firestoreService.setDoc(
    firestoreService.doc(wellnessCategoriesCollection, categoryId),
    newCategory
  );
  return newCategory;
};

export const updateWellnessCategory = async (
  categoryId: string,
  updates: Partial<WellnessCategory>
): Promise<void> => {
  const categoryRef = firestoreService.doc(wellnessCategoriesCollection, categoryId);
  await firestoreService.updateDoc(categoryRef, updates);
};

export const deleteWellnessCategory = async (categoryId: string): Promise<void> => {
  // Delete the category
  await firestoreService.deleteDoc(
    firestoreService.doc(wellnessCategoriesCollection, categoryId)
  );

  // Note: Tasks with this category will be handled by the context layer
  // (setting categoryId to undefined)
};

export const getWellnessCategories = async (
  partnershipId: string
): Promise<WellnessCategory[]> => {
  const q = firestoreService.query(
    wellnessCategoriesCollection,
    firestoreService.where('partnershipId', '==', partnershipId)
  );
  const querySnapshot = await firestoreService.getDocs(q);

  const categories: WellnessCategory[] = [];
  querySnapshot.forEach((doc: any) => {
    categories.push(doc.data() as WellnessCategory);
  });

  return categories;
};

// ========== Helper Functions ==========

// Check if a task should be displayed on a given date
export const shouldDisplayTaskOnDate = (
  task: WellnessTask,
  date: string
): boolean => {
  // Check if date is after start date
  if (date < task.startDate) return false;

  const dateObj = new Date(date + 'T00:00:00');
  const dayOfWeek = dateObj.getDay(); // 0 = Sunday, 6 = Saturday

  switch (task.recurrence) {
    case 'one_time':
      return date === task.startDate;

    case 'weekly':
      return true; // Every day

    case 'weekdays':
      return dayOfWeek >= 1 && dayOfWeek <= 5; // Monday-Friday

    case 'weekends':
      return dayOfWeek === 0 || dayOfWeek === 6; // Saturday-Sunday

    case 'monthly':
      // Same date each month
      const startDateObj = new Date(task.startDate + 'T00:00:00');
      return dateObj.getDate() === startDateObj.getDate();

    default:
      return false;
  }
};

// Get all tasks that should be displayed on a specific date
export const getTasksForDate = async (
  userId: string,
  partnershipId: string,
  date: string
): Promise<{ task: WellnessTask; instance?: WellnessTaskInstance }[]> => {
  // Get all user's tasks
  const allTasks = await getUserWellnessTasks(userId, partnershipId);

  // Get all instances for this date
  const instances = await getInstancesForDate(userId, partnershipId, date);

  // Create a map of seriesId -> instance
  const instanceMap = new Map<string, WellnessTaskInstance>();
  instances.forEach(instance => {
    instanceMap.set(instance.seriesId, instance);
  });

  // Filter tasks that should be displayed on this date
  const tasksForDate = allTasks
    .filter(task => shouldDisplayTaskOnDate(task, date))
    .map(task => ({
      task,
      instance: instanceMap.get(task.id),
    }));

  return tasksForDate;
};
