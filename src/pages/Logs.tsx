import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  FormControl,
  Select,
  MenuItem,
  Card,
  CardContent,
  Divider,
  Chip,
  Stack
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as UncheckedIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  SwapHoriz as MoveIcon,
  PersonAdd as AssignIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { useTaskManager } from '../context/TaskContext';
import { activityService } from '../firebase/activityService';
import { ActivityLog } from '../types';
import { format, parseISO } from 'date-fns';

const Logs: React.FC = () => {
  const { activeExecutionPlan, executionPlans } = useTaskManager();
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);

  const getPlanOptions = () => {
    return [...executionPlans].sort((a, b) => 
      new Date(b.weekStartDate).getTime() - new Date(a.weekStartDate).getTime()
    );
  };

  const loadActivities = async () => {
    if (!selectedPlanId) return;
    
    setLoading(true);
    const selectedPlan = executionPlans.find(p => p.id === selectedPlanId);
    if (selectedPlan) {
      const weekStart = new Date(selectedPlan.weekStartDate);
      const logs = await activityService.getActivitiesForWeek(selectedPlanId, weekStart);
      setActivities(logs);
    }
    setLoading(false);
  };

  // Initialize with activeExecutionPlan
  useEffect(() => {
    if (activeExecutionPlan && !selectedPlanId) {
      setSelectedPlanId(activeExecutionPlan.id);
    } else if (executionPlans.length > 0 && !selectedPlanId) {
      // Find plan that contains today's date
      const today = new Date();
      const currentWeekPlan = executionPlans.find(plan => {
        const weekStart = new Date(plan.weekStartDate);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        return today >= weekStart && today <= weekEnd;
      });
      
      if (currentWeekPlan) {
        setSelectedPlanId(currentWeekPlan.id);
      } else {
        // Fallback to most recent plan
        const sorted = getPlanOptions();
        if (sorted[0]) {
          setSelectedPlanId(sorted[0].id);
        }
      }
    }
  }, [activeExecutionPlan, executionPlans, selectedPlanId]);

  useEffect(() => {
    loadActivities();
  }, [selectedPlanId, executionPlans]);

  const groupActivitiesByDay = (activities: ActivityLog[]) => {
    const groups: Record<string, ActivityLog[]> = {};
    
    activities.forEach(activity => {
      const date = new Date(activity.timestamp);
      const dayKey = format(date, 'yyyy-MM-dd');
      if (!groups[dayKey]) {
        groups[dayKey] = [];
      }
      groups[dayKey].push(activity);
    });
    
    return groups;
  };

  const formatTime = (timestamp: number) => {
    // Convert to PST/PDT
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      timeZone: 'America/Los_Angeles',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'task_added': 
        return <AddIcon sx={{ color: 'success.main', fontSize: 'inherit' }} />;
      case 'task_deleted': 
        return <DeleteIcon sx={{ color: 'error.main', fontSize: 'inherit' }} />;
      case 'task_moved': 
        return <MoveIcon sx={{ color: 'info.main', fontSize: 'inherit' }} />;
      case 'task_completed': 
        return <CheckCircleIcon sx={{ color: 'success.main', fontSize: 'inherit' }} />;
      case 'task_uncompleted': 
        return <UncheckedIcon sx={{ color: 'warning.main', fontSize: 'inherit' }} />;
      case 'task_assigned': 
        return <AssignIcon sx={{ color: 'primary.main', fontSize: 'inherit' }} />;
      case 'task_updated': 
        return <EditIcon sx={{ color: 'secondary.main', fontSize: 'inherit' }} />;
      default: 
        return <EditIcon sx={{ color: 'text.secondary', fontSize: 'inherit' }} />;
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'task_added': return 'Added';
      case 'task_deleted': return 'Deleted';
      case 'task_moved': return 'Moved';
      case 'task_completed': return 'Completed';
      case 'task_uncompleted': return 'Uncompleted';
      case 'task_assigned': return 'Assigned';
      case 'task_updated': return 'Updated';
      default: return action;
    }
  };

  const getActionDescription = (activity: ActivityLog) => {
    const { action, details } = activity;
    
    switch (action) {
      case 'task_added':
        return `Added task to ${details.toDay}`;
      case 'task_deleted':
        return `Deleted task from ${details.fromDay}`;
      case 'task_moved':
        return `Moved task from ${details.fromDay} to ${details.toDay}`;
      case 'task_completed':
        return 'Marked task as completed';
      case 'task_uncompleted':
        return 'Marked task as not completed';
      case 'task_assigned':
        return `Assigned: ${details.from} → ${details.to}`;
      case 'task_updated':
        return `Updated: ${details.from} → ${details.to}`;
      default:
        return action;
    }
  };

  const groupedActivities = groupActivitiesByDay(activities);
  const sortedDays = Object.keys(groupedActivities).sort().reverse();

  return (
    <Box sx={{ p: 0, height: '100vh', overflow: 'auto', bgcolor: 'background.default' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, p: 1, bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Activity Logs</Typography>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <Select
            value={selectedPlanId}
            onChange={(e) => setSelectedPlanId(e.target.value)}
            sx={{ bgcolor: 'background.paper' }}
            displayEmpty
          >
            {getPlanOptions().map(plan => (
              <MenuItem key={plan.id} value={plan.id}>
                <Box>
                  <Typography variant="body2">
                    Week of {format(parseISO(plan.weekStartDate), 'MMM d, yyyy')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {plan.name}
                  </Typography>
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Box sx={{ p: 1 }}>
        {loading ? (
          <Typography>Loading...</Typography>
        ) : sortedDays.length === 0 ? (
          <Typography color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
            No activities found for this week
          </Typography>
        ) : (
          sortedDays.map(day => (
          <Box key={day} sx={{ mb: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold', color: 'primary.main' }}>
              {format(new Date(day), 'EEEE, MMMM d')}
            </Typography>
            <Stack spacing={0.5}>
              {groupedActivities[day].map(activity => (
                <Card key={activity.id} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        {getActionIcon(activity.action)}
                        <Typography variant="body2" sx={{ fontWeight: 'medium', color: 'text.primary' }}>
                          {activity.taskTitle}
                        </Typography>
                        {activity.categoryName && (
                          <Chip
                            label={activity.categoryName}
                            size="small"
                            variant="outlined"
                            sx={{
                              height: 18,
                              fontSize: '0.65rem',
                              '& .MuiChip-label': {
                                px: 0.5,
                              },
                            }}
                          />
                        )}
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          ({activity.taskDay})
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {getActionDescription(activity)}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                        <Chip 
                          label={`${activity.userName} • ${getActionLabel(activity.action)}`} 
                          size="small" 
                          variant="outlined"
                          sx={{ height: 22, fontSize: '0.75rem' }}
                        />
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'medium' }}>
                          {formatTime(activity.timestamp)} PST
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </Card>
              ))}
            </Stack>
          </Box>
        ))
      )}
      </Box>
    </Box>
  );
};

export default Logs;
