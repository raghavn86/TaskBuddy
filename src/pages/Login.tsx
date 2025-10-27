import React from 'react';
import {
  Box,
  Button,
  Paper,
  Typography,
  Container,
  Card,
  CardContent,
  CardActions,
} from '@mui/material';
import { Google as GoogleIcon } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';

const Login: React.FC = () => {
  const { signInWithGoogle, loading } = useAuth();

  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundImage: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={10}
          sx={{
            borderRadius: 4,
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              p: 6,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              bgcolor: 'background.paper',
            }}
          >
            <Typography
              component="h1"
              variant="h4"
              sx={{ mb: 2, fontWeight: 'bold', color: 'primary.main' }}
            >
              TaskBuddy
            </Typography>
            <Typography variant="h6" sx={{ mb: 4, textAlign: 'center', color: 'text.secondary' }}>
              Collaborative Task Management
            </Typography>
            
            <Card 
              variant="outlined" 
              sx={{ 
                width: '100%',
                borderRadius: 2,
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}
            >
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Welcome to TaskBuddy
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Manage tasks together with your colleague, plan your week efficiently, and stay organized.
                </Typography>
              </CardContent>
              <CardActions sx={{ p: 2, pt: 0 }}>
                <Button
                  variant="contained"
                  fullWidth
                  size="large"
                  sx={{ py: 1.5 }}
                  startIcon={<GoogleIcon />}
                  onClick={handleGoogleLogin}
                  disabled={loading}
                >
                  Sign in with Google
                </Button>
              </CardActions>
            </Card>
          </Box>
        </Paper>
        
        <Box sx={{ mt: 3, textAlign: 'center', color: 'background.paper' }}>
          <Typography variant="body2">
            © {new Date().getFullYear()} TaskBuddy - All rights reserved
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default Login;