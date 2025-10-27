import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  TextField,
  Button,
  Paper,
  CircularProgress,
  Alert
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { usePartnership } from '../../context/PartnershipContext';

export const CreatePartnership: React.FC = () => {
  const navigate = useNavigate();
  const { createNewPartnership } = usePartnership();

  const [partnershipName, setPartnershipName] = useState('');
  const [partnerEmail, setPartnerEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!partnershipName.trim() || !partnerEmail.trim()) {
      setError('Please fill in all fields');
      return;
    }
    
    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(partnerEmail)) {
      setError('Please enter a valid email address');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      await createNewPartnership(partnershipName.trim(), partnerEmail.trim());
      navigate('/partnerships');
    } catch (err) {
      console.error('Error creating partnership:', err);
      setError('Failed to create partnership. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/partnerships');
  };

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
          Create New Partnership
        </Typography>
        
        <Paper sx={{ p: 3, mt: 2 }}>
          {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
          
          <form onSubmit={handleSubmit}>
            <TextField
              label="Partnership Name"
              fullWidth
              value={partnershipName}
              onChange={(e) => setPartnershipName(e.target.value)}
              margin="normal"
              required
              disabled={loading}
              helperText="Give your partnership a meaningful name"
            />
            
            <TextField
              label="Partner's Email"
              fullWidth
              type="email"
              value={partnerEmail}
              onChange={(e) => setPartnerEmail(e.target.value)}
              margin="normal"
              required
              disabled={loading}
              helperText="Enter your partner's email address"
            />
            
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                type="button"
                onClick={handleBack}
                sx={{ mr: 2 }}
                disabled={loading}
              >
                Cancel
              </Button>
              
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : null}
              >
                Create Partnership
              </Button>
            </Box>
          </form>
        </Paper>
      </Box>
    </Container>
  );
};

export default CreatePartnership;