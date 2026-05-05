import { firestoreService } from './firestore';
import {
  RewardDefinition,
  RewardInstance,
  RewardKid,
  RewardLevel,
  RewardTemplate,
  RewardWeekGroup,
  RewardWeekKidRecord,
} from '../types';

const rewardTemplatesCollection = firestoreService.collection('rewardTemplates');
const rewardWeekKidsCollection = firestoreService.collection('rewardWeekKids');

const createId = () => crypto.randomUUID();

type StepExpectation = Pick<RewardWeekKidRecord, 'currentLevel' | 'currentStep'> & {
  updatedAt?: number;
};

type RewardQuantityExpectation = {
  remainingQuantity: number;
};

const deepCloneLevels = (levels: RewardLevel[]): RewardLevel[] =>
  levels.map((level) => ({
    ...level,
    rewards: level.rewards.map((reward) => ({ ...reward })),
  }));

const dedupeWeekRecords = (records: RewardWeekKidRecord[]): RewardWeekKidRecord[] => {
  const latestByKidWeek = new Map<string, RewardWeekKidRecord>();

  records.forEach((record) => {
    const key = `${record.weekOrder}:${record.kidId}`;
    const existing = latestByKidWeek.get(key);
    if (!existing || existing.updatedAt < record.updatedAt) {
      latestByKidWeek.set(key, record);
    }
  });

  return Array.from(latestByKidWeek.values());
};

const mergeRewardInstances = (rewards: RewardInstance[]): RewardInstance[] => {
  const merged = new Map<string, RewardInstance>();

  rewards.forEach((reward) => {
    const key = [
      reward.title.trim().toLowerCase(),
      reward.description?.trim().toLowerCase() || '',
      reward.amountUnit?.trim().toLowerCase() || '',
    ].join('|');

    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, { ...reward });
      return;
    }

    existing.quantity += reward.quantity;
    existing.remainingQuantity += reward.remainingQuantity;
    if (existing.amount !== undefined || reward.amount !== undefined) {
      existing.amount = (existing.amount || 0) + (reward.amount || 0);
    }
    if (existing.remainingAmount !== undefined || reward.remainingAmount !== undefined) {
      existing.remainingAmount = (existing.remainingAmount || 0) + (reward.remainingAmount || 0);
    }
    existing.isCarryForward = existing.isCarryForward || reward.isCarryForward;
    if (existing.source !== reward.source) {
      existing.source = reward.isCarryForward ? 'carry_forward' : existing.source;
    }
  });

  return Array.from(merged.values());
};

const toRewardInstance = (
  reward: RewardDefinition,
  source: RewardInstance['source'],
  isCarryForward = false,
): RewardInstance => {
  const totalAmount = reward.amount !== undefined ? reward.amount * reward.quantity : undefined;

  return {
    id: createId(),
    title: reward.title,
    description: reward.description,
    quantity: reward.quantity,
    remainingQuantity: reward.quantity,
    amount: totalAmount,
    remainingAmount: totalAmount,
    amountUnit: reward.amountUnit,
    source,
    isCarryForward,
  };
};

const createDefaultLevel = (index: number): RewardLevel => ({
  id: createId(),
  name: `Level ${index + 1}`,
  stepCount: 5,
  rewards: [],
});

export const createDefaultRewardsTemplate = async (
  partnershipId: string,
  userId: string,
): Promise<RewardTemplate> => {
  const templateId = createId();
  const now = Date.now();
  const template: RewardTemplate = {
    id: templateId,
    partnershipId,
    createdBy: userId,
    createdAt: now,
    updatedAt: now,
    weekBoundaryDay: 5,
    defaultStartLevel: 0,
    currentWeekOrder: 0,
    kids: [],
    levels: [createDefaultLevel(0), createDefaultLevel(1), createDefaultLevel(2)],
    standbyRewards: [],
  };

  await firestoreService.setDoc(firestoreService.doc(rewardTemplatesCollection, templateId), template);
  return template;
};

export const getRewardsTemplate = async (partnershipId: string): Promise<RewardTemplate | null> => {
  const querySnapshot = await firestoreService.getDocs(
    firestoreService.query(
      rewardTemplatesCollection,
      firestoreService.where('partnershipId', '==', partnershipId),
    ),
  );

  const doc = querySnapshot.docs[0];
  return doc ? (doc.data() as RewardTemplate) : null;
};

export const updateRewardsTemplate = async (
  templateId: string,
  updates: Partial<RewardTemplate>,
): Promise<void> => {
  await firestoreService.updateDoc(firestoreService.doc(rewardTemplatesCollection, templateId), {
    ...updates,
    updatedAt: Date.now(),
  });
};

export const getRewardWeekRecords = async (partnershipId: string): Promise<RewardWeekKidRecord[]> => {
  const querySnapshot = await firestoreService.getDocs(
    firestoreService.query(
      rewardWeekKidsCollection,
      firestoreService.where('partnershipId', '==', partnershipId),
    ),
  );

  return dedupeWeekRecords(
    querySnapshot.docs.map((doc: any) => doc.data() as RewardWeekKidRecord),
  )
    .sort((a, b) => a.weekOrder - b.weekOrder || a.kidName.localeCompare(b.kidName));
};

export const getRewardWeekGroups = async (partnershipId: string): Promise<RewardWeekGroup[]> => {
  const records = await getRewardWeekRecords(partnershipId);
  const grouped = new Map<number, RewardWeekKidRecord[]>();

  records.forEach((record) => {
    const existing = grouped.get(record.weekOrder) || [];
    existing.push(record);
    grouped.set(record.weekOrder, existing);
  });

  return Array.from(grouped.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([weekOrder, kids]) => ({ weekOrder, kids }));
};

export const instantiateNextRewardWeek = async (template: RewardTemplate): Promise<RewardWeekKidRecord[]> => {
  const existingRecords = await getRewardWeekRecords(template.partnershipId);
  const highestWeekOrder = existingRecords.reduce((max, record) => Math.max(max, record.weekOrder), -1);
  const nextWeekOrder = highestWeekOrder + 1;
  const now = Date.now();

  const records = template.kids.map((kid: RewardKid) => {
    const record: RewardWeekKidRecord = {
      id: createId(),
      partnershipId: template.partnershipId,
      templateId: template.id,
      weekOrder: nextWeekOrder,
      kidId: kid.id,
      kidName: kid.name,
      createdAt: now,
      updatedAt: now,
      openedAt: nextWeekOrder === template.currentWeekOrder ? now : undefined,
      levels: deepCloneLevels(template.levels),
      currentLevel: Math.min(template.defaultStartLevel, Math.max(template.levels.length - 1, 0)),
      currentStep: 1,
      manualRewards: [],
      earnedRewards: [],
      notes: [],
    };

    return record;
  });

  await Promise.all(
    records.map((record) =>
      firestoreService.setDoc(firestoreService.doc(rewardWeekKidsCollection, record.id), record),
    ),
  );

  return records;
};

export const updateRewardWeekKid = async (
  recordId: string,
  updates: Partial<RewardWeekKidRecord>,
): Promise<void> => {
  await firestoreService.updateDoc(firestoreService.doc(rewardWeekKidsCollection, recordId), {
    ...updates,
    updatedAt: Date.now(),
  });
};

export const setKidStepDelta = async (
  recordId: string,
  delta: 1 | -1,
  expectation?: StepExpectation,
): Promise<RewardWeekKidRecord> => {
  const recordRef = firestoreService.doc(rewardWeekKidsCollection, recordId);

  return firestoreService.runTransaction(async (transaction: any) => {
    const snap = await transaction.get(recordRef);
    if (!snap.exists()) {
      throw new Error('Reward week record not found');
    }

    const record = snap.data() as RewardWeekKidRecord;
    if (
      expectation &&
      (record.currentLevel !== expectation.currentLevel ||
        record.currentStep !== expectation.currentStep ||
        (expectation.updatedAt !== undefined && record.updatedAt !== expectation.updatedAt))
    ) {
      throw new Error('Reward week record changed before update completed');
    }
    let currentLevel = record.currentLevel;
    let currentStep = record.currentStep;

    if (delta > 0) {
      const maxStep = record.levels[currentLevel]?.stepCount || 1;
      if (currentStep < maxStep) {
        currentStep += 1;
      } else if (currentLevel < record.levels.length - 1) {
        currentLevel += 1;
        currentStep = 1;
      }
    } else {
      if (currentStep > 1) {
        currentStep -= 1;
      } else if (currentLevel > 0) {
        currentLevel -= 1;
        currentStep = record.levels[currentLevel].stepCount;
      }
    }

    const updatedRecord = {
      ...record,
      currentLevel,
      currentStep,
      updatedAt: Date.now(),
    };

    transaction.update(recordRef, updatedRecord);
    return updatedRecord;
  }) as Promise<RewardWeekKidRecord>;
};

export const adjustRewardQuantity = async (
  recordId: string,
  rewardId: string,
  delta: 1 | -1,
  expectation?: RewardQuantityExpectation,
): Promise<RewardWeekKidRecord> => {
  const recordRef = firestoreService.doc(rewardWeekKidsCollection, recordId);

  return firestoreService.runTransaction(async (transaction: any) => {
    const snap = await transaction.get(recordRef);
    if (!snap.exists()) {
      throw new Error('Reward week record not found');
    }

    const record = snap.data() as RewardWeekKidRecord;
    let rewardFound = false;

    const earnedRewards = record.earnedRewards.map((reward) => {
      if (reward.id !== rewardId) {
        return reward;
      }

      rewardFound = true;
      if (reward.amount !== undefined) {
        throw new Error('Amount rewards must be edited directly');
      }

      if (expectation && reward.remainingQuantity !== expectation.remainingQuantity) {
        throw new Error('Reward availability changed before update completed');
      }

      return {
        ...reward,
        remainingQuantity: Math.max(0, Math.min(reward.quantity, reward.remainingQuantity + delta)),
      };
    });

    if (!rewardFound) {
      throw new Error('Reward not found');
    }

    const updatedRecord = {
      ...record,
      earnedRewards,
      updatedAt: Date.now(),
    };

    transaction.update(recordRef, updatedRecord);
    return updatedRecord;
  }) as Promise<RewardWeekKidRecord>;
};

export const addRewardWeekNote = async (
  recordId: string,
  type: 'good' | 'bad',
  text: string,
): Promise<RewardWeekKidRecord> => {
  const snap = await firestoreService.getDoc(firestoreService.doc(rewardWeekKidsCollection, recordId));
  if (!snap.exists()) {
    throw new Error('Reward week record not found');
  }

  const record = snap.data() as RewardWeekKidRecord;
  const updatedRecord: RewardWeekKidRecord = {
    ...record,
    notes: [
      {
        id: createId(),
        type,
        text,
        createdAt: Date.now(),
      },
      ...record.notes,
    ],
    updatedAt: Date.now(),
  };

  await firestoreService.setDoc(firestoreService.doc(rewardWeekKidsCollection, recordId), updatedRecord);
  return updatedRecord;
};

export const addManualRewardToWeek = async (
  recordId: string,
  reward: RewardDefinition,
): Promise<RewardWeekKidRecord> => {
  const snap = await firestoreService.getDoc(firestoreService.doc(rewardWeekKidsCollection, recordId));
  if (!snap.exists()) {
    throw new Error('Reward week record not found');
  }

  const record = snap.data() as RewardWeekKidRecord;
  const updatedRecord: RewardWeekKidRecord = {
    ...record,
    manualRewards: [...record.manualRewards, toRewardInstance(reward, 'manual')],
    updatedAt: Date.now(),
  };

  await firestoreService.setDoc(firestoreService.doc(rewardWeekKidsCollection, recordId), updatedRecord);
  return updatedRecord;
};

export const updateRewardAvailability = async (
  recordId: string,
  rewardId: string,
  updates: Pick<RewardInstance, 'remainingQuantity' | 'remainingAmount'>,
): Promise<RewardWeekKidRecord> => {
  const snap = await firestoreService.getDoc(firestoreService.doc(rewardWeekKidsCollection, recordId));
  if (!snap.exists()) {
    throw new Error('Reward week record not found');
  }

  const record = snap.data() as RewardWeekKidRecord;
  const earnedRewards = record.earnedRewards.map((reward) =>
    reward.id === rewardId
      ? {
          ...reward,
          remainingQuantity: Math.max(0, updates.remainingQuantity),
          remainingAmount:
            updates.remainingAmount === undefined ? reward.remainingAmount : Math.max(0, updates.remainingAmount),
        }
      : reward,
  );

  const updatedRecord = {
    ...record,
    earnedRewards,
    updatedAt: Date.now(),
  };

  await firestoreService.setDoc(firestoreService.doc(rewardWeekKidsCollection, recordId), updatedRecord);
  return updatedRecord;
};

export const consumeSingleRewardUnit = async (
  recordId: string,
  rewardId: string,
): Promise<RewardWeekKidRecord> => {
  return adjustRewardQuantity(recordId, rewardId, -1);
};

const buildCumulativeRewards = (record: RewardWeekKidRecord): RewardInstance[] => {
  const unlockedLevels = record.levels.slice(0, record.currentLevel + 1);
  const levelRewards = unlockedLevels.flatMap((level) =>
    level.rewards.map((reward) => toRewardInstance(reward, 'level')),
  );

  return mergeRewardInstances(levelRewards);
};

const getUnusedRewardsForCarryForward = (record: RewardWeekKidRecord): RewardInstance[] =>
  record.earnedRewards
    .filter((reward) => {
      if (reward.amount !== undefined) {
        return (reward.remainingAmount || 0) > 0;
      }

      return reward.remainingQuantity > 0;
    })
    .map((reward) => ({
      ...reward,
      id: createId(),
      source: 'carry_forward',
      isCarryForward: true,
    }));

export const freezeRewardWeek = async (
  partnershipId: string,
  weekOrder: number,
  carryForwardUnusedRewards: boolean,
): Promise<RewardWeekKidRecord[]> => {
  const allRecords = await getRewardWeekRecords(partnershipId);
  const currentWeekRecords = allRecords.filter((record) => record.weekOrder === weekOrder);
  const previousWeekRecords = allRecords.filter((record) => record.weekOrder === weekOrder - 1);

  const updatedRecords = currentWeekRecords.map((record) => {
    const previousRecord = previousWeekRecords.find((item) => item.kidId === record.kidId);
    const carryForwardRewards =
      carryForwardUnusedRewards && previousRecord ? getUnusedRewardsForCarryForward(previousRecord) : [];
    const mergedRewards = mergeRewardInstances([
      ...buildCumulativeRewards(record),
      ...carryForwardRewards,
    ]);

    return {
      ...record,
      earnedRewards: mergedRewards,
      frozenAt: Date.now(),
      updatedAt: Date.now(),
    };
  });

  await Promise.all(
    updatedRecords.map((record) =>
      firestoreService.setDoc(firestoreService.doc(rewardWeekKidsCollection, record.id), record),
    ),
  );

  return updatedRecords;
};

export const openNextRewardWeek = async (
  template: RewardTemplate,
  carryForwardLevel: boolean,
): Promise<{ template: RewardTemplate; openedRecords: RewardWeekKidRecord[] }> => {
  const allRecords = await getRewardWeekRecords(template.partnershipId);
  const currentRecords = allRecords.filter((record) => record.weekOrder === template.currentWeekOrder);
  const nextWeekOrder = template.currentWeekOrder + 1;
  const nextRecords = allRecords.filter((record) => record.weekOrder === nextWeekOrder);

  if (nextRecords.length === 0) {
    throw new Error('Instantiate the next week before opening it');
  }

  const now = Date.now();
  const openedRecords = nextRecords.map((record) => {
    const currentRecord = currentRecords.find((item) => item.kidId === record.kidId);
    const carriedLevel = carryForwardLevel && currentRecord ? currentRecord.currentLevel : template.defaultStartLevel;

    return {
      ...record,
      currentLevel: Math.min(carriedLevel, Math.max(record.levels.length - 1, 0)),
      currentStep: 1,
      openedAt: now,
      updatedAt: now,
    };
  });

  await Promise.all(
    openedRecords.map((record) =>
      firestoreService.setDoc(firestoreService.doc(rewardWeekKidsCollection, record.id), record),
    ),
  );

  const updatedTemplate = {
    ...template,
    currentWeekOrder: nextWeekOrder,
    updatedAt: now,
  };

  await firestoreService.setDoc(firestoreService.doc(rewardTemplatesCollection, template.id), updatedTemplate);

  return {
    template: updatedTemplate,
    openedRecords,
  };
};

export const resetRewardProgress = async (
  partnershipId: string,
  templateId: string,
): Promise<void> => {
  const records = await getRewardWeekRecords(partnershipId);

  await Promise.all(
    records.map((record) =>
      firestoreService.deleteDoc(firestoreService.doc(rewardWeekKidsCollection, record.id)),
    ),
  );

  await updateRewardsTemplate(templateId, { currentWeekOrder: 0 });
};
