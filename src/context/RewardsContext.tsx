import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { usePartnership } from './PartnershipContext';
import {
  RewardDefinition,
  RewardTemplate,
  RewardWeekGroup,
  RewardWeekKidRecord,
} from '../types';
import {
  adjustRewardQuantity,
  addManualRewardToWeek,
  addRewardWeekNote,
  consumeSingleRewardUnit,
  createDefaultRewardsTemplate,
  freezeRewardWeek,
  getRewardWeekGroups,
  getRewardsTemplate,
  instantiateNextRewardWeek,
  openNextRewardWeek,
  resetRewardProgress,
  setKidStepDelta,
  updateRewardAvailability,
  updateRewardWeekKid,
  updateRewardsTemplate,
} from '../firebase/rewardServices';

type SyncState = 'idle' | 'pending' | 'synced' | 'error';

type RewardsContextType = {
  template: RewardTemplate | null;
  weekGroups: RewardWeekGroup[];
  currentWeek: RewardWeekGroup | null;
  rewardSourceWeek: RewardWeekGroup | null;
  syncStatusByRecordId: Record<string, SyncState>;
  isLoading: boolean;
  error: string | null;
  loadRewardsData: () => Promise<void>;
  createTemplate: () => Promise<void>;
  saveTemplate: (updates: Partial<RewardTemplate>) => Promise<void>;
  instantiateNextWeek: () => Promise<void>;
  freezeCurrentWeek: (carryForwardUnusedRewards: boolean) => Promise<void>;
  openCurrentNextWeek: (carryForwardLevel: boolean) => Promise<void>;
  changeKidStep: (recordId: string, delta: 1 | -1) => Promise<void>;
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
  const [syncStatusByRecordId, setSyncStatusByRecordId] = useState<Record<string, SyncState>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const markSyncState = useCallback((recordId: string, state: SyncState) => {
    setSyncStatusByRecordId((previous) => ({ ...previous, [recordId]: state }));
  }, []);

  const loadRewardsData = useCallback(async () => {
    if (!activePartnership) {
      setTemplate(null);
      setWeekGroups([]);
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

  const replaceRecord = useCallback((updatedRecord: RewardWeekKidRecord) => {
    setWeekGroups((previous) =>
      previous
        .map((group) =>
          group.weekOrder === updatedRecord.weekOrder
            ? {
                ...group,
                kids: group.kids
                  .map((kid) => (kid.id === updatedRecord.id ? updatedRecord : kid))
                  .sort((a, b) => a.kidName.localeCompare(b.kidName)),
              }
            : group,
        )
        .sort((a, b) => a.weekOrder - b.weekOrder),
    );
  }, []);

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

  const instantiateNextWeek = useCallback(async () => {
    if (!template) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const createdRecords = await instantiateNextRewardWeek(template);
      setWeekGroups((previous) =>
        [...previous, { weekOrder: createdRecords[0]?.weekOrder ?? previous.length, kids: createdRecords }]
          .sort((a, b) => a.weekOrder - b.weekOrder),
      );
    } catch (err) {
      console.error('Failed to instantiate next week', err);
      setError('Failed to instantiate next week');
    } finally {
      setIsLoading(false);
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
        updatedRecords.forEach(replaceRecord);
      } catch (err) {
        console.error('Failed to freeze current week', err);
        setError('Failed to freeze current week');
      } finally {
        setIsLoading(false);
      }
    },
    [replaceRecord, template],
  );

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
        result.openedRecords.forEach(replaceRecord);
      } catch (err) {
        console.error('Failed to open next week', err);
        setError(err instanceof Error ? err.message : 'Failed to open next week');
      } finally {
        setIsLoading(false);
      }
    },
    [replaceRecord, template],
  );

  const changeKidStep = useCallback(
    async (recordId: string, delta: 1 | -1) => {
      const existingRecord = weekGroups.flatMap((group) => group.kids).find((record) => record.id === recordId);
      if (!existingRecord) {
        return;
      }

      const nextRecord = { ...existingRecord };
      const maxStep = nextRecord.levels[nextRecord.currentLevel]?.stepCount || 1;

      if (delta > 0) {
        if (nextRecord.currentStep < maxStep) {
          nextRecord.currentStep += 1;
        } else if (nextRecord.currentLevel < nextRecord.levels.length - 1) {
          nextRecord.currentLevel += 1;
          nextRecord.currentStep = 1;
        }
      } else if (nextRecord.currentStep > 1) {
        nextRecord.currentStep -= 1;
      } else if (nextRecord.currentLevel > 0) {
        nextRecord.currentLevel -= 1;
        nextRecord.currentStep = nextRecord.levels[nextRecord.currentLevel].stepCount;
      }

      nextRecord.updatedAt = Date.now();
      replaceRecord(nextRecord);
      markSyncState(recordId, 'pending');

      try {
        const updatedRecord = await setKidStepDelta(recordId, delta, {
          currentLevel: existingRecord.currentLevel,
          currentStep: existingRecord.currentStep,
          updatedAt: existingRecord.updatedAt,
        });
        replaceRecord(updatedRecord);
        markSyncState(recordId, 'synced');
      } catch (err) {
        console.error('Failed to update step', err);
        await loadRewardsData();
        setError(err instanceof Error ? err.message : 'Failed to update step');
        markSyncState(recordId, 'error');
      }
    },
    [loadRewardsData, markSyncState, replaceRecord, weekGroups],
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

  const value: RewardsContextType = {
    template,
    weekGroups,
    currentWeek,
    rewardSourceWeek,
    syncStatusByRecordId,
    isLoading,
    error,
    loadRewardsData,
    createTemplate,
    saveTemplate,
    instantiateNextWeek,
    freezeCurrentWeek,
    openCurrentNextWeek,
    changeKidStep,
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
