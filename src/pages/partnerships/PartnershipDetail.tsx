import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Button,
  CircularProgress,
  Alert
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { usePartnership } from '../../context/PartnershipContext';
import { PartnershipDetailForm } from '../../components/partnerships/PartnershipDetailForm';
import { PartnerProfile, PartnershipDetails } from '../../types';

export const PartnershipDetail: React.FC = () => {
  const { partnershipId } = useParams<{partnershipId: string}>();
  const navigate = useNavigate();
  const {
    getPartnershipById,
    updatePartnerProfile
  } = usePartnership();

  const [partnership, setPartnership] = useState<PartnershipDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const fetchPartnership = async () => {
      if (!partnershipId) {
        navigate('/partnerships');
        return;
      }

      try {
        setLoading(true);
        const fetchedPartnership = await getPartnershipById(partnershipId);
        
        if (!fetchedPartnership) {
          setError('Partnership not found');
          return;
        }
        
        setPartnership(fetchedPartnership);
      } catch (err) {
        console.error('Error fetching partnership:', err);
        setError('Failed to load partnership details');
      } finally {
        setLoading(false);
      }
    };

    fetchPartnership();
  }, [partnershipId, getPartnershipById, navigate]);

  const handleUpdatePartner = async (userId: string, updates: Partial<PartnerProfile>) => {
    if (!partnership) return;
    
    setUpdating(true);
    try {
      await updatePartnerProfile(partnership.id, userId, updates);
      
      // Refresh partnership details
      const updatedPartnership = await getPartnershipById(partnership.id);
      if (updatedPartnership) {
        setPartnership(updatedPartnership);
      }
    } catch (err) {
      console.error('Error updating partner:', err);
      throw err;
    } finally {
      setUpdating(false);
    }
  };

  const handleBack = () => {
    navigate('/partnerships');
  };

  if (loading) {
    return (
      <Container maxWidth="md">
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error || !partnership) {
    return (
      <Container maxWidth="md">
        <Alert severity="error" sx={{ mt: 2 }}>
          {error || 'Partnership not found'}
        </Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
          sx={{ mt: 2 }}
        >
          Back to Partnerships
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Box sx={{ mb: 4 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
          sx={{ mb: 2 }}
        >
          Back to Partnerships
        </Button>
        
        <Typography variant="h4" component="h1" gutterBottom>
          Partnership: {partnership.name}
        </Typography>
        
        <PartnershipDetailForm
          partnership={partnership}
          loading={updating}
          onUpdatePartner={handleUpdatePartner}
        />
      </Box>
    </Container>
  );
};

export default PartnershipDetail;