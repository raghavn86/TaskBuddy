import {
  WellnessTask,
  WellnessTaskInstance,
  DisplayWellnessTask,
  FeelingType,
  BodyStateType,
  RecurrenceType,
} from '../types/wellness';

// ========== Date Utilities ==========

export const formatDateISO = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getTodayISO = (): string => {
  return formatDateISO(new Date());
};

export const addDays = (dateStr: string, days: number): string => {
  const date = new Date(dateStr + 'T00:00:00');
  date.setDate(date.getDate() + days);
  return formatDateISO(date);
};

export const formatDateDisplay = (dateStr: string): string => {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export const isToday = (dateStr: string): boolean => {
  return dateStr === getTodayISO();
};

export const getWeekday = (dateStr: string): string => {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { weekday: 'long' });
};

// ========== Task Display Logic ==========

export const convertToDisplayTask = (
  task: WellnessTask,
  instance: WellnessTaskInstance | undefined,
  date: string
): DisplayWellnessTask => {
  if (instance) {
    return {
      id: instance.id,
      seriesId: task.id,
      title: instance.title ?? task.title,
      recurrence: task.recurrence,
      categoryId: instance.categoryId ?? task.categoryId,
      completed: instance.completed,
      order: instance.order ?? task.order ?? 0,
      isInstance: true,
      date,
    };
  }

  return {
    id: task.id,
    seriesId: task.id,
    title: task.title,
    recurrence: task.recurrence,
    categoryId: task.categoryId,
    completed: false,
    order: task.order ?? 0,
    isInstance: false,
    date,
  };
};

// Sort display tasks by order
export const sortDisplayTasks = (tasks: DisplayWellnessTask[]): DisplayWellnessTask[] => {
  return [...tasks].sort((a, b) => a.order - b.order);
};

// ========== Recurrence Utilities ==========

export const getRecurrenceLabel = (recurrence: RecurrenceType): string => {
  switch (recurrence) {
    case 'one_time':
      return 'One Time';
    case 'weekly':
      return 'Every Day';
    case 'weekdays':
      return 'Weekdays';
    case 'weekends':
      return 'Weekends';
    case 'monthly':
      return 'Monthly';
    default:
      return 'Unknown';
  }
};

export const getRecurrenceIcon = (recurrence: RecurrenceType): string => {
  switch (recurrence) {
    case 'one_time':
      return '📅';
    case 'weekly':
      return '🔄';
    case 'weekdays':
      return '💼';
    case 'weekends':
      return '🎉';
    case 'monthly':
      return '📆';
    default:
      return '❓';
  }
};

// ========== Feeling/State Utilities ==========

export const getFeelingEmoji = (feeling: FeelingType): string => {
  switch (feeling) {
    case 'very_happy':
      return '😄';
    case 'happy':
      return '🙂';
    case 'neutral':
      return '😐';
    case 'sad':
      return '🙁';
    case 'very_sad':
      return '😢';
    default:
      return '❓';
  }
};

export const getFeelingLabel = (feeling: FeelingType): string => {
  switch (feeling) {
    case 'very_happy':
      return 'Very Happy';
    case 'happy':
      return 'Happy';
    case 'neutral':
      return 'Neutral';
    case 'sad':
      return 'Sad';
    case 'very_sad':
      return 'Very Sad';
    default:
      return 'Unknown';
  }
};

export const getBodyStateEmoji = (state: BodyStateType): string => {
  switch (state) {
    case 'excellent':
      return '💪';
    case 'good':
      return '👍';
    case 'okay':
      return '👌';
    case 'tired':
      return '😴';
    case 'exhausted':
      return '🥱';
    default:
      return '❓';
  }
};

export const getBodyStateLabel = (state: BodyStateType): string => {
  switch (state) {
    case 'excellent':
      return 'Excellent';
    case 'good':
      return 'Good';
    case 'okay':
      return 'Okay';
    case 'tired':
      return 'Tired';
    case 'exhausted':
      return 'Exhausted';
    default:
      return 'Unknown';
  }
};

// Get numeric value for feeling (for graphing)
export const getFeelingValue = (feeling: FeelingType): number => {
  switch (feeling) {
    case 'very_happy':
      return 5;
    case 'happy':
      return 4;
    case 'neutral':
      return 3;
    case 'sad':
      return 2;
    case 'very_sad':
      return 1;
    default:
      return 0;
  }
};

// Get numeric value for body state (for graphing)
export const getBodyStateValue = (state: BodyStateType): number => {
  switch (state) {
    case 'excellent':
      return 5;
    case 'good':
      return 4;
    case 'okay':
      return 3;
    case 'tired':
      return 2;
    case 'exhausted':
      return 1;
    default:
      return 0;
  }
};

// ========== Time Utilities ==========

export const getHoursSince = (timestamp: number): number => {
  const now = Date.now();
  const diff = now - timestamp;
  return Math.floor(diff / (1000 * 60 * 60));
};

export const formatHoursSince = (hours: number): string => {
  if (hours < 1) return 'Less than an hour ago';
  if (hours === 1) return '1 hour ago';
  if (hours < 24) return `${hours} hours ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
};

// ========== PST/PDT Timezone Utilities ==========

export const getPSTTime = (): Date => {
  // Get current time in PST/PDT
  const now = new Date();
  const pstString = now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' });
  return new Date(pstString);
};

export const getPSTDateString = (): string => {
  const pstDate = getPSTTime();
  return formatDateISO(pstDate);
};

export const isPast9PMPST = (): boolean => {
  const pstDate = getPSTTime();
  const hour = pstDate.getHours();
  return hour >= 21; // 9 PM is hour 21
};

export const getTimeTo9PMPST = (): number => {
  const pstDate = getPSTTime();
  const hour = pstDate.getHours();
  const minutes = pstDate.getMinutes();

  if (hour >= 21) {
    // Already past 9 PM
    return 0;
  }

  // Calculate hours and minutes until 9 PM
  const hoursUntil = 21 - hour - 1;
  const minutesUntil = 60 - minutes;

  return hoursUntil * 60 + minutesUntil;
};

// ========== Color Utilities ==========

const predefinedColors = [
  '#1976d2', // Blue
  '#9c27b0', // Purple
  '#f50057', // Pink
  '#ff5722', // Deep Orange
  '#4caf50', // Green
  '#ff9800', // Orange
  '#00bcd4', // Cyan
  '#ffeb3b', // Yellow
  '#795548', // Brown
  '#607d8b', // Blue Grey
];

export const getRandomColor = (): string => {
  return predefinedColors[Math.floor(Math.random() * predefinedColors.length)];
};

export const getCategoryColor = (categoryId: string | undefined, categories: any[]): string => {
  if (!categoryId) return '#9e9e9e'; // Grey for no category

  const category = categories.find(c => c.id === categoryId);
  return category?.color || '#9e9e9e';
};
