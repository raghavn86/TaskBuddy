import React, { useState } from 'react';
import { 
  Box, 
  TextField, 
  Button, 
  Typography, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem,
  Paper,
  Grid,
  Divider,
  CircularProgress,
  Alert
} from '@mui/material';
import { PartnershipDetails, PartnerProfile } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { DEFAULT_COLORS } from '../../services/PartnershipService';

type PartnershipDetailFormProps = {
  partnership: PartnershipDetails;
  loading: boolean;
  onUpdatePartner: (userId: string, updates: Partial<PartnerProfile>) => Promise<void>;
  onUpdatePartnerEmail?: (email: string) => Promise<void>;
};

export const PartnershipDetailForm: React.FC<PartnershipDetailFormProps> = ({
  partnership,
  loading,
  onUpdatePartner,
  onUpdatePartnerEmail
}) => {
  const { currentUser } = useAuth();
  const [partnerNickname, setPartnerNickname] = useState<string>('');
  const [partnerColor, setPartnerColor] = useState<string>('');
  const [partnerEmail, setPartnerEmail] = useState<string>(partnership.invitedEmail || '');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  // Get the current user's partner profile
  const currentUserProfile = currentUser ? partnership.partners[currentUser.uid] : null;

  // Get the partner's profile (not the current user)
  const partnerProfiles = Object.entries(partnership.partners).filter(
    ([userId]) => currentUser && userId !== currentUser.uid
  );
  
  const partnerProfile = partnerProfiles.length > 0 ? partnerProfiles[0][1] : null;
  const partnerUserId = partnerProfiles.length > 0 ? partnerProfiles[0][0] : '';

  // Function to update the partner's nickname
  const handleUpdatePartnerNickname = async () => {
    if (!partnerProfile || !partnerNickname.trim()) return;
    
    setError(null);
    try {
      await onUpdatePartner(partnerUserId, { nickname: partnerNickname.trim() });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      setError('Failed to update partner nickname. Please try again.');
    }
  };

  // Function to update the current user's color
  const handleUpdateUserColor = async () => {
    if (!currentUser || !partnerColor) return;
    
    setError(null);
    try {
      await onUpdatePartner(currentUser.uid, { color: partnerColor });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      setError('Failed to update your color. Please try again.');
    }
  };

  // Function to update the partner email
  const handleUpdatePartnerEmail = async () => {
    if (!onUpdatePartnerEmail || !partnerEmail.trim()) return;
    
    setError(null);
    try {
      await onUpdatePartnerEmail(partnerEmail.trim());
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      setError('Failed to update partner email. Please try again.');
    }
  };

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>Updated successfully!</Alert>}
      
      <Typography variant="h6" gutterBottom>
        Partnership Details
      </Typography>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          Partnership Name: {partnership.name}
        </Typography>
        
        <Typography variant="body2" color="text.secondary">
          Status: {partnership.status === 'active' ? 'Active' : 'Pending'}
        </Typography>
        
        <Typography variant="body2" color="text.secondary">
          Created by: {partnership.partners[partnership.createdBy]?.email}
        </Typography>
      </Paper>

      {/* Current User Settings */}
      <Typography variant="subtitle1" gutterBottom>
        Your Settings
      </Typography>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Typography variant="body2">
              Email: {currentUserProfile?.email}
            </Typography>
          </Grid>
          
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel id="user-color-label">Your Color</InputLabel>
              <Select
                labelId="user-color-label"
                value={partnerColor || (currentUserProfile?.color || DEFAULT_COLORS.BLUE)}
                onChange={(e) => setPartnerColor(e.target.value)}
                label="Your Color"
                disabled={loading}
              >
                {Object.entries(DEFAULT_COLORS).map(([name, color]) => (
                  <MenuItem key={name} value={color}>
                    <Box display="flex" alignItems="center">
                      <Box 
                        sx={{ 
                          width: 20, 
                          height: 20, 
                          bgcolor: color, 
                          borderRadius: '50%',
                          mr: 1 
                        }} 
                      />
                      {name.charAt(0) + name.slice(1).toLowerCase()}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12}>
            <Button 
              variant="contained" 
              onClick={handleUpdateUserColor}
              disabled={!partnerColor || loading}
              startIcon={loading ? <CircularProgress size={20} /> : null}
            >
              Update Your Color
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Partner Settings */}
      <Typography variant="subtitle1" gutterBottom>
        Partner Settings
      </Typography>
      
      <Paper sx={{ p: 3 }}>
        {partnership.status === 'pending' && !partnerProfile ? (
          // Pending invitation view
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="body2" gutterBottom>
                Invited: {partnership.invitedEmail}
              </Typography>
            </Grid>
            
            {onUpdatePartnerEmail && (
              <>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Update Partner Email"
                    value={partnerEmail}
                    onChange={(e) => setPartnerEmail(e.target.value)}
                    disabled={loading}
                    helperText="Change the email address if your partner hasn't accepted yet"
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <Button 
                    variant="contained" 
                    onClick={handleUpdatePartnerEmail}
                    disabled={!partnerEmail.trim() || loading || partnerEmail === partnership.invitedEmail}
                    startIcon={loading ? <CircularProgress size={20} /> : null}
                  >
                    Update Partner Email
                  </Button>
                </Grid>
              </>
            )}
          </Grid>
        ) : partnerProfile ? (
          // Active partnership with partner
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="body2">
                Email: {partnerProfile.email}
              </Typography>
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Partner Nickname"
                placeholder={partnerProfile.nickname}
                value={partnerNickname}
                onChange={(e) => setPartnerNickname(e.target.value)}
                disabled={loading}
                helperText="This nickname will appear throughout the app"
              />
            </Grid>
            
            <Grid item xs={12}>
              <Box display="flex" alignItems="center">
                <Typography variant="body2" sx={{ mr: 2 }}>
                  Partner Color:
                </Typography>
                <Box 
                  sx={{ 
                    width: 20, 
                    height: 20, 
                    bgcolor: partnerProfile.color, 
                    borderRadius: '50%' 
                  }} 
                />
              </Box>
            </Grid>
            
            <Grid item xs={12}>
              <Button 
                variant="contained" 
                onClick={handleUpdatePartnerNickname}
                disabled={!partnerNickname.trim() || loading}
                startIcon={loading ? <CircularProgress size={20} /> : null}
              >
                Update Partner Nickname
              </Button>
            </Grid>
          </Grid>
        ) : (
          <Typography variant="body2">
            No partner information available.
          </Typography>
        )}
      </Paper>
    </Box>
  );
};