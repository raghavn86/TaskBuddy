// Wellness and Habit Tracking Types

export type RecurrenceType =
  | 'one_time'
  | 'weekly'      // Every day
  | 'weekdays'    // Monday-Friday
  | 'weekends'    // Saturday-Sunday
  | 'monthly';    // Same date each month

export type FeelingType =
  | 'very_happy'
  | 'happy'
  | 'neutral'
  | 'sad'
  | 'very_sad';

export type BodyStateType =
  | 'excellent'
  | 'good'
  | 'okay'
  | 'tired'
  | 'exhausted';

// Base wellness task (series definition)
export interface WellnessTask {
  id: string;
  title: string;
  recurrence: RecurrenceType;
  startDate: string; // ISO date string (YYYY-MM-DD)
  categoryId?: string;
  userId: string; // Creator/owner of the task
  partnershipId: string;
  order?: number; // Default order for the series
  createdAt: number;
  updatedAt: number;
}

// Task instance - created when a task is modified or marked done/undone
export interface WellnessTaskInstance {
  id: string;
  seriesId: string; // Reference to parent WellnessTask
  date: string; // ISO date string (YYYY-MM-DD)
  title?: string; // Override series title if edited
  categoryId?: string; // Override series category if edited
  completed: boolean;
  order?: number; // Override series order if changed
  userId: string; // Owner (same as series)
  partnershipId: string;
  createdAt: number;
  updatedAt: number;
}

// Feeling and body state tracking
export interface FeelingEntry {
  id: string;
  userId: string;
  partnershipId: string;
  feeling: FeelingType;
  bodyState: BodyStateType;
  timestamp: number;
  date: string; // ISO date string (YYYY-MM-DD) for the entry
  notes?: string; // Optional notes
}

// For display purposes - combines series and instance data
export interface DisplayWellnessTask {
  id: string; // Instance ID if exists, otherwise series ID
  seriesId: string; // Always the series ID
  title: string;
  recurrence: RecurrenceType;
  categoryId?: string;
  completed: boolean;
  order: number;
  isInstance: boolean; // True if this is a modified instance
  date: string; // The date being displayed
}

// Reminder state (stored in localStorage)
export interface ReminderState {
  lastReportDate: string; // ISO date string
  lastReportTime: number; // Timestamp
  reminderShown: boolean; // Whether reminder was shown for this day
}

// Category with wellness-specific fields (extends TaskCategory)
export interface WellnessCategory {
  id: string;
  name: string;
  color: string;
  partnershipId: string;
  userId: string; // Creator
  createdAt: number;
}
