import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { usePartnership } from './PartnershipContext';
import {
  RewardDefinition,
  RewardFreezePreviewKid,
  RewardTemplate,
  RewardWeekGroup,
  RewardKid,
  RewardTitle,
  RewardWeekKidRecord,
} from '../types';
import {
  adjustRewardQuantity,
  addManualRewardToWeek,
  addRewardWeekNote,
  applyRewardTrackingChange,
  applyKidStepDelta,
  canFreezeRewardWeek,
  canUnfreezeRewardWeek,
  consumeSingleRewardUnit,
  createDefaultRewardsTemplate,
  deleteRewardWeekNote,
  freezeRewardWeek,
  getRewardWeekGroups,
  getRewardsTemplate,
  instantiateNextRewardWeek,
  isRewardBoundaryDay,
  openNextRewardWeek,
  previewFreezeRewardWeek,
  resetRewardProgress,
  syncCurrentAndFutureRewardWeeksFromTemplate,
  unfreezeRewardWeek,
  updateRewardAvailability,
  updateRewardWeekKid,
  updateRewardsTemplate,
} from '../firebase/rewardServices';

type SyncState = 'idle' | 'pending' | 'synced' | 'error';
type PendingStepSync = {
  delta: number;
  baseLevel: number;
  baseStep: number;
  baseUpdatedAt: number;
};

type RewardsContextType = {
  template: RewardTemplate | null;
  weekGroups: RewardWeekGroup[];
  currentWeek: RewardWeekGroup | null;
  rewardSourceWeek: RewardWeekGroup | null;
  freezePreview: RewardFreezePreviewKid[];
  canFreezeCurrentWeek: boolean;
  canUnfreezeCurrentWeek: boolean;
  syncStatusByRecordId: Record<string, SyncState>;
  isLoading: boolean;
  error: string | null;
  loadRewardsData: () => Promise<void>;
  createTemplate: () => Promise<void>;
  saveTemplate: (updates: Partial<RewardTemplate>) => Promise<void>;
  saveKidsAndTitles: (kids: RewardKid[], titles: RewardTitle[]) => Promise<void>;
  instantiateNextWeek: () => Promise<void>;
  loadFreezePreview: () => Promise<void>;
  freezeCurrentWeek: (carryForwardUnusedRewards: boolean) => Promise<void>;
  unfreezeCurrentWeek: () => Promise<void>;
  openCurrentNextWeek: (carryForwardLevel: boolean) => Promise<void>;
  changeKidStep: (recordId: string, delta: 1 | -1) => Promise<void>;
  commitTrackingChange: (recordId: string, delta: number, reason?: string) => Promise<boolean>;
  removeTrackingEntry: (recordId: string, noteId: string) => Promise<void>;
  addNote: (recordId: string, type: 'good' | 'bad', text: string) => Promise<void>;
  addManualReward: (recordId: string, reward: RewardDefinition) => Promise<void>;
  consumeReward: (recordId: string, rewardId: string) => Promise<void>;
  restoreReward: (recordId: string, rewardId: string) => Promise<void>;
  editRewardAvailability: (
    recordId: string,
    rewardId: string,
    remainingQuantity: number,
    remainingAmount?: number,
  ) => Promise<void>;
  saveWeekRecord: (recordId: string, updates: Partial<RewardWeekKidRecord>) => Promise<void>;
  resetProgress: () => Promise<void>;
};

const RewardsContext = createContext<RewardsContextType | null>(null);

export const useRewards = () => {
  const context = useContext(RewardsContext);
  if (!context) {
    throw new Error('useRewards must be used within a RewardsProvider');
  }
  return context;
};

export const RewardsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const { activePartnership } = usePartnership();
  const [template, setTemplate] = useState<RewardTemplate | null>(null);
  const [weekGroups, setWeekGroups] = useState<RewardWeekGroup[]>([]);
  const [freezePreview, setFreezePreview] = useState<RewardFreezePreviewKid[]>([]);
  const [syncStatusByRecordId, setSyncStatusByRecordId] = useState<Record<string, SyncState>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pendingStepQueueRef = useRef<Map<string, PendingStepSync>>(new Map());
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const syncInFlightRef = useRef(false);
  const syncSkipCountRef = useRef(0);

  const markSyncState = useCallback((recordId: string, state: SyncState) => {
    setSyncStatusByRecordId((previous) => ({ ...previous, [recordId]: state }));
  }, []);

  const upsertRecords = useCallback((updatedRecords: RewardWeekKidRecord[]) => {
    if (updatedRecords.length === 0) {
      return;
    }

    setWeekGroups((previous) => {
      const groups = new Map<number, RewardWeekKidRecord[]>();

      previous.forEach((group) => {
        groups.set(group.weekOrder, [...group.kids]);
      });

      updatedRecords.forEach((record) => {
        const existingKids = groups.get(record.weekOrder) || [];
        const filteredKids = existingKids.filter((kid) => kid.id !== record.id);
        groups.set(
          record.weekOrder,
          [...filteredKids, record].sort((a, b) => a.kidName.localeCompare(b.kidName)),
        );
      });

      return Array.from(groups.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([weekOrder, kids]) => ({ weekOrder, kids }));
    });
  }, []);

  const loadRewardsData = useCallback(async () => {
    if (!activePartnership) {
      setTemplate(null);
      setWeekGroups([]);
      setFreezePreview([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [loadedTemplate, groups] = await Promise.all([
        getRewardsTemplate(activePartnership.id),
        getRewardWeekGroups(activePartnership.id),
      ]);

      setTemplate(loadedTemplate);
      setWeekGroups(groups);
      setFreezePreview([]);
      setSyncStatusByRecordId({});
    } catch (err) {
      console.error('Failed to load rewards data', err);
      setError('Failed to load rewards');
    } finally {
      setIsLoading(false);
    }
  }, [activePartnership]);

  useEffect(() => {
    if (currentUser && activePartnership) {
      void loadRewardsData();
    } else {
      setTemplate(null);
      setWeekGroups([]);
    }
  }, [currentUser, activePartnership, loadRewardsData]);

  useEffect(
    () => () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    },
    [],
  );

  const replaceRecord = useCallback((updatedRecord: RewardWeekKidRecord) => {
    upsertRecords([updatedRecord]);
  }, [upsertRecords]);

  const createTemplate = useCallback(async () => {
    if (!currentUser || !activePartnership) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const createdTemplate = await createDefaultRewardsTemplate(activePartnership.id, currentUser.uid);
      setTemplate(createdTemplate);
      setWeekGroups([]);
    } catch (err) {
      console.error('Failed to create rewards template', err);
      setError('Failed to create rewards template');
    } finally {
      setIsLoading(false);
    }
  }, [activePartnership, currentUser]);

  const saveTemplate = useCallback(
    async (updates: Partial<RewardTemplate>) => {
      if (!template) {
        return;
      }

      const updatedTemplate = {
        ...template,
        ...updates,
        updatedAt: Date.now(),
      };

      setTemplate(updatedTemplate);
      await updateRewardsTemplate(template.id, updates);
    },
    [template],
  );

  const saveKidsAndTitles = useCallback(
    async (kids: RewardKid[], titles: RewardTitle[]) => {
      if (!template) {
        return;
      }

      const updatedTemplate = {
        ...template,
        kids,
        titles,
        updatedAt: Date.now(),
      };

      setTemplate(updatedTemplate);
      await updateRewardsTemplate(template.id, { kids, titles });
      await syncCurrentAndFutureRewardWeeksFromTemplate(updatedTemplate);
      await loadRewardsData();
    },
    [loadRewardsData, template],
  );

  const instantiateNextWeek = useCallback(async () => {
    if (!template) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const createdRecords = await instantiateNextRewardWeek(template);
      upsertRecords(createdRecords);
    } catch (err) {
      console.error('Failed to instantiate next week', err);
      setError(err instanceof Error ? err.message : 'Failed to instantiate next week');
    } finally {
      setIsLoading(false);
    }
  }, [template, upsertRecords]);

  const loadFreezePreview = useCallback(async () => {
    if (!template) {
      setFreezePreview([]);
      return;
    }

    try {
      const preview = await previewFreezeRewardWeek(template.partnershipId, template.currentWeekOrder);
      setFreezePreview(preview);
    } catch (err) {
      console.error('Failed to load freeze preview', err);
      setError('Failed to load freeze preview');
    }
  }, [template]);

  const freezeCurrentWeek = useCallback(
    async (carryForwardUnusedRewards: boolean) => {
      if (!template) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const updatedRecords = await freezeRewardWeek(
          template.partnershipId,
          template.currentWeekOrder,
          carryForwardUnusedRewards,
        );
        upsertRecords(updatedRecords);
        setFreezePreview([]);
      } catch (err) {
        console.error('Failed to freeze current week', err);
        setError(err instanceof Error ? err.message : 'Failed to freeze current week');
      } finally {
        setIsLoading(false);
      }
    },
    [template, upsertRecords],
  );

  const unfreezeCurrentWeek = useCallback(async () => {
    if (!template) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const updatedRecords = await unfreezeRewardWeek(template.partnershipId, template.currentWeekOrder);
      upsertRecords(updatedRecords);
      setFreezePreview([]);
    } catch (err) {
      console.error('Failed to unfreeze current week', err);
      setError(err instanceof Error ? err.message : 'Failed to unfreeze current week');
    } finally {
      setIsLoading(false);
    }
  }, [template, upsertRecords]);

  const openCurrentNextWeek = useCallback(
    async (carryForwardLevel: boolean) => {
      if (!template) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = await openNextRewardWeek(template, carryForwardLevel);
        setTemplate(result.template);
        upsertRecords(result.openedRecords);
        setFreezePreview([]);
      } catch (err) {
        console.error('Failed to open next week', err);
        setError(err instanceof Error ? err.message : 'Failed to open next week');
      } finally {
        setIsLoading(false);
      }
    },
    [template, upsertRecords],
  );

  const clearSyncIntervalIfIdle = useCallback(() => {
    if (
      syncIntervalRef.current &&
      pendingStepQueueRef.current.size === 0 &&
      !syncInFlightRef.current
    ) {
      clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
    }
  }, []);

  const flushStepQueue = useCallback(async () => {
    if (syncInFlightRef.current) {
      syncSkipCountRef.current += 1;
      if (syncSkipCountRef.current >= 6) {
        setError('Step sync is taking too long. Refresh and try again.');
      }
      return;
    }

    if (pendingStepQueueRef.current.size === 0) {
      clearSyncIntervalIfIdle();
      return;
    }

    const queuedUpdates = pendingStepQueueRef.current;
    pendingStepQueueRef.current = new Map();
    syncInFlightRef.current = true;

    try {
      const queueEntries = Array.from(queuedUpdates.entries());
      const updatedRecords = await Promise.all(
        queueEntries.map(([recordId, item]) =>
          applyKidStepDelta(recordId, item.delta, {
            currentLevel: item.baseLevel,
            currentStep: item.baseStep,
            updatedAt: item.baseUpdatedAt,
          }),
        ),
      );

      updatedRecords.forEach((record) => markSyncState(record.id, 'synced'));
      upsertRecords(updatedRecords);
      syncSkipCountRef.current = 0;
    } catch (err) {
      console.error('Failed to flush step queue', err);
      const message = err instanceof Error ? err.message : 'Failed to sync steps';
      const isStateConflict = message.includes('changed before update completed') || message.includes('not found');

      if (!isStateConflict) {
        queuedUpdates.forEach((value, key) => {
          const existing = pendingStepQueueRef.current.get(key);
          pendingStepQueueRef.current.set(key, existing
            ? {
                ...existing,
                delta: existing.delta + value.delta,
                baseLevel: value.baseLevel,
                baseStep: value.baseStep,
                baseUpdatedAt: value.baseUpdatedAt,
              }
            : value);
        });
      }

      queuedUpdates.forEach((_value, key) => markSyncState(key, 'error'));
      setError(message);
      await loadRewardsData();
    } finally {
      syncInFlightRef.current = false;
      clearSyncIntervalIfIdle();
    }
  }, [clearSyncIntervalIfIdle, loadRewardsData, markSyncState, upsertRecords]);

  const ensureSyncInterval = useCallback(() => {
    if (!syncIntervalRef.current) {
      syncIntervalRef.current = setInterval(() => {
        void flushStepQueue();
      }, 1200);
    }
  }, [flushStepQueue]);

  const changeKidStep = useCallback(
    async (recordId: string, delta: 1 | -1) => {
      const existingRecord = weekGroups.flatMap((group) => group.kids).find((record) => record.id === recordId);
      if (!existingRecord) {
        return;
      }

      const queued = pendingStepQueueRef.current.get(recordId);
      const nextRecord = { ...existingRecord };
      const maxDelta = (queued?.delta || 0) + delta;
      const optimisticResult = (() => {
        let currentLevel = nextRecord.currentLevel;
        let currentStep = nextRecord.currentStep;
        const direction = delta > 0 ? 1 : -1;
        if (direction > 0) {
          const maxStep = nextRecord.levels[currentLevel]?.stepCount || 1;
          if (currentStep < maxStep) {
            currentStep += 1;
          } else if (currentLevel < nextRecord.levels.length - 1) {
            currentLevel += 1;
            currentStep = 1;
          }
        } else if (currentStep > 1) {
          currentStep -= 1;
        } else if (currentLevel > 0) {
          currentLevel -= 1;
          currentStep = nextRecord.levels[currentLevel].stepCount;
        }

        return { currentLevel, currentStep };
      })();

      nextRecord.currentLevel = optimisticResult.currentLevel;
      nextRecord.currentStep = optimisticResult.currentStep;
      nextRecord.updatedAt = Date.now();
      replaceRecord(nextRecord);
      markSyncState(recordId, 'pending');
      setError(null);
      syncSkipCountRef.current = 0;

      if (maxDelta === 0) {
        pendingStepQueueRef.current.delete(recordId);
        markSyncState(recordId, 'synced');
        clearSyncIntervalIfIdle();
        return;
      }

      pendingStepQueueRef.current.set(recordId, queued
        ? {
            ...queued,
            delta: maxDelta,
          }
        : {
            delta,
            baseLevel: existingRecord.currentLevel,
            baseStep: existingRecord.currentStep,
            baseUpdatedAt: existingRecord.updatedAt,
          });

      ensureSyncInterval();
    },
    [clearSyncIntervalIfIdle, ensureSyncInterval, markSyncState, replaceRecord, weekGroups],
  );

  const addNote = useCallback(
    async (recordId: string, type: 'good' | 'bad', text: string) => {
      try {
        const updatedRecord = await addRewardWeekNote(recordId, type, text);
        replaceRecord(updatedRecord);
      } catch (err) {
        console.error('Failed to add note', err);
        setError('Failed to add note');
      }
    },
    [replaceRecord],
  );

  const commitTrackingChange = useCallback(
    async (recordId: string, delta: number, reason?: string) => {
      const existingRecord = weekGroups.flatMap((group) => group.kids).find((record) => record.id === recordId);
      if (!existingRecord) {
        return false;
      }

      try {
        markSyncState(recordId, 'pending');
        const updatedRecord = await applyRewardTrackingChange(recordId, delta, reason, {
          currentLevel: existingRecord.currentLevel,
          currentStep: existingRecord.currentStep,
          updatedAt: existingRecord.updatedAt,
        });
        replaceRecord(updatedRecord);
        markSyncState(recordId, 'synced');
        return true;
      } catch (err) {
        console.error('Failed to commit tracking change', err);
        markSyncState(recordId, 'error');
        setError(err instanceof Error ? err.message : 'Failed to commit tracking change');
        await loadRewardsData();
        return false;
      }
    },
    [loadRewardsData, markSyncState, replaceRecord, weekGroups],
  );

  const removeTrackingEntry = useCallback(
    async (recordId: string, noteId: string) => {
      try {
        const updatedRecord = await deleteRewardWeekNote(recordId, noteId);
        replaceRecord(updatedRecord);
      } catch (err) {
        console.error('Failed to remove tracking entry', err);
        setError(err instanceof Error ? err.message : 'Failed to remove tracking entry');
      }
    },
    [replaceRecord],
  );

  const addManualReward = useCallback(
    async (recordId: string, reward: RewardDefinition) => {
      try {
        const updatedRecord = await addManualRewardToWeek(recordId, reward);
        replaceRecord(updatedRecord);
      } catch (err) {
        console.error('Failed to add manual reward', err);
        setError('Failed to add manual reward');
      }
    },
    [replaceRecord],
  );

  const consumeReward = useCallback(
    async (recordId: string, rewardId: string) => {
      try {
        const updatedRecord = await consumeSingleRewardUnit(recordId, rewardId);
        replaceRecord(updatedRecord);
      } catch (err) {
        console.error('Failed to consume reward', err);
        setError('Failed to consume reward');
      }
    },
    [replaceRecord],
  );

  const restoreReward = useCallback(
    async (recordId: string, rewardId: string) => {
      const existingRecord = weekGroups.flatMap((group) => group.kids).find((record) => record.id === recordId);
      const reward = existingRecord?.earnedRewards.find((item) => item.id === rewardId);
      if (!reward) {
        return;
      }

      try {
        const updatedRecord = await adjustRewardQuantity(recordId, rewardId, 1, {
          remainingQuantity: reward.remainingQuantity,
        });
        replaceRecord(updatedRecord);
      } catch (err) {
        console.error('Failed to restore reward', err);
        setError('Failed to restore reward');
      }
    },
    [replaceRecord, weekGroups],
  );

  const editRewardAvailability = useCallback(
    async (recordId: string, rewardId: string, remainingQuantity: number, remainingAmount?: number) => {
      try {
        const updatedRecord = await updateRewardAvailability(recordId, rewardId, {
          remainingQuantity,
          remainingAmount,
        });
        replaceRecord(updatedRecord);
      } catch (err) {
        console.error('Failed to update reward availability', err);
        setError('Failed to update reward availability');
      }
    },
    [replaceRecord],
  );

  const saveWeekRecord = useCallback(
    async (recordId: string, updates: Partial<RewardWeekKidRecord>) => {
      const existingRecord = weekGroups.flatMap((group) => group.kids).find((record) => record.id === recordId);
      if (!existingRecord) {
        return;
      }

      const updatedRecord = {
        ...existingRecord,
        ...updates,
        updatedAt: Date.now(),
      };

      replaceRecord(updatedRecord);
      await updateRewardWeekKid(recordId, updates);
    },
    [replaceRecord, weekGroups],
  );

  const resetProgress = useCallback(async () => {
    if (!template) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await resetRewardProgress(template.partnershipId, template.id);
      setTemplate((previous) => (previous ? { ...previous, currentWeekOrder: 0, updatedAt: Date.now() } : previous));
      setWeekGroups([]);
      setFreezePreview([]);
      setSyncStatusByRecordId({});
    } catch (err) {
      console.error('Failed to reset rewards progress', err);
      setError('Failed to reset rewards progress');
    } finally {
      setIsLoading(false);
    }
  }, [template]);

  const currentWeek = useMemo(() => {
    if (!template) {
      return null;
    }

    return weekGroups.find((group) => group.weekOrder === template.currentWeekOrder) || null;
  }, [template, weekGroups]);

  const rewardSourceWeek = useMemo(() => {
    if (!template) {
      return null;
    }

    return weekGroups.find((group) => group.weekOrder === template.currentWeekOrder - 1) || null;
  }, [template, weekGroups]);

  const canFreezeCurrentWeek = useMemo(
    () => {
      if (!template) {
        return false;
      }

      return isRewardBoundaryDay(template.weekBoundaryDay) && canFreezeRewardWeek(currentWeek?.kids || []);
    },
    [currentWeek?.kids, template],
  );

  const canUnfreezeCurrentWeek = useMemo(
    () => canUnfreezeRewardWeek(currentWeek?.kids || []),
    [currentWeek?.kids],
  );

  const value: RewardsContextType = {
    template,
    weekGroups,
    currentWeek,
    rewardSourceWeek,
    freezePreview,
    canFreezeCurrentWeek,
    canUnfreezeCurrentWeek,
    syncStatusByRecordId,
    isLoading,
    error,
    loadRewardsData,
    createTemplate,
    saveTemplate,
    saveKidsAndTitles,
    instantiateNextWeek,
    loadFreezePreview,
    freezeCurrentWeek,
    unfreezeCurrentWeek,
    openCurrentNextWeek,
    changeKidStep,
    commitTrackingChange,
    removeTrackingEntry,
    addNote,
    addManualReward,
    consumeReward,
    restoreReward,
    editRewardAvailability,
    saveWeekRecord,
    resetProgress,
  };

  return <RewardsContext.Provider value={value}>{children}</RewardsContext.Provider>;
};
