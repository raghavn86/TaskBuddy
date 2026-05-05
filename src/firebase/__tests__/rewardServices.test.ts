import {
  adjustRewardQuantity,
  addManualRewardToWeek,
  addRewardWeekNote,
  consumeSingleRewardUnit,
  createDefaultRewardsTemplate,
  freezeRewardWeek,
  getRewardWeekGroups,
  getRewardWeekRecords,
  getRewardsTemplate,
  instantiateNextRewardWeek,
  openNextRewardWeek,
  resetRewardProgress,
  setKidStepDelta,
  syncCurrentAndFutureRewardWeeksFromTemplate,
  updateRewardsTemplate,
} from '../rewardServices';
import { firestoreService } from '../firestore';
import { RewardTemplate } from '../../types';

jest.mock('../firestore');

const mockFirestoreService = firestoreService as any;

describe('rewardServices', () => {
  beforeEach(() => {
    mockFirestoreService.clearData();
  });

  const buildTemplate = async () => {
    const template = await createDefaultRewardsTemplate('partnership-1', 'user-1');

    const updatedTemplate: RewardTemplate = {
      ...template,
      kids: [
        { id: 'kid-a', name: 'Ava', titleIds: [] },
        { id: 'kid-b', name: 'Ben', titleIds: [] },
      ],
      titles: [{ id: 'title-1', name: 'Drawing Expert', stepBoost: 2 }],
      levels: [
        {
          id: 'level-1',
          name: 'Level 1',
          stepCount: 2,
          rewards: [
            { id: 'reward-1', title: 'Sticker', quantity: 1 },
            { id: 'reward-2', title: 'TV Time', quantity: 1, amount: 30, amountUnit: 'mins' },
          ],
        },
        {
          id: 'level-2',
          name: 'Level 2',
          stepCount: 2,
          rewards: [{ id: 'reward-3', title: 'Sticker', quantity: 2 }],
        },
      ],
    };

    await updateRewardsTemplate(template.id, updatedTemplate);
    return updatedTemplate;
  };

  it('creates and loads a rewards template', async () => {
    const template = await createDefaultRewardsTemplate('partnership-1', 'user-1');

    const loadedTemplate = await getRewardsTemplate('partnership-1');

    expect(loadedTemplate).not.toBeNull();
    expect(loadedTemplate!.id).toBe(template.id);
    expect(loadedTemplate!.weekBoundaryDay).toBe(5);
    expect(loadedTemplate!.levels).toHaveLength(3);
    expect(loadedTemplate!.titles).toEqual([]);
  });

  it('instantiates weekly kid records grouped by week order', async () => {
    const template = await buildTemplate();

    const records = await instantiateNextRewardWeek(template);
    const groups = await getRewardWeekGroups(template.partnershipId);

    expect(records).toHaveLength(2);
    expect(records.every((record) => record.weekOrder === 0)).toBe(true);
    expect(groups).toHaveLength(1);
    expect(groups[0].weekOrder).toBe(0);
    expect(groups[0].kids.map((kid) => kid.kidName)).toEqual(['Ava', 'Ben']);
    expect(records.find((record) => record.kidId === 'kid-a')?.currentStep).toBe(1);
  });

  it('moves steps across level boundaries and clamps at limits', async () => {
    const template = await buildTemplate();
    const [record] = await instantiateNextRewardWeek(template);

    const firstUp = await setKidStepDelta(record.id, 1);
    expect(firstUp.currentLevel).toBe(0);
    expect(firstUp.currentStep).toBe(2);

    const secondUp = await setKidStepDelta(record.id, 1);
    expect(secondUp.currentLevel).toBe(1);
    expect(secondUp.currentStep).toBe(1);

    const down = await setKidStepDelta(record.id, -1);
    expect(down.currentLevel).toBe(0);
    expect(down.currentStep).toBe(2);

    const clamped = await setKidStepDelta(record.id, -1);
    const clampedAgain = await setKidStepDelta(clamped.id, -1);
    expect(clampedAgain.currentLevel).toBe(0);
    expect(clampedAgain.currentStep).toBe(1);
  });

  it('freezes a week into cumulative earned rewards and carries unused rewards forward', async () => {
    const template = await buildTemplate();
    const week0 = await instantiateNextRewardWeek(template);
    const avaWeek0 = week0.find((record) => record.kidId === 'kid-a')!;

    await setKidStepDelta(avaWeek0.id, 1);
    await setKidStepDelta(avaWeek0.id, 1);
    const frozenWeek0 = await freezeRewardWeek(template.partnershipId, 0, false);
    const avaFrozenWeek0 = frozenWeek0.find((record) => record.kidId === 'kid-a')!;

    expect(avaFrozenWeek0.earnedRewards).toHaveLength(2);
    expect(avaFrozenWeek0.earnedRewards.find((reward) => reward.title === 'Sticker')?.quantity).toBe(3);
    expect(avaFrozenWeek0.earnedRewards.find((reward) => reward.title === 'Sticker')?.remainingQuantity).toBe(3);
    expect(avaFrozenWeek0.earnedRewards.find((reward) => reward.title === 'TV Time')?.amount).toBe(30);

    await instantiateNextRewardWeek(template);
    const reopenedTemplate = (await getRewardsTemplate(template.partnershipId))!;
    await openNextRewardWeek(reopenedTemplate, false);

    const templateAfterOpen = (await getRewardsTemplate(template.partnershipId))!;
    const nextWeekRecords = await getRewardWeekRecords(template.partnershipId);
    const previousWeek0 = nextWeekRecords.find(
      (record) => record.weekOrder === 0 && record.kidId === 'kid-a',
    )!;
    expect(previousWeek0.earnedRewards.find((reward) => reward.title === 'Sticker')?.remainingQuantity).toBe(3);
    const currentWeek1 = nextWeekRecords.find(
      (record) => record.weekOrder === templateAfterOpen.currentWeekOrder && record.kidId === 'kid-a',
    )!;

    await setKidStepDelta(currentWeek1.id, 1);
    const frozenWeek1 = await freezeRewardWeek(template.partnershipId, 1, true);
    const avaFrozenWeek1 = frozenWeek1.find((record) => record.kidId === 'kid-a')!;
    const stickerReward = avaFrozenWeek1.earnedRewards.find((reward) => reward.title === 'Sticker')!;

    expect(avaFrozenWeek1.earnedRewards).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: 'Sticker', quantity: 4, isCarryForward: true }),
      ]),
    );
    expect(stickerReward.isCarryForward).toBe(true);
  });

  it('opens the next week and optionally carries only the level forward', async () => {
    const template = await buildTemplate();
    const [week0Record] = await instantiateNextRewardWeek(template);

    await setKidStepDelta(week0Record.id, 1);
    await setKidStepDelta(week0Record.id, 1);
    await instantiateNextRewardWeek(template);

    const storedTemplate = (await getRewardsTemplate(template.partnershipId))!;
    const { template: openedTemplate, openedRecords } = await openNextRewardWeek(storedTemplate, true);
    const openedAva = openedRecords.find((record) => record.kidId === 'kid-a')!;

    expect(openedTemplate.currentWeekOrder).toBe(1);
    expect(openedAva.currentLevel).toBe(1);
    expect(openedAva.currentStep).toBe(1);
  });

  it('supports notes, manual rewards, and reward consumption', async () => {
    const template = await buildTemplate();
    const [record] = await instantiateNextRewardWeek(template);

    const noted = await addRewardWeekNote(record.id, 'good', 'Helped clean up');
    expect(noted.notes[0].text).toBe('Helped clean up');

    const withManualReward = await addManualRewardToWeek(record.id, {
      id: 'manual-1',
      title: 'Bonus Choice',
      quantity: 2,
    });
    expect(withManualReward.manualRewards).toHaveLength(1);
    expect(withManualReward.manualRewards[0].remainingQuantity).toBe(2);

    await freezeRewardWeek(template.partnershipId, 0, false);
    const frozenRecord = (await getRewardWeekRecords(template.partnershipId)).find((item) => item.id === record.id)!;
    const stickerReward = frozenRecord.earnedRewards.find((reward) => reward.title === 'Sticker')!;

    const consumed = await consumeSingleRewardUnit(frozenRecord.id, stickerReward.id);
    const consumedReward = consumed.earnedRewards.find((reward) => reward.id === stickerReward.id)!;
    expect(consumedReward.remainingQuantity).toBe(stickerReward.remainingQuantity - 1);

    const restored = await adjustRewardQuantity(frozenRecord.id, stickerReward.id, 1, {
      remainingQuantity: consumedReward.remainingQuantity,
    });
    const restoredReward = restored.earnedRewards.find((reward) => reward.id === stickerReward.id)!;
    expect(restoredReward.remainingQuantity).toBe(stickerReward.remainingQuantity);
  });

  it('rejects optimistic step updates when the source state changed', async () => {
    const template = await buildTemplate();
    const [record] = await instantiateNextRewardWeek(template);

    await setKidStepDelta(record.id, 1);

    await expect(
      setKidStepDelta(record.id, 1, {
        currentLevel: record.currentLevel,
        currentStep: record.currentStep,
        updatedAt: record.updatedAt,
      }),
    ).rejects.toThrow('Reward week record changed before update completed');
  });

  it('can reset reward progress without deleting the template', async () => {
    const template = await buildTemplate();
    await instantiateNextRewardWeek(template);

    await resetRewardProgress(template.partnershipId, template.id);

    const records = await getRewardWeekRecords(template.partnershipId);
    const storedTemplate = await getRewardsTemplate(template.partnershipId);

    expect(records).toHaveLength(0);
    expect(storedTemplate?.currentWeekOrder).toBe(0);
  });

  it('syncs current and future records when title assignments change', async () => {
    const template = await buildTemplate();
    await instantiateNextRewardWeek(template);
    await instantiateNextRewardWeek(template);

    const updatedTemplate: RewardTemplate = {
      ...template,
      titles: [...template.titles, { id: 'title-2', name: 'Helper', stepBoost: 1 }],
      kids: template.kids.map((kid) =>
        kid.id === 'kid-a' ? { ...kid, titleIds: ['title-1'] } : kid.id === 'kid-b' ? { ...kid, titleIds: ['title-2'] } : kid,
      ),
    };

    const synced = await syncCurrentAndFutureRewardWeeksFromTemplate(updatedTemplate);
    const benCurrent = synced.find((record) => record.kidId === 'kid-b' && record.weekOrder === 0)!;
    const avaCurrent = synced.find((record) => record.kidId === 'kid-a' && record.weekOrder === 0)!;

    expect(benCurrent.titleIds).toEqual(['title-2']);
    expect(benCurrent.appliedTitleBoost).toBe(1);
    expect(benCurrent.currentStep).toBe(2);
    expect(avaCurrent.titleIds).toEqual(['title-1']);
    expect(avaCurrent.currentStep).toBe(2);
  });
});
