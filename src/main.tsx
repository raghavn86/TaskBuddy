import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { TaskProvider } from './context/TaskContext';
import { PartnershipProvider } from './context/PartnershipContext';
import { CssBaseline } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import theme from './theme';
import './index.css';
import { suppressReactWarnings } from './utils/suppressWarnings';

// Suppress specific React warnings (like the react-beautiful-dnd defaultProps warning)
suppressReactWarnings();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <PartnershipProvider>
            <TaskProvider>
              <App />
            </TaskProvider>
          </PartnershipProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);