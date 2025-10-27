import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Button,
  Divider,
  Paper,
  CircularProgress,
  Alert
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { usePartnership } from '../../context/PartnershipContext';
import { PartnershipCard } from '../../components/partnerships/PartnershipCard';
import { PartnershipInviteCard } from '../../components/partnerships/PartnershipInviteCard';

export const PartnershipsPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    loading,
    userPartnerships,
    partnershipInvites,
    activePartnership,
    setActivePartnership,
    acceptPartnershipInvite,
    declinePartnershipInvite,
    hidePartnershipInvite,
    refreshPartnerships,
  } = usePartnership();

  const [processingId, setProcessingId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const handleSelectPartnership = (partnershipId: string) => {
    const partnership = userPartnerships.find(p => p.id === partnershipId);
    if (partnership && partnership.status === 'active') {
      setActivePartnership(partnership);
      // Redirect to templates page or dashboard
      navigate('/templates');
    }
  };

  const handleViewPartnershipDetails = (partnershipId: string) => {
    navigate(`/partnerships/${partnershipId}`);
  };

  const handleCreateNewPartnership = () => {
    navigate('/partnerships/new');
  };

  const handleAcceptInvite = async (inviteId: string) => {
    setProcessingId(inviteId);
    setError(null);
    
    try {
      const updatedPartnership = await acceptPartnershipInvite(inviteId);
      if (updatedPartnership) {
        setActivePartnership(updatedPartnership);
        // Refresh partnerships
        await refreshPartnerships();
      }
    } catch (err) {
      console.error('Error accepting invitation:', err);
      setError('Failed to accept the invitation. Please try again.');
    } finally {
      setProcessingId('');
    }
  };

  const handleDeclineInvite = async (inviteId: string) => {
    setProcessingId(inviteId);
    setError(null);
    
    try {
      await declinePartnershipInvite(inviteId);
    } catch (err) {
      console.error('Error declining invitation:', err);
      setError('Failed to decline the invitation. Please try again.');
    } finally {
      setProcessingId('');
    }
  };

  const handleHideInvite = async (inviteId: string) => {
    setProcessingId(inviteId);
    setError(null);
    
    try {
      await hidePartnershipInvite(inviteId);
    } catch (err) {
      console.error('Error hiding invitation:', err);
      setError('Failed to hide the invitation. Please try again.');
    } finally {
      setProcessingId('');
    }
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          Partnerships
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleCreateNewPartnership}
        >
          New Partnership
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Partnership Invites Section */}
          {partnershipInvites.length > 0 && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Pending Invitations
              </Typography>
              {partnershipInvites.map((invite) => (
                <PartnershipInviteCard
                  key={invite.partnershipId}
                  invite={invite}
                  onAccept={() => handleAcceptInvite(invite.partnershipId)}
                  onDecline={() => handleDeclineInvite(invite.partnershipId)}
                  onHide={() => handleHideInvite(invite.partnershipId)}
                />
              ))}
            </Box>
          )}

          {/* Active Partnerships Section */}
          <Box>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Your Partnerships
            </Typography>
            {userPartnerships.length > 0 ? (
              userPartnerships.map((partnership) => (
                <PartnershipCard
                  key={partnership.id}
                  partnership={partnership}
                  isActive={activePartnership?.id === partnership.id}
                  onSelect={() => handleSelectPartnership(partnership.id)}
                  onViewDetails={() => handleViewPartnershipDetails(partnership.id)}
                />
              ))
            ) : (
              <Paper sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="body1">
                  You don't have any partnerships yet.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Create a new partnership to collaborate with a partner.
                </Typography>
                <Button
                  variant="outlined"
                  color="primary"
                  startIcon={<AddIcon />}
                  onClick={handleCreateNewPartnership}
                  sx={{ mt: 2 }}
                >
                  Create Partnership
                </Button>
              </Paper>
            )}
          </Box>
        </>
      )}
    </Container>
  );
};

export default PartnershipsPage;