import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  ToggleButtonGroup,
  ToggleButton,
  TextField,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
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

type FeelingTrackerProps = {
  latestFeeling: FeelingEntry | null;
  onAddEntry: (feeling: FeelingType, bodyState: BodyStateType, notes?: string) => void;
};

const FeelingTracker: React.FC<FeelingTrackerProps> = ({
  latestFeeling,
  onAddEntry,
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [feeling, setFeeling] = useState<FeelingType | null>(null);
  const [bodyState, setBodyState] = useState<BodyStateType | null>(null);
  const [notes, setNotes] = useState('');
  const [showReminder, setShowReminder] = useState(false);

  const feelingOptions: FeelingType[] = ['very_happy', 'happy', 'neutral', 'sad', 'very_sad'];
  const bodyStateOptions: BodyStateType[] = ['excellent', 'good', 'okay', 'tired', 'exhausted'];

  // Check if reminder should be shown
  React.useEffect(() => {
    if (!latestFeeling) {
      setShowReminder(true);
      return;
    }

    const today = getPSTDateString();
    const lastReportDate = latestFeeling.date;

    // Show reminder if last report was not today and it's past 9 PM PST
    if (lastReportDate !== today && isPast9PMPST()) {
      const reminderKey = `wellness-reminder-shown-${today}`;
      const reminderShown = localStorage.getItem(reminderKey);

      if (!reminderShown) {
        setShowReminder(true);
      }
    }
  }, [latestFeeling]);

  const handleDismissReminder = () => {
    const today = getPSTDateString();
    const reminderKey = `wellness-reminder-shown-${today}`;
    localStorage.setItem(reminderKey, 'true');
    setShowReminder(false);
  };

  const handleOpenDialog = () => {
    setDialogOpen(true);
    setFeeling(null);
    setBodyState(null);
    setNotes('');
    handleDismissReminder();
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setFeeling(null);
    setBodyState(null);
    setNotes('');
  };

  const handleSave = () => {
    if (!feeling || !bodyState) return;

    onAddEntry(feeling, bodyState, notes.trim() || undefined);
    handleCloseDialog();
  };

  const hoursSince = latestFeeling ? getHoursSince(latestFeeling.timestamp) : null;

  return (
    <Box>
      {showReminder && (
        <Alert
          severity="info"
          onClose={handleDismissReminder}
          sx={{ mb: 2 }}
        >
          Don't forget to log your feelings and body state today!
        </Alert>
      )}

      <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">How are you feeling?</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenDialog}
            size="small"
          >
            Log Now
          </Button>
        </Box>

        {latestFeeling ? (
          <Box sx={{ display: 'flex', gap: 3 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Feeling
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                <Typography variant="h2">
                  {getFeelingEmoji(latestFeeling.feeling)}
                </Typography>
                <Box>
                  <Typography variant="body1" fontWeight="medium">
                    {getFeelingLabel(latestFeeling.feeling)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {hoursSince !== null && formatHoursSince(hoursSince)}
                  </Typography>
                </Box>
              </Box>
            </Box>

            <Box sx={{ flex: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Body State
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                <Typography variant="h2">
                  {getBodyStateEmoji(latestFeeling.bodyState)}
                </Typography>
                <Box>
                  <Typography variant="body1" fontWeight="medium">
                    {getBodyStateLabel(latestFeeling.bodyState)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {hoursSince !== null && formatHoursSince(hoursSince)}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No entries yet. Log your first entry to get started!
          </Typography>
        )}
      </Paper>

      {/* Dialog for adding new entry */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Log Your Feeling & Body State</DialogTitle>

        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
            {/* Feeling selector */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                How are you feeling?
              </Typography>
              <ToggleButtonGroup
                value={feeling}
                exclusive
                onChange={(_, newValue) => setFeeling(newValue)}
                fullWidth
                orientation="horizontal"
              >
                {feelingOptions.map((option) => (
                  <ToggleButton
                    key={option}
                    value={option}
                    sx={{ flexDirection: 'column', py: 1.5 }}
                  >
                    <Typography variant="h3">
                      {getFeelingEmoji(option)}
                    </Typography>
                    <Typography variant="caption">
                      {getFeelingLabel(option)}
                    </Typography>
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Box>

            {/* Body state selector */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                How is your body?
              </Typography>
              <ToggleButtonGroup
                value={bodyState}
                exclusive
                onChange={(_, newValue) => setBodyState(newValue)}
                fullWidth
                orientation="horizontal"
              >
                {bodyStateOptions.map((option) => (
                  <ToggleButton
                    key={option}
                    value={option}
                    sx={{ flexDirection: 'column', py: 1.5 }}
                  >
                    <Typography variant="h3">
                      {getBodyStateEmoji(option)}
                    </Typography>
                    <Typography variant="caption">
                      {getBodyStateLabel(option)}
                    </Typography>
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Box>

            {/* Optional notes */}
            <TextField
              label="Notes (Optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              multiline
              rows={3}
              fullWidth
            />
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={!feeling || !bodyState}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FeelingTracker;
