import { Task, WeekPlan, ExecutionPlan, DayPlan, TaskItem } from '../types';

/**
 * TaskService provides a centralized interface for task-related operations
 * and metrics calculations, removing the need to pass userId/partnerId
 * throughout the component tree.
 */
class TaskService {
  userId: string;
  partnerId: string;
  getPartnerColor: (userId: string | null) => string;
  getPartnerNickname: (userId: string | null) => string;
  getUserColor: (userId: string | null) => string;
  get partnerName(): string {
    return this.getPartnerNickname(this.partnerId);
  }

  constructor(userId: string, partnerId: string) {
    this.userId = userId;
    this.partnerId = partnerId;
    // These will be set by the parent component using dependency injection
    this.getPartnerColor = () => '#9c27b0'; // Default purple
    this.getPartnerNickname = () => 'Partner'; // Default name
    this.getUserColor = () => '#1976d2'; // Default blue
  }

  private filterTasksByOwner(tasks: Task[], owner: 'user' | 'partner' | 'unassigned'): Task[] {
    if (!tasks) return [];
    
    switch (owner) {
      case 'user':
        return tasks.filter(task => task.assignedTo === this.userId);
      case 'partner':
        return tasks.filter(task => task.assignedTo === this.partnerId);
      case 'unassigned':
        return tasks.filter(task => task.assignedTo === null);
      default:
        return tasks;
    }
  }

  private getTasksForDay(plan: WeekPlan | ExecutionPlan, dayOfWeek: number): Task[] {
    if (!plan?.days?.[dayOfWeek]?.tasks) return [];
    
    return Object.values(plan.days[dayOfWeek].tasks)
      .filter(taskItem => taskItem.type === 'task')
      .map(taskItem => taskItem.item as Task);
  }


  private calculateTaskMetrics(tasks: Task[]) {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.completed).length;
    const totalMinutes = tasks.reduce((total, task) => total + task.minutes, 0);
    const remainingMinutes = tasks
      .filter(task => !task.completed)
      .reduce((total, task) => total + task.minutes, 0);
    
    return {
      totalTasks,
      completedTasks,
      totalMinutes,
      remainingMinutes,
      completionRate: totalTasks > 0 ? completedTasks / totalTasks : 0,
      hoursTotal: totalMinutes / 60,
      hoursRemaining: remainingMinutes / 60,
    };
  }

  /**
   * Calculate metrics for tasks grouped by owner
   */
  calculateTaskMetricsByOwner(tasks: Task[]) {
    const userTasks = this.filterTasksByOwner(tasks, 'user');
    const partnerTasks = this.filterTasksByOwner(tasks, 'partner');
    const unassignedTasks = this.filterTasksByOwner(tasks, 'unassigned');
    
    return {
      user: this.calculateTaskMetrics(userTasks),
      partner: this.calculateTaskMetrics(partnerTasks),
      unassigned: this.calculateTaskMetrics(unassignedTasks),
      all: this.calculateTaskMetrics(tasks)
    };
  }

  /**
   * Calculate metrics for a specific day
   */
  calculateDayMetrics(plan: WeekPlan | ExecutionPlan, dayOfWeek: number) {
    const tasks = this.getTasksForDay(plan, dayOfWeek);
    return this.calculateTaskMetricsByOwner(tasks);
  }

  /**
   * Calculate metrics for an entire plan
   */
  calculatePlanMetrics(plan: WeekPlan | ExecutionPlan) {
    const allTasks: Task[] = [];
    
    // Collect all tasks from all days (filter for task type only)
    for (const dayKey in plan.days) {
      const day = plan.days[dayKey];
      if (day && day.tasks) {
        const dayTasks = Object.values(day.tasks)
          .filter(taskItem => taskItem.type === 'task')
          .map(taskItem => taskItem.item as Task);
        allTasks.push(...dayTasks);
      }
    }
    
    return this.calculateTaskMetricsByOwner(allTasks);
  }

  /**
   * Get the appropriate color for a task based on its assignment
   */
  getTaskAssignmentColor(task: Task): string {
    if (!task.assignedTo) return '#9e9e9e'; // Gray for unassigned
    if (task.assignedTo === this.userId) return this.getUserColor(this.userId); // User color
    
    // For partner, use the partnership color
    const hexColor = this.getPartnerColor(task.assignedTo);
    return hexColor;
  }

  /**
   * Get appropriate background color for a task card
   */
  getTaskBackgroundColor(task: Task): string {
    //if (task.completed) return 'rgba(76, 175, 80, 0.08)'; // Green tint for completed
    if (!task.assignedTo) return 'rgba(158, 158, 158, 0.05)'; // Light gray for unassigned
    
    if (task.assignedTo === this.userId) {
      // Create a light tint based on user color
      const hexColor = this.getUserColor(this.userId);
      // Extract RGB values and create a light background
      const r = parseInt(hexColor.slice(1, 3), 16);
      const g = parseInt(hexColor.slice(3, 5), 16);
      const b = parseInt(hexColor.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, 0.2)`;
    } else {
      // For partner, create a light tint based on their color
      const hexColor = this.getPartnerColor(task.assignedTo);
      // Extract RGB values and create a light background
      const r = parseInt(hexColor.slice(1, 3), 16);
      const g = parseInt(hexColor.slice(3, 5), 16);
      const b = parseInt(hexColor.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, 0.2)`;
    }
  }
  
  /**
   * Get the appropriate nickname for a task assignee
   */
  getAssigneeName(userId: string | null): string {
    if (!userId) return 'Unassigned';
    if (userId === this.userId) return 'Me';
    return this.getPartnerNickname(userId);
  }
}

export default TaskService;