import React from 'react';
import { Card, CardContent, CardActions, Typography, Button, Box } from '@mui/material';
import { PartnershipInvite } from '../../types';

type PartnershipInviteCardProps = {
  invite: PartnershipInvite;
  onAccept: () => void;
  onDecline: () => void;
  onHide: () => void;
};

export const PartnershipInviteCard: React.FC<PartnershipInviteCardProps> = ({
  invite,
  onAccept,
  onDecline,
  onHide,
}) => {
  // Format the date
  const formattedDate = new Date(invite.createdAt).toLocaleDateString();

  return (
    <Card variant="outlined" sx={{ mb: 2, borderColor: 'warning.main' }}>
      <CardContent>
        <Typography variant="h6" component="div" gutterBottom>
          Partnership Invitation
        </Typography>
        <Typography variant="body1" component="div">
          {invite.partnershipName}
        </Typography>
        <Box mt={1}>
          <Typography variant="body2" color="text.secondary">
            From: {invite.inviterEmail}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Sent on: {formattedDate}
          </Typography>
        </Box>
      </CardContent>
      <CardActions sx={{ justifyContent: 'space-between', p: 2 }}>
        <Box>
          <Button
            size="small"
            color="success"
            variant="contained"
            onClick={onAccept}
            sx={{ mr: 1 }}
          >
            Accept
          </Button>
          <Button 
            size="small" 
            color="error" 
            variant="outlined" 
            onClick={onDecline}
          >
            Decline
          </Button>
        </Box>
        <Button 
          size="small" 
          color="inherit" 
          onClick={onHide}
        >
          Hide
        </Button>
      </CardActions>
    </Card>
  );
};