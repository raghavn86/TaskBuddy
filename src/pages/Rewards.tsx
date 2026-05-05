import React, { useEffect, useMemo, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
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
import { Add as AddIcon, DeleteOutline as DeleteIcon, EditOutlined as EditIcon, ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import Loading from '../components/common/Loading';
import { useRewards } from '../context/RewardsContext';
import { RewardDefinition, RewardInstance, RewardLevel, RewardWeekKidRecord } from '../types';

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

  const [tab, setTab] = useState(0);
  const [manageWeek, setManageWeek] = useState(0);
  const [kidName, setKidName] = useState('');
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [rewardDialog, setRewardDialog] = useState<null | {
    mode: 'template-level' | 'template-standby' | 'week-level' | 'week-manual';
    recordId?: string;
    levelId?: string;
    reward?: RewardDefinition;
  }>(null);
  const [rewardDraft, setRewardDraft] = useState(buildDraft());
  const [availabilityDialog, setAvailabilityDialog] = useState<null | {
    recordId: string;
    reward: RewardInstance;
  }>(null);
  const [availabilityDraft, setAvailabilityDraft] = useState({ quantity: '0', amount: '' });

  const orderedWeeks = useMemo(() => [...weekGroups].sort((a, b) => a.weekOrder - b.weekOrder), [weekGroups]);
  const selectedManageGroup = orderedWeeks.find((group) => group.weekOrder === manageWeek) || orderedWeeks[0] || null;
  const rewardSourceByKid = useMemo(() => {
    const map = new Map<string, RewardWeekKidRecord>();
    rewardSourceWeek?.kids.forEach((kid) => map.set(kid.kidId, kid));
    return map;
  }, [rewardSourceWeek]);

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

  useEffect(() => {
    setManageWeek(template?.currentWeekOrder || 0);
  }, [template?.currentWeekOrder]);

  const openRewardEditor = (state: NonNullable<typeof rewardDialog>) => {
    setRewardDialog(state);
    setRewardDraft(buildDraft(state.reward));
  };

  const saveRewardEditor = async () => {
    if (!rewardDialog) return;
    const reward = toReward();
    if (!reward.title) return;

    if (rewardDialog.mode === 'week-manual' && rewardDialog.recordId) {
      await addManualReward(rewardDialog.recordId, reward);
      setRewardDialog(null);
      return;
    }

    if (rewardDialog.mode === 'template-standby' && template) {
      const standbyRewards = rewardDialog.reward
        ? template.standbyRewards.map((item) => (item.id === reward.id ? reward : item))
        : [...template.standbyRewards, reward];
      await saveTemplate({ standbyRewards });
      setRewardDialog(null);
      return;
    }

    if (rewardDialog.mode === 'template-level' && template && rewardDialog.levelId) {
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

  const renderLevelPreview = (levels: RewardLevel[], currentLevel: number) => (
    <Stack spacing={1} sx={{ mt: 1 }}>
      {levels.map((level, index) => (
        <Card key={level.id} variant="outlined" sx={{ opacity: index <= currentLevel ? 1 : 0.45 }}>
          <CardContent sx={{ py: 1.25, '&:last-child': { pb: 1.25 } }}>
            <Typography variant="subtitle2">
              {level.name} · {level.stepCount} steps
            </Typography>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
              {level.rewards.length === 0 ? (
                <Chip size="small" label="No rewards" variant="outlined" />
              ) : (
                level.rewards.map((reward) => (
                  <Chip key={reward.id} size="small" label={formatReward(reward)} variant={index <= currentLevel ? 'filled' : 'outlined'} />
                ))
              )}
            </Stack>
          </CardContent>
        </Card>
      ))}
    </Stack>
  );

  const renderEditableLevels = (
    levels: RewardLevel[],
    onLevelChange: (levelId: string, updates: Partial<RewardLevel>) => void,
    onAddReward: (levelId: string) => void,
    onEditReward: (levelId: string, reward: RewardDefinition) => void,
    onRemoveReward: (levelId: string, rewardId: string) => void,
  ) => (
    <Stack spacing={1.5}>
      {levels.map((level) => (
        <Card key={level.id} variant="outlined">
          <CardContent sx={{ py: 1.25, '&:last-child': { pb: 1.25 } }}>
            <Grid container spacing={1}>
              <Grid item xs={8}>
                <TextField fullWidth size="small" label="Level" value={level.name} onChange={(event) => onLevelChange(level.id, { name: event.target.value })} />
              </Grid>
              <Grid item xs={4}>
                <TextField fullWidth size="small" label="Steps" type="number" value={level.stepCount} onChange={(event) => onLevelChange(level.id, { stepCount: Math.max(1, Number(event.target.value) || 1) })} />
              </Grid>
            </Grid>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
              <Typography variant="caption" color="text.secondary">Rewards</Typography>
              <Button size="small" onClick={() => onAddReward(level.id)}>Add reward</Button>
            </Box>
            <Stack spacing={0.75} sx={{ mt: 1 }}>
              {level.rewards.map((reward) => (
                <Card key={reward.id} variant="outlined">
                  <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                      <Box>
                        <Typography variant="body2">{formatReward(reward)}</Typography>
                        {reward.description && <Typography variant="caption" color="text.secondary">{reward.description}</Typography>}
                      </Box>
                      <Stack direction="row" spacing={0.25}>
                        <IconButton size="small" onClick={() => onEditReward(level.id, reward)}><EditIcon fontSize="small" /></IconButton>
                        <IconButton size="small" onClick={() => onRemoveReward(level.id, reward.id)}><DeleteIcon fontSize="small" /></IconButton>
                      </Stack>
                    </Box>
                  </CardContent>
                </Card>
              ))}
              {level.rewards.length === 0 && <Typography variant="body2" color="text.secondary">No rewards on this level.</Typography>}
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
        <Typography variant="h5" gutterBottom>Rewards</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Create the rewards setup first, then start instantiating weekly kid records.
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Button variant="contained" onClick={() => void createTemplate()}>Create Rewards Setup</Button>
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 4 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom>Rewards</Typography>
        <Typography variant="body2" color="text.secondary">
          Shared across the partnership. Boundary day: {dayOptions.find((day) => day.value === template.weekBoundaryDay)?.label}
        </Typography>
      </Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Tabs value={tab} onChange={(_event, value) => setTab(value)} sx={{ mb: 2 }}>
        <Tab label="Execute" />
        <Tab label="Manage" />
        <Tab label="Template" />
      </Tabs>
      {tab === 0 && (
        <Stack spacing={2}>
          <Card variant="outlined">
            <CardContent>
              <Stack spacing={1.5}>
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                  <Chip label={currentWeek ? `Current ${currentWeek.weekOrder + 1}W` : 'No current week'} size="small" />
                  <Chip label={rewardSourceWeek ? `Rewards from ${rewardSourceWeek.weekOrder + 1}W` : 'No frozen rewards'} size="small" variant="outlined" />
                </Stack>
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                  <Button variant="outlined" size="small" onClick={() => void instantiateNextWeek()}>Instantiate Next Week</Button>
                  <Button variant="outlined" size="small" onClick={() => void freezeCurrentWeek(true)} disabled={!currentWeek}>Freeze Current Week</Button>
                  <Button variant="contained" size="small" onClick={() => void openCurrentNextWeek(false)} disabled={orderedWeeks.every((group) => group.weekOrder <= template.currentWeekOrder)}>Open Next Week</Button>
                  <Button variant="contained" size="small" color="secondary" onClick={() => void openCurrentNextWeek(true)} disabled={orderedWeeks.every((group) => group.weekOrder <= template.currentWeekOrder)}>Open + Carry Level</Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
          {!currentWeek ? (
            <Alert severity="info">Instantiate the first week to start tracking rewards.</Alert>
          ) : (
            currentWeek.kids.map((record) => {
              const rewardRecord = rewardSourceByKid.get(record.kidId);
              return (
                <Accordion key={record.id} defaultExpanded disableGutters>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ width: '100%' }}>
                      <Typography variant="subtitle1">{record.kidName}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {record.levels[record.currentLevel]?.name || 'No level'} · Step {record.currentStep}/{record.levels[record.currentLevel]?.stepCount || 1}
                      </Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Stack spacing={2}>
                      <Stack direction="row" spacing={1}>
                        <Button variant="outlined" size="small" onClick={() => void changeKidStep(record.id, -1)}>Step Down</Button>
                        <Button variant="contained" size="small" onClick={() => void changeKidStep(record.id, 1)}>Step Up</Button>
                      </Stack>
                      <Box>
                        <Typography variant="subtitle2">This Week&apos;s Rewards By Level</Typography>
                        {renderLevelPreview(record.levels, record.currentLevel)}
                      </Box>
                      <Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Typography variant="subtitle2">Available Rewards</Typography>
                          {rewardRecord?.frozenAt && <Chip size="small" label="Frozen" color="success" variant="outlined" />}
                        </Box>
                        {!rewardRecord || rewardRecord.earnedRewards.length === 0 ? (
                          <Typography variant="body2" color="text.secondary">No frozen rewards available yet.</Typography>
                        ) : (
                          <Stack spacing={1}>
                            {rewardRecord.earnedRewards.map((reward) => (
                              <Card key={reward.id} variant="outlined">
                                <CardContent sx={{ py: 1.25, '&:last-child': { pb: 1.25 } }}>
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                                    <Box>
                                      <Typography variant="body2">{formatReward(reward)}</Typography>
                                      <Typography variant="caption" color="text.secondary">
                                        {reward.amount !== undefined && reward.amountUnit
                                          ? `${reward.remainingAmount || 0}${reward.amountUnit} left`
                                          : `${reward.remainingQuantity} left`}
                                        {reward.isCarryForward ? ' · Carry forward' : ''}
                                      </Typography>
                                    </Box>
                                    <Stack direction="row" spacing={0.25}>
                                      {reward.amount === undefined && (
                                        <Button size="small" onClick={() => void consumeReward(rewardRecord.id, reward.id)} disabled={reward.remainingQuantity <= 0}>Use</Button>
                                      )}
                                      <IconButton
                                        size="small"
                                        onClick={() => {
                                          setAvailabilityDialog({ recordId: rewardRecord.id, reward });
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
                                </CardContent>
                              </Card>
                            ))}
                          </Stack>
                        )}
                      </Box>
                      <Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Typography variant="subtitle2">Manual Rewards</Typography>
                          <Button size="small" onClick={() => openRewardEditor({ mode: 'week-manual', recordId: record.id })}>Add</Button>
                        </Box>
                        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                          {record.manualRewards.length === 0 ? (
                            <Chip size="small" label="No manual rewards" variant="outlined" />
                          ) : (
                            record.manualRewards.map((reward) => <Chip key={reward.id} size="small" label={formatReward(reward)} />)
                          )}
                        </Stack>
                      </Box>
                      <Box>
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>Notes</Typography>
                        <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                          <TextField
                            size="small"
                            fullWidth
                            placeholder="Log something good or bad"
                            value={noteDrafts[record.id] || ''}
                            onChange={(event) => setNoteDrafts((previous) => ({ ...previous, [record.id]: event.target.value }))}
                          />
                          <Button
                            size="small"
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
                        <Stack spacing={0.75}>
                          {record.notes.length === 0 ? (
                            <Chip size="small" label="No notes yet" variant="outlined" />
                          ) : (
                            record.notes.map((note) => (
                              <Chip key={note.id} size="small" label={`${note.type === 'good' ? 'Good' : 'Bad'} · ${note.text}`} color={note.type === 'good' ? 'success' : 'warning'} variant="outlined" />
                            ))
                          )}
                        </Stack>
                      </Box>
                    </Stack>
                  </AccordionDetails>
                </Accordion>
              );
            })
          )}
        </Stack>
      )}
      {tab === 1 && (
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            {orderedWeeks.map((group) => (
              <Chip
                key={group.weekOrder}
                label={group.weekOrder === template.currentWeekOrder ? `Current ${group.weekOrder + 1}W` : `${group.weekOrder + 1}W`}
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
              <Accordion key={record.id} defaultExpanded={selectedManageGroup.weekOrder === template.currentWeekOrder} disableGutters>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ width: '100%' }}>
                    <Typography variant="subtitle1">{record.kidName}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {record.levels[record.currentLevel]?.name || 'No level'} · Step {record.currentStep}/{record.levels[record.currentLevel]?.stepCount || 1}
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Stack spacing={2}>
                    <Stack direction="row" spacing={1}>
                      <Button variant="outlined" size="small" onClick={() => void changeKidStep(record.id, -1)}>Step Down</Button>
                      <Button variant="contained" size="small" onClick={() => void changeKidStep(record.id, 1)}>Step Up</Button>
                    </Stack>
                    {renderEditableLevels(
                      record.levels,
                      (levelId, updates) => {
                        const levels = record.levels.map((level) => (level.id === levelId ? { ...level, ...updates } : level));
                        void updateWeekLevels(record.id, levels);
                      },
                      (levelId) => openRewardEditor({ mode: 'week-level', recordId: record.id, levelId }),
                      (levelId, reward) => openRewardEditor({ mode: 'week-level', recordId: record.id, levelId, reward }),
                      (levelId, rewardId) => {
                        const levels = record.levels.map((level) =>
                          level.id === levelId ? { ...level, rewards: level.rewards.filter((reward) => reward.id !== rewardId) } : level,
                        );
                        void updateWeekLevels(record.id, levels);
                      },
                    )}
                  </Stack>
                </AccordionDetails>
              </Accordion>
            ))
          )}
        </Stack>
      )}
      {tab === 2 && (
        <Stack spacing={2}>
          <Card variant="outlined">
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="boundary-label">Boundary day</InputLabel>
                    <Select labelId="boundary-label" label="Boundary day" value={template.weekBoundaryDay} onChange={(event) => void saveTemplate({ weekBoundaryDay: Number(event.target.value) })}>
                      {dayOptions.map((day) => <MenuItem key={day.value} value={day.value}>{day.label}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="default-level-label">Default level</InputLabel>
                    <Select labelId="default-level-label" label="Default level" value={template.defaultStartLevel} onChange={(event) => void saveTemplate({ defaultStartLevel: Number(event.target.value) })}>
                      {template.levels.map((level, index) => <MenuItem key={level.id} value={index}>{level.name}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>Kids</Typography>
              <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
                <TextField size="small" fullWidth label="Kid name" value={kidName} onChange={(event) => setKidName(event.target.value)} />
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
                  <Chip size="small" label="No kids yet" variant="outlined" />
                ) : (
                  template.kids.map((kid) => (
                    <Chip
                      key={kid.id}
                      size="small"
                      label={kid.name}
                      onDelete={() => void saveTemplate({ kids: template.kids.filter((item) => item.id !== kid.id) })}
                    />
                  ))
                )}
              </Stack>
            </CardContent>
          </Card>
          <Card variant="outlined">
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography variant="subtitle1">Levels</Typography>
                <Button
                  size="small"
                  onClick={() =>
                    void saveTemplate({
                      levels: [
                        ...template.levels,
                        { id: crypto.randomUUID(), name: `Level ${template.levels.length + 1}`, stepCount: 5, rewards: [] },
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
                  const levels = template.levels.map((level) => (level.id === levelId ? { ...level, ...updates } : level));
                  void saveTemplate({ levels });
                },
                (levelId) => openRewardEditor({ mode: 'template-level', levelId }),
                (levelId, reward) => openRewardEditor({ mode: 'template-level', levelId, reward }),
                (levelId, rewardId) => {
                  const levels = template.levels.map((level) =>
                    level.id === levelId ? { ...level, rewards: level.rewards.filter((reward) => reward.id !== rewardId) } : level,
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
          <Card variant="outlined">
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle1">Standby Rewards</Typography>
                <Button size="small" onClick={() => openRewardEditor({ mode: 'template-standby' })}>Add</Button>
              </Box>
              <Stack spacing={1}>
                {template.standbyRewards.length === 0 ? (
                  <Chip size="small" label="No standby rewards yet" variant="outlined" />
                ) : (
                  template.standbyRewards.map((reward) => (
                    <Card key={reward.id} variant="outlined">
                      <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                          <Box>
                            <Typography variant="body2">{formatReward(reward)}</Typography>
                            {reward.description && <Typography variant="caption" color="text.secondary">{reward.description}</Typography>}
                          </Box>
                          <Stack direction="row" spacing={0.25}>
                            <IconButton size="small" onClick={() => openRewardEditor({ mode: 'template-standby', reward })}><EditIcon fontSize="small" /></IconButton>
                            <IconButton size="small" onClick={() => void saveTemplate({ standbyRewards: template.standbyRewards.filter((item) => item.id !== reward.id) })}><DeleteIcon fontSize="small" /></IconButton>
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
      {isMobile && tab === 2 && (
        <Fab color="primary" aria-label="add standby reward" onClick={() => openRewardEditor({ mode: 'template-standby' })} sx={{ position: 'fixed', right: 16, bottom: 72 }}>
          <AddIcon />
        </Fab>
      )}

      <Dialog open={Boolean(rewardDialog)} onClose={() => setRewardDialog(null)} fullWidth maxWidth="sm">
        <DialogTitle>{rewardDialog?.reward ? 'Edit Reward' : 'Add Reward'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Title" size="small" value={rewardDraft.title} onChange={(event) => setRewardDraft((previous) => ({ ...previous, title: event.target.value }))} />
            <TextField label="Description" size="small" value={rewardDraft.description} onChange={(event) => setRewardDraft((previous) => ({ ...previous, description: event.target.value }))} />
            <Grid container spacing={2}>
              <Grid item xs={4}>
                <TextField label="Qty" size="small" type="number" value={rewardDraft.quantity} onChange={(event) => setRewardDraft((previous) => ({ ...previous, quantity: event.target.value }))} />
              </Grid>
              <Grid item xs={4}>
                <TextField label="Amount" size="small" type="number" value={rewardDraft.amount} onChange={(event) => setRewardDraft((previous) => ({ ...previous, amount: event.target.value }))} />
              </Grid>
              <Grid item xs={4}>
                <TextField label="Unit" size="small" value={rewardDraft.amountUnit} onChange={(event) => setRewardDraft((previous) => ({ ...previous, amountUnit: event.target.value }))} />
              </Grid>
            </Grid>
            {template.standbyRewards.length > 0 && rewardDialog?.mode !== 'template-standby' && (
              <Box>
                <Typography variant="caption" color="text.secondary">Standby reminders</Typography>
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
                  {template.standbyRewards.map((reward) => (
                    <Chip key={reward.id} size="small" label={formatReward(reward)} onClick={() => setRewardDraft(buildDraft(reward))} />
                  ))}
                </Stack>
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRewardDialog(null)}>Cancel</Button>
          <Button variant="contained" onClick={() => void saveRewardEditor()}>Save</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(availabilityDialog)} onClose={() => setAvailabilityDialog(null)} fullWidth maxWidth="xs">
        <DialogTitle>Update Reward Availability</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Remaining quantity" size="small" type="number" value={availabilityDraft.quantity} onChange={(event) => setAvailabilityDraft((previous) => ({ ...previous, quantity: event.target.value }))} />
            {availabilityDialog?.reward.remainingAmount !== undefined && (
              <TextField label={`Remaining amount${availabilityDialog.reward.amountUnit ? ` (${availabilityDialog.reward.amountUnit})` : ''}`} size="small" type="number" value={availabilityDraft.amount} onChange={(event) => setAvailabilityDraft((previous) => ({ ...previous, amount: event.target.value }))} />
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
