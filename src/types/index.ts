export type User = {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
};

export * from './partnership';
export * from './wellness';

export type TaskCategory = {
  id: string;
  name: string;
  color: string;
};

// Base interface for items that can be in a day plan
export interface Item {
  id: string;
  title: string;
  order?: number;
  createdAt: number;
  updatedAt: number;
}

export type Section = Item & {
  color?: string;
  collapsed?: boolean;
};

export type Task = Item & {
  minutes: number;
  assignedTo: string | null; // userId or null for unassigned
  completed: boolean;
  categoryId?: string; // Reference to TaskCategory, empty string for no category
  notes?: string; // Optional notes for additional task context
};

// TaskItem for storage - discriminated union
export type TaskItem = {
  type: 'task' | 'section';
  item: Item;
};

export type PartialTaskItem = {
  type?: 'task' | 'section';
  item?: Partial<Item>;
};

export type NewTaskItem = {
  type: 'task' | 'section';
  item: Omit<Item, 'id' | 'createdAt' | 'updatedAt'>;
};

// Conversion utilities
export const taskToTaskItem = (task: Task): TaskItem => ({
  type: 'task',
  item: task
});

export const taskItemToTask = (taskItem: TaskItem): Task => {
  if (taskItem.type !== 'task') {
    throw new Error('Cannot convert non-task item to Task');
  }
  return taskItem.item as Task;
};

// Centralized conversion method for arrays
export const taskItemsToTasks = (taskItems: TaskItem[]): Task[] => {
  return taskItems
    .filter(item => item.type === 'task')
    .map(item => taskItemToTask(item));
};

export type DayPlan = {
  id: string;
  dayOfWeek: number; // 0-6, Sunday-Saturday
  tasks: Record<string, TaskItem>; // taskId -> Task (API format)
};

// Internal storage format for DayPlan
export type DayPlanStorage = {
  id: string;
  dayOfWeek: number;
  tasks: Record<string, TaskItem>; // taskId -> TaskItem (storage format)
};

export type WeekPlan = {
  id: string;
  name: string;
  isTemplate: boolean;
  days: Record<number, DayPlan>; // dayOfWeek -> DayPlan
  createdAt: number;
  updatedAt: number;
  createdBy: string; // userId
  collaborators: string[]; // userIds
  partnershipId: string; // ID of the partnership this plan belongs to
};

export type ExecutionPlan = WeekPlan & {
  templateId: string; // Reference to the original template
  weekStartDate: string; // ISO string
};

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  action: ActivityAction;
  taskId: string;
  taskTitle: string;
  taskDay: string; // Day when the task activity occurred
  categoryId?: string;
  categoryName?: string;
  categoryColor?: string;
  executionPlanId: string;
  timestamp: number;
  details: ActivityDetails;
}

export type ActivityAction = 
  | 'task_added'
  | 'task_deleted'
  | 'task_moved'
  | 'task_completed'
  | 'task_uncompleted'
  | 'task_assigned'
  | 'task_updated';

export interface ActivityDetails {
  fromDay?: string;
  toDay?: string;
  from?: string;
  to?: string;
}
