import React, { useState } from 'react';
import { Card, CardContent, CardActions, Typography, Button, Box, Chip, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { PartnershipDetails } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { usePartnership } from '../../context/PartnershipContext';

type PartnershipCardProps = {
  partnership: PartnershipDetails;
  isActive: boolean;
  onSelect: () => void;
  onViewDetails: () => void;
};

export const PartnershipCard: React.FC<PartnershipCardProps> = ({
  partnership,
  isActive,
  onSelect,
  onViewDetails,
}) => {
  const { currentUser } = useAuth();
  const { deletePartnership } = usePartnership();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteDialogOpen(true);
  };
  
  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
  };
  
  const handleDeleteConfirm = async () => {
    try {
      await deletePartnership(partnership.id);
      setDeleteDialogOpen(false);
    } catch (err) {
      console.error('Error deleting partnership:', err);
    }
  };

  // Get the other partner (not the current user)
  const otherPartners = Object.entries(partnership.partners).filter(
    ([userId]) => currentUser && userId !== currentUser.uid
  );

  // Check if this is an active partnership (has two partners)
  const isActivePartnership = partnership.status === 'active';

  return (
    <Card 
      variant="outlined" 
      sx={{
        mb: 2,
        border: isActive ? '2px solid #1976d2' : '1px solid rgba(0, 0, 0, 0.12)',
        backgroundColor: isActive ? 'rgba(25, 118, 210, 0.04)' : 'inherit'
      }}
    >
      <CardContent sx={{ position: 'relative', paddingBottom: 2 }}>
        {/* Delete button positioned at the top right corner */}
        <IconButton 
          size="small" 
          onClick={handleDeleteClick}
          color="error"
          sx={{ 
            position: 'absolute', 
            top: 8, 
            right: 8,
          }}
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
        
        <Typography variant="h6" component="div" gutterBottom>
          {partnership.name}
        </Typography>
        
        <Box display="flex" alignItems="center" mb={1}>
          <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
            Status:
          </Typography>
          <Chip 
            size="small"
            label={partnership.status === 'active' ? 'Active' : 'Pending'}
            color={partnership.status === 'active' ? 'success' : 'warning'}
          />
        </Box>

        <Typography variant="body2" color="text.secondary">
          Created by: {partnership.partners[partnership.createdBy]?.email || 'Unknown'}
        </Typography>

        {otherPartners.length > 0 ? (
          <Typography variant="body2" color="text.secondary">
            Partner: {otherPartners[0][1].email}
          </Typography>
        ) : partnership.invitedEmail ? (
          <Typography variant="body2" color="text.secondary">
            Invited: {partnership.invitedEmail}
          </Typography>
        ) : null}
      </CardContent>

      <CardActions>
        <Button 
          size="small" 
          onClick={onViewDetails}
        >
          Details
        </Button>
        <Button 
          size="small" 
          onClick={onSelect}
          color="primary"
          disabled={!isActivePartnership}
          sx={{ ml: 'auto' }}
        >
          {isActive ? 'Selected' : 'Select'}
        </Button>
      </CardActions>
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
      >
        <DialogTitle>Delete Partnership</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the partnership with {partnership.invitedEmail}? 
            This action cannot be undone, and all associated data will be removed.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};