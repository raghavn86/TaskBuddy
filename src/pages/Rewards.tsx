import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Fab,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  AutoAwesome as AutoAwesomeIcon,
  CheckCircleOutline as SyncedIcon,
  DeleteOutline as DeleteIcon,
  EditOutlined as EditIcon,
  ErrorOutline as ErrorIcon,
  MoreHoriz as ActionsIcon,
  Remove as RemoveIcon,
  RestartAlt as ResetIcon,
  Sync as SyncIcon,
  Tune as EditModeIcon,
} from '@mui/icons-material';
import Loading from '../components/common/Loading';
import { useRewards } from '../context/RewardsContext';
import { RewardDefinition, RewardInstance, RewardKid, RewardLevel, RewardNote, RewardTitle, RewardWeekGroup, RewardWeekKidRecord } from '../types';

type ExecuteTab = 'levels' | 'current' | 'last';
type SurfaceMode = 'execute' | 'edit';
type EditSection = 'manage' | 'kids' | 'template';
type RewardEditorMode = 'template-level' | 'template-standby' | 'week-level' | 'week-manual';

type RewardEditorState = {
  mode: RewardEditorMode;
  recordId?: string;
  levelId?: string;
  rewardId?: string;
  reward?: RewardDefinition;
} | null;

type StepDialogState = {
  scope: 'template' | 'week';
  levelId: string;
  levelLabel: string;
  value: string;
  recordId?: string;
} | null;

type KidAccent = {
  solid: string;
  soft: string;
  softBorder: string;
  towerStrong: string;
  towerSoft: string;
  text: string;
};

const dayOptions = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

const kidAccents: KidAccent[] = [
  { solid: '#1f6f5f', soft: 'rgba(31,111,95,0.12)', softBorder: 'rgba(31,111,95,0.28)', towerStrong: '#2e8b77', towerSoft: 'rgba(46,139,119,0.18)', text: '#12473c' },
  { solid: '#b15c1d', soft: 'rgba(177,92,29,0.12)', softBorder: 'rgba(177,92,29,0.28)', towerStrong: '#d47b2c', towerSoft: 'rgba(212,123,44,0.18)', text: '#6e3c11' },
  { solid: '#5c4ab2', soft: 'rgba(92,74,178,0.12)', softBorder: 'rgba(92,74,178,0.28)', towerStrong: '#7868d8', towerSoft: 'rgba(120,104,216,0.18)', text: '#372c72' },
  { solid: '#9a314f', soft: 'rgba(154,49,79,0.12)', softBorder: 'rgba(154,49,79,0.28)', towerStrong: '#c44a71', towerSoft: 'rgba(196,74,113,0.18)', text: '#6b1e36' },
  { solid: '#345f96', soft: 'rgba(52,95,150,0.12)', softBorder: 'rgba(52,95,150,0.28)', towerStrong: '#4e7fbd', towerSoft: 'rgba(78,127,189,0.18)', text: '#1f3b61' },
];

const buildDraft = (reward?: RewardDefinition) => ({
  id: reward?.id || crypto.randomUUID(),
  title: reward?.title || '',
  description: reward?.description || '',
  quantity: String(reward?.quantity || 1),
  amount: reward?.amount === undefined ? '' : String(reward.amount),
  amountUnit: reward?.amountUnit || '',
});

const formatReward = (reward: RewardDefinition | RewardInstance) => {
  const qty = reward.quantity > 1 ? ` x${reward.quantity}` : '';
  const amount = reward.amount !== undefined && reward.amountUnit ? ` • ${reward.amount}${reward.amountUnit}` : '';
  return `${reward.title}${amount}${qty}`;
};

const formatRemaining = (reward: RewardInstance) =>
  reward.amount !== undefined && reward.amountUnit
    ? `${reward.remainingAmount || 0}${reward.amountUnit} left`
    : `${reward.remainingQuantity} left`;

const buildPlaceholderReward = (label: string): RewardDefinition => ({
  id: crypto.randomUUID(),
  title: `${label} ${Math.floor(Math.random() * 900) + 100}`,
  quantity: 1,
});

const buildPlaceholderTitle = (): RewardTitle => ({
  id: crypto.randomUUID(),
  name: `Title ${Math.floor(Math.random() * 90) + 10}`,
  stepBoost: 1,
});

const dedupeKidRecords = (records: RewardWeekKidRecord[]): RewardWeekKidRecord[] => {
  const latestByKid = new Map<string, RewardWeekKidRecord>();

  records.forEach((record) => {
    const existing = latestByKid.get(record.kidId);
    if (!existing || existing.updatedAt < record.updatedAt) {
      latestByKid.set(record.kidId, record);
    }
  });

  return Array.from(latestByKid.values()).sort((a, b) => a.kidName.localeCompare(b.kidName));
};

const getKidAccent = (kidId: string): KidAccent => {
  const hash = kidId.split('').reduce((total, character) => total + character.charCodeAt(0), 0);
  return kidAccents[hash % kidAccents.length];
};

const getSyncLabel = (state?: string) => {
  if (state === 'pending') return 'Pending';
  if (state === 'error') return 'Retry needed';
  return 'Synced';
};

const getSyncIcon = (state?: string) => {
  if (state === 'pending') return <SyncIcon sx={{ fontSize: 16 }} />;
  if (state === 'error') return <ErrorIcon sx={{ fontSize: 16 }} />;
  return <SyncedIcon sx={{ fontSize: 16 }} />;
};

const formatWeekChip = (group: RewardWeekGroup, currentWeekOrder: number) =>
  group.weekOrder === currentWeekOrder ? 'Current' : `W${group.weekOrder + 1}`;

const LevelTower: React.FC<{
  levels: RewardLevel[];
  currentLevel: number;
  currentStep: number;
  accent: KidAccent;
}> = ({ levels, currentLevel, currentStep, accent }) => (
  <Stack direction="row" spacing={0.85} alignItems="flex-end" sx={{ minHeight: 108 }}>
    {levels.map((level, index) => {
      const isCurrent = index === currentLevel;
      const isUnlocked = index <= currentLevel;
      const height = 42 + index * 13;
      return (
        <Box
          key={level.id}
          sx={{
            flex: 1,
            minWidth: 0,
            height,
            borderRadius: '16px 16px 8px 8px',
            border: '1px solid',
            borderColor: isCurrent ? accent.solid : isUnlocked ? accent.softBorder : 'divider',
            background: isCurrent
              ? `linear-gradient(180deg, ${accent.towerStrong} 0%, ${accent.solid} 100%)`
              : isUnlocked
                ? `linear-gradient(180deg, ${accent.soft} 0%, ${accent.towerSoft} 100%)`
                : 'linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(230,230,230,0.48) 100%)',
            color: isCurrent ? '#fff' : accent.text,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            px: 0.75,
            py: 0.7,
            boxShadow: isCurrent ? `0 14px 20px ${accent.softBorder}` : 'none',
            transform: isCurrent ? 'translateY(-5px)' : 'none',
            transition: 'all 180ms ease',
          }}
        >
          <Typography variant="caption" sx={{ fontWeight: 800, lineHeight: 1 }}>
            {index + 1}
          </Typography>
          {isCurrent ? (
            <Stack direction="row" spacing={0.35} justifyContent="center" alignItems="center">
              {Array.from({ length: level.stepCount }).map((_, dotIndex) => (
                <Box
                  key={`${level.id}-${dotIndex}`}
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    backgroundColor: dotIndex < currentStep ? '#fff' : 'rgba(255,255,255,0.35)',
                  }}
                />
              ))}
            </Stack>
          ) : (
            <Box sx={{ height: 8 }} />
          )}
        </Box>
      );
    })}
  </Stack>
);

const Rewards: React.FC = () => {
  const {
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
    createTemplate,
    saveTemplate,
    saveKidsAndTitles,
    instantiateNextWeek,
    loadFreezePreview,
    freezeCurrentWeek,
    unfreezeCurrentWeek,
    openCurrentNextWeek,
    changeKidStep,
    addNote,
    addManualReward,
    consumeReward,
    restoreReward,
    editRewardAvailability,
    saveWeekRecord,
    resetProgress,
  } = useRewards();

  const [surfaceMode, setSurfaceMode] = useState<SurfaceMode>('execute');
  const [executeTab, setExecuteTab] = useState<ExecuteTab>('levels');
  const [editSection, setEditSection] = useState<EditSection>('manage');
  const [manageWeek, setManageWeek] = useState(0);
  const [kidName, setKidName] = useState('');
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [rewardDialog, setRewardDialog] = useState<RewardEditorState>(null);
  const [rewardDraft, setRewardDraft] = useState(buildDraft());
  const [availabilityDialog, setAvailabilityDialog] = useState<null | { recordId: string; reward: RewardInstance }>(
    null,
  );
  const [availabilityDraft, setAvailabilityDraft] = useState({ quantity: '0', amount: '' });
  const [stepDialog, setStepDialog] = useState<StepDialogState>(null);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [freezeDialogOpen, setFreezeDialogOpen] = useState(false);
  const [freezeCarryForward, setFreezeCarryForward] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  const orderedWeeks = useMemo(() => [...weekGroups].sort((a, b) => a.weekOrder - b.weekOrder), [weekGroups]);
  const visibleCurrentKids = useMemo(() => dedupeKidRecords(currentWeek?.kids || []), [currentWeek?.kids]);
  const visibleRewardSourceKids = useMemo(() => dedupeKidRecords(rewardSourceWeek?.kids || []), [rewardSourceWeek?.kids]);
  const selectedManageGroup =
    orderedWeeks.find((group) => group.weekOrder === manageWeek) || orderedWeeks[0] || null;
  const visibleManageKids = useMemo(
    () => dedupeKidRecords(selectedManageGroup?.kids || []),
    [selectedManageGroup?.kids],
  );

  useEffect(() => {
    setManageWeek(template?.currentWeekOrder || 0);
  }, [template?.currentWeekOrder]);

  const canOpenNextWeek = Boolean(
    template &&
      visibleCurrentKids.length > 0 &&
      visibleCurrentKids.every((record) => Boolean(record.frozenAt)) &&
      orderedWeeks.some((group) => group.weekOrder === template.currentWeekOrder + 1),
  );
  const titleNameMap = useMemo(
    () => new Map((template?.titles || []).map((title) => [title.id, title.name])),
    [template?.titles],
  );

  const toReward = (): RewardDefinition => ({
    id: rewardDraft.id,
    title: rewardDraft.title.trim(),
    description: rewardDraft.description.trim() || undefined,
    quantity: Math.max(1, Number(rewardDraft.quantity) || 1),
    amount: rewardDraft.amount === '' ? undefined : Math.max(0, Number(rewardDraft.amount) || 0),
    amountUnit: rewardDraft.amountUnit.trim() || undefined,
  });

  const updateWeekLevels = async (recordId: string, levels: RewardLevel[]) => {
    await saveWeekRecord(recordId, { levels });
  };

  const openRewardEditor = (state: NonNullable<RewardEditorState>) => {
    setRewardDialog(state);
    setRewardDraft(buildDraft(state.reward));
  };

  const saveRewardEditor = async () => {
    if (!rewardDialog || !template) return;
    const reward = toReward();
    if (!reward.title) return;

    if (rewardDialog.mode === 'week-manual' && rewardDialog.recordId) {
      const record = orderedWeeks.flatMap((group) => group.kids).find((item) => item.id === rewardDialog.recordId);
      if (!record) return;
      const manualRewards = rewardDialog.rewardId
        ? record.manualRewards.map((item) => (item.id === rewardDialog.rewardId ? { ...item, ...reward } : item))
        : [...record.manualRewards, { ...reward, remainingQuantity: reward.quantity, source: 'manual' as const }];
      await saveWeekRecord(record.id, { manualRewards });
      setRewardDialog(null);
      return;
    }

    if (rewardDialog.mode === 'template-standby') {
      const standbyRewards = rewardDialog.reward
        ? template.standbyRewards.map((item) => (item.id === reward.id ? reward : item))
        : [...template.standbyRewards, reward];
      await saveTemplate({ standbyRewards });
      setRewardDialog(null);
      return;
    }

    if (rewardDialog.mode === 'template-level' && rewardDialog.levelId) {
      const levels = template.levels.map((level) =>
        level.id !== rewardDialog.levelId
          ? level
          : {
              ...level,
              rewards: rewardDialog.reward
                ? level.rewards.map((item) => (item.id === reward.id ? reward : item))
                : [...level.rewards, reward],
            },
      );
      await saveTemplate({ levels });
      setRewardDialog(null);
      return;
    }

    if (rewardDialog.mode === 'week-level' && rewardDialog.recordId && rewardDialog.levelId) {
      const record = orderedWeeks.flatMap((group) => group.kids).find((item) => item.id === rewardDialog.recordId);
      if (!record) return;
      const levels = record.levels.map((level) =>
        level.id !== rewardDialog.levelId
          ? level
          : {
              ...level,
              rewards: rewardDialog.reward
                ? level.rewards.map((item) => (item.id === reward.id ? reward : item))
                : [...level.rewards, reward],
            },
      );
      await updateWeekLevels(record.id, levels);
      setRewardDialog(null);
    }
  };

  const addPlaceholderReward = async (
    target:
      | { kind: 'template-level'; levelId: string }
      | { kind: 'template-standby' }
      | { kind: 'week-level'; recordId: string; levelId: string }
      | { kind: 'week-manual'; recordId: string },
  ) => {
    if (!template) return;
    const reward = buildPlaceholderReward('Reward');

    if (target.kind === 'template-standby') {
      await saveTemplate({ standbyRewards: [...template.standbyRewards, reward] });
      return;
    }

    if (target.kind === 'template-level') {
      const levels = template.levels.map((level) =>
        level.id === target.levelId ? { ...level, rewards: [...level.rewards, reward] } : level,
      );
      await saveTemplate({ levels });
      return;
    }

    if (target.kind === 'week-manual') {
      await addManualReward(target.recordId, reward);
      return;
    }

    const record = orderedWeeks.flatMap((group) => group.kids).find((item) => item.id === target.recordId);
    if (!record) return;
    const levels = record.levels.map((level) =>
      level.id === target.levelId ? { ...level, rewards: [...level.rewards, reward] } : level,
    );
    await updateWeekLevels(record.id, levels);
  };

  const removeTemplateStandbyReward = async (rewardId: string) => {
    if (!template) return;
    await saveTemplate({ standbyRewards: template.standbyRewards.filter((item) => item.id !== rewardId) });
  };

  const removeTemplateLevelReward = async (levelId: string, rewardId: string) => {
    if (!template) return;
    const levels = template.levels.map((level) =>
      level.id === levelId ? { ...level, rewards: level.rewards.filter((reward) => reward.id !== rewardId) } : level,
    );
    await saveTemplate({ levels });
  };

  const removeWeekLevelReward = async (recordId: string, levelId: string, rewardId: string) => {
    const record = orderedWeeks.flatMap((group) => group.kids).find((item) => item.id === recordId);
    if (!record) return;
    const levels = record.levels.map((level) =>
      level.id === levelId ? { ...level, rewards: level.rewards.filter((reward) => reward.id !== rewardId) } : level,
    );
    await updateWeekLevels(record.id, levels);
  };

  const removeManualReward = async (recordId: string, rewardId: string) => {
    const record = orderedWeeks.flatMap((group) => group.kids).find((item) => item.id === recordId);
    if (!record) return;
    await saveWeekRecord(recordId, {
      manualRewards: record.manualRewards.filter((reward) => reward.id !== rewardId),
    });
  };

  const saveStepCount = async () => {
    if (!stepDialog || !template) return;
    const nextStepCount = Math.max(1, Number(stepDialog.value) || 1);

    if (stepDialog.scope === 'template') {
      const levels = template.levels.map((level) =>
        level.id === stepDialog.levelId ? { ...level, stepCount: nextStepCount } : level,
      );
      await saveTemplate({ levels });
    } else if (stepDialog.recordId) {
      const record = orderedWeeks.flatMap((group) => group.kids).find((item) => item.id === stepDialog.recordId);
      if (!record) return;
      const levels = record.levels.map((level) =>
        level.id === stepDialog.levelId ? { ...level, stepCount: nextStepCount } : level,
      );
      await updateWeekLevels(record.id, levels);
    }

    setStepDialog(null);
  };

  const updateKid = async (kidId: string, updates: Partial<RewardKid>) => {
    if (!template) return;
    const kids = template.kids.map((kid) => (kid.id === kidId ? { ...kid, ...updates } : kid));
    await saveKidsAndTitles(kids, template.titles);
  };

  const addKid = async () => {
    if (!template || !kidName.trim()) return;
    await saveKidsAndTitles(
      [...template.kids, { id: crypto.randomUUID(), name: kidName.trim(), titleIds: [] }],
      template.titles,
    );
    setKidName('');
  };

  const removeKid = async (kidId: string) => {
    if (!template) return;
    await saveKidsAndTitles(
      template.kids.filter((kid) => kid.id !== kidId),
      template.titles,
    );
  };

  const updateTitle = async (titleId: string, updates: Partial<RewardTitle>) => {
    if (!template) return;
    const titles = template.titles.map((title) => (title.id === titleId ? { ...title, ...updates } : title));
    await saveKidsAndTitles(template.kids, titles);
  };

  const addTitle = async () => {
    if (!template) return;
    await saveKidsAndTitles(template.kids, [...template.titles, buildPlaceholderTitle()]);
  };

  const removeTitle = async (titleId: string) => {
    if (!template) return;
    const titles = template.titles.filter((title) => title.id !== titleId);
    const kids = template.kids.map((kid) => ({
      ...kid,
      titleIds: kid.titleIds.filter((kidTitleId) => kidTitleId !== titleId),
    }));
    await saveKidsAndTitles(kids, titles);
  };

  const toggleKidTitle = async (kidId: string, titleId: string) => {
    if (!template) return;
    const kids = template.kids.map((kid) =>
      kid.id !== kidId
        ? kid
        : {
            ...kid,
            titleIds: kid.titleIds.includes(titleId)
              ? kid.titleIds.filter((item) => item !== titleId)
              : [...kid.titleIds, titleId],
          },
    );
    await saveKidsAndTitles(kids, template.titles);
  };

  const renderRewardRow = (
    reward: RewardDefinition,
    onEdit: () => void,
    onDelete: () => void,
    muted = false,
    options?: { showControls?: boolean; prefix?: string; boxed?: boolean },
  ) => (
    <Box
      key={reward.id}
      sx={{
        py: 0.75,
        px: options?.boxed ? 1.1 : 0,
        borderRadius: options?.boxed ? 2 : 0,
        border: options?.boxed ? '1px solid' : 'none',
        borderColor: options?.boxed ? 'divider' : 'transparent',
        backgroundColor: options?.boxed ? 'background.paper' : 'transparent',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 1,
        opacity: muted ? 0.48 : 1,
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2">
          {options?.prefix ? `${options.prefix} ` : ''}
          {formatReward(reward)}
        </Typography>
        {reward.description && (
          <Typography variant="caption" color="text.secondary">
            {reward.description}
          </Typography>
        )}
      </Box>
      {options?.showControls === false ? null : (
        <Stack direction="row" spacing={0.25}>
          <IconButton size="small" onClick={onEdit}>
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={onDelete}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Stack>
      )}
    </Box>
  );

  const renderLevelSections = (
    levels: RewardLevel[],
    options: {
      scope: 'template' | 'week';
      recordId?: string;
      currentLevel?: number;
      currentStep?: number;
      showLockedState?: boolean;
      showStepMeta?: boolean;
      showControls?: boolean;
      rewardPrefix?: string;
      showDividers?: boolean;
    },
  ) => (
    <Stack
      divider={options.showDividers === false ? undefined : <Divider flexItem />}
      sx={options.showDividers === false ? undefined : { borderTop: '1px solid', borderColor: 'divider' }}
    >
      {levels.map((level, index) => {
        const isLocked = options.showLockedState ? index > (options.currentLevel ?? -1) : false;
        const levelLabel = `Level ${index + 1}`;

        return (
          <Box key={level.id} sx={{ py: 1.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
              <Box>
                <Typography variant="subtitle2">{levelLabel}</Typography>
                <Stack direction="row" spacing={0.25} alignItems="center">
                  {options.showStepMeta === false ? null : (
                    <Typography variant="caption" color="text.secondary">
                      {level.stepCount} steps
                      {options.showLockedState && index === options.currentLevel
                        ? ` · current step ${options.currentStep}/${level.stepCount}`
                        : isLocked
                          ? ' · locked'
                          : options.showLockedState
                            ? ' · unlocked'
                            : ''}
                    </Typography>
                  )}
                  {options.showControls === false ? null : (
                    <IconButton
                      size="small"
                      sx={{ p: 0.25 }}
                      onClick={() =>
                        setStepDialog({
                          scope: options.scope,
                          recordId: options.recordId,
                          levelId: level.id,
                          levelLabel,
                          value: String(level.stepCount),
                        })
                      }
                    >
                      <EditIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  )}
                  {options.scope === 'template' && template ? (
                    <IconButton
                      size="small"
                      sx={{ p: 0.25 }}
                      disabled={template.levels.length <= 1}
                      onClick={() => {
                        const nextLevels = template.levels.filter((_, levelIndex) => levelIndex !== index);
                        void saveTemplate({
                          levels: nextLevels,
                          defaultStartLevel: Math.min(
                            template.defaultStartLevel,
                            Math.max(nextLevels.length - 1, 0),
                          ),
                        });
                      }}
                    >
                      <DeleteIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  ) : null}
                </Stack>
              </Box>
              {options.showControls === false ? null : (
                <Button
                  size="small"
                  onClick={() =>
                    void addPlaceholderReward(
                      options.scope === 'template'
                        ? { kind: 'template-level', levelId: level.id }
                        : { kind: 'week-level', recordId: options.recordId!, levelId: level.id },
                    )
                  }
                >
                  Add reward
                </Button>
              )}
            </Box>
            <Box sx={{ mt: 1 }}>
              {level.rewards.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ opacity: isLocked ? 0.48 : 1 }}>
                  No rewards on this level.
                </Typography>
              ) : (
                level.rewards.map((reward) =>
                  renderRewardRow(
                    reward,
                    () =>
                      openRewardEditor({
                        mode: options.scope === 'template' ? 'template-level' : 'week-level',
                        recordId: options.recordId,
                        levelId: level.id,
                        reward,
                      }),
                    () =>
                      void (options.scope === 'template'
                        ? removeTemplateLevelReward(level.id, reward.id)
                        : removeWeekLevelReward(options.recordId!, level.id, reward.id)),
                    isLocked,
                    {
                      showControls: options.showControls,
                      prefix: options.rewardPrefix,
                      boxed: options.showControls !== false,
                    },
                  ),
                )
              )}
            </Box>
          </Box>
        );
      })}
    </Stack>
  );

  if (isLoading && !template) return <Loading message="Loading rewards..." />;

  if (!template) {
    return (
      <Box sx={{ py: 4 }}>
        <Typography variant="h5" gutterBottom>
          Rewards
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Create the rewards setup first, then start instantiating weekly kid records.
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Button variant="contained" onClick={() => void createTemplate()}>
          Create Rewards Setup
        </Button>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        pb: 12,
        minHeight: '100%',
        background:
          surfaceMode === 'execute'
            ? 'linear-gradient(180deg, rgba(24,83,120,0.08) 0%, rgba(255,255,255,0) 28%)'
            : 'transparent',
      }}
    >
      <Box sx={{ mb: 2.5, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
        <Box>
          <Typography variant="h5" gutterBottom>
            Rewards
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Boundary day: {dayOptions.find((day) => day.value === template.weekBoundaryDay)?.label}
          </Typography>
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <Chip
              size="small"
              color="primary"
              label={currentWeek ? `${formatWeekChip(currentWeek, template.currentWeekOrder)} · tracking` : 'No active week'}
            />
            <Chip
              size="small"
              variant="outlined"
              label={rewardSourceWeek ? `Last rewards · W${rewardSourceWeek.weekOrder + 1}` : 'No last-week rewards'}
            />
          </Stack>
        </Box>
        <Button
          variant={surfaceMode === 'edit' ? 'contained' : 'outlined'}
          startIcon={<EditModeIcon />}
          onClick={() => {
            setSurfaceMode(surfaceMode === 'edit' ? 'execute' : 'edit');
            if (surfaceMode !== 'edit') {
              setEditSection('manage');
            }
          }}
          sx={{ borderRadius: 999 }}
        >
          {surfaceMode === 'edit' ? 'Back To Daily' : 'Edit'}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {surfaceMode === 'execute' && (
        <Stack spacing={2} sx={{ pb: 2 }}>
          <Tabs
            value={executeTab}
            onChange={(_event, value) => setExecuteTab(value)}
            variant="fullWidth"
            sx={{
              minHeight: 40,
              '& .MuiTab-root': { minHeight: 40, textTransform: 'none', fontWeight: 600 },
            }}
          >
            <Tab label="Levels" value="levels" />
            <Tab label="This Week" value="current" />
            <Tab label="Last Week" value="last" />
          </Tabs>

          {executeTab === 'levels' && (
            <>
              {visibleCurrentKids.length === 0 ? (
                <Alert severity="info">Instantiate the first week to start tracking rewards.</Alert>
              ) : (
                visibleCurrentKids.map((record) => {
                  const accent = getKidAccent(record.kidId);
                  const syncState = syncStatusByRecordId[record.id];
                  return (
                    <Card
                      key={record.id}
                      sx={{
                        borderRadius: 4,
                        overflow: 'hidden',
                        border: '1px solid',
                        borderColor: accent.softBorder,
                        background: `linear-gradient(180deg, ${accent.soft} 0%, rgba(255,255,255,0.98) 88%)`,
                      }}
                    >
                      <CardContent sx={{ p: 2 }}>
                        <Stack spacing={1.75}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                            <Box>
                              <Typography variant="h6" sx={{ color: accent.text }}>
                                {record.kidName}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Level {record.currentLevel + 1} · Step {record.currentStep}/
                                {record.levels[record.currentLevel]?.stepCount || 1}
                              </Typography>
                            </Box>
                            <Chip
                              size="small"
                              icon={getSyncIcon(syncState)}
                              label={getSyncLabel(syncState)}
                              sx={{
                                backgroundColor: syncState === 'error' ? 'rgba(211,47,47,0.08)' : accent.soft,
                                color: syncState === 'error' ? 'error.main' : accent.text,
                              }}
                            />
                          </Box>
                          <LevelTower
                            levels={record.levels}
                            currentLevel={record.currentLevel}
                            currentStep={record.currentStep}
                            accent={accent}
                          />
                          <Stack direction="row" spacing={1.25}>
                            <Button
                              fullWidth
                              variant="outlined"
                              onClick={() => void changeKidStep(record.id, -1)}
                              sx={{
                                py: 1,
                                minWidth: 0,
                                borderRadius: 3,
                                borderColor: accent.softBorder,
                                color: accent.text,
                                backgroundColor: '#fff',
                                fontSize: 22,
                                fontWeight: 800,
                              }}
                            >
                              -
                            </Button>
                            <Button
                              fullWidth
                              variant="contained"
                              onClick={() => void changeKidStep(record.id, 1)}
                              sx={{
                                py: 1,
                                minWidth: 0,
                                borderRadius: 3,
                                backgroundColor: accent.solid,
                                boxShadow: `0 14px 20px ${accent.softBorder}`,
                                fontSize: 22,
                                fontWeight: 800,
                                '&:hover': { backgroundColor: accent.solid },
                              }}
                            >
                              +
                            </Button>
                          </Stack>
                        </Stack>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </>
          )}

          {executeTab === 'current' && (
            <>
              {visibleCurrentKids.length === 0 ? (
                <Alert severity="info">Instantiate the first week to start tracking rewards.</Alert>
              ) : (
                visibleCurrentKids.map((record) => {
                  const accent = getKidAccent(record.kidId);
                  return (
                    <Card key={record.id} sx={{ borderRadius: 4, border: '1px solid', borderColor: accent.softBorder }}>
                      <CardContent sx={{ p: 2 }}>
                        <Stack spacing={2}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                            <Box>
                              <Typography variant="h6" sx={{ color: accent.text }}>
                                {record.kidName}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Current setup for week {record.weekOrder + 1}
                              </Typography>
                            </Box>
                            <Chip size="small" label={`Level ${record.currentLevel + 1}`} sx={{ backgroundColor: accent.soft, color: accent.text }} />
                          </Box>

                          <Box>
                            <Typography variant="subtitle2" sx={{ mb: 1 }}>
                              Level Rewards
                            </Typography>
                            {renderLevelSections(record.levels, {
                              scope: 'week',
                              recordId: record.id,
                              currentLevel: record.currentLevel,
                              currentStep: record.currentStep,
                              showLockedState: true,
                              showStepMeta: false,
                              showControls: false,
                              rewardPrefix: '›',
                              showDividers: false,
                            })}
                          </Box>

                          <Divider />

                          <Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                              <Typography variant="subtitle2">Manual Rewards</Typography>
                              <Button size="small" onClick={() => void addPlaceholderReward({ kind: 'week-manual', recordId: record.id })}>
                                Add reward
                              </Button>
                            </Box>
                            {record.manualRewards.length === 0 ? (
                              <Chip size="small" variant="outlined" label="No manual rewards yet" />
                            ) : (
                              <Stack spacing={0.5}>
                                {record.manualRewards.map((reward) =>
                                  renderRewardRow(
                                    reward,
                                    () =>
                                      openRewardEditor({
                                        mode: 'week-manual',
                                        recordId: record.id,
                                        rewardId: reward.id,
                                        reward,
                                      }),
                                    () => void removeManualReward(record.id, reward.id),
                                  ),
                                )}
                              </Stack>
                            )}
                          </Box>

                          <Divider />

                          <Box>
                            <Typography variant="subtitle2" sx={{ mb: 1 }}>
                              Notes
                            </Typography>
                            <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                              <TextField
                                size="small"
                                fullWidth
                                placeholder="Log something good or bad"
                                value={noteDrafts[record.id] || ''}
                                onChange={(event) =>
                                  setNoteDrafts((previous) => ({
                                    ...previous,
                                    [record.id]: event.target.value,
                                  }))
                                }
                              />
                              <Button
                                size="small"
                                color="success"
                                onClick={() => {
                                  const text = (noteDrafts[record.id] || '').trim();
                                  if (!text) return;
                                  void addNote(record.id, 'good', text);
                                  setNoteDrafts((previous) => ({ ...previous, [record.id]: '' }));
                                }}
                              >
                                Good
                              </Button>
                              <Button
                                size="small"
                                color="warning"
                                onClick={() => {
                                  const text = (noteDrafts[record.id] || '').trim();
                                  if (!text) return;
                                  void addNote(record.id, 'bad', text);
                                  setNoteDrafts((previous) => ({ ...previous, [record.id]: '' }));
                                }}
                              >
                                Bad
                              </Button>
                            </Stack>
                            {record.notes.length === 0 ? (
                              <Chip size="small" variant="outlined" label="No notes yet" />
                            ) : (
                              <Stack spacing={0.75}>
                                {record.notes.map((note: RewardNote) => (
                                  <Chip
                                    key={note.id}
                                    size="small"
                                    color={note.type === 'good' ? 'success' : 'warning'}
                                    variant="outlined"
                                    label={`${note.type === 'good' ? 'Good' : 'Bad'} · ${note.text}`}
                                    sx={{ justifyContent: 'flex-start' }}
                                  />
                                ))}
                              </Stack>
                            )}
                          </Box>
                        </Stack>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </>
          )}

          {executeTab === 'last' && (
            <>
              {visibleRewardSourceKids.length === 0 ? (
                <Alert severity="info">Freeze a week to open its rewards for use in the following week.</Alert>
              ) : (
                visibleRewardSourceKids.map((record) => {
                  const accent = getKidAccent(record.kidId);
                  return (
                    <Card key={record.id} sx={{ borderRadius: 4, border: '1px solid', borderColor: accent.softBorder }}>
                      <CardContent sx={{ p: 2 }}>
                        <Stack spacing={1.5}>
                          <Box>
                            <Typography variant="h6" sx={{ color: accent.text }}>
                              {record.kidName}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Rewards from week {record.weekOrder + 1}
                            </Typography>
                          </Box>
                          {record.earnedRewards.length === 0 ? (
                            <Typography variant="body2" color="text.secondary">
                              No rewards available.
                            </Typography>
                          ) : (
                            record.earnedRewards.map((reward) => (
                              <Box
                                key={reward.id}
                                sx={{
                                  py: 1,
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'flex-start',
                                  gap: 1,
                                  borderTop: '1px solid',
                                  borderColor: 'divider',
                                }}
                              >
                                <Box sx={{ minWidth: 0 }}>
                                  <Typography variant="body2">{`› ${formatReward(reward)}`}</Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {formatRemaining(reward)}
                                    {reward.isCarryForward ? ' · Carry forward' : ''}
                                  </Typography>
                                </Box>
                                <Stack direction="row" spacing={0.5} alignItems="center">
                                  {reward.amount === undefined ? (
                                    <>
                                      <IconButton
                                        size="small"
                                        onClick={() => void consumeReward(record.id, reward.id)}
                                        disabled={reward.remainingQuantity <= 0}
                                      >
                                        <RemoveIcon fontSize="small" />
                                      </IconButton>
                                      <IconButton
                                        size="small"
                                        onClick={() => void restoreReward(record.id, reward.id)}
                                        disabled={reward.remainingQuantity >= reward.quantity}
                                      >
                                        <AddIcon fontSize="small" />
                                      </IconButton>
                                    </>
                                  ) : null}
                                  <IconButton
                                    size="small"
                                    onClick={() => {
                                      setAvailabilityDialog({ recordId: record.id, reward });
                                      setAvailabilityDraft({
                                        quantity: String(reward.remainingQuantity),
                                        amount: reward.remainingAmount === undefined ? '' : String(reward.remainingAmount),
                                      });
                                    }}
                                  >
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                </Stack>
                              </Box>
                            ))
                          )}
                        </Stack>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </>
          )}
        </Stack>
      )}

      {surfaceMode === 'edit' && (
        <Stack spacing={2}>
          <Tabs
            value={editSection}
            onChange={(_event, value) => setEditSection(value)}
            variant="fullWidth"
            sx={{ '& .MuiTab-root': { textTransform: 'none', fontWeight: 600 } }}
          >
            <Tab label="Manage" value="manage" />
            <Tab label="Kids" value="kids" />
            <Tab label="Template" value="template" />
          </Tabs>

          {editSection === 'manage' && (
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, overflowX: 'auto', pb: 0.5 }}>
                {orderedWeeks.map((group) => (
                  <Chip
                    key={group.weekOrder}
                    label={formatWeekChip(group, template.currentWeekOrder)}
                    color={group.weekOrder === selectedManageGroup?.weekOrder ? 'primary' : 'default'}
                    variant={group.weekOrder === selectedManageGroup?.weekOrder ? 'filled' : 'outlined'}
                    onClick={() => setManageWeek(group.weekOrder)}
                    sx={{ flexShrink: 0 }}
                  />
                ))}
                <IconButton
                  size="small"
                  onClick={() => void instantiateNextWeek()}
                  sx={{
                    flexShrink: 0,
                    border: '1px solid',
                    borderColor: 'divider',
                    backgroundColor: 'background.paper',
                  }}
                >
                  <AddIcon fontSize="small" />
                </IconButton>
              </Box>

              {!selectedManageGroup ? (
                <Alert severity="info">No instantiated weeks yet.</Alert>
              ) : (
                visibleManageKids.map((record) => {
                  const accent = getKidAccent(record.kidId);
                  return (
                    <Card key={record.id} sx={{ borderRadius: 4, border: '1px solid', borderColor: accent.softBorder }}>
                      <CardContent sx={{ p: 2 }}>
                        <Stack spacing={2}>
                          <Box>
                            <Typography variant="h6" sx={{ color: accent.text }}>
                              {record.kidName}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Level {record.currentLevel + 1} · Step {record.currentStep}/
                              {record.levels[record.currentLevel]?.stepCount || 1}
                            </Typography>
                          </Box>
                          {renderLevelSections(record.levels, {
                            scope: 'week',
                            recordId: record.id,
                          })}
                        </Stack>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </Stack>
          )}

          {editSection === 'kids' && (
            <Stack spacing={2}>
              <Card sx={{ borderRadius: 4 }}>
                <CardContent sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                    <Typography variant="subtitle1">Titles</Typography>
                    <Button size="small" onClick={() => void addTitle()}>
                      Add title
                    </Button>
                  </Box>
                  {template.titles.length === 0 ? (
                    <Chip size="small" variant="outlined" label="No titles yet" />
                  ) : (
                    <Stack spacing={1} divider={<Divider flexItem />}>
                      {template.titles.map((title) => (
                        <Box key={title.id} sx={{ py: 0.5 }}>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <TextField
                              size="small"
                              label="Title"
                              fullWidth
                              value={title.name}
                              onChange={(event) => void updateTitle(title.id, { name: event.target.value })}
                            />
                            <TextField
                              size="small"
                              label="Step +"
                              type="number"
                              value={title.stepBoost}
                              onChange={(event) =>
                                void updateTitle(title.id, { stepBoost: Math.max(0, Number(event.target.value) || 0) })
                              }
                              sx={{ width: 110 }}
                            />
                            <IconButton size="small" onClick={() => void removeTitle(title.id)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Stack>
                        </Box>
                      ))}
                    </Stack>
                  )}
                </CardContent>
              </Card>

              <Card sx={{ borderRadius: 4 }}>
                <CardContent sx={{ p: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Kids
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
                    <TextField
                      size="small"
                      fullWidth
                      label="Kid name"
                      value={kidName}
                      onChange={(event) => setKidName(event.target.value)}
                    />
                    <Button variant="contained" onClick={() => void addKid()}>
                      Add
                    </Button>
                  </Stack>
                  {template.kids.length === 0 ? (
                    <Chip size="small" variant="outlined" label="No kids yet" />
                  ) : (
                    <Stack spacing={1.5}>
                      {template.kids.map((kid) => (
                        <Card key={kid.id} variant="outlined" sx={{ borderRadius: 3 }}>
                          <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                            <Stack spacing={1}>
                              <Stack direction="row" spacing={1} alignItems="center">
                                <TextField
                                  size="small"
                                  fullWidth
                                  label="Name"
                                  value={kid.name}
                                  onChange={(event) => void updateKid(kid.id, { name: event.target.value })}
                                />
                                <IconButton size="small" onClick={() => void removeKid(kid.id)}>
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Stack>
                              <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                                {template.titles.length === 0 ? (
                                  <Chip size="small" variant="outlined" label="No titles available" />
                                ) : (
                                  template.titles.map((title) => (
                                    <Chip
                                      key={title.id}
                                      size="small"
                                      label={`${title.name} +${title.stepBoost}`}
                                      color={kid.titleIds.includes(title.id) ? 'primary' : 'default'}
                                      variant={kid.titleIds.includes(title.id) ? 'filled' : 'outlined'}
                                      onClick={() => void toggleKidTitle(kid.id, title.id)}
                                    />
                                  ))
                                )}
                              </Stack>
                              {kid.titleIds.length === 0 ? null : (
                                <Typography variant="caption" color="text.secondary">
                                  Assigned: {kid.titleIds.map((titleId) => titleNameMap.get(titleId) || 'Title').join(', ')}
                                </Typography>
                              )}
                            </Stack>
                          </CardContent>
                        </Card>
                      ))}
                    </Stack>
                  )}
                </CardContent>
              </Card>
            </Stack>
          )}

          {editSection === 'template' && (
            <Stack spacing={2}>
              <Card sx={{ borderRadius: 4 }}>
                <CardContent sx={{ p: 2 }}>
                  <Stack spacing={2}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                      <FormControl fullWidth size="small">
                        <InputLabel id="boundary-label">Boundary day</InputLabel>
                        <Select
                          labelId="boundary-label"
                          label="Boundary day"
                          value={template.weekBoundaryDay}
                          onChange={(event) => void saveTemplate({ weekBoundaryDay: Number(event.target.value) })}
                        >
                          {dayOptions.map((day) => (
                            <MenuItem key={day.value} value={day.value}>
                              {day.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <FormControl fullWidth size="small">
                        <InputLabel id="default-level-label">Default level</InputLabel>
                        <Select
                          labelId="default-level-label"
                          label="Default level"
                          value={template.defaultStartLevel}
                          onChange={(event) => void saveTemplate({ defaultStartLevel: Number(event.target.value) })}
                        >
                          {template.levels.map((_, index) => (
                            <MenuItem key={index} value={index}>
                              Level {index + 1}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Stack>

                  </Stack>
                </CardContent>
              </Card>
              
              <Card sx={{ borderRadius: 4 }}>
                <CardContent sx={{ p: 2 }}>
                  <Stack spacing={2}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle1">Levels</Typography>
                      <Button
                        size="small"
                        onClick={() =>
                          void saveTemplate({
                            levels: [
                              ...template.levels,
                              {
                                id: crypto.randomUUID(),
                                name: `Level ${template.levels.length + 1}`,
                                stepCount: 5,
                                rewards: [],
                              },
                            ],
                          })
                        }
                      >
                        Add level
                      </Button>
                    </Box>

                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Standby reminders
                      </Typography>
                      <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ mt: 0.75 }}>
                        {template.standbyRewards.length === 0 ? (
                          <Chip size="small" variant="outlined" label="No standby rewards yet" />
                        ) : (
                          template.standbyRewards.map((reward) => (
                            <Chip
                              key={reward.id}
                              size="small"
                              icon={<AutoAwesomeIcon sx={{ fontSize: 14 }} />}
                              label={formatReward(reward)}
                            />
                          ))
                        )}
                      </Stack>
                    </Box>

                    {renderLevelSections(template.levels, { scope: 'template' })}
                  </Stack>
                </CardContent>
              </Card>

              <Card sx={{ borderRadius: 4 }}>
                <CardContent sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle1">Standby Rewards</Typography>
                    <Button size="small" onClick={() => void addPlaceholderReward({ kind: 'template-standby' })}>
                      Add reward
                    </Button>
                  </Box>
                  {template.standbyRewards.length === 0 ? (
                    <Chip size="small" variant="outlined" label="No standby rewards yet" />
                  ) : (
                    <Stack divider={<Divider flexItem />}>
                      {template.standbyRewards.map((reward) =>
                        renderRewardRow(
                          reward,
                          () => openRewardEditor({ mode: 'template-standby', reward }),
                          () => void removeTemplateStandbyReward(reward.id),
                        ),
                      )}
                    </Stack>
                  )}
                </CardContent>
              </Card>
            </Stack>
          )}
        </Stack>
      )}

      {surfaceMode === 'execute' && (
        <Fab
          color="primary"
          aria-label="rewards-actions"
          onClick={() => setActionsOpen(true)}
          sx={{ position: 'fixed', right: 16, bottom: 72 }}
        >
          <ActionsIcon />
        </Fab>
      )}

      {surfaceMode === 'edit' && (
        <Fab
          color="warning"
          aria-label="reset-rewards"
          onClick={() => setResetOpen(true)}
          sx={{ position: 'fixed', right: 16, bottom: 72 }}
        >
          <ResetIcon />
        </Fab>
      )}

      <Dialog open={actionsOpen} onClose={() => setActionsOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Week Actions</DialogTitle>
        <DialogContent>
          <Stack spacing={1.25} sx={{ mt: 1 }}>
            <Button
              variant="outlined"
              onClick={() => {
                void loadFreezePreview();
                setFreezeCarryForward(false);
                setFreezeDialogOpen(true);
                setActionsOpen(false);
              }}
              disabled={!canFreezeCurrentWeek}
            >
              Freeze Current Week
            </Button>
            <Button
              variant="outlined"
              color="warning"
              onClick={() => {
                void unfreezeCurrentWeek();
                setActionsOpen(false);
              }}
              disabled={!canUnfreezeCurrentWeek}
            >
              Unfreeze Current Week
            </Button>
            <Button
              variant="outlined"
              onClick={() => {
                void openCurrentNextWeek(false);
                setActionsOpen(false);
              }}
              disabled={!canOpenNextWeek}
            >
              Move To Next Week
            </Button>
            <Button
              variant="outlined"
              onClick={() => {
                void openCurrentNextWeek(true);
                setActionsOpen(false);
              }}
              disabled={!canOpenNextWeek}
            >
              Move To Next Week And Carry Level
            </Button>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActionsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={freezeDialogOpen} onClose={() => setFreezeDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Freeze Current Week</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={freezeCarryForward}
                  onChange={(event) => setFreezeCarryForward(event.target.checked)}
                />
              }
              label="Carry forward unused rewards from last week"
            />
            {!canFreezeCurrentWeek ? (
              <Alert severity="info">
                Freeze is only available on the configured boundary day.
              </Alert>
            ) : null}
            {freezePreview.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No pending rewards to preview.
              </Typography>
            ) : (
              freezePreview.map((previewKid) => (
                <Card key={previewKid.recordId} variant="outlined" sx={{ borderRadius: 3 }}>
                  <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Stack spacing={1}>
                      <Typography variant="subtitle2">{previewKid.kidName}</Typography>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Pending rewards
                        </Typography>
                        <Stack spacing={0.4} sx={{ mt: 0.5 }}>
                          {previewKid.pendingRewards.length === 0 ? (
                            <Typography variant="body2" color="text.secondary">
                              No rewards unlocked yet.
                            </Typography>
                          ) : (
                            previewKid.pendingRewards.map((reward) => (
                              <Typography key={reward.id} variant="body2">
                                {`› ${formatReward(reward)}`}
                              </Typography>
                            ))
                          )}
                        </Stack>
                      </Box>
                      {freezeCarryForward ? (
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Carry-forward rewards
                          </Typography>
                          <Stack spacing={0.4} sx={{ mt: 0.5 }}>
                            {previewKid.carryForwardRewards.length === 0 ? (
                              <Typography variant="body2" color="text.secondary">
                                No unused rewards to carry forward.
                              </Typography>
                            ) : (
                              previewKid.carryForwardRewards.map((reward) => (
                                <Typography key={reward.id} variant="body2">
                                  {`› ${formatReward(reward)}`}
                                </Typography>
                              ))
                            )}
                          </Stack>
                        </Box>
                      ) : null}
                    </Stack>
                  </CardContent>
                </Card>
              ))
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFreezeDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!canFreezeCurrentWeek}
            onClick={() => {
              void freezeCurrentWeek(freezeCarryForward);
              setFreezeDialogOpen(false);
            }}
          >
            {freezeCarryForward ? 'Move To Rewards For Current Week' : 'Freeze Week'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={resetOpen} onClose={() => setResetOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Reset Reward Progress</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            This deletes all instantiated reward weeks and starts again from the first week. Template settings stay in place.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetOpen(false)}>Cancel</Button>
          <Button
            color="warning"
            variant="contained"
            onClick={() => {
              void resetProgress();
              setResetOpen(false);
              setSurfaceMode('execute');
              setExecuteTab('levels');
            }}
          >
            Reset
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(rewardDialog)} onClose={() => setRewardDialog(null)} fullWidth maxWidth="sm">
        <DialogTitle>Edit Reward</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Title"
              size="small"
              value={rewardDraft.title}
              onChange={(event) => setRewardDraft((previous) => ({ ...previous, title: event.target.value }))}
            />
            <TextField
              label="Description"
              size="small"
              value={rewardDraft.description}
              onChange={(event) => setRewardDraft((previous) => ({ ...previous, description: event.target.value }))}
            />
            <Stack direction="row" spacing={2}>
              <TextField
                fullWidth
                label="Qty"
                size="small"
                type="number"
                value={rewardDraft.quantity}
                onChange={(event) => setRewardDraft((previous) => ({ ...previous, quantity: event.target.value }))}
              />
              <TextField
                fullWidth
                label="Amount"
                size="small"
                type="number"
                value={rewardDraft.amount}
                onChange={(event) => setRewardDraft((previous) => ({ ...previous, amount: event.target.value }))}
              />
              <TextField
                fullWidth
                label="Unit"
                size="small"
                value={rewardDraft.amountUnit}
                onChange={(event) => setRewardDraft((previous) => ({ ...previous, amountUnit: event.target.value }))}
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRewardDialog(null)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => {
              void saveRewardEditor();
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(stepDialog)} onClose={() => setStepDialog(null)} fullWidth maxWidth="xs">
        <DialogTitle>{stepDialog?.levelLabel} Steps</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            size="small"
            type="number"
            label="Steps"
            sx={{ mt: 1 }}
            value={stepDialog?.value || ''}
            onChange={(event) =>
              setStepDialog((previous) => (previous ? { ...previous, value: event.target.value } : previous))
            }
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStepDialog(null)}>Cancel</Button>
          <Button variant="contained" onClick={() => void saveStepCount()}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(availabilityDialog)} onClose={() => setAvailabilityDialog(null)} fullWidth maxWidth="xs">
        <DialogTitle>Update Reward Availability</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Remaining quantity"
              size="small"
              type="number"
              value={availabilityDraft.quantity}
              onChange={(event) => setAvailabilityDraft((previous) => ({ ...previous, quantity: event.target.value }))}
            />
            {availabilityDialog?.reward.remainingAmount !== undefined && (
              <TextField
                label={`Remaining amount${availabilityDialog.reward.amountUnit ? ` (${availabilityDialog.reward.amountUnit})` : ''}`}
                size="small"
                type="number"
                value={availabilityDraft.amount}
                onChange={(event) => setAvailabilityDraft((previous) => ({ ...previous, amount: event.target.value }))}
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAvailabilityDialog(null)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => {
              if (!availabilityDialog) return;
              void editRewardAvailability(
                availabilityDialog.recordId,
                availabilityDialog.reward.id,
                Math.max(0, Number(availabilityDraft.quantity) || 0),
                availabilityDraft.amount === '' ? undefined : Math.max(0, Number(availabilityDraft.amount) || 0),
              );
              setAvailabilityDialog(null);
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Rewards;
