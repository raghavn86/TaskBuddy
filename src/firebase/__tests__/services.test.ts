import { 
  createUser, 
  getUser,
  deleteTemplate,
  createTemplate,
  updateTemplate,
  getTemplate,
  getPartnershipTemplates,
  getUserTemplates,
  getCollaborativeTemplates,
  createExecutionPlan,
  updateExecutionPlan,
  deleteExecutionPlan,
  getExecutionPlan,
  createTemplateFromPlan,
  cloneExecutionPlan,
  getPartnershipExecutionPlans,
  getUserExecutionPlans,
  addTaskToDay,
  updateTask,
  deleteTask,
  moveTask,
  createCategory,
  getPartnershipCategories,
  sortTasksByOrder
} from '../services';
import { firestoreService } from '../firestore';
import { WeekPlan, ExecutionPlan, TaskItem, Item, DayPlanStorage, Task } from '../../types';

// Test type for storage format
type WeekPlanStorage = Omit<WeekPlan, 'days'> & {
  days: Record<number, DayPlanStorage>;
};

// Use the mock implementation
jest.mock('../firestore');

const mockFirestoreService = firestoreService as any;

describe('Firebase Services', () => {
  beforeEach(() => {
    // Clear mock data before each test
    mockFirestoreService.clearData();
  });

  // MILESTONE 1: User Services
  describe('User Services', () => {
    describe('createUser', () => {
      it('should create a user document with correct data', async () => {
        const user = {
          uid: 'test-user-123',
          email: 'test@example.com',
          displayName: 'Test User',
          photoURL: 'https://example.com/photo.jpg'
        };

        const result = await createUser(user);

        // Verify return value
        expect(result).toEqual(user);

        // Verify the user was created in the mock service
        const userDoc = await mockFirestoreService.getDoc(`users/${user.uid}`);
        expect(userDoc.exists()).toBe(true);
        expect(userDoc.data()).toEqual(user);
      });

      it('should create a user without photoURL', async () => {
        const user = {
          uid: 'test-user-456',
          email: 'test2@example.com',
          displayName: 'Test User 2'
        };

        const result = await createUser(user);

        expect(result).toEqual(user);
        const userDoc = await mockFirestoreService.getDoc(`users/${user.uid}`);
        expect(userDoc.exists()).toBe(true);
        expect(userDoc.data()).toEqual(user);
      });
    });

    describe('getUser', () => {
      it('should return user data when user exists', async () => {
        const user = {
          uid: 'existing-user',
          email: 'existing@example.com',
          displayName: 'Existing User',
          photoURL: 'https://example.com/existing.jpg'
        };

        // Seed user data
        mockFirestoreService.seedData(`users/${user.uid}`, user);

        const result = await getUser(user.uid);
        expect(result).toEqual(user);
      });

      it('should return null when user does not exist', async () => {
        const result = await getUser('non-existent-user');
        expect(result).toBeNull();
      });
    });
  });

  // MILESTONE 2: Template Services - Core
  describe('Template Services - Core', () => {
    describe('createTemplate', () => {
      it('should create a template with generated ID and timestamps', async () => {
        const templateData: Omit<WeekPlan, 'id'> = {
          name: 'Test Template',
          isTemplate: true,
          days: {},
          createdAt: 0, // Will be overridden
          updatedAt: 0, // Will be overridden
          createdBy: 'user123',
          collaborators: ['user123'],
          partnershipId: 'partnership123'
        };

        const result = await createTemplate(templateData);

        // Verify return value structure
        expect(result.id).toBeDefined();
        expect(result.name).toBe('Test Template');
        expect(result.isTemplate).toBe(true);
        expect(result.createdAt).toBeGreaterThan(0);
        expect(result.updatedAt).toBeGreaterThan(0);
        expect(result.createdBy).toBe('user123');

        // Verify template was saved
        const templateDoc = await mockFirestoreService.getDoc(`templates/${result.id}`);
        expect(templateDoc.exists()).toBe(true);
        expect(templateDoc.data()).toEqual(result);
      });
    });

    describe('updateTemplate', () => {
      it('should update template with new data and timestamp', async () => {
        const templateId = 'template123';
        const originalTemplate: WeekPlan = {
          id: templateId,
          name: 'Original Template',
          isTemplate: true,
          days: {},
          createdAt: 1000,
          updatedAt: 1000,
          createdBy: 'user123',
          collaborators: ['user123'],
          partnershipId: 'partnership123'
        };

        // Seed original template
        mockFirestoreService.seedData(`templates/${templateId}`, originalTemplate);

        const updates = { name: 'Updated Template' };
        await updateTemplate(templateId, updates);

        // Verify template was updated
        const templateDoc = await mockFirestoreService.getDoc(`templates/${templateId}`);
        const updatedTemplate = templateDoc.data();
        
        expect(updatedTemplate.name).toBe('Updated Template');
        expect(updatedTemplate.updatedAt).toBeGreaterThan(1000);
        expect(updatedTemplate.createdAt).toBe(1000); // Should remain unchanged
      });
    });

    describe('deleteTemplate', () => {
      it('should delete a template document', async () => {
        const templateId = 'test-template-123';
        
        // Seed the template in mock service
        mockFirestoreService.seedData(`templates/${templateId}`, {
          name: 'Test Template',
          tasks: []
        });

        // Verify template exists before deletion
        const templateDocBefore = await mockFirestoreService.getDoc(`templates/${templateId}`);
        expect(templateDocBefore.exists()).toBe(true);

        await deleteTemplate(templateId);

        // Verify template was deleted
        const templateDocAfter = await mockFirestoreService.getDoc(`templates/${templateId}`);
        expect(templateDocAfter.exists()).toBe(false);
      });
    });

    describe('getTemplate', () => {
      it('should return template with sorted tasks when template exists', async () => {
        const templateId = 'template123';
        const template: WeekPlan = {
          id: templateId,
          name: 'Test Template',
          isTemplate: true,
          days: {
            1: {
              id: 'day1',
              dayOfWeek: 1,
              tasks: {
                'task1': { 
                  type: 'task',
                  item: { id: 'task1', title: 'Task 1', minutes: 30, assignedTo: null, completed: false, order: 1, createdAt: 1000, updatedAt: 1000 } as Task
                },
                'task2': { 
                  type: 'task',
                  item: { id: 'task2', title: 'Task 2', minutes: 45, assignedTo: 'user1', completed: false, order: 0, createdAt: 1000, updatedAt: 1000 } as Task
                }
              }
            }
          },
          createdAt: 1000,
          updatedAt: 1000,
          createdBy: 'user123',
          collaborators: ['user123'],
          partnershipId: 'partnership123'
        };

        mockFirestoreService.seedData(`templates/${templateId}`, template);

        const result = await getTemplate(templateId);
        
        expect(result).toBeDefined();
        expect(result!.id).toBe(templateId);
        expect(result!.name).toBe('Test Template');
        
        // Verify tasks are sorted by order
        const taskItems = Object.values(result!.days[1].tasks) as TaskItem[];
        const tasks = taskItems.map(item => item.item).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        expect(tasks[0].order).toBe(0);
        expect(tasks[1].order).toBe(1);
      });

      it('should return null when template does not exist', async () => {
        const result = await getTemplate('non-existent-template');
        expect(result).toBeNull();
      });
    });
  });

  // MILESTONE 3: Template Services - Query
  describe('Template Services - Query', () => {
    beforeEach(() => {
      // Seed test templates
      const templates = [
        {
          id: 'template1',
          name: 'Partnership Template 1',
          isTemplate: true,
          partnershipId: 'partnership123',
          createdBy: 'user1',
          days: {},
          createdAt: 1000,
          updatedAt: 1000,
          collaborators: ['user1']
        },
        {
          id: 'template2',
          name: 'Partnership Template 2',
          isTemplate: true,
          partnershipId: 'partnership123',
          createdBy: 'user2',
          days: {},
          createdAt: 2000,
          updatedAt: 2000,
          collaborators: ['user2']
        },
        {
          id: 'template3',
          name: 'Different Partnership Template',
          isTemplate: true,
          partnershipId: 'partnership456',
          createdBy: 'user1',
          days: {},
          createdAt: 3000,
          updatedAt: 3000,
          collaborators: ['user1']
        }
      ];

      templates.forEach(template => {
        mockFirestoreService.seedData(`templates/${template.id}`, template);
      });
    });

    describe('getPartnershipTemplates', () => {
      it('should return templates for specific partnership', async () => {
        const result = await getPartnershipTemplates('partnership123');
        
        expect(result).toHaveLength(2);
        expect(result.map(t => t.id)).toContain('template1');
        expect(result.map(t => t.id)).toContain('template2');
        expect(result.every(t => t.partnershipId === 'partnership123')).toBe(true);
      });

      it('should return empty array for non-existent partnership', async () => {
        const result = await getPartnershipTemplates('non-existent');
        expect(result).toHaveLength(0);
      });
    });

    describe('getUserTemplates (deprecated)', () => {
      it('should return templates created by specific user', async () => {
        // Capture console.warn to verify deprecation warning
        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
        
        const result = await getUserTemplates('user1');
        
        expect(result).toHaveLength(2);
        expect(result.map(t => t.id)).toContain('template1');
        expect(result.map(t => t.id)).toContain('template3');
        expect(result.every(t => t.createdBy === 'user1')).toBe(true);
        
        // Verify deprecation warning
        expect(consoleSpy).toHaveBeenCalledWith('getUserTemplates is deprecated. Use getPartnershipTemplates instead.');
        
        consoleSpy.mockRestore();
      });

      it('should return empty array for user with no templates', async () => {
        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
        
        const result = await getUserTemplates('user999');
        expect(result).toHaveLength(0);
        
        consoleSpy.mockRestore();
      });
    });

    describe('getCollaborativeTemplates (deprecated)', () => {
      it('should return templates with partnershipId', async () => {
        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
        
        const result = await getCollaborativeTemplates('user1');
        
        expect(result).toHaveLength(3); // All templates have partnershipId
        expect(result.every(t => t.partnershipId !== null)).toBe(true);
        
        // Verify deprecation warning
        expect(consoleSpy).toHaveBeenCalledWith('getCollaborativeTemplates is deprecated. Use getPartnershipTemplates instead.');
        
        consoleSpy.mockRestore();
      });
    });
  });

  // MILESTONE 4: Execution Plan Services - Core
  describe('Execution Plan Services - Core', () => {
    let testTemplate: WeekPlan;

    beforeEach(() => {
      // Seed a test template for execution plan creation
      testTemplate = {
        id: 'template123',
        name: 'Test Template',
        isTemplate: true,
        days: {
          1: {
            id: 'day1',
            dayOfWeek: 1,
            tasks: {
              'task1': { 
                type: 'task',
                item: { id: 'task1', title: 'Task 1', minutes: 30, assignedTo: null, completed: false, order: 0, createdAt: 1000, updatedAt: 1000 } as Task
              }
            }
          }
        },
        createdAt: 1000,
        updatedAt: 1000,
        createdBy: 'user123',
        collaborators: ['user123'],
        partnershipId: 'partnership123'
      };

      mockFirestoreService.seedData(`templates/${testTemplate.id}`, testTemplate);
    });

    describe('createExecutionPlan', () => {
      it('should create execution plan from template', async () => {
        const weekStartDate = '2024-01-01';
        const userId = 'user123';

        const result = await createExecutionPlan(testTemplate.id, weekStartDate, userId);

        // Verify return value structure
        expect(result.id).toBeDefined();
        expect(result.templateId).toBe(testTemplate.id);
        expect(result.weekStartDate).toBe(weekStartDate);
        expect(result.isTemplate).toBe(false);
        expect(result.name).toBe(testTemplate.name);
        expect(result.createdBy).toBe(userId);
        expect(result.collaborators).toContain(userId);

        // Verify execution plan was saved
        const planDoc = await mockFirestoreService.getDoc(`executionPlans/${result.id}`);
        expect(planDoc.exists()).toBe(true);
        expect(planDoc.data()).toEqual(result);
      });

      it('should throw error when template not found', async () => {
        await expect(createExecutionPlan('non-existent', '2024-01-01', 'user123'))
          .rejects.toThrow('Template not found');
      });
    });

    describe('updateExecutionPlan', () => {
      it('should update execution plan with new data and timestamp', async () => {
        const planId = 'plan123';
        const originalPlan: ExecutionPlan = {
          ...testTemplate,
          id: planId,
          isTemplate: false,
          templateId: testTemplate.id,
          weekStartDate: '2024-01-01',
          createdAt: 2000,
          updatedAt: 2000
        };

        mockFirestoreService.seedData(`executionPlans/${planId}`, originalPlan);

        const updates = { name: 'Updated Plan' };
        await updateExecutionPlan(planId, updates);

        const planDoc = await mockFirestoreService.getDoc(`executionPlans/${planId}`);
        const updatedPlan = planDoc.data();
        
        expect(updatedPlan.name).toBe('Updated Plan');
        expect(updatedPlan.updatedAt).toBeGreaterThan(2000);
        expect(updatedPlan.createdAt).toBe(2000);
      });
    });

    describe('deleteExecutionPlan', () => {
      it('should delete execution plan document', async () => {
        const planId = 'plan123';
        
        mockFirestoreService.seedData(`executionPlans/${planId}`, {
          name: 'Test Plan',
          isTemplate: false
        });

        const planDocBefore = await mockFirestoreService.getDoc(`executionPlans/${planId}`);
        expect(planDocBefore.exists()).toBe(true);

        await deleteExecutionPlan(planId);

        const planDocAfter = await mockFirestoreService.getDoc(`executionPlans/${planId}`);
        expect(planDocAfter.exists()).toBe(false);
      });
    });

    describe('getExecutionPlan', () => {
      it('should return execution plan with sorted tasks when plan exists', async () => {
        const planId = 'plan123';
        const plan: ExecutionPlan = {
          ...testTemplate,
          id: planId,
          isTemplate: false,
          templateId: testTemplate.id,
          weekStartDate: '2024-01-01'
        };

        mockFirestoreService.seedData(`executionPlans/${planId}`, plan);

        const result = await getExecutionPlan(planId);
        
        expect(result).toBeDefined();
        expect(result!.id).toBe(planId);
        expect(result!.isTemplate).toBe(false);
        expect(result!.templateId).toBe(testTemplate.id);
        expect(result!.weekStartDate).toBe('2024-01-01');
      });

      it('should return null when execution plan does not exist', async () => {
        const result = await getExecutionPlan('non-existent-plan');
        expect(result).toBeNull();
      });
    });
  });

  // MILESTONE 5: Execution Plan Services - Advanced
  describe('Execution Plan Services - Advanced', () => {
    let testExecutionPlan: ExecutionPlan;

    beforeEach(() => {
      // Seed a test execution plan
      testExecutionPlan = {
        id: 'plan123',
        name: 'Test Execution Plan',
        isTemplate: false,
        templateId: 'template123',
        weekStartDate: '2024-01-01',
        days: {
          1: {
            id: 'day1',
            dayOfWeek: 1,
            tasks: {
              'task1': { 
                type: 'task',
                item: { id: 'task1', title: 'Task 1', minutes: 30, assignedTo: 'user1', completed: true, order: 0, createdAt: 1000, updatedAt: 1000 } as Task
              }
            }
          }
        },
        createdAt: 2000,
        updatedAt: 2000,
        createdBy: 'user123',
        collaborators: ['user123'],
        partnershipId: 'partnership123'
      };

      mockFirestoreService.seedData(`executionPlans/${testExecutionPlan.id}`, testExecutionPlan);
    });

    describe('createTemplateFromPlan', () => {
      it('should create template from execution plan', async () => {
        const templateName = 'New Template from Plan';

        const result = await createTemplateFromPlan(testExecutionPlan.id, templateName);

        expect(result.id).toBeDefined();
        expect(result.name).toBe(templateName);
        expect(result.isTemplate).toBe(true);
        expect(result.days).toEqual(testExecutionPlan.days);
        expect(result.createdBy).toBe(testExecutionPlan.createdBy);
        expect(result.partnershipId).toBe(testExecutionPlan.partnershipId);
        expect(result).not.toHaveProperty('templateId');
        expect(result).not.toHaveProperty('weekStartDate');

        // Verify template was saved
        const templateDoc = await mockFirestoreService.getDoc(`templates/${result.id}`);
        expect(templateDoc.exists()).toBe(true);
      });

      it('should throw error when execution plan not found', async () => {
        await expect(createTemplateFromPlan('non-existent', 'Template Name'))
          .rejects.toThrow('Execution plan not found');
      });
    });

    describe('cloneExecutionPlan', () => {
      it('should clone execution plan with new week date', async () => {
        const newWeekStartDate = '2024-01-08';

        const result = await cloneExecutionPlan(testExecutionPlan.id, newWeekStartDate);

        expect(result.id).toBeDefined();
        expect(result.id).not.toBe(testExecutionPlan.id);
        expect(result.name).toBe(`${testExecutionPlan.name} (Copy)`);
        expect(result.weekStartDate).toBe(newWeekStartDate);
        expect(result.templateId).toBe(testExecutionPlan.templateId);
        expect(result.days).toEqual(testExecutionPlan.days);
        expect(result.isTemplate).toBe(false);

        // Verify cloned plan was saved
        const planDoc = await mockFirestoreService.getDoc(`executionPlans/${result.id}`);
        expect(planDoc.exists()).toBe(true);
      });

      it('should throw error when source plan not found', async () => {
        await expect(cloneExecutionPlan('non-existent', '2024-01-08'))
          .rejects.toThrow('Execution plan not found');
      });
    });

    describe('getPartnershipExecutionPlans', () => {
      beforeEach(() => {
        // Seed additional execution plans
        const plans = [
          {
            id: 'plan1',
            name: 'Plan 1',
            isTemplate: false,
            partnershipId: 'partnership123',
            templateId: 'template1',
            weekStartDate: '2024-01-01',
            days: {},
            createdAt: 1000,
            updatedAt: 1000,
            createdBy: 'user1',
            collaborators: ['user1']
          },
          {
            id: 'plan2',
            name: 'Plan 2',
            isTemplate: false,
            partnershipId: 'partnership456',
            templateId: 'template2',
            weekStartDate: '2024-01-08',
            days: {},
            createdAt: 2000,
            updatedAt: 2000,
            createdBy: 'user2',
            collaborators: ['user2']
          }
        ];

        plans.forEach(plan => {
          mockFirestoreService.seedData(`executionPlans/${plan.id}`, plan);
        });
      });

      it('should return execution plans for specific partnership', async () => {
        const result = await getPartnershipExecutionPlans('partnership123');
        
        expect(result).toHaveLength(2); // testExecutionPlan + plan1
        expect(result.every(p => p.partnershipId === 'partnership123')).toBe(true);
        expect(result.every(p => p.isTemplate === false)).toBe(true);
      });

      it('should return empty array for non-existent partnership', async () => {
        const result = await getPartnershipExecutionPlans('non-existent');
        expect(result).toHaveLength(0);
      });
    });

    describe('getUserExecutionPlans (deprecated)', () => {
      it('should return execution plans created by specific user', async () => {
        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
        
        const result = await getUserExecutionPlans('user123');
        
        expect(result).toHaveLength(1); // testExecutionPlan
        expect(result[0].createdBy).toBe('user123');
        expect(result[0].isTemplate).toBe(false);
        
        // Verify deprecation warning
        expect(consoleSpy).toHaveBeenCalledWith('getUserExecutionPlans is deprecated. Use getPartnershipExecutionPlans instead.');
        
        consoleSpy.mockRestore();
      });
    });
  });

  // MILESTONE 6: Task Management Services
  describe('Task Management Services', () => {
    let testPlan: WeekPlanStorage;

    beforeEach(() => {
      // Seed a test plan with TaskItem format (modern storage)
      const taskItemData: TaskItem = {
        type: 'task',
        item: {
          id: 'existing-task', 
          title: 'Existing Task', 
          minutes: 30, 
          assignedTo: 'user1', 
          completed: false, 
          order: 0, 
          createdAt: 1000, 
          updatedAt: 1000 
        } as Task
      };

      testPlan = {
        id: 'plan123',
        name: 'Test Plan',
        isTemplate: true,
        days: {
          1: {
            id: 'day1',
            dayOfWeek: 1,
            tasks: {
              'existing-task': taskItemData
            }
          }
        },
        createdAt: 1000,
        updatedAt: 1000,
        createdBy: 'user123',
        collaborators: ['user123'],
        partnershipId: 'partnership123'
      };

      mockFirestoreService.seedData(`templates/${testPlan.id}`, testPlan);
    });

    describe('addTaskToDay', () => {
      it('should add task to existing day', async () => {
        const taskData: TaskItem = {
          type: 'task',
          item: {
            id: '',
            title: 'New Task',
            minutes: 45,
            assignedTo: 'user2',
            completed: false,
            createdAt: 1000,
            updatedAt: 1000,
            order: 0
          } as Task
        };

        const result = await addTaskToDay(testPlan.id, 1, taskData, true);
        const resultItem = result.newTask.item as Task

        expect(result.newTask.item.id).toBeDefined();
        expect(result.newTask.type).toBe('task');
        expect(resultItem.title).toBe('New Task');
        expect(resultItem.minutes).toBe(45);
        expect(resultItem.assignedTo).toBe('user2');
        expect(resultItem.order).toBe(1); // Should be after existing task

        // Verify task was added to plan
        const planDoc = await mockFirestoreService.getDoc(`templates/${testPlan.id}`);
        const updatedPlan = planDoc.data();
        const storedTaskItem = updatedPlan.days[1].tasks[result.newTask.item.id];
        expect(storedTaskItem.type).toBe('task');
        expect(storedTaskItem.item).toEqual(result.newTask.item);
      });

      it('should add task to new day', async () => {
        const taskData: TaskItem = {
          type: 'task',
          item: {
            id: '',
            title: 'Task for New Day',
            minutes: 60,
            assignedTo: null,
            completed: false,
            createdAt: 1000,
            updatedAt: 1000,
            order: 0
          } as Task
        };

        const result = await addTaskToDay(testPlan.id, 3, taskData, true);

        expect(result.newTask.item.order).toBe(0); // First task in new day

        // Verify new day was created
        const planDoc = await mockFirestoreService.getDoc(`templates/${testPlan.id}`);
        const updatedPlan = planDoc.data();
        expect(updatedPlan.days[3]).toBeDefined();
        expect(updatedPlan.days[3].dayOfWeek).toBe(3);
        const storedTaskItem = updatedPlan.days[3].tasks[result.newTask.item.id];
        expect(storedTaskItem.type).toBe('task');
        expect(storedTaskItem.item as Task).toEqual(result.newTask.item);
      });
    });

    describe('updateTask', () => {
      it('should update existing task', async () => {
        const updates: Partial<TaskItem> = {
          item: {
            id: 'existing-task',
            title: 'Updated Task Title',
            completed: true,
            assignedTo: 'user2',
            minutes: 30,
            createdAt: 1000,
            updatedAt: 1000,
            order: 0
          } as Task
        };

        await updateTask(testPlan.id, 1, 'existing-task', updates, true);

        // Verify task was updated
        const planDoc = await mockFirestoreService.getDoc(`templates/${testPlan.id}`);
        const updatedPlan = planDoc.data();
        const storedTaskItem = updatedPlan.days[1].tasks['existing-task'];
        
        expect(storedTaskItem.type).toBe('task');
        expect(storedTaskItem.item.title).toBe('Updated Task Title');
        expect(storedTaskItem.item.completed).toBe(true);
        expect(storedTaskItem.item.assignedTo).toBe('user2');
        expect(storedTaskItem.item.updatedAt).toBeGreaterThan(1000);
      });

      it('should throw error when task not found', async () => {
        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
        
        await expect(updateTask(testPlan.id, 1, 'non-existent', { item: { title: 'New Title'} as Partial<Task>  } as Partial<TaskItem>, true))
          .rejects.toThrow('Task not found');
          
        consoleSpy.mockRestore();
      });
    });

    describe('deleteTask', () => {
      it('should delete existing task', async () => {
        // Add another task so day doesn't get removed
        const taskData: TaskItem = {
          type: 'task',
          item: {
            id: '',
            title: 'Another Task',
            minutes: 15,
            assignedTo: null,
            completed: false,
            createdAt: 1000,
            updatedAt: 1000,
            order: 0
          } as Task
        };
        await addTaskToDay(testPlan.id, 1, taskData, true);

        await deleteTask(testPlan.id, 1, 'existing-task', true);

        // Verify task was deleted but day still exists
        const planDoc = await mockFirestoreService.getDoc(`templates/${testPlan.id}`);
        const updatedPlan = planDoc.data();
        expect(updatedPlan.days[1].tasks['existing-task']).toBeUndefined();
        expect(updatedPlan.days[1]).toBeDefined(); // Day should still exist
      });

      it('should remove day when last task is deleted', async () => {
        await deleteTask(testPlan.id, 1, 'existing-task', true);

        // Verify day was removed
        const planDoc = await mockFirestoreService.getDoc(`templates/${testPlan.id}`);
        const updatedPlan = planDoc.data();
        expect(updatedPlan.days[1]).toBeUndefined();
      });

      it('should throw error when task not found', async () => {
        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
        
        await expect(deleteTask(testPlan.id, 1, 'non-existent', true))
          .rejects.toThrow('Task not found');
          
        consoleSpy.mockRestore();
      });
    });

    describe('moveTask', () => {
      beforeEach(() => {
        // Add more tasks for move testing (TaskItem format)
        const task2ItemData: TaskItem = {
          type: 'task',
          item: {
            id: 'task2', 
            title: 'Task 2', 
            minutes: 20, 
            assignedTo: null, 
            completed: false, 
            order: 1, 
            createdAt: 1000, 
            updatedAt: 1000 
          } as Task
        };

        const task3ItemData: TaskItem = {
          type: 'task',
          item: {
            id: 'task3', 
            title: 'Task 3', 
            minutes: 15, 
            assignedTo: 'user1', 
            completed: false, 
            order: 0, 
            createdAt: 1000, 
            updatedAt: 1000 
          } as Task
        };

        const updatedPlan = {
          ...testPlan,
          days: {
            ...testPlan.days,
            1: {
              ...testPlan.days[1],
              tasks: {
                ...testPlan.days[1].tasks,
                'task2': task2ItemData
              }
            },
            2: {
              id: 'day2',
              dayOfWeek: 2,
              tasks: {
                'task3': task3ItemData
              }
            }
          }
        };
        mockFirestoreService.seedData(`templates/${testPlan.id}`, updatedPlan);
      });

      it('should move task between days', async () => {
        await moveTask(testPlan.id, 1, 2, 'existing-task', true);

        // Verify task was moved
        const planDoc = await mockFirestoreService.getDoc(`templates/${testPlan.id}`);
        const updatedPlan = planDoc.data();
        
        // Task should be removed from day 1
        expect(updatedPlan.days[1].tasks['existing-task']).toBeUndefined();
        
        // Task should be added to day 2
        expect(updatedPlan.days[2].tasks['existing-task']).toBeDefined();
        const storedTaskItem = updatedPlan.days[2].tasks['existing-task'];
        expect(storedTaskItem.type).toBe('task');
        expect(storedTaskItem.item.title).toBe('Existing Task');
      });

      it('should move task with assignment change', async () => {
        await moveTask(testPlan.id, 1, 2, 'existing-task', true, 'user3');

        // Verify task was moved and assigned
        const planDoc = await mockFirestoreService.getDoc(`templates/${testPlan.id}`);
        const updatedPlan = planDoc.data();
        
        const storedTaskItem = updatedPlan.days[2].tasks['existing-task'];
        expect(storedTaskItem.type).toBe('task');
        expect(storedTaskItem.item.assignedTo).toBe('user3');
      });

      it('should reorder task within same day', async () => {
        await moveTask(testPlan.id, 1, 1, 'existing-task', true, undefined, 0, 1);

        // Verify task order was changed
        const planDoc = await mockFirestoreService.getDoc(`templates/${testPlan.id}`);
        const updatedPlan = planDoc.data();
        
        const taskItems = Object.values(updatedPlan.days[1].tasks) as TaskItem[];
        const tasks = taskItems.map(item => item.item).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        expect(tasks[1].id).toBe('existing-task');
      });
    });
  });

  // MILESTONE 7: Category & Helper Services
  describe('Category & Helper Services', () => {
    describe('createCategory', () => {
      it('should create category with generated ID', async () => {
        const categoryData = {
          name: 'Work Tasks',
          color: '#FF5722'
        };
        const partnershipId = 'partnership123';

        const result = await createCategory(categoryData, partnershipId);

        expect(result.id).toBeDefined();
        expect(result.name).toBe('Work Tasks');
        expect(result.color).toBe('#FF5722');

        // Verify category was saved
        const categoryDoc = await mockFirestoreService.getDoc(`categories/${result.id}`);
        expect(categoryDoc.exists()).toBe(true);
        const savedCategory = categoryDoc.data();
        expect(savedCategory.partnershipId).toBe(partnershipId);
      });
    });

    describe('getPartnershipCategories', () => {
      beforeEach(() => {
        // Seed test categories
        const categories = [
          {
            id: 'cat1',
            name: 'Work',
            color: '#FF5722',
            partnershipId: 'partnership123'
          },
          {
            id: 'cat2',
            name: 'Personal',
            color: '#2196F3',
            partnershipId: 'partnership123'
          },
          {
            id: 'cat3',
            name: 'Different Partnership',
            color: '#4CAF50',
            partnershipId: 'partnership456'
          }
        ];

        categories.forEach(category => {
          mockFirestoreService.seedData(`categories/${category.id}`, category);
        });
      });

      it('should return categories for specific partnership sorted by name', async () => {
        const result = await getPartnershipCategories('partnership123');
        
        expect(result).toHaveLength(2);
        expect(result[0].name).toBe('Personal'); // Sorted alphabetically
        expect(result[1].name).toBe('Work');
        expect(result.every(c => c.id && c.name && c.color)).toBe(true);
      });

      it('should return empty array for non-existent partnership', async () => {
        const result = await getPartnershipCategories('non-existent');
        expect(result).toHaveLength(0);
      });
    });

    describe('sortTasksByOrder', () => {
      it('should sort tasks by order and fill missing order values', async () => {
        const plan: WeekPlan = {
          id: 'test-plan',
          name: 'Test Plan',
          isTemplate: true,
          days: {
            1: {
              id: 'day1',
              dayOfWeek: 1,
              tasks: {
                'task1': { 
                  type: 'task',
                  item: { id: 'task1', title: 'Task 1', minutes: 30, assignedTo: null, completed: false, order: 2, createdAt: 1000, updatedAt: 1000 } as Task
                },
                'task2': { 
                  type: 'task',
                  item: { id: 'task2', title: 'Task 2', minutes: 45, assignedTo: null, completed: false, order: 0, createdAt: 1000, updatedAt: 1000 } as Task
                },
                'task3': { 
                  type: 'task',
                  item: { id: 'task3', title: 'Task 3', minutes: 15, assignedTo: null, completed: false, createdAt: 1000, updatedAt: 1000 } as Task
                } // No order
              }
            }
          },
          createdAt: 1000,
          updatedAt: 1000,
          createdBy: 'user123',
          collaborators: ['user123'],
          partnershipId: 'partnership123'
        };

        const result = sortTasksByOrder(plan);

        const taskItems = Object.values(result.days[1].tasks) as TaskItem[];
        const tasks = taskItems.map(item => item.item).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        expect(tasks[0].order).toBe(0); // task2
        expect(tasks[1].order).toBe(2); // task1 (keeps original order)
        expect(tasks[2].order).toBeDefined(); // task3 gets assigned an order
        
        expect(tasks[0].id).toBe('task2');
        expect(tasks[1].id).toBe('task1');
        expect(tasks[2].id).toBe('task3');
      });

      it('should handle plan with no days', async () => {
        const plan: WeekPlan = {
          id: 'empty-plan',
          name: 'Empty Plan',
          isTemplate: true,
          days: {},
          createdAt: 1000,
          updatedAt: 1000,
          createdBy: 'user123',
          collaborators: ['user123'],
          partnershipId: 'partnership123'
        };

        const result = sortTasksByOrder(plan);
        expect(result.days).toEqual({});
      });
    });
  });

  describe('State persistence within single test', () => {
    it('should persist state throughout test execution', async () => {
      // Create a user
      const user = { uid: 'user1', email: 'user1@test.com', displayName: 'User 1' };
      await createUser(user);

      // Create another user
      const user2 = { uid: 'user2', email: 'user2@test.com', displayName: 'User 2' };
      await createUser(user2);

      // Verify both users exist
      const userDoc1 = await mockFirestoreService.getDoc('users/user1');
      const userDoc2 = await mockFirestoreService.getDoc('users/user2');
      
      expect(userDoc1.exists()).toBe(true);
      expect(userDoc2.exists()).toBe(true);
      expect(userDoc1.data()).toEqual(user);
      expect(userDoc2.data()).toEqual(user2);
    });
});
});
