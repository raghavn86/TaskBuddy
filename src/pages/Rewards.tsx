import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Fab,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Add as AddIcon,
  ArrowBack as ArrowBackIcon,
  DeleteOutline as DeleteIcon,
  EditOutlined as EditIcon,
  EmojiEvents as RewardsIcon,
  KeyboardArrowDown as StepDownIcon,
  KeyboardArrowUp as StepUpIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import Loading from '../components/common/Loading';
import { useRewards } from '../context/RewardsContext';
import { RewardDefinition, RewardInstance, RewardLevel, RewardWeekKidRecord } from '../types';

type SurfaceMode = 'execute' | 'rewards' | 'edit';
type EditSection = 'manage' | 'template';

type RewardEditorState = {
  mode: 'template-level' | 'template-standby' | 'week-level' | 'week-manual';
  recordId?: string;
  levelId?: string;
  reward?: RewardDefinition;
} | null;

const dayOptions = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
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

const LevelTower: React.FC<{ levels: RewardLevel[]; currentLevel: number; currentStep: number }> = ({
  levels,
  currentLevel,
  currentStep,
}) => (
  <Stack direction="row" spacing={0.75} alignItems="flex-end" sx={{ minHeight: 82 }}>
    {levels.map((level, index) => {
      const isCurrent = index === currentLevel;
      const isUnlocked = index <= currentLevel;
      const height = 36 + index * 10;
      return (
        <Box
          key={level.id}
          sx={{
            flex: 1,
            minWidth: 0,
            height,
            borderRadius: 2.5,
            border: '1px solid',
            borderColor: isCurrent ? 'primary.main' : isUnlocked ? 'primary.light' : 'divider',
            background: isCurrent
              ? 'linear-gradient(180deg, #42a5f5 0%, #1976d2 100%)'
              : isUnlocked
                ? 'linear-gradient(180deg, rgba(66,165,245,0.28) 0%, rgba(25,118,210,0.12) 100%)'
                : 'linear-gradient(180deg, rgba(255,255,255,0.8) 0%, rgba(220,220,220,0.4) 100%)',
            color: isCurrent ? 'common.white' : 'text.primary',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            p: 0.75,
            boxShadow: isCurrent ? '0 10px 18px rgba(25, 118, 210, 0.22)' : 'none',
            transform: isCurrent ? 'translateY(-4px)' : 'none',
            transition: 'all 180ms ease',
          }}
        >
          <Typography variant="caption" sx={{ fontWeight: 700, lineHeight: 1 }}>
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
                    backgroundColor: dotIndex < currentStep ? 'common.white' : 'rgba(255,255,255,0.35)',
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
    isLoading,
    error,
    createTemplate,
    saveTemplate,
    instantiateNextWeek,
    freezeCurrentWeek,
    openCurrentNextWeek,
    changeKidStep,
    addNote,
    addManualReward,
    consumeReward,
    editRewardAvailability,
    saveWeekRecord,
  } = useRewards();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [surfaceMode, setSurfaceMode] = useState<SurfaceMode>('execute');
  const [editSection, setEditSection] = useState<EditSection>('manage');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [manageWeek, setManageWeek] = useState(0);
  const [kidName, setKidName] = useState('');
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [rewardDialog, setRewardDialog] = useState<RewardEditorState>(null);
  const [rewardDraft, setRewardDraft] = useState(buildDraft());
  const [availabilityDialog, setAvailabilityDialog] = useState<null | { recordId: string; reward: RewardInstance }>(
    null,
  );
  const [availabilityDraft, setAvailabilityDraft] = useState({ quantity: '0', amount: '' });

  const orderedWeeks = useMemo(() => [...weekGroups].sort((a, b) => a.weekOrder - b.weekOrder), [weekGroups]);
  const selectedManageGroup = orderedWeeks.find((group) => group.weekOrder === manageWeek) || orderedWeeks[0] || null;
  const rewardSourceByKid = useMemo(() => {
    const map = new Map<string, RewardWeekKidRecord>();
    rewardSourceWeek?.kids.forEach((kid) => map.set(kid.kidId, kid));
    return map;
  }, [rewardSourceWeek]);

  useEffect(() => {
    setManageWeek(template?.currentWeekOrder || 0);
  }, [template?.currentWeekOrder]);

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
      await addManualReward(rewardDialog.recordId, reward);
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

  const renderEditableLevels = (
    levels: RewardLevel[],
    onLevelChange: (levelId: string, updates: Partial<RewardLevel>) => void,
    onAddReward: (levelId: string) => void,
    onEditReward: (levelId: string, reward: RewardDefinition) => void,
    onRemoveReward: (levelId: string, rewardId: string) => void,
  ) => (
    <Stack spacing={1.5}>
      {levels.map((level) => (
        <Card key={level.id} variant="outlined" sx={{ borderRadius: 3 }}>
          <CardContent sx={{ py: 1.25, '&:last-child': { pb: 1.25 } }}>
            <Grid container spacing={1}>
              <Grid item xs={8}>
                <TextField
                  fullWidth
                  size="small"
                  label="Level"
                  value={level.name}
                  onChange={(event) => onLevelChange(level.id, { name: event.target.value })}
                />
              </Grid>
              <Grid item xs={4}>
                <TextField
                  fullWidth
                  size="small"
                  label="Steps"
                  type="number"
                  value={level.stepCount}
                  onChange={(event) =>
                    onLevelChange(level.id, { stepCount: Math.max(1, Number(event.target.value) || 1) })
                  }
                />
              </Grid>
            </Grid>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Rewards
              </Typography>
              <Button size="small" onClick={() => onAddReward(level.id)}>
                Add reward
              </Button>
            </Box>
            <Stack spacing={0.75} sx={{ mt: 1 }}>
              {level.rewards.map((reward) => (
                <Card key={reward.id} variant="outlined">
                  <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                      <Box>
                        <Typography variant="body2">{formatReward(reward)}</Typography>
                        {reward.description && (
                          <Typography variant="caption" color="text.secondary">
                            {reward.description}
                          </Typography>
                        )}
                      </Box>
                      <Stack direction="row" spacing={0.25}>
                        <IconButton size="small" onClick={() => onEditReward(level.id, reward)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={() => onRemoveReward(level.id, reward.id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </Box>
                  </CardContent>
                </Card>
              ))}
              {level.rewards.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  No rewards on this level.
                </Typography>
              )}
            </Stack>
          </CardContent>
        </Card>
      ))}
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

  const topSummary = (
    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
      <Chip
        size="small"
        color="primary"
        label={currentWeek ? `Tracking ${currentWeek.weekOrder + 1}W` : 'No active week'}
      />
      <Chip
        size="small"
        variant="outlined"
        label={rewardSourceWeek ? `Rewards ${rewardSourceWeek.weekOrder + 1}W` : 'No reward bank yet'}
      />
    </Stack>
  );

  return (
    <Box
      sx={{
        pb: 4,
        minHeight: '100%',
        background:
          surfaceMode === 'execute'
            ? 'linear-gradient(180deg, rgba(25,118,210,0.08) 0%, rgba(255,255,255,0) 32%)'
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
          {topSummary}
        </Box>
        <IconButton
          onClick={() => {
            if (surfaceMode === 'edit') {
              setSurfaceMode('execute');
            } else {
              setSettingsOpen(true);
            }
          }}
          sx={{
            mt: 0.5,
            backgroundColor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          {surfaceMode === 'edit' ? <ArrowBackIcon /> : <SettingsIcon />}
        </IconButton>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {surfaceMode === 'execute' && (
        <Stack spacing={2}>
          {!currentWeek ? (
            <Alert severity="info">Instantiate the first week to start tracking rewards.</Alert>
          ) : (
            currentWeek.kids.map((record) => (
              <Card
                key={record.id}
                sx={{
                  borderRadius: 4,
                  overflow: 'hidden',
                  background:
                    'linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(245,249,255,1) 100%)',
                }}
              >
                <CardContent sx={{ p: 2 }}>
                  <Stack spacing={1.75}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                      <Box>
                        <Typography variant="h6">{record.kidName}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {record.levels[record.currentLevel]?.name || 'No level'} · Step {record.currentStep}/
                          {record.levels[record.currentLevel]?.stepCount || 1}
                        </Typography>
                      </Box>
                      <Chip
                        size="small"
                        label={`L${record.currentLevel + 1}`}
                        sx={{ fontWeight: 700, backgroundColor: 'rgba(25,118,210,0.12)', color: 'primary.dark' }}
                      />
                    </Box>
                    <LevelTower
                      levels={record.levels}
                      currentLevel={record.currentLevel}
                      currentStep={record.currentStep}
                    />
                    <Grid container spacing={1.25}>
                      <Grid item xs={6}>
                        <Button
                          fullWidth
                          variant="outlined"
                          color="inherit"
                          startIcon={<StepDownIcon />}
                          onClick={() => void changeKidStep(record.id, -1)}
                          sx={{
                            py: 1.1,
                            borderRadius: 3,
                            borderColor: 'rgba(15, 23, 42, 0.12)',
                            backgroundColor: 'rgba(255,255,255,0.92)',
                          }}
                        >
                          Step Down
                        </Button>
                      </Grid>
                      <Grid item xs={6}>
                        <Button
                          fullWidth
                          variant="contained"
                          startIcon={<StepUpIcon />}
                          onClick={() => void changeKidStep(record.id, 1)}
                          sx={{
                            py: 1.1,
                            borderRadius: 3,
                            boxShadow: '0 10px 18px rgba(25, 118, 210, 0.24)',
                          }}
                        >
                          Step Up
                        </Button>
                      </Grid>
                    </Grid>
                  </Stack>
                </CardContent>
              </Card>
            ))
          )}
        </Stack>
      )}

      {surfaceMode === 'rewards' && (
        <Stack spacing={2}>
          <Card sx={{ borderRadius: 4 }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Reward Bank
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Frozen rewards are used during the following week. Manual rewards and notes stay separate.
              </Typography>
            </CardContent>
          </Card>

          {!rewardSourceWeek ? (
            <Alert severity="info">Freeze a week to open its rewards for use in the following week.</Alert>
          ) : (
            rewardSourceWeek.kids.map((rewardRecord) => {
              const liveWeekRecord = currentWeek?.kids.find((kid) => kid.kidId === rewardRecord.kidId);
              return (
                <Card key={rewardRecord.id} sx={{ borderRadius: 4 }}>
                  <CardContent sx={{ p: 2 }}>
                    <Stack spacing={2}>
                      <Box>
                        <Typography variant="h6">{rewardRecord.kidName}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Rewards from week {rewardRecord.weekOrder + 1}
                        </Typography>
                      </Box>

                      <Box>
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>
                          Available Rewards
                        </Typography>
                        {rewardRecord.earnedRewards.length === 0 ? (
                          <Typography variant="body2" color="text.secondary">
                            No rewards available.
                          </Typography>
                        ) : (
                          <Stack spacing={1}>
                            {rewardRecord.earnedRewards.map((reward) => (
                              <Card key={reward.id} variant="outlined">
                                <CardContent sx={{ py: 1.1, '&:last-child': { pb: 1.1 } }}>
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                                    <Box>
                                      <Typography variant="body2">{formatReward(reward)}</Typography>
                                      <Typography variant="caption" color="text.secondary">
                                        {formatRemaining(reward)}
                                        {reward.isCarryForward ? ' · Carry forward' : ''}
                                      </Typography>
                                    </Box>
                                    <Stack direction="row" spacing={0.5}>
                                      {reward.amount === undefined && (
                                        <Button
                                          size="small"
                                          onClick={() => void consumeReward(rewardRecord.id, reward.id)}
                                          disabled={reward.remainingQuantity <= 0}
                                        >
                                          Use
                                        </Button>
                                      )}
                                      <IconButton
                                        size="small"
                                        onClick={() => {
                                          setAvailabilityDialog({ recordId: rewardRecord.id, reward });
                                          setAvailabilityDraft({
                                            quantity: String(reward.remainingQuantity),
                                            amount:
                                              reward.remainingAmount === undefined ? '' : String(reward.remainingAmount),
                                          });
                                        }}
                                      >
                                        <EditIcon fontSize="small" />
                                      </IconButton>
                                    </Stack>
                                  </Box>
                                </CardContent>
                              </Card>
                            ))}
                          </Stack>
                        )}
                      </Box>

                      <Divider />

                      <Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Typography variant="subtitle2">Manual Rewards</Typography>
                          {liveWeekRecord && (
                            <Button
                              size="small"
                              onClick={() => openRewardEditor({ mode: 'week-manual', recordId: liveWeekRecord.id })}
                            >
                              Add
                            </Button>
                          )}
                        </Box>
                        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                          {!liveWeekRecord || liveWeekRecord.manualRewards.length === 0 ? (
                            <Chip size="small" variant="outlined" label="No manual rewards" />
                          ) : (
                            liveWeekRecord.manualRewards.map((reward) => (
                              <Chip key={reward.id} size="small" label={formatReward(reward)} />
                            ))
                          )}
                        </Stack>
                      </Box>

                      <Box>
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>
                          Notes
                        </Typography>
                        {liveWeekRecord && (
                          <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                            <TextField
                              size="small"
                              fullWidth
                              placeholder="Log something good or bad"
                              value={noteDrafts[liveWeekRecord.id] || ''}
                              onChange={(event) =>
                                setNoteDrafts((previous) => ({
                                  ...previous,
                                  [liveWeekRecord.id]: event.target.value,
                                }))
                              }
                            />
                            <Button
                              size="small"
                              onClick={() => {
                                const text = (noteDrafts[liveWeekRecord.id] || '').trim();
                                if (!text) return;
                                void addNote(liveWeekRecord.id, 'good', text);
                                setNoteDrafts((previous) => ({ ...previous, [liveWeekRecord.id]: '' }));
                              }}
                            >
                              Good
                            </Button>
                            <Button
                              size="small"
                              color="warning"
                              onClick={() => {
                                const text = (noteDrafts[liveWeekRecord.id] || '').trim();
                                if (!text) return;
                                void addNote(liveWeekRecord.id, 'bad', text);
                                setNoteDrafts((previous) => ({ ...previous, [liveWeekRecord.id]: '' }));
                              }}
                            >
                              Bad
                            </Button>
                          </Stack>
                        )}
                        <Stack spacing={0.75}>
                          {!liveWeekRecord || liveWeekRecord.notes.length === 0 ? (
                            <Chip size="small" variant="outlined" label="No notes yet" />
                          ) : (
                            liveWeekRecord.notes.map((note) => (
                              <Chip
                                key={note.id}
                                size="small"
                                label={`${note.type === 'good' ? 'Good' : 'Bad'} · ${note.text}`}
                                color={note.type === 'good' ? 'success' : 'warning'}
                                variant="outlined"
                              />
                            ))
                          )}
                        </Stack>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              );
            })
          )}
        </Stack>
      )}

      {surfaceMode === 'edit' && (
        <Stack spacing={2}>
          <Tabs
            value={editSection === 'manage' ? 0 : 1}
            onChange={(_event, value) => setEditSection(value === 0 ? 'manage' : 'template')}
            sx={{ mb: 0.5 }}
          >
            <Tab label="Manage" />
            <Tab label="Template" />
          </Tabs>

          {editSection === 'manage' && (
            <Stack spacing={2}>
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                {orderedWeeks.map((group) => (
                  <Chip
                    key={group.weekOrder}
                    label={
                      group.weekOrder === template.currentWeekOrder
                        ? `Current ${group.weekOrder + 1}W`
                        : `${group.weekOrder + 1}W`
                    }
                    color={group.weekOrder === selectedManageGroup?.weekOrder ? 'primary' : 'default'}
                    variant={group.weekOrder === selectedManageGroup?.weekOrder ? 'filled' : 'outlined'}
                    onClick={() => setManageWeek(group.weekOrder)}
                  />
                ))}
              </Stack>

              {!selectedManageGroup ? (
                <Alert severity="info">No instantiated weeks yet.</Alert>
              ) : (
                selectedManageGroup.kids.map((record) => (
                  <Card key={record.id} sx={{ borderRadius: 4 }}>
                    <CardContent sx={{ p: 2 }}>
                      <Stack spacing={2}>
                        <Box>
                          <Typography variant="h6">{record.kidName}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {record.levels[record.currentLevel]?.name || 'No level'} · Step {record.currentStep}/
                            {record.levels[record.currentLevel]?.stepCount || 1}
                          </Typography>
                        </Box>
                        {renderEditableLevels(
                          record.levels,
                          (levelId, updates) => {
                            const levels = record.levels.map((level) =>
                              level.id === levelId ? { ...level, ...updates } : level,
                            );
                            void updateWeekLevels(record.id, levels);
                          },
                          (levelId) => openRewardEditor({ mode: 'week-level', recordId: record.id, levelId }),
                          (levelId, reward) =>
                            openRewardEditor({ mode: 'week-level', recordId: record.id, levelId, reward }),
                          (levelId, rewardId) => {
                            const levels = record.levels.map((level) =>
                              level.id === levelId
                                ? { ...level, rewards: level.rewards.filter((reward) => reward.id !== rewardId) }
                                : level,
                            );
                            void updateWeekLevels(record.id, levels);
                          },
                        )}
                      </Stack>
                    </CardContent>
                  </Card>
                ))
              )}
            </Stack>
          )}

          {editSection === 'template' && (
            <Stack spacing={2}>
              <Card sx={{ borderRadius: 4 }}>
                <CardContent sx={{ p: 2 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
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
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth size="small">
                        <InputLabel id="default-level-label">Default level</InputLabel>
                        <Select
                          labelId="default-level-label"
                          label="Default level"
                          value={template.defaultStartLevel}
                          onChange={(event) => void saveTemplate({ defaultStartLevel: Number(event.target.value) })}
                        >
                          {template.levels.map((level, index) => (
                            <MenuItem key={level.id} value={index}>
                              {level.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>
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
                    <Button
                      variant="contained"
                      onClick={() => {
                        if (!kidName.trim()) return;
                        void saveTemplate({
                          kids: [...template.kids, { id: crypto.randomUUID(), name: kidName.trim() }],
                        });
                        setKidName('');
                      }}
                    >
                      Add
                    </Button>
                  </Stack>
                  <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                    {template.kids.length === 0 ? (
                      <Chip size="small" variant="outlined" label="No kids yet" />
                    ) : (
                      template.kids.map((kid) => (
                        <Chip
                          key={kid.id}
                          size="small"
                          label={kid.name}
                          onDelete={() =>
                            void saveTemplate({ kids: template.kids.filter((item) => item.id !== kid.id) })
                          }
                        />
                      ))
                    )}
                  </Stack>
                </CardContent>
              </Card>

              <Card sx={{ borderRadius: 4 }}>
                <CardContent sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
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
                  {renderEditableLevels(
                    template.levels,
                    (levelId, updates) => {
                      const levels = template.levels.map((level) =>
                        level.id === levelId ? { ...level, ...updates } : level,
                      );
                      void saveTemplate({ levels });
                    },
                    (levelId) => openRewardEditor({ mode: 'template-level', levelId }),
                    (levelId, reward) => openRewardEditor({ mode: 'template-level', levelId, reward }),
                    (levelId, rewardId) => {
                      const levels = template.levels.map((level) =>
                        level.id === levelId
                          ? { ...level, rewards: level.rewards.filter((reward) => reward.id !== rewardId) }
                          : level,
                      );
                      void saveTemplate({ levels });
                    },
                  )}
                  <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1.5 }}>
                    {template.levels.map((level, index) => (
                      <Button
                        key={level.id}
                        size="small"
                        color="error"
                        onClick={() => {
                          const nextLevels = template.levels.filter((item) => item.id !== level.id);
                          void saveTemplate({
                            levels: nextLevels,
                            defaultStartLevel: Math.min(template.defaultStartLevel, Math.max(nextLevels.length - 1, 0)),
                          });
                        }}
                        disabled={template.levels.length <= 1}
                      >
                        Remove {level.name || `Level ${index + 1}`}
                      </Button>
                    ))}
                  </Stack>
                </CardContent>
              </Card>

              <Card sx={{ borderRadius: 4 }}>
                <CardContent sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle1">Standby Rewards</Typography>
                    <Button size="small" onClick={() => openRewardEditor({ mode: 'template-standby' })}>
                      Add
                    </Button>
                  </Box>
                  <Stack spacing={1}>
                    {template.standbyRewards.length === 0 ? (
                      <Chip size="small" variant="outlined" label="No standby rewards yet" />
                    ) : (
                      template.standbyRewards.map((reward) => (
                        <Card key={reward.id} variant="outlined">
                          <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                              <Box>
                                <Typography variant="body2">{formatReward(reward)}</Typography>
                                {reward.description && (
                                  <Typography variant="caption" color="text.secondary">
                                    {reward.description}
                                  </Typography>
                                )}
                              </Box>
                              <Stack direction="row" spacing={0.25}>
                                <IconButton
                                  size="small"
                                  onClick={() => openRewardEditor({ mode: 'template-standby', reward })}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  onClick={() =>
                                    void saveTemplate({
                                      standbyRewards: template.standbyRewards.filter((item) => item.id !== reward.id),
                                    })
                                  }
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Stack>
                            </Box>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </Stack>
                </CardContent>
              </Card>
            </Stack>
          )}
        </Stack>
      )}

      {surfaceMode === 'execute' && (
        <>
          <Fab
            color="secondary"
            aria-label="rewards"
            onClick={() => setSurfaceMode('rewards')}
            sx={{
              position: 'fixed',
              right: 16,
              bottom: 72,
              boxShadow: '0 12px 20px rgba(156, 39, 176, 0.24)',
            }}
          >
            <RewardsIcon />
          </Fab>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ position: 'fixed', right: 20, bottom: 52, fontWeight: 600 }}
          >
            Rewards
          </Typography>
        </>
      )}

      {surfaceMode === 'rewards' && (
        <Fab
          color="default"
          aria-label="back"
          onClick={() => setSurfaceMode('execute')}
          sx={{ position: 'fixed', right: 16, bottom: 72 }}
        >
          <ArrowBackIcon />
        </Fab>
      )}

      {isMobile && surfaceMode === 'edit' && editSection === 'template' && (
        <Fab
          color="primary"
          aria-label="add standby reward"
          onClick={() => openRewardEditor({ mode: 'template-standby' })}
          sx={{ position: 'fixed', right: 16, bottom: 72 }}
        >
          <AddIcon />
        </Fab>
      )}

      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Rewards Settings</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Views
              </Typography>
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                <Button
                  variant="outlined"
                  onClick={() => {
                    setSurfaceMode('rewards');
                    setSettingsOpen(false);
                  }}
                >
                  Open Rewards
                </Button>
                <Button
                  variant="contained"
                  onClick={() => {
                    setSurfaceMode('edit');
                    setEditSection('manage');
                    setSettingsOpen(false);
                  }}
                >
                  Edit Weeks
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => {
                    setSurfaceMode('edit');
                    setEditSection('template');
                    setSettingsOpen(false);
                  }}
                >
                  Edit Template
                </Button>
              </Stack>
            </Box>

            <Divider />

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Week Actions
              </Typography>
              <Stack spacing={1}>
                <Button variant="outlined" onClick={() => void instantiateNextWeek()}>
                  Instantiate Next Week
                </Button>
                <Button variant="outlined" onClick={() => void freezeCurrentWeek(true)} disabled={!currentWeek}>
                  Freeze Current Week And Carry Forward Unused Rewards
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => void openCurrentNextWeek(false)}
                  disabled={orderedWeeks.every((group) => group.weekOrder <= template.currentWeekOrder)}
                >
                  Open Next Week From Default Level
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => void openCurrentNextWeek(true)}
                  disabled={orderedWeeks.every((group) => group.weekOrder <= template.currentWeekOrder)}
                >
                  Open Next Week And Carry Level Forward
                </Button>
              </Stack>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(rewardDialog)} onClose={() => setRewardDialog(null)} fullWidth maxWidth="sm">
        <DialogTitle>{rewardDialog?.reward ? 'Edit Reward' : 'Add Reward'}</DialogTitle>
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
            <Grid container spacing={2}>
              <Grid item xs={4}>
                <TextField
                  label="Qty"
                  size="small"
                  type="number"
                  value={rewardDraft.quantity}
                  onChange={(event) => setRewardDraft((previous) => ({ ...previous, quantity: event.target.value }))}
                />
              </Grid>
              <Grid item xs={4}>
                <TextField
                  label="Amount"
                  size="small"
                  type="number"
                  value={rewardDraft.amount}
                  onChange={(event) => setRewardDraft((previous) => ({ ...previous, amount: event.target.value }))}
                />
              </Grid>
              <Grid item xs={4}>
                <TextField
                  label="Unit"
                  size="small"
                  value={rewardDraft.amountUnit}
                  onChange={(event) => setRewardDraft((previous) => ({ ...previous, amountUnit: event.target.value }))}
                />
              </Grid>
            </Grid>
            {template.standbyRewards.length > 0 && rewardDialog?.mode !== 'template-standby' && (
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Standby reminders
                </Typography>
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
                  {template.standbyRewards.map((reward) => (
                    <Chip
                      key={reward.id}
                      size="small"
                      label={formatReward(reward)}
                      onClick={() => setRewardDraft(buildDraft(reward))}
                    />
                  ))}
                </Stack>
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRewardDialog(null)}>Cancel</Button>
          <Button variant="contained" onClick={() => void saveRewardEditor()}>
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
