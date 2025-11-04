import React, { useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import { FeelingEntry } from '../../types/wellness';
import {
  getFeelingEmoji,
  getBodyStateEmoji,
  getFeelingValue,
  getBodyStateValue,
  getFeelingLabel,
  getBodyStateLabel,
} from '../../utils/wellnessHelpers';

type FeelingGraphProps = {
  entries: FeelingEntry[];
  onLoadMore?: (startDate: string, endDate: string) => void;
};

type GraphMode = 'feeling' | 'bodyState';

const FeelingGraph: React.FC<FeelingGraphProps> = ({
  entries,
  onLoadMore,
}) => {
  const [mode, setMode] = React.useState<GraphMode>('feeling');

  // Load last 30 days of data
  useEffect(() => {
    if (onLoadMore && entries.length === 0) {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const formatDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      onLoadMore(formatDate(startDate), formatDate(endDate));
    }
  }, [onLoadMore, entries.length]);

  // Get recent entries (last 10)
  const recentEntries = entries.slice(0, 10);

  const getValue = (entry: FeelingEntry) => {
    return mode === 'feeling'
      ? getFeelingValue(entry.feeling)
      : getBodyStateValue(entry.bodyState);
  };

  const getEmoji = (entry: FeelingEntry) => {
    return mode === 'feeling'
      ? getFeelingEmoji(entry.feeling)
      : getBodyStateEmoji(entry.bodyState);
  };

  const getLabel = (entry: FeelingEntry) => {
    return mode === 'feeling'
      ? getFeelingLabel(entry.feeling)
      : getBodyStateLabel(entry.bodyState);
  };

  const maxValue = 5;

  return (
    <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">Progress Over Time</Typography>
        <ToggleButtonGroup
          value={mode}
          exclusive
          onChange={(_, newValue) => {
            if (newValue) setMode(newValue);
          }}
          size="small"
        >
          <ToggleButton value="feeling">Feeling</ToggleButton>
          <ToggleButton value="bodyState">Body State</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {recentEntries.length > 0 ? (
        <Box>
          {/* Simple bar chart */}
          <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1, height: 200, mb: 2 }}>
            {recentEntries.map((entry, index) => {
              const value = getValue(entry);
              const heightPercent = (value / maxValue) * 100;

              return (
                <Box
                  key={entry.id}
                  sx={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 0.5,
                  }}
                >
                  <Typography variant="caption" sx={{ fontSize: '1.2rem' }}>
                    {getEmoji(entry)}
                  </Typography>
                  <Box
                    sx={{
                      width: '100%',
                      height: `${heightPercent}%`,
                      bgcolor: 'primary.main',
                      borderRadius: 1,
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        bgcolor: 'primary.dark',
                      },
                    }}
                    title={`${getLabel(entry)} - ${new Date(entry.timestamp).toLocaleDateString()}`}
                  />
                </Box>
              );
            })}
          </Box>

          {/* Legend */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {recentEntries.map((entry, index) => (
              <Box
                key={entry.id}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  flex: 1,
                  minWidth: 60,
                }}
              >
                <Typography variant="caption" color="text.secondary" fontSize="0.65rem">
                  {new Date(entry.timestamp).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </Typography>
                <Typography variant="caption" color="text.secondary" fontSize="0.6rem">
                  {new Date(entry.timestamp).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </Typography>
              </Box>
            ))}
          </Box>

          {entries.length > 10 && (
            <Typography variant="caption" color="text.secondary" textAlign="center" display="block" mt={2}>
              Showing last 10 entries out of {entries.length}
            </Typography>
          )}
        </Box>
      ) : (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body2" color="text.secondary">
            No data to display yet. Start logging your feelings to see your progress!
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default FeelingGraph;
