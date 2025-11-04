import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  Alert,
  Collapse,
  IconButton,
} from '@mui/material';
import {
  Close as CloseIcon,
} from '@mui/icons-material';
import { FeelingEntry, FeelingType, BodyStateType } from '../../types/wellness';
import {
  getFeelingEmoji,
  getFeelingLabel,
  getBodyStateEmoji,
  getBodyStateLabel,
  getHoursSince,
  formatHoursSince,
  isPast9PMPST,
  getPSTDateString,
} from '../../utils/wellnessHelpers';

type FeelingTrackerCompactProps = {
  latestFeeling: FeelingEntry | null;
  onAddEntry: (feeling: FeelingType, bodyState: BodyStateType, notes?: string) => void;
};

const FeelingTrackerCompact: React.FC<FeelingTrackerCompactProps> = ({
  latestFeeling,
  onAddEntry,
}) => {
  const [feeling, setFeeling] = useState<FeelingType | null>(null);
  const [bodyState, setBodyState] = useState<BodyStateType | null>(null);
  const [showReminder, setShowReminder] = useState(false);

  // Compact options - 3 levels each
  const feelingOptions: FeelingType[] = ['happy', 'neutral', 'sad'];
  const bodyStateOptions: BodyStateType[] = ['good', 'okay', 'tired'];

  // Check if reminder should be shown - only at 9PM PST if no report today
  React.useEffect(() => {
    if (!isPast9PMPST()) {
      setShowReminder(false);
      return;
    }

    if (!latestFeeling) {
      setShowReminder(true);
      return;
    }

    const today = getPSTDateString();
    const lastReportDate = latestFeeling.date;

    // Show reminder only if last report was not today
    if (lastReportDate !== today) {
      const reminderKey = `wellness-reminder-shown-${today}`;
      const reminderShown = localStorage.getItem(reminderKey);

      if (!reminderShown) {
        setShowReminder(true);
      }
    } else {
      setShowReminder(false);
    }
  }, [latestFeeling]);

  const handleDismissReminder = () => {
    const today = getPSTDateString();
    const reminderKey = `wellness-reminder-shown-${today}`;
    localStorage.setItem(reminderKey, 'true');
    setShowReminder(false);
  };

  const handleFeelingChange = async (_event: React.MouseEvent, newFeeling: FeelingType | null) => {
    if (!newFeeling) return;
    setFeeling(newFeeling);

    // Auto-save if both are selected
    if (bodyState) {
      await onAddEntry(newFeeling, bodyState);
      setFeeling(null);
      setBodyState(null);
      handleDismissReminder();
    }
  };

  const handleBodyStateChange = async (_event: React.MouseEvent, newBodyState: BodyStateType | null) => {
    if (!newBodyState) return;
    setBodyState(newBodyState);

    // Auto-save if both are selected
    if (feeling) {
      await onAddEntry(feeling, newBodyState);
      setFeeling(null);
      setBodyState(null);
      handleDismissReminder();
    }
  };

  const hoursSince = latestFeeling ? getHoursSince(latestFeeling.timestamp) : null;

  return (
    <Box>
      <Collapse in={showReminder}>
        <Alert
          severity="info"
          onClose={handleDismissReminder}
          action={
            <IconButton
              aria-label="close"
              color="inherit"
              size="small"
              onClick={handleDismissReminder}
            >
              <CloseIcon fontSize="inherit" />
            </IconButton>
          }
          sx={{ mb: 2 }}
        >
          Don't forget to log your feelings and body state today!
        </Alert>
      </Collapse>

      <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          How are you feeling?
        </Typography>

        {/* Latest entry display */}
        {latestFeeling && (
          <Box sx={{ display: 'flex', gap: 2, mb: 2, pb: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h4">
                {getFeelingEmoji(latestFeeling.feeling)}
              </Typography>
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">
                  Feeling
                </Typography>
                <Typography variant="body2" fontWeight="medium">
                  {getFeelingLabel(latestFeeling.feeling)}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h4">
                {getBodyStateEmoji(latestFeeling.bodyState)}
              </Typography>
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">
                  Body
                </Typography>
                <Typography variant="body2" fontWeight="medium">
                  {getBodyStateLabel(latestFeeling.bodyState)}
                </Typography>
              </Box>
            </Box>

            {hoursSince !== null && (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography variant="caption" color="text.secondary">
                  {formatHoursSince(hoursSince)}
                </Typography>
              </Box>
            )}
          </Box>
        )}

        {/* Inline selectors */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box>
            <Typography variant="caption" color="text.secondary" gutterBottom>
              Feeling
            </Typography>
            <ToggleButtonGroup
              value={feeling}
              exclusive
              onChange={handleFeelingChange}
              fullWidth
              size="small"
            >
              {feelingOptions.map((option) => (
                <ToggleButton
                  key={option}
                  value={option}
                  sx={{ flexDirection: 'column', py: 1 }}
                >
                  <Typography variant="h5">
                    {getFeelingEmoji(option)}
                  </Typography>
                  <Typography variant="caption">
                    {getFeelingLabel(option)}
                  </Typography>
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>

          <Box>
            <Typography variant="caption" color="text.secondary" gutterBottom>
              Body
            </Typography>
            <ToggleButtonGroup
              value={bodyState}
              exclusive
              onChange={handleBodyStateChange}
              fullWidth
              size="small"
            >
              {bodyStateOptions.map((option) => (
                <ToggleButton
                  key={option}
                  value={option}
                  sx={{ flexDirection: 'column', py: 1 }}
                >
                  <Typography variant="h5">
                    {getBodyStateEmoji(option)}
                  </Typography>
                  <Typography variant="caption">
                    {getBodyStateLabel(option)}
                  </Typography>
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>
        </Box>

        {(feeling || bodyState) && (
          <Typography variant="caption" color="primary" sx={{ mt: 1, display: 'block' }}>
            {feeling && bodyState
              ? 'Saved!'
              : feeling
              ? 'Now select your body state'
              : 'Now select your feeling'}
          </Typography>
        )}
      </Paper>
    </Box>
  );
};

export default FeelingTrackerCompact;
