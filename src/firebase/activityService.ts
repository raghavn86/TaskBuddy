import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs,
  Timestamp 
} from 'firebase/firestore';
import { db } from './config';
import { ActivityLog, ActivityAction, ActivityDetails } from '../types';

export class ActivityService {
  private collectionName = 'activityLogs';

  async logActivity(
    userId: string,
    userName: string,
    action: ActivityAction,
    taskId: string,
    taskTitle: string,
    taskDay: string,
    executionPlanId: string,
    details: ActivityDetails = {},
    categoryId?: string,
    categoryName?: string,
    categoryColor?: string
  ): Promise<void> {
    try {
      const activityLog: Omit<ActivityLog, 'id'> = {
        userId,
        userName,
        action,
        taskId,
        taskTitle,
        taskDay,
        categoryId,
        categoryName,
        categoryColor,
        executionPlanId,
        timestamp: Date.now(),
        details
      };

      await addDoc(collection(db, this.collectionName), activityLog);
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  }

  async getActivitiesForWeek(
    executionPlanId: string,
    weekStartDate: Date
  ): Promise<ActivityLog[]> {
    try {
      const weekStart = new Date(weekStartDate);
      weekStart.setHours(0, 0, 0, 0);
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
      weekEnd.setHours(23, 59, 59, 999);

      const q = query(
        collection(db, this.collectionName),
        where('executionPlanId', '==', executionPlanId),
        where('timestamp', '>=', weekStart.getTime()),
        where('timestamp', '<=', weekEnd.getTime()),
        orderBy('timestamp', 'desc'),
        limit(1000)
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ActivityLog));
    } catch (error) {
      console.error('Error fetching activities:', error);
      return [];
    }
  }
}

export const activityService = new ActivityService();
